from rest_framework import serializers

from strongmsp_app.serializers import CustomSerializer
from .models import SchemaVersions


class PostedPromptSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=True)
    privacy = serializers.ChoiceField(choices=SchemaVersions.PrivacyChoices.choices,
                                      default=SchemaVersions.PrivacyChoices.public)
    version_id = serializers.IntegerField(required=False)
    openai_model = serializers.CharField(default="gpt-4o-mini")

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            attrs["privacy"] = SchemaVersions.PrivacyChoices.public
        return attrs


class SchemaVersionSerializer(serializers.ModelSerializer):
    # Handle parent field to prevent circular reference
    parent = serializers.SerializerMethodField()
    
    class Meta:
        model = SchemaVersions
        fields = "__all__"
        read_only_fields = [
            'created_at',
            'versions_count',
            'version_tree'
        ]
    
    def get_parent(self, obj):
        """Handle parent field to prevent circular reference"""
        if obj.parent:
            return {
                'id': obj.parent.id,
                'str': str(obj.parent),
                '_type': obj.parent.__class__.__name__
            }
        return None

    """ done as computed fields on save
    def get_version_tree(self, obj):
        root = obj
        while root.parent:
            root = root.parent

        def build_tree(schema):
            children = SchemaVersions.objects.filter(parent=schema)

            # TODO: filter by privacy! / status

            return {
                "id": schema.id,
                "name": schema.prompt if len(schema.prompt) > 80 else schema.prompt[: 80 - 3] + "...",
                "children": [build_tree(child) for child in children]
            }

        return build_tree(root)

    def get_versions_count(self, obj):
        def count_children(schema):
            children = SchemaVersions.objects.filter(parent=schema)
            return children.count() + sum(count_children(child) for child in children)

        return count_children(obj)
    """