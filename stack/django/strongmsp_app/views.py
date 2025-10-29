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
        from utils.helpers import get_subdomain_from_request
        organization_slug = get_subdomain_from_request(request)
        now = timezone.now().date()
        
        assignment = PaymentAssignments.objects.filter(
            Q(athlete=request.user) |
            Q(coaches=request.user) |
            Q(parents=request.user) |
            Q(payment__author=request.user),
            payment__organization__slug=organization_slug,
            payment__status='succeeded',
            payment__product__is_active=True,
            payment__product__pre_assessment_id=assessment_id
        ).filter(
            Q(payment__subscription_ends__isnull=True) |
            Q(payment__subscription_ends__gte=now)
        ).select_related('athlete').first()

        if not assignment:
            return Response(
                {'detail': 'You do not have access to this assessment'},
                status=status.HTTP_403_FORBIDDEN
            )

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
            from utils.helpers import get_subdomain_from_request
            organization_slug = get_subdomain_from_request(request)
            now = timezone.now().date()
            
            assignment = PaymentAssignments.objects.filter(
                Q(athlete=request.user) |
                Q(coaches=request.user) |
                Q(parents=request.user) |
                Q(payment__author=request.user),
                payment__organization__slug=organization_slug,
                payment__status='succeeded',
                payment__product__is_active=True,
                payment__product__pre_assessment_id=assessment_id
            ).filter(
                Q(payment__subscription_ends__isnull=True) |
                Q(payment__subscription_ends__gte=now)
            ).select_related('athlete').first()

            if not assignment:
                return Response(
                    {'detail': 'You do not have access to this assessment'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get the athlete, organization, and coach (already have payment relationship from assignment)
            athlete = assignment.athlete
            organization = assignment.payment.organization
            
            if not athlete:
                return Response(
                    {'error': 'No athlete found for this assignment'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not organization:
                return Response(
                    {'error': 'No organization found for this payment'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get coach from assignment
            coach = None
            if assignment.coaches.exists():
                coach = assignment.coaches.first()
            
            if not coach:
                return Response(
                    {'error': 'No coach assigned to this athlete'},
                    status=status.HTTP_400_BAD_REQUEST
                )

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

            # All questions answered - trigger agents with full context
            orchestrator = AgentOrchestrator()
            agent_responses = orchestrator.trigger_assessment_agents(
                athlete=athlete,
                assessment=assessment,
                organization=organization,
                assignment=assignment,
                coach=coach
            )

            # Mark assessment as submitted in all PaymentAssignments for this athlete and assessment
            now = timezone.now()
            
            # Find all assignments for this athlete and assessment
            all_assignments = PaymentAssignments.objects.filter(
                athlete=athlete,
                payment__organization=assignment.payment.organization,
                payment__status='succeeded',
                payment__product__is_active=True
            ).select_related(
                'payment',
                'payment__product'
            )
            
            updated_count = 0
            for assignment_to_update in all_assignments:
                if (assignment_to_update.payment.product and 
                    assignment_to_update.payment.product.pre_assessment_id == assessment_id):
                    assignment_to_update.pre_assessment_submitted_at = now
                    assignment_to_update.save()
                    updated_count += 1
                elif (assignment_to_update.payment.product and 
                      assignment_to_update.payment.product.post_assessment_id == assessment_id):
                    assignment_to_update.post_assessment_submitted_at = now
                    assignment_to_update.save()
                    updated_count += 1

            return Response({
                'success': True,
                'message': 'Assessment completed successfully',
                'total_questions': total_questions,
                'questions_answered': len(answered_questions),
                'agents_triggered': len(agent_responses),
                'assignments_updated': updated_count,
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

            # Validate athlete has assignment and get organization
            from django.utils import timezone
            from django.db.models import Q
            from utils.helpers import get_subdomain_from_request
            
            organization_slug = get_subdomain_from_request(request)
            now = timezone.now().date()
            
            assignment = PaymentAssignments.objects.filter(
                athlete_id=athlete_id,
                payment__organization__slug=organization_slug,
                payment__status='succeeded',
                payment__product__is_active=True
            ).filter(
                Q(payment__subscription_ends__isnull=True) |
                Q(payment__subscription_ends__gte=now)
            ).select_related('payment__organization', 'athlete').first()
            
            if not assignment:
                return Response(
                    {'error': 'No valid assignment found for this athlete'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get the full objects
            athlete = assignment.athlete
            organization = assignment.payment.organization
            
            if not athlete:
                return Response(
                    {'error': 'No athlete found for this assignment'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not organization:
                return Response(
                    {'error': 'No organization found for this payment'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get coach from assignment
            coach = None
            if assignment.coaches.exists():
                coach = assignment.coaches.first()
            
            if not coach:
                return Response(
                    {'error': 'No coach assigned to this athlete'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get assessment
            try:
                assessment = Assessments.objects.get(id=assessment_id)
            except Assessments.DoesNotExist:
                return Response(
                    {'error': 'Assessment not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Trigger agents
            orchestrator = AgentOrchestrator()
            agent_responses = orchestrator.trigger_assessment_agents(
                athlete=athlete,
                assessment=assessment,
                organization=organization,
                assignment=assignment,
                coach=coach
            )

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

        from utils.helpers import get_subdomain_from_request
        organization_slug = get_subdomain_from_request(self.request)

        return AgentResponses.objects.filter(
            Q(athlete=self.request.user) |
            Q(assignment__athlete=self.request.user) |
            Q(assignment__coaches=self.request.user) |
            Q(assignment__parents=self.request.user) |
            Q(assignment__payment__author=self.request.user),
            assignment__organization__slug=organization_slug
        ).distinct()

    def perform_create(self, serializer):
        # Extract athlete from validated data
        athlete = serializer.validated_data.get('athlete')

        # Always query for valid PaymentAssignments - never trust payload
        assignments = None
        if athlete:
            from utils.helpers import get_subdomain_from_request
            organization_slug = get_subdomain_from_request(self.request)
            now = timezone.now().date()
            
            assignments = PaymentAssignments.objects.filter(
                Q(athlete=self.request.user) |
                Q(coaches=self.request.user) |
                Q(parents=self.request.user) |
                Q(payment__author=self.request.user),
                athlete_id=athlete.id,
                payment__organization__slug=organization_slug,
                payment__status='succeeded',
                payment__product__is_active=True
            ).filter(
                Q(payment__subscription_ends__isnull=True) |
                Q(payment__subscription_ends__gte=now)
            ).first()

            if not assignments:
                return Response(
                    {'error': 'No assignments found for this athlete'},
                    status=status.HTTP_400_BAD_REQUEST
                )

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
            
            if not agent_response.assignment:
                return Response(
                    {'error': 'No assignment found for this agent response'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not agent_response.assessment:
                return Response(
                    {'error': 'No assessment found for this agent response'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            organization = agent_response.assignment.payment.organization if agent_response.assignment else None
            
            # Get coach from assignment
            coach = None
            if agent_response.assignment and agent_response.assignment.coaches.exists():
                coach = agent_response.assignment.coaches.first()
            
            if not coach:
                return Response(
                    {'error': 'No coach assigned to this athlete'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            new_response = orchestrator.trigger_sequential_agent(
                agent_response.purpose,
                athlete=agent_response.athlete,
                assessment=agent_response.assessment,
                organization=organization,
                assignment=agent_response.assignment,
                coach=coach
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

            subdomain = get_subdomain_from_request(request)

            # Get all previous versions for same athlete/purpose/assessment
            previous_versions = AgentResponses.objects.filter(
                athlete=agent_response.athlete,
                purpose=agent_response.purpose,
                assessment=agent_response.assessment,
                assignment__organization__slug=subdomain
            ).exclude(id=agent_response.id).order_by('-created_at').first()  # Get most recent previous version

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
                coach=coach,
                organization=agent_response.assignment.payment.organization if agent_response.assignment else None
            )
            
            # Ensure assignment is in context_data (required for completion service)
            context_data['assignment'] = agent_response.assignment

            # Run iterative completion
            new_response = completion_service.run_iterative_completion(
                agent_response.prompt_template,
                agent_response.athlete,
                agent_response.assessment,
                context_data,
                previous_versions=[previous_versions] if previous_versions else [],
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
        try:
            # Get the validated data from serializer
            validated_data = serializer.validated_data
            
            # Query for assignment by ID from payload
            if 'assignment' not in validated_data or not validated_data['assignment']:
                raise ValueError("Assignment ID is required in payload")
            
            assignment_id = validated_data['assignment']
            assignment = PaymentAssignments.objects.filter(id=assignment_id).first()
            
            if not assignment:
                raise ValueError(f"Assignment with ID {assignment_id} not found")
            
            # Validate that the current user is a coach for this assignment
            if not assignment.coaches.filter(id=self.request.user.id).exists():
                raise ValueError("Current user is not a coach for this assignment")
            
            # Validate that athlete from assignment matches payload athlete (if provided)
            if 'athlete' in validated_data and validated_data['athlete']:
                payload_athlete = validated_data['athlete']
                if assignment.athlete != payload_athlete:
                    raise ValueError("Athlete in payload does not match assignment athlete")
            
            # Single save with author and assignment
            serializer.save(author=self.request.user, assignment=assignment)
            
        except Exception as e:
            # Log the error and re-raise with a more user-friendly message
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in CoachContentViewSet.perform_create: {str(e)}")
            raise ValueError(f"Failed to create coach content: {str(e)}")

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to automatically include athlete category scores in subfields.
        """
        # Build list of category fields to add
        category_fields = [
            'category_performance_mindset',
            'category_emotional_regulation',
            'category_confidence',
            'category_resilience_motivation',
            'category_concentration',
            'category_leadership',
            'category_mental_wellbeing'
        ]
        
        # Get existing subfields
        existing_subfields = list(request.query_params.getlist('subfields', []))
        
        # Add category fields if not already present
        updated_subfields = existing_subfields + [f for f in category_fields if f not in existing_subfields]
        
        # Temporarily modify request.query_params to include the category fields
        if updated_subfields != existing_subfields:
            # Patch the _request.GET to include our subfields
            from django.http import QueryDict
            
            # Create a new mutable QueryDict
            mutable_params = QueryDict(mutable=True)
            
            # Copy all existing params except subfields
            for key in request.query_params:
                if key != 'subfields':
                    for value in request.query_params.getlist(key):
                        mutable_params.appendlist(key, value)
            
            # Add all subfields including category fields
            for subfield in updated_subfields:
                mutable_params.appendlist('subfields', subfield)
            
            # Temporarily replace GET params
            original_get = request._request.GET
            request._request.GET = mutable_params
        
        try:
            # Call parent retrieve
            return super().retrieve(request, *args, **kwargs)
        finally:
            # Restore original GET params
            if updated_subfields != existing_subfields:
                request._request.GET = original_get

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

            subdomain = get_subdomain_from_request(request)
            organization = Organizations.objects.get(slug=subdomain)

            # Get all previous versions for same athlete/purpose/assessment
            previous_versions = AgentResponses.objects.filter(
                athlete=coach_content.athlete,
                purpose=coach_content.purpose,
                assignment=coach_content.assignment,
                assignment__organization__slug=subdomain
            ).order_by('-created_at').first()

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
                coach,
                coach_content,
                organization
            )

            # Run iterative completion
            new_response = completion_service.run_iterative_completion(
                coach_content.source_draft.prompt_template,
                coach_content.athlete,
                coach_content.source_draft.assessment,
                context_data,
                previous_versions,
                change_request,
                coach
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

        # All authenticated users can see notifications
        # They will only see notifications for assignments they're part of (handled by the notification creation logic)
        return Notifications.objects.filter(recipient=user)

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

SERIALZE_MODEL_MAP = { "Users": UsersSerializer,"Assessments": AssessmentsSerializer,"QuestionResponses": QuestionResponsesSerializer,"PromptTemplates": PromptTemplatesSerializer,"AgentResponses": AgentResponsesSerializer,"CoachContent": CoachContentSerializer,"Shares": SharesSerializer }

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

    def create(self, request, *args, **kwargs):
        """
        Override create to handle validation errors gracefully.
        """
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            # Handle unique constraint violations and validation errors
            if 'unique_athlete_assessment_org' in str(e) or 'already has an assignment' in str(e):
                return Response(
                    {'error': 'This athlete already has an assignment for this assessment in this organization.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Re-raise other exceptions
            raise

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
                    membership = UserOrganizations.objects.select_related('organization').get(
                        user=request.user,
                        organization_id=organization['id'],
                        is_active=True
                    )
                    
                    # Calculate roles based on PaymentAssignments
                    roles = []
                    
                    # Query PaymentAssignments to determine user's roles in this organization
                    assignments = PaymentAssignments.objects.filter(
                        Q(athlete=request.user) |
                        Q(coaches=request.user) |
                        Q(parents=request.user) |
                        Q(payment__author=request.user)
                    ).filter(
                        payment__product__product_organizations__organization_id=organization['id']
                    ).distinct()
                    
                    # Check which roles the user has
                    if assignments.filter(athlete=request.user).exists():
                        roles.append('athlete')
                    if assignments.filter(coaches=request.user).exists():
                        roles.append('coach')
                    if assignments.filter(parents=request.user).exists():
                        roles.append('parent')
                    if assignments.filter(payment__author=request.user).exists():
                        roles.append('payer')
                    
                    context_data['membership'] = {
                        'id': membership.id,
                        'roles': roles,
                        'joined_at': membership.joined_at.isoformat(),
                        'is_active': membership.is_active
                    }

                except UserOrganizations.DoesNotExist:
                    pass

        response = Response(context_data, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response


class AthleteAssignmentsListView(APIView):
    """
    Returns paginated athlete assignments with filtering support.
    Accessible by authenticated users only.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        GET /api/athlete-assignments/
        
        Query parameters:
            - limit: Maximum number of results (optional)
            - offset: Number of results to skip (optional)
            - pre_assessment_submitted: Filter by pre-assessment status (true/false, optional)
            - sort_by: Sort order (newest, oldest, most_confident, least_confident, default, optional)
        """
        # Extract query parameters
        limit = request.query_params.get('limit', None)
        offset = request.query_params.get('offset', None)
        pre_assessment_submitted_param = request.query_params.get('pre_assessment_submitted', None)
        sort_by_param = request.query_params.get('sort_by', None)
        
        # Parse limit and offset
        try:
            limit = int(limit) if limit else None
        except (ValueError, TypeError):
            limit = None
            
        try:
            offset = int(offset) if offset else None
        except (ValueError, TypeError):
            offset = None
        
        # Parse pre_assessment_submitted filter
        pre_assessment_submitted = None
        if pre_assessment_submitted_param is not None:
            if pre_assessment_submitted_param.lower() == 'true':
                pre_assessment_submitted = True
            elif pre_assessment_submitted_param.lower() == 'false':
                pre_assessment_submitted = False
        
        # Parse sort_by parameter - map UI values to internal values
        
        # Get paginated results
        assignments_response = request.assignment_service.get_all_paginated(
            limit=limit,
            offset=offset,
            pre_assessment_submitted=pre_assessment_submitted,
            sort_by=sort_by_param
        )
        
        # Format response
        response_data = {
            'results': assignments_response['results'],
            'count': assignments_response['count'],
            'limit': assignments_response.get('limit'),
            'offset': assignments_response.get('offset'),
        }
        
        response = Response(response_data, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response
