# WhispShare - Ephemeral File Sharing Platform

A secure, location-based file sharing platform built with Next.js and Supabase.

## Features

- 🔒 End-to-end encryption
- 📍 Location-based sharing (100km radius)
- ⏰ Ephemeral files (auto-delete after 24 hours)
- 🤖 AI-powered features with ML/NLP
- 🔐 Secure authentication with Supabase
- 📱 Responsive design

## Quick Setup

### 1. Environment Variables

The `.env.local` file is already configured with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fcnehpaubkdlepqcbdct.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyCb2ZXTZ5dHUMXNRqpVoI4xtLDZjF4Kdbc
```

### 2. Database Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/20250110000001_initial_setup.sql`
   - `supabase/migrations/20250110000002_storage_setup.sql`

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Check Database Status

Visit `/database-status` to verify your database setup is complete.

## Database Schema

The application uses the following main tables:

- **profiles** - User profile information
- **files** - File metadata and location data
- **downloads** - Download tracking
- **user_activity_logs** - User activity for ML analysis
- **ml_insights** - AI-generated insights
- **anomalies** - Security anomaly detection
- **search_queries** - NLP search query analysis

## Authentication

- Email/password authentication
- Google OAuth (requires additional setup)
- Guest mode for anonymous file sharing

## File Storage

Files are stored in Supabase Storage with:
- 50MB file size limit
- Automatic expiration after 24 hours
- Location-based access control (100km radius)

## AI Features

- Natural language search
- Content classification and tagging
- Sentiment analysis
- Anomaly detection
- Smart file recommendations

## Security

- Row Level Security (RLS) enabled
- End-to-end encryption
- Location-based access control
- Automatic file expiration
- Activity logging and monitoring

## Deployment

The application is configured for deployment on Vercel with Supabase as the backend.

## Support

If you encounter issues:

1. Check the database status at `/database-status`
2. Verify your environment variables
3. Ensure migration scripts have been run
4. Check Supabase dashboard for any configuration issues

## License

MIT License - see LICENSE file for details.