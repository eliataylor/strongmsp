from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SchemaVersionsViewSet, PromptTemplatesViewSet

AiRouter = DefaultRouter(trailing_slash=False)
AiRouter.register(r'worksheets', SchemaVersionsViewSet, basename='worksheets')
AiRouter.register(r'prompt-templates', PromptTemplatesViewSet, basename='prompt-templates')

urlpatterns = [
    path('api/', include(AiRouter.urls)),
]
