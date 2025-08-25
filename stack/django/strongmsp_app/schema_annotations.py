# schema_annotations.py
# Add this to a separate file and import it in your serializers.py

from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
from rest_framework import serializers
import inspect

# Define the relation object schema
RELATION_OBJECT_SCHEMA = {
    'type': 'object',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Primary key of the related object'
        },
        'str': {
            'type': 'string',
            'description': 'String representation of the related object'
        },
        '_type': {
            'type': 'string',
            'description': 'Type name of the related object'
        },
        'entity': {
            'type': 'object',
            'additionalProperties': True,
            'description': 'Additional fields based on query parameters',
            'nullable': True
        },
        'img': {
            'type': 'string',
            'format': 'uri',
            'description': 'Image URL if available',
            'nullable': True
        }
    },
    'required': ['id', 'str', '_type']
}

# Mixin approach: Add this to any serializer to automatically expand relations in schema
class ExpandedRelationsMixin:
    """
    Mixin that automatically expands relation fields in the OpenAPI schema.
    Add this to any serializer class to get expanded relation objects in the schema.
    """
    
    def get_fields(self):
        """Override to add custom field types for relations"""
        fields = super().get_fields()
        
        # Get the model from Meta
        if hasattr(self, 'Meta') and hasattr(self.Meta, 'model'):
            model = self.Meta.model
            if model:
                # Get all fields from the model
                model_fields = model._meta.get_fields()
                
                # Replace relation fields with expanded versions
                for field in model_fields:
                    if field.is_relation:
                        field_name = field.name
                        if field_name in fields:
                            # Replace the field with an expanded version
                            if field.many_to_one:
                                fields[field_name] = ExpandedRelationField(
                                    related_model=field.related_model,
                                    many=False
                                )
                            elif field.many_to_many:
                                fields[field_name] = ExpandedRelationField(
                                    related_model=field.related_model,
                                    many=True
                                )
        
        return fields

# Simple approach: Create custom fields that represent expanded relations
class ExpandedRelationField(serializers.Field):
    """
    Field that represents an expanded relation object in the schema.
    Use this to explicitly mark fields that should show the full relation object.
    """
    
    def __init__(self, related_model=None, many=False, **kwargs):
        self.related_model = related_model
        self.many = many
        super().__init__(**kwargs)
    
    def to_representation(self, value):
        # This won't be called since it's just for schema
        return value
    
    def get_schema(self):
        """Return the schema for this field"""
        if self.many:
            return {
                'type': 'array',
                'items': RELATION_OBJECT_SCHEMA.copy()
            }
        else:
            return RELATION_OBJECT_SCHEMA.copy()

# Create a serializer extension that defines the schema for your custom serializers
class CustomSerializerExtension:
    @staticmethod
    def get_relation_field_schema(field_name, is_many=False):
        if is_many:
            return {
                'type': 'array',
                'items': RELATION_OBJECT_SCHEMA
            }
        else:
            return RELATION_OBJECT_SCHEMA

