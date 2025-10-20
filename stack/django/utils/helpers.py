from strongmsp_base import settings
from twilio.rest import Client
from django.db import connection
from django.db.utils import DatabaseError

def send_sms(to, body):
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    message = client.messages.create(
        body=body,
        from_=settings.TWILIO_PHONE_NUMBER,
        to=to
    )
    return message.sid

def fetch_dict_query(query, params=None):
    """
    Executes a SQL query and returns results as a list of dictionaries.

    Args:
        query (str): The SQL query to execute.
        params (tuple, optional): Parameters to use with the query.

    Returns:
        list of dict: Query results where each row is represented as a dictionary.
    """
    results = []
    params = params or ()

    try:
        with connection.cursor() as cursor:
            # Use cursor with DictCursor if available
            if hasattr(cursor, 'dictfetchall'):
                cursor.execute(query, params)
                results = cursor.dictfetchall()
            else:
                # For custom databases, handle fetching as dict
                cursor.execute(query, params)
                column_names = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                results = [dict(zip(column_names, row)) for row in rows]
    except DatabaseError as e:
        # Handle database errors
        print(f"Database error: {e}")

    return results

def get_subdomain_from_request(request):
    """
    Extract subdomain from request headers (Referer, Origin, or Host).
    Returns organization slug derived from subdomain.
    """
    # Try Referer header first
    referer = request.META.get('HTTP_REFERER', '')
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        hostname = parsed.hostname or ''
    else:
        # Fallback to Origin or Host
        origin = request.META.get('HTTP_ORIGIN', '')
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            hostname = parsed.hostname or ''
        else:
            hostname = request.META.get('HTTP_HOST', '').split(':')[0]
    
    # Extract subdomain
    parts = hostname.split('.')
    if len(parts) >= 3:
        subdomain = parts[0]
        # Fallback for www or empty
        if subdomain in ['www', 'webapp', 'api', 'localhost', 'localapi']:
            return 'smsp'
        return subdomain
    return 'smsp'  # Default fallback


def get_assignment_service(request):
    """
    Get or create assignment service for request.
    Provides backward compatibility for code that might run before middleware.
    """
    if not hasattr(request, 'assignment_service') or request.assignment_service is None:
        from strongmsp_app.services.assignment_service import AssignmentService
        request.assignment_service = AssignmentService(request)
    return request.assignment_service
