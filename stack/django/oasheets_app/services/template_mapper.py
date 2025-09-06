from typing import Optional, Dict, Any
from strongmsp_app.models import PromptTemplates


class TemplateMapper:
    """
    Maps purpose values to appropriate PromptTemplates.
    Handles template selection based on purpose field and other criteria.
    """
    
    # Purpose to template mapping configuration
    PURPOSE_MAPPING = {
        'lessonpackage': {
            'priority': 1,
            'description': 'Lesson Package Generation',
            'response_format': 'json',
            'model': 'gpt-4o-mini'
        },
        '12sessions': {
            'priority': 2,
            'description': '12-Session Training Program',
            'response_format': 'json',
            'model': 'gpt-4o-mini'
        },
        'talkingpoints': {
            'priority': 3,
            'description': 'Parent Meeting Talking Points',
            'response_format': 'text',
            'model': 'gpt-4o-mini'
        },
        'feedbackreport': {
            'priority': 4,
            'description': 'Performance Feedback Report',
            'response_format': 'text',
            'model': 'gpt-4o-mini'
        },
        'parentemail': {
            'priority': 5,
            'description': 'Parent Communication Email',
            'response_format': 'text',
            'model': 'gpt-4o-mini'
        }
    }
    
    @classmethod
    def get_template_by_purpose(cls, purpose: str, user=None) -> Optional[PromptTemplates]:
        """
        Get the most appropriate template for a given purpose.
        
        Args:
            purpose: The purpose string to match
            user: Optional user for filtering (future use)
            
        Returns:
            PromptTemplates instance or None if not found
        """
        if purpose not in cls.PURPOSE_MAPPING:
            return None
            
        # Get active templates for this purpose
        templates = PromptTemplates.objects.filter(
            purpose=purpose,
            status='active'
        ).order_by('-created_at')
        
        if not templates.exists():
            return None
            
        # Return the most recent active template
        return templates.first()
    
    @classmethod
    def get_all_available_purposes(cls) -> Dict[str, Dict[str, Any]]:
        """
        Get all available purposes with their configuration.
        
        Returns:
            Dictionary mapping purpose to configuration
        """
        return cls.PURPOSE_MAPPING.copy()
    
    @classmethod
    def get_purpose_info(cls, purpose: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific purpose.
        
        Args:
            purpose: The purpose string
            
        Returns:
            Configuration dictionary or None if not found
        """
        return cls.PURPOSE_MAPPING.get(purpose)
    
    @classmethod
    def get_templates_by_priority(cls, user=None) -> Dict[str, PromptTemplates]:
        """
        Get all available templates organized by purpose priority.
        
        Args:
            user: Optional user for filtering (future use)
            
        Returns:
            Dictionary mapping purpose to template instance
        """
        templates_by_purpose = {}
        
        for purpose in cls.PURPOSE_MAPPING.keys():
            template = cls.get_template_by_purpose(purpose, user)
            if template:
                templates_by_purpose[purpose] = template
                
        return templates_by_purpose
    
    @classmethod
    def get_recommended_template(cls, context: Dict[str, Any] = None) -> Optional[PromptTemplates]:
        """
        Get a recommended template based on context.
        
        Args:
            context: Optional context dictionary with hints about what template to use
            
        Returns:
            Recommended PromptTemplates instance or None
        """
        if not context:
            return None
            
        # Simple context-based selection logic
        if context.get('type') == 'training_program':
            if context.get('duration') == '12_sessions':
                return cls.get_template_by_purpose('12sessions')
            else:
                return cls.get_template_by_purpose('lessonpackage')
        elif context.get('type') == 'communication':
            if context.get('audience') == 'parents':
                if context.get('format') == 'email':
                    return cls.get_template_by_purpose('parentemail')
                else:
                    return cls.get_template_by_purpose('talkingpoints')
        elif context.get('type') == 'feedback':
            return cls.get_template_by_purpose('feedbackreport')
            
        return None
    
    @classmethod
    def validate_template_compatibility(cls, template: PromptTemplates, purpose: str) -> bool:
        """
        Validate if a template is compatible with a given purpose.
        
        Args:
            template: PromptTemplates instance
            purpose: Purpose string to validate against
            
        Returns:
            True if compatible, False otherwise
        """
        if not template or not purpose:
            return False
            
        # Check if template purpose matches
        if template.purpose != purpose:
            return False
            
        # Check if template is active
        if template.status != 'active':
            return False
            
        # Check if template has required fields
        if not template.prompt:
            return False
            
        return True
    
    @classmethod
    def get_template_stats(cls) -> Dict[str, Any]:
        """
        Get statistics about available templates.
        
        Returns:
            Dictionary with template statistics
        """
        stats = {
            'total_templates': PromptTemplates.objects.count(),
            'active_templates': PromptTemplates.objects.filter(status='active').count(),
            'archived_templates': PromptTemplates.objects.filter(status='archived').count(),
            'purposes_covered': [],
            'missing_purposes': []
        }
        
        for purpose in cls.PURPOSE_MAPPING.keys():
            if PromptTemplates.objects.filter(purpose=purpose, status='active').exists():
                stats['purposes_covered'].append(purpose)
            else:
                stats['missing_purposes'].append(purpose)
                
        return stats
