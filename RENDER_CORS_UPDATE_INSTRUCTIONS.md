# Render.com CORS Configuration Update

## Issue
The production backend at `https://hs-andru-test.onrender.com` is blocking requests from `localhost:3000` due to CORS policy.

## Solution
Update the `CORS_ORIGIN` environment variable on Render.com to include both localhost (for development) and production frontend URL.

## Steps to Update CORS_ORIGIN on Render.com

### 1. Log in to Render.com Dashboard
Navigate to: https://dashboard.render.com/

### 2. Select Your Backend Service
Find and click on the `hs-andru-test` backend service (or your backend service name)

### 3. Navigate to Environment Variables
- Click on "Environment" in the left sidebar
- Find the `CORS_ORIGIN` environment variable

### 4. Update CORS_ORIGIN Value
Replace the current value with a comma-separated list of allowed origins:

```
http://localhost:3000,https://hs-andru-test.onrender.com,https://your-production-frontend.netlify.app
```

**Important Origins to Include:**
- `http://localhost:3000` - For local frontend development
- `https://hs-andru-test.onrender.com` - For production backend (if frontend calls itself)
- `https://your-production-frontend.netlify.app` - Your actual production frontend URL

### 5. Save and Deploy
- Click "Save Changes"
- Render.com will automatically redeploy your backend service with the new CORS configuration
- Wait for deployment to complete (usually 1-2 minutes)

### 6. Verify CORS Configuration
After deployment, test that CORS is working:

```bash
# Test from command line
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type, Authorization" \
     -X OPTIONS \
     --verbose \
     https://hs-andru-test.onrender.com/api/health
```

Expected headers in response:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

### 7. Test Dashboard v2
After CORS is updated:
1. Open browser to http://localhost:3000/dashboard/v2
2. Check browser console - CORS errors should be gone
3. Dashboard should load data from production backend

## Troubleshooting

### CORS Errors Still Occurring
- Verify environment variable was saved correctly on Render.com
- Check that deployment completed successfully
- Clear browser cache and hard reload (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check Render.com logs for CORS-related warnings

### Backend Returns 500 Errors
- Check Render.com logs for specific error messages
- Verify Supabase credentials are set correctly
- Verify all required environment variables are configured

## Backend Code Changes Made

The following files were updated to support comma-separated CORS origins:

1. **backend/src/config/index.js** (line 51-54)
   - Changed from single string to array parsing
   - Splits `CORS_ORIGIN` by comma and trims whitespace

2. **backend/src/middleware/security.js** (line 42-62)
   - Already supported array of origins
   - No changes needed - works with new config format

## Security Notes

- Only add trusted domains to CORS_ORIGIN
- Keep `credentials: true` to allow cookie-based authentication
- Monitor backend logs for unauthorized CORS requests
- Remove `localhost:3000` from production CORS_ORIGIN if you don't need local development access

## Questions?

If you encounter issues:
1. Check Render.com logs for error messages
2. Verify environment variable format is correct (comma-separated, no spaces unless in URL)
3. Ensure all required origins are included
4. Test with curl command to verify CORS headers
