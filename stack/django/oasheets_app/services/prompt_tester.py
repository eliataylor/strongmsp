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
        base_prompt = self.prompt_template.prompt
        
        # Replace placeholders in the prompt
        if "{message_body}" in base_prompt:
            base_prompt = base_prompt.replace("{message_body}", self.message_body)
        if "{athlete_name}" in base_prompt and self.athlete:
            base_prompt = base_prompt.replace("{athlete_name}", str(self.athlete))
        
        # Add instructions if provided
        if self.prompt_template.instructions:
            base_prompt = f"{self.prompt_template.instructions}\n\n{base_prompt}"
            
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
