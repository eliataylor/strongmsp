#!/bin/bash

# Create organization subdomain deployment script
# Usage: ./create-org-subdomain.sh <organization_slug> [env_file] [private_env_file]
# Example: ./create-org-subdomain.sh lakeshow .env .env.private

# Required environment variables for this script
REQUIRED_VARS=("GCP_PROJECT_ID" "GCP_DNS_ZONE_NAME" "GCP_BUCKET_APP_NAME" "DOMAIN_NAME")

SCRIPT_DIR=$(dirname "$0")
source "${SCRIPT_DIR}/common.sh"

# Check for required argument
if [ -z "$1" ]; then
  echo "Usage: $0 <organization_slug> [env_file] [private_env_file]"
  echo "Example: $0 lakeshow .env .env.private"
  exit 1
fi

# Organization slug argument
ORG_SLUG="$1"

# Optional .env files
ENV_FILE="${2:-.env}"
PRIVATE_ENV_FILE="$3"

# Parse and export variables from the .env files
parse_and_export_env "$ENV_FILE"
if [ -n "$PRIVATE_ENV_FILE" ]; then
  parse_and_export_env "$PRIVATE_ENV_FILE"
fi

# Sanitize bucket name
SANITIZED_GCP_BUCKET_APP_NAME=$(sanitize_bucket_name "$GCP_BUCKET_APP_NAME")

# Construct the subdomain
SUBDOMAIN="${ORG_SLUG}.${DOMAIN_NAME}"

show_section_header "CREATE ORGANIZATION SUBDOMAIN: $SUBDOMAIN"

login_service_account "$GCP_SA_KEY_PATH" "$GCP_PROJECT_ID"

# Verify the organization slug is valid (alphanumeric and hyphens only)
if ! [[ "$ORG_SLUG" =~ ^[a-zA-Z0-9-]+$ ]]; then
  print_error "Organization slug validation" "Invalid slug format. Use only alphanumeric characters and hyphens."
  exit 1
fi

# Get the existing webapp static IP
show_loading "Fetching existing webapp static IP..."
WEBAPP_IP=$(gcloud compute addresses describe "${SANITIZED_GCP_BUCKET_APP_NAME}-ip" --global --format="value(address)" 2>/dev/null)
if [ -z "$WEBAPP_IP" ]; then
  print_error "Webapp static IP" "Could not find existing webapp static IP. Run create-bucket-lb-webapp.sh first."
  exit 1
fi
print_success "Webapp static IP" "Found: $WEBAPP_IP"

# Create DNS A record for the subdomain
show_loading "Creating DNS A record for $SUBDOMAIN..."
if ! gcloud dns record-sets describe "$SUBDOMAIN." --type=A --zone="$GCP_DNS_ZONE_NAME" > /dev/null 2>&1; then
  gcloud dns record-sets create "$SUBDOMAIN." \
    --zone="$GCP_DNS_ZONE_NAME" \
    --type="A" \
    --ttl="300" \
    --rrdatas="$WEBAPP_IP"
  if [ $? -ne 0 ]; then
    print_error "$SUBDOMAIN DNS record creation" "Failed"
    exit 1
  else
    print_success "$SUBDOMAIN DNS record" "Created"
  fi
else
  print_warning "$SUBDOMAIN DNS record already exists" "Skipped"
fi

# Create individual SSL certificate for this subdomain
show_loading "Creating SSL certificate for $SUBDOMAIN..."
SSL_CERT_NAME="${SANITIZED_GCP_BUCKET_APP_NAME}-${ORG_SLUG}-ssl"

if ! gcloud compute ssl-certificates describe "$SSL_CERT_NAME" --global > /dev/null 2>&1; then
  gcloud compute ssl-certificates create "$SSL_CERT_NAME" \
    --description="SSL Certificate for $SUBDOMAIN" \
    --domains="$SUBDOMAIN" \
    --global
  
  if [ $? -ne 0 ]; then
    print_error "$SUBDOMAIN SSL certificate creation" "Failed"
    exit 1
  else
    print_success "$SUBDOMAIN SSL certificate" "Created"
  fi
else
  print_warning "$SUBDOMAIN SSL certificate already exists" "Skipped"
fi

# Update HTTPS proxy to include the new SSL certificate
show_loading "Updating HTTPS proxy with new SSL certificate..."
HTTPS_PROXY_NAME="${SANITIZED_GCP_BUCKET_APP_NAME}-https-proxy"

