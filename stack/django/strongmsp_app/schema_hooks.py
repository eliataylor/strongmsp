from typing import Any, Dict, List, Tuple

from drf_spectacular.openapi import AutoSchema
from drf_spectacular.extensions import OpenApiSerializerExtension
from rest_framework import serializers


def custom_preprocessing_hook(endpoints: List[Tuple]) -> List[Tuple]:
    """
    Preprocess endpoints to handle custom serializer logic (no-op for now).
    """
    return endpoints


def custom_postprocessing_hook(result: Dict[str, Any], generator, request, public) -> Dict[str, Any]:
    """
    Postprocess the schema to ensure nested objects are properly documented.
    Currently, this updates integer properties named like foreign keys to
    object shapes if they appear alongside an object property of the same base name.
    """
    components = result.get('components', {})
    schemas = components.get('schemas', {})
    for _, schema_def in schemas.items():
        properties = schema_def.get('properties')
        if isinstance(properties, dict):
            _update_foreign_key_properties(properties)
    return result


def _update_foreign_key_properties(properties: Dict[str, Any]) -> None:
    """
    Update properties to show object references instead of just integers for *_id fields
    when a sibling object property exists for the same base name.
    """
    for prop_name, prop_def in list(properties.items()):
        if (
            isinstance(prop_def, dict)
            and prop_def.get('type') == 'integer'
            and prop_name.endswith('_id')
            and prop_name != 'id'
        ):
            base_name = prop_name[:-3]
            if base_name in properties and isinstance(properties[base_name], dict):
                properties[prop_name] = {
                    'type': 'object',
                    'description': f'Nested {base_name} object',
                }


class CustomAutoSchema(AutoSchema):
    """
    Custom schema class that can provide better field metadata for nested serializers.
    """

    def _get_serializer_field_meta(self, field, direction):
        meta = super()._get_serializer_field_meta(field, direction)
        if isinstance(field, serializers.ModelSerializer):
            meta['type'] = 'object'
            meta['properties'] = self._get_nested_properties(field)
        return meta

    def _get_nested_properties(self, serializer: serializers.ModelSerializer) -> Dict[str, Any]:
        properties: Dict[str, Any] = {}
        for field_name, nested_field in serializer.fields.items():
            properties[field_name] = self._get_serializer_field_meta(nested_field, 'response')
        return properties


class CustomSerializerExtension(OpenApiSerializerExtension):
    """
    Serializer extension for CustomSerializer & subclasses. Rewrites relation fields
    to the expanded relation object shape for responses.
    """

    target_class = 'strongmsp_app.serializers.CustomSerializer'
    match_subclasses = True

    RELATION_OBJECT_SCHEMA: Dict[str, Any] = {
        'type': 'object',
        'properties': {
            'id': {'type': 'integer', 'description': 'Primary key of the related object'},
            'str': {'type': 'string', 'description': 'String representation of the related object'},
            '_type': {'type': 'string', 'description': 'Type name of the related object'},
            'entity': {
                'type': 'object',
                'additionalProperties': True,
                'description': 'Additional fields based on query parameters',
                'nullable': True,
            },
            'img': {
                'type': 'string',
                'format': 'uri',
                'description': 'Image URL if available',
                'nullable': True,
            },
        },
        'required': ['id', 'str', '_type'],
    }

    def map_serializer(self, auto_schema: AutoSchema, direction: str) -> Dict[str, Any]:
        schema = auto_schema._map_serializer(self.target, direction, bypass_extensions=True)
        if direction != 'response':
            return schema

        serializer_instance = self.target
        if not hasattr(serializer_instance, 'Meta') or not hasattr(serializer_instance.Meta, 'model'):
            return schema

        model = serializer_instance.Meta.model
        if not model:
            return schema

        properties = schema.get('properties') or {}

        # Replace relation fields with expanded object schemas
        for field in model._meta.get_fields():
            if getattr(field, 'is_relation', False):
                field_name = getattr(field, 'name', None)
                if not field_name or field_name not in properties:
                    continue

                if getattr(field, 'many_to_one', False) or getattr(field, 'one_to_one', False):
                    properties[field_name] = self.RELATION_OBJECT_SCHEMA.copy()
                elif getattr(field, 'many_to_many', False):
                    properties[field_name] = {
                        'type': 'array',
                        'items': self.RELATION_OBJECT_SCHEMA.copy(),
                    }

        # Ensure _type is documented
        if '_type' not in properties:
            properties['_type'] = {
                'type': 'string',
                'description': 'Type name of the object',
                'example': model.__name__,
            }

        schema['properties'] = properties
        return schema