# Decorator factory for your serializers (kept for backward compatibility)
def custom_serializer_schema(**relation_fields):
    """
    Decorator to define schema for CustomSerializer classes.
    
    Usage:
    @custom_serializer_schema(
        author=False,  # Single relation
        topics=True,   # Many-to-many relation
        city=False     # Single relation
    )
    class MySerializer(CustomSerializer):
        ...
    """
    def decorator(serializer_class):
        # Build the schema properties
        examples = {}
        
        # Get model fields to understand relationships
        if hasattr(serializer_class, 'Meta') and hasattr(serializer_class.Meta, 'model'):
            model = serializer_class.Meta.model
            
            # Build example response with common fields from SuperModel
            example_data = {
                'id': 1,
                '_type': model.__name__,
                'created_at': '2024-01-15T10:30:00Z',
                'modified_at': '2024-01-15T10:30:00Z',
            }
        
            
            # Add relation fields to example
            for field_name, is_many in relation_fields.items():
                related_type = _get_related_model_name(field_name)
                
                if is_many:
                    example_data[field_name] = [
                        {
                            'id': 1,
                            'str': f'{related_type} 1',
                            '_type': related_type,
                            'entity': _get_entity_example(related_type),
                            'img': f'https://example.com/{related_type.lower()}-image.jpg'
                        },
                        {
                            'id': 2,
                            'str': f'{related_type} 2',
                            '_type': related_type,
                            'entity': _get_entity_example(related_type),
                            'img': f'https://example.com/{related_type.lower()}-image2.jpg'
                        }
                    ]
                else:
                    if field_name.endswith('_id'):
                        # Handle fields like state_id, room_id
                        actual_field_name = field_name[:-3]  # Remove '_id' suffix
                        related_type = _get_related_model_name(actual_field_name)
                    else:
                        related_type = _get_related_model_name(field_name)
                    
                    example_data[field_name] = {
                        'id': 1,
                        'str': f'{related_type} Name',
                        '_type': related_type,
                        'entity': _get_entity_example(related_type),
                        'img': f'https://example.com/{related_type.lower()}-image.jpg'
                    }
            
            examples[f'{model.__name__} Response'] = OpenApiExample(
                name=f'{model.__name__} Response',
                value=example_data,
                description=f'Example response for {model.__name__} with enhanced relations'
            )
        
        return extend_schema_serializer(
            examples=list(examples.values()) if examples else None
        )(serializer_class)
    
    return decorator

def _get_related_model_name(field_name):
    """Map field names to model names"""
    field_to_model = {
        'author': 'Users',
        'state_id': 'States',
        'state': 'States',
        'largest_city': 'Cities',
        'smallest_city': 'Cities',
        'fastest_growing_city': 'Cities',
        'cities': 'Cities',
        'city': 'Cities',
        'resource_type': 'ResourceTypes',
        'resources': 'Resources',
        'sponsors': 'Users',
        'officials': 'Users',
        'party_affiliation': 'Parties',
        'topics': 'Topics',
        'coauthors': 'Users',
        'rally': 'Rallies',
        'meeting_type': 'MeetingTypes',
        'speakers': 'Users',
        'moderators': 'Users',
        'meeting': 'Meetings',
        'user': 'Users',
        'invited_by': 'Users',
        'subscriber': 'Users',
        'room_id': 'Rooms',
        'room': 'Rooms',
    }
    return field_to_model.get(field_name, 'RelatedModel')

def _get_entity_example(related_type):
    """Get example entity data for different model types"""
    entity_examples = {
        'Users': {'first_name': 'John', 'last_name': 'Doe'},
        'Cities': {'name': 'San Francisco', 'population': 873965},
        'States': {'name': 'California', 'state_code': 'CA'},
        'Parties': {'name': 'Democratic Party'},
        'Topics': {'name': 'Environment'},
        'ResourceTypes': {'name': 'Document'},
        'MeetingTypes': {'name': 'Town Hall'},
        'Resources': {'title': 'Climate Guide'},
        'Rallies': {'title': 'Climate Rally'},
        'Meetings': {'title': 'City Council Meeting'},
        'Rooms': {'privacy': 'public', 'status': 'scheduled'},
    }
    return entity_examples.get(related_type, {'name': f'{related_type} Example'})

# Alternative: Use field-level annotations
class RelationObjectField(serializers.Field):
    """Custom field that represents a relation object"""
    
    class Meta:
        swagger_schema_fields = RELATION_OBJECT_SCHEMA
    
    def to_representation(self, value):
        # This won't be called since it's just for schema
        return value

class ManyRelationObjectField(serializers.Field):
    """Custom field that represents many relation objects"""
    
    class Meta:
        swagger_schema_fields = {
            'type': 'array',
            'items': RELATION_OBJECT_SCHEMA
        }
    
    def to_representation(self, value):
        # This won't be called since it's just for schema
        return value

## NOTE: CustomSerializer schema extension moved to strongmsp_app/schema_hooks.py