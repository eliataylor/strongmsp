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

logger = logging.getLogger(__name__)


class TokenReplacer:
    """
    Handles token replacement in prompt templates.
    """
    
    def __init__(self, athlete=None, input_a=None, input_b=None):
        self.athlete = athlete
        self.input_a = input_a
        self.input_b = input_b
    
    def replace_tokens(self, text):
        """
        Replace tokens in text with actual values.
        
        Args:
            text: Text containing tokens to replace
            
        Returns:
            Text with tokens replaced
        """
        if not text:
            return text
            
        # Replace athlete name
        if self.athlete:
            athlete_name = self.athlete.get_full_name() or self.athlete.username
            text = text.replace('{athlete_name}', athlete_name)
        
        # Replace input A (question responses or previous agent output)
        if self.input_a:
            if isinstance(self.input_a, str):
                text = text.replace('{input_a}', self.input_a)
            else:
                # Convert to JSON string if it's a dict/list
                text = text.replace('{input_a}', json.dumps(self.input_a, indent=2))
        
        # Replace input B (spider chart data)
        if self.input_b:
            if isinstance(self.input_b, str):
                text = text.replace('{input_b}', self.input_b)
            else:
                # Convert to JSON string if it's a dict/list
                text = text.replace('{input_b}', json.dumps(self.input_b, indent=2))
        
        return text


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
        Run OpenAI completion for an agent response.
        
        Args:
            prompt_template: PromptTemplates instance
            athlete: User instance (athlete)
            assessment: Assessments instance
            input_data: Dict containing 'input_a' and 'input_b' data
            
        Returns:
            AgentResponses instance
        """
        try:
            # Create token replacer
            token_replacer = TokenReplacer(
                athlete=athlete,
                input_a=input_data.get('input_a'),
                input_b=input_data.get('input_b')
            )
            
            # Replace tokens in prompt
            processed_prompt = token_replacer.replace_tokens(prompt_template.prompt)
            
            # Prepare completion request
            completion_kwargs = {
                'model': prompt_template.model or 'gpt-4o-mini',
                'messages': [
                    {
                        'role': 'system',
                        'content': prompt_template.instructions or 'You are a helpful assistant.'
                    },
                    {
                        'role': 'user',
                        'content': processed_prompt
                    }
                ],
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
            return agent_response
            
        except OpenAIError as e:
            logger.error(f"OpenAI API error: {e}")
            # Create error response
            agent_response = AgentResponses.objects.create(
                author=athlete,
                athlete=athlete,
                assessment=assessment,
                prompt_template=prompt_template,
                purpose=prompt_template.purpose,
                message_body=processed_prompt if 'processed_prompt' in locals() else prompt_template.prompt,
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
