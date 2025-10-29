from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model
from strongmsp_app.models import PaymentAssignments, Payments, Products, Organizations
from django.db.models import Count

User = get_user_model()


class Command(BaseCommand):
    help = 'Identify and optionally resolve duplicate PaymentAssignments that would violate the unique constraint'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )
        parser.add_argument(
            '--resolve',
            action='store_true',
            help='Actually resolve duplicates by keeping the most recent assignment and deleting others'
        )
        parser.add_argument(
            '--athlete-id',
            type=int,
            help='Only process duplicates for a specific athlete ID'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        resolve = options['resolve']
        athlete_id = options['athlete_id']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        if resolve and dry_run:
            raise CommandError("Cannot use --resolve with --dry-run")

        # Find duplicate assignments (same athlete, pre_assessment, organization)
        duplicates_query = PaymentAssignments.objects.values(
            'athlete_id',
            'payment__product__pre_assessment_id',
            'payment__organization_id'
        ).annotate(
            count=Count('id')
        ).filter(
            count__gt=1,
            athlete_id__isnull=False
        ).order_by('-count')

        if athlete_id:
            duplicates_query = duplicates_query.filter(athlete_id=athlete_id)

        duplicates = list(duplicates_query)

        if not duplicates:
            self.stdout.write(self.style.SUCCESS('No duplicate assignments found!'))
            return

        self.stdout.write(f'Found {len(duplicates)} duplicate groups')
        self.stdout.write('=' * 60)

        total_to_delete = 0
        total_to_keep = 0

        for dup in duplicates:
            athlete_id = dup['athlete_id']
            pre_assessment_id = dup['payment__product__pre_assessment_id']
            org_id = dup['payment__organization_id']
            count = dup['count']

            # Get all assignments in this duplicate group
            assignments = PaymentAssignments.objects.filter(
                athlete_id=athlete_id,
                payment__product__pre_assessment_id=pre_assessment_id,
                payment__organization_id=org_id
            ).select_related('payment', 'payment__product', 'payment__organization', 'athlete').order_by('-created_at')

            athlete = assignments[0].athlete
            org = assignments[0].payment.organization
            pre_assessment = assignments[0].payment.product.pre_assessment

            self.stdout.write(f'\nAthlete: {athlete} (ID: {athlete_id})')
            self.stdout.write(f'Organization: {org} (ID: {org_id})')
            self.stdout.write(f'Pre-Assessment: {pre_assessment} (ID: {pre_assessment_id})')
            self.stdout.write(f'Duplicate count: {count}')
            self.stdout.write('Assignments:')

            # Keep the most recent assignment (first in ordered list)
            to_keep = assignments[0]
            to_delete = assignments[1:]

            self.stdout.write(f'  ✓ KEEP: Assignment {to_keep.id} (Payment {to_keep.payment.id}, ${to_keep.payment.paid}, Created {to_keep.created_at})')
            
            for assignment in to_delete:
                self.stdout.write(f'  ✗ DELETE: Assignment {assignment.id} (Payment {assignment.payment.id}, ${assignment.payment.paid}, Created {assignment.created_at})')

            total_to_keep += 1
            total_to_delete += len(to_delete)

            # Actually resolve if requested
            if resolve:
                with transaction.atomic():
                    for assignment in to_delete:
                        self.stdout.write(f'    Deleting assignment {assignment.id}...')
                        assignment.delete()

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('SUMMARY')
        self.stdout.write('=' * 60)
        self.stdout.write(f'Duplicate groups found: {len(duplicates)}')
        self.stdout.write(f'Assignments to keep: {total_to_keep}')
        self.stdout.write(f'Assignments to delete: {total_to_delete}')

        if resolve:
            self.stdout.write(self.style.SUCCESS(f'\nSuccessfully resolved {len(duplicates)} duplicate groups!'))
        elif not dry_run:
            self.stdout.write(self.style.WARNING('\nUse --resolve to actually delete the duplicate assignments'))
        else:
            self.stdout.write(self.style.WARNING('\nUse --resolve (without --dry-run) to actually delete the duplicate assignments'))
