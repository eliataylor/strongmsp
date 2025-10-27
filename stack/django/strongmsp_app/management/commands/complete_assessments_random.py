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
            '--assessment-type',
            choices=['pre', 'post', 'both'],
            default='pre',
            help='Type of assessment to complete (default: pre)'
        )
        parser.add_argument(
            '--only-incomplete',
            action='store_true',
            help='Only complete assessments that have not been submitted yet'
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing responses (default: skip assessments with existing responses)'
        )

    def handle(self, *args, **options):
        organization_id = options['organization_id']
        dry_run = options['dry_run']
        assessment_type = options['assessment_type']
        only_incomplete = options['only_incomplete']
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

        # Get all PaymentAssignments for these users
        user_ids = [uo.user.id for uo in user_orgs]
        assignments = PaymentAssignments.objects.filter(
            athlete_id__in=user_ids
        ).select_related('payment', 'payment__product', 'athlete', 'payment__product__pre_assessment')

        if assessment_type in ['pre', 'both']:
            assignments = assignments.filter(payment__product__pre_assessment__isnull=False)

        if not assignments.exists():
            self.stdout.write(
                self.style.WARNING('No payment assignments with assessments found for these users')
            )
            return

        self.stdout.write(f'Found {assignments.count()} payment assignments with assessments')

        # Process each assignment
        processed_count = 0
        skipped_count = 0
        created_responses = 0

        for assignment in assignments:
            result = self._process_assignment(
                assignment,
                assessment_type,
                only_incomplete,
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
            f'  • Assignments processed: {processed_count}\n'
            f'  • Assignments skipped: {skipped_count}\n'
            f'  • Responses created: {created_responses}\n'
        ))
        self.stdout.write(self.style.SUCCESS('=' * 60))

    def _process_assignment(self, assignment, assessment_type, only_incomplete, overwrite, dry_run):
        """Process a single assignment and create responses"""
        result = {
            'processed': False,
            'responses_count': 0
        }

        athlete = assignment.athlete
        product = assignment.payment.product

        if not athlete:
            self.stdout.write('  Skipping assignment without athlete')
            return result

        # Determine which assessment(s) to process
        assessments_to_process = []

        if assessment_type in ['pre', 'both']:
            if product.pre_assessment:
                # Check if already submitted
                if assignment.pre_assessment_submitted_at:
                    if only_incomplete:
                        self.stdout.write(
                            f'  [{athlete}] Skipping: pre-assessment already submitted'
                        )
                        return result
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  [{athlete}] Pre-assessment already submitted, will update'
                            )
                        )

                assessments_to_process.append({
                    'assessment': product.pre_assessment,
                    'submitted_field': 'pre_assessment_submitted_at',
                    'type': 'pre'
                })

        if assessment_type in ['post', 'both']:
            # Get post assessments - they can be multiple
            if assignment.payment.product.post_assessment:
                if assignment.post_assessment_submitted_at and only_incomplete:
                    self.stdout.write(
                        f'  [{athlete}] Skipping: post-assessment already submitted'
                    )
                    # Continue to pre-assessments if requested
                else:
                    assessments_to_process.append({
                        'assessment': assignment.payment.product.post_assessment,
                        'submitted_field': 'post_assessment_submitted_at',
                        'type': 'post'
                    })

        if not assessments_to_process:
            self.stdout.write(f'  [{athlete}] No assessments to process')
            return result

        # Process each assessment
        total_responses = 0
        for assessment_data in assessments_to_process:
            assessment = assessment_data['assessment']
            assessment_type_name = assessment_data['type']

            # Check if responses already exist
            existing_responses = QuestionResponses.objects.filter(
                author=athlete,
                assessment=assessment
            ).count()

            if existing_responses > 0 and not overwrite:
                self.stdout.write(
                    f'  [{athlete}] Skipping {assessment_type_name}-assessment: '
                    f'{existing_responses} existing responses (use --overwrite to replace)'
                )
                continue

            # Get assessment questions
            assessment_questions = AssessmentQuestions.objects.filter(
                questions_to_assessments=assessment
            ).select_related('question').order_by('order')

            if not assessment_questions.exists():
                self.stdout.write(
                    f'  [{athlete}] No questions found in {assessment_type_name}-assessment'
                )
                continue

            question_count = assessment_questions.count()
            self.stdout.write(
                f'  [{athlete}] Processing {assessment_type_name}-assessment '
                f'(ID: {assessment.id}) - {question_count} questions'
            )

            if not dry_run:
                with transaction.atomic():
                    # Delete existing responses if overwrite
                    if existing_responses > 0 and overwrite:
                        QuestionResponses.objects.filter(
                            author=athlete,
                            assessment=assessment
                        ).delete()
                        self.stdout.write(f'    Deleted {existing_responses} existing responses')

                    # Create random responses for each question
                    for assessment_question in assessment_questions:
                        question = assessment_question.question
                        random_response = self._generate_random_response(question)

                        QuestionResponses.objects.create(
                            author=athlete,
                            question=question,
                            assessment=assessment,
                            response=random_response
                        )
                        total_responses += 1

                    # Update submission timestamp
                    if assessment_data['submitted_field'] == 'pre_assessment_submitted_at':
                        assignment.pre_assessment_submitted_at = timezone.now()
                    else:
                        assignment.post_assessment_submitted_at = timezone.now()
                    assignment.save()
            else:
                # Dry run: just count what would be created
                total_responses += question_count
                if existing_responses > 0 and overwrite:
                    self.stdout.write(f'    Would delete {existing_responses} existing responses')

            self.stdout.write(
                self.style.SUCCESS(
                    f'    ✓ Created/updated {question_count} responses for {assessment_type_name}-assessment'
                )
            )

        result['processed'] = True
        result['responses_count'] = total_responses
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
