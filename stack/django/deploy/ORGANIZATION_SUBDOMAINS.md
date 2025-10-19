# Organization Subdomain Support

This document describes how to set up and manage organization-specific subdomains for the white-labeled application.

## Overview

The system supports organization subdomains in the format: `{organization_slug}.strongmindstrongperformance.com`

Examples:
- `lakeshow.strongmindstrongperformance.com`
- `wcc.strongmindstrongperformance.com`

All subdomains serve the same React application from a single GCS bucket, but the app can determine organization-specific branding based on the subdomain.

## Prerequisites

1. **Main webapp deployed**: Run `create-bucket-lb-webapp.sh` first to set up the main webapp infrastructure
2. **Wildcard SSL certificate**: The webapp deployment script now creates a wildcard SSL certificate covering `*.strongmindstrongperformance.com`
3. **Django CORS configured**: The Django security settings support wildcard subdomains via regex patterns

## Adding a New Organization Subdomain

### Step 1: Create the Organization in Django Admin

1. Log into Django admin
2. Navigate to Organizations
3. Create a new organization with:
   - **Name**: Organization display name
   - **Slug**: Subdomain identifier (e.g., "lakeshow", "wcc")
   - **Is Active**: True
   - **Branding Settings**: Configure colors, typography, logo as needed

### Step 2: Deploy the Subdomain

Run the subdomain deployment script:

```bash
cd stack/django/deploy
./create-org-subdomain.sh <organization_slug> [env_file] [private_env_file]
```

Example:
```bash
./create-org-subdomain.sh lakeshow .env .env.private
./create-org-subdomain.sh wcc .env .env.private
```

This script will:
- Validate the organization slug format
- Create a DNS A record pointing to the existing webapp IP
- Verify the wildcard SSL certificate covers the subdomain
- Test subdomain accessibility

### Step 3: Test the Subdomain

Run the test script to verify everything works:

```bash
./test-subdomains.sh lakeshow wcc
```

Or test individual subdomains:
```bash
./test-subdomains.sh lakeshow
```

## Technical Details

### DNS Configuration

- Each organization subdomain gets an A record pointing to the same static IP as the main webapp
- DNS TTL is set to 300 seconds for faster propagation

### SSL Certificate

- Creates individual managed SSL certificates for each organization subdomain
- Each subdomain gets its own certificate (e.g., `strongmsp-app-lakeshow-ssl`)
- Certificates are automatically managed and renewed by Google Cloud
- HTTPS proxy is updated to include all subdomain certificates

### Load Balancer Configuration

- Single backend bucket serves all subdomains
- URL map routes all subdomain traffic to the same React application
- No additional load balancer resources needed per organization

### Django Security Settings

- `ALLOWED_HOSTS` includes wildcard domain support via `*.strongmindstrongperformance.com`
- `CORS_ALLOWED_ORIGIN_REGEXES` allows any subdomain matching the pattern
- `CSRF_TRUSTED_ORIGIN_REGEXES` supports subdomain CSRF validation
- Cookie domains set to `.strongmindstrongperformance.com` for subdomain sharing

### React Application

The React app can determine the organization context by:

1. **Reading the subdomain** from `window.location.hostname`
2. **Extracting the organization slug** from the subdomain
3. **Fetching organization data** from the API using the slug
4. **Applying organization-specific branding** (colors, logo, typography)

Example implementation:
```javascript
// Extract organization slug from subdomain
const getOrganizationSlug = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  return parts[0]; // e.g., "lakeshow" from "lakeshow.strongmindstrongperformance.com"
};

// Fetch organization data
const fetchOrganizationData = async (slug) => {
  const response = await fetch(`/api/organizations/${slug}/`);
  return response.json();
};
```

## Troubleshooting

### DNS Issues

- **Subdomain not resolving**: Check DNS propagation with `nslookup subdomain.strongmindstrongperformance.com`
- **Wrong IP address**: Verify the A record points to the correct webapp static IP

### SSL Issues

- **Certificate not valid**: Ensure the wildcard SSL certificate includes `*.strongmindstrongperformance.com`
- **Certificate provisioning**: SSL certificates can take 5-30 minutes to provision

### CORS Issues

- **API requests blocked**: Verify Django CORS settings include the subdomain regex pattern
- **CSRF token issues**: Check that `CSRF_TRUSTED_ORIGIN_REGEXES` includes the subdomain pattern

### Load Balancer Issues

- **Subdomain not accessible**: Verify the URL map routes subdomain traffic correctly
- **Backend bucket issues**: Check that the backend bucket is properly configured

## Scripts Reference

### `create-org-subdomain.sh`

Creates a new organization subdomain.

**Usage:**
```bash
./create-org-subdomain.sh <organization_slug> [env_file] [private_env_file]
```

**Parameters:**
- `organization_slug`: The organization slug (e.g., "lakeshow")
- `env_file`: Environment file (default: .env)
- `private_env_file`: Private environment file (optional)

### `test-subdomains.sh`

Tests subdomain functionality.

**Usage:**
```bash
./test-subdomains.sh [subdomain1] [subdomain2] ...
```

**Examples:**
```bash
./test-subdomains.sh                    # Test default subdomains (lakeshow, wcc)
./test-subdomains.sh lakeshow           # Test only lakeshow subdomain
./test-subdomains.sh lakeshow wcc       # Test specific subdomains
```

## Security Considerations

1. **Organization slug validation**: Only alphanumeric characters and hyphens allowed
2. **DNS security**: A records point to the same IP as the main webapp
3. **SSL security**: Wildcard certificate covers all subdomains
4. **CORS security**: Regex patterns ensure only valid subdomains are allowed
5. **CSRF security**: Subdomain-aware CSRF token validation

## Cost Optimization

- **Single GCS bucket**: All subdomains share the same storage
- **Single load balancer**: No additional load balancer resources per organization
- **Single SSL certificate**: Wildcard certificate covers all subdomains
- **Minimal DNS records**: Only A records needed per organization

This approach minimizes infrastructure costs while providing full subdomain support for white-labeled organizations.
