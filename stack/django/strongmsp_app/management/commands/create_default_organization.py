from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from strongmsp_app.models import Organizations, UserOrganizations, Products, OrganizationProducts

User = get_user_model()

class Command(BaseCommand):
    help = 'Create default SMSP organization and migrate existing users to it'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organization-name',
            type=str,
            default='Strong Mind Strong Performance',
            help='Name for the default organization'
        )
        parser.add_argument(
            '--organization-slug',
            type=str,
            default='smsp',
            help='Slug for the default organization'
        )

    def handle(self, *args, **options):
        org_name = options['organization_name']
        org_slug = options['organization_slug']
        
        # Create or get the default organization
        organization, created = Organizations.objects.get_or_create(
            slug=org_slug,
            defaults={
                'name': org_name,
                'is_active': True,
                'contact_email': 'admin@strongmindstrongperformance.com',
                'branding_palette': {
                    'light': {
                        'primary': {'main': '#877010'},
                        'secondary': {'main': '#2a74b7'}
                    },
                    'dark': {
                        'primary': {'main': '#f4ab2a'},
                        'secondary': {'main': '#2ab1f4'}
                    }
                },
                'branding_typography': {
                    'fontFamily': 'Montserrat'
                }
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created organization: {organization.name} (slug: {organization.slug})')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Organization already exists: {organization.name} (slug: {organization.slug})')
            )

        # Get or create default groups
        admin_group, _ = Group.objects.get_or_create(name='admin')
        coach_group, _ = Group.objects.get_or_create(name='coach')
        athlete_group, _ = Group.objects.get_or_create(name='athlete')
        parent_group, _ = Group.objects.get_or_create(name='parent')

        # Migrate existing users to the organization
        users = User.objects.all()
        migrated_count = 0
        
        for user in users:
            # Create UserOrganization relationship
            user_org, created = UserOrganizations.objects.get_or_create(
                user=user,
                organization=organization,
                defaults={'is_active': True}
            )
            
            if created:
                migrated_count += 1
                
                # Note: Groups are now managed separately from user creation
                # Users should be assigned to groups through other means
                
                # If user is superuser, also add admin group
                if user.is_superuser:
                    user_org.groups.add(admin_group)
                
                self.stdout.write(f'Migrated user: {user.username}')
            else:
                self.stdout.write(f'User already in organization: {user.username}')

        # Migrate all existing products to the organization
        products = Products.objects.all()
        product_count = 0
        
        for product in products:
            org_product, created = OrganizationProducts.objects.get_or_create(
                organization=organization,
                product=product,
                defaults={'is_featured': True, 'display_order': product.id}
            )
            
            if created:
                product_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Migration completed:\n'
                f'- Migrated {migrated_count} users to organization\n'
                f'- Added {product_count} products to organization\n'
                f'- Organization: {organization.name} (ID: {organization.id})'
            )
        )
