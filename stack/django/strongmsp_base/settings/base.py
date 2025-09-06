import logging
import os

from dotenv import dotenv_values

logger = logging.getLogger(__name__)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
logger.debug(f"[OADJANGO] Using Root Dir {ROOT_DIR}")

# Only use this when you still want the private version in debug mode / locally like for social keys
# this is mostly just a hack for OA Contributors to develop without having to changing .env.public or .env
def myEnv(key, default=None):
    if os.path.exists(ROOT_DIR + '/.env.private'):
        config = dotenv_values(ROOT_DIR + '/.env.private')
        if key in config:
            return config[key]
    return os.getenv(key, default)

DJANGO_ENV = myEnv('DJANGO_ENV', 'production')
DEBUG = myEnv('DJANGO_DEBUG', 'True') == 'True'

logger.debug(f"[OADJANGO] DJANGO_ENV: {DJANGO_ENV} ")
logger.debug(f"[OADJANGO] DEBUG: {DEBUG} ")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    'django.contrib.sessions',
    "django.contrib.messages",
    "django.contrib.staticfiles",
    'django.contrib.humanize',
    'storages',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_summernote',

    #    'address',
    #    'djmoney',

    "allauth",
    "allauth.account",

    "allauth.socialaccount",
    'allauth.socialaccount.providers.spotify',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    'allauth.socialaccount.providers.openid_connect',
    "allauth.mfa",
    "allauth.headless",
    "allauth.usersessions",

    'strongmsp_app',
    'oasheets_app',
    'drf_spectacular',
]

# Summernote Configuration
SUMMERNOTE_CONFIG = {
    'iframe': True,
    'summernote': {
        'width': '100%',
        'height': '480',
        'toolbar': [
            ['style', ['style']],
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontname', ['fontname']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video']],
            ['view', ['fullscreen', 'codeview', 'help']],
        ],
        'codemirror': {
            'mode': 'htmlmixed',
            'lineNumbers': 'true',
            # You have to include theme file in 'css' or 'css_for_inplace' before using it.
            'theme': 'monokai',
        },
    },
    'disable_attachment': False,
    'css': (
         '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.29.0/theme/monokai.min.css',
        '/static/strongmsp_app/css/summernote-custom.css',  # Use absolute static path
    ),
    # Additional configuration for better integration
    'attachment_upload_to': 'summernote_uploads/',
    'attachment_storage_class': None,  # Use default storage
    'attachment_filesize_limit': 1024 * 1024 * 5,  # 5MB limit
    'attachment_image_only': False,  # Allow other file types
    # Cloud Run specific settings
    'attachment_require_authentication': True,  # Require authentication for file uploads
    # Additional CSS configuration to ensure proper loading
    'css_for_inplace': (
        '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.29.0/theme/monokai.min.css',
        '/static/strongmsp_app/css/summernote-custom.css',
    ),
}

if DEBUG == True or DJANGO_ENV != 'production':
    INSTALLED_APPS += ['django_extensions']
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'console': {
                'level': 'INFO',
                'class': 'logging.StreamHandler',
            },
        },
        'loggers': {
            'django': {
                'handlers': ['console'],
                'level': 'INFO',
            },
        },
    }

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    #    'csp.middleware.CSPMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

SITE_ID = 1

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        #        'strongmsp_app.authentication.AuthenticationByDeviceType',
        #        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication'
    ],
    'EXCEPTION_HANDLER': 'strongmsp_app.exceptions.oa_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'strongmsp_app.pagination.CustomLimitOffsetPagination',
    'PAGE_SIZE': 15,
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_SCHEMA_CLASS': 'strongmsp_app.schema_hooks.CustomAutoSchema',

}

SPECTACULAR_SETTINGS = {
    'TITLE': 'strongmsp',
    'DESCRIPTION': 'strongmsp',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'COMPONENT_NO_READ_ONLY_REQUIRED': True,
    'PREPROCESSING_HOOKS': ['strongmsp_app.schema_hooks.custom_preprocessing_hook'],
    'POSTPROCESSING_HOOKS': ['strongmsp_app.schema_hooks.custom_postprocessing_hook'],
    'EXTENSIONS_INFO': {
        'x-custom-serializers': True,
    }
}

if DEBUG:
    SPECTACULAR_SETTINGS = {
        "SERVE_PUBLIC": True,
        "SERVE_INCLUDE_SCHEMA": True
    }

ROOT_URLCONF = 'strongmsp_base.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [f'{ROOT_DIR}/strongmsp_base/templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request', # required by allauth
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'strongmsp_base.wsgi.application'

# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
