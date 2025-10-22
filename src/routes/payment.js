import express from 'express';
import Stripe from 'stripe';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import logger from '../utils/logger.js';
import supabaseDataService from '../services/supabaseDataService.js';

const router = express.Router();

// Initialize Stripe only if API key is provided
// This allows the server to start even if Stripe is not configured
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-10-28.acacia' })
  : null;

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TRIAL_PERIOD_DAYS = 3;
const PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID; // $99/month price ID from Stripe

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
 * POST /api/payment/create-subscription
 * Create a Stripe subscription with 3-day trial
 * Requires: Authenticated user
 */
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

/**
 * POST /api/payment/webhook
 * Handle Stripe webhook events
 * Processes: checkout.session.completed, customer.subscription.*, invoice.*
 */
router.post('/webhook', requireStripe, express.raw({ type: 'application/json' }), async (req, res) => {
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

async function handleCheckoutCompleted(session) {
  const customerId = session.metadata?.customer_id;
  const subscriptionId = session.subscription;

  if (!customerId || !subscriptionId) {
    logger.warn('Missing metadata in checkout session', { sessionId: session.id });
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  // Update customer in database
  await supabaseDataService.updateCustomer(customerId, {
    stripe_subscription_id: subscriptionId,
    subscription_status: subscription.status === 'trialing' ? 'trial' : 'active',
    trial_end_date: trialEnd,
    subscription_start_date: new Date(subscription.created * 1000),
    subscription_current_period_end: new Date(subscription.current_period_end * 1000),
  });

  logger.info('Checkout completed, customer updated', { customerId, subscriptionId, status: subscription.status });
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
