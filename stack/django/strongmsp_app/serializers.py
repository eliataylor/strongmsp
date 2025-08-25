import logging

from django.db.models import ImageField
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