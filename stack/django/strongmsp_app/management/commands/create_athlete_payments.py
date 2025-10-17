from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from strongmsp_app.models import Payments, PaymentAssignments, Products

User = get_user_model()


class Command(BaseCommand):
    help = 'Create Payment and PaymentAssignment for all athletes without existing payments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No records will be created'))
        
        try:
            # Get athlete group
            athlete_group = Group.objects.get(name='athlete')
            self.stdout.write(f"Found athlete group: {athlete_group.name}")
        except Group.DoesNotExist:
            raise CommandError("Athlete group does not exist. Please create it first.")
        
        try:
            # Get Product ID 1
            product = Products.objects.get(id=1)
            self.stdout.write(f"Found product: {product.title} (ID: {product.id})")
        except Products.DoesNotExist:
            raise CommandError("Product with ID 1 does not exist.")
        
        try:
            # Get User ID 13 as author
            author = User.objects.get(id=13)
            self.stdout.write(f"Found author: {author} (ID: {author.id})")
        except User.DoesNotExist:
            raise CommandError("User with ID 13 does not exist.")
        
        # Get all users in athlete group
        athletes = User.objects.filter(groups=athlete_group)
        total_athletes = athletes.count()
        self.stdout.write(f"Found {total_athletes} users in athlete group")
        
        if total_athletes == 0:
            self.stdout.write(self.style.WARNING("No athletes found in the group."))
            return
        
        # Filter athletes who don't have any payments
        # Since Payments.author has related_name='+', we need to use a different approach
        # Get all athlete IDs who already have payments as authors
        athletes_with_payments = set(Payments.objects.filter(author__in=athletes).values_list('author_id', flat=True))
        athletes_without_payments = athletes.exclude(id__in=athletes_with_payments)
        eligible_athletes = athletes_without_payments.count()
        skipped_count = total_athletes - eligible_athletes
        
        self.stdout.write(f"Athletes without payments: {eligible_athletes}")
        self.stdout.write(f"Athletes to skip (already have payments): {skipped_count}")
        
        if eligible_athletes == 0:
            self.stdout.write(self.style.WARNING("All athletes already have payments. Nothing to create."))
            return
        
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Would create {eligible_athletes} payments and payment assignments"))
            for athlete in athletes_without_payments[:5]:  # Show first 5 as examples
                self.stdout.write(f"  - {athlete} ({athlete.email})")
            if eligible_athletes > 5:
                self.stdout.write(f"  ... and {eligible_athletes - 5} more")
            return
        
        # Create payments and assignments
        created_count = 0
        errors = []
        
        with transaction.atomic():
            for athlete in athletes_without_payments:
                try:
                    # Create Payment
                    payment = Payments.objects.create(
                        product=product,
                        paid=0.00,
                        status='succeeded',
                        subscription_ends=None,
                        author=author,
                        features_snapshot=product.features,
                    )
                    
                    # Create PaymentAssignment
                    payment_assignment = PaymentAssignments.objects.create(
                        payment=payment,
                        athlete=athlete,
                    )
                    
                    created_count += 1
                    self.stdout.write(f"Created payment and assignment for: {athlete}")
                    
                except Exception as e:
                    error_msg = f"Error creating payment for {athlete}: {str(e)}"
                    errors.append(error_msg)
                    self.stdout.write(self.style.ERROR(error_msg))
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*50)
        self.stdout.write(f"Total athletes found: {total_athletes}")
        self.stdout.write(f"Athletes skipped (already have payments): {skipped_count}")
        self.stdout.write(f"Payments created: {created_count}")
        self.stdout.write(f"Errors encountered: {len(errors)}")
        
        if errors:
            self.stdout.write("\nERRORS:")
            for error in errors:
                self.stdout.write(self.style.ERROR(f"  - {error}"))
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f"\nSuccessfully created {created_count} payments and payment assignments!"))
        else:
            self.stdout.write(self.style.WARNING("No payments were created."))
