import os
from urllib.parse import urlparse

from corsheaders.defaults import default_headers

from .base import myEnv, logger, DJANGO_ENV


def get_tld(hostname):
    if hostname:
        parts = hostname.split(".")
        if hostname == "localhost" or hostname.replace(".", "").isdigit():
            # Handle localhost or IP
            result = hostname
        else:
            # Get the last two parts for domain names
            result = ".".join(parts[-2:])
        return result
    else:
        return hostname


APP_HOST = os.getenv('REACT_APP_APP_HOST', 'https://localhost.strongmindstrongperformance.com:3008')
APP_HOST_PARTS = urlparse(APP_HOST)
API_HOST = os.getenv('REACT_APP_API_HOST', 'https://localapi.strongmindstrongperformance.com:8088')
API_HOST_PARTS = urlparse(API_HOST)

SECRET_KEY = myEnv('DJANGO_SECRET_KEY', 'default')
DJANGO_SUPERUSER_USERNAME = myEnv('DJANGO_SUPERUSER_USERNAME', 'superadmin')
DJANGO_SUPERUSER_PASSWORD = myEnv('DJANGO_SUPERUSER_PASSWORD', 'admin')
DJANGO_SUPERUSER_EMAIL = myEnv('DJANGO_SUPERUSER_EMAIL', 'info@localhost.strongmindstrongperformance.com')

ALLOWED_HOSTS = [get_tld(API_HOST_PARTS.hostname), f".{get_tld(API_HOST_PARTS.hostname)}"]

# experimenting by adding the APP_HOST as and ALLOWED_HOST (per https://github.com/pennersr/django-allauth/issues/4041)
if get_tld(APP_HOST_PARTS.hostname) not in ALLOWED_HOSTS:
    ALLOWED_HOSTS += [f"{get_tld(APP_HOST_PARTS.hostname)}", f".{get_tld(APP_HOST_PARTS.hostname)}"]

CORS_ALLOWED_ORIGINS = [APP_HOST, API_HOST]
DEV_PORT = '3008' if not APP_HOST_PARTS.port else APP_HOST_PARTS.port

# allow localhost to tap production to ease front-end dev contributors
CORS_ALLOWED_ORIGINS += [f"{APP_HOST_PARTS.scheme}://localhost:{DEV_PORT}",
                         f"{APP_HOST_PARTS.scheme}://127.0.0.1:{DEV_PORT}",
                         f"{APP_HOST_PARTS.scheme}://reactjs-service:{DEV_PORT}",
                         f"{API_HOST_PARTS.scheme}://django-service:8088",
                         f"https://webapp.strongmindstrongperformance.com",
                         f"http://webapp.strongmindstrongperformance.com"]

if DJANGO_ENV != 'production':
    # for docker networking
    ALLOWED_HOSTS += ["localhost", "127.0.0.1", "django-service"]

CORS_ALLOW_CREDENTIALS = True # using cookies
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-email-verification-key',  # used by allauth
    'X-App-Client',  # used by mobile to toggle to Token auth
    'x-password-reset-key',
    'x-csrftoken',
    'X-CSRFToken',  # Django expects this header name for CSRF tokens
    'X-Session-Token' # allAuth App Usage
]

logger.debug(f"Allowing Hosts: {", ".join(ALLOWED_HOSTS)}")

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# CSRF Configuration
CSRF_COOKIE_NAME = 'csrftoken'  # Explicitly set the cookie name
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'  # Explicitly set the header name Django expects
CSRF_COOKIE_SECURE = APP_HOST_PARTS.scheme == 'https'
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read the CSRF cookie
CSRF_COOKIE_SAMESITE = 'Lax'

# Set cookie domain to parent domain so both subdomains can access it
CSRF_COOKIE_DOMAIN = '.strongmindstrongperformance.com'
# CSRF_COOKIE_SAMESITE = None

logger.debug(f"Allowed Origins: {CSRF_COOKIE_DOMAIN}")
logger.debug(f"Allowed Trusted/CSRF Domains: {", ".join(CSRF_TRUSTED_ORIGINS)}")

# same for session cookies
SESSION_COOKIE_DOMAIN = CSRF_COOKIE_DOMAIN
SESSION_COOKIE_SAMESITE = CSRF_COOKIE_SAMESITE
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE
SESSION_COOKIE_HTTPONLY = CSRF_COOKIE_HTTPONLY

# Log the cookie domains for debugging
logger.debug(f"CSRF Cookie Domain: {CSRF_COOKIE_DOMAIN}")
logger.debug(f"Session Cookie Domain: {SESSION_COOKIE_DOMAIN}")
logger.debug(f"CSRF Cookie Name: {CSRF_COOKIE_NAME}")
logger.debug(f"CSRF Header Name: {CSRF_HEADER_NAME}")
logger.debug(f"CSRF Trusted Origins: {CSRF_TRUSTED_ORIGINS}")

if API_HOST_PARTS.scheme.lower() == 'https':
#    SECURE_SSL_REDIRECT = True # only use if not served behind a reverse proxy like Cloud Run / Nginx /..
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True  # Apply HSTS to all subdomains
    SECURE_HSTS_PRELOAD = True  # Allow the site to be included in browsers' HSTS preload list


if DJANGO_ENV == 'production':
    AUTH_PASSWORD_VALIDATORS = [
        { 
            'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        },
        {
            'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
        },
    ]


if APP_HOST == 'localhost' or API_HOST == 'localhost':
    CSP_DEFAULT_SRC = ("'self'", "*")
    CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'", "*")
    CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "*")
    CSP_IMG_SRC = ("'self'", "data:", "*")
    CSP_CONNECT_SRC = ("'self'", "*")
    CSP_FONT_SRC = ("'self'", "*")
    CSP_FRAME_SRC = ("'self'", "*")
    CSP_BASE_URI = ("'self'", "*")
    CSP_FORM_ACTION = ("'self'", "*")
    CSP_INCLUDE_NONCE_IN = ['script-src']
