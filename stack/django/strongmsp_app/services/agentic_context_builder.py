"""
Agentic Context Builder

Structured context builder pattern for OpenAI completions
Provides clear context separation with prefixes and flexible message construction.
"""
import json
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


# Context prefixes for clear identification
CONTEXT_PREFIXES = {
    # Athlete fields (granular)
    'ATHLETE_NAME': 'ATHLETE_NAME:',
    'ATHLETE_AGE': 'ATHLETE_AGE:',
    'ATHLETE_GENDER': 'ATHLETE_GENDER:',
    'ATHLETE_PRONOUN': 'ATHLETE_PRONOUN:',
    'ATHLETE_CITY': 'ATHLETE_CITY:',
    'ATHLETE_ORG': 'ATHLETE_ORG:',
    'ATHLETE_ETHNICITY': 'ATHLETE_ETHNICITY:',
    'ATHLETE_IMAGE': 'ATHLETE_IMAGE:',
    'ATHLETE_AVATAR': 'ATHLETE_AVATAR:',
    
    # Coach fields
    'COACH_NAME': 'COACH_NAME:',
    
    # Assessment fields
    'ASSESSMENT_INFO': 'ASSESSMENT INFORMATION:',
    'ASSESSMENT_RESPONSES': 'ASSESSMENT RESPONSES:',
    'ASSESSMENT_AGGREGATED': 'ASSESSMENT SUMMARY STATISTICS:',
    
    # Published content fields
    'PUBLISHED_FEEDBACK_REPORT': 'PREVIOUSLY PUBLISHED FEEDBACK REPORT:',
    'PUBLISHED_CURRICULUM': 'PREVIOUSLY PUBLISHED CURRICULUM:',
    'PUBLISHED_LESSON_PLAN': 'PREVIOUSLY PUBLISHED LESSON PLAN:',
    'PUBLISHED_TALKING_POINTS': 'PREVIOUSLY PUBLISHED TALKING POINTS:',
    'PUBLISHED_SCHEDULING_EMAIL': 'PREVIOUSLY PUBLISHED SCHEDULING EMAIL:',
    
    # Regeneration fields
    'VERSION_HISTORY': 'PREVIOUS VERSION HISTORY:',
    'CHANGE_REQUEST': 'COACH FEEDBACK - REQUIRED CHANGES:',
    
    # System
    'SYSTEM_INSTRUCTIONS': 'SYSTEM INSTRUCTIONS:',
}

# Token-to-context mapping for template replacement
TOKEN_FUNCTIONS = {
    # Athlete tokens - extract from builder.athlete object
    '{ATHLETE_NAME}': lambda builder: builder.athlete.get_full_name() if builder.athlete else '',
    '{ATHLETE_AGE}': lambda builder: str(builder.athlete.calculate_age()) if builder.athlete and builder.athlete.calculate_age() is not None else '',
    '{ATHLETE_GENDER}': lambda builder: getattr(builder.athlete, 'gender', '') if builder.athlete else '',
    '{ATHLETE_PRONOUN}': lambda builder: getattr(builder.athlete, 'pronoun', '') if builder.athlete else '',
    '{ATHLETE_CITY}': lambda builder: getattr(builder.athlete, 'city', '') if builder.athlete else '',
    '{ATHLETE_ORG}': lambda builder: getattr(builder.athlete, 'organization', '') if builder.athlete else '',
    '{ATHLETE_ETHNICITY}': lambda builder: getattr(builder.athlete, 'ethnicity', '') if builder.athlete else '',
    '{ATHLETE_IMAGE}': lambda builder: str(getattr(builder.athlete, 'image', '')) if builder.athlete else '',
    '{ATHLETE_AVATAR}': lambda builder: str(getattr(builder.athlete, 'avatar', '')) if builder.athlete else '',
    
    # Coach tokens - extract from builder.coach object
    '{COACH_NAME}': lambda builder: builder.coach.get_full_name() if builder.coach else '',
    
    # Assessment tokens - extract from builder.assessment object or format from context_parts
    '{ASSESSMENT_INFO}': lambda builder: builder.assessment.title if builder.assessment else '',
    '{ASSESSMENT_RESPONSES}': lambda builder: builder.format_assessment_responses() if 'assessment_responses' in builder.context_parts else '',
    '{ASSESSMENT_AGGREGATED}': lambda builder: builder.format_assessment_aggregated() if 'assessment_aggregated' in builder.context_parts else '',
    
    # Published content tokens - format from context_parts
    '{PUBLISHED_FEEDBACK_REPORT}': lambda builder: builder.format_published_content('feedback_report'),
    '{PUBLISHED_CURRICULUM}': lambda builder: builder.format_published_content('curriculum'),
    '{PUBLISHED_LESSON_PLAN}': lambda builder: builder.format_published_content('lesson_plan'),
    '{PUBLISHED_TALKING_POINTS}': lambda builder: builder.format_published_content('talking_points'),
    '{PUBLISHED_SCHEDULING_EMAIL}': lambda builder: builder.format_published_content('scheduling_email'),
    
    # Regeneration tokens - format from context_parts
    '{VERSION_HISTORY}': lambda builder: builder.format_version_history() if 'version_history' in builder.context_parts else '',
    '{CHANGE_REQUEST}': lambda builder: builder.context_parts.get('change_request', ''),
}


