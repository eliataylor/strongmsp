"""
Agent Completion Service

Handles OpenAI completions for agent responses using the Completions API (non-streaming).
"""
import json
import openai
from django.conf import settings
from openai import OpenAIError
import logging

from ..models import AgentResponses, PromptTemplates, PaymentAssignments
from .confidence_analyzer import ConfidenceAnalyzer
from .agentic_context_builder import AgenticContextBuilder

logger = logging.getLogger(__name__)


class AgentCompletionService:
    """
    Service for running OpenAI completions for agent responses.
    """
    
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=settings.OPENAI_API_KEY, 
            max_retries=5, 
            timeout=300
        )
    
    def get_assignment_for_assessment(self, athlete, assessment, organization=None):
        """
        Get the PaymentAssignment for the given athlete and assessment.
        
        Args:
            athlete: User instance (athlete)
            assessment: Assessments instance
            organization: Organization instance to filter by (optional but recommended)
            
        Returns:
            PaymentAssignments instance or None
        """
        try:
            from django.db.models import Q
            from django.utils import timezone
            
            now = timezone.now().date()
            
            # Query for assignment where athlete has access to this assessment
            filter_kwargs = {
                'athlete': athlete,
                'payment__status': 'succeeded',
                'payment__product__is_active': True
            }
            
            # Filter by organization if provided (prevents cross-organization data leak)
            if organization:
                filter_kwargs['payment__organization'] = organization
            
            assignment = PaymentAssignments.objects.filter(
                **filter_kwargs
            ).filter(
                Q(payment__subscription_ends__isnull=True) |
                Q(payment__subscription_ends__gte=now)
            ).filter(
                Q(payment__product__pre_assessment_id=assessment.id) |
                Q(payment__product__post_assessment_id=assessment.id)
            ).first()
            
            return assignment
            
        except Exception as e:
            logger.error(f"Error getting assignment for athlete {athlete.id} and assessment {assessment.id}: {e}")
            return None
    
    def run_completion(self, prompt_template, athlete, assessment, context_data):
        """
        Run OpenAI completion using AgenticContextBuilder.
        
        Args:
            prompt_template: PromptTemplates instance
            athlete: User instance (athlete)
            assessment: Assessments instance
            context_data: Dict with context information (must include 'assignment', 'organization', and 'coach')
            
        Returns:
            AgentResponses instance
        """
        try:
            # Get the assignment from context (should be pre-queried in views)
            assignment = context_data.get('assignment')
            if not assignment:
                raise ValueError(f"No assignment provided in context_data for athlete {athlete.id} and assessment {assessment.id}")
            
            # Get coach for author field (AI-generated content should have coach as author)
            coach = context_data.get('coach')
            if not coach:
                raise ValueError(f"No coach provided in context_data for athlete {athlete.id} and assessment {assessment.id}")
            
            # Initialize context builder
            context_builder = AgenticContextBuilder()
            
            # Add core contexts
            context_builder.add_athlete_context(athlete)
            context_builder.add_assessment_context(assessment)
            context_builder.add_template_instructions(prompt_template)
            
            # Add coach context
            if context_data.get('coach'):
                context_builder.add_coach_context(context_data['coach'])
            
            # Add assessment data for initial agents
            if context_data.get('assessment_responses'):
                context_builder.add_assessment_responses(context_data['assessment_responses'])
            
            if context_data.get('assessment_aggregated'):
                context_builder.add_assessment_aggregated(context_data['assessment_aggregated'])
            
            # Add published content for sequential agents
            if context_data.get('published_content'):
                published = context_data['published_content']
                context_builder.add_published_coach_content(published)
            
            # Build messages
            messages = context_builder.build_messages()
            
            # Prepare completion request
            completion_kwargs = {
                'model': prompt_template.model or 'gpt-4o-mini',
                'messages': messages,
                'max_tokens': 4000,
                'temperature': 0.7
            }
            
            # Add response format if specified
            if prompt_template.response_format == 'json':
                completion_kwargs['response_format'] = {'type': 'json_object'}
            
            # Run completion
            response = self.client.chat.completions.create(**completion_kwargs)
            
            # Extract response content
            ai_response = response.choices[0].message.content
            ai_reasoning = None
            
            # Try to extract reasoning if available
            if hasattr(response.choices[0].message, 'reasoning'):
                ai_reasoning = response.choices[0].message.reasoning
            
            # Get processed prompt for storage (with tokens replaced)
            processed_prompt = context_builder.replace_template_tokens(prompt_template.prompt)
            
            # Create AgentResponse record
            # Author must be coach (content creator), no fallback
            agent_response = AgentResponses.objects.create(
                author=coach,
                athlete=athlete,
                assessment=assessment,
                assignment=assignment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=processed_prompt,
                ai_response=ai_response,
                ai_reasoning=ai_reasoning
            )
            
            logger.info(f"Successfully created agent response {agent_response.id} for athlete {athlete.id}")
            logger.debug(f"Context builder debug info: {context_builder.get_debug_info()}")
            return agent_response
            
        except OpenAIError as e:
            logger.error(f"OpenAI API error: {e}")
            # Create error response
            processed_prompt = prompt_template.prompt
            try:
                context_builder = AgenticContextBuilder()
                context_builder.add_athlete_context(athlete)
                context_builder.add_assessment_context(assessment)
                processed_prompt = context_builder.replace_template_tokens(prompt_template.prompt)
            except:
                pass  # Use original prompt if context building fails
            
            # Get assignment and coach from context for error response
            assignment = context_data.get('assignment')
            if not assignment:
                logger.error(f"No assignment in context for error response: athlete {athlete.id}, assessment {assessment.id}")
                raise ValueError(f"No assignment available for error response")
            
            coach = context_data.get('coach')
            if not coach:
                logger.error(f"No coach in context for error response: athlete {athlete.id}, assessment {assessment.id}")
                raise ValueError(f"Cannot create error response without coach")
            
            agent_response = AgentResponses.objects.create(
                author=coach,
                athlete=athlete,
                assessment=assessment,
                assignment=assignment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=processed_prompt,
                ai_response="",
                ai_reasoning=f"OpenAI API Error: {str(e)}"
            )
            return agent_response
            
        except Exception as e:
            logger.error(f"Unexpected error in completion: {e}")
            # Create error response
            # Get assignment and coach from context
            assignment = context_data.get('assignment')
            if not assignment:
                logger.error(f"No assignment in context for error response: athlete {athlete.id}, assessment {assessment.id}")
                # Cannot create error response without assignment
                raise ValueError(f"Cannot create error response without assignment")
            
            coach = context_data.get('coach')
            if not coach:
                logger.error(f"No coach in context for error response: athlete {athlete.id}, assessment {assessment.id}")
                raise ValueError(f"Cannot create error response without coach")
            
            agent_response = AgentResponses.objects.create(
                author=coach,
                athlete=athlete,
                assessment=assessment,
                assignment=assignment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=prompt_template.prompt,
                ai_response="",
                ai_reasoning=f"Unexpected Error: {str(e)}"
            )
            return agent_response
    
    def prepare_context_data(self, athlete, assessment, purpose, coach=None, published_content=None, organization=None):
        """
        Prepare context data for agent completion based on purpose.
        
        Args:
            athlete: User instance (athlete)
            assessment: Assessments instance
            purpose: Agent purpose (feedback_report, curriculum, lesson_plan, etc.)
            coach: User instance (coach) - optional, will be queried if not provided
            published_content: CoachContent instance - for sequential agents
            organization: Organization instance - for proper assignment filtering
            
        Returns:
            Dict with semantic keys for context builder
        """
        context_data = {}
        
        # Store organization if provided
        context_data['organization'] = organization
        
        assignment = self.get_assignment_for_assessment(athlete, assessment, organization)
        if assignment and assignment.coaches.exists():
            coach = assignment.coaches.first()        
            context_data['coach'] = coach

        context_data['assignment'] = assignment

        # Initial agents need assessment data
        if purpose in ['feedback_report', 'talking_points', 'scheduling_email']:
            context_data['assessment_responses'] = ConfidenceAnalyzer.get_question_responses_data(
                athlete.id, assessment.id if assessment else None
            )
            context_data['assessment_aggregated'] = ConfidenceAnalyzer.get_spider_chart_data(
                athlete.id, assessment.id if assessment else None
            )
        
        # Sequential agents need published content
        elif purpose in ['curriculum', 'lesson_plan']:
            if published_content:
                context_data['published_content'] = published_content
            else:
                # Query most recent published content for the required purpose
                from ..models import CoachContent
                required_purpose_map = {
                    'curriculum': 'feedback_report',
                    'lesson_plan': 'curriculum',
                }
                required_purpose = required_purpose_map.get(purpose)
                if required_purpose:
                    published = CoachContent.objects.filter(
                        athlete=athlete,
                        purpose=required_purpose,
                        coach_delivered__isnull=False
                    ).order_by('-coach_delivered').first()
                    context_data['published_content'] = published
        
        return context_data
    
    def run_iterative_completion(self, prompt_template, athlete, assessment, context_data, previous_versions=None, change_request=None, coach=None):
        """
        Run OpenAI completion with version history and change request context.
        
        Args:
            prompt_template: PromptTemplates instance
            athlete: User instance (athlete)
            assessment: Assessments instance
            context_data: Dict with context information
            previous_versions: List of AgentResponses instances (optional)
            change_request: String with coach's change request (optional)
            coach: User instance (coach) (optional)
            
        Returns:
            AgentResponses instance
        """
        try:
            # Get the assignment from context (should be pre-queried)
            assignment = context_data.get('assignment')
            if not assignment:
                raise ValueError(f"No assignment provided in context_data for athlete {athlete.id} and assessment {assessment.id}")
            
            # Get coach for author field
            agent_coach = coach if coach else context_data.get('coach')
            if not agent_coach:
                raise ValueError(f"No coach provided for iterative completion: athlete {athlete.id} and assessment {assessment.id}")
            
            # Initialize context builder
            context_builder = AgenticContextBuilder()
            
            # Add standard contexts
            context_builder.add_athlete_context(athlete)
            context_builder.add_assessment_context(assessment)
            context_builder.add_template_instructions(prompt_template)
            
            # Add coach context
            if coach or context_data.get('coach'):
                context_builder.add_coach_context(coach or context_data['coach'])
            
            # Add assessment data for initial agents
            if context_data.get('assessment_responses'):
                context_builder.add_assessment_responses(context_data['assessment_responses'])
            
            if context_data.get('assessment_aggregated'):
                context_builder.add_assessment_aggregated(context_data['assessment_aggregated'])
            
            # Add published content for sequential agents
            if context_data.get('published_content'):
                published = context_data['published_content']
                context_builder.add_published_coach_content(published)
            
            # Add iterative contexts
            if previous_versions:
                context_builder.add_previous_versions(previous_versions)
            
            if change_request:
                context_builder.add_change_request(change_request)
            
            # Build messages
            messages = context_builder.build_messages()
            
            # Prepare completion request
            completion_kwargs = {
                'model': prompt_template.model or 'gpt-4o-mini',
                'messages': messages,
                'max_tokens': 4000,
                'temperature': 0.7
            }
            
            # Add response format if specified
            if prompt_template.response_format == 'json':
                completion_kwargs['response_format'] = {'type': 'json_object'}
            
            # Run completion
            response = self.client.chat.completions.create(**completion_kwargs)
            
            # Extract response content
            ai_response = response.choices[0].message.content
            ai_reasoning = None
            
            # Try to extract reasoning if available
            if hasattr(response.choices[0].message, 'reasoning'):
                ai_reasoning = response.choices[0].message.reasoning
            
            # Get processed prompt for storage (with tokens replaced)
            processed_prompt = context_builder.replace_template_tokens(prompt_template.prompt)
            
            # Create AgentResponse record
            # Author must be coach (content creator), no fallback
            agent_response = AgentResponses.objects.create(
                author=agent_coach,
                athlete=athlete,
                assessment=assessment,
                assignment=assignment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=processed_prompt,
                ai_response=ai_response,
                ai_reasoning=ai_reasoning
            )
            
            logger.info(f"Successfully created iterative agent response {agent_response.id} for athlete {athlete.id}")
            logger.debug(f"Context builder debug info: {context_builder.get_debug_info()}")
            return agent_response
            
        except OpenAIError as e:
            logger.error(f"OpenAI API error in iterative completion: {e}")
            # Create error response
            processed_prompt = prompt_template.prompt
            try:
                context_builder = AgenticContextBuilder()
                context_builder.add_athlete_context(athlete)
                context_builder.add_assessment_context(assessment)
                processed_prompt = context_builder.replace_template_tokens(prompt_template.prompt)
            except:
                pass  # Use original prompt if context building fails
            
            # Get assignment and coach from context for error response
            assignment = context_data.get('assignment')
            if not assignment:
                logger.error(f"No assignment in context for iterative error response: athlete {athlete.id}, assessment {assessment.id}")
                raise ValueError(f"No assignment available for error response")
            
            # Coach must be provided, no fallback
            agent_coach = coach if coach else context_data.get('coach')
            if not agent_coach:
                logger.error(f"No coach available for iterative error response: athlete {athlete.id}, assessment {assessment.id}")
                raise ValueError(f"Cannot create error response without coach")
            
            agent_response = AgentResponses.objects.create(
                author=agent_coach,
                athlete=athlete,
                assessment=assessment,
                assignment=assignment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=processed_prompt,
                ai_response="",
                ai_reasoning=f"OpenAI API Error: {str(e)}"
            )
            return agent_response
            
        except Exception as e:
            logger.error(f"Unexpected error in iterative completion: {e}")
            # Create error response
            # Get assignment and coach from context
            assignment = context_data.get('assignment')
            if not assignment:
                logger.error(f"No assignment in context for iterative error response: athlete {athlete.id}, assessment {assessment.id}")
                raise ValueError(f"Cannot create error response without assignment")
            
            # Coach must be provided, no fallback
            agent_coach = coach if coach else context_data.get('coach')
            if not agent_coach:
                logger.error(f"No coach available for iterative error response: athlete {athlete.id}, assessment {assessment.id}")
                raise ValueError(f"Cannot create error response without coach")
            
            agent_response = AgentResponses.objects.create(
                author=agent_coach,
                athlete=athlete,
                assessment=assessment,
                assignment=assignment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=prompt_template.prompt,
                ai_response="",
                ai_reasoning=f"Unexpected Error: {str(e)}"
            )
            return agent_response