# admin.py
####OBJECT-ACTIONS-ADMIN_IMPORTS-STARTS####
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Users
from .models import Courses
from .models import Assessments
from .models import AssessmentQuestions
from .models import Questions
from .models import QuestionResponses
from .models import Payments
from .models import PromptTemplates
from .models import AgentResponses
from .models import CoachContent
from .models import Shares
####OBJECT-ACTIONS-ADMIN_IMPORTS-ENDS####

from django.contrib.admin.views.main import ChangeList
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Count, Q
from .admin_mixins import SmartAdminMixin


image_html = '<div style="width: 50px; height: 50px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>'
no_image_html = "No Image"

# Custom pagination for large datasets
class LargeTablePaginator(admin.AdminSite):
    # Set higher page sizes with more options
    list_per_page = 50
    list_max_show_all = 1000


# Base admin class with common improvements
class BaseModelAdmin(SmartAdminMixin, admin.ModelAdmin):
    # Better pagination
    list_per_page = 50
    show_full_result_count = False  # Prevents COUNT queries on large tables

    class Media:
        css = { 'all': ('admin/css/admin_enhancements.css',) }
        js = ('admin/js/admin_enhancements.js',)


# Custom ChangeList to optimize queries
class OptimizedChangeList(ChangeList):
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Only select the fields we need for the list display
        if self.list_display:
            required_fields = set(self.list_display)
            if 'id' not in required_fields:
                required_fields.add('id')
            qs = qs.only(*required_fields)
        return qs


####OBJECT-ACTIONS-ADMIN_MODELS-STARTS####
@admin.register(Users)
class UsersAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        (_('Additional Info'), {'fields': ('real_name', 'bio', 'user_types', 'confidence_score')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {
            'classes': ('wide',),
            'fields': ('real_name', 'bio', 'user_types', 'confidence_score'),
        }),
    )
    
    def display_groups(self, obj):
        return ", ".join([group.name for group in obj.groups.all()])
    
    def display_user_types(self, obj):
        if obj.user_types:
            return dict(Users.User_typesChoices.choices).get(obj.user_types, obj.user_types)
        return "Not specified"
    display_user_types.short_description = "User Type"
    
    def display_confidence(self, obj):
        if obj.confidence_score is not None:
            return f"{obj.confidence_score}/100"
        return "Not set"
    display_confidence.short_description = "Confidence"

    list_display = ('id', 'username', 'email', 'get_full_name', 'display_user_types', 'display_confidence', 'display_groups', 'is_active', 'date_joined', 'last_login')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'user_types', 'groups', 'date_joined', 'last_login')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'real_name')
    list_editable = ('is_active',)
    readonly_fields = ('id', 'date_joined', 'last_login')
    date_hierarchy = 'date_joined'
    ordering = ('-date_joined',)

@admin.register(Courses)
class CoursesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def image_tag(self, obj):
        if obj.icon:
            return format_html('<div style="width: 100px; height: 100px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>', obj.icon.url)
        return "No Image"
    image_tag.short_description = "Icon"
    
    def cover_photo_tag(self, obj):
        if obj.cover_photo:
            return format_html('<div style="width: 100px; height: 100px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>', obj.cover_photo.url)
        return "No Cover Photo"
    cover_photo_tag.short_description = "Cover Photo"
    
    def display_price(self, obj):
        if obj.price:
            return f"${obj.price}"
        return "Free"
    display_price.short_description = "Price"
    
    def display_assessments(self, obj):
        assessments = []
        if obj.preassessment:
            assessments.append(f"Pre: {obj.preassessment.title}")
        if obj.postassessment:
            assessments.append(f"Post: {obj.postassessment.title}")
        return ", ".join(assessments) if assessments else "No assessments"
    display_assessments.short_description = "Assessments"

    list_display = ('id', 'title', 'price', 'display_assessments', 'image_tag', 'cover_photo_tag', 'author', 'created_at', 'modified_at')
    list_filter = ('price', 'created_at', 'modified_at', 'author')
    search_fields = ('title', 'description', 'author__username', 'author__email')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('title', 'price')

@admin.register(Assessments)
class AssessmentsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = "Questions"

    list_display = ('id', 'title', 'question_count', 'author', 'created_at', 'modified_at')
    list_filter = ('created_at', 'modified_at', 'author')
    search_fields = ('title', 'author__username', 'author__email')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('title',)

