"""
Django management command to generate screenshots for CoachContent.

Usage:
    python manage.py generate_screenshots --empty-only
    python manage.py generate_screenshots --all --overwrite
    python manage.py generate_screenshots --id 5
    python manage.py generate_screenshots --limit 10 --theme light
"""
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from strongmsp_app.models import CoachContent
from strongmsp_app.services.screenshot_service import ScreenshotService


class Command(BaseCommand):
    help = 'Generate light and dark mode screenshots for CoachContent'

    def add_arguments(self, parser):
        parser.add_argument(
            '--id',
            type=int,
            help='Generate screenshots for specific CoachContent ID'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Generate for all CoachContent (default)'
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Regenerate and overwrite even if screenshots exist'
        )
        parser.add_argument(
            '--empty-only',
            action='store_true',
            help='Only generate for items without screenshots'
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Process only first N items'
        )
        parser.add_argument(
            '--theme',
            choices=['light', 'dark', 'both'],
            default='both',
            help='Generate only specific theme (default: both)'
        )

    def handle(self, *args, **options):
        # Determine which CoachContent items to process
        queryset = self._get_queryset(options)
        
        if not queryset.exists():
            self.stdout.write(
                self.style.WARNING('No CoachContent items found matching criteria')
            )
            return
        
        # Initialize screenshot service
        screenshot_service = ScreenshotService()
        
        # Process items
        processed_count = 0
        light_success_count = 0
        dark_success_count = 0
        
        self.stdout.write(f"Processing {queryset.count()} CoachContent items...")
        
        for coach_content in queryset:
            try:
                # Generate screenshots based on theme option
                if options['theme'] == 'both':
                    light_success, dark_success = screenshot_service.generate_screenshots(
                        coach_content, 
                        overwrite=options['overwrite']
                    )
                    if light_success:
                        light_success_count += 1
                    if dark_success:
                        dark_success_count += 1
                elif options['theme'] == 'light':
                    light_success, _ = screenshot_service.generate_screenshots(
                        coach_content, 
                        overwrite=options['overwrite']
                    )
                    if light_success:
                        light_success_count += 1
                elif options['theme'] == 'dark':
                    _, dark_success = screenshot_service.generate_screenshots(
                        coach_content, 
                        overwrite=options['overwrite']
                    )
                    if dark_success:
                        dark_success_count += 1
                
                processed_count += 1
                
                # Print progress
                athlete_name = coach_content.athlete.get_full_name() if coach_content.athlete else 'Unknown'
                purpose = coach_content.purpose or 'Unknown'
                self.stdout.write(
                    f"Processed CoachContent #{coach_content.id}: {purpose} for {athlete_name}"
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing CoachContent #{coach_content.id}: {e}")
                )
                continue
        
        # Print summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(f"Completed: {processed_count} items processed")
        
        if options['theme'] in ['both', 'light']:
            self.stdout.write(f"Light screenshots: {light_success_count} generated")
        if options['theme'] in ['both', 'dark']:
            self.stdout.write(f"Dark screenshots: {dark_success_count} generated")
        
        total_screenshots = light_success_count + dark_success_count
        self.stdout.write(f"Total screenshots: {total_screenshots} generated")
        
        if total_screenshots > 0:
            self.stdout.write(
                self.style.SUCCESS(f"Successfully generated {total_screenshots} screenshots!")
            )
        else:
            self.stdout.write(
                self.style.WARNING("No screenshots were generated. Check your criteria and try again.")
            )

    def _get_queryset(self, options):
        """Build queryset based on command options."""
        # Use select_related to efficiently load organization data
        queryset = CoachContent.objects.select_related(
            'assignment__payment__organization'
        ).all()
        
        # Filter by ID if specified
        if options['id']:
            queryset = queryset.filter(id=options['id'])
            if not queryset.exists():
                raise CommandError(f"CoachContent with ID {options['id']} does not exist")
            return queryset
        
        # Filter by screenshot existence
        if options['empty_only'] and not options['overwrite']:
            # Only items without screenshots
            queryset = queryset.filter(
                Q(screenshot_light__isnull=True) | Q(screenshot_light='') |
                Q(screenshot_dark__isnull=True) | Q(screenshot_dark='')
            )
        elif not options['overwrite']:
            # Skip items that already have screenshots
            queryset = queryset.filter(
                Q(screenshot_light__isnull=True) | Q(screenshot_light='') |
                Q(screenshot_dark__isnull=True) | Q(screenshot_dark='')
            )
        
        # Apply limit
        if options['limit']:
            queryset = queryset[:options['limit']]
        
        return queryset
