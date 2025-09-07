####OBJECT-ACTIONS-MODELS_IMPORTS-STARTS####
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
####OBJECT-ACTIONS-MODELS_IMPORTS-ENDS####

####OBJECT-ACTIONS-MODELS-STARTS####
def upload_file_path(instance, filename):
	ext = filename.split('.')[-1]  # e.g. "jpg"
	# add datetime suffix to avoid collisions
	new_filename = f"{os.path.basename(filename)}_{timezone.now().strftime('%Y%m%d%H%M%S')}.{ext}"
	# WARN: watch for overwrites when using DataBuilder or any batch upload

	# Use strftime to create a "year-month" folder dynamically
	date_folder = timezone.now().strftime('%Y-%m')

	# Construct the final upload path: "uploads/<yyyy-mm>/<filename>"
	return os.path.join('uploads', date_folder, new_filename)

class Users(AbstractUser, BumpParentsModelMixin):
	class Meta:
		verbose_name = "User"
		verbose_name_plural = "Users"
		ordering = ['last_login']


	class User_typesChoices(models.TextChoices):
		athlete = ("athlete", "Athlete")
		parent = ("parent", " parent")
		coach = ("coach", " coach")

	real_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Real Name')
	bio = models.TextField(blank=True, null=True, verbose_name='Bio')
	user_types = models.CharField(max_length=7, choices=User_typesChoices.choices, verbose_name='User Types', blank=True, null=True)
	confidence_score = models.IntegerField(blank=True, null=True, verbose_name='Confidence Score')

	def __str__(self):
		if self.get_full_name().strip():
			return self.get_full_name()
		elif self.get_short_name().strip():
			return self.get_short_name()
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

	def save(self, *args, **kwargs):
		self.modified_at = now()
		super().save(*args, **kwargs)

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


class Courses(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Course"
		verbose_name_plural = "Courses"

	title = models.CharField(max_length=255, verbose_name='Title')
	description = models.TextField(blank=True, null=True, verbose_name='Description')
	preassessment = models.ForeignKey('Assessments', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Pre-Assessment')
	postassessment = models.ForeignKey('Assessments', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Post-Assessment')
	price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Price')
	icon = models.ImageField(upload_to=upload_file_path, blank=True, null=True, verbose_name='Icon')
	cover_photo = models.ImageField(upload_to=upload_file_path, blank=True, null=True, verbose_name='Cover Photo')

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
		return self.title[:15] + "..." if len(self.title) > 15 else self.title

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

class QuestionResponses(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Question Response"
		verbose_name_plural = "Question Responses"

	author = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Athlete')
	question = models.ForeignKey('Questions', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Question')
	response = models.IntegerField(verbose_name='Response')

class Payments(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Payment"
		verbose_name_plural = "Payments"

	class StatusChoices(models.TextChoices):
		paid = ("paid", "Paid")
		order = ("order", " order")
		request = ("request", " request")
		declined = ("declined", " declined")
	athlete = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, blank=True, verbose_name='Athlete')
	preferred_coach = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, blank=True, verbose_name='Preferred Coach')
	course = models.ForeignKey('Courses', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Course')
	paid = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Paid')
	status = models.CharField(max_length=8, choices=StatusChoices.choices, verbose_name='Status')
	subscription_ends = models.DateField(blank=True, null=True, verbose_name='Subscription Ends')

class PromptTemplates(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Prompt Template"
		verbose_name_plural = "Prompt Templates"

	def __str__(self):
		return self.author.get_full_name()

	def save(self, *args, **kwargs):
		if not self.purpose:
			self.purpose = self.PurposeChoices.lessonpackage
		super().save(*args, **kwargs)

	class StatusChoices(models.TextChoices):
		active = ("active", "Active")
		archived = ("archived", " archived")

	class PurposeChoices(models.TextChoices):
		lessonpackage = ("lessonpackage", "Lesson-package")
		TwelveSessions = ("12sessions", " 12-sessions")
		talkingpoints = ("talkingpoints", " talking-points")
		feedbackreport = ("feedbackreport", " feedback-report")
		parentemail = ("parentemail", " parent-email")

	class Response_formatChoices(models.TextChoices):
		text = ("text", "Text")
		json = ("json", "Json")
	prompt = models.TextField(verbose_name='Prompt')
	instructions = models.TextField(blank=True, null=True, verbose_name='Instructions')
	model = models.CharField(max_length=255, blank=True, null=True, verbose_name='Model')
	status = models.CharField(max_length=8, choices=StatusChoices.choices, verbose_name='Status', default="active")
	purpose = models.CharField(max_length=14, choices=PurposeChoices.choices, verbose_name='Purpose')
	response_format = models.CharField(max_length=4, choices=Response_formatChoices.choices, verbose_name='Response Format', default="text", blank=True, null=True)

class AgentResponses(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Agent Response"
		verbose_name_plural = "Agent Responses"

	class PurposeChoices(models.TextChoices):
		lessonpackage = ("lessonpackage", "Lesson-package")
		TwelveSessions = ("12sessions", " 12-sessions")
		talkingpoints = ("talkingpoints", " talking-points")
		feedbackreport = ("feedbackreport", " feedback-report")
		parentemail = ("parentemail", " parent-email")
	athlete = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Athlete')
	prompt_template = models.ForeignKey('PromptTemplates', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Prompt Template')
	purpose = models.CharField(max_length=14, choices=PurposeChoices.choices, verbose_name='Purpose')
	message_body = models.TextField(verbose_name='Message Body')
	ai_response = models.TextField(verbose_name='AI Response')
	ai_reasoning = models.TextField(blank=True, null=True, verbose_name='AI Reasoning')

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
		lessonpackage = ("lessonpackage", "Lesson-package")
		TwelveSessions = ("12sessions", " 12-sessions")
		talkingpoints = ("talkingpoints", " talking-points")
		feedbackreport = ("feedbackreport", " feedback-report")
		parentemail = ("parentemail", " parent-email")

	author = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, blank=True, verbose_name='Coach')
	title = models.TextField(verbose_name='Title')
	body = models.TextField(verbose_name='Body')
	icon = models.ImageField(upload_to=upload_file_path, blank=True, null=True, verbose_name='Icon')
	cover_photo = models.ImageField(upload_to=upload_file_path, blank=True, null=True, verbose_name='Cover Photo')
	privacy = models.CharField(max_length=13, choices=PrivacyChoices.choices, verbose_name='Privacy', default="mentioned")
	purpose = models.CharField(max_length=14, choices=PurposeChoices.choices, verbose_name='Purpose', blank=True, null=True)

class Shares(SuperModel):
	class Meta:
		abstract = False
		verbose_name = "Share"
		verbose_name_plural = "Shares"

	recipient = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Recipient')
	content = models.ForeignKey('CoachContent', on_delete=models.SET_NULL, related_name='+', null=True, verbose_name='Content')
	expires = models.DateField(blank=True, null=True, verbose_name='Expires')
####OBJECT-ACTIONS-MODELS-ENDS####
