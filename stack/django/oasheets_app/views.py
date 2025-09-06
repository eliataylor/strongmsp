import csv

from django.db import models
from django.db.models import Q
from django.http import HttpResponse
from django.http import JsonResponse
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import viewsets

from .models import SchemaVersions
from .serializers import (
    SchemaVersionSerializer, 
    PostedPromptSerializer, 
    PromptTestSerializer
)
from strongmsp_app.serializers import PromptTemplatesSerializer
from .services.generator_service import SchemaGenerator
from .services.prompt_tester import PromptTester

# Import the custom pagination class
from strongmsp_app.pagination import CustomLimitOffsetPagination

class SchemaVersionsViewSet(viewsets.ModelViewSet):
    queryset = SchemaVersions.objects.all()
    serializer_class = SchemaVersionSerializer
    permission_classes = [AllowAny]
    pagination_class = CustomLimitOffsetPagination

    def get_queryset(self):
        """
        Filters out archived schemas and applies privacy-based access control.
        """
        user = self.request.user

        if not user.is_authenticated:
            queryset = SchemaVersions.objects.filter(
                privacy__in=[SchemaVersions.PrivacyChoices.public, SchemaVersions.PrivacyChoices.unlisted])
        else:
            queryset = SchemaVersions.objects.filter(
                models.Q(privacy__in=[SchemaVersions.PrivacyChoices.public, SchemaVersions.PrivacyChoices.unlisted,
                                      SchemaVersions.PrivacyChoices.authusers]) |
#                models.Q(privacy=SchemaVersions.PrivacyChoices.inviteonly,
#                         project__collaborators=user) |  # TODO: CRUD operations for collaborators
                models.Q(privacy=SchemaVersions.PrivacyChoices.onlyme, author=user)
            )

        return queryset.order_by('created_at')

    def list(self, request, *args, **kwargs):
        # Get the base queryset with privacy filtering
        queryset = self.get_queryset().filter(parent_id=None).exclude(
            privacy=SchemaVersions.PrivacyChoices.unlisted).order_by('-created_at')
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        # If no pagination, return all results
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        schema = self.get_object()

        if request.user is None and schema.privacy not in [SchemaVersions.PrivacyChoices.public,
                                                           SchemaVersions.PrivacyChoices.unlisted]:
            return Response({"error": "Login to view this schema."},
                            status=status.HTTP_403_FORBIDDEN)

        if schema.privacy == SchemaVersions.PrivacyChoices.onlyme and schema.author != request.user:
            return Response({"error": "You are not authorized to access this schema."},
                            status=status.HTTP_403_FORBIDDEN)

        if schema.privacy == SchemaVersions.PrivacyChoices.inviteonly and request.user not in schema.collaborators.all():
            return Response({"error": "You need an invitation to view this schema."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(schema, many=False)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Toggle between streaming and non-streaming responses based on query param `stream=true`.
        """
        serializer = PostedPromptSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        prompt_data = serializer.validated_data
        if "version_id" in prompt_data:
            version = SchemaVersions.objects.filter(
                pk=prompt_data["version_id"]).first()  # it's ok if it's been deleted or inactivated
        else:
            version = None

        generator = SchemaGenerator(prompt_data, request.user, version)
        response_generator = generator.start_stream(prompt_data['prompt'])
        response = StreamingHttpResponse(response_generator, content_type="application/json")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # Important for Nginx (disable buffering)
        return response

    @action(detail=True, methods=['post'])
    def enhance(self, request, pk=None):
        version = self.get_object()

        if request.user is None and version.privacy not in [SchemaVersions.PrivacyChoices.public,
                                                            SchemaVersions.PrivacyChoices.unlisted]:
            return Response({"error": "Login to view this schema."},
                            status=status.HTTP_403_FORBIDDEN)

        if version.privacy == SchemaVersions.PrivacyChoices.onlyme and version.author != request.user:
            return Response({"error": "You are not authorized to enhance this schema."},
                            status=status.HTTP_403_FORBIDDEN)

        if version.privacy == SchemaVersions.PrivacyChoices.inviteonly and request.user not in version.collaborators.all():
            return Response({"error": "You need an invitation to enhance this schema."},
                            status=status.HTTP_403_FORBIDDEN)

        serializer = PostedPromptSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        prompt_data = serializer.validated_data
        generator = SchemaGenerator(prompt_data, request.user, version)

        response_generator = generator.start_stream(prompt_data['prompt'])
        response = StreamingHttpResponse(response_generator, content_type="application/json")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # Important for Nginx (disable buffering)
        return response

    @action(detail=True, methods=['get'], url_path='download')
    def download_csv(self, request, pk=None):
        version = self.get_object()

        # Validate user permissions
        if not request.user.is_authenticated and version.privacy not in [
            SchemaVersions.PrivacyChoices.public, SchemaVersions.PrivacyChoices.unlisted
        ]:
            return Response({"error": "You are not authorized to download this schema."}, status=403)

        # CSV headers
        headers = [
            "Types", "Field Label", "Field Name", "Field Type",
            "HowMany", "Required", "Relationship", "Default", "Example"
        ]

        # Extract schema fields
        schema_data = version.schema
        if schema_data is None:
            return Response({"error": "This version has no schema"}, status=204)
        rows = []

        for content_type in schema_data.get('content_types', []):
            # Add the model name as a row with empty field columns
            rows.append([content_type['name'], '', '', '', '', '', '', '', ''])

            for field in content_type.get('fields', []):
                rows.append([
                    '',  # Keep Types column empty for fields
                    field.get('label', '') or '',
                    field.get('name', '') or '',  # Assuming 'name' maps to Field Name
                    field.get('field_type', '') or '',
                    field.get('cardinality', '') or '',
                    '1' if field.get('required', False) else '0',
                    field.get('relationship', '') or '',
                    field.get('default', '') or '',
                    field.get('example', '') or '',
                ])

        # Generate CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="object-fields-version-{version.id}_schema.csv"'

        writer = csv.writer(response)
        writer.writerow(headers)
        writer.writerows(rows)

        return response

    @action(detail=True, methods=['delete'], url_path='delete-version')
    def delete_version(self, request, pk=None):
        """
        Delete a specific version of a schema.
        Only the author can delete their versions.
        """
        schema = self.get_object()

        if schema.author != request.user:
            return Response({"error": "You are not authorized to delete this version."},
                            status=status.HTTP_403_FORBIDDEN)

        if schema.parent is None:
            return Response({"error": "Root schemas cannot be deleted."},
                            status=status.HTTP_400_BAD_REQUEST)

        schema.delete()
        return Response({"message": "Version deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.author != request.user:
            return Response({"error": "You are not authorized to delete this schema."},
                            status=status.HTTP_403_FORBIDDEN)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PromptTemplatesViewSet(viewsets.ModelViewSet):
    """ViewSet for testing PromptTemplates with streaming"""
    from strongmsp_app.models import PromptTemplates
    
    queryset = PromptTemplates.objects.filter(status='active').order_by('-created_at')
    serializer_class = PromptTemplatesSerializer
    permission_classes = [AllowAny]
    pagination_class = CustomLimitOffsetPagination

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a prompt template with streaming response"""
        prompt_template = self.get_object()
        
        serializer = PromptTestSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        test_data = serializer.validated_data
        
        # Get athlete if provided
        athlete = None
        if test_data.get('athlete_id'):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                athlete = User.objects.get(id=test_data['athlete_id'])
            except User.DoesNotExist:
                return Response({"error": "Athlete not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create prompt tester
        tester = PromptTester(
            prompt_template=prompt_template,
            user=request.user,
            athlete=athlete,
            message_body=test_data['message_body']
        )
        
        # Build the prompt
        prompt = tester.build_prompt()
        
        # Stream the response
        response_generator = tester.stream(prompt)
        response = StreamingHttpResponse(response_generator, content_type="application/json")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # Important for Nginx (disable buffering)
        return response

    @action(detail=False, methods=['post'], url_path='test-by-purpose')
    def test_by_purpose(self, request):
        """Test a prompt template by purpose with streaming response"""
        purpose = request.data.get('purpose')
        if not purpose:
            return Response({"error": "Purpose is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get athlete if provided
        athlete = None
        athlete_id = request.data.get('athlete_id')
        if athlete_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                athlete = User.objects.get(id=athlete_id)
            except User.DoesNotExist:
                return Response({"error": "Athlete not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create prompt tester by purpose
        tester = PromptTester.create_by_purpose(
            purpose=purpose,
            user=request.user,
            athlete=athlete,
            message_body=request.data.get('message_body', '')
        )
        
        if not tester:
            return Response({"error": f"No active template found for purpose: {purpose}"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Build the prompt
        prompt = tester.build_prompt()
        
        # Stream the response
        response_generator = tester.stream(prompt)
        response = StreamingHttpResponse(response_generator, content_type="application/json")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # Important for Nginx (disable buffering)
        return response
