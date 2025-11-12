import express from 'express';
import Stripe from 'stripe';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import logger from '../utils/logger.js';
import supabaseDataService from '../services/supabaseDataService.js';
import supabase from '../services/supabaseService.js';

const router = express.Router();

// Initialize Stripe only if API key is provided
// This allows the server to start even if Stripe is not configured
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-10-28.acacia' })
  : null;

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Founding Member Pricing Configuration (December 1, 2025 Launch)
const FOUNDING_MEMBER_EARLY_ACCESS_PRICE = 497; // Monthly during early access period
const FOUNDING_MEMBER_FOREVER_LOCK_PRICE = 750; // Monthly after full platform launch
const PLATFORM_ACCESS_GRANT_DATE = new Date('2025-12-01T00:00:00Z'); // December 1, 2025

// Middleware to check if Stripe is configured
const requireStripe = (req, res, next) => {
  if (!stripe) {
    logger.warn('Stripe not configured - payment endpoint unavailable');
    return res.status(503).json({
      success: false,
      error: 'Payment processing is not configured. Please contact support.'
    });
  }
  next();
};

/**
 * ==================== DEPRECATED CODE - ARCHIVED 2025-11-10 ====================
 *
 * POST /api/payment/create-subscription
 * OLD FLOW: User creates account first, then subscribes ($99/month + 3-day trial)
 *
 * DEPRECATED BECAUSE:
 * - Replaced with payment-first architecture (founding member waitlist)
 * - Users now pay via direct Stripe checkout link
 * - Webhook creates account AFTER payment (not before)
 * - No trial period in new pricing model
 *
 * NEW PRICING:
 * - Direct Stripe link: https://buy.stripe.com/6oU9AVgJn4y78iqdU6bsc0n
 * - $497/month early access → $750/month forever lock
 * - Webhook handler: handleCheckoutCompleted() (lines 275-405)
 *
 * PRESERVED FOR:
 * - Historical reference
 * - Potential future self-service tier
 * - Debugging/comparison during migration
 *
 * See: /dev/archive/deprecated-pricing-2025-11-10/README.md
 * ==============================================================================
 */

/*
router.post('/create-subscription', requireStripe, authenticateSupabaseJWT, async (req, res) => {
  try {
    const userId = req.auth?.id;
    const userEmail = req.auth?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info('Creating subscription', { userId, userEmail });

    // Get customer from database
    const customer = await supabaseDataService.getCustomerByEmail(userEmail);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Create or retrieve Stripe customer
    let stripeCustomer;

    if (customer.stripe_customer_id) {
      // Retrieve existing Stripe customer
      stripeCustomer = await stripe.customers.retrieve(customer.stripe_customer_id);
    } else {
      // Create new Stripe customer
      stripeCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId,
          customer_id: customer.customer_id,
        },
      });

      // Update database with Stripe customer ID
      await supabaseDataService.updateCustomer(customer.customer_id, {
        stripe_customer_id: stripeCustomer.id,
      });
    }

    // Create Checkout Session with trial
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          supabase_user_id: userId,
          customer_id: customer.customer_id,
        },
      },
      success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/pricing`,
      metadata: {
        supabase_user_id: userId,
        customer_id: customer.customer_id,
      },
    });

    logger.info('Checkout session created', { sessionId: session.id, userId });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Error creating subscription', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});
*/

/**
 * POST /api/payment/webhook
 * Handle Stripe webhook events
 * Processes: checkout.session.completed, customer.subscription.*, invoice.*
 */
