"""
Agent Orchestrator Service

Manages agent execution flow with async/sync patterns and notifications.
"""
import threading
import logging
from django.contrib.auth import get_user_model
from django.db.models import Q

from ..models import PromptTemplates, AgentResponses, Payments, PaymentAssignments, Assessments
from .agent_completion_service import AgentCompletionService
from .confidence_analyzer import ConfidenceAnalyzer
from ..notification_service import create_notification_group

logger = logging.getLogger(__name__)
User = get_user_model()


class AgentOrchestrator:
    """
    Orchestrates agent execution flow and notifications.
    """
    
    def __init__(self):
        self.completion_service = AgentCompletionService()
    
    def get_athlete_coach(self, athlete_id):
        """
        Get the coach assigned to an athlete via PaymentAssignments.
        
        Args:
            athlete_id: ID of the athlete
            
        Returns:
            User instance (coach) or None
        """
        try:
            # Find coaches via PaymentAssignments
            assignment = PaymentAssignments.objects.filter(athlete_id=athlete_id).prefetch_related('coaches').first()
            
            if assignment and assignment.coaches.exists():
                return assignment.coaches.first()
            
            logger.warning(f"No coach found for athlete {athlete_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching coach for athlete {athlete_id}: {e}")
            return None
    
    def get_athlete_parents(self, athlete_id):
        """
        Get parents associated with an athlete via PaymentAssignments.
        
        Args:
            athlete_id: ID of the athlete
            
        Returns:
            List of User instances (parents)
        """
        try:
            # Find parents via PaymentAssignments
            assignments = PaymentAssignments.objects.filter(athlete_id=athlete_id).prefetch_related('parents')
            parents = []
            
            for assignment in assignments:
                parents.extend(assignment.parents.all())
            
            # If no parents found via assignments, try to find any parent users
            if not parents:
                parents = list(User.objects.filter(groups__name='parent')[:5])  # Limit to 5
            
            return parents
            
        except Exception as e:
            logger.error(f"Error fetching parents for athlete {athlete_id}: {e}")
            return []
    
    def notify_coach(self, agent_response, coach):
        """
        Create notifications for coach with full AI response text.
        
        Args:
            agent_response: AgentResponses instance
            coach: User instance (coach)
        """
        try:
            # Create message with agent response details
            message = f"New {agent_response.purpose} response generated for {agent_response.athlete.get_full_name() or agent_response.athlete.username}"
            
            # Create HTML message with full response
            message_html = f"""
            <h2>New Agent Response: {agent_response.purpose.replace('_', ' ').title()}</h2>
            <p><strong>Athlete:</strong> {agent_response.athlete.get_full_name() or agent_response.athlete.username}</p>
            <p><strong>Assessment:</strong> {agent_response.assessment.title if agent_response.assessment else 'N/A'}</p>
            <hr>
            <h3>AI Response:</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">{agent_response.ai_response}</div>
            """
            
            # Create notifications
            notifications = create_notification_group(
                recipient=coach,
                message=message,
                channels=['dashboard', 'email'],
                notification_type='agent-response',
                priority='normal',
                message_html=message_html,
                auto_send=True
            )
            
            logger.info(f"Created {len(notifications)} notifications for coach {coach.id}")
            
        except Exception as e:
            logger.error(f"Error creating coach notifications: {e}")
    
    def notify_assessment_complete(self, athlete):
        """
        Notify athlete and parents that assessment is complete.
        
        Args:
            athlete: User instance (athlete)
        """
        try:
            message = "Your assessment has been completed. Your coach will reach out soon."
            
            # Notify athlete
            athlete_notifications = create_notification_group(
                recipient=athlete,
                message=message,
                channels=['email'],
                notification_type='assessment-submitted',
                priority='normal',
                auto_send=True
            )
            
            # Notify parents
            parents = self.get_athlete_parents(athlete.id)
            for parent in parents:
                parent_notifications = create_notification_group(
                    recipient=parent,
                    message=f"Assessment completed for {athlete.author_display_name}. Coach will reach out soon.",
                    channels=['email'],
                    notification_type='assessment-submitted',
                    priority='normal',
                    auto_send=True
                )
            
            logger.info(f"Created completion notifications for athlete {athlete.id} and {len(parents)} parents")
            
        except Exception as e:
            logger.error(f"Error creating completion notifications: {e}")
    
    def notify_content_published(self, coach_content):
        """
        Send notifications when CoachContent is published.
        
        Args:
            coach_content: CoachContent instance
        """
        try:
            athlete = coach_content.athlete
            parents = self.get_athlete_parents(athlete.id) if athlete else []
            
            # Notify athlete
            if athlete:
                message = f"New content available: {coach_content.title}"
                
                # Create HTML message with content preview
                content_preview = coach_content.body[:500] + "..." if len(coach_content.body) > 500 else coach_content.body
                message_html = f"""
                <h2>New Content Available</h2>
                <p><strong>Title:</strong> {coach_content.title}</p>
                <p><strong>Purpose:</strong> {coach_content.purpose.replace('_', ' ').title()}</p>
                <hr>
                <h3>Content Preview:</h3>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">{content_preview}</div>
                """
                
                athlete_notifications = create_notification_group(
                    recipient=athlete,
                    message=message,
                    channels=['dashboard', 'email'],
                    notification_type='coach-content',
                    priority='normal',
                    message_html=message_html,
                    auto_send=True
                )
                
                logger.info(f"Created {len(athlete_notifications)} notifications for athlete {athlete.id}")
            
            # Notify parents
            for parent in parents:
                message = f"New content available for {athlete.author_display_name if athlete else 'your athlete'}: {coach_content.title}"
                
                parent_notifications = create_notification_group(
                    recipient=parent,
                    message=message,
                    channels=['email'],
                    notification_type='coach-content',
                    priority='normal',
                    message_html=message_html,
                    auto_send=True
                )
                
                logger.info(f"Created {len(parent_notifications)} notifications for parent {parent.id}")
            
            logger.info(f"Created content published notifications for {coach_content.id}")
            
        except Exception as e:
            logger.error(f"Error creating content published notifications: {e}")
    
    def get_prompt_template_by_purpose(self, purpose):
        """
        Get active prompt template by purpose.
        
        Args:
            purpose: Purpose string (feedbackreport, talkingpoints, etc.)
            
        Returns:
            PromptTemplates instance or None
        """
        try:
            template = PromptTemplates.objects.filter(
                purpose=purpose,
                status='active'
            ).first()
            
            if not template:
                logger.warning(f"No active template found for purpose: {purpose}")
            
            return template
            
        except Exception as e:
            logger.error(f"Error fetching template for purpose {purpose}: {e}")
            return None
    
    def trigger_assessment_agents(self, athlete_id, assessment_id):
        """
        Trigger the first 3 agents (Dwayne, Sherly, Bobby) asynchronously.
        
        Args:
            athlete_id: ID of the athlete
            assessment_id: ID of the assessment
            
        Returns:
            List of AgentResponses instances
        """
        try:
            athlete = User.objects.get(id=athlete_id)
            assessment = Assessments.objects.get(id=assessment_id)
            coach = self.get_athlete_coach(athlete_id)
            
            # Agent purposes for first 3
            purposes = ['feedback_report', 'talking_points', 'scheduling_email']
            agent_responses = []
            
            # Create threads for parallel execution
            threads = []
            
            def run_agent(purpose):
                try:
                    template = self.get_prompt_template_by_purpose(purpose)
                    if not template:
                        logger.error(f"No template found for purpose: {purpose}")
                        return
                    
                    # Prepare context data
                    context_data = self.completion_service.prepare_context_data(
                        athlete, assessment, purpose, coach
                    )
                    
                    # Run completion
                    agent_response = self.completion_service.run_completion(
                        template, athlete, assessment, context_data
                    )
                    
                    agent_responses.append(agent_response)
                    
                    # Notify coach
                    if coach:
                        self.notify_coach(agent_response, coach)
                    
                except Exception as e:
                    logger.error(f"Error running agent {purpose}: {e}")
            
            # Start threads
            for purpose in purposes:
                thread = threading.Thread(target=run_agent, args=(purpose,))
                thread.start()
                threads.append(thread)
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            # Notify athlete and parents after all 3 complete
            self.notify_assessment_complete(athlete)
            
            logger.info(f"Completed {len(agent_responses)} assessment agents for athlete {athlete_id}")
            return agent_responses
            
        except Exception as e:
            logger.error(f"Error triggering assessment agents: {e}")
            return []
    
    def trigger_sequential_agent_from_published_content(self, coach_content, skip_trigger=False):
        """
        Trigger next sequential agent when CoachContent is published.
        
        Args:
            coach_content: CoachContent instance that was just published
            skip_trigger: If True, skip triggering (default False)
            
        Returns:
            AgentResponses instance or None
        """
        if skip_trigger:
            return None
        
        # Map: current purpose → next agent purpose
        SEQUENTIAL_AGENT_MAP = {
            'feedback_report': 'curriculum',
            'curriculum': 'lesson_plan',
        }
        
        next_purpose = SEQUENTIAL_AGENT_MAP.get(coach_content.purpose)
        if not next_purpose:
            return None
        
        template = self.get_prompt_template_by_purpose(next_purpose)
        if not template:
            logger.error(f"No template for {next_purpose}")
            return None
        
        # Prepare context with published content
        context_data = self.completion_service.prepare_context_data(
            athlete=coach_content.athlete,
            assessment=coach_content.source_draft.assessment if coach_content.source_draft else None,
            purpose=next_purpose,
            coach=coach_content.author,
            published_content=coach_content
        )
        
        # Run completion
        agent_response = self.completion_service.run_completion(
            prompt_template=template,
            athlete=coach_content.athlete,
            assessment=coach_content.source_draft.assessment if coach_content.source_draft else None,
            context_data=context_data
        )
        
        # Notify coach
        if coach_content.author:
            self.notify_coach(agent_response, coach_content.author)
        
        logger.info(f"Triggered {next_purpose} from published {coach_content.purpose}")
        return agent_response

    def trigger_sequential_agent(self, agent_purpose, athlete_id, assessment_id):
        """
        Trigger sequential agents (Sam, Patrick) synchronously.
        
        Args:
            agent_purpose: Purpose of the agent ('12sessions' or 'lessonpackage')
            athlete_id: ID of the athlete
            assessment_id: ID of the assessment
            
        Returns:
            AgentResponses instance or None
        """
        try:
            athlete = User.objects.get(id=athlete_id)
            assessment = Assessments.objects.get(id=assessment_id)
            coach = self.get_athlete_coach(athlete_id)
            
            # Get template
            template = self.get_prompt_template_by_purpose(agent_purpose)
            if not template:
                logger.error(f"No template found for purpose: {agent_purpose}")
                return None
            
            # Find previous agent response
            previous_response = None
            if agent_purpose == 'curriculum':
                # Sam depends on Dwayne (feedback_report)
                previous_response = AgentResponses.objects.filter(
                    athlete=athlete,
                    assessment=assessment,
                    purpose='feedback_report'
                ).order_by('-created_at').first()
            elif agent_purpose == 'lesson_plan':
                # Patrick depends on Sam (curriculum)
                previous_response = AgentResponses.objects.filter(
                    athlete=athlete,
                    assessment=assessment,
                    purpose='curriculum'
                ).order_by('-created_at').first()
            
            if not previous_response:
                logger.error(f"No previous response found for {agent_purpose}")
                return None
            
            # Prepare context data
            context_data = self.completion_service.prepare_context_data(
                athlete, assessment, agent_purpose, coach
            )
            
            # Run completion
            agent_response = self.completion_service.run_completion(
                template, athlete, assessment, context_data
            )
            
            # Notify coach
            if coach:
                self.notify_coach(agent_response, coach)
            
            logger.info(f"Completed sequential agent {agent_purpose} for athlete {athlete_id}")
            return agent_response
            
        except Exception as e:
            logger.error(f"Error triggering sequential agent {agent_purpose}: {e}")
            return None
