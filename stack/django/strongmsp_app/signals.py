from allauth.account.signals import email_confirmed
from django.contrib.auth.models import Group
from django.dispatch import receiver
# Add signal to update user category scores when assessments are submitted
from django.db.models.signals import post_save
from .models import PaymentAssignments
from .services.confidence_analyzer import ConfidenceAnalyzer


@receiver(email_confirmed)
def add_user_to_verified_group(request, email_address, **kwargs):
    # Get the user associated with the verified email
    user = email_address.user

    # Get or create the "verified" group
    verified_group, created = Group.objects.get_or_create(name="verified")

    # Add the user to the "verified" group if they are not already in it
    if not user.groups.filter(name="verified").exists():
        print('adding user to verified group')
        user.groups.add(verified_group)





@receiver(post_save, sender=PaymentAssignments)
def update_user_category_scores_on_submission(sender, instance, **kwargs):
    """Update user's category scores when they submit an assessment."""
    if not instance.athlete:
        return
    
    # Check if pre_assessment was submitted
    if instance.pre_assessment_submitted_at and instance.payment.product and instance.payment.product.pre_assessment:
        ConfidenceAnalyzer.update_user_category_scores(
            instance.athlete.id,
            instance.payment.product.pre_assessment.id
        )
    
    # Check if post_assessment was submitted
    if instance.post_assessment_submitted_at and instance.payment.product and instance.payment.product.post_assessment:
        ConfidenceAnalyzer.update_user_category_scores(
            instance.athlete.id,
            instance.payment.product.post_assessment.id
        )
