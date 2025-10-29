from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model
from utils.models import BumpParentsModelMixin
from allauth.account.models import EmailAddress
from django.dispatch import receiver
from allauth.account.signals import email_confirmed
from django.utils.timezone import now
from django.core.exceptions import ValidationError
from django.utils import timezone
import os

def upload_file_path(instance, filename):
	ext = filename.split('.')[-1]  # e.g. "jpg"
	# add datetime suffix to avoid collisions
	new_filename = f"{os.path.basename(filename)}_{timezone.now().strftime('%Y%m%d%H%M%S')}.{ext}"
	# WARN: watch for overwrites when using DataBuilder or any batch upload

	# Use strftime to create a "year-month" folder dynamically
	date_folder = timezone.now().strftime('%Y-%m')

	# Construct the final upload path: "uploads/<yyyy-mm>/<filename>"
	return os.path.join('uploads', date_folder, new_filename)

def screenshot_upload_path(instance, filename):
	return f'coachcontent/screenshots/{filename}'

class Users(AbstractUser, BumpParentsModelMixin):
	class Meta:
		verbose_name = "User"
		verbose_name_plural = "Users"
		ordering = ['last_login']

	class GenderChoices(models.TextChoices):
		male = ("male", "Male")
		female = ("female", "Female")
		rather_not_say = ("rather_not_say", "Rather Not Say")

	class EthnicityChoices(models.TextChoices):
		african_american = ("african_american", "Black or African American")
		caucasian = ("caucasian", "White")
		american_native = ("american_native", "Native America")
		south_asian = ("asian", "Asian")
		hispanic_latino = ("hispanic_latino", "Hispanic or Latino")
		other = ("other", "Other")
		prefer_not_to_say = ("prefer_not_to_say", "Prefer Not to Say")

	real_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Real Name')
	bio = models.TextField(blank=True, null=True, verbose_name='Bio')
	avatar = models.ImageField(upload_to=upload_file_path, blank=True, null=True, verbose_name='Avatar')
	photo = models.ImageField(upload_to=upload_file_path, blank=True, null=True, verbose_name='Photo')
	
	# New demographic fields
	gender = models.CharField(max_length=15, choices=GenderChoices.choices, verbose_name='Gender', blank=True, null=True)
	ethnicity = models.JSONField(blank=True, null=True, verbose_name='Ethnicity', 
		help_text='Array of ethnicity choices - allows multiple selection')
	birthdate = models.DateField(blank=True, null=True, verbose_name='Birthdate')
	zip_code = models.CharField(max_length=10, blank=True, null=True, verbose_name='Zip Code')
	
	# Assessment category scores (cached from most recent assessment)
	category_performance_mindset = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Performance Mindset Score'
	)
	category_emotional_regulation = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Emotional Regulation Score'
	)
	category_confidence = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Confidence Score'
	)
	category_resilience_motivation = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Resilience & Motivation Score'
	)
	category_concentration = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Concentration Score'
	)
	category_leadership = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Leadership Score'
	)
	category_mental_wellbeing = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Mental Well-being Score'
	)
	category_total_score = models.DecimalField(
		max_digits=4, decimal_places=2, blank=True, null=True,
		verbose_name='Sum of Category Averages for sorting only'
	)


	def __str__(self):
		full_name = self.get_full_name()
		if full_name and full_name.strip():
			return full_name
		short_name = self.get_short_name()
		if short_name and short_name.strip():
			return short_name
		elif self.username.strip():
			return self.username
		else:
			return str(self.id) # never expose the email

	def save(self, *args, **kwargs):
		super().save(*args, **kwargs)

	def add_email_address(self, request, new_email):
		# Add a new email address for the user, and send email confirmation.
		# Old email will remain the primary until the new one is confirmed.
		return EmailAddress.objects.add_email(request, request.user, new_email, confirm=True)
	
	def calculate_age(self):
		"""
		Calculate age from birthdate.
		
		Returns:
			int: Age in years, or None if birthdate is not set
		"""
		if not self.birthdate:
			return None
		
		today = timezone.now().date()
		age = today.year - self.birthdate.year
		
		# Adjust if birthday hasn't occurred this year
		if today.month < self.birthdate.month or (today.month == self.birthdate.month and today.day < self.birthdate.day):
			age -= 1
		
		return age


	@receiver(email_confirmed)
	def update_user_email(sender, request, email_address, **kwargs):
		# Once the email address is confirmed, make new email_address primary.
		# This also sets user.email to the new email address.
		# email_address is an instance of allauth.account.models.EmailAddress
		email_address.set_as_primary()
		# Get rid of old email addresses
		EmailAddress.objects.filter(user=email_address.user).exclude(primary=True).delete()