class AgenticContextBuilder:
    """
    Builds structured context for OpenAI completions with clear prefixes and formatting.
    """
    
    def __init__(self):
        self.context_parts = {}  # Named context storage
        self.athlete = None
        self.assessment = None
        self.prompt_template = None
        self.coach = None  # Add this
    
    # Context Addition Methods
    
    def add_athlete_context(self, athlete):
        """
        Store athlete profile information.
        
        Args:
            athlete: User instance (athlete)
        """
        self.athlete = athlete
    
    def add_assessment_context(self, assessment):
        """
        Store assessment metadata.
        
        Args:
            assessment: Assessments instance
        """
        self.assessment = assessment
    
    def add_assessment_responses(self, responses):
        """
        Store question response data.
        
        Args:
            responses: List of question response dictionaries
        """
        if responses:
            self.context_parts['assessment_responses'] = responses
    
    def add_assessment_aggregated(self, spider_data):
        """
        Store category aggregations.
        
        Args:
            spider_data: Dictionary with category statistics
        """
        if spider_data:
            self.context_parts['assessment_aggregated'] = spider_data
    
    def add_published_coach_content(self, coach_content):
        """
        Store published CoachContent for sequential agents.
        
        Args:
            coach_content: CoachContent instance
        """
        if coach_content:
            self.context_parts[f'published_{coach_content.purpose}'] = coach_content
    
    def add_template_instructions(self, prompt_template):
        """
        Store system instructions from prompt template.
        
        Args:
            prompt_template: PromptTemplates instance
        """
        self.prompt_template = prompt_template
        if prompt_template and prompt_template.instructions:
            self.context_parts['system_instructions'] = f"{CONTEXT_PREFIXES['SYSTEM_INSTRUCTIONS']}\n\n{prompt_template.instructions}"
        
        # Add prompt field after system instructions
        if prompt_template and prompt_template.prompt:
            self.context_parts['prompt'] = prompt_template.prompt
    
    def add_previous_versions(self, version_list):
        """
        Store history of past AgentResponses for the same athlete/purpose.
        
        Args:
            version_list: List of AgentResponses instances
        """
        if version_list:
            self.context_parts['version_history'] = version_list
    
    def add_change_request(self, change_request_text):
        """
        Store coach's requested changes.
        
        Args:
            change_request_text: String with coach's change request
        """
        if change_request_text:
            self.context_parts['change_request'] = change_request_text
    
    def add_coach_context(self, coach):
        """
        Store coach profile information.
        
        Args:
            coach: User instance (coach)
        """
        self.coach = coach
    
    # Formatting Methods
    
    
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
        
        return f"{CONTEXT_PREFIXES['ASSESSMENT_RESPONSES']}\n\n" + "\n\n".join(sections)
    
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
        
        return f"{CONTEXT_PREFIXES['ASSESSMENT_AGGREGATED']}\n\n" + "\n".join(sections)
    
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
        
        return "\n".join(sections)
    
    def format_assessment_responses(self) -> str:
        """
        Format assessment responses from raw data.
        
        Returns:
            Formatted assessment responses string
        """
        responses = self.context_parts.get('assessment_responses', [])
        if not responses:
            return ""
        
        return self.format_question_responses_as_markdown(responses)
    
    def format_assessment_aggregated(self) -> str:
        """
        Format assessment aggregated data from raw data.
        
        Returns:
            Formatted assessment aggregated string
        """
        spider_data = self.context_parts.get('assessment_aggregated', {})
        if not spider_data:
            return ""
        
        return self.format_spider_chart_as_markdown(spider_data)
    
    def format_published_content(self, purpose) -> str:
        """
        Format published CoachContent for a specific purpose.
        
        Args:
            purpose: The purpose of the published content
            
        Returns:
            Formatted published content string
        """
        coach_content = self.context_parts.get(f'published_{purpose}')
        if not coach_content:
            return ""
        
        prefix_key = f'PUBLISHED_{purpose.upper()}'
        prefix = CONTEXT_PREFIXES.get(prefix_key, f'{prefix_key}:')
        
        sections = [
            f"**Title:** {coach_content.title}",
            f"**Published:** {coach_content.coach_delivered.strftime('%Y-%m-%d %H:%M') if coach_content.coach_delivered else 'Draft'}",
            f"**Content:**\n{coach_content.body}"
        ]
        
        return f"{prefix}\n\n" + "\n\n".join(sections)
    
    def format_version_history(self) -> str:
        """
        Format version history from raw data.
        
        Returns:
            Formatted version history string
        """
        version_list = self.context_parts.get('version_history', [])
        if not version_list:
            return ""
        
        return self.format_version_history_as_markdown(version_list)
    
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
        
        for token, resolver in TOKEN_FUNCTIONS.items():
            try:
                value = resolver(self)
                # Support both uppercase and lowercase tokens
                result = result.replace(token, str(value))
                result = result.replace(token.lower(), str(value))
            except Exception as e:
                logger.warning(f"Error resolving token {token}: {e}")
                result = result.replace(token, '')
                result = result.replace(token.lower(), '')
        
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
            system_content = self.context_parts['system_instructions']
            
            # Enhance system instructions with change request guidance if change request is present
            if 'change_request' in self.context_parts:
                enhanced_instructions = f"{system_content}\n\nIMPORTANT: The COACH FEEDBACK - REQUIRED CHANGES section takes priority over all other instructions. The change request represents specific feedback from the coach and must be addressed directly in your response. Always incorporate the requested changes while maintaining the overall structure and quality of the content."
                system_content = enhanced_instructions
            
            messages.append({
                'role': 'system',
                'content': system_content
            })
        
        # Prompt (if available)
        if 'prompt' in self.context_parts:
            messages.append({
                'role': 'user',
                'content': self.context_parts['prompt']
            })
        
        # Change request - moved up to appear right after main prompt for priority
        if 'change_request' in self.context_parts:
            messages.append({
                'role': 'user',
                'content': f"{CONTEXT_PREFIXES['CHANGE_REQUEST']}\n\n{self.context_parts['change_request']}"
            })
        
        # Assessment info
        if self.assessment:
            assessment_info = self.format_assessment_info(self.assessment)
            if assessment_info:
                messages.append({
                    'role': 'system',
                    'content': assessment_info
                })
        
        # Assessment responses
        if 'assessment_responses' in self.context_parts:
            formatted_responses = self.format_assessment_responses()
            if formatted_responses:
                messages.append({
                    'role': 'system',
                    'content': formatted_responses
                })
        
        # Assessment aggregated data
        if 'assessment_aggregated' in self.context_parts:
            formatted_aggregated = self.format_assessment_aggregated()
            if formatted_aggregated:
                messages.append({
                    'role': 'system',
                    'content': formatted_aggregated
                })
        
        # Published content (for sequential agents)
        for purpose in ['feedback_report', 'curriculum', 'lesson_plan', 'talking_points', 'scheduling_email']:
            if f'published_{purpose}' in self.context_parts:
                formatted_content = self.format_published_content(purpose)
                if formatted_content:
                    messages.append({
                        'role': 'system',
                        'content': formatted_content
                    })
        
        # Version history
        if 'version_history' in self.context_parts:
            formatted_history = self.format_version_history()
            if formatted_history:
                # Add guidance on how to use version history when making changes
                if 'change_request' in self.context_parts:
                    version_guidance = f"{formatted_history}\n\nIMPORTANT: Use the PREVIOUS VERSION HISTORY above as reference for what to change. Compare the previous version with the requested changes to understand what modifications are needed. Maintain consistency with the overall style and structure while implementing the specific changes requested."
                    messages.append({
                        'role': 'system',
                        'content': version_guidance
                    })
                else:
                    messages.append({
                        'role': 'system',
                        'content': formatted_history
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
