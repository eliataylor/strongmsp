"""
Notification Service

Helper functions for creating and managing multi-channel notifications.
"""
import uuid
from django.utils import timezone
from django.db import models
from .models import Notifications


def create_notification_group(recipient, message, channels, notification_type=None, 
                            priority='normal', link=None, expires=None, remind_time=None,
                            message_text=None, message_html=None, auto_send=False):
    """
    Create notifications across multiple channels with shared group UUID.
    
    Args:
        recipient: User instance
        message: Base message text
        channels: List of channels ['dashboard', 'email', 'sms']
        notification_type: Type of notification (optional)
        priority: Priority level (default: 'normal')
        link: URL link (optional)
        expires: Expiration datetime (optional)
        remind_time: Reminder datetime (optional)
        message_text: Plain text version (optional)
        message_html: HTML version (optional)
        auto_send: Whether to auto-send (default: False)
    
    Returns:
        List of created Notification objects
    """
    group_id = uuid.uuid4()
    notifications = []
    
    for channel in channels:
        notification = Notifications.objects.create(
            recipient=recipient,
            message=message,
            message_text=message_text or message,
            message_html=message_html,
            channel=channel,
            notification_type=notification_type,
            priority=priority,
            link=link,
            expires=expires,
            remind_time=remind_time,
            notification_group=group_id,
            auto_send=auto_send,
            delivery_status='pending' if channel != 'dashboard' else 'delivered'
        )
        notifications.append(notification)
    
    return notifications


def send_notification(notification_id):
    """
    Send notification via its channel (email/SMS).
    
    Args:
        notification_id: ID of the notification to send
    
    Returns:
        Boolean indicating success
    """
    try:
        notification = Notifications.objects.get(id=notification_id)
        
        if notification.channel == 'dashboard':
            # Dashboard notifications are already "delivered" when created
            notification.delivery_status = 'delivered'
            notification.save()
            return True
            
        elif notification.channel == 'email':
            # TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
            # For now, just mark as sent
            notification.delivery_status = 'sent'
            notification.sent_at = timezone.now()
            notification.save()
            return True
            
        elif notification.channel == 'sms':
            # TODO: Integrate with your SMS service (Twilio, AWS SNS, etc.)
            # For now, just mark as sent
            notification.delivery_status = 'sent'
            notification.sent_at = timezone.now()
            notification.save()
            return True
            
    except Notifications.DoesNotExist:
        return False
    except Exception as e:
        # Log error and mark as failed
        notification.delivery_status = 'failed'
        notification.delivery_error = str(e)
        notification.save()
        return False


def mark_group_seen(notification_group_id):
    """
    Mark all dashboard notifications in a group as seen.
    
    Args:
        notification_group_id: UUID of the notification group
    
    Returns:
        Number of notifications marked as seen
    """
    return Notifications.objects.filter(
        notification_group=notification_group_id,
        channel='dashboard'
    ).update(seen=True)


def get_user_notifications(user, channel=None, seen=None, notification_type=None):
    """
    Get notifications for a user with optional filtering.
    
    Args:
        user: User instance
        channel: Filter by channel (optional)
        seen: Filter by seen status (optional)
        notification_type: Filter by type (optional)
    
    Returns:
        QuerySet of notifications
    """
    queryset = Notifications.objects.filter(recipient=user)
    
    if channel:
        queryset = queryset.filter(channel=channel)
    
    if seen is not None:
        queryset = queryset.filter(seen=seen)
    
    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)
    
    # Filter out expired notifications
    now = timezone.now()
    queryset = queryset.filter(
        models.Q(expires__isnull=True) | models.Q(expires__gt=now)
    )
    
    return queryset.order_by('-created_at')


def get_failed_notifications():
    """
    Get all notifications that failed to send.
    
    Returns:
        QuerySet of failed notifications
    """
    return Notifications.objects.filter(
        delivery_status='failed'
    ).order_by('-created_at')


def retry_failed_notification(notification_id):
    """
    Retry sending a failed notification.
    
    Args:
        notification_id: ID of the notification to retry
    
    Returns:
        Boolean indicating success
    """
    try:
        notification = Notifications.objects.get(id=notification_id)
        
        if notification.delivery_status != 'failed':
            return False
        
        # Reset status and retry
        notification.delivery_status = 'pending'
        notification.delivery_error = None
        notification.save()
        
        return send_notification(notification_id)
        
    except Notifications.DoesNotExist:
        return False


# Example usage functions for common scenarios

def notify_coach_content_shared(recipient, content_title, content_url):
    """Create notifications when coach content is shared."""
    return create_notification_group(
        recipient=recipient,
        message=f"New content shared: {content_title}",
        channels=['dashboard', 'email'],
        notification_type='coach-content',
        link=content_url,
        message_html=f"<h2>New Content Available</h2><p>{content_title}</p>",
        priority='normal'
    )


def notify_assessment_submitted(recipient, assessment_name):
    """Create notifications when an assessment is submitted."""
    return create_notification_group(
        recipient=recipient,
        message=f"Assessment '{assessment_name}' has been submitted",
        channels=['dashboard'],
        notification_type='assessment-submitted',
        priority='normal'
    )


def notify_payment_required(recipient, amount, due_date):
    """Create notifications for payment requirements."""
    return create_notification_group(
        recipient=recipient,
        message=f"Payment of ${amount} is due on {due_date}",
        channels=['dashboard', 'email', 'sms'],
        notification_type='payment',
        priority='high',
        message_text=f"Payment of ${amount} is due on {due_date}",
        message_html=f"<h2>Payment Required</h2><p>Amount: ${amount}</p><p>Due: {due_date}</p>"
    )
