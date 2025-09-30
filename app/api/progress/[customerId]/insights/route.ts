import { NextRequest, NextResponse } from 'next/server';
import { withAuth, verifyCustomerAccess, AuthUser } from '../../../middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Real backend integration - fetch insights data from Supabase
async function getInsightsData(customerId: string) {
  try {
    // Get customer insights from Supabase
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from('customer_insights')
      .select(`
        *,
        insight_templates (
          type,
          priority,
          title,
          description,
          action_url,
          estimated_time
        )
      `)
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (insightsError) {
      throw new Error(`Failed to fetch insights: ${insightsError.message}`);
    }

    // Get customer statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('customer_statistics')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.warn('Failed to fetch statistics:', statsError.message);
    }

    // Get tools usage for recommendations
    const { data: toolsUsage, error: toolsError } = await supabaseAdmin
      .from('tools_usage')
      .select('tool_name, completion_percentage, time_spent')
      .eq('customer_id', customerId);

    if (toolsError) {
      console.warn('Failed to fetch tools usage:', toolsError.message);
    }

    // Generate dynamic insights based on current progress
    const dynamicInsights = [];
    
    // Check ICP completion
    const icpProgress = (toolsUsage as any)?.find((t: any) => t.tool_name === 'icp_analysis')?.completion_percentage || 0;
    if (icpProgress < 100) {
      dynamicInsights.push({
        id: 'dynamic-icp',
        type: 'recommendation',
        priority: 'high',
        title: 'Complete Your ICP Analysis',
        description: `You're ${icpProgress}% through the ICP Analysis. Completing it will unlock advanced customer insights.`,
        actionUrl: '/icp-analysis',
        estimatedTime: '20 minutes'
      });
    }

    // Check Cost Calculator completion
    const costProgress = (toolsUsage as any)?.find((t: any) => t.tool_name === 'cost_calculator')?.completion_percentage || 0;
    if (costProgress < 100) {
      dynamicInsights.push({
        id: 'dynamic-cost',
        type: 'recommendation',
        priority: 'medium',
        title: 'Finish Cost Calculator',
        description: `You're ${costProgress}% through the Cost Calculator. Complete it to quantify your business impact.`,
        actionUrl: '/cost-calculator',
        estimatedTime: '15 minutes'
      });
    }

    // Check Business Case completion
    const businessCaseProgress = (toolsUsage as any)?.find((t: any) => t.tool_name === 'business_case')?.completion_percentage || 0;
    if (businessCaseProgress < 100) {
      dynamicInsights.push({
        id: 'dynamic-business-case',
        type: 'recommendation',
        priority: 'high',
        title: 'Complete Your Business Case',
        description: `You're ${businessCaseProgress}% through the Business Case Builder. Completing it will unlock advanced export options.`,
        actionUrl: '/business-case',
        estimatedTime: '15 minutes'
      });
    }

    // Transform insights data
    const transformedInsights = (insights as any)?.map((insight: any) => ({
      id: insight.id,
      type: insight.insight_templates?.type || insight.type,
      priority: insight.insight_templates?.priority || insight.priority,
      title: insight.insight_templates?.title || insight.title,
      description: insight.insight_templates?.description || insight.description,
      actionUrl: insight.insight_templates?.action_url || insight.action_url,
      estimatedTime: insight.insight_templates?.estimated_time || insight.estimated_time
    })) || [];

    // Combine static and dynamic insights
    const allInsights = [...transformedInsights, ...dynamicInsights];

    // Calculate statistics
    const toolsUsed = (toolsUsage as any)?.length || 0;
    const totalTools = 3; // ICP, Cost Calculator, Business Case
    const completionRate = toolsUsed > 0 ? Math.round(((toolsUsage as any)?.reduce((sum: number, tool: any) => sum + tool.completion_percentage, 0) || 0) / toolsUsed) : 0;
    const averageTimePerTool = toolsUsed > 0 ?
      Math.round(((toolsUsage as any)?.reduce((sum: number, tool: any) => sum + (tool.time_spent || 0), 0) || 0) / toolsUsed / 60000) + ' minutes' :
      '0 minutes';

    // Generate recommendations
    const nextBestAction = allInsights.find(i => i.priority === 'high')?.title || 'Complete ICP Analysis';
    const estimatedImpact = allInsights.find(i => i.priority === 'high') ? 'High' : 'Medium';
    const timeToComplete = allInsights.find(i => i.priority === 'high')?.estimatedTime || '15 minutes';

    return {
      customerId,
      insights: allInsights,
      statistics: {
        toolsUsed,
        totalTools,
        completionRate,
        averageTimePerTool,
        lastActive: (stats as any)?.last_activity || new Date().toISOString()
      },
      recommendations: {
        nextBestAction,
        estimatedImpact,
        timeToComplete,
        potentialValue: completionRate > 80 ? '$100,000+ in faster decision making' : '$50,000+ in faster decision making'
      }
    };

  } catch (error) {
    console.error('Error fetching insights data:', error);
    throw error;
  }
}

/**
 * GET /api/progress/[customerId]/insights
 * Get progress insights and recommendations
 */
export async function GET(
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
            details: 'You can only access your own customer data'
          },
          { status: 403 }
        );
      }
      
      // Fetch real insights data from Supabase
      const insightsData = await getInsightsData(customerId);
      
      return NextResponse.json({
        success: true,
        data: insightsData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Insights API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch insights',
          details: error.message
        },
        { status: 500 }
      );
    }
  });
}