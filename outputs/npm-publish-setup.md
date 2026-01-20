# NPM Publish Workflow Setup

## Workflow Overview

```
═══════════════════════════════════════════════════════════════════════════════════════
 publish.yml  ─  NPM PUBLISH (Triggers: push tag v*)
═══════════════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────┐
                              │   Push Tag v*    │
                              │  (e.g. v2.1.0)   │
                              └────────┬─────────┘
                                       │
                                       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                         test                                │
  │                                                             │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
  │  │  Typesense      │  │   Unit Tests    │  │ Integration │  │
  │  │  (docker svc)   │  │   npm test      │  │   Tests     │  │
  │  └─────────────────┘  └─────────────────┘  └─────────────┘  │
  └─────────────────────────────┬───────────────────────────────┘
                                │
                          (if tests pass)
                                │
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                       publish                               │
  │                                                             │
  │  ┌─────────────────┐                                        │
  │  │  npm ci         │                                        │
  │  │  npm run build  │                                        │
  │  └────────┬────────┘                                        │
  │           │                                                 │
  │           ▼                                                 │
  │  ┌─────────────────────────────────────┐                    │
  │  │  Verify version match               │                    │
  │  │  package.json == tag version        │                    │
  │  │  (2.1.0 == v2.1.0 ✓)               │                    │
  │  └────────┬────────────────────────────┘                    │
  │           │                                                 │
  │           ▼                                                 │
  │  ┌─────────────────────────────────────┐                    │
  │  │  npm publish --provenance           │◀── NPM_TOKEN       │
  │  │  --access public                    │    (secret)        │
  │  └────────┬────────────────────────────┘                    │
  │           │                                                 │
  │           ▼                                                 │
  │  ┌─────────────────────────────────────┐                    │
  │  │  Create GitHub Release              │                    │
  │  │  (auto-generated notes)             │                    │
  │  └─────────────────────────────────────┘                    │
  └─────────────────────────────────────────────────────────────┘
```

## Setup Required (One-Time)

A colleague with npm publish access needs to complete these steps:

### Step 1: Generate npm Access Token

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Click profile icon → **Access Tokens**
3. Click **Generate New Token** → **Granular Access Token**
4. Configure:
   - **Token name:** `github-actions-typesense-react`
   - **Expiration:** 1 year (or as appropriate)
   - **Packages and scopes:** Select `@jungle-commerce` scope
   - **Permissions:** `Read and write`
5. Click **Generate Token**
6. **Copy the token immediately** (it won't be shown again)

### Step 2: Add Secret to GitHub Repository

1. Go to: https://github.com/jungle-commerce/typesense-react
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Fill in:
   - **Name:** `NPM_TOKEN`
   - **Value:** Paste the npm token from Step 1
5. Click **Add secret**

## How to Release a New Version

### Step 1: Update Version

```bash
# Choose one based on the type of release:
npm version patch  # 2.0.3 → 2.0.4 (bug fixes)
npm version minor  # 2.0.3 → 2.1.0 (new features, backward compatible)
npm version major  # 2.0.3 → 3.0.0 (breaking changes)
```

### Step 2: Commit and Push

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

### Step 3: Create and Push Tag

```bash
# Create annotated tag (version must match package.json)
git tag -a v2.1.0 -m "Release v2.1.0"

# Push tag to trigger the publish workflow
git push origin v2.1.0
```

### Step 4: Monitor

1. Go to **Actions** tab in GitHub
2. Watch the "Publish to NPM" workflow
3. Once complete, verify at:
   - https://www.npmjs.com/package/@jungle-commerce/typesense-react
   - GitHub Releases page

## Troubleshooting

### Version Mismatch Error

```
ERROR: package.json version (2.0.3) does not match tag version (2.1.0)
```

**Fix:** Update `package.json` version to match the tag, commit, and re-tag.

### NPM Authentication Error

```
npm ERR! code ENEEDAUTH
npm ERR! need auth This command requires you to be logged in
```

**Fix:** Ensure `NPM_TOKEN` secret is configured in GitHub repository settings.

### Tests Failing

The publish job won't run if tests fail. Fix tests and create a new tag:

```bash
# Delete the failed tag
git tag -d v2.1.0
git push origin :refs/tags/v2.1.0

# Fix tests, commit, then re-tag
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
```

## Files Added

| File | Purpose |
|------|---------|
| `.github/workflows/publish.yml` | GitHub Actions workflow for npm publishing |
| `docs/RELEASE.md` | Detailed release documentation |
| `outputs/npm-publish-setup.md` | This setup guide |
