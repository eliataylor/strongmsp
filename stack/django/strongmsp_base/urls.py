from django.conf import settings
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from strongmsp_base.settings import myEnv


def favicon_redirect(request):
    return redirect("https://storage.cloud.google.com/strongmsp-media/favicon.ico", permanent=True)

urlpatterns = [
    path('', include("strongmsp_app.urls")),
    path('', include("oasheets_app.urls")),
    path("favicon.ico", favicon_redirect),

    path("accounts/", include("allauth.urls")),
    path("_allauth/", include("allauth.headless.urls")),

    # Summernote URLs for file uploads and image handling
    path('summernote/', include('django_summernote.urls')),

    # Optional API docs:
    path('api/schema', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger'),
    path('api/schema/redoc', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('admin/', admin.site.urls),

]

if myEnv("OA_ENV_STORAGE", "local") == "local" and myEnv("DJANGO_ENV", "production")  == 'development':
    from django.conf.urls.static import static
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns

    # Serve static and media files from development server
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
