from django.db.models import Q
from django.db import connection
from django.utils import timezone
from ..models import PaymentAssignments, Assessments
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
        
        DEPRECATED: This method is deprecated and will be removed in a future version.
        Use get_all_paginated() instead for better performance and pagination support.
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

    def get_all_paginated(self, limit=None, offset=None, pre_assessment_submitted=None):
        """
        Get paginated athlete assignments with optional filtering.
        
        Args:
            limit: Maximum number of results to return
            offset: Number of results to skip
            pre_assessment_submitted: Filter by pre-assessment submission status
                - True: Only show submissions with pre_assessment submitted
                - False: Only show submissions with pre_assessment not submitted
                - None: No filter
        
        Returns:
            Dict with keys: results, count, limit, offset
        """
        if not self.user.is_authenticated:
            return {
                'results': [],
                'count': 0,
                'limit': limit or 0,
                'offset': offset or 0
            }

        # Build the WHERE clause with optional pre_assessment_submitted filter
        pre_assessment_filter = ""
        params = [
            self.user.id,  # coach
            self.user.id,  # parent
            self.user.id,  # athlete
            self.user.id,  # author
            self.organization_slug  # organization slug
        ]
        
        if pre_assessment_submitted is not None:
            if pre_assessment_submitted:
                pre_assessment_filter = "AND pa.pre_assessment_submitted_at IS NOT NULL"
            else:
                pre_assessment_filter = "AND pa.pre_assessment_submitted_at IS NULL"

        # Build the pagination clause
        limit_offset_clause = ""
        if limit is not None and limit > 0:
            limit_offset_clause = f"LIMIT {limit}"
            if offset is not None and offset > 0:
                limit_offset_clause += f" OFFSET {offset}"

        sql = f"""SELECT DISTINCT pa.athlete_id, pr.pre_assessment_id,
                GROUP_CONCAT(distinct pr.post_assessment_id) as post_assessment_ids,
                GROUP_CONCAT(distinct pa.id) as paymentassignment_ids,
                GROUP_CONCAT(distinct p.id) as payment_ids,
                GROUP_CONCAT(distinct pr.id) as product_ids,
                GROUP_CONCAT(distinct c_m2m.users_id) as coach_ids,
                GROUP_CONCAT(distinct pa_m2m.users_id) as parent_ids,
                MAX(pa.created_at) as created_at,
                MAX(distinct pa.post_assessment_submitted_at) as post_submitted,
                MAX(distinct pa.pre_assessment_submitted_at) as pre_submitted
            FROM
                strongmsp_app_paymentassignments pa
                INNER JOIN strongmsp_app_payments p ON pa.payment_id = p.id
                INNER JOIN strongmsp_app_products pr ON p.product_id = pr.id
                INNER JOIN strongmsp_app_organizations o ON p.organization_id = o.id
                LEFT JOIN strongmsp_app_paymentassignments_coaches c_m2m ON pa.id = c_m2m.paymentassignments_id
                LEFT JOIN strongmsp_app_paymentassignments_parents pa_m2m ON pa.id = pa_m2m.paymentassignments_id
            WHERE
                -- User involvement conditions (OR logic)
                (
                    c_m2m.users_id = %s OR                    -- User is a coach
                    pa_m2m.users_id = %s OR                   -- User is a parent
                    pa.athlete_id = %s OR                     -- User is the athlete
                    p.author_id = %s                          -- User is the payment author
                )
                -- required AND filters
                AND o.slug = %s                               -- payment__organization__slug
                AND p.status = 'succeeded'                    -- payment__status
                AND pr.is_active = true                       -- payment__product__is_active
                AND (
                    p.subscription_ends IS NULL OR            -- payment__subscription_ends__isnull
                    p.subscription_ends >= now()                 -- payment__subscription_ends__gte (now date)
                )
                {pre_assessment_filter}
                GROUP BY pa.athlete_id, pr.pre_assessment_id 
                ORDER BY pre_submitted DESC, post_submitted DESC, created_at DESC
                {limit_offset_clause};
                """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            athlete_states = []
            for row in rows:

                def split_ids(id_string):
                    """Split comma-separated IDs into a list of integers"""
                    return [int(id_) for id_ in id_string.split(',')] if id_string else []

                def get_user_relentity(user_id, role=None):
                    """Create a RelEntity structure for a user"""
                    from ..models import Users
                    user = Users.objects.filter(id=user_id).first()
                    if not user:
                        return None
                    rel = {
                        'id': user.id,
                        'str': str(user),
                        '_type': 'Users',
                        'img': user.photo.url if user.photo else None
                    }
                    if role == 'athlete':
                        rel['entity'] = {
                            'category_performance_mindset': float(user.category_performance_mindset) if user.category_performance_mindset else None,
                            'category_emotional_regulation': float(user.category_emotional_regulation) if user.category_emotional_regulation else None,
                            'category_confidence': float(user.category_confidence) if user.category_confidence else None,
                            'category_resilience_motivation': float(user.category_resilience_motivation) if user.category_resilience_motivation else None,
                            'category_concentration': float(user.category_concentration) if user.category_concentration else None,
                            'category_leadership': float(user.category_leadership) if user.category_leadership else None,
                            'category_mental_wellbeing': float(user.category_mental_wellbeing) if user.category_mental_wellbeing else None,
                        }
                    return rel

                def get_assessment_relentity(id):
                    """Create a RelEntity structure for an Assessment"""
                    assessment = Assessments.objects.filter(id=id).first()
                    if not assessment:
                        return None
                    rel = {
                        'id': assessment.id,
                        'str': str(assessment),
                        '_type': 'Assessments',
                        'img': assessment.photo.url if hasattr(assessment, 'photo') and assessment.photo else None
                    }
                    return rel

                columns = [
                    'athlete_id', 'pre_assessment_id', 'post_assessment_ids', 'paymentassignment_ids',
                    'payment_ids', 'product_ids', 'coach_ids', 'parent_ids',
                    'created_at', 'post_submitted', 'pre_submitted'
                ]
                row_data = dict(zip(columns, row))

                # Split concatenated IDs into lists
                paymentassignment_ids = split_ids(row_data['paymentassignment_ids'])
                payment_ids = split_ids(row_data['payment_ids'])
                product_ids = split_ids(row_data['product_ids'])
                coach_ids = split_ids(row_data['coach_ids'])
                parent_ids = split_ids(row_data['parent_ids'])

                my_roles = {}

                athlete_state = {
                    'athlete_id': row_data['athlete_id'],
                    'athlete': get_user_relentity(row_data['athlete_id'], role='athlete'),
                    'paymentassignment_ids': paymentassignment_ids,
                    'payment_ids': payment_ids,
                    'product_ids': product_ids,
                    'coaches': [],
                    'parents': [],
                    'my_roles': [],
                    'pre_assessment_submitted_at': row_data['pre_submitted'],
                    'post_assessment_submitted_at': row_data['post_submitted'],
                    'pre_assessment': {},
                    'post_assessments': [],
                    'content_progress': {
                        'lesson_plan': [],
                        'curriculum': [],
                        'talking_points': [],
                        'feedback_report': [],
                        'scheduling_email': []
                    }
                }

                if row_data['athlete_id'] == self.user.id:
                    my_roles['athlete'] = True

                # Get coach and parent RelEntities
                for coach_id in coach_ids:
                    coach_relentity = get_user_relentity(coach_id, role='coach')
                    athlete_state['coaches'].append(coach_relentity)
                    if coach_id == self.user.id:
                        my_roles['coach'] = True

                for parent_id in parent_ids:
                    parent_relentity = get_user_relentity(parent_id, role='parent')
                    athlete_state['parents'].append(parent_relentity)
                    if parent_id == self.user.id:
                        my_roles['parent'] = True

                # Initialize progress trackers
                agent_progress = {purpose: [] for purpose in ['lesson_plan', 'curriculum', 'talking_points', 'feedback_report', 'scheduling_email']}
                content_progress = {purpose: [] for purpose in ['lesson_plan', 'curriculum', 'talking_points', 'feedback_report', 'scheduling_email']}

                # Fetch and populate progress data
                from ..models import AgentResponses, CoachContent
                from django.db.models import Q

                agent_responses = AgentResponses.objects.filter(
                    assignment_id__in=paymentassignment_ids
                ).order_by('-created_at')

                for agent_response in agent_responses:
                    agent_progress[agent_response.purpose].append({
                        'id': agent_response.id,
                        'str': str(agent_response),
                        '_type': 'AgentResponses',
                        'entity': {
                            'purpose': agent_response.purpose,
                            'created_at': agent_response.created_at.isoformat(),
                            'modified_at': agent_response.modified_at.isoformat(),
                        }
                    })

                # Fetch and populate coach content
                coach_contents = CoachContent.objects.filter(
                    assignment_id__in=paymentassignment_ids
                ).order_by('-created_at')

                for content in coach_contents:
                    content_progress[content.purpose].append({
                        'id': content.id,
                        'str': str(content),
                        '_type': 'CoachContent',
                        'entity': {
                            'purpose': content.purpose,
                            'created_at': content.created_at.isoformat(),
                            'modified_at': content.modified_at.isoformat(),
                            'coach_delivered': content.coach_delivered.isoformat() if content.coach_delivered else None,
                            'athlete_received': content.athlete_received.isoformat() if content.athlete_received else None,
                            'parent_received': content.parent_received.isoformat() if content.parent_received else None,
                            'screenshot_light': content.screenshot_light.url if content.screenshot_light else None,
                            'screenshot_dark': content.screenshot_dark.url if content.screenshot_dark else None,
                        }
                    })

                # Fetch and populate post assessments
                if row_data['post_assessment_ids']:
                    post_ids = [int(pid) for pid in row_data['post_assessment_ids'].split(',') if pid]
                    if post_ids:
                        post_assessments = Assessments.objects.filter(
                            id__in=post_ids
                        ).order_by('-created_at')
                        for assessment in post_assessments:
                            athlete_state['post_assessments'].append({
                                'id': assessment.id,
                                'str': str(assessment),
                                '_type': 'Assessments',
                            })

                athlete_state['my_roles'] = list(my_roles.keys())
                athlete_state['agent_progress'] = agent_progress
                athlete_state['content_progress'] = content_progress
                athlete_states.append(athlete_state)

        return {
            'results': athlete_states,
            'count': len(athlete_states), # TODO: run query as count
            'limit': limit,
            'offset': offset
        }

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
