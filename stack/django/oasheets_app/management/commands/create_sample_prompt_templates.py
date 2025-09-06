from django.core.management.base import BaseCommand
from strongmsp_app.models import PromptTemplates


class Command(BaseCommand):
    help = 'Create sample prompt templates for testing'

    def handle(self, *args, **options):
        # Create sample prompt templates
        templates_data = [
            {
                'prompt': 'Analyze the following athlete performance data and provide coaching feedback:\n\n{message_body}\n\nPlease focus on:\n- Technical improvements\n- Mental preparation\n- Training recommendations\n- Areas for growth',
                'instructions': 'You are an expert sports performance coach with 20+ years of experience. Provide detailed, actionable feedback that will help athletes improve their performance. Be encouraging but honest about areas that need improvement.',
                'model': 'gpt-4o-mini',
                'status': 'active',
                'purpose': 'feedbackreport',
                'response_format': 'text'
            },
            {
                'prompt': 'Create a personalized lesson package for {athlete_name} based on their current skill level and goals:\n\n{message_body}\n\nInclude:\n- Weekly training schedule\n- Specific exercises with descriptions\n- Progress milestones\n- Mental training components\n- Recovery recommendations',
                'instructions': 'You are a professional sports coach specializing in personalized training programs. Create comprehensive, structured lesson packages that are progressive and achievable. Focus on both physical and mental development.',
                'model': 'gpt-4o-mini',
                'status': 'active',
                'purpose': 'lessonpackage',
                'response_format': 'json'
            },
            {
                'prompt': 'Generate talking points for a parent meeting about {athlete_name}:\n\n{message_body}\n\nCover:\n- Current performance status\n- Areas of improvement\n- Training plan overview\n- Parent involvement suggestions\n- Next steps and goals',
                'instructions': 'You are an experienced youth sports coach who excels at communicating with parents. Create clear, encouraging talking points that build trust and engagement. Be honest about challenges while highlighting progress.',
                'model': 'gpt-4o-mini',
                'status': 'active',
                'purpose': 'talkingpoints',
                'response_format': 'text'
            },
            {
                'prompt': 'Draft a professional email to parents about their child\'s progress:\n\nAthlete: {athlete_name}\nContext: {message_body}\n\nTone: Professional, encouraging, and informative\n\nInclude:\n- Greeting and context\n- Progress highlights\n- Areas for improvement\n- Next steps\n- Closing and contact information',
                'instructions': 'You are a professional sports coach writing to parents. Use a warm, professional tone that builds trust and engagement. Be specific about progress and clear about expectations.',
                'model': 'gpt-4o-mini',
                'status': 'active',
                'purpose': 'parentemail',
                'response_format': 'text'
            },
            {
                'prompt': 'Design a 12-session training program for {athlete_name}:\n\n{message_body}\n\nStructure:\n- Session objectives\n- Progressive difficulty\n- Skill assessments\n- Recovery periods\n- Mental training components\n- Parent communication points',
                'instructions': 'You are a certified sports performance specialist. Create scientifically-based, progressive training programs that are age-appropriate and developmentally sound. Include both physical and mental training elements.',
                'model': 'gpt-4o-mini',
                'status': 'active',
                'purpose': '12sessions',
                'response_format': 'json'
            }
        ]

        created_count = 0
        updated_count = 0
        
        for template_data in templates_data:
            template, created = PromptTemplates.objects.get_or_create(
                purpose=template_data['purpose'],
                defaults=template_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created template: {template.purpose}')
                )
            else:
                # Update existing template with new data
                for key, value in template_data.items():
                    setattr(template, key, value)
                template.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated template: {template.purpose}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} new prompt templates and updated {updated_count} existing ones')
        )
        
        # Display template statistics
        total_templates = PromptTemplates.objects.count()
        active_templates = PromptTemplates.objects.filter(status='active').count()
        
        self.stdout.write(f'Total templates: {total_templates}')
        self.stdout.write(f'Active templates: {active_templates}')
        
        # List all purposes covered
        purposes = PromptTemplates.objects.filter(status='active').values_list('purpose', flat=True).distinct()
        self.stdout.write(f'Purposes covered: {", ".join(purposes)}')
