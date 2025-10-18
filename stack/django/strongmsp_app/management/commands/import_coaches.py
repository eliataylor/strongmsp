import json
import re
import requests
import os
from urllib.parse import urlparse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.core.files.base import ContentFile
from django.utils.html import strip_tags
from allauth.account.models import EmailAddress

User = get_user_model()


class Command(BaseCommand):
    help = 'Import coaches from coaches.html file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='coaches.html',
            help='Path to the coaches.html file (default: coaches.html)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without actually creating users'
        )
        parser.add_argument(
            '--upsert',
            action='store_true',
            help='Update existing coaches instead of skipping them'
        )
        parser.add_argument(
            '--download-images',
            action='store_true',
            help='Download and upload coach images to their profiles'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        dry_run = options['dry_run']
        upsert = options['upsert']
        download_images = options['download_images']
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                html_content = file.read()
        except FileNotFoundError:
            raise CommandError(f'File {file_path} not found')
        except Exception as e:
            raise CommandError(f'Error reading file: {e}')

        # Extract the JSON data from the HTML
        coaches_data = self.extract_coaches_data(html_content)
        
        if not coaches_data:
            self.stdout.write(self.style.WARNING('No coaches data found in the file'))
            return

        self.stdout.write(f'Found {len(coaches_data)} coaches to import')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No users will be created'))
            for i, coach in enumerate(coaches_data, 1):
                self.stdout.write(f'{i}. {coach["title"]} - {coach["description"][:100]}...')
            return

        # Import coaches
        imported_count = 0
        updated_count = 0
        skipped_count = 0
        
        for coach_data in coaches_data:
            try:
                coach, action = self.create_or_update_coach_user(coach_data, upsert, download_images)
                if coach:
                    if action == 'created':
                        imported_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'Successfully created coach: {coach_data["title"]}')
                        )
                    elif action == 'updated':
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'Successfully updated coach: {coach_data["title"]}')
                        )
                else:
                    skipped_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Skipped existing coach: {coach_data["title"]}')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing coach {coach_data["title"]}: {e}')
                )
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Import completed: {imported_count} created, {updated_count} updated, {skipped_count} skipped'
            )
        )

    def extract_coaches_data(self, html_content):
        """Extract coaches data from the HTML content"""
        coaches = []
        
        # Find the data-current-context attribute
        pattern = r'data-current-context="([^"]*)"'
        match = re.search(pattern, html_content)
        
        if not match:
            self.stdout.write(self.style.ERROR('Could not find coaches data in HTML'))
            return coaches
        
        try:
            # Decode the JSON data
            json_str = match.group(1)
            # Replace HTML entities
            json_str = json_str.replace('&quot;', '"')
            json_str = json_str.replace('&lt;', '<')
            json_str = json_str.replace('&gt;', '>')
            json_str = json_str.replace('&amp;', '&')
            
            data = json.loads(json_str)
            user_items = data.get('userItems', [])
            
            for item in user_items:
                coach = {
                    'title': item.get('title', ''),
                    'description': self.clean_description(item.get('description', '')),
                    'image_url': item.get('image', {}).get('assetUrl', ''),
                    'button_text': item.get('button', {}).get('buttonText', ''),
                    'button_link': item.get('button', {}).get('buttonLink', ''),
                }
                coaches.append(coach)
                
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'Error parsing JSON data: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error extracting coaches data: {e}'))
        
        return coaches

    def clean_description(self, description):
        """Clean HTML from description and extract plain text"""
        if not description:
            return ''
        
        # Remove HTML tags but preserve line breaks
        cleaned = strip_tags(description)
        # Clean up extra whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def create_or_update_coach_user(self, coach_data, upsert=False, download_images=False):
        """Create or update a coach user from the parsed data"""
        title = coach_data['title']
        description = coach_data['description']
        image_url = coach_data['image_url']
        
        # Extract first and last name from title
        name_parts = title.strip().split()
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
        else:
            first_name = title
            last_name = ''
        
        # Create a username from the title (lowercase, replace spaces with underscores)
        username = re.sub(r'[^a-zA-Z0-9]', '_', title.lower())
        username = re.sub(r'_+', '_', username).strip('_')
        
        # Create email (using a placeholder domain)
        email = f"{username}@strongmindstrongperformance.com"
        
        # Check if user already exists
        existing_user = User.objects.filter(username=username).first()
        
        if existing_user and not upsert:
            self.stdout.write(f'User {username} already exists, skipping...')
            return None, 'skipped'
        
        if existing_user and upsert:
            # Update existing user
            user = existing_user
            user.first_name = first_name
            user.last_name = last_name
            user.bio = description
            user.save()
            action = 'updated'
        else:
            # Create new user
            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                bio=description,
                is_active=True,
                is_staff=False,
                is_superuser=False
            )
            
            # Set a default password
            user.set_password('coach123')  # You might want to change this
            user.save()
            
            # Create and verify email address
            EmailAddress.objects.create(
                user=user,
                email=email,
                verified=True,
                primary=True
            )
            action = 'created'
        
        # Add user to coach group
        self.add_user_to_coach_group(user)
        
        # Download and upload image if requested
        if download_images and image_url:
            self.download_and_upload_image(user, image_url, title)
        
        # Create or update CoachContent entry (without image since we store it in User model now)
        self.create_or_update_coach_content(user, title, description, image_url)
        
        return user, action

    def add_user_to_coach_group(self, user):
        """Add user to the coach group"""
        try:
            coach_group, created = Group.objects.get_or_create(name='coach')
            user.groups.add(coach_group)
            self.stdout.write(f'Added {user.username} to coach group')
        except Exception as e:
            self.stdout.write(f'Error adding {user.username} to coach group: {e}')

    def download_and_upload_image(self, user, image_url, title):
        """Download image from URL and upload to user's avatar and photo fields"""
        try:
            # Download the image
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Get file extension from URL
            parsed_url = urlparse(image_url)
            file_extension = os.path.splitext(parsed_url.path)[1] or '.jpg'
            
            # Create filename
            safe_title = re.sub(r'[^a-zA-Z0-9]', '_', title.lower())
            avatar_filename = f"{safe_title}_avatar{file_extension}"
            photo_filename = f"{safe_title}_photo{file_extension}"
            
            # Create separate ContentFile instances for avatar and photo
            avatar_file = ContentFile(response.content, name=avatar_filename)
            photo_file = ContentFile(response.content, name=photo_filename)
            
            # Upload to avatar and photo fields separately
            user.avatar = avatar_file
            user.photo = photo_file
            user.save()
            
            self.stdout.write(f'Uploaded avatar and photo for {title}')
                
        except requests.RequestException as e:
            self.stdout.write(f'Error downloading image for {title}: {e}')
        except Exception as e:
            self.stdout.write(f'Error uploading image for {title}: {e}')

    def create_or_update_coach_content(self, user, title, description, image_url):
        """Create or update a CoachContent entry for the coach"""
        from strongmsp_app.models import CoachContent
        
        try:
            coach_content, created = CoachContent.objects.get_or_create(
                author=user,
                defaults={
                    'title': f"{title} - Coach Profile",
                    'body': description,
                    'privacy': 'public',
                    'purpose': 'talkingpoints'
                }
            )
            
            if not created:
                # Update existing content
                coach_content.title = f"{title} - Coach Profile"
                coach_content.body = description
                coach_content.privacy = 'public'
                coach_content.purpose = 'talkingpoints'
                coach_content.save()
                self.stdout.write(f'Updated CoachContent for {title}')
            else:
                self.stdout.write(f'Created CoachContent for {title}')
                
        except Exception as e:
            self.stdout.write(f'Error creating/updating CoachContent for {title}: {e}')
