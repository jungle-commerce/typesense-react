# Release Process

This document describes how to publish new versions of `@jungle-commerce/typesense-react` to npm.

## Overview

Releases are automated via GitHub Actions. When you push a version tag (e.g., `v2.1.0`), the CI pipeline will:

1. Run all tests (unit + integration)
2. Build the package
3. Verify the version in `package.json` matches the tag
4. Publish to npm with provenance
5. Create a GitHub Release with auto-generated notes

## Prerequisites

### NPM_TOKEN Secret (One-time Setup)

A colleague with npm publish access needs to configure the `NPM_TOKEN` secret in GitHub:

1. **Generate an npm Access Token:**
   - Log in to [npmjs.com](https://www.npmjs.com)
   - Go to **Access Tokens** (click profile icon → Access Tokens)
   - Click **Generate New Token** → **Granular Access Token**
   - Configure:
     - **Token name:** `github-actions-typesense-react`
     - **Expiration:** Choose appropriate (e.g., 1 year)
     - **Packages and scopes:** Select `@jungle-commerce` scope
     - **Permissions:** `Read and write`
   - Click **Generate Token** and copy it immediately

2. **Add Secret to GitHub Repository:**
   - Go to the repo on GitHub: `github.com/jungle-commerce/typesense-react`
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: Paste the npm token from step 1
   - Click **Add secret**

## Creating a Release

### Step 1: Update Version in package.json

```bash
# Update version (choose one)
npm version patch  # 2.0.3 → 2.0.4 (bug fixes)
npm version minor  # 2.0.3 → 2.1.0 (new features, backward compatible)
npm version major  # 2.0.3 → 3.0.0 (breaking changes)
```

Or manually edit `package.json`:
```json
{
  "version": "2.1.0"
}
```

### Step 2: Commit the Version Bump

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 2.1.0"
git push origin main
```

### Step 3: Create and Push the Tag

```bash
# Create annotated tag
git tag -a v2.1.0 -m "Release v2.1.0"

# Push the tag to trigger the publish workflow
git push origin v2.1.0
```

### Step 4: Monitor the Workflow

1. Go to **Actions** tab in GitHub
2. Watch the "Publish to NPM" workflow
3. Once complete, verify:
   - [npm package page](https://www.npmjs.com/package/@jungle-commerce/typesense-react)
   - GitHub Releases page

## Workflow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Push tag v*    │────▶│   Run Tests     │────▶│  Build Package  │
│  (e.g. v2.1.0)  │     │  (unit + integ) │     │  (vite + tsc)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │ GitHub Release  │◀─────────────┤
                        │ (auto-notes)    │              │
                        └─────────────────┘              │
                                                         ▼
                                               ┌─────────────────┐
                                               │  Publish npm    │
                                               │  (w/ provenance)│
                                               └─────────────────┘
```

## Troubleshooting

### Version Mismatch Error

```
ERROR: package.json version (2.0.3) does not match tag version (2.1.0)
```

**Solution:** Update `package.json` version to match the tag before pushing.

### NPM_TOKEN Not Set

```
npm ERR! code ENEEDAUTH
npm ERR! need auth This command requires you to be logged in
```

**Solution:** Ensure `NPM_TOKEN` secret is configured in GitHub repository settings.

### Tests Failing

The publish job won't run if tests fail. Fix the failing tests and create a new tag:

```bash
# Delete the failed tag locally and remotely
git tag -d v2.1.0
git push origin :refs/tags/v2.1.0

# Fix tests, then re-tag
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
```

## npm Provenance

The workflow publishes with `--provenance` flag, which:
- Links the published package to this GitHub repo
- Provides cryptographic proof of build origin
- Shows a "Provenance" badge on npmjs.com

This requires the `id-token: write` permission in the workflow.

## Security Notes

- The `NPM_TOKEN` is stored as an encrypted secret in GitHub
- It's only accessible to GitHub Actions workflows
- Never commit tokens to the repository
- Rotate the token periodically (recommended: annually)
- Use granular access tokens scoped to `@jungle-commerce` only
