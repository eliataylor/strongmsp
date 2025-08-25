import csv
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from strongmsp_app.models import Questions, AssessmentQuestions, Assessments
from .utils import clean_question


class Command(BaseCommand):
    help = 'Create an Assessment with ordered questions from existing Questions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-file',
            type=str,
            default='assessment.csv',
            help='Path to the CSV file containing assessment questions and categories (default: assessment.csv)'
        )
        parser.add_argument(
            '--assessment-title',
            type=str,
            default='Mental Performance Assessment',
            help='Title for the assessment (default: Mental Performance Assessment)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        assessment_title = options['assessment_title']
        dry_run = options['dry_run']

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
                
                if len(lines) < 1:
                    self.stdout.write(
                        self.style.ERROR('CSV file must have at least 1 line with questions')
                    )
                    return

                # Parse the first line as questions (split by comma, handling quotes)
                questions_row = []
                current_question = ""
                in_quotes = False
                
                for char in lines[0].strip():
                    if char == '"':
                        in_quotes = not in_quotes
                    elif char == ',' and not in_quotes:
                        questions_row.append(current_question.strip())
                        current_question = ""
                    else:
                        current_question += char
                
                # Add the last question
                if current_question.strip():
                    questions_row.append(current_question.strip())

                total_questions = len(questions_row)
                
                if total_questions == 0:
                    self.stdout.write(
                        self.style.ERROR('No valid questions found')
                    )
                    return

                self.stdout.write(f'Processing {total_questions} questions for assessment...')

                if not dry_run:
                    with transaction.atomic():
                        # Create or get the assessment
                        assessment, assessment_created = Assessments.objects.get_or_create(
                            title=assessment_title,
                            defaults={'title': assessment_title}
                        )

                        if assessment_created:
                            self.stdout.write(f'✓ Created assessment: {assessment_title}')
                        else:
                            self.stdout.write(f'↻ Assessment already exists: {assessment_title}')

                        # Clear existing questions from this assessment
                        AssessmentQuestions.objects.filter(questions_to_assessments=assessment).delete()
                        self.stdout.write(f'↻ Cleared existing questions from assessment')

                        assessment_questions_created = 0

                        # Create AssessmentQuestions for each question in order
                        for i, question_text in enumerate(questions_row):
                            if not question_text.strip():
                                continue

                            # Use shared clean_question function
                            clean_question_text = clean_question(question_text)

                            # Find the corresponding Questions object
                            try:
                                question_obj = Questions.objects.get(title=clean_question_text)
                                
                                # Create AssessmentQuestions object with proper order and question
                                assessment_question = AssessmentQuestions.objects.create(
                                    question=question_obj,
                                    order=i + 1,
                                    conditions=None  # Leave conditions null for now
                                )
                                
                                # Add the assessment question to the assessment
                                assessment.questions.add(assessment_question)
                                
                                assessment_questions_created += 1
                                self.stdout.write(f'✓ Added question {i+1}: {clean_question_text[:50]}...')
                                
                            except Questions.DoesNotExist:
                                self.stdout.write(
                                    self.style.WARNING(f'⚠ Question not found: {clean_question_text[:50]}...')
                                )

                else:
                    # Dry run - just show what would be done
                    self.stdout.write(f'Would create assessment: {assessment_title}')
                    self.stdout.write(f'Would process {total_questions} questions in order')
                    
                    for i, question_text in enumerate(questions_row):
                        if not question_text.strip():
                            continue
                        
                        clean_question_text = clean_question(question_text)
                        self.stdout.write(f'Would add question {i+1}: {clean_question_text[:50]}...')

                # Summary
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'\n🔍 Dry run completed:\n'
                            f'  • Would create assessment: {assessment_title}\n'
                            f'  • Would process {total_questions} questions\n'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'\n🎉 Successfully created assessment:\n'
                            f'  • Assessment: {assessment_title}\n'
                            f'  • Total questions processed: {total_questions}\n'
                            f'  • AssessmentQuestions created: {assessment_questions_created}\n'
                        )
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing CSV file: {str(e)}')
            )
            raise
