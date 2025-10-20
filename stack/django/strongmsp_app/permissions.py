from rest_framework import permissions
from django.db.models import Q
from .models import PaymentAssignments

class PaymentAssignmentPermission(permissions.BasePermission):
    """
    Custom permission for PaymentAssignments based on user roles and assessment submission status.
    
    Permission rules:
    - All modifications blocked if any assessment is submitted
    - CREATE: Only Admin and Payer (payment.author) allowed
    - UPDATE/PATCH: Role-based field-level permissions
    - DELETE: Blocked (only field modifications allowed)
    - LIST/RETRIEVE: Users who are part of the assignment
    """
    
    def has_permission(self, request, view):
        """Check if user has permission to access the viewset"""
        if not request.user.is_authenticated:
            return False
            
        # For list/create actions, check basic permissions
        if view.action in ['list', 'create']:
            return True
            
        # For other actions, check object-level permissions
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check if user has permission for specific object operations"""
        if not request.user.is_authenticated:
            return False
            
        # Check if user is part of this assignment
        user_in_assignment = (
            obj.athlete == request.user or
            request.user in obj.coaches.all() or
            request.user in obj.parents.all() or
            obj.payment.author == request.user
        )
        
        if not user_in_assignment:
            return False
            
        # For read operations, allow if user is part of assignment
        if view.action in ['retrieve', 'list']:
            return True
            
        # For create operations, only allow Admin and Payer
        if view.action == 'create':
            return obj.payment.author == request.user
            
        # For update operations, check submission status and role-based permissions
        if view.action in ['update', 'partial_update']:
            # Block all modifications if any assessment is submitted
            if obj.pre_assessment_submitted or obj.post_assessment_submitted:
                return False
                
            # Check role-based field permissions
            return self._check_field_permissions(request, obj, view)
            
        # For delete operations, always block (only field modifications allowed)
        if view.action == 'destroy':
            return False
            
        return False
    
    def _check_field_permissions(self, request, obj, view):
        """Check if user can modify specific fields based on their role"""
        # Get the fields being updated
        if hasattr(view, 'get_serializer'):
            serializer = view.get_serializer(obj, data=request.data, partial=True)
            if serializer.is_valid():
                updated_fields = set(serializer.validated_data.keys())
            else:
                updated_fields = set(request.data.keys())
        else:
            updated_fields = set(request.data.keys())
            
        # Remove non-field updates (like timestamps)
        field_updates = updated_fields - {'created_at', 'modified_at', 'author', 'pre_assessment_submitted', 'post_assessment_submitted', 'pre_assessment_submitted_at', 'post_assessment_submitted_at'}
        
        if not field_updates:
            return True
            
        # Determine user role
        user_role = self._get_user_role(request.user, obj)
        
        # Apply role-based field restrictions
        if user_role == 'payer':
            # Payer can change athlete, coaches, parents
            allowed_fields = {'athlete', 'coaches', 'parents'}
        elif user_role == 'parent':
            # Parent can change coaches, athlete
            allowed_fields = {'athlete', 'coaches'}
        elif user_role == 'athlete':
            # Athlete can change coaches only
            allowed_fields = {'coaches'}
        elif user_role == 'coach':
            # Coach can change coaches only
            allowed_fields = {'coaches'}
        else:
            return False
            
        # Check if all field updates are allowed
        return field_updates.issubset(allowed_fields)
    
    def _get_user_role(self, user, obj):
        """Determine user's role in the PaymentAssignment"""
        if obj.payment.author == user:
            return 'payer'
        elif obj.athlete == user:
            return 'athlete'
        elif user in obj.coaches.all():
            return 'coach'
        elif user in obj.parents.all():
            return 'parent'
        else:
            return 'none'


class AgentResponsePermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # If no assignment, fall back to checking athlete
        if not obj.assignment:
            return obj.athlete == request.user
        
        # Use assignment service to check access
        return request.assignment_service.has_access_to_assignment(obj.assignment.id)

class CoachContentPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Check privacy setting first
        if obj.privacy == 'public':
            return True
        
        # If no assignment, fall back to author check
        if not obj.assignment:
            return obj.author == request.user
        
        # Use assignment service to check access
        return request.assignment_service.has_access_to_assignment(obj.assignment.id)