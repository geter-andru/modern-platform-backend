import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get current user from request headers or session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');
    const status = url.searchParams.get('status') || 'pending';

    let query = supabase
      .from('team_invitations')
      .select(`
        *,
        organizations (
          id,
          name,
          slug
        ),
        invited_by_user:auth.users!team_invitations_invited_by_fkey (
          email,
          raw_user_meta_data
        )
      `)
      .eq('status', status);

    if (organizationId) {
      // Check if user has permission to view invitations for this organization
      const { data: membership } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (!membership || !['admin', 'manager', 'owner'].includes((membership as any).role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      query = query.eq('organization_id', organizationId);
    } else {
      // Get invitations for organizations where user has admin/manager role
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .in('role', ['admin', 'manager', 'owner'])
        .eq('is_active', true);

      if (!userOrgs || userOrgs.length === 0) {
        return NextResponse.json({ invitations: [], count: 0 });
      }

      const orgIds = userOrgs.map((org: any) => org.organization_id);
      query = query.in('organization_id', orgIds);
    }

    const { data: invitations, error: queryError } = await query
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('❌ Invitations fetch error:', queryError);
      return NextResponse.json({
        error: 'Failed to fetch invitations',
        details: queryError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      invitations: invitations || [],
      count: invitations?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Invitations API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user from request headers or session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      organizationId, 
      email, 
      role = 'member', 
      permissions = [] 
    } = body as { organizationId: string; email: string; role?: string; permissions?: string[] };

    if (!organizationId || !email) {
      return NextResponse.json({
        error: 'Organization ID and email are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Check if user has permission to invite to this organization
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 });
    }

    if (!['admin', 'manager', 'owner'].includes((membership as any).role)) {
      return NextResponse.json({ error: 'Insufficient permissions to invite users' }, { status: 403 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('user_organizations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', await getUserIdByEmail(email))
      .single();

    if (existingMember) {
      return NextResponse.json({
        error: 'User is already a member of this organization'
      }, { status: 409 });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json({
        error: 'Pending invitation already exists for this email'
      }, { status: 409 });
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, max_members')
      .eq('id', organizationId)
      .single();

    if (!organization) {
      return NextResponse.json({
        error: 'Organization not found'
      }, { status: 404 });
    }

    // Check member limit
    const { data: memberCount } = await supabase
      .from('user_organizations')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if ((memberCount?.length || 0) >= (organization as any).max_members) {
      return NextResponse.json({
        error: 'Organization has reached maximum member limit'
      }, { status: 409 });
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('team_invitations')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role,
        permissions,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        status: 'pending'
      } as any)
      .select(`
        *,
        organizations (
          id,
          name,
          slug
        )
      `)
      .single();

    if (inviteError) {
      console.error('❌ Invitation creation error:', inviteError);
      return NextResponse.json({
        error: 'Failed to create invitation',
        details: inviteError.message
      }, { status: 500 });
    }

    // Log activity
    await supabaseAdmin
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        activity_type: 'invitation_sent',
        details: {
          invited_email: email,
          role: role,
          organization_name: (organization as any).name,
          timestamp: new Date().toISOString()
        }
      } as any);

    // TODO: Send email notification (integrate with email service)
    console.log('📧 Invitation created for:', email, 'to organization:', (organization as any).name);

    return NextResponse.json({
      success: true,
      invitation,
      message: 'Invitation sent successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Invitation creation API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get current user from request headers or session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invitationId, action } = body as { invitationId: string; action: string }; // action: 'accept', 'decline', 'revoke'

    if (!invitationId || !action) {
      return NextResponse.json({
        error: 'Invitation ID and action are required'
      }, { status: 400 });
    }

    // Get invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from('team_invitations')
      .select(`
        *,
        organizations (
          id,
          name,
          max_members
        )
      `)
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({
        error: 'Invitation not found'
      }, { status: 404 });
    }

    // Check if invitation is expired
    if (new Date((invitation as any).expires_at) < new Date()) {
      await (supabaseAdmin
        .from('team_invitations') as any)
        .update({ status: 'expired' })
        .eq('id', invitationId);

      return NextResponse.json({
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    if (action === 'accept') {
      // Only the invited user can accept
      if ((invitation as any).email !== user.email) {
        return NextResponse.json({
          error: 'You can only accept invitations sent to your email'
        }, { status: 403 });
      }

      if ((invitation as any).status !== 'pending') {
        return NextResponse.json({
          error: 'Invitation is no longer pending'
        }, { status: 409 });
      }

      // Check member limit
      const { data: memberCount } = await supabase
        .from('user_organizations')
        .select('id', { count: 'exact' })
        .eq('organization_id', (invitation as any).organization_id)
        .eq('is_active', true);

      if ((memberCount?.length || 0) >= (invitation as any).organizations.max_members) {
        return NextResponse.json({
          error: 'Organization has reached maximum member limit'
        }, { status: 409 });
      }

      // Add user to organization
      const { error: membershipError } = await supabaseAdmin
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: (invitation as any).organization_id,
          role: (invitation as any).role,
          permissions: (invitation as any).permissions,
          invited_by: (invitation as any).invited_by,
          is_active: true
        } as any);

      if (membershipError) {
        console.error('❌ Membership creation error:', membershipError);
        return NextResponse.json({
          error: 'Failed to add user to organization',
          details: membershipError.message
        }, { status: 500 });
      }

      // Update invitation status
        await (supabaseAdmin as any)
          .from('team_invitations')
          .update({ 
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
        .eq('id', invitationId);

      // Log activity
      await (supabaseAdmin as any)
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          organization_id: (invitation as any).organization_id,
          activity_type: 'invitation_accepted',
          details: {
            organization_name: (invitation as any).organizations.name,
            role: (invitation as any).role,
            timestamp: new Date().toISOString()
          }
        });

    } else if (action === 'decline') {
      // Only the invited user can decline
      if ((invitation as any).email !== user.email) {
        return NextResponse.json({
          error: 'You can only decline invitations sent to your email'
        }, { status: 403 });
      }

      await (supabaseAdmin as any)
        .from('team_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

    } else if (action === 'revoke') {
      // Only organization admins can revoke
      const { data: membership } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', (invitation as any).organization_id)
        .eq('is_active', true)
        .single();

      if (!membership || !['admin', 'owner'].includes((membership as any).role)) {
        return NextResponse.json({
          error: 'Insufficient permissions to revoke invitation'
        }, { status: 403 });
      }

      await (supabaseAdmin as any)
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);
    }

    return NextResponse.json({
      success: true,
      message: `Invitation ${action}ed successfully`
    });

  } catch (error: any) {
    console.error('❌ Invitation action API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to get user ID by email
async function getUserIdByEmail(email: string) {
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();
    
  return (data as any)?.id || null;
}