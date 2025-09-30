import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First try to get existing profile
    let { data: profile, error } = await (supabase as any)
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it (fallback for migration)
    if (error && error.code === 'PGRST116') {
      console.log('🔄 Profile not found, creating...');
      
      const newProfile = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        company: user.user_metadata?.company || '',
        preferences: {
          email_notifications: true,
          marketing_emails: false,
          theme: 'system',
          language: 'en'
        },
        onboarding_completed: false,
        onboarding_step: 0,
        is_active: true
      };

      // Try to create profile using admin client if regular insert fails
      const { data: createdProfile, error: createError } = await (supabaseAdmin as any)
        .from('user_profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create profile:', createError);
        // Return basic profile from auth user if database profile creation fails
        return NextResponse.json({
          profile: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            company: user.user_metadata?.company || '',
            preferences: newProfile.preferences,
            onboarding_completed: false,
            onboarding_step: 0,
            is_active: true,
            created_at: user.created_at,
            updated_at: new Date().toISOString(),
            source: 'auth_fallback'
          }
        });
      }

      profile = createdProfile;
    } else if (error) {
      console.error('❌ Profile fetch error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch profile',
        details: error.message 
      }, { status: 500 });
    }

    // Get user roles and organizations
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: organizations } = await supabase
      .from('user_organizations')
      .select(`
        *,
        organizations (
          id,
          name,
          slug,
          plan
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    return NextResponse.json({
      profile: {
        ...profile,
        roles: roles || [],
        organizations: organizations || []
      }
    });

  } catch (error: any) {
    console.error('❌ Profile API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      full_name, 
      avatar_url, 
      company, 
      job_title, 
      phone, 
      timezone, 
      locale,
      preferences 
    } = body;

    // Validate preferences structure if provided
    if (preferences && typeof preferences !== 'object') {
      return NextResponse.json({
        error: 'Invalid preferences format'
      }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided
    if (full_name !== undefined) updateData.full_name = full_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (company !== undefined) updateData.company = company;
    if (job_title !== undefined) updateData.job_title = job_title;
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (locale !== undefined) updateData.locale = locale;
    if (preferences !== undefined) updateData.preferences = preferences;

    // Try to update existing profile
    const { data: updatedProfile, error } = await (supabase as any)
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    // If profile doesn't exist, create it with the update data
    if (error && error.code === 'PGRST116') {
      console.log('🔄 Profile not found during update, creating...');
      
      const newProfile = {
        id: user.id,
        email: user.email!,
        full_name: full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: avatar_url || user.user_metadata?.avatar_url || '',
        company: company || user.user_metadata?.company || '',
        job_title: job_title || '',
        phone: phone || '',
        timezone: timezone || 'UTC',
        locale: locale || 'en',
        preferences: preferences || {
          email_notifications: true,
          marketing_emails: false,
          theme: 'system',
          language: 'en'
        },
        onboarding_completed: false,
        onboarding_step: 0,
        is_active: true
      };

      const { data: createdProfile, error: createError } = await (supabaseAdmin as any)
        .from('user_profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create profile during update:', createError);
        return NextResponse.json({
          error: 'Failed to create profile',
          details: createError.message
        }, { status: 500 });
      }

      // updatedProfile = createdProfile; // MVP: Skip this assignment for now
    } else if (error) {
      console.error('❌ Profile update error:', error);
      return NextResponse.json({
        error: 'Failed to update profile',
        details: error.message
      }, { status: 500 });
    }

    // Log activity
    await supabaseAdmin
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        activity_type: 'profile_update',
        details: { 
          updated_fields: Object.keys(updateData).filter(key => key !== 'updated_at'),
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Profile update API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete - deactivate profile instead of hard delete
    const { data: updatedProfile, error } = await (supabase as any)
      .from('user_profiles')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Profile deactivation error:', error);
      return NextResponse.json({
        error: 'Failed to deactivate profile',
        details: error.message
      }, { status: 500 });
    }

    // Log activity
    await supabaseAdmin
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        activity_type: 'profile_update',
        details: { 
          action: 'deactivated',
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      message: 'Profile deactivated successfully'
    });

  } catch (error: any) {
    console.error('❌ Profile deletion API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}