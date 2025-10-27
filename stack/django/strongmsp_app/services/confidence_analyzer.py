"""
Confidence Analyzer Service

Generic utility for analyzing question responses across categories.
Extracted from QuestionResponseCategoryStatsView for reusability.
"""
from django.db.models import Sum, Count
from ..models import QuestionResponses, Questions


class ConfidenceAnalyzer:
    """
    Analyzes question responses and provides category-based statistics.
    """
    
    @staticmethod
    def get_category_stats(athlete_id, assessment_id=None):
        """
        Get aggregated sum of response values in QuestionResponses for each question category by a given author.
        
        Args:
            athlete_id: ID of the athlete
            assessment_id: Optional assessment ID to filter by
            
        Returns:
            List of dictionaries with category statistics
        """
        # Get all question responses for the given author
        responses = QuestionResponses.objects.filter(author_id=athlete_id)
        
        # Filter by assessment if provided
        if assessment_id:
            responses = responses.filter(assessment_id=assessment_id)

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

        return result
    
    @staticmethod
    def get_spider_chart_data(athlete_id, assessment_id=None):
        """
        Get data formatted specifically for spider chart visualization.
        
        Args:
            athlete_id: ID of the athlete
            assessment_id: Optional assessment ID to filter by
            
        Returns:
            Dictionary with category aggregations suitable for spider chart
        """
        category_stats = ConfidenceAnalyzer.get_category_stats(athlete_id, assessment_id)
        
        # Convert to spider chart format
        spider_data = {}
        for stat in category_stats:
            category = stat['category']
            spider_data[category] = {
                'total': stat['total_response'],
                'avg': stat['average_response'],
                'count': stat['response_count']
            }
        
        return spider_data
    
    @staticmethod
    def get_question_responses_data(athlete_id, assessment_id=None):
        """
        Get detailed question responses data for agent input.
        
        Args:
            athlete_id: ID of the athlete
            assessment_id: Optional assessment ID to filter by
            
        Returns:
            List of dictionaries with question details and responses
        """
        responses = QuestionResponses.objects.filter(author_id=athlete_id)
        
        if assessment_id:
            responses = responses.filter(assessment_id=assessment_id)
        
        # Include question details
        responses = responses.select_related('question')
        
        result = []
        for response in responses:
            if response.question:  # Ensure question exists
                result.append({
                    'question': response.question.title,
                    'category': response.question.question_category,
                    'response': response.response,
                    'scale': response.question.scale,
                    'help_text': response.question.help_text
                })
        
        return result

    @staticmethod
    def update_user_category_scores(user_id, assessment_id):
        """
        Calculate category stats and update them on the Users model.
        
        Args:
            user_id: ID of the user
            assessment_id: ID of the assessment just completed
        """
        from ..models import Users
        
        # Get the user
        try:
            user = Users.objects.get(id=user_id)
        except Users.DoesNotExist:
            return
        
        # Calculate category stats for this assessment
        category_stats = ConfidenceAnalyzer.get_category_stats(user_id, assessment_id)
        
        # Map category names to field names
        category_field_mapping = {
            'performance_mindset': 'category_performance_mindset',
            'emotional_regulation': 'category_emotional_regulation',
            'confidence': 'category_confidence',
            'resilience__motivation': 'category_resilience_motivation',
            'concentration': 'category_concentration',
            'leadership': 'category_leadership',
            'mental_wellbeing': 'category_mental_wellbeing',
        }
        
        # Update user fields
        update_fields = []
        for stat in category_stats:
            category = stat['category']
            field_name = category_field_mapping.get(category)
            if field_name:
                setattr(user, field_name, stat['average_response'])
                update_fields.append(field_name)
        
        if update_fields:
            user.save(update_fields=update_fields)
