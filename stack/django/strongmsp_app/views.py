####OBJECT-ACTIONS-VIEWSET-IMPORTS-STARTS####
from rest_framework import viewsets, permissions, filters, generics
from rest_framework.views import APIView
from .pagination import CustomLimitOffsetPagination
from django.http import JsonResponse
from django.core.management import call_command
from django.apps import apps
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from .services import send_sms
import random
import re
import os
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from .serializers import UsersSerializer
from .models import Users
from .serializers import CoursesSerializer
from .models import Courses
from .serializers import AssessmentsSerializer
from .models import Assessments
from .serializers import AssessmentQuestionsSerializer
from .models import AssessmentQuestions
from .serializers import QuestionsSerializer
from .models import Questions
from .serializers import QuestionResponsesSerializer
from .models import QuestionResponses
from .serializers import PaymentsSerializer
from .models import Payments
from .serializers import PromptTemplatesSerializer
from .models import PromptTemplates
from .serializers import AgentResponsesSerializer
from .models import AgentResponses
from .serializers import CoachContentSerializer
from .models import CoachContent
from .serializers import SharesSerializer
from .models import Shares
from django.db.models import Count
####OBJECT-ACTIONS-VIEWSET-IMPORTS-ENDS####


####OBJECT-ACTIONS-VIEWSETS-STARTS####
class UsersViewSet(viewsets.ModelViewSet):
    queryset = Users.objects.all().order_by('id')
    serializer_class = UsersSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name']

    
class CoursesViewSet(viewsets.ModelViewSet):
    queryset = Courses.objects.all().order_by('id')
    serializer_class = CoursesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']

    
class AssessmentsViewSet(viewsets.ModelViewSet):
    queryset = Assessments.objects.all().order_by('id')
    serializer_class = AssessmentsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']

    
class AssessmentQuestionsViewSet(viewsets.ModelViewSet):
    queryset = AssessmentQuestions.objects.all().order_by('id')
    serializer_class = AssessmentQuestionsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['question__title']

    
class QuestionsViewSet(viewsets.ModelViewSet):
    queryset = Questions.objects.all().order_by('id')
    serializer_class = QuestionsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']

    
class QuestionResponsesViewSet(viewsets.ModelViewSet):
    queryset = QuestionResponses.objects.all().order_by('id')
    serializer_class = QuestionResponsesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['question__title']

    
class PaymentsViewSet(viewsets.ModelViewSet):
    queryset = Payments.objects.all().order_by('id')
    serializer_class = PaymentsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['course__title']

    
class PromptTemplatesViewSet(viewsets.ModelViewSet):
    queryset = PromptTemplates.objects.all().order_by('id')
    serializer_class = PromptTemplatesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    
class AgentResponsesViewSet(viewsets.ModelViewSet):
    queryset = AgentResponses.objects.all().order_by('id')
    serializer_class = AgentResponsesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    
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
  "AssessmentQuestions": [
    "question__title"
  ],
  "Questions": [
    "title"
  ],
  "QuestionResponses": [
    "question__title"
  ],
  "Payments": [
    "course__title"
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

SERIALZE_MODEL_MAP = { "Users": UsersSerializer,"Courses": CoursesSerializer,"Assessments": AssessmentsSerializer,"AssessmentQuestions": AssessmentQuestionsSerializer,"Questions": QuestionsSerializer,"QuestionResponses": QuestionResponsesSerializer,"Payments": PaymentsSerializer,"PromptTemplates": PromptTemplatesSerializer,"AgentResponses": AgentResponsesSerializer,"CoachContent": CoachContentSerializer,"Shares": SharesSerializer }

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
class UserModelListView(generics.GenericAPIView):

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomLimitOffsetPagination
    filter_backends = [filters.SearchFilter]
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

        serializer_class = self.get_serializer_classname(model_class)

        if not serializer_class:
            return JsonResponse({'detail': 'Serializer not found for this model.'}, status=404)

        # Apply pagination
        paginator = self.pagination_class()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = serializer_class(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)

    def get_serializer_classname(self, model_class):
        # Dynamically determine the serializer class based on the model
        return SERIALZE_MODEL_MAP.get(model_class.__name__)

    def filter_queryset(self, queryset):
        search_filter = filters.SearchFilter()
        return search_filter.filter_queryset(self.request, queryset, self)


@extend_schema(
    responses={200: 'Aggregated response values by question category for the given author'},
)
class QuestionResponseCategoryStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """
        Get aggregated sum of response values in QuestionResponses for each question category by a given author.
        """
        from django.db.models import Sum
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
            send_sms(phone_number, message)
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