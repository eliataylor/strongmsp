from .services.assignment_service import AssignmentService


class AssignmentServiceMiddleware:
    """
    Lightweight middleware that attaches AssignmentService to request.
    Does not execute any queries - service handles lazy loading.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Attach assignment service to request
        # Only for authenticated users to avoid unnecessary instantiation
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.assignment_service = AssignmentService(request)
        else:
            # For anonymous users, we'll create the service when needed
            # This allows backward compatibility
            request.assignment_service = None
        
        response = self.get_response(request)
        return response
