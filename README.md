# Password Manager

A secure, modern shared password management application built with React, TypeScript, Vite, and Supabase. This application enables teams to securely store, share, and manage service credentials with enterprise-grade encryption.

## Features

- **Secure Authentication**: Email/password authentication powered by Supabase
- **Client-Side Encryption**: All sensitive data encrypted using AES-GCM before storage
- **Role-Based Access Control**: Admin and user roles with granular permissions
- **Shared Password Management**: Store and share credentials across your team
- **Search & Filter**: Quickly find services with real-time search
- **Expiration Tracking**: Visual indicators for expired credentials
- **Two-Factor Authentication Support**: Track which services have 2FA enabled
- **Responsive Design**: Modern, clean UI that works on all devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Authentication & Database**: Supabase
- **Encryption**: Web Crypto API (AES-GCM)
- **Icons**: Lucide React
- **Deployment**: Docker, Kubernetes (Helm)

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Project Structure](#project-structure)
- [Security Features](#security-features)
- [Admin Setup](#admin-setup)

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account (free tier available)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd password-manager
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 5: Run Database Migrations

The migrations are located in `supabase/migrations/`. To apply them:

**Option 1: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

**Option 2: Manual SQL Execution**

1. Go to your Supabase Dashboard > SQL Editor
2. Copy and execute each migration file in order:
   - `20260201210015_create_password_manager_schema.sql`
   - `20260201210632_fix_shared_passwords_delete_policy.sql`
   - `20260201211100_simplify_delete_policy.sql`

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | Yes |

## Database Setup

### Schema Overview

The application uses two main tables:

**user_profiles**
- Stores user information and admin status
- Automatically created via trigger when users sign up
- Fields: id, email, is_admin, created_at, updated_at

**shared_passwords**
- Stores encrypted password entries
- Fields: id, service_name, service_url, username, password (encrypted), token (encrypted), description, expiration_date, two_factor_enabled, created_by, created_at, updated_at

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Allow authenticated users to read all shared passwords
- Allow users to create shared passwords
- Allow users to update/delete only their own passwords
- Allow admins to update/delete any password

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t password-manager:latest .
```

### Run Container Locally

```bash
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=your-supabase-url \
  -e VITE_SUPABASE_ANON_KEY=your-supabase-key \
  password-manager:latest
```

Access the application at `http://localhost:8080`

### Multi-Stage Build

The Dockerfile uses a multi-stage build:
1. **Builder stage**: Installs dependencies and builds the application
2. **Production stage**: Serves static files with nginx

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured
- Helm 3 installed

### Step 1: Create Kubernetes Secret

Create a secret for your Supabase credentials:

```bash
kubectl create secret generic password-manager-secrets \
  --from-literal=VITE_SUPABASE_URL=your-supabase-url \
  --from-literal=VITE_SUPABASE_ANON_KEY=your-supabase-key
```

### Step 2: Update Helm Values

Edit `helm/password-manager/values.yaml`:

```yaml
image:
  repository: your-registry/password-manager
  tag: "1.0.0"

ingress:
  hosts:
    - host: password-manager.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: password-manager-tls
      hosts:
        - password-manager.yourdomain.com

env:
  VITE_SUPABASE_URL: "your-supabase-url"
  VITE_SUPABASE_ANON_KEY: "your-supabase-key"

# OR use secrets (recommended)
envSecret:
  enabled: true
  secretName: password-manager-secrets
```

### Step 3: Install with Helm

```bash
# Install
helm install password-manager ./helm/password-manager

# Upgrade
helm upgrade password-manager ./helm/password-manager

# Uninstall
helm uninstall password-manager
```

### Step 4: Verify Deployment

```bash
# Check pods
kubectl get pods -l app.kubernetes.io/name=password-manager

# Check service
kubectl get svc -l app.kubernetes.io/name=password-manager

# Check ingress
kubectl get ingress
```

### Helm Chart Features

- **High Availability**: 2 replicas by default
- **Auto-scaling**: HPA based on CPU/Memory
- **Health Checks**: Liveness and readiness probes
- **Security**: Pod security contexts, read-only root filesystem
- **Ingress**: NGINX ingress with TLS support
- **Resource Limits**: CPU and memory limits configured

## Project Structure

```
password-manager/
├── src/
│   ├── components/          # React components
│   │   ├── AdminPanel.tsx   # User management interface
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── LoginForm.tsx    # Authentication UI
│   │   ├── PasswordForm.tsx # Password creation form
│   │   └── PasswordList.tsx # Password listing and details
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── lib/
│   │   ├── encryption.ts    # Client-side encryption utilities
│   │   └── supabase.ts      # Supabase client configuration
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── supabase/
│   └── migrations/          # Database migration files
├── helm/
│   └── password-manager/    # Helm chart
├── Dockerfile               # Container build configuration
├── nginx.conf              # Nginx configuration
└── package.json            # Project dependencies
```

## Security Features

### Client-Side Encryption

- **Algorithm**: AES-GCM (256-bit)
- **Key Storage**: LocalStorage (per-browser, per-user)
- **Encrypted Fields**: Passwords and tokens
- **Automatic**: Encryption happens before data leaves the client

### Row Level Security

- Enforced at database level via Supabase RLS
- Users can only access data they're authorized to see
- Admins have elevated permissions

### Security Headers

Nginx configuration includes:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

### Best Practices

- No secrets in client code
- HTTPS required in production (configured in ingress)
- Secure session management via Supabase Auth
- Input validation and sanitization

## Admin Setup

The first user who signs up needs to be promoted to admin manually:

### Method 1: SQL Editor (Supabase Dashboard)

```sql
UPDATE user_profiles
SET is_admin = true
WHERE email = 'your-email@example.com';
```

### Method 2: Supabase CLI

```bash
supabase db execute "UPDATE user_profiles SET is_admin = true WHERE email = 'your-email@example.com';"
```

After updating, the user needs to sign out and sign back in for the admin status to take effect.

## Common Tasks

### Adding a New User

Users can self-register through the application. New users have standard (non-admin) privileges by default.

### Making a User Admin

Only existing admins can promote users through the Admin Panel, or you can use SQL as shown above.

### Resetting a Password

Users can reset their passwords through Supabase's built-in password recovery flow (requires email configuration in Supabase).

### Backing Up Data

Use Supabase's built-in backup features or export data via SQL:

```sql
-- Export passwords (encrypted)
SELECT * FROM shared_passwords;

-- Export users
SELECT * FROM user_profiles;
```

## Troubleshooting

### Build Fails

- Ensure Node.js version is 18 or higher
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run typecheck`

### Authentication Issues

- Verify Supabase URL and anon key are correct
- Check Supabase project status
- Ensure email confirmation is disabled in Supabase Auth settings

### Database Errors

- Verify all migrations have been applied
- Check RLS policies are enabled
- Ensure user profile was created (trigger should auto-create)

### Encryption Issues

- Encryption keys are stored per-browser
- Clearing browser data will lose encryption keys
- Passwords encrypted in one browser cannot be decrypted in another

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review Supabase documentation for database-related questions
