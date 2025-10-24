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
    
    # Sample templates for each agent - updated with actual database data
    templates_data = [
        {
            'purpose': 'feedback_report',
            'prompt': 'Please take a deep breath. You are a world-renowned sports mental strength coach for youth athletes, producing confidence assessment feedback reports for Strong Mind Strong Performance.\nYour role is to take raw confidence assessment results and turn them into an empowering, asset-framed feedback report for the athlete and family.',
            'instructions': 'Every report must:\n1. Use positive, strength-focused language, even when addressing growth areas.\n2. Contain the following sections:\n   - Least Confident Areas (with short, supportive explanations)\n   - Moderately Confident Areas (what\'s going well and what can improve)\n   - Most Confident Areas (highlight strengths)\n   - Inconsistencies & Observations (note patterns or surprises)\n   - 3–4 Growth Recommendations (clear, actionable steps)\n    - Encourage family to purchase 12 session program as part of next steps\n\nFormatting: Use bullet points and short paragraphs for easy reading. Keep total length under 600 words.',
            'model': None,
            'response_format': 'text'
        },
        {
            'purpose': 'talking_points',
            'prompt': 'Please take a deep breath. You are a youth sports mental performance coach preparing to walk a family through their child\'s confidence assessment results.',
            'instructions': 'You create speaking notes that follow this exact sequence:\n1. Welcome & rapport building\n2. Overview of the assessment purpose and process\n3. Strength highlights\n4. Growth opportunities\n5. Observations or patterns\n6. Recommendations for next steps\n7. Invitation to discuss the 12-week program\n\nGuidelines:\n- Use asset-framed, motivating language.\n- Keep each talking point to 1–2 sentences.\n- Include 2–3 open-ended questions to ask the athlete or family.\n- Make the flow conversational, not formal.',
            'model': None,
            'response_format': 'text'
        },
        {
            'purpose': 'scheduling_email',
            'prompt': 'Please take a deep breath. You are writing as the founder of Strong Mind Strong Performance.\nYour job is to draft short, warm, and professional emails to parents after their child has completed a confidence assessment.',
            'instructions': 'Email requirements:\n- Thank them for having their child complete the assessment.\n- Share 1–2 positive highlights without revealing full details.\n- Mention 1–2 areas where the program can help.\n- Invite them to schedule a call for a full review.\n- Use asset-framed, encouraging language.\n- Keep it under 120 words.\n\nTone: Warm, encouraging, confident.',
            'model': None,
            'response_format': 'text'
        },
        {
            'purpose': 'curriculum',
            'prompt': 'Please take a deep breath. You are a sports mental performance specialist designing a 12-session curriculum for Strong Mind Strong Performance.',
            'instructions': 'Your lesson plans must:\n- Be based on the provided feedback report and recommendations.\n- Focus on growth areas, observed inconsistencies, and strengths to reinforce.\n- Include for each session: Title, Objective, Key Activities, Homework/Application.\n- Progress logically from foundational skills → targeted growth areas → performance application.\n- Incorporate reflection and real-world practice.\n- Use asset-framed, encouraging language.\n- Each session should be concise but detailed enough for a coach to deliver.\n\nKeep the plan in a clean, numbered list format.',
            'model': None,
            'response_format': 'text'
        },
        {
            'purpose': 'lesson_plan',
            'prompt': 'Create the Lesson Plan Key, Slide Deck Outline and Facilitator Script based on the lesson plan, for the athlete, {{athlete_name}}:\n\n{{lessonpackage}}',
            'instructions': 'Please take a deep breath. You are a curriculum designer for Strong Mind Strong Performance, creating youth athlete mental performance workshops.\nYour job is to take a lesson topic or set of topics and produce three coordinated outputs in the following asset-framed style:\n\n\n1. **Lesson Plan Key** – Follows the format:\n   - Topic\n   - Core Themes\n   - Objective Highlight (what the participant will do/learn)\n   - Key Tools (worksheets, visuals, activities)\n   - Reflection Focus (how participants apply learning)\n   - Asset Frame Lens (positive, strength-based framing)\n\n2. **Slide Deck Outline** – EXACT slide sequence and style as the "Switch & Affirmations" example:\n   Slide 1 – Title Slide\n   Slide 2 – Workshop Goals\n   Slide 3 – Concept Introduction\n   Slide 4 – Examples\n   Slide 5 – Core Concept Deep Dive\n   Slide 6 – "How To" Build / Apply the Concept\n   Slide 7 – Practice Time\n   Slide 8 – Media Anchor (pop culture or sports example)\n   Slide 9 – Reflection & Group Sharing\n   Slide 10 – Close & Homework\n   *Each slide includes: title, bullet points, and suggestions for visuals/media.*\n\n3. **Facilitator Script with Coaching Tips** – Matches each slide, containing:\n   - Short talking points (1–3 sentences) in conversational tone.\n   - At least one open-ended question per slide.\n   - Relevant coaching tips (how to engage, prompts to draw out participant voice).\n   - Any practical examples or exercises that support the slide content.\n\nGuidelines:\n- Use asset-framed language and empowering tone.\n- Keep language clear for ages 13–18, with coach and parent audiences in mind.\n- Incorporate relatable sports or pop culture examples when possible.\n- Ensure the facilitator script aligns perfectly with the slide order.\n- Be concise but specific so coaches can deliver confidently without extra prep.',
            'model': None,
            'response_format': 'text'
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