class SuperModel(models.Model):
	created_at = models.DateTimeField(auto_now_add=True)
	modified_at = models.DateTimeField(auto_now=True)
	author = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
	class Meta:
		abstract = True
		ordering = ['modified_at']

	@classmethod
	def get_default_author(cls):
		"""
		Get a default admin user for records that don't have an author.
		This prevents NULL author issues in admin interface.
		"""
		try:
			# Try to get the first superuser
			User = get_user_model()
			admin_user = User.objects.filter(is_superuser=True).first()
			if admin_user:
				return admin_user
			
			# If no superuser, get the first staff user
			staff_user = User.objects.filter(is_staff=True).first()
			if staff_user:
				return staff_user
			
			# If no staff user, get the first user
			first_user = User.objects.first()
			if first_user:
				return first_user
			
			# If no users exist, return None (this shouldn't happen in normal operation)
			return None
		except Exception:
			return None

	def save(self, *args, **kwargs):
		# Set default author if none is provided
		if not self.author:
			self.author = self.get_default_author()
		
		self.modified_at = now()
		super().save(*args, **kwargs)

	@property
	def author_display_name(self):
		"""
		Safely get the author's display name, handling None authors.
		"""
		if not self.author:
			return "Unknown Author"
		
		full_name = self.author.get_full_name()
		if full_name and full_name.strip():
			return full_name
		elif self.author.username:
			return self.author.username
		else:
			return f"User #{self.author.id}"

	def __str__(self):
		if hasattr(self, "title"):
			return self.title
		elif hasattr(self, "name"):
			return self.name
		elif hasattr(self, "slug"):
			return self.slug

		return super().__str__()

	@classmethod
	def get_current_user(cls, request):
		if hasattr(request, 'user') and request.user.is_authenticated:
			return request.user
		return None


