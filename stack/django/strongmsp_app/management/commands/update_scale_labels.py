from django.core.management.base import BaseCommand
from strongmsp_app.models import Questions


class Command(BaseCommand):
    help = 'Update existing Questions with scale="onetofive" to use new confidence scale labels'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get all questions with onetofive scale that don't have custom labels
        questions = Questions.objects.filter(
            scale='onetofive',
            scale_choice_labels__isnull=True
        )
        
        total_questions = questions.count()
        
        if total_questions == 0:
            self.stdout.write(
                self.style.SUCCESS('No questions found that need updating.')
            )
            return
        
        self.stdout.write(f'Found {total_questions} questions to update.')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - No changes will be made')
            )
            for question in questions:
                self.stdout.write(f'  - Question {question.id}: "{question.title}"')
        else:
            # Update questions with new labels
            updated_count = 0
            for question in questions:
                question.scale_choice_labels = Questions.get_default_confidence_scale_labels()
                question.save()
                updated_count += 1
                self.stdout.write(f'  ✓ Updated Question {question.id}: "{question.title}"')
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated_count} questions.')
            )
