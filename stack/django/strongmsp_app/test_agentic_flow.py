"""
Test script for Agentic Flow System

This script demonstrates how to use the agentic flow system.
Run this after setting up the database and creating prompt templates.
"""

from django.contrib.auth import get_user_model
from strongmsp_app.models import Assessments, PromptTemplates, QuestionResponses
from strongmsp_app.services.agent_orchestrator import AgentOrchestrator
from strongmsp_app.services.confidence_analyzer import ConfidenceAnalyzer
from strongmsp_app.services.agentic_context_builder import AgenticContextBuilder

User = get_user_model()


def test_context_builder():
    """
    Test the AgenticContextBuilder functionality.
    """
    print("Testing AgenticContextBuilder...")
    
    try:
        # Initialize context builder
        builder = AgenticContextBuilder()
        print("✓ Context builder initialized")
        
        # Test athlete context
        mock_athlete = type('MockUser', (), {
            'get_full_name': lambda: 'John Smith',
            'username': 'john.smith',
            'email': 'john@example.com',
            'real_name': 'John Smith',
            'bio': 'Elite athlete'
        })()
        
        builder.add_athlete_context(mock_athlete)
        athlete_profile = builder.get_context_value('athlete_profile')
        print(f"✓ Athlete profile: {len(athlete_profile)} characters")
        
        # Test assessment context
        mock_assessment = type('MockAssessment', (), {
            'title': 'Pre-Season Assessment',
            'description': 'Comprehensive performance evaluation',
            'created_at': type('MockDateTime', (), {'strftime': lambda fmt: '2024-01-15 10:30'})()
        })()
        
        builder.add_assessment_context(mock_assessment)
        assessment_info = builder.get_context_value('assessment_info')
        print(f"✓ Assessment info: {len(assessment_info)} characters")
        
        # Test question responses
        mock_responses = [
            {'question': 'How confident do you feel?', 'category': 'confidence', 'response': 4, 'scale': 'onetofive'},
            {'question': 'Rate your focus', 'category': 'concentration', 'response': 3, 'scale': 'onetofive'},
            {'question': 'How motivated are you?', 'category': 'resilience__motivation', 'response': 5, 'scale': 'onetofive'}
        ]
        
        builder.add_question_responses(mock_responses)
        question_data = builder.get_context_value('question_responses')
        print(f"✓ Question responses: {len(question_data)} characters")
        
        # Test spider chart data
        mock_spider_data = {
            'confidence': {'avg': 4.2, 'total': 25, 'count': 6},
            'concentration': {'avg': 3.8, 'total': 19, 'count': 5},
            'resilience__motivation': {'avg': 4.5, 'total': 27, 'count': 6}
        }
        
        builder.add_spider_chart_data(mock_spider_data)
        spider_data = builder.get_context_value('spider_chart')
        print(f"✓ Spider chart data: {len(spider_data)} characters")
        
        # Test previous agent output
        mock_previous_output = "This is a sample report from a previous agent..."
        builder.add_previous_agent_output(mock_previous_output)
        previous_output = builder.get_context_value('previous_agent_output')
        print(f"✓ Previous agent output: {len(previous_output)} characters")
        
        # Test template instructions
        mock_template = type('MockTemplate', (), {
            'instructions': 'You are an expert sports psychologist analyzing athlete performance data.',
            'prompt': 'Generate a report for {athlete_name} based on {input_a} and {input_b}.'
        })()
        
        builder.add_template_instructions(mock_template)
        system_instructions = builder.get_context_value('system_instructions')
        print(f"✓ System instructions: {len(system_instructions)} characters")
        
        # Test token replacement
        template_text = "Generate a report for {athlete_name} based on {input_a} and {input_b}."
        replaced_text = builder.replace_template_tokens(template_text)
        print(f"✓ Token replacement: {replaced_text[:50]}...")
        
        # Test message building
        messages = builder.build_messages()
        print(f"✓ Built {len(messages)} messages for OpenAI")
        
        # Test debug info
        debug_info = builder.get_debug_info()
        print(f"✓ Debug info: {debug_info}")
        
        print("✓ All context builder tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Context builder test failed: {e}")
        return False


def test_agentic_flow():
    """
    Test the complete agentic flow system.
    """
    print("Testing Agentic Flow System...")
    
    # 1. Test ContextBuilder
    print("\n1. Testing AgenticContextBuilder...")
    context_success = test_context_builder()
    
    # 2. Test ConfidenceAnalyzer
    print("\n2. Testing ConfidenceAnalyzer...")
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
    
    # 3. Test AgentOrchestrator
    print("\n3. Testing AgentOrchestrator...")
    orchestrator = AgentOrchestrator()
    
    try:
        # Test coach lookup
        coach = orchestrator.get_athlete_coach(athlete_id)
        print(f"Coach found: {coach.get_full_name() if coach else 'None'}")
        
        # Test parent lookup
        parents = orchestrator.get_athlete_parents(athlete_id)
        print(f"Parents found: {len(parents)}")
        
        # Test prompt template lookup
        template = orchestrator.get_prompt_template_by_purpose('feedback_report')
        print(f"Template found: {template.purpose if template else 'None'}")
        
    except Exception as e:
        print(f"AgentOrchestrator test failed: {e}")
    
    # 4. Test API endpoints (simulation)
    print("\n4. Testing API endpoints...")
    
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
    
    print(f"\nAgentic Flow System test completed! Context builder: {'✓' if context_success else '✗'}")


def create_sample_prompt_templates():
    """
    Create sample prompt templates for testing.
    """
    print("Creating sample prompt templates...")
    
    # Sample templates for each agent
    templates_data = [
        {
            'purpose': 'feedback_report',
            'prompt': 'Generate a comprehensive feedback report for athlete {athlete_name} based on their assessment responses:\n\n{input_a}\n\nSpider chart data:\n{input_b}\n\nProvide insights and recommendations in under 600 words.',
            'instructions': 'You are an expert sports psychologist analyzing athlete performance data.',
            'model': 'gpt-4o-mini',
            'response_format': 'text'
        },
        {
            'purpose': 'talking_points',
            'prompt': 'Create talking points for a family conversation about {athlete_name}\'s assessment:\n\n{input_a}\n\nSpider chart data:\n{input_b}\n\nProvide 3-5 key talking points in short sentences.',
            'instructions': 'You are a family counselor helping parents understand their child\'s performance.',
            'model': 'gpt-4o-mini',
            'response_format': 'text'
        },
        {
            'purpose': 'scheduling_email',
            'prompt': 'Write a professional email to parents about {athlete_name}\'s assessment:\n\n{input_a}\n\nSpider chart data:\n{input_b}\n\nKeep it under 120 words and professional.',
            'instructions': 'You are a professional coach communicating with parents.',
            'model': 'gpt-4o-mini',
            'response_format': 'text'
        },
        {
            'purpose': 'curriculum',
            'prompt': 'Create a 12-session curriculum based on this report:\n\n{input_a}\n\nDesign a structured program with clear objectives.',
            'instructions': 'You are a training program designer creating structured curricula.',
            'model': 'gpt-4o-mini',
            'response_format': 'json'
        },
        {
            'purpose': 'lesson_plan',
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
