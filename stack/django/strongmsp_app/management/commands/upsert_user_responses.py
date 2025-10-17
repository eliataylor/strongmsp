import csv
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
from strongmsp_app.models import Questions, QuestionResponses, Assessments
from .utils import clean_question

User = get_user_model()

class Command(BaseCommand):
    help = 'Upsert users and their assessment responses from CSV file, and optionally update all responses to relate to a specific assessment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-file',
            type=str,
            default='question-responses.csv',
            help='Path to the CSV file containing user responses (default: question-responses.csv)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )
        parser.add_argument(
            '--default-password',
            type=str,
            default='makemestrong!',
            help='Default password for new users (default: makemestrong)'
        )
        parser.add_argument(
            '--update-assessment',
            type=int,
            help='Update all existing question responses to relate to this assessment ID'
        )
        parser.add_argument(
            '--force-assessment',
            action='store_true',
            help='Force assessment update even if assessment does not exist'
        )
        parser.add_argument(
            '--filter-questions',
            action='store_true',
            help='Only update responses for questions that exist in the target assessment'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        dry_run = options['dry_run']
        default_password = options['default_password']
        update_assessment = options['update_assessment']
        force_assessment = options['force_assessment']
        filter_questions = options['filter_questions']

        # Handle assessment update if requested
        if update_assessment:
            self._update_responses_assessment(
                update_assessment, dry_run, force_assessment, filter_questions
            )
            return

        csv_path = os.path.join(
            os.path.dirname(__file__), 
            csv_file
        )

        if not os.path.exists(csv_path):
            self.stdout.write(
                self.style.ERROR(f'CSV file not found: {csv_path}')
            )
            return

        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                # Read the file content and split by lines
                lines = file.readlines()
                
                if len(lines) < 3:
                    self.stdout.write(
                        self.style.ERROR('CSV file must have at least 3 lines: timestamp, questions, categories, and user responses')
                    )
                    return

                # Parse the questions row (line 1, index 0)
                questions_row = self._parse_csv_line(lines[0])
                
                # Parse the categories row (line 2, index 1) 
                categories_row = self._parse_csv_line(lines[1])
                
                # Skip the first 3 columns (timestamp, email, name) and get actual questions
                questions = questions_row[3:] if len(questions_row) > 3 else []
                categories = categories_row[3:] if len(categories_row) > 3 else []
                
                if len(questions) != len(categories):
                    self.stdout.write(
                        self.style.WARNING(f'Warning: Questions ({len(questions)}) and categories ({len(categories)}) have different lengths. Using {min(len(questions), len(categories))} items.')
                    )
                
                # Process user response rows (starting from line 3, index 2)
                user_responses = []
                for i in range(2, len(lines)):
                    if lines[i].strip():  # Skip empty lines
                        response_row = self._parse_csv_line(lines[i])
                        if len(response_row) >= 3:  # Must have timestamp, email, name
                            user_responses.append(response_row)
                
                if not user_responses:
                    self.stdout.write(
                        self.style.ERROR('No user response data found in CSV')
                    )
                    return

                self.stdout.write(f'Processing {len(user_responses)} users with {len(questions)} questions each...')

                if not dry_run:
                    with transaction.atomic():
                        self._process_users_and_responses(
                            user_responses, questions, categories, default_password
                        )
                else:
                    self._dry_run_process(user_responses, questions, categories)

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing CSV file: {str(e)}')
            )
            raise

    def _parse_csv_line(self, line):
        """Parse a CSV line, handling quoted fields properly"""
        line = line.strip()
        fields = []
        current_field = ""
        in_quotes = False
        
        for char in line:
            if char == '"':
                in_quotes = not in_quotes
            elif char == ',' and not in_quotes:
                fields.append(current_field.strip())
                current_field = ""
            else:
                current_field += char
        
        # Add the last field
        if current_field.strip():
            fields.append(current_field.strip())
        
        return fields

    def _process_users_and_responses(self, user_responses, questions, categories, default_password):
        """Process users and their responses, creating/updating as needed"""
        users_created = 0
        users_updated = 0
        responses_created = 0
        responses_updated = 0
        
        # First, ensure all questions exist
        question_objects = self._ensure_questions_exist(questions, categories)
        
        for user_row in user_responses:
            if len(user_row) < 3:
                continue
                
            timestamp_str = user_row[0]
            email = user_row[1].strip()
            name = user_row[2].strip()
            responses = user_row[3:] if len(user_row) > 3 else []
            
            if not email or not name:
                continue
            
            # Parse name into first and last name
            name_parts = name.split()
            first_name = name_parts[0] if name_parts else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
            # Create or update user
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'password': default_password,
                    'user_types': 'athlete'
                }
            )
            
            if user_created:
                users_created += 1
                # Mark the email as verified
                EmailAddress.objects.create(
                    user=user,
                    email=email,
                    verified=True,
                    primary=True,
                )
                self.stdout.write(f'✓ Created user: {email} ({name})')
            else:
                users_updated += 1
                # Update user info if needed
                if user.first_name != first_name or user.last_name != last_name:
                    user.first_name = first_name
                    user.last_name = last_name
                    user.save()
                self.stdout.write(f'↻ Updated user: {email} ({name})')
            
            # Process responses for this user
            for i, response_value in enumerate(responses):
                if i >= len(question_objects) or i >= len(questions):
                    break
                    
                if not response_value or response_value.strip() == "":
                    continue
                
                try:
                    response_int = int(response_value.strip())
                    if 1 <= response_int <= 5:  # Valid response range
                        question_obj = question_objects[i]
                        
                        # Create or update response
                        response_obj, response_created = QuestionResponses.objects.get_or_create(
                            author=user,
                            question=question_obj,
                            defaults={'response': response_int}
                        )
                        
                        if response_created:
                            responses_created += 1
                        else:
                            # Update existing response if different
                            if response_obj.response != response_int:
                                response_obj.response = response_int
                                response_obj.save()
                                responses_updated += 1
                
                except ValueError:
                    # Skip non-numeric responses
                    continue
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Successfully processed users and responses:\n'
                f'  • Users created: {users_created}\n'
                f'  • Users updated: {users_updated}\n'
                f'  • Responses created: {responses_created}\n'
                f'  • Responses updated: {responses_updated}\n'
            )
        )

    def _ensure_questions_exist(self, questions, categories):
        """Ensure all questions exist in the database, return list of question objects"""
        question_objects = []
        
        # Map category names to valid choices
        category_mapping = {
            'Performance Mindset': 'performance_mindset',
            'Emotional Regulation': 'emotional_regulation',
            'Confidence': 'confidence',
            'Resilience & Motivation': 'resilience__motivation',
            'Concentration': 'concentration',
            'Leadership': 'leadership',
            'Mental Well-being': 'mental_wellbeing'
        }
        
        for i, question_text in enumerate(questions):
            if not question_text:
                question_objects.append(None)
                continue
                
            # Clean the question text
            clean_question_text = clean_question(question_text)
            
            # Get category (default to mental_wellbeing if not found)
            category = categories[i] if i < len(categories) else 'Mental Well-being'
            mapped_category = category_mapping.get(category, 'mental_wellbeing')
            
            # Create or get question
            question, created = Questions.objects.get_or_create(
                title=clean_question_text,
                defaults={
                    'question_category': mapped_category,
                    'scale': 'onetofive'
                }
            )
            
            if created:
                self.stdout.write(f'✓ Created question: {clean_question_text[:50]}... ({mapped_category})')
            
            question_objects.append(question)
        
        return question_objects

    def _dry_run_process(self, user_responses, questions, categories):
        """Show what would be done without making changes"""
        self.stdout.write('\n🔍 Dry run - would process:')
        
        for user_row in user_responses:
            if len(user_row) >= 3:
                email = user_row[1].strip()
                name = user_row[2].strip()
                responses = user_row[3:] if len(user_row) > 3 else []
                
                if email and name:
                    self.stdout.write(f'  • User: {email} ({name})')
                    self.stdout.write(f'    Responses: {len([r for r in responses if r and r.strip()])} valid responses')
        
        self.stdout.write(f'\n  • Total questions to process: {len(questions)}')
        self.stdout.write(f'  • Total users to process: {len(user_responses)}')
        
        self.stdout.write(
            self.style.SUCCESS('\n🔍 Dry run completed - no changes made')
        )

    def _update_responses_assessment(self, assessment_id, dry_run, force, filter_questions):
        """Update all question responses to relate to a specific assessment"""
        from django.db.models import Q
        
        # Check if the target assessment exists
        try:
            target_assessment = Assessments.objects.get(id=assessment_id)
            self.stdout.write(
                self.style.SUCCESS(f'Found target assessment: {target_assessment.title} (ID: {assessment_id})')
            )
        except Assessments.DoesNotExist:
            if not force:
                self.stdout.write(
                    self.style.ERROR(f'Assessment with ID {assessment_id} does not exist. Use --force to proceed anyway.')
                )
                return
            else:
                self.stdout.write(
                    self.style.WARNING(f'Assessment with ID {assessment_id} does not exist, but proceeding with --force')
                )

        # Get all question responses
        responses = QuestionResponses.objects.all()
        total_responses = responses.count()
        
        if total_responses == 0:
            self.stdout.write(
                self.style.WARNING('No question responses found in the database')
            )
            return

        self.stdout.write(f'Found {total_responses} question responses to update')

        # If filtering by questions, get valid question IDs from the target assessment
        valid_question_ids = None
        if filter_questions and not force:
            try:
                assessment_questions = target_assessment.questions.all()
                valid_question_ids = set(assessment_questions.values_list('question_id', flat=True))
                self.stdout.write(f'Found {len(valid_question_ids)} questions in target assessment')
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error getting questions from assessment: {e}')
                )
                return

        # Filter responses if needed
        if valid_question_ids is not None:
            responses = responses.filter(question_id__in=valid_question_ids)
            filtered_count = responses.count()
            self.stdout.write(f'Filtered to {filtered_count} responses with questions in target assessment')

        # Show current state
        responses_with_assessment = responses.filter(assessment_id=assessment_id).count()
        responses_without_assessment = responses.filter(assessment__isnull=True).count()
        responses_with_other_assessment = responses.exclude(
            Q(assessment_id=assessment_id) | Q(assessment__isnull=True)
        ).count()

        self.stdout.write(f'Current state:')
        self.stdout.write(f'  - Responses already assigned to Assessment {assessment_id}: {responses_with_assessment}')
        self.stdout.write(f'  - Responses with no assessment: {responses_without_assessment}')
        self.stdout.write(f'  - Responses assigned to other assessments: {responses_with_other_assessment}')

        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN: Would update the following responses:')
            )
            for response in responses[:10]:  # Show first 10
                current_assessment = response.assessment.title if response.assessment else 'None'
                self.stdout.write(f'  - Response ID {response.id}: Question {response.question_id} -> Assessment {assessment_id} (was: {current_assessment})')
            
            if responses.count() > 10:
                self.stdout.write(f'  ... and {responses.count() - 10} more responses')
            
            self.stdout.write(
                self.style.SUCCESS(f'DRY RUN: Would update {responses.count()} responses to Assessment {assessment_id}')
            )
            return

        # Confirm before proceeding
        if not force:
            confirm = input(f'Are you sure you want to update {responses.count()} responses to Assessment {assessment_id}? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write('Operation cancelled')
                return

        # Perform the update
        try:
            with transaction.atomic():
                updated_count = 0
                for response in responses:
                    old_assessment = response.assessment.title if response.assessment else 'None'
                    response.assessment_id = assessment_id
                    response.save()
                    updated_count += 1
                    
                    if updated_count % 100 == 0:
                        self.stdout.write(f'Updated {updated_count} responses...')

                self.stdout.write(
                    self.style.SUCCESS(f'Successfully updated {updated_count} responses to Assessment {assessment_id}')
                )

                # Show final statistics
                final_responses = QuestionResponses.objects.filter(assessment_id=assessment_id).count()
                self.stdout.write(f'Total responses now assigned to Assessment {assessment_id}: {final_responses}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating responses: {e}')
            )
            raise
