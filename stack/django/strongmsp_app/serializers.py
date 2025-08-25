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
from .models import AssessmentQuestions
from .models import Questions
from .models import QuestionResponses
from .models import Payments
from .models import PromptTemplates
from .models import AgentResponses
from .models import CoachContent
from .models import Shares
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
class AssessmentsSerializer(CustomSerializer):
    class Meta:
        model = Assessments
        fields = '__all__'
class AssessmentQuestionsSerializer(CustomSerializer):
    class Meta:
        model = AssessmentQuestions
        fields = '__all__'
class QuestionsSerializer(CustomSerializer):
    class Meta:
        model = Questions
        fields = '__all__'
class QuestionResponsesSerializer(CustomSerializer):
    class Meta:
        model = QuestionResponses
        fields = '__all__'
class PaymentsSerializer(CustomSerializer):
    class Meta:
        model = Payments
        fields = '__all__'
class PromptTemplatesSerializer(CustomSerializer):
    class Meta:
        model = PromptTemplates
        fields = '__all__'
class AgentResponsesSerializer(CustomSerializer):
    class Meta:
        model = AgentResponses
        fields = '__all__'
class CoachContentSerializer(CustomSerializer):
    class Meta:
        model = CoachContent
        fields = '__all__'
class SharesSerializer(CustomSerializer):
    class Meta:
        model = Shares
        fields = '__all__'
####OBJECT-ACTIONS-SERIALIZERS-ENDS####


# serializers.py

class PhoneNumberSerializer(serializers.Serializer):
    phone = serializers.CharField()


class VerifyPhoneSerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField()