@admin.register(AssessmentQuestions)
class AssessmentQuestionsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_question_text(self, obj):
        if obj.question:
            question_text = obj.question.title
            return question_text[:15] + "..." if len(question_text) > 15 else question_text
        return "No question"
    display_question_text.short_description = "Question Text"
    
    def display_conditions(self, obj):
        if obj.conditions:
            return str(obj.conditions)[:50] + "..." if len(str(obj.conditions)) > 50 else str(obj.conditions)
        return "No conditions"
    display_conditions.short_description = "Conditions"
    
    def get_search_results(self, request, queryset, search_term):
        """Enhanced search to include question text"""
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        
        if search_term:
            # Search in related Questions titles
            question_queryset = queryset.filter(
                question__title__icontains=search_term
            ).distinct()
            
            if question_queryset.exists():
                queryset = question_queryset
        
        return queryset, use_distinct

    list_display = ('id', 'order', 'display_question_text', 'modified_at')
    list_filter = ('order', 'created_at', 'modified_at', 'author', 'question__question_category')
    search_fields = ('author__username', 'author__email', 'question__title', 'question__help_text')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('order', '-created_at')
    list_editable = ('order',)
    
    # Custom form to improve question selection
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "question":
            kwargs["queryset"] = Questions.objects.all().order_by('title')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Questions)
class QuestionsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_category(self, obj):
        if obj.question_category:
            return dict(Questions.Question_categoryChoices.choices).get(obj.question_category, obj.question_category)
        return "Not specified"
    display_category.short_description = "Category"
    
    def display_scale(self, obj):
        if obj.scale:
            return dict(Questions.ScaleChoices.choices).get(obj.scale, obj.scale)
        return "Not specified"
    display_scale.short_description = "Scale"
    
    def display_title_preview(self, obj):
        """Show full title in admin list for better readability"""
        return obj.title
    display_title_preview.short_description = "Question Title"

    list_display = ('id', 'title', 'question_category', 'scale', 'help_text', 'modified_at')
    list_filter = ('question_category', 'scale', 'created_at', 'modified_at', 'author')
    search_fields = ('title', 'help_text', 'author__username', 'author__email')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('title', '-created_at')  # Order by title first for easier finding
    list_editable = ('title', 'question_category', 'scale')
    
    # Make it easier to find questions when selecting
    list_per_page = 100  # Show more questions per page

