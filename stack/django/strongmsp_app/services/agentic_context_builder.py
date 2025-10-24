"""
Agentic Context Builder

Structured context builder pattern for OpenAI completions, similar to MessageBuilder.ts.
Provides clear context separation with prefixes and flexible message construction.
"""
import json
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


# Context prefixes for clear identification
CONTEXT_PREFIXES = {
    'ATHLETE_PROFILE': 'ATHLETE_PROFILE:',
    'ASSESSMENT_INFO': 'ASSESSMENT_INFO:',
    'QUESTION_RESPONSES': 'QUESTION_RESPONSES:',
    'SPIDER_CHART': 'SPIDER_CHART:',
    'PREVIOUS_AGENT_OUTPUT': 'PREVIOUS_AGENT_OUTPUT:',
    'VERSION_HISTORY': 'VERSION_HISTORY:',
    'CHANGE_REQUEST': 'CHANGE_REQUEST:',
    'COACH_PROFILE': 'COACH_PROFILE:',
    'SYSTEM_INSTRUCTIONS': 'SYSTEM_INSTRUCTIONS:',
    'TEMPLATE_PROMPT': 'TEMPLATE_PROMPT:',
}

# Token-to-context mapping for template replacement
TOKEN_CONTEXT_MAP = {
    '{athlete_name}': lambda builder: builder.athlete.get_full_name() if builder.athlete else '',
    '{athlete_age}': lambda builder: getattr(builder.athlete, 'age', ''),
    '{input_a}': lambda builder: builder.get_context_value('question_responses') or builder.get_context_value('previous_agent_output'),
    '{input_b}': lambda builder: builder.get_context_value('spider_chart'),
    '{assessment_title}': lambda builder: builder.assessment.title if builder.assessment else '',
    '{assessment_description}': lambda builder: builder.assessment.description if builder.assessment else '',
}


