# admin.py
####OBJECT-ACTIONS-ADMIN_IMPORTS-STARTS####
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django import forms
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Users
from .models import Courses
from .models import Assessments
from .models import AssessmentQuestions
from .models import Questions
from .models import QuestionResponses
from .models import Products
from .models import Payments
from .models import PaymentAssignments
from .models import PromptTemplates
from .models import AgentResponses
from .models import CoachContent
from .models import Shares
from .models import Notifications
from .models import Organizations
from .models import OrganizationProducts
from .models import SignUpCodes
from .models import UserOrganizations
from django.contrib.auth.models import Group
####OBJECT-ACTIONS-ADMIN_IMPORTS-ENDS####

from django.contrib.admin.views.main import ChangeList
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Count, Q
from django.contrib.admin import SimpleListFilter
from .admin_mixins import SmartAdminMixin
# from django_summernote.admin import SummernoteModelAdmin  # Removed - using Markdown instead of HTML

image_html = '<div style="width: 50px; height: 50px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>'
no_image_html = "No Image"

admin.site.site_header = "Strong Mind Strong Performance"
admin.site.site_title = "Strong Mind Strong Performance"
admin.site.index_title = "Welcome Coach!"


def safe_display_name(obj):
    """
    Safely get display name for both Users and SuperModel objects.
    """
    if not obj:
        return "Unknown"
    
    # If it's a SuperModel object, use author_display_name
    if hasattr(obj, 'author_display_name'):
        return obj.author_display_name
    
    # If it's a Users object, handle it safely
    if hasattr(obj, 'get_full_name'):
        full_name = obj.get_full_name()
        if full_name and full_name.strip():
            return full_name
        elif obj.username:
            return obj.username
        else:
            return f"User #{obj.id}"
    
    # Fallback
    return str(obj)


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


# Custom filter for coaches
class CoachFilter(SimpleListFilter):
    title = 'coach'
    parameter_name = 'coach'
    
    def lookups(self, request, model_admin):
        """Return a list of tuples for the filter options"""
        # Get users who are coaches (by being in a Coaches group)
        coach_users = Users.objects.filter(
            groups__name='Coaches'
        ).distinct().order_by('username')
        
        return [(user.id, f"{safe_display_name(user)} ({user.email})") for user in coach_users if user]
    
    def queryset(self, request, queryset):
        """Filter the queryset based on the selected coach"""
        if self.value():
            return queryset.filter(author_id=self.value())
        return queryset


####OBJECT-ACTIONS-ADMIN_MODELS-STARTS####
@admin.register(Users)
class UsersAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        (_('Additional Info'), {'fields': ('real_name', 'bio', 'gender', 'ethnicity', 'birthdate', 'zip_code')}),
        (_('Profile Images'), {'fields': ('avatar', 'photo', 'avatar_preview', 'photo_preview')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {
            'classes': ('wide',),
            'fields': ('real_name', 'bio', 'avatar', 'photo'),
        }),
    )

    def display_groups(self, obj):
        return ", ".join([group.name for group in obj.groups.all()])



    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<div style="width: 100px; height: 100px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid #ddd;"></div>', obj.avatar.url)
        return "No Avatar"
    avatar_preview.short_description = "Avatar Preview"
    avatar_preview.allow_tags = True

    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<div style="width: 100px; height: 100px; background-image: url({}); background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid #ddd;"></div>', obj.photo.url)
        return "No Photo"
    photo_preview.short_description = "Photo Preview"
    photo_preview.allow_tags = True

    def avatar_thumbnail(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 50%;" />', obj.avatar.url)
        return "—"
    avatar_thumbnail.short_description = "Avatar"
    avatar_thumbnail.allow_tags = True

    list_display = ('id', 'avatar_thumbnail', 'username', 'email', 'get_full_name', 'display_groups', 'is_active', 'date_joined', 'last_login')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'groups', 'date_joined', 'last_login')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'real_name')
    list_editable = ('is_active',)
    readonly_fields = ('id', 'date_joined', 'last_login', 'avatar_preview', 'photo_preview')
    date_hierarchy = 'date_joined'
    ordering = ('-date_joined',)

@admin.register(Courses)
class CoursesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')

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

    list_display = ('id', 'title', 'price', 'display_assessments', 'author', 'created_at', 'modified_at')
    list_filter = ('price', 'created_at', 'modified_at', 'author')
    search_fields = ('title', 'description', 'author__username', 'author__email')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('title', 'price')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "author":
            # Limit to users in the Agents group
            kwargs["queryset"] = Users.objects.filter(groups__name='Agents').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

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

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "author":
            # Limit to users in the Agents group
            kwargs["queryset"] = Users.objects.filter(groups__name='Agents').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(AssessmentQuestions)
class AssessmentQuestionsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')

    def display_question_text(self, obj):
        if obj.question:
            return obj.question.get_admin_display()
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
    list_filter = ('created_at', 'modified_at', 'author', 'question__question_category')
    search_fields = ('author__username', 'author__email', 'question__title', 'question__help_text')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('order', '-created_at')
    list_editable = ('order',)

    # Custom form to improve question selection
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "question":
            kwargs["queryset"] = Questions.objects.all().order_by('title')
        elif db_field.name == "author":
            # Limit to users in the Agents group
            kwargs["queryset"] = Users.objects.filter(groups__name='Agents').distinct().order_by('username')
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

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "author":
            # Limit to users in the Agents group
            kwargs["queryset"] = Users.objects.filter(groups__name='Agents').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(QuestionResponses)
class QuestionResponsesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')

    def display_athlete(self, obj):
        return safe_display_name(obj.author)
    display_athlete.short_description = "Athlete"

    def display_question(self, obj):
        if obj.question:
            return obj.question.get_admin_display()
        return "Unknown question"
    display_question.short_description = "Question"

    def display_assessment(self, obj):
        if obj.assessment:
            return obj.assessment.title
        return "No assessment"
    display_assessment.short_description = "Assessment"

    list_display = ('id', 'display_athlete', 'display_question', 'display_assessment', 'response', 'modified_at')
    list_filter = ('response', 'created_at', 'modified_at', 'author', 'question__question_category', 'assessment')
    search_fields = ('author__username', 'author__email', 'author__first_name', 'author__last_name', 'question__title', 'assessment__title')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('response',)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "author":
            # Limit to users in the Athletes group
            kwargs["queryset"] = Users.objects.filter(groups__name='Athletes').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Products)
class ProductsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    list_display = ('id', 'title', 'price', 'is_active', 'created_at', 'modified_at')
    list_filter = ('is_active', 'price', 'created_at', 'modified_at')
    search_fields = ('title', 'description', 'stripe_product_id', 'stripe_price_id')
    list_editable = ('is_active', 'price')
    ordering = ('-created_at',)

@admin.register(Payments)
class PaymentsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')

    def display_purchaser(self, obj):
        return safe_display_name(obj.author)
    display_purchaser.short_description = "Purchaser"

    def display_product(self, obj):
        if obj.product:
            return obj.product.title
        return "No product"
    display_product.short_description = "Product"

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

    list_display = ('id', 'display_purchaser', 'display_product', 'paid', 'status', 'display_subscription', 'created_at', 'modified_at')
    list_filter = ('status', 'paid', 'subscription_ends', 'created_at', 'modified_at', 'product')
    search_fields = ('author__username', 'author__email', 'author__first_name', 'author__last_name',
                    'product__title', 'stripe_payment_intent_id', 'stripe_customer_id')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('status', 'paid')

@admin.register(PaymentAssignments)
class PaymentAssignmentsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    def display_payment(self, obj):
        return f"Payment #{obj.payment.id} - {obj.payment.product.title if obj.payment.product else 'No Product'}"
    display_payment.short_description = "Payment"
    
    def display_athlete(self, obj):
        if obj.athlete:
            return safe_display_name(obj.athlete)
        return "No athlete assigned"
    display_athlete.short_description = "Athlete"
    
    def display_coaches(self, obj):
        coaches = obj.coaches.all()
        if coaches:
            return ", ".join([safe_display_name(coach) for coach in coaches])
        return "No coaches assigned"
    display_coaches.short_description = "Coaches"
    
    def display_parents(self, obj):
        parents = obj.parents.all()
        if parents:
            return ", ".join([safe_display_name(parent) for parent in parents])
        return "No parents assigned"
    display_parents.short_description = "Parents"
    
    list_display = ('id', 'display_payment', 'display_athlete', 'display_coaches', 'display_parents', 'created_at', 'modified_at')
    list_filter = ('created_at', 'modified_at', 'athlete', 'coaches', 'parents')
    search_fields = ('payment__id', 'athlete__username', 'athlete__email', 'coaches__username', 'parents__username')
    filter_horizontal = ('coaches', 'parents')
    ordering = ('-created_at',)

@admin.register(PromptTemplates)
class PromptTemplatesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at', 'available_tokens_info')

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

    def display_author(self, obj):
        return safe_display_name(obj.author)
    display_author.short_description = "Author"

    def available_tokens_info(self, obj):
        """Display available token options for prompt templates"""
        # Import here to avoid circular imports
        try:
            from oasheets_app.services.prompt_tester import TokenReplacer
            token_replacer = TokenReplacer()
            available_tokens = token_replacer.get_available_tokens()
        except ImportError:
            # Fallback if import fails
            available_tokens = [
                "assessment_aggregated", "assesment_responses", 
                "lesson_plan", "curriculum", "talking_points", 
                "feedback_report", "scheduling_email"
            ]
        
        # Create token descriptions
        token_descriptions = {
            "assessment_aggregated": "Aggregated assessment results by category",
            "assesment_responses": "Detailed question responses",
            "lesson_plan": "Most recent lesson plan response",
            "curriculum": "Most recent curriculum response",
            "talking_points": "Most recent talking points response",
            "feedback_report": "Most recent feedback report response",
            "scheduling_email": "Most recent scheduling email response"
        }
        
        # Build the HTML dynamically
        assessment_tokens = [token for token in available_tokens if token.startswith('assesment')]
        agent_tokens = [token for token in available_tokens if not token.startswith('assesment')]
        
        token_info = f"""
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h4 style="margin-top: 0; color: #495057;">Available Token Replacements</h4>
            <p style="margin-bottom: 10px; color: #6c757d;">
                Use these tokens in your prompt or instructions by wrapping them in double curly braces: <code>{{{{token_name}}}}</code>
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <h5 style="margin: 10px 0 5px 0; color: #495057;">Assessment Data:</h5>
                    <ul style="margin: 0; padding-left: 20px;">
        """
        
        for token in assessment_tokens:
            description = token_descriptions.get(token, "No description available")
            token_info += f'<li><code>{{{{{token}}}}}</code> - {description}</li>'
        
        token_info += """
                    </ul>
                </div>
                <div>
                    <h5 style="margin: 10px 0 5px 0; color: #495057;">Agent Responses:</h5>
                    <ul style="margin: 0; padding-left: 20px;">
        """
        
        for token in agent_tokens:
            description = token_descriptions.get(token, "No description available")
            token_info += f'<li><code>{{{{{token}}}}}</code> - {description}</li>'
        
        token_info += """
                    </ul>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background-color: #e9ecef; border-radius: 3px;">
                <strong>Note:</strong> Tokens will be replaced with actual data when the prompt is processed. 
                If no data is available, appropriate fallback messages will be displayed.
            </div>
        </div>
        """
        return format_html(token_info)
    available_tokens_info.short_description = "Available Tokens"
    available_tokens_info.help_text = "Documentation of available token replacements for prompts and instructions"

    list_display = ('id', 'display_author', 'purpose', 'display_prompt_preview','modified_at')
    list_filter = ('status', 'purpose', 'response_format', 'model', 'created_at', 'modified_at', 'author')
    search_fields = ('prompt', 'instructions', 'model', 'author__username', 'author__email')
    readonly_fields = ('id', 'created_at', 'modified_at', 'available_tokens_info')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('author', 'purpose', 'status', 'model', 'response_format')
        }),
        ('Content', {
            'fields': ('instructions', 'prompt'),
            'description': 'Use {{token_name}} syntax for dynamic content replacement'
        }),
        ('Token Documentation', {
            'fields': ('available_tokens_info',),
            'classes': ('collapse',),
            'description': 'Reference for available token replacements'
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'modified_at'),
            'classes': ('collapse',)
        })
    )


    def save_model(self, request, obj, form, change):
        """Automatically set the author to the current user when creating a new object if not already set"""
        if not change and not obj.author:  # Only for new objects without an author
            obj.author = request.user
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        
        # Set default author to current user when creating new objects
        if not obj:  # Creating a new object
            if 'author' in form.base_fields:
                form.base_fields['author'].initial = request.user
                form.base_fields['author'].help_text = "Author will default to current user if not specified"
        
        # Add help text to prompt and instructions fields
        if 'prompt' in form.base_fields:
            form.base_fields['prompt'].help_text = (
                "Available context tokens (use in prompts/instructions):\n\n"
                "People:\n"
                "  {ATHLETE_NAME} - Athlete's full name\n"
                "  {ATHLETE_AGE} - Athlete's age (calculated from birthdate)\n"
                "  {ATHLETE_GENDER} - Athlete's gender\n"
                "  {ATHLETE_PRONOUN} - Athlete's preferred pronouns\n"
                "  {ATHLETE_CITY} - Athlete's city\n"
                "  {ATHLETE_ORG} - Athlete's organization\n"
                "  {ATHLETE_ETHNICITY} - Athlete's ethnicity\n"
                "  {ATHLETE_IMAGE} - Athlete's image URL\n"
                "  {ATHLETE_AVATAR} - Athlete's avatar URL\n"
                "  {COACH_NAME} - Coach's full name\n\n"
                "Assessment Data:\n"
                "  {ASSESSMENT_INFO} - Assessment metadata\n"
                "  {ASSESSMENT_RESPONSES} - Individual question responses\n"
                "  {ASSESSMENT_AGGREGATED} - Spider chart statistics\n\n"
                "Published Content (for sequential agents):\n"
                "  {PUBLISHED_FEEDBACK_REPORT}\n"
                "  {PUBLISHED_CURRICULUM}\n"
                "  {PUBLISHED_LESSON_PLAN}\n"
                "  {PUBLISHED_TALKING_POINTS}\n"
                "  {PUBLISHED_SCHEDULING_EMAIL}\n\n"
                "Regeneration:\n"
                "  {VERSION_HISTORY} - Previous versions\n"
                "  {CHANGE_REQUEST} - Coach's change request\n"
            )
        
        if 'instructions' in form.base_fields:
            form.base_fields['instructions'].help_text = (
                "Available context tokens (use in prompts/instructions):\n\n"
                "People:\n"
                "  {ATHLETE_NAME} - Athlete's full name\n"
                "  {ATHLETE_AGE} - Athlete's age (calculated from birthdate)\n"
                "  {ATHLETE_GENDER} - Athlete's gender\n"
                "  {ATHLETE_PRONOUN} - Athlete's preferred pronouns\n"
                "  {ATHLETE_CITY} - Athlete's city\n"
                "  {ATHLETE_ORG} - Athlete's organization\n"
                "  {ATHLETE_ETHNICITY} - Athlete's ethnicity\n"
                "  {ATHLETE_IMAGE} - Athlete's image URL\n"
                "  {ATHLETE_AVATAR} - Athlete's avatar URL\n"
                "  {COACH_NAME} - Coach's full name\n\n"
                "Assessment Data:\n"
                "  {ASSESSMENT_INFO} - Assessment metadata\n"
                "  {ASSESSMENT_RESPONSES} - Individual question responses\n"
                "  {ASSESSMENT_AGGREGATED} - Spider chart statistics\n\n"
                "Published Content (for sequential agents):\n"
                "  {PUBLISHED_FEEDBACK_REPORT}\n"
                "  {PUBLISHED_CURRICULUM}\n"
                "  {PUBLISHED_LESSON_PLAN}\n"
                "  {PUBLISHED_TALKING_POINTS}\n"
                "  {PUBLISHED_SCHEDULING_EMAIL}\n\n"
                "Regeneration:\n"
                "  {VERSION_HISTORY} - Previous versions\n"
                "  {CHANGE_REQUEST} - Coach's change request\n"
            )
        
        return form

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "author":
            # Limit to users in the Agents group
            kwargs["queryset"] = Users.objects.filter(groups__name='Agents').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(AgentResponses)
class AgentResponsesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at', 'token_usage_info')

    def display_athlete(self, obj):
        if obj.athlete:
            return safe_display_name(obj.athlete)
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

    def display_assignment(self, obj):
        if obj.assignment:
            athlete_name = safe_display_name(obj.assignment.athlete) if obj.assignment.athlete else 'No Athlete'
            return f"Assignment #{obj.assignment.id} - {athlete_name}"
        return "No assignment"
    display_assignment.short_description = "Assignment"

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

    def token_usage_info(self, obj):
        """Display information about token usage in this response"""
        if not obj.prompt_template:
            return "No template associated"
        
        # Check if the template uses any tokens
        template_text = f"{obj.prompt_template.instructions or ''} {obj.prompt_template.prompt or ''}"
        import re
        token_pattern = r'\{\{([^}]+)\}\}'
        tokens_used = re.findall(token_pattern, template_text)
        
        if not tokens_used:
            return "No tokens used in this template"
        
        token_list = ", ".join([f"{{{{{token}}}}}" for token in set(tokens_used)])
        return format_html(
            '<div style="background-color: #e7f3ff; padding: 10px; border-radius: 3px; border-left: 4px solid #007bff;">'
            '<strong>Tokens used in template:</strong><br>'
            '<code style="background-color: #f8f9fa; padding: 2px 4px; border-radius: 2px;">{}</code>'
            '</div>',
            token_list
        )
    token_usage_info.short_description = "Token Usage"
    token_usage_info.help_text = "Shows which tokens were used in the prompt template for this response"

    list_display = ('id', 'display_athlete', 'display_purpose', 'display_template', 'display_assignment', 'display_message_preview', 'display_ai_response_preview', 'created_at', 'modified_at')
    list_filter = ('purpose', 'created_at', 'modified_at', 'athlete', 'prompt_template', 'assignment')
    search_fields = ('message_body', 'ai_response', 'ai_reasoning', 'athlete__username', 'athlete__email', 'athlete__first_name', 'athlete__last_name', 'assignment__id')
    readonly_fields = ('id', 'created_at', 'modified_at', 'token_usage_info')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    fieldsets = (
        ('Response Information', {
            'fields': ('athlete', 'assignment', 'purpose', 'prompt_template', 'message_body')
        }),
        ('AI Response', {
            'fields': ('ai_response', 'ai_reasoning')
        }),
        ('Token Usage', {
            'fields': ('token_usage_info',),
            'classes': ('collapse',),
            'description': 'Shows which tokens were used in the prompt template'
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'modified_at'),
            'classes': ('collapse',)
        })
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "athlete":
            # Limit to users in the Athletes group
            kwargs["queryset"] = Users.objects.filter(groups__name='Athletes').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(CoachContent)
class CoachContentAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')
    
    # Use a textarea for Markdown editing instead of Summernote
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'body' in form.base_fields:
            form.base_fields['body'].widget = forms.Textarea(attrs={'rows': 20, 'cols': 80})
        return form

    def display_coach(self, obj):
        return safe_display_name(obj.author)
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

    def display_assignment(self, obj):
        if obj.assignment:
            athlete_name = safe_display_name(obj.assignment.athlete) if obj.assignment.athlete else 'No Athlete'
            return f"Assignment #{obj.assignment.id} - {athlete_name}"
        return "No assignment"
    display_assignment.short_description = "Assignment"

    def display_coach_delivered(self, obj):
        if obj.coach_delivered:
            return obj.coach_delivered.strftime("%Y-%m-%d %H:%M")
        return "Not delivered"
    display_coach_delivered.short_description = "Coach Delivered"

    def display_athlete_received(self, obj):
        if obj.athlete_received:
            return obj.athlete_received.strftime("%Y-%m-%d %H:%M")
        return "Not received"
    display_athlete_received.short_description = "Athlete Received"

    def display_parent_received(self, obj):
        if obj.parent_received:
            return obj.parent_received.strftime("%Y-%m-%d %H:%M")
        return "Not received"
    display_parent_received.short_description = "Parent Received"

    def screenshot_dark_thumb(self, obj):
        if obj.screenshot_dark:
            return format_html(
                '<div style="width: 80px; height: 60px; background-image: url({}); background-size: cover; background-repeat: no-repeat; background-position: center; border: 1px solid #ddd; border-radius: 4px;"></div>',
                obj.screenshot_dark.url
            )
        return "No Screenshot"
    screenshot_dark_thumb.short_description = "Dark Screenshot"

    list_display = ('id', 'screenshot_dark_thumb', 'display_title_preview', 'display_coach', 'display_assignment', 'source_draft', 'display_coach_delivered', 'display_athlete_received', 'display_parent_received', 'created_at', 'modified_at')
    list_filter = ('coach_delivered', 'athlete_received', 'parent_received', 'created_at', 'modified_at', 'assignment', CoachFilter)
    search_fields = ('title', 'body', 'author__username', 'author__email', 'author__first_name', 'author__last_name', 'assignment__id')
    readonly_fields = ('id', 'created_at', 'modified_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    fieldsets = (
        ('Content Information', {
            'fields': ('author', 'assignment', 'source_draft', 'athlete', 'title', 'body', 'purpose', 'privacy')
        }),
        ('Media', {
            'fields': ('screenshot_light', 'screenshot_dark'),
            'classes': ('collapse',)
        }),
        ('Delivery Status', {
            'fields': ('coach_delivered', 'athlete_received', 'parent_received'),
            'description': 'Track when content was delivered and received by different parties'
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'modified_at'),
            'classes': ('collapse',)
        })
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "author":
            # Limit to users in the Agents group
            kwargs["queryset"] = Users.objects.filter(groups__name='Agents').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Shares)
class SharesAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at')

    def display_recipient(self, obj):
        if obj.recipient:
            return safe_display_name(obj.recipient)
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

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "recipient":
            # Limit to users in the Athletes group
            kwargs["queryset"] = Users.objects.filter(groups__name='Athletes').distinct().order_by('username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

class NotificationsAdmin(BaseModelAdmin):
    readonly_fields = ('id', 'created_at', 'modified_at', 'notification_group')

    def display_recipient(self, obj):
        if obj.recipient:
            return safe_display_name(obj.recipient)
        return "Unknown"
    display_recipient.short_description = "Recipient"

    def display_message(self, obj):
        return obj.message[:50] + "..." if len(obj.message) > 50 else obj.message
    display_message.short_description = "Message"

    def display_delivery_status(self, obj):
        if obj.channel == 'dashboard':
            return "Seen" if obj.seen else "Unseen"
        return obj.get_delivery_status_display()
    display_delivery_status.short_description = "Status"

    def display_sent_at(self, obj):
        if obj.sent_at:
            return obj.sent_at.strftime("%Y-%m-%d %H:%M")
        return "Not sent"
    display_sent_at.short_description = "Sent At"

    def display_expires(self, obj):
        if obj.expires:
            return obj.expires.strftime("%Y-%m-%d %H:%M")
        return "No expiration"
    display_expires.short_description = "Expires"

    def is_expired(self, obj):
        if obj.expires:
            from django.utils import timezone
            return obj.expires < timezone.now()
        return False
    is_expired.boolean = True
    is_expired.short_description = "Expired"

    def mark_as_seen(self, request, queryset):
        """Mark selected notifications as seen"""
        updated = queryset.filter(channel='dashboard').update(seen=True)
        self.message_user(request, f"{updated} dashboard notifications marked as seen.")
    mark_as_seen.short_description = "Mark as seen"

    def send_notifications(self, request, queryset):
        """Manually trigger sending of selected notifications"""
        # This would integrate with your email/SMS service
        from django.utils import timezone
        updated = queryset.filter(delivery_status='pending').update(delivery_status='sent', sent_at=timezone.now())
        self.message_user(request, f"{updated} notifications marked as sent.")
    send_notifications.short_description = "Send notifications"

    list_display = ('id', 'display_recipient', 'channel', 'notification_type', 'priority', 'display_message', 'display_delivery_status', 'display_sent_at', 'display_expires', 'is_expired', 'seen', 'created_at')
    list_filter = ('channel', 'delivery_status', 'notification_type', 'priority', 'seen', 'auto_send', 'expires', 'created_at', 'modified_at', 'recipient')
    search_fields = ('recipient__username', 'recipient__email', 'recipient__first_name', 'recipient__last_name', 'message', 'notification_group')
    readonly_fields = ('id', 'created_at', 'modified_at', 'notification_group')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_editable = ('seen', 'priority')
    actions = ['mark_as_seen', 'send_notifications']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('recipient', 'message', 'message_text', 'message_html', 'notification_type', 'priority')
        }),
        ('Delivery', {
            'fields': ('channel', 'delivery_status', 'sent_at', 'delivery_error', 'seen', 'auto_send')
        }),
        ('Scheduling', {
            'fields': ('remind_time', 'expires', 'link')
        }),
        ('Metadata', {
            'fields': ('notification_group', 'id', 'created_at', 'modified_at'),
            'classes': ('collapse',)
        }),
    )

# Register the admin classes
admin.site.register(Notifications, NotificationsAdmin)

# Organization-related admin classes
class OrganizationProductsInline(admin.TabularInline):
    model = OrganizationProducts
    extra = 1
    fields = ('product', 'is_featured', 'display_order')

class OrganizationsAdmin(BaseModelAdmin):
    list_display = ('name', 'short_name', 'slug', 'is_active', 'contact_email', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'short_name', 'slug', 'contact_email')
    inlines = [OrganizationProductsInline]
    fieldsets = (
        (None, {
            'fields': ('name', 'short_name', 'slug', 'is_active')
        }),
        ('Contact Information', {
            'fields': ('contact_email', 'contact_phone'),
            'classes': ('collapse',)
        }),
        ('Branding Settings', {
            'fields': ('logo', 'custom_logo_base64', 'branding_palette', 'branding_typography'),
            'classes': ('collapse',)
        }),
    )

class SignUpCodesAdmin(BaseModelAdmin):
    list_display = ('code', 'organization', 'discount_type', 'discount_value', 'current_uses', 'max_uses', 'is_active', 'valid_until')
    list_filter = ('organization', 'discount_type', 'is_active', 'valid_until')
    search_fields = ('code', 'organization__name')
    filter_horizontal = ('applicable_products',)

class UserOrganizationsGroupsInline(admin.TabularInline):
    model = UserOrganizations.groups.through
    extra = 0
    verbose_name = "Group"
    verbose_name_plural = "Groups"
    autocomplete_fields = ('group',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('group')

class UserOrganizationsAdmin(BaseModelAdmin):
    list_display = ('user', 'organization', 'display_groups', 'is_active', 'joined_at')
    list_filter = ('organization', 'groups', 'is_active', 'joined_at')
    search_fields = ('user__username', 'user__email', 'organization__name')
    filter_horizontal = ('groups',)
    list_editable = ('is_active',)
    inlines = [UserOrganizationsGroupsInline]
    
    def display_groups(self, obj):
        """Display groups as a comma-separated string"""
        if obj.groups.exists():
            return ', '.join([group.name for group in obj.groups.all()])
        return 'No groups'
    display_groups.short_description = 'Groups'
    display_groups.admin_order_field = 'groups__name'

class GroupAdmin(BaseModelAdmin):
    list_display = ('name', 'user_count')
    search_fields = ('name',)
    ordering = ('name',)
    
    def user_count(self, obj):
        """Display the number of users in this group"""
        return obj.user_set.count()
    user_count.short_description = 'Users Count'
    user_count.admin_order_field = 'user_set__count'

# Unregister the default Group admin and register our custom one
admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)
admin.site.register(Organizations, OrganizationsAdmin)
admin.site.register(SignUpCodes, SignUpCodesAdmin)
admin.site.register(UserOrganizations, UserOrganizationsAdmin)
####OBJECT-ACTIONS-ADMIN_MODELS-ENDS####
