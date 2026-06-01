"""
Django settings for Riziki App backend.
"""

import os
import dj_database_url
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Security ────────────────────────────────────────────────────────────────
SECRET_KEY   = os.getenv('SECRET_KEY', 'django-insecure-fallback-key')
DEBUG        = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,pants-vitally-gorged.ngrok-free.dev,riziki-backend-7of1.onrender.com').split(',')

# ─── CSRF Trusted Origins ─────────────────────────────────────────────────────
# Mandatory safety layer for Django 4.0+ admin form processing in production
CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'https://riziki-backend-7of1.onrender.com,http://localhost:3000'
).split(',')

# ─── Applications ────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    # Django core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'django_apscheduler',

    # Local apps
    'auth_app',
    'balance_app',
    'transactions_app',
    'mpesa_app',
    'clients_app',
    'receipts_app',
    'scheduler',
]

# ─── Middleware ───────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF      = 'core.urls'
WSGI_APPLICATION  = 'core.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ─── Database — Automatic Environment Linkage ──────────────────────────────────
# Pulls directly from the single consolidated production string if available
if os.getenv('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Local fallback parameters for development environment structures
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'riziki_db'),
            'USER': os.getenv('DB_USER', 'Richkid'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'securepassword'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'OPTIONS': {
                'connect_timeout': 10,
            },
        }
    }

# ─── Custom user model ────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'auth_app.AdminUser'

# ─── Password validation ──────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Africa/Nairobi'
USE_I18N      = True
USE_TZ        = True

# ─── Static & Media — Configured for WhiteNoise ───────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── REST Framework ───────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# ─── JWT ──────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 60))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))
    ),
    'ROTATE_REFRESH_TOKENS':    True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES':        ('Bearer',),
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:8081,http://localhost:19006,http://pants-vitally-gorged.ngrok-free.dev,https://riziki-backend-7of1.onrender.com'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ─── Admin Passkey ────────────────────────────────────────────────────────────
ADMIN_PASSKEY = os.getenv('ADMIN_PASSKEY', '1234')

# ─── M-Pesa Integration ───────────────────────────────────────────────────────
MPESA_CONSUMER_KEY         = os.getenv('MPESA_CONSUMER_KEY',          '')
MPESA_CONSUMER_SECRET      = os.getenv('MPESA_CONSUMER_SECRET',       '')
MPESA_SHORTCODE            = os.getenv('MPESA_SHORTCODE',             '')
MPESA_PASSKEY              = os.getenv('MPESA_PASSKEY',               '')
MPESA_ENVIRONMENT          = os.getenv('MPESA_ENVIRONMENT',           'sandbox')
MPESA_CALLBACK_URL         = os.getenv('MPESA_CALLBACK_URL',          '')

# B2C Configurations
MPESA_B2C_RESULT_URL        = os.getenv('MPESA_B2C_RESULT_URL',        '')
MPESA_B2C_QUEUE_TIMEOUT_URL  = os.getenv('MPESA_B2C_QUEUE_TIMEOUT_URL',  '')

# B2B Configurations
MPESA_B2B_RESULT_URL        = os.getenv('MPESA_B2B_RESULT_URL',        '')
MPESA_B2B_QUEUE_TIMEOUT_URL  = os.getenv('MPESA_B2B_QUEUE_TIMEOUT_URL',  '')

# Reversal Configurations
MPESA_REVERSAL_RESULT_URL   = os.getenv('MPESA_REVERSAL_RESULT_URL',   '')
MPESA_REVERSAL_QUEUE_TIMEOUT_URL = os.getenv('MPESA_REVERSAL_QUEUE_TIMEOUT_URL', '')

# Initiator Configurations
MPESA_INITIATOR_NAME       = os.getenv('MPESA_INITIATOR_NAME',        '')
MPESA_INITIATOR_PASSWORD   = os.getenv('MPESA_INITIATOR_PASSWORD',    '')
MPESA_SECURITY_CREDENTIAL  = os.getenv('MPESA_SECURITY_CREDENTIAL',   '')

# ─── Redis / Celery ───────────────────────────────────────────────────────────
REDIS_URL             = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_BROKER_URL     = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL