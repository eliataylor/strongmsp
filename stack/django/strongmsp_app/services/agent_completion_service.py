"""
Agent Completion Service

Handles OpenAI completions for agent responses using the Completions API (non-streaming).
"""
import json
import openai
from django.conf import settings
from openai import OpenAIError
import logging

from ..models import AgentResponses, PromptTemplates
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
    
    def run_completion(self, prompt_template, athlete, assessment, input_data):
        """
        Run OpenAI completion for an agent response using AgenticContextBuilder.
        
        Args:
            prompt_template: PromptTemplates instance
            athlete: User instance (athlete)
            assessment: Assessments instance
            input_data: Dict containing 'input_a' and 'input_b' data
            
        Returns:
            AgentResponses instance
        """
        try:
            # Initialize context builder
            context_builder = AgenticContextBuilder()
            
            # Add contexts
            context_builder.add_athlete_context(athlete)
            context_builder.add_assessment_context(assessment)
            context_builder.add_template_instructions(prompt_template)
            
            # Add input data based on type
            if isinstance(input_data.get('input_a'), list):
                # Question responses
                context_builder.add_question_responses(input_data['input_a'])
            elif isinstance(input_data.get('input_a'), str):
                # Previous agent output
                context_builder.add_previous_agent_output(input_data['input_a'])
            
            if input_data.get('input_b'):
                context_builder.add_spider_chart_data(input_data['input_b'])
            
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
            agent_response = AgentResponses.objects.create(
                author=athlete,
                athlete=athlete,
                assessment=assessment,
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
            
            agent_response = AgentResponses.objects.create(
                author=athlete,
                athlete=athlete,
                assessment=assessment,
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
            agent_response = AgentResponses.objects.create(
                author=athlete,
                athlete=athlete,
                assessment=assessment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=prompt_template.prompt,
                ai_response="",
                ai_reasoning=f"Unexpected Error: {str(e)}"
            )
            return agent_response
    
    def prepare_input_data(self, athlete, assessment, purpose, previous_response=None):
        """
        Prepare input data for agent completion.
        
        Args:
            athlete: User instance (athlete)
            assessment: Assessments instance
            purpose: Agent purpose (feedbackreport, talkingpoints, etc.)
            previous_response: Previous AgentResponse for sequential agents
            
        Returns:
            Dict with 'input_a' and 'input_b' data
        """
        input_data = {}
        
        if previous_response:
            # Sequential agent - use previous response as input A
            input_data['input_a'] = previous_response.ai_response
            input_data['input_b'] = None
        else:
            # Initial agents - use question responses and spider chart
            # Input A: Question responses
            question_responses = ConfidenceAnalyzer.get_question_responses_data(
                athlete.id, 
                assessment.id if assessment else None
            )
            input_data['input_a'] = question_responses
            
            # Input B: Spider chart data
            spider_data = ConfidenceAnalyzer.get_spider_chart_data(
                athlete.id, 
                assessment.id if assessment else None
            )
            input_data['input_b'] = spider_data
        
        return input_data