class Products(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Product"
		verbose_name_plural = "Products"

	title = models.CharField(max_length=255, verbose_name='Title')
	description = models.TextField(blank=True, null=True, verbose_name='Description')
	price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Price')
	stripe_product_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Stripe Product ID')
	stripe_price_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Stripe Price ID')
	is_active = models.BooleanField(default=True, verbose_name='Is Active')
	features = models.JSONField(blank=True, null=True, verbose_name='Features', help_text='JSON containing agents, content_variations, and assessment counts')
	pre_assessment = models.ForeignKey('Assessments', on_delete=models.PROTECT, related_name='+', null=False, verbose_name='Pre-Assessment')
	post_assessment = models.ForeignKey('Assessments', on_delete=models.SET_NULL, related_name='+', null=True, blank=True, verbose_name='Post-Assessment')

class Assessments(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Assessment"
		verbose_name_plural = "Assessments"

	title = models.CharField(max_length=255, verbose_name='Title')
	description = models.TextField(blank=True, null=True, verbose_name='Description')
	questions = models.ManyToManyField('AssessmentQuestions', related_name='questions_to_assessments', verbose_name='Questions')

class AssessmentQuestions(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Assessment Question"
		verbose_name_plural = "Assessment Questions"

	def __str__(self):
		if self.question:
			return f'{self.order}. {self.question.title}'
		return f'Assessment Question {self.order} (No Question)'

	def get_admin_display(self):
		"""Returns truncated display for admin interface"""
		if self.question:
			return f'{self.order}. {self.question.get_admin_display()}'
		return f'Assessment Question {self.order} (No Question)'

	question = models.ForeignKey('Questions', on_delete=models.CASCADE, related_name='assessment_questions', verbose_name='Question')
	order = models.IntegerField(verbose_name='Order')
	conditions = models.JSONField(blank=True, null=True, verbose_name='Conditions')

class Questions(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Question"
		verbose_name_plural = "Questions"

	def __str__(self):
		return self.title

	def get_admin_display(self):
		"""Returns truncated title for admin interface display"""
		return self.title[:50] + "..." if len(self.title) > 50 else self.title

	class Question_categoryChoices(models.TextChoices):
		performance_mindset = ("performance_mindset", "Performance Mindset")
		emotional_regulation = ("emotional_regulation", " Emotional Regulation")
		confidence = ("confidence", " Confidence")
		resilience__motivation = ("resilience__motivation", "Resilience & Motivation")
		concentration = ("concentration", " Concentration")
		leadership = ("leadership", " Leadership")
		mental_wellbeing = ("mental_wellbeing", " Mental Well-being")

	class ScaleChoices(models.TextChoices):
		percentage = ("percentage", "Percentage")
		onetofive = ("onetofive", "One-to-five")
		onetoten = ("onetoten", "One-to-ten")
	title = models.CharField(max_length=255, verbose_name='Title')
	help_text = models.CharField(max_length=255, blank=True, null=True, verbose_name='Help Text')
	question_category = models.CharField(max_length=22, choices=Question_categoryChoices.choices, verbose_name='Question Category', blank=True, null=True)
	scale = models.CharField(max_length=10, choices=ScaleChoices.choices, verbose_name='Scale', blank=True, null=True)
	scale_choice_labels = models.JSONField(blank=True, null=True, verbose_name='Scale Choice Labels')

	@classmethod
	def get_default_confidence_scale_labels(cls):
		"""Returns the default confidence scale labels with emoji for onetofive scale"""
		return {
			'1': 'Most Confident',
			'2': '2',
			'3': '3',
			'4': '4',
			'5': 'Least Confident'
		}

class QuestionResponses(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Question Response"
		verbose_name_plural = "Question Responses"

	author = models.ForeignKey(get_user_model(), on_delete=models.PROTECT, related_name='+', null=False, verbose_name='Athlete')
	question = models.ForeignKey('Questions', on_delete=models.PROTECT, related_name='+', null=False, verbose_name='Question')
	assessment = models.ForeignKey('Assessments', on_delete=models.PROTECT, related_name='+', null=False, verbose_name='Assessment')
	response = models.IntegerField(verbose_name='Response')

class Payments(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Payment"
		verbose_name_plural = "Payments"

	class StatusChoices(models.TextChoices):
		pending = ("pending", "Pending")
		succeeded = ("succeeded", "Succeeded")
		failed = ("failed", "Failed")
		refunded = ("refunded", "Refunded")
	
	product = models.ForeignKey('Products', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Product')
	paid = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Paid')
	status = models.CharField(max_length=10, choices=StatusChoices.choices, verbose_name='Status')
	subscription_ends = models.DateField(blank=True, null=True, verbose_name='Subscription Ends')
	features_snapshot = models.JSONField(blank=True, null=True, verbose_name='Features Snapshot', help_text='Copy of product features at purchase time')
	stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Stripe Payment Intent ID')
	stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Stripe Customer ID')
	stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Stripe Subscription ID')
	prompt_templates = models.ManyToManyField('PromptTemplates', related_name='payments', blank=True, verbose_name='Prompt Templates')
	
	# Organization and sign-up code fields
	organization = models.ForeignKey('Organizations', on_delete=models.SET_NULL, related_name='payments', 
		null=True, blank=True, verbose_name='Organization')
	signup_code = models.ForeignKey('SignUpCodes', on_delete=models.SET_NULL, related_name='payments',
		null=True, blank=True, verbose_name='Sign-up Code Used')
	discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Discount Applied')

class PaymentAssignments(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Payment Assignment"
		verbose_name_plural = "Payment Assignments"
		constraints = [
			models.UniqueConstraint(
				fields=['athlete', 'organization', 'pre_assessment'],
				condition=models.Q(athlete__isnull=False),
				name='unique_athlete_assessment_org',
				violation_error_message='This athlete already has an assignment for this assessment in this organization.'
			)
		]

	payment = models.ForeignKey('Payments', on_delete=models.CASCADE, related_name='assignments', verbose_name='Payment')
	athlete = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, blank=True, verbose_name='Athlete')
	coaches = models.ManyToManyField(get_user_model(), related_name='+', blank=True, verbose_name='Coaches')
	parents = models.ManyToManyField(get_user_model(), related_name='+', blank=True, verbose_name='Parents')
	
	# Denormalized fields for unique constraint and query performance
	# These are automatically populated from payment.organization and payment.product.pre_assessment
	organization = models.ForeignKey(
		'Organizations',
		on_delete=models.CASCADE,
		related_name='payment_assignments',
		verbose_name='Organization',
		help_text='Denormalized from payment.organization for constraint performance'
	)
	pre_assessment = models.ForeignKey(
		'Assessments',
		on_delete=models.PROTECT,
		related_name='+',
		verbose_name='Pre-Assessment',
		help_text='Denormalized from payment.product.pre_assessment for constraint performance'
	)
	
	# Assessment submission tracking
	pre_assessment_submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Pre-Assessment Submitted At')
	post_assessment_submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Post-Assessment Submitted At')

	def save(self, *args, **kwargs):
		"""Auto-populate denormalized fields from payment before saving"""
		# Auto-populate denormalized fields from payment (payment is required, so no null check)
		self.organization = self.payment.organization
		self.pre_assessment = self.payment.product.pre_assessment
		
		super().save(*args, **kwargs)

	def clean(self):
		"""Validate uniqueness when athlete is assigned"""
		super().clean()
		
		# Only validate uniqueness if athlete is assigned
		if self.athlete:
			existing = PaymentAssignments.objects.filter(
				athlete=self.athlete,
				organization=self.payment.organization,
				pre_assessment=self.payment.product.pre_assessment
			).exclude(pk=self.pk)
			
			if existing.exists():
				from django.core.exceptions import ValidationError
				raise ValidationError(
					f"Athlete {self.athlete} already has an assignment for "
					f"{self.payment.product.pre_assessment} in organization {self.payment.organization}"
				)

	def __str__(self):
		athlete_name = self.athlete.get_full_name() if self.athlete and self.athlete.get_full_name() else (self.athlete.username if self.athlete else 'No Athlete')
		product_title = self.payment.product.title if self.payment and self.payment.product else 'No Product'
		return f"Assignment #{self.id} for {athlete_name} on {product_title}"

	@property
	def pre_assessment_submitted(self):
		"""Boolean property to check if pre-assessment is submitted"""
		return self.pre_assessment_submitted_at is not None

	@property
	def post_assessment_submitted(self):
		"""Boolean property to check if post-assessment is submitted"""
		return self.post_assessment_submitted_at is not None

class PromptTemplates(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Prompt Template"
		verbose_name_plural = "Prompt Templates"

	def __str__(self):
		if self.author:
			full_name = self.author.get_full_name()
			return full_name if full_name and full_name.strip() else self.author.username
		return f"Prompt Template #{self.id or 'New'}"

	def save(self, *args, **kwargs):
		if not self.purpose:
			self.purpose = self.PurposeChoices.feedback_report
		super().save(*args, **kwargs)

	class StatusChoices(models.TextChoices):
		active = ("active", "Active")
		archived = ("archived", " archived")

	class PurposeChoices(models.TextChoices):
		lesson_plan = ("lesson_plan", "Lesson Plan")
		curriculum = ("curriculum", "Curriculum")
		talking_points = ("talking_points", "Talking Points")
		feedback_report = ("feedback_report", "Feedback Report")
		scheduling_email = ("scheduling_email", "Scheduling Email")

	class Response_formatChoices(models.TextChoices):
		text = ("text", "Text")
		json = ("json", "Json")
	prompt = models.TextField(verbose_name='Prompt')
	instructions = models.TextField(blank=True, null=True, verbose_name='Instructions')
	model = models.CharField(max_length=255, blank=True, null=True, verbose_name='Model')
	status = models.CharField(max_length=8, choices=StatusChoices.choices, verbose_name='Status', default="active")
	purpose = models.CharField(max_length=50, choices=PurposeChoices.choices, verbose_name='Purpose')
	response_format = models.CharField(max_length=4, choices=Response_formatChoices.choices, verbose_name='Response Format', default="text", blank=True, null=True)

class AgentResponses(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Agent Response"
		verbose_name_plural = "Agent Responses"

	class PurposeChoices(models.TextChoices):
		lesson_plan = ("lesson_plan", "Lesson Plan")
		curriculum = ("curriculum", "Curriculum")
		talking_points = ("talking_points", "Talking Points")
		feedback_report = ("feedback_report", "Feedback Report")
		scheduling_email = ("scheduling_email", "Scheduling Email")
	athlete = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='+', null=False, verbose_name='Athlete')
	assessment = models.ForeignKey('Assessments', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Assessment')
	assignment = models.ForeignKey('PaymentAssignments', on_delete=models.CASCADE, related_name='+', null=False, verbose_name='Payment Assignment')
	prompt_template = models.ForeignKey('PromptTemplates', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Prompt Template')
	purpose = models.CharField(max_length=50, choices=PurposeChoices.choices, verbose_name='Purpose')
	message_body = models.TextField(verbose_name='Message Body')
	ai_response = models.TextField(verbose_name='AI Response')
	ai_reasoning = models.TextField(blank=True, null=True, verbose_name='AI Reasoning')

	def __str__(self):
		athlete_name = self.athlete.get_full_name() if self.athlete and self.athlete.get_full_name() else (self.athlete.username if self.athlete else 'Unknown Athlete')
		return f"{self.purpose} for {athlete_name}"

class CoachContent(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Coach Content"
		verbose_name_plural = "Coach Contents"

	class PrivacyChoices(models.TextChoices):
		public = ("public", "Public")
		authenticated = ("authenticated", " authenticated")
		mentioned = ("mentioned", " mentioned")

	class PurposeChoices(models.TextChoices):
		lesson_plan = ("lesson_plan", "Lesson Plan")
		curriculum = ("curriculum", "Curriculum")
		talking_points = ("talking_points", "Talking Points")
		feedback_report = ("feedback_report", "Feedback Report")
		scheduling_email = ("scheduling_email", "Scheduling Email")

	author = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, blank=True, verbose_name='Coach')
	assignment = models.ForeignKey('PaymentAssignments', on_delete=models.SET_NULL, related_name='+', null=True, blank=True, verbose_name='Payment Assignment')
	source_draft = models.ForeignKey('AgentResponses', on_delete=models.SET_NULL, related_name='published_content', null=True, blank=True, verbose_name='Source Draft')
	athlete = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='+', null=True, verbose_name='Athlete')
	title = models.TextField(verbose_name='Title')
	body = models.TextField(verbose_name='Body')
	screenshot_light = models.ImageField(upload_to=screenshot_upload_path, blank=True, null=True, verbose_name='Screenshot Light')
	screenshot_dark = models.ImageField(upload_to=screenshot_upload_path, blank=True, null=True, verbose_name='Screenshot Dark')
	privacy = models.CharField(max_length=13, choices=PrivacyChoices.choices, verbose_name='Privacy', default="mentioned")
	purpose = models.CharField(max_length=50, choices=PurposeChoices.choices, verbose_name='Purpose', blank=True, null=True)
	coach_delivered = models.DateTimeField(blank=True, null=True, verbose_name='Coach Delivered At') # only coach can check
	athlete_received = models.DateTimeField(blank=True, null=True, verbose_name='Athlete Received At') # any can check
	parent_received = models.DateTimeField(blank=True, null=True, verbose_name='Parent Received At') # only parent can check

	def __str__(self):
		athlete_name = self.athlete.get_full_name() if self.athlete and self.athlete.get_full_name() else (self.athlete.username if self.athlete else 'Unknown Athlete')
		return f"{self.purpose} for {athlete_name}"

class Shares(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Share"
		verbose_name_plural = "Shares"

	recipient = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Recipient')
	content = models.ForeignKey('CoachContent', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Content')
	expires = models.DateField(blank=True, null=True, verbose_name='Expires')

class Notifications(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Notification"
		verbose_name_plural = "Notifications"
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['channel', 'delivery_status']),
			models.Index(fields=['notification_group']),
			models.Index(fields=['recipient', 'seen']),
		]

	recipient = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='notifications', verbose_name='Recipient')
	message = models.TextField(verbose_name='Message')
	message_text = models.TextField(blank=True, null=True, verbose_name='Text Message', help_text='Plain text version for SMS and plain email')
	message_html = models.TextField(blank=True, null=True, verbose_name='HTML Message', help_text='HTML version for email')
	
	channel = models.CharField(max_length=20, choices=[
		('dashboard', 'Dashboard'), ('email', 'Email'), ('sms', 'SMS')
	], default='dashboard', verbose_name='Channel')
	
	delivery_status = models.CharField(max_length=20, choices=[
		('pending', 'Pending'), ('sent', 'Sent'), ('delivered', 'Delivered'),
		('failed', 'Failed'), ('bounced', 'Bounced')
	], default='pending', verbose_name='Delivery Status')
	
	sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Sent At')
	delivery_error = models.TextField(blank=True, null=True, verbose_name='Delivery Error')
	seen = models.BooleanField(default=False, verbose_name='Seen')
	
	notification_type = models.CharField(max_length=30, choices=[
		('agent-response', 'Agent Response'),
		('coach-content', 'Coach Content'),
		('payment', 'Payment'),
		('invoice', 'Invoice'),
		('assessment-submitted', 'Assessment Submitted'),
	], null=True, blank=True, verbose_name='Notification Type')
	
	notification_group = models.UUIDField(null=True, blank=True, verbose_name='Notification Group', help_text='Groups related notifications across channels')
	priority = models.CharField(max_length=10, choices=[
		('low', 'Low'), ('normal', 'Normal'), ('high', 'High'), ('urgent', 'Urgent')
	], default='normal', verbose_name='Priority')
	
	remind_time = models.DateTimeField(blank=True, null=True, verbose_name='Remind Time')
	link = models.URLField(max_length=500, blank=True, null=True, verbose_name='Link')
	expires = models.DateTimeField(blank=True, null=True, verbose_name='Expires')
	auto_send = models.BooleanField(default=False, verbose_name='Auto Send', help_text='Automatically send via this channel')

class Organizations(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Organization"
		verbose_name_plural = "Organizations"

	name = models.CharField(max_length=255, verbose_name='Organization Name')
	short_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='Short Name', 
		help_text='Short name displayed in header (e.g., "SMSP")')
	slug = models.SlugField(unique=True, verbose_name='Subdomain Slug')
	
	# Branding Settings (JSON matching BrandingSettings.tsx structure)
	logo = models.ImageField(upload_to='organization_logos/', blank=True, null=True, verbose_name='Organization Logo')
	custom_logo_base64 = models.TextField(blank=True, null=True, verbose_name='Custom Logo (Base64)', 
		help_text='Legacy field - use logo field instead')
	branding_palette = models.JSONField(blank=True, null=True, verbose_name='Color Palette', 
		help_text='{"light": {"primary": {"main": "#877010"}, "secondary": {"main": "#2a74b7"}}, "dark": {...}}')
	branding_typography = models.JSONField(blank=True, null=True, verbose_name='Typography Settings',
		help_text='{"fontFamily": "Montserrat"}')
	
	# Organization metadata
	is_active = models.BooleanField(default=True, verbose_name='Is Active')
	contact_email = models.EmailField(blank=True, null=True, verbose_name='Contact Email')
	contact_phone = models.CharField(max_length=50, blank=True, null=True, verbose_name='Contact Phone')

class OrganizationProducts(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Organization Product"
		verbose_name_plural = "Organization Products"

	organization = models.ForeignKey('Organizations', on_delete=models.CASCADE, related_name='organization_products')
	product = models.ForeignKey('Products', on_delete=models.CASCADE, related_name='product_organizations')
	is_featured = models.BooleanField(default=False, verbose_name='Is Featured')
	display_order = models.IntegerField(default=0, verbose_name='Display Order')

class SignUpCodes(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Sign-up Code"
		verbose_name_plural = "Sign-up Codes"

	organization = models.ForeignKey('Organizations', on_delete=models.CASCADE, related_name='signup_codes')
	code = models.CharField(max_length=50, unique=True, verbose_name='Sign-up Code')
	
	# Discount configuration
	class DiscountTypeChoices(models.TextChoices):
		percentage = ("percentage", "Percentage")
		fixed = ("fixed", "Fixed Amount")
		free = ("free", "Free Access")
	
	discount_type = models.CharField(max_length=10, choices=DiscountTypeChoices.choices, default='percentage', verbose_name='Discount Type')
	discount_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Discount Value')
	
	# Usage limits
	max_uses = models.IntegerField(blank=True, null=True, verbose_name='Max Uses', 
		help_text='Leave blank for unlimited')
	current_uses = models.IntegerField(default=0, verbose_name='Current Uses')
	
	# Validity
	valid_from = models.DateTimeField(blank=True, null=True, verbose_name='Valid From')
	valid_until = models.DateTimeField(blank=True, null=True, verbose_name='Valid Until')
	is_active = models.BooleanField(default=True, verbose_name='Is Active')
	
	# Product restrictions (optional - applies to specific products only)
	applicable_products = models.ManyToManyField('Products', blank=True, related_name='signup_codes')

class UserOrganizations(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "User Organization"
		verbose_name_plural = "User Organizations"
		unique_together = [['user', 'organization']]

	user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='user_organizations')
	organization = models.ForeignKey('Organizations', on_delete=models.CASCADE, related_name='organization_users')
	
	joined_at = models.DateTimeField(auto_now_add=True, verbose_name='Joined At')
	is_active = models.BooleanField(default=True, verbose_name='Is Active')
