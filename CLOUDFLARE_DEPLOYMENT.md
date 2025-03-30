
# Cloudflare Deployment Guide

This project is configured to deploy to Cloudflare Pages with multiple environments.

## Setup

1. Install Cloudflare Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
npm run cloudflare:login
```

3. Initialize the Cloudflare Pages project:
```bash
npm run cloudflare:init
```

## Deployments

### Staging Environment

To deploy to staging:
```bash
npm run deploy:staging
```

This will build the project with staging environment variables and deploy to Cloudflare Pages staging environment.

### Production Environment

To deploy to production:
```bash
npm run deploy:prod
```

This will build the project with production environment variables and deploy to Cloudflare Pages production environment.

## GitHub Actions

This project includes GitHub Actions workflows that automatically deploy:
- The `staging` branch to the staging environment
- The `main` branch to the production environment

To use GitHub Actions, set up the following secrets in your GitHub repository:
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Pages access
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## Environment Configurations

Each environment has its own configuration file:
- Development: `.env.development`
- Staging: `.env.staging`
- Production: `.env.production`

Update these files as needed for each environment.
