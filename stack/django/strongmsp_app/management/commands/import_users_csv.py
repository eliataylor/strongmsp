import csv
import os
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from allauth.account.models import EmailAddress
from strongmsp_app.models import Organizations, UserOrganizations

User = get_user_model()


class Command(BaseCommand):
    help = 'Import users from CSV file and assign to organization'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            required=True,
            help='Path to the CSV file'
        )
        parser.add_argument(
            '--role',
            type=str,
            required=True,
            choices=['athlete', 'coach', 'parent'],
            help='Role type: athlete, coach, or parent'
        )
        parser.add_argument(
            '--organization',
            type=str,
            required=True,
            help='Organization slug to assign users to'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without actually creating users'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        role = options['role']
        organization_slug = options['organization']
        dry_run = options['dry_run']

        # Validate file exists
        if not os.path.exists(file_path):
            raise CommandError(f'File {file_path} not found')

        # Get or create organization
        try:
            organization = Organizations.objects.get(slug=organization_slug)
        except Organizations.DoesNotExist:
            raise CommandError(f'Organization with slug "{organization_slug}" not found')

        # Get or create groups
        oa_tester_group, _ = Group.objects.get_or_create(name='oa-tester')
        role_group, _ = Group.objects.get_or_create(name=role)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No users will be created'))

        # Process CSV
        imported_count = 0
        updated_count = 0
        skipped_count = 0

        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                for row_num, row in enumerate(reader, 1):
                    try:
                        user, action = self.create_or_update_user(
                            row, role, organization, oa_tester_group, role_group, dry_run
                        )
                        
                        if action == 'created':
                            imported_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(f'Created user: {row["email"]}')
                            )
                        elif action == 'updated':
                            updated_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(f'Updated user: {row["email"]}')
                            )
                        elif action == 'skipped':
                            skipped_count += 1
                            self.stdout.write(
                                self.style.WARNING(f'Skipped existing user: {row["email"]}')
                            )
                        else:
                            skipped_count += 1
                            self.stdout.write(
                                self.style.ERROR(f'Error processing user: {row["email"]}')
                            )

                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Error processing row {row_num} ({row.get("email", "unknown")}): {e}')
                        )
                        skipped_count += 1

        except Exception as e:
            raise CommandError(f'Error reading CSV file: {e}')

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'Import completed: {imported_count} created, {updated_count} updated, {skipped_count} skipped'
            )
        )

    def create_or_update_user(self, row, role, organization, oa_tester_group, role_group, dry_run):
        """Create or update a user from CSV row data"""
        email = row['email'].strip()
        first_name = row['first_name'].strip()
        last_name = row['last_name'].strip()
        gender = row.get('gender', '').strip() or None
        birthdate = row.get('birthdate', '').strip() or None
        zip_code = row.get('zip_code', '').strip() or None

        if not email:
            raise ValueError('Email is required')

        # Generate username from email
        username = email

        # Check if user already exists
        existing_user = User.objects.filter(email=email).first()

        if existing_user:
            # Update existing user
            if not dry_run:
                existing_user.first_name = first_name
                existing_user.last_name = last_name
                existing_user.gender = gender
                existing_user.birthdate = birthdate
                existing_user.zip_code = zip_code
                existing_user.save()

                # Ensure user is in correct groups
                existing_user.groups.add(oa_tester_group)
                existing_user.groups.add(role_group)

                # Ensure user is in organization
                UserOrganizations.objects.get_or_create(
                    user=existing_user,
                    organization=organization,
                    defaults={'is_active': True}
                )

            return existing_user, 'updated'
        else:
            # Create new user
            if not dry_run:
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    gender=gender,
                    birthdate=birthdate,
                    zip_code=zip_code,
                    is_active=True,
                    is_staff=False,
                    is_superuser=False
                )

                # Set default password
                user.set_password('makemestrong')
                user.save()

                # Add to groups
                user.groups.add(oa_tester_group)
                user.groups.add(role_group)

                # Create verified email address
                EmailAddress.objects.create(
                    user=user,
                    email=email,
                    verified=True,
                    primary=True
                )

                # Add to organization
                UserOrganizations.objects.create(
                    user=user,
                    organization=organization,
                    is_active=True
                )

                return user, 'created'
            else:
                # Dry run - return mock user
                return None, 'created'
