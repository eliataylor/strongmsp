from django.db.models import Q
from django.utils import timezone
from ..models import PaymentAssignments
from utils.helpers import get_subdomain_from_request


class AssignmentService:
    """
    Service class for querying PaymentAssignments with role information.
    Provides lazy-loaded, memoized access to assignment data within a request.
    """

    def __init__(self, request):
        self.request = request
        self.user = request.user
        self.organization_slug = get_subdomain_from_request(request)
        self._assignments = None
        self._assignments_by_athlete = {}
        self._assignments_by_role = {}

    def get_all(self):
        """
        Lazy loads all active assignments for the current user.
        Returns list of dicts with assignment and user roles.
        """
        if self._assignments is None:
            if not self.user.is_authenticated:
                self._assignments = []
                return self._assignments

            now = timezone.now().date()

            # Query all assignments where user is involved
            assignments = PaymentAssignments.objects.filter(
                Q(coaches=self.user) | 
                Q(parents=self.user) |
                Q(athlete=self.user) |
                Q(payment__author=self.user),
                payment__organization__slug=self.organization_slug,
                payment__status='succeeded',
                payment__product__is_active=True
            ).filter(
                Q(payment__subscription_ends__isnull=True) |
                Q(payment__subscription_ends__gte=now)
            ).select_related(
                'payment',
                'payment__product',
                'athlete'
            ).prefetch_related('coaches', 'parents').distinct()

            # Build assignment data with roles
            self._assignments = []
            for assignment in assignments:
                roles = self.get_my_roles_in_assignment(assignment)
                if roles:  # Only include if user has some role
                    self._assignments.append({
                        'assignment': assignment,
                        'my_roles': roles
                    })

        return self._assignments

    def get_for_athlete(self, athlete_id):
        """
        Returns first assignment where user can access the specified athlete.
        Caches results by athlete_id.
        """
        if athlete_id in self._assignments_by_athlete:
            return self._assignments_by_athlete[athlete_id]

        if not self.user.is_authenticated:
            self._assignments_by_athlete[athlete_id] = None
            return None

        now = timezone.now().date()

        # Query for assignment where user can access this athlete
        assignment = PaymentAssignments.objects.filter(
            Q(athlete=self.user) |
            Q(coaches=self.user) |
            Q(parents=self.user) |
            Q(payment__author=self.user),
            Q(athlete_id=athlete_id),
            payment__organization__slug=self.organization_slug,
            payment__status='succeeded',
            payment__product__is_active=True
        ).filter(
            Q(payment__subscription_ends__isnull=True) |
            Q(payment__subscription_ends__gte=now)
        ).select_related(
            'payment',
            'payment__product',
            'payment__organization',
            'athlete'
        ).prefetch_related('coaches', 'parents').first()

        if assignment:
            roles = self.get_my_roles_in_assignment(assignment)
            result = {
                'assignment': assignment,
                'my_roles': roles
            } if roles else None
        else:
            result = None

        self._assignments_by_athlete[athlete_id] = result
        return result

    def get_by_role(self, role):
        """
        Returns assignments where user has the specified role.
        Caches results by role.
        """
        if role in self._assignments_by_role:
            return self._assignments_by_role[role]

        all_assignments = self.get_all()
        filtered = [a for a in all_assignments if role in a['my_roles']]

        self._assignments_by_role[role] = filtered
        return filtered

    def has_access_to_assignment(self, assignment_id):
        """
        Checks if user can access the specified assignment.
        Uses cached data if available, otherwise queries directly.
        """
        # First check if we have it in our cached data
        all_assignments = self.get_all()
        for assignment_data in all_assignments:
            if assignment_data['assignment'].id == assignment_id:
                return True

        # If not cached, do a direct query
        if not self.user.is_authenticated:
            return False

        now = timezone.now().date()

        return PaymentAssignments.objects.filter(
            Q(athlete=self.user) |
            Q(coaches=self.user) |
            Q(parents=self.user) |
            Q(payment__author=self.user),
            id=assignment_id,
            payment__organization__slug=self.organization_slug,
            payment__status='succeeded',
            payment__product__is_active=True
        ).filter(
            Q(payment__subscription_ends__isnull=True) |
            Q(payment__subscription_ends__gte=now)
        ).exists()

    def get_for_assessment(self, assessment_id):
        """
        Returns assignment where user has access to the specified assessment.
        Assessment can be either pre or post assessment of the product.
        """
        if not self.user.is_authenticated:
            return None

        now = timezone.now().date()

        # Query for assignment where user has access to this assessment
        assignment = PaymentAssignments.objects.filter(
            Q(athlete=self.user) |
            Q(coaches=self.user) |
            Q(parents=self.user) |
            Q(payment__author=self.user),
            payment__organization__slug=self.organization_slug,
            payment__status='succeeded',
            payment__product__is_active=True
        ).filter(
            Q(payment__subscription_ends__isnull=True) |
            Q(payment__subscription_ends__gte=now)
        ).filter(
            Q(payment__product__pre_assessment_id=assessment_id) |
            Q(payment__product__post_assessment_id=assessment_id)
        ).select_related(
            'payment',
            'payment__product',
            'payment__organization',
            'athlete'
        ).prefetch_related('coaches', 'parents').first()

        if assignment:
            roles = self.get_my_roles_in_assignment(assignment)
            return {
                'assignment': assignment,
                'my_roles': roles
            } if roles else None

        return None

    def get_my_roles_in_assignment(self, assignment):
        """
        Internal method to determine current user's roles in an assignment.
        Returns list of role strings: ['athlete', 'coach', 'parent', 'payer']
        """
        if not self.user.is_authenticated:
            return []

        my_roles = []

        # Check if user is the athlete
        if assignment.athlete == self.user:
            my_roles.append('athlete')

        # Check if user is a coach
        if self.user in assignment.coaches.all():
            my_roles.append('coach')

        # Check if user is a parent
        if self.user in assignment.parents.all():
            my_roles.append('parent')

        # Check if user is the payer
        if assignment.payment.author == self.user:
            my_roles.append('payer')

        return my_roles