# Get current SSL certificates
CURRENT_CERTS=$(gcloud compute target-https-proxies describe "$HTTPS_PROXY_NAME" --global --format="value(sslCertificates[])" 2>/dev/null)

# Add the new certificate to the list
if echo "$CURRENT_CERTS" | grep -q "$SSL_CERT_NAME"; then
  print_warning "HTTPS proxy" "Already includes $SSL_CERT_NAME"
else
  # Convert the current certificates to a comma-separated list of certificate names
  CERT_NAMES=$(echo "$CURRENT_CERTS" | sed 's|https://www.googleapis.com/compute/v1/projects/[^/]*/global/sslCertificates/||g' | tr ';' ',' | sed 's/,$//')
  
  # Add the new certificate name
  if [ -n "$CERT_NAMES" ]; then
    ALL_CERT_NAMES="$CERT_NAMES,$SSL_CERT_NAME"
  else
    ALL_CERT_NAMES="$SSL_CERT_NAME"
  fi
  
  gcloud compute target-https-proxies update "$HTTPS_PROXY_NAME" \
    --ssl-certificates="$ALL_CERT_NAMES" \
    --global
  
  if [ $? -ne 0 ]; then
    print_error "HTTPS proxy update" "Failed to add $SSL_CERT_NAME"
    exit 1
  else
    print_success "HTTPS proxy update" "Added $SSL_CERT_NAME"
  fi
fi

# Update URL map to include the new subdomain (if needed)
show_loading "Verifying URL map configuration..."
URL_MAP_NAME="${SANITIZED_GCP_BUCKET_APP_NAME}-url-map"
if gcloud compute url-maps describe "$URL_MAP_NAME" > /dev/null 2>&1; then
  print_success "URL map" "Already configured to route all subdomains to the same backend"
else
  print_error "URL map" "URL map $URL_MAP_NAME not found. Run create-bucket-lb-webapp.sh first."
  exit 1
fi

# Wait for DNS propagation
show_loading "Waiting for DNS propagation..."
sleep 30

# Verify the subdomain is accessible
show_loading "Verifying subdomain accessibility..."
if curl -s -I "http://$SUBDOMAIN" | grep -q "200\|301\|302"; then
  print_success "$SUBDOMAIN accessibility" "Subdomain is accessible"
else
  print_warning "$SUBDOMAIN accessibility" "Subdomain may not be accessible yet. DNS propagation can take up to 24 hours."
  printf "\e[33mCurrent DNS points to: $(nslookup $SUBDOMAIN | grep 'Address:' | tail -1 | awk '{print $2}')\e[0m\n"
  printf "\e[33mExpected IP: $WEBAPP_IP\e[0m\n"
fi

# Final verification
printf "\n\e[32m=== Organization Subdomain Setup Complete ===\e[0m\n"
printf "\e[32mOrganization Slug: $ORG_SLUG\e[0m\n"
printf "\e[32mSubdomain: $SUBDOMAIN\e[0m\n"
printf "\e[32mStatic IP: $WEBAPP_IP\e[0m\n"
printf "\e[32mSSL Certificate: $SSL_CERT_NAME\e[0m\n"
printf "\e[32mBackend Bucket: gs://$SANITIZED_GCP_BUCKET_APP_NAME\e[0m\n"

# Check SSL certificate status
show_loading "Checking SSL certificate status..."
CERT_STATUS=$(gcloud compute ssl-certificates describe "$SSL_CERT_NAME" --global --format="value(managed.status)" 2>/dev/null || echo "UNKNOWN")
if [ "$CERT_STATUS" = "ACTIVE" ]; then
  printf "\e[32mSSL certificate is ACTIVE - Subdomain should be accessible at https://$SUBDOMAIN\e[0m\n"
elif [ "$CERT_STATUS" = "PROVISIONING" ]; then
  printf "\e[33mSSL certificate is PROVISIONING - This may take 5-30 minutes\e[0m\n"
  printf "\e[33mCheck status with: gcloud compute ssl-certificates describe $SSL_CERT_NAME --global\e[0m\n"
else
  printf "\e[31mSSL certificate status: $CERT_STATUS\e[0m\n"
fi

printf "\n\e[32mNext steps:\e[0m\n"
printf "\e[32m1. Verify the subdomain resolves: nslookup $SUBDOMAIN\e[0m\n"
printf "\e[32m2. Test HTTPS access: curl -I https://$SUBDOMAIN\e[0m\n"
printf "\e[32m3. Update your React app to handle organization branding based on subdomain\e[0m\n"

printf "\nOrganization subdomain setup completed.\n"
