# Pikado App - Development Guidelines

## Git Workflow - CRITICAL RULE

**staging and main MUST ALWAYS BE 1:1 IN SYNC**

Never allow staging to be X commits behind main. This prevents production outages and deployment confusion.

### Branch Strategy

```
main          ← PRODUCTION (always working, always deployable)
  ↑
  └─ staging ← DEVELOPMENT (QA/testing, must mirror main)
       ↑
       └─ feature/* ← FEATURE BRANCHES (work here)
```

### Step-by-Step Workflow

#### 1. Start a Feature

```bash
# Update staging from remote
git checkout staging
git pull origin staging

# Create feature branch FROM staging
git checkout -b feature/your-feature-name
```

**Rule**: Always branch from `staging`, never from `main`.

#### 2. Work on Feature

```bash
# Commit as usual
git add .
git commit -m "feat: description of change"
git push origin feature/your-feature-name
```

#### 3. When Feature is Ready

- Create **Pull Request**: `staging ← feature/your-feature-name`
- User reviews and approves
- Merge to staging with `--no-ff` flag:
  ```bash
  git checkout staging
  git pull origin staging
  git merge --no-ff feature/your-feature-name
  git push origin staging
  ```
- Delete feature branch

#### 4. When Staging is Tested & Ready for Production

```bash
# Update main from remote
git checkout main
git pull origin main

# Merge staging into main
git merge --no-ff staging
git push origin main
```

**This keeps main and staging in sync.**

#### 5. Verify Sync After Each Merge

```bash
# Should output nothing if branches are in sync
git log main..staging --oneline
git log staging..main --oneline
```

### DO's ✅

- ✅ Create feature branches from `staging`
- ✅ Work on feature branches only
- ✅ Merge to staging first, test, then merge to main
- ✅ Keep staging and main synchronized (1:1)
- ✅ Use `--no-ff` flag when merging to preserve history
- ✅ Push staging to main when it's tested and working

### DON'Ts ❌

- ❌ Commit directly to `main` or `staging`
- ❌ Create feature branches from `main`
- ❌ Let `staging` fall behind `main` (causes confusion and outages)
- ❌ Push broken code to `staging`
- ❌ Force push to `main` (only staging can be force pushed if needed)

## Deployment

- **staging branch** → deploys to staging environment (Vercel, Railway)
- **main branch** → deploys to production (Vercel, Railway)

Both should deploy automatically on push via webhooks.

## Emergency Procedure

If staging accidentally gets out of sync with main:

```bash
git checkout staging
git reset --hard main
git push origin staging --force
```

Then verify they're in sync:
```bash
git log main..staging --oneline  # Should be empty
```

## Architecture

### Frontend
- **Framework**: Next.js 14
- **Location**: `frontend/`
- **Deployment**: Vercel (auto-deploy on git push)

### Backend
- **Framework**: NestJS
- **Location**: `backend/`
- **Database**: PostgreSQL (on Railway or external)
- **Deployment**: Railway (auto-deploy on git push)

### Key Endpoints
- API: `https://pikado-app-production.up.railway.app`
- Frontend: `https://pikado-app-ia3c.vercel.app`

## Important Notes

- **CORS Configuration**: Backend at `backend/src/main.ts` - keep production URL synced with actual Vercel frontend URL
- **Environment Variables**: Check Railway and Vercel dashboards for prod secrets
- **Database**: PostgreSQL migrations run automatically on deploy
