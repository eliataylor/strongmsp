from django.core.management.base import BaseCommand
from django.db.models import Q
from strongmsp_app.models import PaymentAssignments
from strongmsp_app.services.confidence_analyzer import ConfidenceAnalyzer


class Command(BaseCommand):
    help = 'Backfill category scores on Users model'

    def handle(self, *args, **options):
        # Get all unique athletes who have submitted assessments
        assignments = PaymentAssignments.objects.filter(
            athlete__isnull=False
        ).filter(
            Q(pre_assessment_submitted_at__isnull=False) |
            Q(post_assessment_submitted_at__isnull=False)
        ).select_related('athlete', 'payment__product')
        
        processed = set()
        
        for assignment in assignments:
            athlete_id = assignment.athlete.id
            if athlete_id in processed:
                continue
                
            self.stdout.write(f"Processing athlete {athlete_id}")
            
            # Update from pre-assessment if submitted
            if assignment.pre_assessment_submitted_at and assignment.payment.product.pre_assessment:
                ConfidenceAnalyzer.update_user_category_scores(
                    athlete_id,
                    assignment.payment.product.pre_assessment.id
                )
            
            # Update from post-assessment if submitted (will overwrite pre if both exist)
            if assignment.post_assessment_submitted_at and assignment.payment.product.post_assessment:
                ConfidenceAnalyzer.update_user_category_scores(
                    athlete_id,
                    assignment.payment.product.post_assessment.id
                )
            
            processed.add(athlete_id)
        
        self.stdout.write(self.style.SUCCESS(f'Processed {len(processed)} athletes'))

