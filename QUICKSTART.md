# Quick Start Guide

Get the Password Manager running in 5 minutes!

## Local Development (Fastest)

```bash
# 1. Clone and install
git clone <repo-url>
cd password-manager
npm install

# 2. Set up Supabase
# - Create account at https://supabase.com
# - Create new project
# - Get URL and anon key from Settings > API

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Run migrations
# Go to Supabase Dashboard > SQL Editor
# Run each file in supabase/migrations/ folder

# 5. Start development server
npm run dev

# 6. Make first user admin
# In Supabase SQL Editor:
# UPDATE user_profiles SET is_admin = true WHERE email = 'your-email@example.com';
```

Access at: http://localhost:5173

## Docker (Production-like)

```bash
# 1. Build image
docker build -t password-manager .

# 2. Run container
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=your-url \
  -e VITE_SUPABASE_ANON_KEY=your-key \
  password-manager
```

Access at: http://localhost:8080

## Kubernetes (Production)

```bash
# 1. Create secrets
kubectl create secret generic password-manager-secrets \
  --from-literal=VITE_SUPABASE_URL=your-url \
  --from-literal=VITE_SUPABASE_ANON_KEY=your-key

# 2. Update Helm values
# Edit helm/password-manager/values.yaml with your domain

# 3. Install
helm install password-manager ./helm/password-manager

# 4. Access
kubectl get ingress
```

## First Steps After Installation

1. **Sign up** - Create your account
2. **Make yourself admin** - Run SQL to promote your account
3. **Sign out and back in** - To activate admin status
4. **Add passwords** - Click "Add Password" button
5. **Invite team** - Share signup link with team members

## Common Issues

**Q: Can't sign in?**
- Check Supabase URL and key in .env
- Verify email confirmation is disabled in Supabase

**Q: Migrations not applied?**
- Use Supabase SQL Editor to run migration files manually
- Or use Supabase CLI: `supabase db push`

**Q: Not an admin?**
- Run SQL to update user_profiles
- Sign out and back in after update

**Q: Can't decrypt passwords?**
- Encryption keys are per-browser
- Different browser = different keys
- Clearing data = lost keys

## Next Steps

- Read full [README.md](README.md)
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for production
- Configure backup strategy
- Set up monitoring

## Support

- Create issue in repository
- Check existing documentation
- Review Supabase docs
