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
from django.db import models
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
from .models import Organizations, UserOrganizations
from django.db.models import Count
from .services.agent_orchestrator import AgentOrchestrator
from urllib.parse import urlparse
from .permissions import AgentResponsePermission, CoachContentPermission, PaymentAssignmentPermission
from utils.helpers import get_subdomain_from_request
####OBJECT-ACTIONS-VIEWSET-IMPORTS-ENDS####

class AutoAuthorViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that automatically sets the author field to the current user.
    All ViewSets should inherit from this to ensure consistent author assignment.
    """
    def perform_create(self, serializer):
        # Only set author if the model has an author field
        if hasattr(serializer.Meta.model, 'author'):
            serializer.save(author=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        # Only set author if the model has an author field
        if hasattr(serializer.Meta.model, 'author'):
            serializer.save(author=self.request.user)
        else:
            serializer.save()


####OBJECT-ACTIONS-VIEWSETS-STARTS####
class UsersViewSet(AutoAuthorViewSet):
    queryset = Users.objects.all().order_by('id')
    serializer_class = UsersSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['first_name', 'last_name', 'username', 'email']
    filterset_fields = ['groups']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Always filter by coaches group in UserOrganizations
        coaches_group = Group.objects.get(name='coach')
        queryset = queryset.filter(
            user_organizations__groups=coaches_group,
            user_organizations__is_active=True
        ).distinct()

        # Filter by organization if organization query parameter is provided
        organization_slug = self.request.query_params.get('organization')
        if organization_slug:
            queryset = queryset.filter(
                user_organizations__organization__slug=organization_slug,
                user_organizations__is_active=True
            ).distinct()

        return queryset



class CoursesViewSet(AutoAuthorViewSet):
    queryset = Courses.objects.all().order_by('id')
    serializer_class = CoursesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']


class AssessmentsViewSet(AutoAuthorViewSet):
    queryset = Assessments.objects.prefetch_related(
        'questions__question'
    ).order_by('id')
    serializer_class = AssessmentsSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to validate user has access to this assessment
        through a valid PaymentAssignment.
        """
        from django.utils import timezone
        from django.db.models import Q

        # Get the assessment instance
        assessment = self.get_object()
        assessment_id = assessment.id

        # Check if user is authenticated
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Validate user has access through PaymentAssignment
        assignment_data = request.assignment_service.get_for_assessment(assessment_id)

        if not assignment_data:
            return Response(
                {'detail': 'You do not have access to this assessment'},
                status=status.HTTP_403_FORBIDDEN
            )

        assignment = assignment_data['assignment']

        # Serialize with athlete context for response inclusion
        serializer = self.get_serializer(assessment, context={
            'athlete_id': assignment.athlete.id,
            'request': request
        })
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def complete(self, request):
        """
        Complete an assessment by validating all questions have been answered and triggering agents.
        POST /api/assessments/complete/
        Body: {"assessment_id": int, "responses": [{"question": int, "response": int}, ...]}
        """
        try:
            assessment_id = request.data.get('assessment_id')
            responses_data = request.data.get('responses', [])

            if not assessment_id or not responses_data:
                return Response(
                    {'error': 'assessment_id and responses are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate user has access to this assessment
            assignment_data = request.assignment_service.get_for_assessment(assessment_id)

            if not assignment_data:
                return Response(
                    {'detail': 'You do not have access to this assessment'},
                    status=status.HTTP_403_FORBIDDEN
                )

            assignment = assignment_data['assignment']
            # Get the athlete (the person taking the assessment)
            athlete = assignment.athlete

            # Get the assessment to validate question count
            try:
                assessment = Assessments.objects.get(id=assessment_id)
                total_questions = assessment.questions.count()
            except Assessments.DoesNotExist:
                return Response(
                    {'error': 'Assessment not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Validate all questions have been answered
            answered_questions = set()
            for response_data in responses_data:
                question_id = response_data.get('question')
                response_value = response_data.get('response')

                if question_id and response_value is not None:
                    answered_questions.add(question_id)

            # Check if all questions are answered
            if len(answered_questions) < total_questions:
                missing_count = total_questions - len(answered_questions)
                return Response(
                    {'error': f'Assessment incomplete. {missing_count} questions still need to be answered.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # All questions answered - trigger agents
            orchestrator = AgentOrchestrator()
            agent_responses = orchestrator.trigger_assessment_agents(athlete.id, assessment_id)

            # Mark assessment as submitted in PaymentAssignment
            now = timezone.now()
            if assignment.payment.product and assignment.payment.product.pre_assessment_id == assessment_id:
                assignment.pre_assessment_submitted = True
                assignment.pre_assessment_submitted_at = now
            elif assignment.payment.product and assignment.payment.product.post_assessment_id == assessment_id:
                assignment.post_assessment_submitted = True
                assignment.post_assessment_submitted_at = now

            assignment.save()

            return Response({
                'success': True,
                'message': 'Assessment completed successfully',
                'total_questions': total_questions,
                'questions_answered': len(answered_questions),
                'agents_triggered': len(agent_responses),
                'assessment_id': assessment_id
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to complete assessment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )





class QuestionResponsesViewSet(AutoAuthorViewSet):
    queryset = QuestionResponses.objects.all().order_by('id')
    serializer_class = QuestionResponsesSerializer
    permission_classes = [permissions.IsAuthenticated]
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




class PromptTemplatesViewSet(AutoAuthorViewSet):
    queryset = PromptTemplates.objects.all().order_by('id')
    serializer_class = PromptTemplatesSerializer
    permission_classes = [permissions.IsAuthenticated]


class AgentResponsesViewSet(AutoAuthorViewSet):
    serializer_class = AgentResponsesSerializer
    permission_classes = [AgentResponsePermission]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return AgentResponses.objects.none()

        return AgentResponses.objects.filter(
            Q(athlete=self.request.user) |
            Q(assignment__athlete=self.request.user) |
            Q(assignment__coaches=self.request.user) |
            Q(assignment__parents=self.request.user) |
            Q(assignment__payment__author=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        # Extract athlete from validated data
        athlete = serializer.validated_data.get('athlete')

        # Always query for valid PaymentAssignments - never trust payload
        assignments = None
        if athlete:
            assignment_data = self.request.assignment_service.get_for_athlete(athlete.id)
            assignments = assignment_data['assignment'] if assignment_data else None

        # Single save with author and assignment
        serializer.save(author=self.request.user, assignment=assignments)

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """
        Regenerate an agent response.
        POST /api/agent-responses/{id}/regenerate/
        Only for purposes: "curriculum", "lesson_plan"
        """
        try:
            agent_response = self.get_object()

            # Check if regeneration is allowed for this purpose
            allowed_purposes = ['curriculum', 'lesson_plan']
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

    @action(detail=True, methods=['post'])
    def regenerate_with_changes(self, request, pk=None):
        """
        Regenerate an agent response with change request and version history.
        POST /api/agent-responses/{id}/regenerate-with-changes/
        Body: {"change_request": "Make it more concise and add specific drill recommendations"}
        """
        try:
            agent_response = self.get_object()
            change_request = request.data.get('change_request', '')

            if not change_request:
                return Response(
                    {'error': 'change_request is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get all previous versions for same athlete/purpose/assessment
            previous_versions = AgentResponses.objects.filter(
                athlete=agent_response.athlete,
                purpose=agent_response.purpose,
                assessment=agent_response.assessment
            ).exclude(id=agent_response.id).order_by('-created_at')[:5]  # Limit to 5 most recent

            # Get coach from assignment
            coach = None
            if agent_response.assignment and agent_response.assignment.coaches.exists():
                coach = agent_response.assignment.coaches.first()

            # Prepare context data
            from .services.agent_completion_service import AgentCompletionService
            completion_service = AgentCompletionService()
            context_data = completion_service.prepare_context_data(
                agent_response.athlete,
                agent_response.assessment,
                agent_response.purpose,
                coach=coach
            )

            # Run iterative completion
            new_response = completion_service.run_iterative_completion(
                agent_response.prompt_template,
                agent_response.athlete,
                agent_response.assessment,
                context_data,
                previous_versions=list(previous_versions),
                change_request=change_request,
                coach=coach
            )

            if not new_response:
                return Response(
                    {'error': 'Failed to regenerate agent response with changes'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Serialize and return new response
            serializer = AgentResponsesSerializer(new_response)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': f'Failed to regenerate with changes: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def create_coach_content(self, request, pk=None):
        """
        Create CoachContent from AgentResponse.
        POST /api/agent-responses/{id}/create-coach-content/
        Body: {"title": "Custom Title", "privacy": "mentioned"}
        """
        try:
            agent_response = self.get_object()
            title = request.data.get('title', f"{agent_response.purpose.replace('_', ' ').title()} for {agent_response.athlete.get_full_name()}")
            privacy = request.data.get('privacy', 'mentioned')

            # Get assignment for the coach content
            assignment = agent_response.assignment

            # Create CoachContent
            from .models import CoachContent
            coach_content = CoachContent.objects.create(
                author=request.user,
                assignment=assignment,
                source_draft=agent_response,
                athlete=agent_response.athlete,
                title=title,
                body=agent_response.ai_response,  # Store as-is, will be converted to HTML in frontend
                purpose=agent_response.purpose,
                privacy=privacy
            )

            # Serialize and return
            serializer = CoachContentSerializer(coach_content)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': f'Failed to create coach content: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CoachContentViewSet(AutoAuthorViewSet):
    serializer_class = CoachContentSerializer
    permission_classes = [CoachContentPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title']

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return CoachContent.objects.none()

        return CoachContent.objects.filter(
            Q(athlete=self.request.user) |
            Q(assignment__athlete=self.request.user) |
            Q(assignment__coaches=self.request.user) |
            Q(assignment__parents=self.request.user) |
            Q(assignment__payment__author=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        # Always query for valid PaymentAssignments based on coach - never trust payload
        coach_assignments = self.request.assignment_service.get_by_role('coach')
        assignments = coach_assignments[0]['assignment'] if coach_assignments else None

        # Single save with author and assignment
        serializer.save(author=self.request.user, assignment=assignments)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """
        Publish CoachContent and optionally trigger next sequential agent.
        POST /api/coach-content/{id}/publish/
        Body: {"skip_trigger": false}  # optional, defaults to false
        """
        try:
            coach_content = self.get_object()
            skip_trigger = request.data.get('skip_trigger', False)
            
            # Set coach_delivered timestamp
            from django.utils import timezone
            coach_content.coach_delivered = timezone.now()
            coach_content.save()

            # Trigger athlete/parent notifications
            from .services.agent_orchestrator import AgentOrchestrator
            orchestrator = AgentOrchestrator()
            orchestrator.notify_content_published(coach_content)
            
            # Trigger next sequential agent if applicable
            next_agent_response = orchestrator.trigger_sequential_agent_from_published_content(
                coach_content, 
                skip_trigger=skip_trigger
            )
            
            # Return response
            response_data = {
                'content': CoachContentSerializer(coach_content).data
            }
            if next_agent_response:
                response_data['triggered_agent'] = AgentResponsesSerializer(next_agent_response).data
            
            return Response(response_data)

        except Exception as e:
            return Response(
                {'error': f'Failed to publish content: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def regenerate_draft(self, request, pk=None):
        """
        Regenerate the linked draft with change request.
        POST /api/coach-content/{id}/regenerate_draft/
        Body: {"change_request": "Add more detail about mental training techniques"}
        """
        try:
            coach_content = self.get_object()
            change_request = request.data.get('change_request', '')

            if not coach_content.source_draft:
                return Response(
                    {'error': 'No source draft linked to this content'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not change_request:
                return Response(
                    {'error': 'change_request is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get all previous versions for same athlete/purpose/assessment
            previous_versions = AgentResponses.objects.filter(
                athlete=coach_content.athlete,
                purpose=coach_content.purpose,
                assessment=coach_content.source_draft.assessment
            ).exclude(id=coach_content.source_draft.id).order_by('-created_at')[:5]

            # Get coach from assignment
            coach = None
            if coach_content.assignment and coach_content.assignment.coaches.exists():
                coach = coach_content.assignment.coaches.first()

            # Prepare context data
            from .services.agent_completion_service import AgentCompletionService
            completion_service = AgentCompletionService()
            context_data = completion_service.prepare_context_data(
                coach_content.athlete,
                coach_content.source_draft.assessment,
                coach_content.purpose,
                coach=coach
            )

            # Run iterative completion
            new_response = completion_service.run_iterative_completion(
                coach_content.source_draft.prompt_template,
                coach_content.athlete,
                coach_content.source_draft.assessment,
                context_data,
                previous_versions=list(previous_versions),
                change_request=change_request,
                coach=coach
            )

            if not new_response:
                return Response(
                    {'error': 'Failed to regenerate draft'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Update source_draft reference
            coach_content.source_draft = new_response
            coach_content.save()

            # Return both the new response and updated content
            response_serializer = AgentResponsesSerializer(new_response)
            content_serializer = CoachContentSerializer(coach_content)
            
            return Response({
                'new_response': response_serializer.data,
                'updated_content': content_serializer.data
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to regenerate draft: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def mark_athlete_received(self, request, pk=None):
        """
        Mark CoachContent as received by athlete.
        POST /api/coach-content/{id}/mark_athlete_received/
        """
        try:
            coach_content = self.get_object()
            
            # Only update if not already set
            if not coach_content.athlete_received:
                from django.utils import timezone
                coach_content.athlete_received = timezone.now()
                coach_content.save()

            # Serialize and return updated content
            serializer = CoachContentSerializer(coach_content)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': f'Failed to mark athlete received: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def mark_parent_received(self, request, pk=None):
        """
        Mark CoachContent as received by parent.
        POST /api/coach-content/{id}/mark_parent_received/
        """
        try:
            coach_content = self.get_object()
            
            # Only update if not already set
            if not coach_content.parent_received:
                from django.utils import timezone
                coach_content.parent_received = timezone.now()
                coach_content.save()

            # Serialize and return updated content
            serializer = CoachContentSerializer(coach_content)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': f'Failed to mark parent received: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SharesViewSet(AutoAuthorViewSet):
    queryset = Shares.objects.all().order_by('id')
    serializer_class = SharesSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['content__title']


class NotificationsViewSet(AutoAuthorViewSet):
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

class ProductsViewSet(AutoAuthorViewSet):
    queryset = Products.objects.filter(is_active=True).order_by('id')
    serializer_class = ProductsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description']
    filterset_fields = ['is_active', 'price']

class PaymentsViewSet(AutoAuthorViewSet):
    queryset = Payments.objects.all().order_by('-created_at')
    serializer_class = PaymentsSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['author__username', 'author__email', 'product__title']
    filterset_fields = ['status', 'product', 'author']

class PaymentAssignmentsViewSet(AutoAuthorViewSet):
    queryset = PaymentAssignments.objects.all().order_by('-created_at')
    serializer_class = PaymentAssignmentsSerializer
    permission_classes = [PaymentAssignmentPermission]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['athlete__username', 'athlete__email', 'payment__id']
    filterset_fields = ['athlete', 'coaches', 'parents']

    def get_queryset(self):
        """
        Filter assignments to only show those the user has access to.
        """
        if not self.request.user.is_authenticated:
            return PaymentAssignments.objects.none()

        # Regular users can only see assignments they're part of
        return PaymentAssignments.objects.filter(
            Q(athlete=self.request.user) |
            Q(coaches=self.request.user) |
            Q(parents=self.request.user) |
            Q(payment__author=self.request.user)
        ).distinct()

    def update(self, request, *args, **kwargs):
        """
        Override update to add submission status validation.
        """
        instance = self.get_object()

        # Check if any assessment is submitted
        if instance.pre_assessment_submitted or instance.post_assessment_submitted:
            return Response(
                {'error': 'Cannot modify assignment after assessment submission'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update to add submission status validation.
        """
        instance = self.get_object()

        # Check if any assessment is submitted
        if instance.pre_assessment_submitted or instance.post_assessment_submitted:
            return Response(
                {'error': 'Cannot modify assignment after assessment submission'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to prevent deletion of entire assignments.
        """
        return Response(
            {'error': 'Cannot delete payment assignments. Only field modifications are allowed.'},
            status=status.HTTP_403_FORBIDDEN
        )


class CoachSearchView(APIView):
    """
    Search for coaches by name or email within an organization.
    Returns users with coach role that match the search term.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search_term = request.query_params.get('q', '').strip()
        organization_id = request.query_params.get('organization')

        if not search_term:
            return Response({'results': []})

        # Base queryset for users with coach role
        queryset = Users.objects.filter(
            groups__name__in=['coach', 'Coach']  # Assuming coach role is in groups
        ).distinct()

        # Filter by organization if provided
        if organization_id:
            # Assuming there's an organization relationship
            # This might need adjustment based on your organization model
            queryset = queryset.filter(
                # Add organization filter here based on your model structure
            )

        # Search in username, email, first_name, last_name
        queryset = queryset.filter(
            Q(username__icontains=search_term) |
            Q(email__icontains=search_term) |
            Q(first_name__icontains=search_term) |
            Q(last_name__icontains=search_term)
        )[:20]  # Limit results

        # Serialize results
        results = []
        for user in queryset:
            results.append({
                'id': user.id,
                'str': user.get_full_name() or user.username,
                '_type': 'Users',
                'img': user.photo.url if user.photo else None
            })

        return Response({'results': results})


"""
Payment Assignments will always be from a distinct spread of Products to making merging them ok
"""
class CurrentContextView(APIView):
    """
    Returns current organization (by subdomain), user membership, and payment assignments.
    Accessible by authenticated and anonymous users.
    Organization data is always public; membership and payments require authentication.
    """

    permission_classes = []  # Allow anonymous access for organization data


    def get(self, request):
        context_data = {}

        # Extract subdomain and get organization (public data)
        subdomain = get_subdomain_from_request(request)
        try:
            org = Organizations.objects.get(slug=subdomain, is_active=True)
            context_data['organization'] = {
                'id': org.id,
                'name': org.name,
                'short_name': org.short_name,
                'slug': org.slug,
                'is_active': org.is_active,
                'logo': org.logo.url if org.logo else None,
                'custom_logo_base64': org.custom_logo_base64,
                'branding_palette': org.branding_palette,
                'branding_typography': org.branding_typography,
                'contact_email': org.contact_email,
                'contact_phone': org.contact_phone
            }
        except Organizations.DoesNotExist:
            context_data['organization'] = None  # WARN should never happen!

        # Get user's membership in this organization (user-specific)
        context_data['membership'] = None
        if request.user.is_authenticated and context_data.get('organization'):
            organization = context_data['organization']
            if organization:  # Check if organization is not None
                try:
                    membership = UserOrganizations.objects.select_related('organization').prefetch_related('groups').get(
                        user=request.user,
                        organization_id=organization['id'],
                        is_active=True
                    )
                    context_data['membership'] = {
                        'id': membership.id,
                        'groups': list(membership.groups.values_list('name', flat=True)),
                        'joined_at': membership.joined_at.isoformat(),
                        'is_active': membership.is_active
                    }
                except UserOrganizations.DoesNotExist:
                    pass

        # Get payment assignments (user-specific, filtered by organization)
        context_data['payment_assignments'] = []
        if request.user.is_authenticated and context_data.get('organization'):
            all_assignments_data = request.assignment_service.get_all()

            by_athlete = {}

            for assignment_data in all_assignments_data:

                assignment = assignment_data['assignment']
                athlete_id = assignment.athlete.id

                athlete_relentity = {
                    'id': athlete_id,
                    'str': str(assignment.athlete),
                    '_type': 'Users',
                    'img': assignment.athlete.photo.url if assignment.athlete.photo else None
                } if assignment.athlete else None

                if athlete_id not in by_athlete:
                    by_athlete[athlete_id] = {
                        'assignments': [],
                        'my_roles': assignment_data['my_roles'],
                        'athlete': athlete_relentity,
                        'coaches': [],
                        'parents': [],
                        'pre_assessment_submitted_at': None,
                        'post_assessment_submitted_at': None,
                        'pre_assessment': None,
                        'post_assessment': None,
                        'payments': [],
                        # Track IDs for efficient deduplication
                        '_coach_ids': set(),
                        '_parent_ids': set(),
                        'agent_progress': {
                            "lesson_plan": None,  # null or RelEntity<AgentResponses> where purpose == lesson_plan and matching org + AgentResponses.payment_assignment.athelete 
                            "feedback_report": None, # null  or RelEntity<AgentResponses> where purpose == feedback_report  and matching org + AgentResponses.payment_assignment.athelete 
                            "talking_points": None, # null or RelEntity<AgentResponses>  where purpose == talking_points  and matching org + AgentResponses.payment_assignment.athelete 
                            "scheduling_email": None, # null or RelEntity<AgentResponses>  where purpose == scheduling_email  and matching org + AgentResponses.payment_assignment.athelete 
                            "curriculum": None,  # null or RelEntity<AgentResponses> where purpose == curriculum  and matching org + AgentResponses.payment_assignment.athelete 
                        },
                        "content_progress": {
                            "lesson_plan": None, # or RelEntity<CoachContent> where purpose == lesson_plan  and matching org + CoachContent.payment_assignment.athelete 
                            "feedback_report": None, # or RelEntity<CoachContent> where purpose == feedback_report  and matching org + CoachContent.payment_assignment.athelete 
                            "talking_points": None, # or RelEntity<CoachContent> where purpose == talking_points  and matching org + CoachContent.payment_assignment.athelete 
                            "scheduling_email": None, # or RelEntity<CoachContent> where purpose == scheduling_email  and matching org + CoachContent.payment_assignment.athelete 
                            "curriculum": None, # or RelEntity<CoachContent> where purpose == curriculum  and matching org + CoachContent.payment_assignment.athelete 
                        }
                    }

                   
                by_athlete[athlete_id]['assignments'].append({
                    'id': assignment.id,
                    'str': str(assignment.payment.product), 
                    '_type': 'PaymentAssignments'
                })

                
                # Add coaches with deduplication
                for coach in assignment.coaches.all():
                    if coach.id not in by_athlete[athlete_id]['_coach_ids']:
                        coach_relentity = {
                            'id': coach.id,
                            'str': str(coach),
                            '_type': 'Users',
                            'img': coach.photo.url if coach.photo else None
                        }
                        by_athlete[athlete_id]['coaches'].append(coach_relentity)
                        by_athlete[athlete_id]['_coach_ids'].add(coach.id)
                
                # Add parents with deduplication
                for parent in assignment.parents.all():
                    if parent.id not in by_athlete[athlete_id]['_parent_ids']:
                        parent_relentity = {
                            'id': parent.id,
                            'str': str(parent),
                            '_type': 'Users',
                            'img': parent.photo.url if parent.photo else None
                        }
                        by_athlete[athlete_id]['parents'].append(parent_relentity)
                        by_athlete[athlete_id]['_parent_ids'].add(parent.id)

                if assignment.pre_assessment_submitted_at:
                    by_athlete[athlete_id]['pre_assessment_submitted_at'] = assignment.pre_assessment_submitted_at.isoformat()
                if assignment.post_assessment_submitted_at:
                    by_athlete[athlete_id]['post_assessment_submitted_at'] = assignment.post_assessment_submitted_at.isoformat()
                    
                if assignment.payment.product and assignment.payment.product.post_assessment:
                    by_athlete[athlete_id]['post_assessment'] = {
                        'id': assignment.payment.product.post_assessment.id,
                        'str': str(assignment.payment.product.post_assessment),
                        '_type': 'Assessments'
                    }
                    
                if assignment.payment.product and assignment.payment.product.pre_assessment:
                    by_athlete[athlete_id]['pre_assessment'] = {
                        'id': assignment.payment.product.pre_assessment.id,
                        'str': str(assignment.payment.product.pre_assessment),
                        '_type': 'Assessments'
                    }

                    allpurposes = ['lesson_plan', 'curriculum', 'talking_points', 'feedback_report', 'scheduling_email']
                    for purpose in allpurposes:
                        obj_list = CoachContent.objects.filter(
                            Q(purpose=purpose) & 
                            Q(assignment=assignment.id)
                            )
                        if obj_list:
                            by_athlete[athlete_id]['content_progress'][purpose] = []
                            for obj in obj_list:
                                by_athlete[athlete_id]['content_progress'][purpose].append({
                                    'id': obj.id,
                                    'str': str(obj),
                                    '_type': 'CoachContent',
                                    'entity': {
                                        'purpose': purpose,
                                        'created_at': obj.created_at.isoformat(),
                                        'modified_at': obj.modified_at.isoformat(),
                                        'coach_delivered': obj.coach_delivered.isoformat() if obj.coach_delivered else None,
                                        'athlete_received': obj.athlete_received.isoformat() if obj.athlete_received else None,
                                        'parent_received': obj.parent_received.isoformat() if obj.parent_received else None,
                                        'screenshot_light': obj.screenshot_light.url if obj.screenshot_light else None,
                                        'screenshot_dark': obj.screenshot_dark.url if obj.screenshot_dark else None,
                                    }
                                })

                    for purpose in allpurposes:
                        obj_list = AgentResponses.objects.filter(
                            Q(purpose=purpose) & 
                            Q(assignment=assignment.id)
                            )
                        if obj_list:
                            by_athlete[athlete_id]['agent_progress'][purpose] = []
                            for obj in obj_list:
                                by_athlete[athlete_id]['agent_progress'][purpose].append({
                                    'id': obj.id,
                                    'str': str(obj),
                                    '_type': 'AgentResponses',
                                    'entity': {
                                        'purpose': purpose,
                                        'created_at': obj.created_at.isoformat(),
                                        'modified_at': obj.modified_at.isoformat(),
                                    }
                                })

                    
                if assignment.payment.product:
                    payment_data = {
                        'id': assignment.payment.id,
                        'status': assignment.payment.status,
                        'subscription_ends': assignment.payment.subscription_ends.isoformat() if assignment.payment.subscription_ends else None,
                        'product': {
                            'id': assignment.payment.product.id,
                            'str': str(assignment.payment.product),
                            '_type': 'Products'
                        }
                    }
                    
                    # Add author if available
                    if assignment.payment.author:
                        payment_data['author'] = {
                            'id': assignment.payment.author.id,
                            'str': str(assignment.payment.author),
                            '_type': 'Users',
                            'img': assignment.payment.author.photo.url if assignment.payment.author.photo else None
                        }
                    
                    by_athlete[athlete_id]['payments'].append(payment_data)

            # Clean up tracking sets before returning data
            for athlete_data in by_athlete.values():
                athlete_data.pop('_coach_ids', None)
                athlete_data.pop('_parent_ids', None)
            
            context_data['payment_assignments'] = by_athlete.values()

        response = Response(context_data, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response
