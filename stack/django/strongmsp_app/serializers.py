import logging

from django.db.models import ImageField, FileField
from rest_framework import serializers
# from .schema_annotations import ExpandedRelationsMixin  # not needed for schema; using extension

####OBJECT-ACTIONS-SERIALIZER-IMPORTS-STARTS####
from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import ManyToManyField
from .models import Users
from .models import Courses
from .models import Assessments
from .models import Products
from .models import Payments
from .models import PaymentAssignments
from .models import QuestionResponses
from .models import PromptTemplates
from .models import AgentResponses
from .models import CoachContent
from .models import Shares
from .models import Notifications
from .models import Organizations
from .models import OrganizationProducts
from .models import SignUpCodes
from .models import UserOrganizations
####OBJECT-ACTIONS-SERIALIZER-IMPORTS-ENDS####

logger = logging.getLogger(__name__)
from django.core.exceptions import FieldDoesNotExist
from google.auth.exceptions import DefaultCredentialsError

####OBJECT-ACTIONS-SERIALIZERS-STARTS####
class CustomUsersSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        # Get the original representation
        representation = super().to_representation(instance)
        # Add the model type
        representation['_type'] = instance.__class__.__name__

        for field in self.Meta.model._meta.get_fields():
            if field.is_relation and hasattr(instance, field.name):
                field_name = field.name
                related_instance = getattr(instance, field_name)

                if field.many_to_one:
                    if related_instance is not None:
                        representation[field_name] = {
                            "id": related_instance.pk,
                            "str": str(related_instance),
                            "_type": related_instance.__class__.__name__,
                        }

                elif field.many_to_many:
                    related_instances = related_instance.all()
                    representation[field_name] = [
                        {
                            "id": related.pk,
                            "str": str(related),
                            "_type": related.__class__.__name__,
                        } for related in related_instances
                    ]
        return representation

