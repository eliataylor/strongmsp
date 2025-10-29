from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from strongmsp_app.models import (
    Organizations, UserOrganizations, PaymentAssignments,
    QuestionResponses, Questions, AssessmentQuestions, Assessments
)
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Complete assessments with random question responses for a given organization ID'

    def add_arguments(self, parser):
        parser.add_argument(
            'organization_id',
            type=int,
            help='Organization ID to complete assessments for'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing responses (default: skip assessments with existing responses)'
        )

    def handle(self, *args, **options):
        organization_id = options['organization_id']
        dry_run = options['dry_run']
        overwrite = options['overwrite']

        try:
            organization = Organizations.objects.get(id=organization_id)
        except Organizations.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Organization with ID {organization_id} does not exist')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Found organization: {organization.name} (ID: {organization_id})')
        )

        # Get all users in the organization
        user_orgs = UserOrganizations.objects.filter(
            organization=organization,
            is_active=True
        ).select_related('user')

        if not user_orgs.exists():
            self.stdout.write(
                self.style.WARNING('No active users found in this organization')
            )
            return

        self.stdout.write(f'Found {user_orgs.count()} active users in the organization')

        # Get the first 40 users from user_orgs and extract user IDs
        user_orgs_list = list(user_orgs[:40])
        user_ids = [uo.user.id for uo in user_orgs_list]
        
        self.stdout.write(f'Processing first 40 users: {len(user_orgs_list)} users')
        self.stdout.write(f'User IDs: {user_ids[:5]}...')  # Debug: show first 5 user IDs

        # Get the first payment assignment to determine which assessment to use
        first_assignment = PaymentAssignments.objects.filter(
            athlete_id__in=user_ids
        ).select_related('payment', 'payment__product', 'payment__product__pre_assessment').first()
        
        # Debug: Check if any assignments exist at all
        total_assignments = PaymentAssignments.objects.filter(athlete_id__in=user_ids).count()
        self.stdout.write(f'Total payment assignments found for these users: {total_assignments}')

        if not first_assignment:
            self.stdout.write(
                self.style.WARNING('No payment assignments found for these users')
            )
            return

        # Get the assessment from the first assignment
        assessment = first_assignment.payment.product.pre_assessment
        if not assessment:
            self.stdout.write(
                self.style.ERROR('First assignment does not have a pre-assessment')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f'Using assessment: {assessment.title} (ID: {assessment.id}) from first assignment'
            )
        )

        # Process each user in the user_orgs list
        processed_count = 0
        skipped_count = 0
        created_responses = 0

        for user_org in user_orgs_list:
            user = user_org.user
            result = self._process_user_assessment(
                user,
                assessment,
                overwrite,
                dry_run
            )

            if result['processed']:
                processed_count += 1
                created_responses += result['responses_count']
            else:
                skipped_count += 1

        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes were made'))
        self.stdout.write(self.style.SUCCESS(
            f'Summary:\n'
            f'  • Users processed: {processed_count}\n'
            f'  • Users skipped: {skipped_count}\n'
            f'  • Responses created: {created_responses}\n'
        ))
        self.stdout.write(self.style.SUCCESS('=' * 60))

    def _process_user_assessment(self, user, assessment, overwrite, dry_run):
        """Process a single user and create responses for the assessment"""
        result = {
            'processed': False,
            'responses_count': 0
        }

        # Check if responses already exist
        existing_responses = QuestionResponses.objects.filter(
            author=user,
            assessment=assessment
        ).count()

        if existing_responses > 0 and not overwrite:
            self.stdout.write(
                f'  [{user}] Skipping: {existing_responses} existing responses (use --overwrite to replace)'
            )
            return result

        # Get assessment questions
        assessment_questions = AssessmentQuestions.objects.filter(
            questions_to_assessments=assessment
        ).select_related('question').order_by('order')

        if not assessment_questions.exists():
            self.stdout.write(f'  [{user}] No questions found in assessment')
            return result

        question_count = assessment_questions.count()
        self.stdout.write(
            f'  [{user}] Processing {assessment.title} - {question_count} questions'
        )

        if not dry_run:
            with transaction.atomic():
                # Delete existing responses if overwrite
                if existing_responses > 0 and overwrite:
                    QuestionResponses.objects.filter(
                        author=user,
                        assessment=assessment
                    ).delete()
                    self.stdout.write(f'    Deleted {existing_responses} existing responses')

                # Create random responses for each question
                for assessment_question in assessment_questions:
                    question = assessment_question.question
                    random_response = self._generate_random_response(question)

                    QuestionResponses.objects.create(
                        author=user,
                        question=question,
                        assessment=assessment,
                        response=random_response
                    )
                    result['responses_count'] += 1
        else:
            # Dry run: just count what would be created
            result['responses_count'] = question_count
            if existing_responses > 0 and overwrite:
                self.stdout.write(f'    Would delete {existing_responses} existing responses')

        self.stdout.write(
            self.style.SUCCESS(
                f'    ✓ Created/updated {result["responses_count"]} responses'
            )
        )

        result['processed'] = True
        return result

    def _generate_random_response(self, question):
        """Generate a random response value based on the question's scale"""
        if not question.scale:
            # Default to 1-5 if no scale specified
            return random.randint(1, 5)

        if question.scale == 'onetofive':
            return random.randint(1, 5)
        elif question.scale == 'onetoten':
            return random.randint(1, 10)
        elif question.scale == 'percentage':
            return random.randint(0, 100)
        else:
            # Default to 1-5 for unknown scales
            self.stdout.write(
                self.style.WARNING(
                    f'    Unknown scale type: {question.scale}, defaulting to 1-5'
                )
            )
            return random.randint(1, 5)
