"""
Test script for Agentic Flow System

This script demonstrates how to use the agentic flow system.
Run this after setting up the database and creating prompt templates.
"""

from django.contrib.auth import get_user_model
from strongmsp_app.models import Assessments, PromptTemplates, QuestionResponses
from strongmsp_app.services.agent_orchestrator import AgentOrchestrator
from strongmsp_app.services.confidence_analyzer import ConfidenceAnalyzer

User = get_user_model()


def test_agentic_flow():
    """
    Test the complete agentic flow system.
    """
    print("Testing Agentic Flow System...")
    
    # 1. Test ConfidenceAnalyzer
    print("\n1. Testing ConfidenceAnalyzer...")
    analyzer = ConfidenceAnalyzer()
    
    # Get test data (assuming you have some question responses)
    athlete_id = 1  # Replace with actual athlete ID
    assessment_id = 1  # Replace with actual assessment ID
    
    try:
        category_stats = analyzer.get_category_stats(athlete_id, assessment_id)
        print(f"Category stats: {len(category_stats)} categories found")
        
        spider_data = analyzer.get_spider_chart_data(athlete_id, assessment_id)
        print(f"Spider chart data: {len(spider_data)} categories")
        
        question_data = analyzer.get_question_responses_data(athlete_id, assessment_id)
        print(f"Question responses: {len(question_data)} responses")
        
    except Exception as e:
        print(f"ConfidenceAnalyzer test failed: {e}")
    
    # 2. Test AgentOrchestrator
    print("\n2. Testing AgentOrchestrator...")
    orchestrator = AgentOrchestrator()
    
    try:
        # Test coach lookup
        coach = orchestrator.get_athlete_coach(athlete_id)
        print(f"Coach found: {coach.get_full_name() if coach else 'None'}")
        
        # Test parent lookup
        parents = orchestrator.get_athlete_parents(athlete_id)
        print(f"Parents found: {len(parents)}")
        
        # Test prompt template lookup
        template = orchestrator.get_prompt_template_by_purpose('feedbackreport')
        print(f"Template found: {template.purpose if template else 'None'}")
        
    except Exception as e:
        print(f"AgentOrchestrator test failed: {e}")
    
    # 3. Test API endpoints (simulation)
    print("\n3. Testing API endpoints...")
    
    # Simulate trigger_agents endpoint
    try:
        # Check 90% completion
        total_questions = QuestionResponses.objects.filter(
            author_id=athlete_id, 
            assessment_id=assessment_id
        ).count()
        
        print(f"Total questions answered: {total_questions}")
        
        if total_questions >= 45:  # 90% of 50
            print("Assessment is 90%+ complete - agents can be triggered")
            
            # Uncomment to actually trigger agents (requires OpenAI API key)
            # agent_responses = orchestrator.trigger_assessment_agents(athlete_id, assessment_id)
            # print(f"Triggered {len(agent_responses)} agents")
        else:
            print("Assessment not complete enough for agent triggering")
            
    except Exception as e:
        print(f"API endpoint test failed: {e}")
    
    print("\nAgentic Flow System test completed!")


def create_sample_prompt_templates():
    """
    Create sample prompt templates for testing.
    """
    print("Creating sample prompt templates...")
    
    # Sample templates for each agent
    templates_data = [
        {
            'purpose': 'feedbackreport',
            'prompt': 'Generate a comprehensive feedback report for athlete {athlete_name} based on their assessment responses:\n\n{input_a}\n\nSpider chart data:\n{input_b}\n\nProvide insights and recommendations in under 600 words.',
            'instructions': 'You are an expert sports psychologist analyzing athlete performance data.',
            'model': 'gpt-4o-mini',
            'response_format': 'text'
        },
        {
            'purpose': 'talkingpoints',
            'prompt': 'Create talking points for a family conversation about {athlete_name}\'s assessment:\n\n{input_a}\n\nSpider chart data:\n{input_b}\n\nProvide 3-5 key talking points in short sentences.',
            'instructions': 'You are a family counselor helping parents understand their child\'s performance.',
            'model': 'gpt-4o-mini',
            'response_format': 'text'
        },
        {
            'purpose': 'parentemail',
            'prompt': 'Write a professional email to parents about {athlete_name}\'s assessment:\n\n{input_a}\n\nSpider chart data:\n{input_b}\n\nKeep it under 120 words and professional.',
            'instructions': 'You are a professional coach communicating with parents.',
            'model': 'gpt-4o-mini',
            'response_format': 'text'
        },
        {
            'purpose': '12sessions',
            'prompt': 'Create a 12-session curriculum based on this report:\n\n{input_a}\n\nDesign a structured program with clear objectives.',
            'instructions': 'You are a training program designer creating structured curricula.',
            'model': 'gpt-4o-mini',
            'response_format': 'json'
        },
        {
            'purpose': 'lessonpackage',
            'prompt': 'Create a lesson plan package based on this curriculum:\n\n{input_a}\n\nInclude lesson plan key, slide deck outline, and facilitator script with coaching tips.',
            'instructions': 'You are an educational content creator designing comprehensive lesson packages.',
            'model': 'gpt-4o-mini',
            'response_format': 'json'
        }
    ]
    
    created_count = 0
    for template_data in templates_data:
        template, created = PromptTemplates.objects.get_or_create(
            purpose=template_data['purpose'],
            defaults={
                'prompt': template_data['prompt'],
                'instructions': template_data['instructions'],
                'model': template_data['model'],
                'response_format': template_data['response_format'],
                'status': 'active'
            }
        )
        
        if created:
            created_count += 1
            print(f"Created template: {template.purpose}")
        else:
            print(f"Template already exists: {template.purpose}")
    
    print(f"Created {created_count} new prompt templates")


if __name__ == '__main__':
    # Uncomment to create sample templates
    # create_sample_prompt_templates()
    
    # Run tests
    test_agentic_flow()