class AgenticContextBuilder:
    """
    Builds structured context for OpenAI completions with clear prefixes and formatting.
    Similar to MessageBuilder pattern from TypeScript implementation.
    """
    
    def __init__(self):
        self.context_parts = {}  # Named context storage
        self.athlete = None
        self.assessment = None
        self.prompt_template = None
    
    # Context Addition Methods
    
    def add_athlete_context(self, athlete):
        """
        Store athlete profile information.
        
        Args:
            athlete: User instance (athlete)
        """
        self.athlete = athlete
        if athlete:
            self.context_parts['athlete_profile'] = self.format_athlete_profile(athlete)
    
    def add_assessment_context(self, assessment):
        """
        Store assessment metadata.
        
        Args:
            assessment: Assessments instance
        """
        self.assessment = assessment
        if assessment:
            self.context_parts['assessment_info'] = self.format_assessment_info(assessment)
    
    def add_question_responses(self, responses):
        """
        Store question response data.
        
        Args:
            responses: List of question response dictionaries
        """
        if responses:
            self.context_parts['question_responses'] = self.format_question_responses_as_markdown(responses)
    
    def add_spider_chart_data(self, spider_data):
        """
        Store category aggregations.
        
        Args:
            spider_data: Dictionary with category statistics
        """
        if spider_data:
            self.context_parts['spider_chart'] = self.format_spider_chart_as_markdown(spider_data)
    
    def add_previous_agent_output(self, agent_response):
        """
        Store previous agent's output.
        
        Args:
            agent_response: String content from previous agent response
        """
        if agent_response:
            self.context_parts['previous_agent_output'] = f"**Previous Agent Output:**\n\n{agent_response}"
    
    def add_template_instructions(self, prompt_template):
        """
        Store system instructions from prompt template.
        
        Args:
            prompt_template: PromptTemplates instance
        """
        self.prompt_template = prompt_template
        if prompt_template and prompt_template.instructions:
            self.context_parts['system_instructions'] = f"{CONTEXT_PREFIXES['SYSTEM_INSTRUCTIONS']}\n\n{prompt_template.instructions}"
    
    def add_previous_versions(self, version_list):
        """
        Store history of past AgentResponses for the same athlete/purpose.
        
        Args:
            version_list: List of AgentResponses instances
        """
        if version_list:
            self.context_parts['version_history'] = self.format_version_history_as_markdown(version_list)
    
    def add_change_request(self, change_request_text):
        """
        Store coach's requested changes.
        
        Args:
            change_request_text: String with coach's change request
        """
        if change_request_text:
            self.context_parts['change_request'] = f"{CONTEXT_PREFIXES['CHANGE_REQUEST']}\n\n{change_request_text}"
    
    def add_coach_context(self, coach):
        """
        Store coach profile information.
        
        Args:
            coach: User instance (coach)
        """
        if coach:
            self.context_parts['coach_profile'] = f"{CONTEXT_PREFIXES['COACH_PROFILE']}\n\n{self.format_coach_profile(coach)}"
    
    # Formatting Methods
    
    def format_athlete_profile(self, athlete) -> str:
        """
        Format athlete data as markdown.
        
        Args:
            athlete: User instance (athlete)
            
        Returns:
            Formatted athlete profile string
        """
        if not athlete:
            return ""
        
        sections = []
        
        # Basic info
        if athlete.get_full_name():
            sections.append(f"**Name:** {athlete.get_full_name()}")
        elif athlete.username:
            sections.append(f"**Username:** {athlete.username}")
        
        if athlete.email:
            sections.append(f"**Email:** {athlete.email}")
        
        # User groups and additional fields
        if athlete.groups.exists():
            group_names = [group.name for group in athlete.groups.all()]
            sections.append(f"**User Groups:** {', '.join(group_names)}")
        
        
        if hasattr(athlete, 'real_name') and athlete.real_name:
            sections.append(f"**Real Name:** {athlete.real_name}")
        
        if hasattr(athlete, 'bio') and athlete.bio:
            sections.append(f"**Bio:** {athlete.bio}")
        
        return f"{CONTEXT_PREFIXES['ATHLETE_PROFILE']}\n\n" + "\n".join(sections) if sections else ""
    
    def format_assessment_info(self, assessment) -> str:
        """
        Format assessment metadata.
        
        Args:
            assessment: Assessments instance
            
        Returns:
            Formatted assessment info string
        """
        if not assessment:
            return ""
        
        sections = []
        
        if assessment.title:
            sections.append(f"**Title:** {assessment.title}")
        
        if assessment.description:
            sections.append(f"**Description:** {assessment.description}")
        
        if hasattr(assessment, 'created_at'):
            sections.append(f"**Created:** {assessment.created_at.strftime('%Y-%m-%d %H:%M')}")
        
        return f"{CONTEXT_PREFIXES['ASSESSMENT_INFO']}\n\n" + "\n".join(sections) if sections else ""
    
    def format_question_responses_as_markdown(self, responses) -> str:
        """
        Format responses with categories.
        
        Args:
            responses: List of question response dictionaries
            
        Returns:
            Formatted question responses string
        """
        if not responses:
            return ""
        
        # Group by category
        by_category = {}
        for response in responses:
            category = response.get('category', 'Uncategorized')
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(response)
        
        sections = []
        for category, category_responses in by_category.items():
            category_section = [f"### {category.replace('_', ' ').title()}"]
            
            for i, response in enumerate(category_responses, 1):
                question_text = response.get('question', f'Question {i}')
                response_value = response.get('response', 'N/A')
                scale = response.get('scale', '')
                help_text = response.get('help_text', '')
                
                item = f"- **Q{i}:** {question_text}"
                if help_text:
                    item += f" ({help_text})"
                item += f" → **{response_value}**"
                if scale:
                    item += f" (scale: {scale})"
                
                category_section.append(item)
            
            sections.append("\n".join(category_section))
        
        return f"{CONTEXT_PREFIXES['QUESTION_RESPONSES']}\n\n" + "\n\n".join(sections)
    
    def format_spider_chart_as_markdown(self, spider_data) -> str:
        """
        Format category stats as markdown.
        
        Args:
            spider_data: Dictionary with category statistics
            
        Returns:
            Formatted spider chart string
        """
        if not spider_data:
            return ""
        
        sections = []
        
        for category, stats in spider_data.items():
            category_name = category.replace('_', ' ').title()
            
            if isinstance(stats, dict):
                avg = stats.get('avg', 0)
                total = stats.get('total', 0)
                count = stats.get('count', 0)
                
                section = f"**{category_name}:** {avg}/5 average ({total} total, {count} responses)"
            else:
                section = f"**{category_name}:** {stats}"
            
            sections.append(section)
        
        return f"{CONTEXT_PREFIXES['SPIDER_CHART']}\n\n" + "\n".join(sections)
    
    def format_version_history_as_markdown(self, version_list) -> str:
        """
        Format version history as markdown.
        
        Args:
            version_list: List of AgentResponses instances
            
        Returns:
            Formatted version history string
        """
        if not version_list:
            return ""
        
        sections = []
        
        for i, version in enumerate(version_list, 1):
            version_info = f"**Version {i}** (ID: {version.id}, {version.created_at.strftime('%Y-%m-%d %H:%M')})"
            
            # Truncate response for readability
            response_preview = version.ai_response[:200] + "..." if len(version.ai_response) > 200 else version.ai_response
            
            sections.append(f"{version_info}\n```\n{response_preview}\n```")
        
        return f"{CONTEXT_PREFIXES['VERSION_HISTORY']}\n\n" + "\n\n".join(sections)
    
    def format_coach_profile(self, coach) -> str:
        """
        Format coach profile as markdown.
        
        Args:
            coach: User instance (coach)
            
        Returns:
            Formatted coach profile string
        """
        if not coach:
            return ""
        
        sections = []
        
        # Basic info
        if coach.get_full_name():
            sections.append(f"**Name:** {coach.get_full_name()}")
        elif coach.username:
            sections.append(f"**Username:** {coach.username}")
        
        if coach.email:
            sections.append(f"**Email:** {coach.email}")
        
        # User groups
        if coach.groups.exists():
            group_names = [group.name for group in coach.groups.all()]
            sections.append(f"**User Groups:** {', '.join(group_names)}")
        
        return "\n".join(sections)
    
    # Compilation Methods
    
    def get_context_value(self, key: str) -> str:
        """
        Retrieve specific context piece.
        
        Args:
            key: Context key to retrieve
            
        Returns:
            Context value or empty string
        """
        return self.context_parts.get(key, '')
    
    def replace_template_tokens(self, template_text: str) -> str:
        """
        Replace tokens in prompt text using context data.
        
        Args:
            template_text: Template text with {tokens}
            
        Returns:
            Text with tokens replaced
        """
        if not template_text:
            return template_text
        
        result = template_text
        
        for token, resolver in TOKEN_CONTEXT_MAP.items():
            try:
                value = resolver(self)
                result = result.replace(token, str(value))
            except Exception as e:
                logger.warning(f"Error resolving token {token}: {e}")
                result = result.replace(token, '')
        
        return result
    
    def build_messages(self) -> List[Dict[str, str]]:
        """
        Compile all context into OpenAI messages format.
        
        Returns:
            List of message dictionaries for OpenAI API
        """
        messages = []
        
        # System instructions (if available)
        if 'system_instructions' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': self.context_parts['system_instructions']
            })
        
        # Athlete profile
        if 'athlete_profile' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': self.context_parts['athlete_profile']
            })
        
        # Assessment info
        if 'assessment_info' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': self.context_parts['assessment_info']
            })
        
        # Question responses
        if 'question_responses' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': self.context_parts['question_responses']
            })
        
        # Spider chart data
        if 'spider_chart' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': self.context_parts['spider_chart']
            })
        
        # Previous agent output
        if 'previous_agent_output' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': f"{CONTEXT_PREFIXES['PREVIOUS_AGENT_OUTPUT']}\n\n{self.context_parts['previous_agent_output']}"
            })
        
        # Version history
        if 'version_history' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': self.context_parts['version_history']
            })
        
        # Change request
        if 'change_request' in self.context_parts:
            messages.append({
                'role': 'user',
                'content': self.context_parts['change_request']
            })
        
        # Coach profile
        if 'coach_profile' in self.context_parts:
            messages.append({
                'role': 'system',
                'content': self.context_parts['coach_profile']
            })
        
        # Template prompt (user message)
        if self.prompt_template and self.prompt_template.prompt:
            processed_prompt = self.replace_template_tokens(self.prompt_template.prompt)
            messages.append({
                'role': 'user',
                'content': f"{CONTEXT_PREFIXES['TEMPLATE_PROMPT']}\n\n{processed_prompt}"
            })
        
        return messages
    
    def get_debug_info(self) -> Dict[str, Any]:
        """
        Get debug information about the context builder state.
        
        Returns:
            Dictionary with context builder state
        """
        return {
            'context_parts': list(self.context_parts.keys()),
            'has_athlete': self.athlete is not None,
            'has_assessment': self.assessment is not None,
            'has_template': self.prompt_template is not None,
            'message_count': len(self.build_messages())
        }
