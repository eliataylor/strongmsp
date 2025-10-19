#!/bin/bash

# Test script for organization subdomains
# Usage: ./test-subdomains.sh [lakeshow] [wcc]

SCRIPT_DIR=$(dirname "$0")
source "${SCRIPT_DIR}/common.sh"

# Default subdomains to test
SUBDOMAINS=("lakeshow" "wcc")

# Override with command line arguments if provided
if [ $# -gt 0 ]; then
  SUBDOMAINS=("$@")
fi

BASE_DOMAIN="strongmindstrongperformance.com"

show_section_header "TESTING ORGANIZATION SUBDOMAINS"

for SUBDOMAIN in "${SUBDOMAINS[@]}"; do
  FULL_DOMAIN="${SUBDOMAIN}.${BASE_DOMAIN}"
  
  printf "\n\e[1mTesting subdomain: $FULL_DOMAIN\e[0m\n"
  echo "----------------------------------------"
  
  # Test DNS resolution
  show_loading "Testing DNS resolution..."
  DNS_RESULT=$(nslookup "$FULL_DOMAIN" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
  if [ -n "$DNS_RESULT" ]; then
    print_success "DNS resolution" "Resolves to: $DNS_RESULT"
  else
    print_error "DNS resolution" "Failed to resolve $FULL_DOMAIN"
    continue
  fi
  
  # Test HTTP access
  show_loading "Testing HTTP access..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$FULL_DOMAIN" 2>/dev/null)
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    print_success "HTTP access" "Status: $HTTP_STATUS"
  else
    print_warning "HTTP access" "Status: $HTTP_STATUS (may redirect to HTTPS)"
  fi
  
  # Test HTTPS access
  show_loading "Testing HTTPS access..."
  HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$FULL_DOMAIN" 2>/dev/null)
  if [ "$HTTPS_STATUS" = "200" ] || [ "$HTTPS_STATUS" = "301" ] || [ "$HTTPS_STATUS" = "302" ]; then
    print_success "HTTPS access" "Status: $HTTPS_STATUS"
  else
    print_error "HTTPS access" "Status: $HTTPS_STATUS"
  fi
  
  # Test SSL certificate
  show_loading "Testing SSL certificate..."
  SSL_INFO=$(echo | openssl s_client -servername "$FULL_DOMAIN" -connect "$FULL_DOMAIN:443" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)
  if [ -n "$SSL_INFO" ]; then
    print_success "SSL certificate" "Valid certificate found"
    echo "Certificate info:"
    echo "$SSL_INFO" | sed 's/^/  /'
  else
    print_error "SSL certificate" "No valid certificate found"
  fi
  
  # Test CORS headers (if API is accessible)
  show_loading "Testing CORS headers..."
  CORS_HEADERS=$(curl -s -I -H "Origin: https://$FULL_DOMAIN" "https://api.$BASE_DOMAIN/api/" 2>/dev/null | grep -i "access-control")
  if [ -n "$CORS_HEADERS" ]; then
    print_success "CORS headers" "CORS headers present"
    echo "CORS headers:"
    echo "$CORS_HEADERS" | sed 's/^/  /'
  else
    print_warning "CORS headers" "No CORS headers found (API may not be accessible)"
  fi
  
  echo ""
done

printf "\n\e[32m=== Subdomain Testing Complete ===\e[0m\n"
printf "\e[32mTested subdomains: ${SUBDOMAINS[*]}\e[0m\n"
printf "\e[32mBase domain: $BASE_DOMAIN\e[0m\n"

printf "\n\e[33mNote: If any tests fail, ensure:\e[0m\n"
printf "\e[33m1. DNS records are created and propagated\e[0m\n"
printf "\e[33m2. SSL certificate includes wildcard domain\e[0m\n"
printf "\e[33m3. Load balancer is configured correctly\e[0m\n"
printf "\e[33m4. Django CORS settings allow the subdomain\e[0m\n"

printf "\nSubdomain testing completed.\n"
