import { NextRequest, NextResponse } from 'next/server';
import { withAuth, verifyCustomerAccess, AuthUser } from '../../../middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Real backend integration - fetch milestones data from Supabase
async function getMilestonesData(customerId: string) {
  try {
    // Get customer milestones from Supabase
    const { data: milestones, error: milestonesError } = await supabaseAdmin
      .from('customer_milestones')
      .select(`
        *,
        milestone_templates (
          name,
          description,
          points,
          category,
          required_steps
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });

    if (milestonesError) {
      throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
    }

    // Calculate total and earned points
    const totalPoints = (milestones as any)?.reduce((sum: number, milestone: any) =>
      sum + (milestone.milestone_templates?.points || 0), 0) || 0;

    const earnedPoints = (milestones as any)?.reduce((sum: number, milestone: any) =>
      sum + (milestone.status === 'completed' ? (milestone.milestone_templates?.points || 0) : 0), 0) || 0;

    // Find next milestone
    const nextMilestone = (milestones as any)?.find((m: any) => m.status === 'in_progress' || m.status === 'pending');
    
    // Transform data to match expected format
    const transformedMilestones = (milestones as any)?.map((milestone: any) => ({
      id: milestone.id,
      name: milestone.milestone_templates?.name || milestone.name,
      description: milestone.milestone_templates?.description || milestone.description,
      status: milestone.status,
      completedAt: milestone.completed_at,
      progress: milestone.progress || 0,
      points: milestone.milestone_templates?.points || milestone.points || 0,
      category: milestone.milestone_templates?.category || milestone.category || 'general'
    })) || [];

    return {
      customerId,
      milestones: transformedMilestones,
      totalPoints,
      earnedPoints,
      nextMilestone: nextMilestone ? {
        id: nextMilestone.id,
        name: nextMilestone.milestone_templates?.name || nextMilestone.name,
        remainingSteps: nextMilestone.milestone_templates?.required_steps?.length || 3
      } : null
    };

  } catch (error) {
    console.error('Error fetching milestones data:', error);
    throw error;
  }
}

/**
 * GET /api/progress/[customerId]/milestones
 * Get customer milestones
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
      
      // Fetch real milestones data from Supabase
      const milestonesData = await getMilestonesData(customerId);
      
      return NextResponse.json({
        success: true,
        data: milestonesData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Milestones API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch milestones',
          details: error.message
        },
        { status: 500 }
      );
    }
  });
}