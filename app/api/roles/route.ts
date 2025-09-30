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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const organizationId = url.searchParams.get('organizationId');

    // Check if user has permission to view roles
    const isAdmin = user.email?.endsWith('@andru.ai') || false;
    
    if (userId && userId !== user.id && !isAdmin) {
      // Check if user is admin in shared organization
      if (organizationId) {
        const { data: membership } = await supabase
          .from('user_organizations')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .single();

        if (!membership || !['admin', 'owner'].includes((membership as any).role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Get user roles
    const targetUserId = userId || user.id;
    
    const query = supabase
      .from('user_roles' as any)
      .select(`
        *,
        granted_by_user:auth.users!user_roles_granted_by_fkey (
          email,
          raw_user_meta_data
        )
      `)
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    const { data: userRoles, error } = await query
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('❌ User roles fetch error:', error);
      return NextResponse.json({
        error: 'Failed to fetch user roles',
        details: error.message
      }, { status: 500 });
    }

    // Get available role permissions
    const { data: rolePermissions } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role_name', { ascending: true });

    // Get all available permissions
    const { data: allPermissions } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true });

    return NextResponse.json({
      userRoles: userRoles || [],
      rolePermissions: rolePermissions || [],
      availablePermissions: allPermissions || []
    });

  } catch (error: any) {
    console.error('❌ Roles API error:', error);
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can assign roles
    const isAdmin = user.email?.endsWith('@andru.ai') || false;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      userId, 
      roleName, 
      expiresAt, 
      metadata = {} 
    } = body;

    if (!userId || !roleName) {
      return NextResponse.json({
        error: 'User ID and role name are required'
      }, { status: 400 });
    }

    // Validate role name
    const validRoles = ['super_admin', 'admin', 'manager', 'user', 'guest', 'readonly'];
    if (!validRoles.includes(roleName)) {
      return NextResponse.json({
        error: 'Invalid role name'
      }, { status: 400 });
    }

    // Check if user already has this role
    const { data: existingRole } = await supabase
      .from('user_roles' as any)
      .select('id')
      .eq('user_id', userId)
      .eq('role_name', roleName)
      .eq('is_active', true)
      .single();

    if (existingRole) {
      return NextResponse.json({
        error: 'User already has this role'
      }, { status: 409 });
    }

    // Create role assignment
    const { data: newRole, error: roleError } = await (supabaseAdmin as any)
      .from('user_roles')
      .insert({
        user_id: userId,
        role_name: roleName,
        granted_by: user.id,
        expires_at: expiresAt || null,
        metadata,
        is_active: true
      })
      .select()
      .single();

    if (roleError) {
      console.error('❌ Role assignment error:', roleError);
      return NextResponse.json({
        error: 'Failed to assign role',
        details: roleError.message
      }, { status: 500 });
    }

    // Log activity
    await (supabaseAdmin as any)
      .from('user_activity_log')
      .insert({
        user_id: userId,
        activity_type: 'role_change',
        details: {
          action: 'role_assigned',
          role_name: roleName,
          assigned_by: user.email,
          expires_at: expiresAt,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      role: newRole,
      message: 'Role assigned successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Role assignment API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get current user from request headers or session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can revoke roles
    const isAdmin = user.email?.endsWith('@andru.ai') || false;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json({
        error: 'Role ID is required'
      }, { status: 400 });
    }

    // Get role details before deletion
    const { data: role } = await supabase
      .from('user_roles' as any)
      .select('user_id, role_name')
      .eq('id', roleId)
      .single();

    if (!role) {
      return NextResponse.json({
        error: 'Role not found'
      }, { status: 404 });
    }

    // Deactivate role (soft delete)
    const { error: updateError } = await (supabaseAdmin as any)
      .from('user_roles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId);

    if (updateError) {
      console.error('❌ Role revocation error:', updateError);
      return NextResponse.json({
        error: 'Failed to revoke role',
        details: updateError.message
      }, { status: 500 });
    }

    // Log activity
    await (supabaseAdmin as any)
      .from('user_activity_log')
      .insert({
        user_id: (role as any).user_id,
        activity_type: 'role_change',
        details: {
          action: 'role_revoked',
          role_name: (role as any).role_name,
          revoked_by: user.email,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      message: 'Role revoked successfully'
    });

  } catch (error: any) {
    console.error('❌ Role revocation API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}