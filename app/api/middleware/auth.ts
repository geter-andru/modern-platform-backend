import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('development');

export interface AuthUser {
  id: string;
  email?: string;
  customerId?: string;
  isAdmin?: boolean;
}

/**
 * Authentication middleware for Next.js API routes
 * Validates Supabase session or falls back to legacy token auth
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // First, try Supabase authentication if configured
    if (isSupabaseConfigured) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Get session from cookies
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('sb-access-token')?.value;
      const refreshToken = cookieStore.get('sb-refresh-token')?.value;
      
      if (accessToken) {
        // Verify the session with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        if (!error && user) {
          // Supabase authentication successful
          const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            customerId: user.id, // Use Supabase user ID as customer ID
            isAdmin: user.email === 'geter@humusnshore.org' // Check if admin
          };
          
          return handler(request, authUser);
        }
      }
    }
    
    // Fallback: Check for legacy token authentication (if enabled)
    const enableLegacyAuth = process.env.ENABLE_LEGACY_AUTH === 'true';

    if (enableLegacyAuth) {
      const url = new URL(request.url);
      const token = url.searchParams.get('token');
      const pathParts = url.pathname.split('/');
      const customerIdIndex = pathParts.indexOf('api') + 2; // /api/progress/{customerId}
      const customerId = pathParts[customerIdIndex];

      // Check for admin token (requires both token and customer ID from env)
      const adminDemoToken = process.env.ADMIN_DEMO_TOKEN;
      const adminCustomerId = process.env.ADMIN_CUSTOMER_ID;

      if (adminDemoToken && adminCustomerId &&
          token === adminDemoToken && customerId === adminCustomerId) {
        const authUser: AuthUser = {
          id: adminCustomerId,
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          customerId: adminCustomerId,
          isAdmin: true
        };

        return handler(request, authUser);
      }

      // Check for test token (requires both token and customer ID from env)
      const testToken = process.env.TEST_TOKEN;
      const testCustomerId = process.env.TEST_CUSTOMER_ID;

      if (testToken && testCustomerId &&
          token === testToken && customerId === testCustomerId) {
        const authUser: AuthUser = {
          id: testCustomerId,
          email: process.env.TEST_EMAIL || 'test@example.com',
          customerId: testCustomerId,
          isAdmin: false
        };

        return handler(request, authUser);
      }
    }
    
    // No valid authentication found
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication required',
        details: 'Please provide a valid Supabase session or access token'
      },
      { status: 401 }
    );
    
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication service error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Extract customer ID from request path
 */
export function getCustomerIdFromPath(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const customerIdIndex = pathParts.indexOf('progress') + 1;
  
  if (customerIdIndex > 0 && customerIdIndex < pathParts.length) {
    return pathParts[customerIdIndex];
  }
  
  return null;
}

/**
 * Verify that the authenticated user can access the requested customer data
 */
export function verifyCustomerAccess(user: AuthUser, requestedCustomerId: string): boolean {
  // Admin can access any customer
  if (user.isAdmin) {
    return true;
  }
  
  // Regular users can only access their own data
  return user.customerId === requestedCustomerId;
}