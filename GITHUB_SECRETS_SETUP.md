# GitHub Secrets Setup Guide

## 1. Store Secrets in Repository Settings

To add environment variables as GitHub secrets for use in GitHub Actions:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the following secrets:

| Secret Name | Value | Source |
|---|---|---|
| `FIREBASE_PROJECT_ID` | field-pilot-tech | From your Firebase console |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | (Full JSON as string) | From your firebase-adminsdk-*.json file |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your API Key | From Firebase console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | field-pilot-tech.firebaseapp.com | From Firebase console |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | field-pilot-tech.appspot.com | From Firebase console |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 100369775586937423506 | From Firebase console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your App ID | From Firebase console |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | (optional) measurement id | From Firebase console |

## 2. Format Service Account Key for GitHub

To add `FIREBASE_SERVICE_ACCOUNT_KEY`:
1. Open your `field-pilot-tech-firebase-adminsdk-fbsvc-9e266f65c1.json` file
2. Copy the **entire JSON content**
3. Paste it as the value for the secret (GitHub will safely encrypt it)

## 3. Using Secrets in GitHub Actions

In your `.github/workflows/*.yml` files, reference secrets like this:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Deploy
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
        run: |
          npm install
          npm run build
          # Deploy commands here
```

## 4. Local Development

For local development, continue using your `.env` file (which is now in `.gitignore`):

```
VITE_FIREBASE_API_KEY=your-value
VITE_FIREBASE_AUTH_DOMAIN=your-value
VITE_FIREBASE_PROJECT_ID=your-value
# ... etc
```

## 5. Important Security Notes

✅ **Do:**
- Keep `.env` in `.gitignore` (already configured)
- Store sensitive data in GitHub Secrets
- Rotate Firebase credentials if ever exposed
- Use different credentials for dev/staging/production

❌ **Don't:**
- Commit `.env` files to Git
- Hardcode secrets in code or workflow files
- Share credentials in commits/PRs
- Use the same credentials across environments

## 6. Verify Setup

After adding all secrets:
1. Go back to **Settings** → **Secrets and variables** → **Actions**
2. You should see all your secrets listed (values hidden)
3. Test by running a workflow or deploying

