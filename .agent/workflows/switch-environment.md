---
description: Switch between development and production environments using Git branches
---

# Branch-Based Environment Workflow

This project uses a branching strategy where:
- `main` branch → Production Supabase (clmsoetktmvhazctlans)
- `development` branch → Development Supabase (azrpkoqjwcizqcqbzfpk)

## Setup (One-time)

// turbo
1. Copy the appropriate .env.example file to .env:
   - On `development` branch: `cp .env.example.development .env`
   - On `main` branch: `cp .env.example.production .env`

## Switching Environments

### Switch to Development
```bash
git checkout development
# Update .env if needed (should already be set for dev)
npm run dev
```

### Switch to Production
```bash
git checkout main
# Update .env if needed (should already be set for prod)
npm run dev
```

## Development Workflow

// turbo-all
1. Start on `development` branch for new features
2. Make changes and test against dev Supabase
3. Commit and push to `development`
4. When ready for production:
   ```bash
   git checkout main
   git merge development
   git push origin main
   ```

## Environment Files

| File | Purpose | Git Tracked |
|------|---------|-------------|
| `.env` | Active environment config | ❌ No |
| `.env.example.development` | Dev template | ✅ Yes |
| `.env.example.production` | Prod template | ✅ Yes |

## Supabase Projects

| Environment | Project ID | URL |
|-------------|-----------|-----|
| Production | `clmsoetktmvhazctlans` | https://supabase.com/dashboard/project/clmsoetktmvhazctlans |
| Development | `azrpkoqjwcizqcqbzfpk` | https://supabase.com/dashboard/project/azrpkoqjwcizqcqbzfpk |
