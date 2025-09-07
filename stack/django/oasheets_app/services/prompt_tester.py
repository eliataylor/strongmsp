import json
import threading
import time
from typing import Any, Optional, List, Union

import openai
from django.conf import settings
from openai import OpenAIError
import logging

from strongmsp_app.models import PromptTemplates, AgentResponses
from .assistant_manager import OpenAIPromptManager
from .template_mapper import TemplateMapper

logger = logging.getLogger(__name__)


class TokenReplacer:
    """Handles token replacement for prompt templates"""
    
    def __init__(self, athlete=None):
        self.athlete = athlete
        self._token_map = {
            "assesment_aggregated": self._get_assessment_aggregated,
            "assesment_responses": self._get_assessment_responses,
            "lessonpackage": lambda: self._get_agent_response_by_purpose("lessonpackage"),
            "12sessions": lambda: self._get_agent_response_by_purpose("12sessions"),
            "talkingpoints": lambda: self._get_agent_response_by_purpose("talkingpoints"),
            "feedbackreport": lambda: self._get_agent_response_by_purpose("feedbackreport"),
            "parentemail": lambda: self._get_agent_response_by_purpose("parentemail"),
            "athlete_name": lambda: self.athlete.get_full_name() if self.athlete else ""
        }
    
    def add_token_handler(self, token_name: str, handler_func):
        """Add a custom token handler"""
        self._token_map[token_name] = handler_func
    
    def remove_token_handler(self, token_name: str):
        """Remove a token handler"""
        if token_name in self._token_map:
            del self._token_map[token_name]
    
    def get_available_tokens(self) -> list:
        """Get list of available token names"""
        return list(self._token_map.keys())
    
    def replace_tokens(self, text: str) -> str:
        """Replace {{token}} patterns in text with actual data"""
        import re
        
        # Find all {{token}} patterns in the text
        token_pattern = r'\{\{([^}]+)\}\}'
        matches = re.findall(token_pattern, text)
        
        for token in matches:
            if token in self._token_map:
                try:
                    # Call the replacement function
                    replacement_func = self._token_map[token]
                    replacement_value = replacement_func()
                    
                    # Replace the token in the text
                    text = text.replace(f"{{{{{token}}}}}", replacement_value)
                    
                except Exception as e:
                    logger.error(f"Error replacing token {token}: {e}")
                    # Replace with error message instead of leaving the token
                    text = text.replace(f"{{{{{token}}}}}", f"[Error retrieving {token}: {str(e)}]")
            else:
                # Token not found in map, replace with placeholder
                text = text.replace(f"{{{{{token}}}}}", f"[Token {token} not found]")
        
        return text
    
    def _get_assessment_aggregated(self) -> str:
        """Get aggregated assessment results for an athlete"""
        from django.db.models import Sum, Count
        from strongmsp_app.models import QuestionResponses, Questions
        
        if not self.athlete or not self.athlete.id:
            return ""
        
        # Get all question responses for the given athlete
        responses = QuestionResponses.objects.filter(author_id=self.athlete.id)
        
        # Aggregate responses by question category
        category_stats = responses.values(
            'question__question_category'
        ).annotate(
            total_response=Sum('response'),
            response_count=Count('id')
        ).filter(
            question__question_category__isnull=False
        ).order_by('question__question_category')
        
        # Format the response data as a string
        result_lines = []
        for stat in category_stats:
            category = stat['question__question_category']
            if category:  # Ensure category is not None
                avg_response = round(stat['total_response'] / stat['response_count'], 2) if stat['response_count'] > 0 else 0
                result_lines.append(f"{category}: {stat['total_response']} total, {stat['response_count']} responses, {avg_response} average")
        
        return "\n".join(result_lines) if result_lines else "No assessment data available"
    
    def _get_assessment_responses(self) -> str:
        """Get detailed assessment responses for an athlete"""
        from strongmsp_app.models import QuestionResponses, Questions
        
        if not self.athlete or not self.athlete.id:
            return ""
        
        # Get all question responses with question details
        responses = QuestionResponses.objects.filter(author_id=self.athlete.id).select_related('question')
        
        result_lines = []
        for response in responses:
            question_title = response.question.title if response.question else "Unknown Question"
            result_lines.append(f"{question_title}: {response.response}")
        
        return "\n".join(result_lines) if result_lines else "No assessment responses available"
    
    def _get_agent_response_by_purpose(self, purpose: str) -> str:
        """Get the most recent AgentResponse for a specific purpose"""
        from strongmsp_app.models import AgentResponses
        
        if not self.athlete or not self.athlete.id:
            return ""
        
        try:
            # Get the most recent AgentResponse for the given purpose and athlete
            response = AgentResponses.objects.filter(
                athlete_id=self.athlete.id,
                purpose=purpose
            ).order_by('-created_at').first()
            
            if response:
                return response.ai_response
            else:
                return f"No {purpose} response available"
        except Exception as e:
            return f"Error retrieving {purpose} response: {str(e)}"