class CustomSerializer(serializers.ModelSerializer):
    # serializer_related_field = SubFieldRelatedField
    def create(self, validated_data):
        request = self.context.get('request', None)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            field_names = [field.name for field in self.Meta.model._meta.get_fields()]
            if 'author' in field_names:
                validated_data['author'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request', None)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            field_names = [field.name for field in self.Meta.model._meta.get_fields()]
            if 'author' in field_names:
                validated_data['author'] = request.user
        return super().update(instance, validated_data)

    def has_field(self, field_name):
        model = self.Meta.model
        try:
            model._meta.get_field(field_name)
            return True
        except FieldDoesNotExist:
            return False

    def get_serializer_class_for_instance(self, instance):
        # Construct the serializer class name
        serializer_class_name = f"{instance.__class__.__name__}Serializer"
        # Fetch the serializer class from globals
        serializer_class = globals().get(serializer_class_name)
        if not serializer_class:
            raise ValueError(f"Serializer class {serializer_class_name} not found")
        return serializer_class

    def normalize_instance(self, related_instance, base_field):
        relEntity = {
            "id": related_instance.pk,
            "str": str(related_instance),
            "_type": related_instance.__class__.__name__,
            "entity": {}
        }

        request = self.context.get('request')
        if request:
            subentities = request.query_params.getlist('getrelated', [])
            subfields = request.query_params.getlist('subfields', [])
        else:
            subentities = []
            subfields = []

        if base_field.lower() in subentities:
            serializer_class = self.get_serializer_class_for_instance(related_instance)
            serializer = serializer_class(related_instance, context=self.context)
            relEntity['entity'] = serializer.data
        else:
            for sub_field in related_instance._meta.get_fields():
                if sub_field.name in subfields:
                    rel_field = getattr(related_instance, sub_field.name)
                    relEntity['entity'][sub_field.name] = str(rel_field)
                elif isinstance(sub_field, ImageField) or isinstance(sub_field, FileField):
                    image_field = getattr(related_instance, sub_field.name)
                    if image_field:
                        try:
                            relEntity['img'] = image_field.url
                            break
                        except DefaultCredentialsError:
                            relEntity['img'] = None
                            logger.error(f" Google Cloud credentials not found. Trying to access {sub_field.name}")
                elif sub_field.name == 'remote_image':
                    relEntity['img'] = getattr(related_instance, sub_field.name)

        if len(relEntity['entity']) == 0:
            del relEntity['entity']

        return relEntity

    def to_representation(self, instance):
        # Get the original representation
        representation = super().to_representation(instance)
        # Add the model type
        representation['_type'] = instance.__class__.__name__

        for field in self.Meta.model._meta.get_fields():
            if field.is_relation and not field.auto_created and hasattr(instance, field.name):
                field_name = field.name

                if field.many_to_one:
                    related_instance = getattr(instance, field_name)
                    if related_instance is not None:
                        representation[field_name] = self.normalize_instance(related_instance, field_name)

                elif field.many_to_many:
                    related_instance = getattr(instance, field_name)
                    related_instances = related_instance.all()
                    representation[field_name] = []
                    for related in related_instances:
                        representation[field_name].append(self.normalize_instance(related, field_name))

        return representation

class UsersSerializer(CustomUsersSerializer):
    class Meta:
        model = Users
        exclude = ('password', 'email', 'is_active', 'is_staff', 'is_superuser')
        
class CoursesSerializer(CustomSerializer):
    class Meta:
        model = Courses
        fields = '__all__'
        read_only_fields = ['author']
        
class AssessmentsSerializer(serializers.ModelSerializer):
    """
    Serializer for Assessments that includes nested questions data.

    This serializer flattens the AssessmentQuestions and Questions models to provide
    a clean interface that matches the frontend QuestionData interface.

    Response format:
    {
        "id": 1,
        "title": "Assessment Title",
        "created_at": "2024-01-01T00:00:00Z",
        "modified_at": "2024-01-01T00:00:00Z",
        "_type": "Assessments",
        "questions": [
            {
                "assessment_question_id": 1,
                "title": "Question Title",
                "help_text": "Question help text",
                "question_category": "confidence",
                "scale": "onetofive",
                "id": 1,
                "_type": "Questions"
            }
        ]
    }
    """
    questions = serializers.SerializerMethodField()
    _type = serializers.SerializerMethodField()

    class Meta:
        model = Assessments
        exclude = ('author',)
    
    def get__type(self, obj):
        return 'Assessments'

    def get_questions(self, obj):
        """Return flattened question data that matches the QuestionData interface"""
        questions_data = []

        try:
            # Get all AssessmentQuestions for this assessment, ordered by order
            assessment_questions = obj.questions.all().order_by('order')

            # Get athlete_id from context to include responses
            athlete_id = self.context.get('athlete_id')
            existing_responses = {}
            
            if athlete_id:
                # Query existing responses for this athlete and assessment
                responses = QuestionResponses.objects.filter(
                    author_id=athlete_id,
                    assessment_id=obj.id
                ).values('question_id', 'response')
                
                # Create a lookup dict for quick response retrieval
                existing_responses = {resp['question_id']: resp['response'] for resp in responses}

            for assessment_question in assessment_questions:
                if assessment_question.question:  # Check if question exists
                    question_data = {
                        'assessment_question_id': assessment_question.id,
                        'title': assessment_question.question.title,
                        'help_text': assessment_question.question.help_text,
                        'question_category': assessment_question.question.question_category,
                        'scale': assessment_question.question.scale,
                        'scale_choice_labels': assessment_question.question.scale_choice_labels,
                        'id': assessment_question.question.id,
                        '_type': 'Questions'
                    }
                    
                    if assessment_question.question.id in existing_responses:
                        question_data['response'] = existing_responses.get(assessment_question.question.id)
                    
                    questions_data.append(question_data)
        except Exception as e:
            # Log error and return empty list
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error fetching questions for assessment {obj.id}: {str(e)}")
            questions_data = []

        return questions_data
        
class QuestionResponsesSerializer(CustomSerializer):
    class Meta:
        model = QuestionResponses
        fields = '__all__'
        read_only_fields = ['author']
class PromptTemplatesSerializer(CustomSerializer):
    class Meta:
        model = PromptTemplates
        fields = '__all__'
        read_only_fields = ['author']
class AgentResponsesSerializer(CustomSerializer):
    class Meta:
        model = AgentResponses
        fields = '__all__'
        read_only_fields = ['author', 'assignment']
class CoachContentSerializer(CustomSerializer):
    class Meta:
        model = CoachContent
        fields = '__all__'
        read_only_fields = ['author', 'assignment', 'source_draft', 'athlete']
class SharesSerializer(CustomSerializer):
    class Meta:
        model = Shares
        fields = '__all__'
        read_only_fields = ['author']
class NotificationsSerializer(CustomSerializer):
    class Meta:
        model = Notifications
        fields = '__all__'
        read_only_fields = ['author']

class ProductsSerializer(CustomSerializer):
    class Meta:
        model = Products
        fields = '__all__'
        read_only_fields = ['author']

class PaymentsSerializer(CustomSerializer):
    class Meta:
        model = Payments
        fields = '__all__'
        read_only_fields = ['author']

class PaymentAssignmentsSerializer(CustomSerializer):
    class Meta:
        model = PaymentAssignments
        fields = '__all__'
        read_only_fields = ['author', 'pre_assessment_submitted', 'post_assessment_submitted', 'pre_assessment_submitted_at', 'post_assessment_submitted_at']
    
    def get_fields(self):
        """
        Dynamically set read-only fields based on user role and submission status.
        """
        fields = super().get_fields()
        request = self.context.get('request')
        
        if not request or not request.user.is_authenticated:
            return fields
            
        # Get the instance to check submission status and user role
        instance = getattr(self, 'instance', None)
        if instance:
            # Check if any assessment is submitted
            if instance.pre_assessment_submitted or instance.post_assessment_submitted:
                # If submitted, make all fields read-only except submission tracking fields
                for field_name in ['athlete', 'coaches', 'parents']:
                    if field_name in fields:
                        fields[field_name].read_only = True
            else:
                # Apply role-based field restrictions
                user_role = self._get_user_role(request.user, instance)
                
                if user_role == 'payer':
                    # Payer can change athlete, coaches, parents
                    pass  # No restrictions
                elif user_role == 'parent':
                    # Parent can change coaches, athlete (not parents)
                    if 'parents' in fields:
                        fields['parents'].read_only = True
                elif user_role == 'athlete':
                    # Athlete can change coaches only
                    if 'athlete' in fields:
                        fields['athlete'].read_only = True
                    if 'parents' in fields:
                        fields['parents'].read_only = True
                elif user_role == 'coach':
                    # Coach can change coaches only
                    if 'athlete' in fields:
                        fields['athlete'].read_only = True
                    if 'parents' in fields:
                        fields['parents'].read_only = True
                else:
                    # Unknown role - make all fields read-only
                    for field_name in ['athlete', 'coaches', 'parents']:
                        if field_name in fields:
                            fields[field_name].read_only = True
        
        return fields
    
    def validate(self, data):
        """
        Add validation to check submission status and role-based permissions.
        """
        request = self.context.get('request')
        instance = getattr(self, 'instance', None)
        
        if request and request.user.is_authenticated and instance:
            # Check if any assessment is submitted
            if instance.pre_assessment_submitted or instance.post_assessment_submitted:
                raise serializers.ValidationError(
                    "Cannot modify assignment after assessment submission"
                )
            
            # Check role-based field permissions
            user_role = self._get_user_role(request.user, instance)
            updated_fields = set(data.keys())
            
            # Remove non-field updates
            field_updates = updated_fields - {'created_at', 'modified_at', 'author', 'pre_assessment_submitted', 'post_assessment_submitted', 'pre_assessment_submitted_at', 'post_assessment_submitted_at'}
            
            if field_updates:
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
                    allowed_fields = set()
                
                # Check if all field updates are allowed
                if not field_updates.issubset(allowed_fields):
                    disallowed_fields = field_updates - allowed_fields
                    raise serializers.ValidationError(
                        f"You don't have permission to modify these fields: {', '.join(disallowed_fields)}"
                    )
        
        return data
    
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

class OrganizationsSerializer(CustomSerializer):
    class Meta:
        model = Organizations
        fields = '__all__'
        read_only_fields = ['author']

class OrganizationProductsSerializer(CustomSerializer):
    class Meta:
        model = OrganizationProducts
        fields = '__all__'
        read_only_fields = ['author']

class SignUpCodesSerializer(CustomSerializer):
    class Meta:
        model = SignUpCodes
        fields = '__all__'
        read_only_fields = ['author']

class UserOrganizationsSerializer(CustomSerializer):
    class Meta:
        model = UserOrganizations
        fields = '__all__'
        read_only_fields = ['author']
####OBJECT-ACTIONS-SERIALIZERS-ENDS####


# serializers.py

class PhoneNumberSerializer(serializers.Serializer):
    phone = serializers.CharField()


class VerifyPhoneSerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField()
