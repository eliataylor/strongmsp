####OBJECT-ACTIONS-URL-IMPORTS-STARTS####
from django.urls import re_path
from rest_framework.routers import DefaultRouter
from django.urls import include, path
from .views import UserModelListView
from .views import UserStatsView
from .views import QuestionResponseCategoryStatsView
from .views import AvailableGroupsView
from .views import GroupStatsView
from .views import RenderFrontendIndex
from .views import redirect_to_frontend
from .oa_testing import OATesterUserViewSet
from .views import UsersViewSet
from .views import CoursesViewSet
from .views import AssessmentsViewSet
from .views import ProductsViewSet
from .views import PaymentsViewSet
from .views import PaymentAssignmentsViewSet
from .views import QuestionResponsesViewSet
from .views import PromptTemplatesViewSet
from .views import AgentResponsesViewSet
from .views import CoachContentViewSet
from .views import SharesViewSet
from .views import NotificationsViewSet
from .views import CurrentContextView
from .views import CoachSearchView
####OBJECT-ACTIONS-URL-IMPORTS-ENDS####
urlpatterns = [path('', RenderFrontendIndex.as_view(), name='index')]

####OBJECT-ACTIONS-URLS-STARTS####

OARouter = DefaultRouter(trailing_slash=False)
OARouter.register(r'oa-testers', OATesterUserViewSet, basename='oa-tester')
OARouter.register('users', UsersViewSet, basename='users')
OARouter.register('courses', CoursesViewSet, basename='courses')
OARouter.register('assessments', AssessmentsViewSet, basename='assessments')
OARouter.register('products', ProductsViewSet, basename='products')
OARouter.register('payments', PaymentsViewSet, basename='payments')
OARouter.register('payment-assignments', PaymentAssignmentsViewSet, basename='payment-assignments')
OARouter.register('question-responses', QuestionResponsesViewSet, basename='question-responses')
OARouter.register('prompt-templates', PromptTemplatesViewSet, basename='prompt-templates')
OARouter.register('agent-responses', AgentResponsesViewSet, basename='agent-responses')
OARouter.register('coach-content', CoachContentViewSet, basename='coach-content')
OARouter.register('shares', SharesViewSet, basename='shares')
OARouter.register('notifications', NotificationsViewSet, basename='notifications')

if urlpatterns is None:
    urlpatterns = []
    
urlpatterns += [
    re_path(r'^account/.*$', redirect_to_frontend, name='provider_callback_no_provider'),
        
    path('api/users/<int:user_id>/<str:model_name>/list', UserModelListView.as_view(), name='user-model-list'),
    path('api/users/<int:user_id>/<str:model_name>/stats', UserStatsView.as_view(), name='user-model-stats'),
    path('api/users/<int:user_id>/question-response-category-stats', QuestionResponseCategoryStatsView.as_view(), name='question-response-category-stats'),
    path('api/groups/available', AvailableGroupsView.as_view(), name='available-groups'),
    path('api/groups/stats', GroupStatsView.as_view(), name='group-stats'),
    path('api/users/search-coaches', CoachSearchView.as_view(), name='coach-search'),
    path('api/context/current', CurrentContextView.as_view(), name='current-context'),
    path('api/', include(OARouter.urls)),
]
####OBJECT-ACTIONS-URLS-ENDS####

from .views import SendCodeView, VerifyCodeView

urlpatterns += [
    path('objectactions/auth/sms', SendCodeView.as_view(), name='send_code'),
    path('objectactions/auth/verify-sms', VerifyCodeView.as_view(), name='verify_code'),
]