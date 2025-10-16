####OBJECT-ACTIONS-VIEWSET-IMPORTS-STARTS####
from rest_framework import viewsets, permissions, filters, generics, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from .pagination import CustomLimitOffsetPagination
from django.http import JsonResponse
from django.core.management import call_command
from django.apps import apps
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from . import services
import random
import re
import os
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import Group
from django.db.models import Q
from .serializers import UsersSerializer
from .models import Users
from .serializers import CoursesSerializer
from .models import Courses
from .serializers import AssessmentsSerializer
from .models import Assessments
from .serializers import ProductsSerializer
from .models import Products
from .serializers import PaymentsSerializer
from .models import Payments
from .serializers import PaymentAssignmentsSerializer
from .models import PaymentAssignments
from .serializers import QuestionResponsesSerializer
from .models import QuestionResponses
from .serializers import PromptTemplatesSerializer
from .models import PromptTemplates
from .serializers import AgentResponsesSerializer
from .models import AgentResponses
from .serializers import CoachContentSerializer
from .models import CoachContent
from .serializers import SharesSerializer
from .models import Shares
from .serializers import NotificationsSerializer
from .models import Notifications
from django.db.models import Count
from .services.agent_orchestrator import AgentOrchestrator
####OBJECT-ACTIONS-VIEWSET-IMPORTS-ENDS####


####OBJECT-ACTIONS-VIEWSETS-STARTS####
class UsersViewSet(viewsets.ModelViewSet):
    queryset = Users.objects.all().order_by('id')
    serializer_class = UsersSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['first_name', 'last_name', 'username', 'email']
    filterset_fields = ['groups']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by athletes group if requested
        groups = self.request.query_params.get('groups')
        if groups:
            if groups == 'athletes':
                try:
                    athletes_group = Group.objects.get(name='athletes')
                    queryset = queryset.filter(groups=athletes_group)
                except Group.DoesNotExist:
                    # Return empty queryset if athletes group doesn't exist
                    queryset = queryset.none()
            else:
                # Handle other group filters if needed
                group_names = groups.split(',')
                queryset = queryset.filter(groups__name__in=group_names)
        
        return queryset
    




class CoursesViewSet(viewsets.ModelViewSet):
    queryset = Courses.objects.all().order_by('id')
    serializer_class = CoursesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']


class AssessmentsViewSet(viewsets.ModelViewSet):
    queryset = Assessments.objects.prefetch_related(
        'questions__question'
    ).order_by('id')
    serializer_class = AssessmentsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']





