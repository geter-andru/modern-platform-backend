import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
// Removed getCurrentUser import - using manual token extraction instead

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

    // Get user's organizations
    const { data: userOrgs, error } = await supabase
      .from('user_organizations')
      .select(`
        id,
        role,
        permissions,
        joined_at,
        is_active,
        organizations (
          id,
          name,
          slug,
          description,
          plan,
          max_members,
          is_active,
          created_at,
          updated_at,
          owner_id
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Organizations fetch error:', error);
      return NextResponse.json({
        error: 'Failed to fetch organizations',
        details: error.message
      }, { status: 500 });
    }

    // For each organization, get member count
    const organizationsWithStats = await Promise.all(
      (userOrgs || []).map(async (userOrg) => {
        const { data: memberCount } = await supabase
          .from('user_organizations')
          .select('id', { count: 'exact' })
          .eq('organization_id', (userOrg as any).organizations.id)
          .eq('is_active', true);

        return {
          ...(userOrg as any),
          organizations: {
            ...(userOrg as any).organizations,
            member_count: memberCount?.length || 0
          }
        };
      })
    );

    return NextResponse.json({
      organizations: organizationsWithStats,
      count: organizationsWithStats.length
    });

  } catch (error: any) {
    console.error('❌ Organizations API error:', error);
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

    const body = await request.json();
    const { name, slug, description, plan = 'basic' } = body;

    if (!name || !slug) {
      return NextResponse.json({
        error: 'Organization name and slug are required'
      }, { status: 400 });
    }

    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({
        error: 'Slug must contain only lowercase letters, numbers, and hyphens'
      }, { status: 400 });
    }

    // Check if slug is already taken
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return NextResponse.json({
        error: 'Organization slug is already taken'
      }, { status: 409 });
    }

    // Create organization
    const { data: newOrg, error: orgError } = await (supabaseAdmin as any)
      .from('organizations')
      .insert({
        name,
        slug,
        description: description || '',
        owner_id: user.id,
        plan,
        max_members: plan === 'basic' ? 5 : plan === 'professional' ? 25 : 100,
        settings: {},
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Organization creation error:', orgError);
      return NextResponse.json({
        error: 'Failed to create organization',
        details: orgError.message
      }, { status: 500 });
    }

    // Add creator as owner in user_organizations
    const { error: memberError } = await (supabaseAdmin as any)
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: newOrg.id,
        role: 'owner',
        permissions: ['read', 'write', 'delete', 'export', 'user.invite', 'user.manage', 'user.roles', 'org.manage'],
        invited_by: user.id,
        is_active: true
      });

    if (memberError) {
      console.error('❌ Organization membership error:', memberError);
      // Clean up - delete the organization if membership creation failed
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', newOrg.id);

      return NextResponse.json({
        error: 'Failed to create organization membership',
        details: memberError.message
      }, { status: 500 });
    }

    // Log activity
    await (supabaseAdmin as any)
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        organization_id: newOrg.id,
        activity_type: 'organization_join',
        details: {
          action: 'created_organization',
          organization_name: name,
          role: 'owner',
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      organization: newOrg,
      message: 'Organization created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Organization creation API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}