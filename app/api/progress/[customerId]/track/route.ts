import { NextRequest, NextResponse } from 'next/server';
import { withAuth, verifyCustomerAccess, AuthUser } from '../../../middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/progress/[customerId]/track
 * Track a customer action or event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  return withAuth(request, async (req: NextRequest, user: AuthUser) => {
    try {
      const { customerId } = await params;
      
      // Verify access
      if (!verifyCustomerAccess(user, customerId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            details: 'You can only track actions for your own account'
          },
          { status: 403 }
        );
      }
      
      // Parse request body
      const body = await req.json();
      const { action, metadata } = body;
      
      // Validate required fields
      if (!action) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            details: 'Action is required'
          },
          { status: 400 }
        );
      }
      
      // Save action to Supabase database
      const { data: trackedAction, error: trackError } = await (supabaseAdmin as any)
        .from('user_activity_log')
        .insert({
          customer_id: customerId,
          user_id: user.id,
          activity_type: action,
          details: metadata || {},
          impact_level: metadata?.impact || 'medium',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (trackError) {
        throw new Error(`Failed to track action: ${trackError.message}`);
      }

      // Check if any milestones were triggered
      const milestonesTriggered = [];
      
      // Get milestone templates to check for triggers
      const { data: milestoneTemplates, error: templatesError } = await supabaseAdmin
        .from('milestone_templates')
        .select('*')
        .eq('trigger_action', action);

      if (templatesError) {
        console.warn('Failed to fetch milestone templates:', templatesError.message);
      }

      // Create milestones for triggered actions
      if (milestoneTemplates && milestoneTemplates.length > 0) {
        for (const template of milestoneTemplates) {
             // Check if milestone already exists
             const { data: existingMilestone } = await (supabaseAdmin as any)
               .from('customer_milestones')
               .select('id')
               .eq('customer_id', customerId)
               .eq('template_id', (template as any).id)
               .single();

          if (!existingMilestone) {
            // Create new milestone
            const { data: newMilestone, error: milestoneError } = await (supabaseAdmin as any)
              .from('customer_milestones')
              .insert({
                customer_id: customerId,
                template_id: (template as any).id,
                status: 'completed',
                completed_at: new Date().toISOString(),
                progress: 100
              })
              .select()
              .single();

            if (!milestoneError && newMilestone) {
              milestonesTriggered.push({
                id: (newMilestone as any).id,
                name: (template as any).name,
                points: (template as any).points
              });
            }
          }
        }
      }

      // Update customer progress
      if (milestonesTriggered.length > 0) {
        const totalPoints = milestonesTriggered.reduce((sum, m) => sum + m.points, 0);
        
               // Update or create customer progress record
               const { error: progressError } = await (supabaseAdmin as any)
                 .from('customer_progress')
                 .upsert({
                   customer_id: customerId,
                   total_points: totalPoints,
                   last_activity: new Date().toISOString(),
                   updated_at: new Date().toISOString()
                 });

        if (progressError) {
          console.warn('Failed to update customer progress:', progressError.message);
        }
      }
      
      return NextResponse.json({
        success: true,
        data: {
          action: trackedAction,
          milestonesTriggered,
          totalPoints: milestonesTriggered.reduce((sum, m) => sum + m.points, 0)
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Track action API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to track action',
          details: error.message
        },
        { status: 500 }
      );
    }
  });
}