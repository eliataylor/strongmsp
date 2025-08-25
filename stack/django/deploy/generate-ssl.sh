#!/bin/bash

# Script to generate SSL certificates using mkcert for local development
# This creates certificates that work properly with Chrome

SSL_DIR="/app/ssl"
mkdir -p "$SSL_DIR"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "mkcert is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install mkcert
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt update && sudo apt install -y mkcert
    else
        echo "Please install mkcert manually: https://github.com/FiloSottile/mkcert"
        exit 1
    fi
fi

# Install the local CA
echo "Installing mkcert CA..."
mkcert -install

# Extract domains from environment variables
extract_domain() {
    local url="$1"
    if [[ -n "$url" ]]; then
        echo "$url" | sed -E 's|^https?://([^:/]+).*|\1|'
    fi
}

# Get domains from environment variables
API_DOMAIN=$(extract_domain "$REACT_APP_API_HOST")
APP_DOMAIN=$(extract_domain "$REACT_APP_APP_HOST")

# Build default domains list
DEFAULT_DOMAINS=("localhost" "127.0.0.1" "::1")

# Add API domain if it exists and is not already in the list
if [[ -n "$API_DOMAIN" ]]; then
    DEFAULT_DOMAINS+=("$API_DOMAIN")
fi

# Add APP domain if it exists and is not already in the list
if [[ -n "$APP_DOMAIN" && "$APP_DOMAIN" != "$API_DOMAIN" ]]; then
    DEFAULT_DOMAINS+=("$APP_DOMAIN")
fi

# Add fallback domains if environment variables are not set
if [[ -z "$API_DOMAIN" ]]; then
    DEFAULT_DOMAINS+=("localapi.strongmindstrongperformance.com")
fi

if [[ -z "$APP_DOMAIN" ]]; then
    DEFAULT_DOMAINS+=("localhost.strongmindstrongperformance.com")
fi

# Parse command line arguments for custom domains
CUSTOM_DOMAINS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --domains)
            shift
            while [[ $# -gt 0 && ! $1 =~ ^-- ]]; do
                CUSTOM_DOMAINS+=("$1")
                shift
            done
            ;;
        --help)
            echo "Usage: $0 [--domains domain1 domain2 ...]"
            echo "  --domains: Specify custom domains to generate certificates for"
            echo "  Environment variables:"
            echo "    REACT_APP_API_HOST: $REACT_APP_API_HOST"
            echo "    REACT_APP_APP_HOST: $REACT_APP_APP_HOST"
            echo "  Extracted domains:"
            echo "    API Domain: ${API_DOMAIN:-not set}"
            echo "    APP Domain: ${APP_DOMAIN:-not set}"
            echo "  Default domains: ${DEFAULT_DOMAINS[*]}"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Use custom domains if provided, otherwise use defaults
if [[ ${#CUSTOM_DOMAINS[@]} -gt 0 ]]; then
    DOMAINS=("${CUSTOM_DOMAINS[@]}")
else
    DOMAINS=("${DEFAULT_DOMAINS[@]}")
fi

echo "Environment variables:"
echo "  REACT_APP_API_HOST: ${REACT_APP_API_HOST:-not set}"
echo "  REACT_APP_APP_HOST: ${REACT_APP_APP_HOST:-not set}"
echo "Extracted domains:"
echo "  API Domain: ${API_DOMAIN:-not set}"
echo "  APP Domain: ${APP_DOMAIN:-not set}"
echo "Generating SSL certificates for domains: ${DOMAINS[*]}"

# Generate the certificate
mkcert -key-file "$SSL_DIR/certificate.key" \
       -cert-file "$SSL_DIR/certificate.crt" \
       "${DOMAINS[@]}"

echo "SSL certificates generated successfully!"
echo "Certificate: $SSL_DIR/certificate.crt"
echo "Private key: $SSL_DIR/certificate.key"
echo ""
echo "These certificates will work with Chrome and other browsers."
echo "Make sure your /etc/hosts file includes entries for your custom domains."
