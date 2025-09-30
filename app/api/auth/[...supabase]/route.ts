// Supabase Auth Callback Handler
// Handles OAuth callbacks and session management

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/app/lib/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', error);
      errorUrl.searchParams.set('message', errorDescription || 'Authentication failed');
      return NextResponse.redirect(errorUrl);
    }

    if (code) {
      const cookieStore = await cookies();
      const supabase = createServerClient<Database>(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: any) {
              cookieStore.set({ name, value: '', ...options });
            },
          },
        }
      );

      // Exchange code for session
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        const errorUrl = new URL('/login', requestUrl.origin);
        errorUrl.searchParams.set('error', 'session_error');
        errorUrl.searchParams.set('message', 'Failed to create session');
        return NextResponse.redirect(errorUrl);
      }

      if (data.session && data.user) {
        console.log('✅ Auth callback successful for user:', data.user.email);
        
        // Ensure user profile exists in our database
        try {
          const { data: existingProfile, error: profileError } = await supabase
            .from('customer_profiles')
            .select('id')
            .eq('customer_id', data.user.id)
            .single();

          if (!existingProfile && !profileError) {
            // Create new profile
            const profileData = {
              customer_id: data.user.id,
              email: data.user.email || '',
              first_name: data.user.user_metadata?.first_name || '',
              last_name: data.user.user_metadata?.last_name || '',
              company_name: data.user.user_metadata?.company_name || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase
              .from('customer_profiles')
              .insert(profileData as any);

            if (insertError) {
              console.error('Error creating user profile:', insertError);
            } else {
              console.log('✅ User profile created for:', data.user.email);
            }
          }
        } catch (profileError) {
          console.error('Error handling user profile:', profileError);
          // Don't fail the auth flow for profile errors
        }

        // Redirect to intended destination
        const redirectUrl = new URL(next, requestUrl.origin);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // No code provided, redirect to login
    const loginUrl = new URL('/login', requestUrl.origin);
    return NextResponse.redirect(loginUrl);

  } catch (error) {
    console.error('Auth callback error:', error);
    
    const requestUrl = new URL(request.url);
    const errorUrl = new URL('/login', requestUrl.origin);
    errorUrl.searchParams.set('error', 'callback_error');
    errorUrl.searchParams.set('message', 'Authentication callback failed');
    
    return NextResponse.redirect(errorUrl);
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { action, ...body } = await request.json() as { action: string; [key: string]: unknown };

    switch (action) {
      case 'signOut':
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { success: true },
          { status: 200 }
        );

      case 'getSession':
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          return NextResponse.json(
            { error: sessionError.message },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { session },
          { status: 200 }
        );

      case 'refreshSession':
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          return NextResponse.json(
            { error: refreshError.message },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { session: data.session },
          { status: 200 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Auth API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}