router.post('/webhook', requireStripe, async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info('Webhook received', { type: event.type, eventId: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', { error: error.message, stack: error.stack, eventType: event.type });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/payment/subscription-status
 * Get current subscription status for authenticated user
 */
router.get('/subscription-status', requireStripe, authenticateSupabaseJWT, async (req, res) => {
  try {
    const userId = req.auth?.id;
    const userEmail = req.auth?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customer = await supabaseDataService.getCustomerByEmail(userEmail);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      subscription_status: customer.subscription_status || 'none',
      trial_end_date: customer.trial_end_date,
      subscription_current_period_end: customer.subscription_current_period_end,
      stripe_subscription_id: customer.stripe_subscription_id,
    });
  } catch (error) {
    logger.error('Error fetching subscription status', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * POST /api/payment/cancel-subscription
 * Cancel subscription (at end of billing period)
 */
router.post('/cancel-subscription', requireStripe, authenticateSupabaseJWT, async (req, res) => {
  try {
    const userId = req.auth?.id;
    const userEmail = req.auth?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customer = await supabaseDataService.getCustomerByEmail(userEmail);

    if (!customer || !customer.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel at end of billing period
    const subscription = await stripe.subscriptions.update(
      customer.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    logger.info('Subscription cancelled', { subscriptionId: subscription.id, userId });

    res.json({
      message: 'Subscription will cancel at end of billing period',
      cancel_at: new Date(subscription.current_period_end * 1000),
    });
  } catch (error) {
    logger.error('Error cancelling subscription', { error: error.message });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ==================== Webhook Handlers ====================

/**
 * Handle Stripe checkout completion for founding member waitlist
 *
 * NEW FLOW (Payment-First Architecture):
 * 1. Extract customer email from Stripe session
 * 2. Find assessment by email (if exists)
 * 3. Create Supabase auth user
 * 4. Link assessment to new user
 * 5. Create user_milestone: 'waitlist_paid'
 * 6. Send magic link email for first login
 */
async function handleCheckoutCompleted(session) {
  try {
    // Extract customer email from Stripe session
    const customerEmail = session.customer_details?.email;
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    if (!customerEmail) {
      logger.error('No customer email in checkout session', { sessionId: session.id });
      return;
    }

    logger.info('Processing founding member payment', {
      email: customerEmail,
      sessionId: session.id
    });

    // Step 1: Find assessment by email (using assessment_sessions table)
    const { data: assessmentSessions, error: assessmentError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('user_email', customerEmail)
      .order('created_at', { ascending: false })
      .limit(1);

    if (assessmentError) {
      logger.error('Error fetching assessment', { error: assessmentError, email: customerEmail });
      // Continue - user may not have taken assessment yet
    }

    const assessmentSession = assessmentSessions?.[0];

    // Step 2: Create Supabase auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: customerEmail,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        is_founding_member: true,
        payment_date: new Date().toISOString(),
        stripe_customer_id: stripeCustomerId,
        assessment_session_id: assessmentSession?.session_id,
      }
    });

    if (authError) {
      logger.error('Error creating Supabase user', { error: authError, email: customerEmail });
      throw authError;
    }

    logger.info('Supabase auth user created', { userId: authUser.user.id, email: customerEmail });

    // Step 3: Link assessment to user (if exists)
    if (assessmentSession) {
      const { error: updateError } = await supabase
        .from('assessment_sessions')
        .update({
          user_id: authUser.user.id,
          status: 'linked',
          updated_at: new Date().toISOString()
        })
        .eq('session_id', assessmentSession.session_id);

      if (updateError) {
        logger.error('Error linking assessment to user', { error: updateError });
      } else {
        logger.info('Assessment linked to user', {
          userId: authUser.user.id,
          sessionId: assessmentSession.session_id
        });
      }
    }

    // Step 4: Create user_milestone: 'waitlist_paid'
    const { error: milestoneError } = await supabase
      .from('user_milestones')
      .insert({
        user_id: authUser.user.id,
        milestone_type: 'waitlist_paid',
        status: 'completed',
        completed_at: new Date().toISOString(),
        is_founding_member: true,
        has_early_access: false, // Access granted on December 1, 2025
        access_granted_date: PLATFORM_ACCESS_GRANT_DATE.toISOString(),
        forever_lock_price: FOUNDING_MEMBER_FOREVER_LOCK_PRICE,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        metadata: {
          payment_session_id: session.id,
          payment_amount: session.amount_total / 100, // Convert from cents
          payment_currency: session.currency,
          early_access_price: FOUNDING_MEMBER_EARLY_ACCESS_PRICE,
        }
      });

    if (milestoneError) {
      logger.error('Error creating milestone', { error: milestoneError });
      throw milestoneError;
    }

    logger.info('Milestone created: waitlist_paid', { userId: authUser.user.id });

    // Step 5: Send magic link email (Supabase handles this automatically)
    const { error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo: `${FRONTEND_URL}/waitlist-welcome`
      }
    });

    if (magicLinkError) {
      logger.error('Error generating magic link', { error: magicLinkError });
      // Don't throw - user can still login via Google OAuth
    } else {
      logger.info('Magic link sent', { email: customerEmail });
    }

    logger.info('Founding member onboarding complete', {
      userId: authUser.user.id,
      email: customerEmail,
      accessGrantDate: PLATFORM_ACCESS_GRANT_DATE
    });

  } catch (error) {
    logger.error('Error in handleCheckoutCompleted', {
      error: error.message,
      stack: error.stack,
      sessionId: session.id
    });
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.metadata?.customer_id;

  if (!customerId) {
    logger.warn('Missing customer_id in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  await supabaseDataService.updateCustomer(customerId, {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status === 'trialing' ? 'trial' : 'active',
    trial_end_date: trialEnd,
    subscription_start_date: new Date(subscription.created * 1000),
    subscription_current_period_end: new Date(subscription.current_period_end * 1000),
  });

  logger.info('Subscription created', { customerId, subscriptionId: subscription.id });
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.metadata?.customer_id;

  if (!customerId) {
    // Try to find customer by stripe_subscription_id
    const customer = await supabaseDataService.getCustomerByStripeSubscriptionId(subscription.id);
    if (!customer) {
      logger.warn('Could not find customer for subscription', { subscriptionId: subscription.id });
      return;
    }
    customerId = customer.customer_id;
  }

  // Map Stripe status to our subscription_status
  let subscriptionStatus;
  switch (subscription.status) {
    case 'trialing':
      subscriptionStatus = 'trial';
      break;
    case 'active':
      subscriptionStatus = 'active';
      break;
    case 'past_due':
      subscriptionStatus = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      subscriptionStatus = 'cancelled';
      break;
    default:
      subscriptionStatus = 'none';
  }

  await supabaseDataService.updateCustomer(customerId, {
    subscription_status: subscriptionStatus,
    subscription_current_period_end: new Date(subscription.current_period_end * 1000),
    subscription_cancel_date: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
  });

  logger.info('Subscription updated', { customerId, subscriptionId: subscription.id, status: subscriptionStatus });
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.metadata?.customer_id;

  if (!customerId) {
    const customer = await supabaseDataService.getCustomerByStripeSubscriptionId(subscription.id);
    if (!customer) {
      logger.warn('Could not find customer for deleted subscription', { subscriptionId: subscription.id });
      return;
    }
    customerId = customer.customer_id;
  }

  await supabaseDataService.updateCustomer(customerId, {
    subscription_status: 'cancelled',
    subscription_cancel_date: new Date(),
  });

  logger.info('Subscription deleted', { customerId, subscriptionId: subscription.id });
}

async function handlePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.metadata?.customer_id;

  if (!customerId) {
    const customer = await supabaseDataService.getCustomerByStripeSubscriptionId(subscriptionId);
    if (!customer) {
      logger.warn('Could not find customer for payment', { subscriptionId });
      return;
    }
    customerId = customer.customer_id;
  }

  // Update subscription status (trial → active after first payment)
  await supabaseDataService.updateCustomer(customerId, {
    subscription_status: 'active',
    subscription_current_period_end: new Date(subscription.current_period_end * 1000),
  });

  logger.info('Payment succeeded', { customerId, subscriptionId, invoiceId: invoice.id });
}

async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.metadata?.customer_id;

  if (!customerId) {
    const customer = await supabaseDataService.getCustomerByStripeSubscriptionId(subscriptionId);
    if (!customer) {
      logger.warn('Could not find customer for failed payment', { subscriptionId });
      return;
    }
    customerId = customer.customer_id;
  }

  // Mark as past_due
  await supabaseDataService.updateCustomer(customerId, {
    subscription_status: 'past_due',
  });

  logger.warn('Payment failed', { customerId, subscriptionId, invoiceId: invoice.id });
}

export default router;
