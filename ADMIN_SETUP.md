# Admin OAuth Setup

This admin panel uses Supabase Auth for authentication with both email/password and Google OAuth.

## Setup Instructions

### 1. Configure Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Enable **Email** provider (enabled by default)
4. Enable **Google** provider

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: Car Part Database Admin
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/admin/auth/callback`
     - `https://yourdomain.com/admin/auth/callback`
6. Copy the **Client ID** and **Client Secret**

### 3. Configure Google OAuth in Supabase

1. In Supabase dashboard, go to **Authentication** > **Providers** > **Google**
2. Enable the provider
3. Paste your Google **Client ID** and **Client Secret**
4. Save the configuration

### 4. Configure Email Auth Settings (Optional)

1. In Supabase dashboard, go to **Authentication** > **URL Configuration**
2. Set **Site URL** to your domain (e.g., `http://localhost:3000` for dev)
3. Save

### 5. Access the Admin Panel

- Development: `http://localhost:3000/admin`
- Production: `https://yourdomain.com/admin`

## Files Created

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx                    # Protected admin dashboard
│   │   ├── login/
│   │   │   └── page.tsx                # Login page with email & Google
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts            # OAuth callback handler
│   │   └── components/
│   │       └── SignOutButton.tsx       # Sign out component
├── lib/
│   └── supabase/
│       ├── client.ts                   # Existing client-side client
│       └── server.ts                   # NEW: Server-side client
└── middleware.ts                       # NEW: Auth middleware
```

## Usage

### Sign In with Email
1. Navigate to `/admin/login`
2. Enter email and password
3. Click "Sign in"

### Sign Up with Email
1. Navigate to `/admin/login`
2. Click "Don't have an account? Sign up"
3. Enter email and password
4. Click "Sign up"
5. Check email for confirmation link

### Sign In with Google
1. Navigate to `/admin/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow

### Sign Out
Click "Sign Out" button in the admin header

## Environment Variables

The following are already in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://cuzgppxyjoseuvujlixv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Route Protection

- All routes under `/admin/*` are protected
- Unauthenticated users are redirected to `/admin/login`
- Logged-in users accessing `/admin/login` are redirected to `/admin`

## Customization

### Modify Dashboard
Edit `src/app/admin/page.tsx` to customize the admin dashboard.

### Modify Login Page
Edit `src/app/admin/login/page.tsx` to customize the login UI.

### Change Auth Behavior
Edit `src/middleware.ts` to modify route protection logic.

## Troubleshooting

### Google OAuth Not Working
- Verify Google Client ID and Secret are correct in Supabase
- Check redirect URIs match exactly (including protocol and port)
- Ensure Google OAuth provider is enabled in Supabase

### Email Auth Not Working
- Check email provider is enabled in Supabase
- Verify email settings if using custom SMTP
- Check spam folder for confirmation emails

### Session Issues
- Clear browser cookies
- Check middleware is properly configured
- Verify environment variables are set correctly
