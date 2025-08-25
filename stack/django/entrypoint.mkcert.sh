#!/bin/bash

API_HOST_DOMAIN=$(echo "$REACT_APP_API_HOST" | sed -E 's|^[^/]*//([^:/]*).*|\1|')
ssl_cert_path="/app/ssl/certificate-$API_HOST_DOMAIN.crt"
ssl_key_path="/app/ssl/certificate-$API_HOST_DOMAIN.key"

echo "Docker Building for REACT_APP_API_HOST: $REACT_APP_API_HOST"

if [[ "$REACT_APP_API_HOST" == https://* ]]; then
    if [[ ! -f "$ssl_cert_path" ]]; then
        mkdir -p "/app/ssl"

        # Extract base domain and create wildcard certificate
        BASE_DOMAIN=$(echo "$API_HOST_DOMAIN" | sed -E 's|^[^.]+\.(.+)$|\1|')
        if [[ "$BASE_DOMAIN" == "$API_HOST_DOMAIN" ]]; then
            # No subdomain, use the domain as is
            BASE_DOMAIN="$API_HOST_DOMAIN"
        fi

        echo "Creating SSL certificate for domain: $API_HOST_DOMAIN (base domain: $BASE_DOMAIN)"

        # Use mkcert to create certificate with proper SAN for subdomains
        if command -v mkcert &> /dev/null; then
            # Install mkcert CA in the container (non-interactive)
            mkcert -install 2>/dev/null || true

            # Generate certificate with wildcard support for subdomains
            if [[ "$BASE_DOMAIN" != "$API_HOST_DOMAIN" ]]; then
                # Create wildcard certificate for subdomains
                mkcert -key-file "$ssl_key_path" \
                       -cert-file "$ssl_cert_path" \
                       "*.$BASE_DOMAIN" "$BASE_DOMAIN" "localhost" "127.0.0.1" "::1"
            else
                # Create certificate for specific domain
                mkcert -key-file "$ssl_key_path" \
                       -cert-file "$ssl_cert_path" \
                       "$API_HOST_DOMAIN" "localhost" "127.0.0.1" "::1"
            fi
        else
            # Fallback to OpenSSL with proper SAN configuration
            echo "mkcert not available, using OpenSSL with SAN..."
            cat > /tmp/openssl.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Organization
OU = Unit
CN = $API_HOST_DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $API_HOST_DOMAIN
DNS.2 = *.$BASE_DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$ssl_key_path" \
                -out "$ssl_cert_path" \
                -config /tmp/openssl.cnf \
                -extensions v3_req
        fi

        echo "SSL certificate created at: $ssl_cert_path"
    else
        echo "SSL certificate already exists at: $ssl_cert_path"
    fi
else
    echo "REACT_APP_API_HOST - $REACT_APP_API_HOST - does not use HTTPS. Skipping SSL certificate creation."
fi

exec "$@"

echo "[OADJANGO] Building strongmsp migrations"
output=$(python manage.py makemigrations strongmsp_app --noinput 2>&1) || {
    echo "[OADJANGO] Make migrations output: $output";
}

echo "[OADJANGO] Building oasheets_app migrations"
output=$(python manage.py makemigrations oasheets_app --noinput 2>&1) || {
    echo "[OADJANGO] Make migrations output: $output";
}

echo "[OADJANGO] Building all migrations"
output=$(python manage.py makemigrations --noinput 2>&1) || {
    echo "[OADJANGO] Make all migrations output: $output";
}

echo "[OADJANGO] Migrating"
output=$(python manage.py migrate --noinput 2>&1) || {
    echo "[OADJANGO] Migrate output: $output";
}

echo "[OADJANGO] Sync DB"
output=$(python manage.py migrate --run-syncdb --noinput 2>&1) || {
    echo "[OADJANGO] Migrate db sync output: $output";
}

echo "[OADJANGO] Creating superuser"
output=$(python manage.py createsuperuser --noinput 2>&1) || {
    echo "[OADJANGO] createsuperuser output: $output";
}

echo "[OADJANGO] Build static files"
output=$(python manage.py collectstatic --noinput 2>&1) || {
    echo "[OADJANGO] static files output: $output";
}

PORT=$(echo "$REACT_APP_API_HOST" | sed -E 's|^https?://[^:/]+:?([0-9]*)/?|\1|')

# Default to 8088 if no port is extracted
if [[ -z "$PORT" || ! "$PORT" =~ ^[0-9]+$ ]]; then
    PORT=8088
fi

echo "[OADJANGO] Using PORT: $PORT"

if [ "$DJANGO_ENV" = "testing" ] || [ "$DJANGO_ENV" = "development" ] || { [ "$DJANGO_ENV" = "docker" ] && [ "$DJANGO_DEBUG" = "True" ]; }; then
    echo "[OADJANGO] Running in development mode with runserver_plus..."
    domain=$(echo "$REACT_APP_API_HOST" | sed -E 's|^https?://||' | sed -E 's|:[0-9]+$||')
    ssl_cert_path="/app/ssl/certificate-$domain.crt"
    ssl_key_path="/app/ssl/certificate-$domain.key"

    # Ensure certificate exists for the domain
    if [[ ! -f "$ssl_cert_path" ]]; then
        echo "[OADJANGO] Certificate not found for $domain, creating..."
        mkdir -p "/app/ssl"

        # Extract base domain for wildcard certificate
        BASE_DOMAIN=$(echo "$domain" | sed -E 's|^[^.]+\.(.+)$|\1|')
        if [[ "$BASE_DOMAIN" == "$domain" ]]; then
            BASE_DOMAIN="$domain"
        fi

        if command -v mkcert &> /dev/null; then
            mkcert -install 2>/dev/null || true
            if [[ "$BASE_DOMAIN" != "$domain" ]]; then
                mkcert -key-file "$ssl_key_path" \
                       -cert-file "$ssl_cert_path" \
                       "*.$BASE_DOMAIN" "$BASE_DOMAIN" "localhost" "127.0.0.1" "::1"
            else
                mkcert -key-file "$ssl_key_path" \
                       -cert-file "$ssl_cert_path" \
                       "$domain" "localhost" "127.0.0.1" "::1"
            fi
        else
            # Fallback to OpenSSL
            cat > /tmp/openssl.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Organization
OU = Unit
CN = $domain

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $domain
DNS.2 = *.$BASE_DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$ssl_key_path" \
                -out "$ssl_cert_path" \
                -config /tmp/openssl.cnf \
                -extensions v3_req
        fi
    fi

    python manage.py runserver_plus 0.0.0.0:$PORT --cert-file "$ssl_cert_path"
else
    echo "[OADJANGO] Running in production mode with gunicorn"
    exec gunicorn strongmsp_base.wsgi:application \
        --bind 0.0.0.0:$PORT \
        --workers 3 \
        --timeout 300 \
        --capture-output \
        --log-level debug \
        --access-logfile '-' \
        --error-logfile '-'
fi