class PromptTester:
    @classmethod
    def create_by_purpose(cls, purpose: str, user, athlete=None, message_body=""):
        """
        Create a PromptTester instance by purpose instead of template.
        
        Args:
            purpose: The purpose string to find template for
            user: User instance
            athlete: Optional athlete instance
            message_body: Message body for testing
            
        Returns:
            PromptTester instance or None if template not found
        """
        template = TemplateMapper.get_template_by_purpose(purpose, user)
        if not template:
            return None
            
        return cls(template, user, athlete, message_body)
    
    def __init__(self, prompt_template: PromptTemplates, user, athlete=None, message_body=""):
        self.prompt_template = prompt_template
        self.user = user
        self.athlete = athlete
        self.message_body = message_body
        
        # Initialize token replacer
        self.token_replacer = TokenReplacer(athlete=athlete)
        
        # Initialize OpenAI client
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY, max_retries=5, timeout=300)
        
        # Create AgentResponse record
        self.agent_response = AgentResponses.objects.create(
            author=user if user.is_authenticated else None,
            athlete=athlete,
            prompt_template=prompt_template,
            purpose=prompt_template.purpose,
            message_body=message_body,
            ai_response="",
            ai_reasoning=""
        )
        
        self.doSave = False

    def build_prompt(self) -> str:
        """Build the complete prompt from template and user input"""
        base_prompt = []

        if self.prompt_template.instructions:
            base_prompt.append(self.prompt_template.instructions)

        base_prompt.append(self.prompt_template.prompt)
        
        base_prompt.append(self.message_body)
        
        # Handle token replacement for {{token}} patterns using TokenReplacer
        base_prompt = self.token_replacer.replace_tokens("\n\n".join(base_prompt))
        
        return base_prompt

    def get_model(self) -> str:
        """Get the AI model to use, defaulting to gpt-4o-mini if not specified"""
        return self.prompt_template.model or "gpt-4o-mini"

    def get_response_format(self) -> str:
        """Get the response format, defaulting to text if not specified"""
        return self.prompt_template.response_format or "text"

    def stream(self, prompt: str):
        """Stream AI response using OpenAI's chat completions API"""
        try:
            response_stream = self.client.chat.completions.create(
                model=self.get_model(),
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant."},
                    {"role": "user", "content": prompt}
                ],
                stream=True,
                temperature=0.7
            )
            
            yield from self.handle_stream(response_stream)

        except Exception as e:
            if self.doSave:
                self.agent_response.save()
            yield json.dumps({"error": f"Stream failed: {str(e)}"}) + "||JSON_END||"

    def handle_stream(self, response_stream):
        """Handle streaming response from OpenAI"""
        self.doSave = False
        last_keepalive = time.time()
        full_response = ""
        full_reasoning = ""

        for chunk in response_stream:
            if time.time() - last_keepalive >= 10:
                yield json.dumps({"type": "keep_alive"}) + "||JSON_END||"
                last_keepalive = time.time()

            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                
                if hasattr(delta, 'content') and delta.content:
                    content = delta.content
                    full_response += content
                    
                    # Update the agent response
                    self.agent_response.ai_response = full_response
                    self.doSave = True
                    
                    # Yield the content chunk
                    yield json.dumps({
                        "type": "message",
                        "content": content
                    }) + "||JSON_END||"

        # Save the final response
        if self.doSave:
            self.agent_response.ai_response = full_response
            self.agent_response.ai_reasoning = full_reasoning
            self.doSave = False
            self.agent_response.save()

        yield json.dumps({
            "type": "done",
            "agent_response_id": self.agent_response.id,
            "ai_response": full_response
        }) + "||JSON_END||"

    def request(self, prompt: str):
        """Non-streaming request for fallback"""
        try:
            response = self.client.chat.completions.create(
                model=self.get_model(),
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            self.agent_response.ai_response = ai_response
            self.agent_response.save()
            
            return ai_response

        except Exception as e:
            logger.error(f"Error in prompt testing: {e}")
            return None
