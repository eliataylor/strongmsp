import csv
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from strongmsp_app.models import Questions, AssessmentQuestions, Assessments
from .utils import clean_question


class Command(BaseCommand):
    help = 'Upsert assessment questions from CSV file with categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-file',
            type=str,
            default='assessment.csv',
            help='Path to the CSV file containing assessment questions and categories (default: assessment.csv)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
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
                
                if len(lines) < 2:
                    self.stdout.write(
                        self.style.ERROR('CSV file must have at least 2 lines: questions and categories')
                    )
                    return

                # Parse the first line as questions (split by comma)
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
                
                # Parse the second line as categories (split by comma)
                categories_row = [c.strip().strip('"') for c in lines[1].strip().split(',')]

                # Use the shorter array length to avoid mismatch
                total_questions = min(len(questions_row), len(categories_row))
                
                if total_questions == 0:
                    self.stdout.write(
                        self.style.ERROR('No valid questions or categories found')
                    )
                    return

                if len(questions_row) != len(categories_row):
                    self.stdout.write(
                        self.style.WARNING(f'Warning: Questions ({len(questions_row)}) and categories ({len(categories_row)}) have different lengths. Using {total_questions} items.')
                    )

                questions_created = 0
                questions_updated = 0
                skipped_questions = 0

                self.stdout.write(f'Processing {total_questions} questions from CSV...')

                if not dry_run:
                    with transaction.atomic():
                        for i in range(total_questions):
                            question_text = questions_row[i].strip()
                            category = categories_row[i].strip()
                            
                            if not question_text or not category:
                                self.stdout.write(
                                    self.style.WARNING(f'Row {i+1}: Missing question text or category, skipping')
                                )
                                skipped_questions += 1
                                continue

                            # Use shared clean_question function
                            clean_question_text = clean_question(question_text)

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

                            mapped_category = category_mapping.get(category, 'mental_wellbeing')

                            # Create or update question
                            question, created = Questions.objects.get_or_create(
                                title=clean_question_text,
                                defaults={
                                    'title': clean_question_text,
                                    'question_category': mapped_category,
                                    'scale': 'onetofive'
                                }
                            )

                            if created:
                                questions_created += 1
                                self.stdout.write(f'✓ Created question {i+1}: {clean_question_text[:50]}... ({mapped_category})')
                            else:
                                # Update existing question if category or scale changed
                                updated = False
                                if question.question_category != mapped_category:
                                    question.question_category = mapped_category
                                    updated = True
                                if question.scale != 'onetofive':
                                    question.scale = 'onetofive'
                                    updated = True
                                
                                if updated:
                                    question.save()
                                    questions_updated += 1
                                    self.stdout.write(f'↻ Updated question {i+1}: {clean_question_text[:50]}... ({mapped_category})')
                                else:
                                    self.stdout.write(f'↻ Question {i+1} already exists with same data: {clean_question_text[:50]}...')

                else:
                    # Dry run - just show what would be done
                    for i in range(total_questions):
                        question_text = questions_row[i].strip()
                        category = categories_row[i].strip()
                        
                        if not question_text or not category:
                            continue

                        # Use shared clean_question function
                        clean_question_text = clean_question(question_text)

                        category_mapping = {
                            'Performance Mindset': 'performance_mindset',
                            'Emotional Regulation': 'emotional_regulation',
                            'Confidence': 'confidence',
                            'Resilience & Motivation': 'resilience__motivation',
                            'Concentration': 'concentration',
                            'Leadership': 'leadership',
                            'Mental Well-being': 'mental_wellbeing'
                        }

                        mapped_category = category_mapping.get(category, 'mental_wellbeing')
                        self.stdout.write(f'Would process question {i+1}: {clean_question_text[:50]}... ({mapped_category})')

                # Summary
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'\n🔍 Dry run completed:\n'
                            f'  • Would process {total_questions} questions\n'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'\n🎉 Successfully processed questions:\n'
                            f'  • Total questions processed: {total_questions}\n'
                            f'  • Questions created: {questions_created}\n'
                            f'  • Questions updated: {questions_updated}\n'
                            f'  • Questions skipped: {skipped_questions}\n'
                        )
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing CSV file: {str(e)}')
            )
            raise
