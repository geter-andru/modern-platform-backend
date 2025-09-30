import { NextRequest, NextResponse } from 'next/server';
import { withAuth, verifyCustomerAccess, AuthUser } from '../../middleware/auth';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Real backend integration - fetch progress data from Supabase
async function getProgressData(customerId: string) {
  try {
    // Get customer progress from Supabase
    const { data: progressData, error: progressError } = await supabaseAdmin
      .from('customer_progress')
      .select(`
        *,
        customer_profiles (
          id,
          customer_name,
          current_phase,
          last_activity
        )
      `)
      .eq('customer_id', customerId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch progress data: ${progressError.message}`);
    }

    // Get recent actions
    const { data: recentActions, error: actionsError } = await supabaseAdmin
      .from('user_activity_log')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (actionsError) {
      console.warn('Failed to fetch recent actions:', actionsError.message);
    }

    // Get milestones data
    const { data: milestones, error: milestonesError } = await supabaseAdmin
      .from('customer_milestones')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (milestonesError) {
      console.warn('Failed to fetch milestones:', milestonesError.message);
    }

    // Calculate overall progress
    const completedMilestones = (milestones as any)?.filter((m: any) => m.status === 'completed').length || 0;
    const totalMilestones = milestones?.length || 1;
    const overallProgress = Math.round((completedMilestones / totalMilestones) * 100);

    // Get tools usage metrics
    const { data: toolsUsage, error: toolsError } = await supabaseAdmin
      .from('tools_usage')
      .select('tool_name, completion_percentage')
      .eq('customer_id', customerId);

    if (toolsError) {
      console.warn('Failed to fetch tools usage:', toolsError.message);
    }

    // Build metrics object
    const metrics = {
      icpCompleteness: (toolsUsage as any)?.find((t: any) => t.tool_name === 'icp_analysis')?.completion_percentage || 0,
      costCalculatorUsage: (toolsUsage as any)?.find((t: any) => t.tool_name === 'cost_calculator')?.completion_percentage || 0,
      businessCaseProgress: (toolsUsage as any)?.find((t: any) => t.tool_name === 'business_case')?.completion_percentage || 0
    };

    // Generate next steps based on current progress
    const nextSteps = [];
    if (metrics.icpCompleteness < 100) {
      nextSteps.push('Complete ICP Analysis');
    }
    if (metrics.costCalculatorUsage < 100) {
      nextSteps.push('Finish Cost Calculator');
    }
    if (metrics.businessCaseProgress < 100) {
      nextSteps.push('Complete Business Case Builder');
    }
    if (nextSteps.length === 0) {
      nextSteps.push('Export comprehensive report', 'Schedule stakeholder review');
    }

    return {
      customerId,
      overallProgress,
      toolsCompleted: completedMilestones,
      totalTools: totalMilestones,
      currentPhase: (progressData as any)?.customer_profiles?.current_phase || 'Getting Started',
      lastActivity: (progressData as any)?.customer_profiles?.last_activity || new Date().toISOString(),
      metrics,
      recentActions: (recentActions as any)?.map((action: any) => ({
        action: action.activity_type,
        timestamp: action.created_at,
        impact: action.impact_level || 'medium'
      })) || [],
      nextSteps
    };

  } catch (error) {
    console.error('Error fetching progress data:', error);
    throw error;
  }
}

/**
 * GET /api/progress/[customerId]
 * Get customer progress dashboard data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  return withAuth(request, async (req: NextRequest, user: AuthUser) => {
    try {
      const { customerId } = await params;
      
      // Verify the user has access to this customer's data
      if (!verifyCustomerAccess(user, customerId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            details: 'You can only access your own customer data'
          },
          { status: 403 }
        );
      }
      
      // Fetch real progress data from Supabase
      const progressData = await getProgressData(customerId);
      
      return NextResponse.json({
        success: true,
        data: progressData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Progress API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch progress data',
          details: error.message
        },
        { status: 500 }
      );
    }
  });
}