@admin.register(QuestionResponses)
class QuestionResponsesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_athlete(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return "Unknown"
    display_athlete.short_description = "Athlete"
    
    def display_question(self, obj):
        if obj.question:
            return obj.question.title[:50] + "..." if len(obj.question.title) > 50 else obj.question.title
        return "Unknown question"
    display_question.short_description = "Question"

    list_display = ('id', 'display_athlete', 'display_question', 'response', 'modified_at')
    list_filter = ('response', 'created_at', 'modified_at', 'author', 'question__question_category')
    search_fields = ('author__username', 'author__email', 'author__first_name', 'author__last_name', 'question__title')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('response',)

@admin.register(Payments)
class PaymentsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_athlete(self, obj):
        if obj.athlete:
            return obj.athlete.get_full_name() or obj.athlete.username
        return "Unknown"
    display_athlete.short_description = "Athlete"
    
    def display_coach(self, obj):
        if obj.preferred_coach:
            return obj.preferred_coach.get_full_name() or obj.preferred_coach.username
        return "Not specified"
    display_coach.short_description = "Coach"
    
    def display_course(self, obj):
        if obj.course:
            return obj.course.title
        return "No course"
    display_course.short_description = "Course"
    
    def display_amount(self, obj):
        if obj.paid:
            return f"${obj.paid}"
        return "$0.00"
    display_amount.short_description = "Amount"
    
    def display_status(self, obj):
        if obj.status:
            return dict(Payments.StatusChoices.choices).get(obj.status, obj.status)
        return "Unknown"
    display_status.short_description = "Status"
    
    def display_subscription(self, obj):
        if obj.subscription_ends:
            return obj.subscription_ends.strftime("%Y-%m-%d")
        return "No end date"
    display_subscription.short_description = "Subscription Ends"

    list_display = ('id', 'display_athlete', 'display_coach', 'display_course', 'paid', 'status', 'display_subscription', 'created_at', 'modified_at')
    list_filter = ('status', 'paid', 'subscription_ends', 'created_at', 'modified_at', 'athlete', 'preferred_coach', 'course')
    search_fields = ('athlete__username', 'athlete__email', 'athlete__first_name', 'athlete__last_name', 
                    'preferred_coach__username', 'preferred_coach__email', 'course__title')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('status', 'paid')

@admin.register(PromptTemplates)
class PromptTemplatesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_status(self, obj):
        if obj.status:
            return dict(PromptTemplates.StatusChoices.choices).get(obj.status, obj.status)
        return "Unknown"
    display_status.short_description = "Status"
    
    def display_purpose(self, obj):
        if obj.purpose:
            return dict(PromptTemplates.PurposeChoices.choices).get(obj.purpose, obj.purpose)
        return "Not specified"
    display_purpose.short_description = "Purpose"
    
    def display_format(self, obj):
        if obj.response_format:
            return dict(PromptTemplates.Response_formatChoices.choices).get(obj.response_format, obj.response_format)
        return "Text"
    display_format.short_description = "Format"
    
    def display_prompt_preview(self, obj):
        if obj.prompt:
            return obj.prompt[:100] + "..." if len(obj.prompt) > 100 else obj.prompt
        return "No prompt"
    display_prompt_preview.short_description = "Prompt Preview"

    list_display = ('id', 'purpose', 'status', 'response_format', 'model', 'display_prompt_preview', 'author', 'created_at', 'modified_at')
    list_filter = ('status', 'purpose', 'response_format', 'model', 'created_at', 'modified_at', 'author')
    search_fields = ('prompt', 'instructions', 'model', 'author__username', 'author__email')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('status', 'purpose', 'response_format')

@admin.register(AgentResponses)
class AgentResponsesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_athlete(self, obj):
        if obj.athlete:
            return obj.athlete.get_full_name() or obj.athlete.username
        return "Unknown"
    display_athlete.short_description = "Athlete"
    
    def display_purpose(self, obj):
        if obj.purpose:
            return dict(AgentResponses.PurposeChoices.choices).get(obj.purpose, obj.purpose)
        return "Not specified"
    display_purpose.short_description = "Purpose"
    
    def display_template(self, obj):
        if obj.prompt_template:
            return obj.prompt_template.purpose
        return "No template"
    display_template.short_description = "Template"
    
    def display_message_preview(self, obj):
        if obj.message_body:
            return obj.message_body[:100] + "..." if len(obj.message_body) > 100 else obj.message_body
        return "No message"
    display_message_preview.short_description = "Message Preview"
    
    def display_ai_response_preview(self, obj):
        if obj.ai_response:
            return obj.ai_response[:100] + "..." if len(obj.ai_response) > 100 else obj.ai_response
        return "No AI response"
    display_ai_response_preview.short_description = "AI Response Preview"

    list_display = ('id', 'display_athlete', 'display_purpose', 'display_template', 'display_message_preview', 'display_ai_response_preview', 'created_at', 'modified_at')
    list_filter = ('purpose', 'created_at', 'modified_at', 'athlete', 'prompt_template')
    search_fields = ('message_body', 'ai_response', 'ai_reasoning', 'athlete__username', 'athlete__email', 'athlete__first_name', 'athlete__last_name')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

@admin.register(CoachContent)
class CoachContentAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def image_tag(self, obj):
        if obj.icon:
            return format_html('<div style="width: 100px; height: 100px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>', obj.icon.url)
        return "No Image"
    image_tag.short_description = "Icon"
    
    def cover_photo_tag(self, obj):
        if obj.cover_photo:
            return format_html('<div style="width: 100px; height: 100px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>', obj.cover_photo.url)
        return "No Cover Photo"
    cover_photo_tag.short_description = "Cover Photo"
    
    def display_coach(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return "Unknown"
    display_coach.short_description = "Coach"
    
    def display_privacy(self, obj):
        if obj.privacy:
            return dict(CoachContent.PrivacyChoices.choices).get(obj.privacy, obj.privacy)
        return "Not specified"
    display_privacy.short_description = "Privacy"
    
    def display_title_preview(self, obj):
        if obj.title:
            return obj.title[:100] + "..." if len(obj.title) > 100 else obj.title
        return "No title"
    display_title_preview.short_description = "Title Preview"
    
    def display_body_preview(self, obj):
        if obj.body:
            return obj.body[:100] + "..." if len(obj.body) > 100 else obj.body
        return "No content"
    display_body_preview.short_description = "Content Preview"

    list_display = ('id', 'display_title_preview', 'display_coach', 'privacy', 'image_tag', 'cover_photo_tag', 'created_at', 'modified_at')
    list_filter = ('privacy', 'created_at', 'modified_at', 'author')
    search_fields = ('title', 'body', 'author__username', 'author__email', 'author__first_name', 'author__last_name')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('privacy',)

@admin.register(Shares)
class SharesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_recipient(self, obj):
        if obj.recipient:
            return obj.recipient.get_full_name() or obj.recipient.username
        return "Unknown"
    display_recipient.short_description = "Recipient"
    
    def display_content(self, obj):
        if obj.content:
            return obj.content.title[:50] + "..." if len(obj.content.title) > 50 else obj.content.title
        return "No content"
    display_content.short_description = "Content"
    
    def display_expires(self, obj):
        if obj.expires:
            return obj.expires.strftime("%Y-%m-%d")
        return "No expiration"
    display_expires.short_description = "Expires"
    
    def is_expired(self, obj):
        if obj.expires:
            from django.utils import timezone
            return obj.expires < timezone.now().date()
        return False
    is_expired.boolean = True
    is_expired.short_description = "Expired"

    list_display = ('id', 'display_recipient', 'display_content', 'expires', 'is_expired', 'created_at', 'modified_at')
    list_filter = ('expires', 'created_at', 'modified_at', 'recipient', 'content__author')
    search_fields = ('recipient__username', 'recipient__email', 'recipient__first_name', 'recipient__last_name', 
                    'content__title', 'content__author__username')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('expires',)
####OBJECT-ACTIONS-ADMIN_MODELS-ENDS####