class QuestionResponsesViewSet(viewsets.ModelViewSet):
    queryset = QuestionResponses.objects.all().order_by('id')
    serializer_class = QuestionResponsesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['question__title', 'assessment__title']
    
    @action(detail=False, methods=['post'])
    def trigger_agents(self, request):
        """
        Trigger agent responses for an athlete's assessment.
        POST /api/question-responses/trigger-agents/
        Body: {"athlete_id": int, "assessment_id": int}
        """
        try:
            athlete_id = request.data.get('athlete_id')
            assessment_id = request.data.get('assessment_id')
            
            if not athlete_id or not assessment_id:
                return Response(
                    {'error': 'athlete_id and assessment_id are required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check 90% completion threshold
            total_questions = QuestionResponses.objects.filter(
                author_id=athlete_id, 
                assessment_id=assessment_id
            ).count()
            
            if total_questions < 45:  # 90% of 50 questions
                return Response(
                    {'error': 'Assessment must be at least 90% complete (45+ questions)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Trigger agents
            orchestrator = AgentOrchestrator()
            agent_responses = orchestrator.trigger_assessment_agents(athlete_id, assessment_id)
            
            return Response({
                'status': 'triggered',
                'agent_count': len(agent_responses),
                'message': f'Triggered {len(agent_responses)} agents for athlete {athlete_id}'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to trigger agents: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )




class PromptTemplatesViewSet(viewsets.ModelViewSet):
    queryset = PromptTemplates.objects.all().order_by('id')
    serializer_class = PromptTemplatesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class AgentResponsesViewSet(viewsets.ModelViewSet):
    queryset = AgentResponses.objects.all().order_by('id')
    serializer_class = AgentResponsesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """
        Regenerate an agent response.
        POST /api/agent-responses/{id}/regenerate/
        Only for purposes: "12sessions", "lessonpackage"
        """
        try:
            agent_response = self.get_object()
            
            # Check if regeneration is allowed for this purpose
            allowed_purposes = ['12sessions', 'lessonpackage']
            if agent_response.purpose not in allowed_purposes:
                return Response(
                    {'error': f'Regeneration not allowed for purpose: {agent_response.purpose}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Trigger sequential agent
            orchestrator = AgentOrchestrator()
            new_response = orchestrator.trigger_sequential_agent(
                agent_response.purpose,
                agent_response.athlete.id,
                agent_response.assessment.id if agent_response.assessment else None
            )
            
            if not new_response:
                return Response(
                    {'error': 'Failed to regenerate agent response'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Serialize and return new response
            serializer = AgentResponsesSerializer(new_response)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to regenerate: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CoachContentViewSet(viewsets.ModelViewSet):
    queryset = CoachContent.objects.all().order_by('id')
    serializer_class = CoachContentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']


class SharesViewSet(viewsets.ModelViewSet):
    queryset = Shares.objects.all().order_by('id')
    serializer_class = SharesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['content__title']


class NotificationsViewSet(viewsets.ModelViewSet):
    queryset = Notifications.objects.all().order_by('-created_at')
    serializer_class = NotificationsSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['message', 'recipient__username', 'recipient__first_name', 'recipient__last_name']
    filterset_fields = ['channel', 'delivery_status', 'notification_type', 'priority', 'seen']
    
    def get_queryset(self):
        """
        Filter notifications to only show those for the current user
        and restrict access to Admin, Agent, and Coach groups only.
        """
        user = self.request.user
        if not user.is_authenticated:
            return Notifications.objects.none()
        
        # Check if user is in allowed groups
        allowed_groups = ['Admin', 'Agent', 'Coach']
        user_groups = user.groups.values_list('name', flat=True)
        if not any(group in user_groups for group in allowed_groups):
            return Notifications.objects.none()
        
        # If user is not Admin, only show their own notifications
        if 'Admin' not in user_groups:
            return Notifications.objects.filter(recipient=user)
        
        # Admin can see all notifications
        return Notifications.objects.all()
    
    @action(detail=True, methods=['post'])
    def mark_seen(self, request, pk=None):
        """Mark a dashboard notification as seen"""
        notification = self.get_object()
        
        if notification.channel != 'dashboard':
            return Response(
                {'error': 'Only dashboard notifications can be marked as seen'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notification.seen = True
        notification.save()
        
        return Response({'status': 'marked as seen'})
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Manually trigger email sending for a notification"""
        notification = self.get_object()
        
        if notification.channel != 'email':
            return Response(
                {'error': 'Only email notifications can be sent via email'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status to sent (in real implementation, this would trigger actual email)
        from django.utils import timezone
        notification.delivery_status = 'sent'
        notification.sent_at = timezone.now()
        notification.save()
        
        return Response({'status': 'email sent'})
    
    @action(detail=True, methods=['post'])
    def send_sms(self, request, pk=None):
        """Manually trigger SMS sending for a notification"""
        notification = self.get_object()
        
        if notification.channel != 'sms':
            return Response(
                {'error': 'Only SMS notifications can be sent via SMS'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status to sent (in real implementation, this would trigger actual SMS)
        from django.utils import timezone
        notification.delivery_status = 'sent'
        notification.sent_at = timezone.now()
        notification.save()
        
        return Response({'status': 'sms sent'})
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get only dashboard notifications for the current user"""
        queryset = self.get_queryset().filter(
            channel='dashboard',
            recipient=request.user
        )
        
        # Filter out expired notifications
        from django.utils import timezone
        now = timezone.now()
        queryset = queryset.filter(
            models.Q(expires__isnull=True) | models.Q(expires__gt=now)
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


####OBJECT-ACTIONS-VIEWSETS-ENDS####


####OBJECT-ACTIONS-CORE-STARTS####
SEARCH_FIELDS_MAPPING = {
  "Users": [
    "first_name",
    "last_name"
  ],
  "Courses": [
    "title"
  ],
  "Assessments": [
    "title"
  ],
  "QuestionResponses": [
    "question__title"
  ],
  "PromptTemplates": [],
  "AgentResponses": [],
  "CoachContent": [
    "title"
  ],
  "Shares": [
    "content__title"
  ]
}

SERIALZE_MODEL_MAP = { "Users": UsersSerializer,"Courses": CoursesSerializer,"Assessments": AssessmentsSerializer,"QuestionResponses": QuestionResponsesSerializer,"PromptTemplates": PromptTemplatesSerializer,"AgentResponses": AgentResponsesSerializer,"CoachContent": CoachContentSerializer,"Shares": SharesSerializer }

class UserStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomLimitOffsetPagination

    def get(self, request, user_id, model_name):
        # Get the model class from the model name
        try:
            model = apps.get_model('strongmsp_app', model_name)
        except LookupError:
            return JsonResponse({'error': 'Model not found'}, status=404)

        # Check if the model has an 'author' field
        if not hasattr(model, 'author'):
            return JsonResponse({'error': 'Model does not have an author field'}, status=400)

        # Count the number of entities the user owns
        count = model.objects.filter(author=user_id).count()

        # Return the count as JSON
        return JsonResponse({'model': model_name, 'count': count})

@extend_schema(
    parameters=[
        OpenApiParameter(name='search', description='Search term', required=False, type=str),
    ],
    responses={200: 'Paginated list of objects owned by the user'},
)
@extend_schema(
    parameters=[
        OpenApiParameter(
            name='search', 
            description='Search term', 
            required=False, 
            type=str
        ),
        OpenApiParameter(
            name='group', 
            description='Filter by author group name (e.g., "Athletes", "Agents", "Coaches")', 
            required=False, 
            type=str
        ),
    ],
    responses={200: 'Paginated list of objects owned by the user'},
)
class UserModelListView(generics.GenericAPIView):

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomLimitOffsetPagination
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    
    def get(self, request, user_id, model_name):
        # Check if the model exists
        try:
            model_class = apps.get_model("strongmsp_app", model_name)
        except LookupError:
            return JsonResponse({'detail': 'Model not found.'}, status=404)

        # Filter the queryset based on author
        queryset = model_class.objects.filter(author_id=user_id)

        # Apply search filtering
        self.search_fields = SEARCH_FIELDS_MAPPING.get(model_name, [])
        search_query = request.query_params.get('search')
        if search_query:
            queryset = self.filter_queryset(queryset)

        # Apply group filtering
        group_name = request.query_params.get('group')
        if group_name:
            # Verify the group exists
            if not Group.objects.filter(name=group_name).exists():
                return JsonResponse({
                    'detail': f'Group "{group_name}" not found. Available groups: {", ".join(Group.objects.values_list("name", flat=True))}'
                }, status=400)
            
            # Filter by group membership
            queryset = queryset.filter(author__groups__name=group_name)

        serializer_class = self.get_serializer_classname(model_class)

        if not serializer_class:
            return JsonResponse({'detail': 'Serializer not found for this model.'}, status=404)

        # Apply pagination
        paginator = self.pagination_class()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = serializer_class(paginated_queryset, many=True)
        
        # Add metadata about applied filters
        response_data = paginator.get_paginated_response(serializer.data)
        if hasattr(response_data, 'data'):
            response_data.data['filters_applied'] = {
                'search': search_query,
                'group': group_name,
                'total_count': queryset.count()
            }
        
        return response_data

    def get_serializer_classname(self, model_class):
        # Dynamically determine the serializer class based on the model
        return SERIALZE_MODEL_MAP.get(model_class.__name__)

    def filter_queryset(self, queryset):
        search_filter = filters.SearchFilter()
        return search_filter.filter_queryset(self.request, queryset, self)


@extend_schema(
    responses={200: 'List of available groups for filtering'},
)
class AvailableGroupsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get list of available groups that can be used for filtering.
        """
        groups = Group.objects.all().values('id', 'name')
        return JsonResponse({
            'groups': list(groups),
            'count': groups.count()
        })


@extend_schema(
    parameters=[
        OpenApiParameter(
            name='group', 
            description='Group name to get statistics for', 
            required=False, 
            type=str
        ),
    ],
    responses={200: 'Group statistics and member counts'},
)
class GroupStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get statistics about groups and their members.
        """
        group_name = request.query_params.get('group')
        
        if group_name:
            # Get stats for specific group
            try:
                group = Group.objects.get(name=group_name)
                member_count = group.user_set.count()
                
                # Get model counts for this group
                model_counts = {}
                for model_name in SEARCH_FIELDS_MAPPING.keys():
                    try:
                        model_class = apps.get_model("strongmsp_app", model_name)
                        if hasattr(model_class, 'author'):
                            count = model_class.objects.filter(author__groups=group).count()
                            model_counts[model_name] = count
                    except LookupError:
                        continue
                
                return JsonResponse({
                    'group': {
                        'id': group.id,
                        'name': group.name,
                        'member_count': member_count,
                        'model_counts': model_counts
                    }
                })
            except Group.DoesNotExist:
                return JsonResponse({
                    'error': f'Group "{group_name}" not found'
                }, status=404)
        else:
            # Get stats for all groups
            groups_data = []
            for group in Group.objects.all():
                member_count = group.user_set.count()
                groups_data.append({
                    'id': group.id,
                    'name': group.name,
                    'member_count': member_count
                })
            
            return JsonResponse({
                'groups': groups_data,
                'total_groups': len(groups_data)
            })


@extend_schema(
    responses={200: 'Aggregated response values by question category for the given author'},
)
class QuestionResponseCategoryStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        """
        Get aggregated sum of response values in QuestionResponses for each question category by a given author.
        """
        from django.db.models import Sum, Count
        from .models import QuestionResponses, Questions

        # Get all question responses for the given author
        responses = QuestionResponses.objects.filter(author_id=user_id)

        # Aggregate responses by question category
        category_stats = responses.values(
            'question__question_category'
        ).annotate(
            total_response=Sum('response'),
            response_count=Count('id')
        ).filter(
            question__question_category__isnull=False
        ).order_by('question__question_category')

        # Format the response data
        result = []
        for stat in category_stats:
            category = stat['question__question_category']
            if category:  # Ensure category is not None
                result.append({
                    'category': category,
                    'total_response': stat['total_response'],
                    'response_count': stat['response_count'],
                    'average_response': round(stat['total_response'] / stat['response_count'], 2) if stat['response_count'] > 0 else 0
                })

        return JsonResponse({
            'user_id': user_id,
            'category_stats': result,
            'total_categories': len(result)
        })


class RenderFrontendIndex(APIView):
    def get(self, request, *args, **kwargs):
        file_path = os.getenv("FRONTEND_INDEX_HTML", "index.html")
        if not os.path.isfile(file_path):
            return HttpResponse('Ok', content_type='text/html')

        with open(file_path, 'r') as file:
            html_content = file.read()

        modified_html = html_content
        frontend_url = os.getenv('FRONTEND_URL', 'https://localhost.strongmindstrongperformance.com:3008')

        # Prepend the host to all relative URLs
        def prepend_host(match):
            url = match.group(1)
            if url.startswith('/') or not url.startswith(('http://', 'https://')):
                return f'{match.group(0)[:5]}{frontend_url}/{url.lstrip("/")}"'
            return match.group(0)

        # Prepend the host to all relative src and href URLs
        modified_html = re.sub(r'src="([^"]+)"', prepend_host, modified_html)
        modified_html = re.sub(r'href="([^"]+)"', prepend_host, modified_html)

        # react-scripts bundle instead of compiled version
        if ":3008" in frontend_url:
            modified_html = modified_html.replace('</head>',
                                                  f'<script defer="" src="{frontend_url}/static/js/bundle.js"></script></head>')

        return HttpResponse(modified_html, content_type='text/html')

def redirect_to_frontend(request, provider=None):
    frontend_url = os.getenv('REACT_APP_APP_HOST', 'https://localhost.strongmindstrongperformance.com:3008')
    redirect_path = request.path
    query_params = request.GET.copy()
    if "provider" in query_params:
        redirect_path = redirect_path.replace("provider", query_params['provider'])
    query_string = query_params.urlencode()
    response = redirect(f'{frontend_url}{redirect_path}?{query_string}')
    return response

####OBJECT-ACTIONS-CORE-ENDS####

from django.contrib.auth import get_user_model
from django.conf import settings
from allauth.account.models import EmailAddress
from allauth.account.utils import complete_signup, perform_login
from allauth.socialaccount.sessions import LoginSession
from rest_framework import status
from .serializers import VerifyPhoneSerializer, PhoneNumberSerializer

import os


class SendCodeView(APIView):
    permission_classes = [permissions.AllowAny]  # Allow any user to access this view

    @extend_schema(
        request=PhoneNumberSerializer,
        responses={
            200: OpenApiResponse(description='SMS sent successfully', examples={
                'application/json': {"detail": "SMS sent successfully"}
            }),
            400: OpenApiResponse(description='Bad request', examples={
                'application/json': {"phone_number": ["This field is required."]}
            }),
        }
    )
    def post(self, request, *args, **kwargs):
        serializer = PhoneNumberSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone']
            code = str(random.randint(1000, 999999))
            if phone_number == '+14159999999':
                return JsonResponse({"detail": "Enter your Demo Account code"}, status=status.HTTP_200_OK)
            message = f"Your localhost.strongmindstrongperformance.com verification code is {code}"
            services.send_sms(phone_number, message)
            request.session['code'] = code
            return JsonResponse({"detail": "SMS sent successfully"}, status=status.HTTP_200_OK)
        return JsonResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyCodeView(APIView):
    permission_classes = [permissions.AllowAny]  # Allow any user to access this view

    @extend_schema(
        request=VerifyPhoneSerializer,
        responses={
            200: OpenApiResponse(description='SMS sent successfully', examples={
                'application/json': {"detail": "SMS sent successfully", "id": "user id"}
            }),
            400: OpenApiResponse(description='Bad request', examples={
                'application/json': {"phone_number": ["This field is required."]}
            }),
        }
    )
    def post(self, request, *args, **kwargs):
        serializer = VerifyPhoneSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone']
            code = str(serializer.validated_data['code'])
            if str(request.session.get('code')) == code or (phone_number == '+14159999999' and code == '542931'):

                redirect_url = f"/"

                try:
                    user = get_user_model().objects.get(phone=phone_number)
                    created = False
                except get_user_model().DoesNotExist:
                    user = get_user_model().objects.create(username=phone_number,
                                                           email=f'{phone_number}@sms-placeholder.com',
                                                           phone=phone_number)
                    created = True
                    redirect_url = f"/users/{user.id}"

                if created:
                    user.phone = phone_number  # Save the phone field
                    user.set_unusable_password()  # Set password logic as needed
                    user.save()
                    email_address = EmailAddress.objects.create(user=user, email=user.email, verified=True,
                                                                primary=True)
                    response = complete_signup(request, user, False, redirect_url)
                else:
                    response = perform_login(
                        request,
                        user,
                        False,
                        redirect_url)

                LoginSession(request, "sms_login_session", settings.SESSION_COOKIE_NAME)
                response = JsonResponse({"detail": "Verification successful",
                                         "id": user.id,
                                         "redirect": redirect_url},
                                        status=status.HTTP_200_OK)
                response.url = redirect_url
                response.apiVersion = timezone.now()
                return response

            return JsonResponse({"error": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)

        return JsonResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProductsViewSet(viewsets.ModelViewSet):
    queryset = Products.objects.filter(is_active=True).order_by('id')
    serializer_class = ProductsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description']
    filterset_fields = ['is_active', 'price']

class PaymentsViewSet(viewsets.ModelViewSet):
    queryset = Payments.objects.all().order_by('-created_at')
    serializer_class = PaymentsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['author__username', 'author__email', 'product__title']
    filterset_fields = ['status', 'product', 'author']

class PaymentAssignmentsViewSet(viewsets.ModelViewSet):
    queryset = PaymentAssignments.objects.all().order_by('-created_at')
    serializer_class = PaymentAssignmentsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['athlete__username', 'athlete__email', 'payment__id']
    filterset_fields = ['athlete', 'coaches', 'parents']
