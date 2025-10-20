# Template Mapping System

This system provides intelligent mapping and selection of prompt templates based on purpose and context.

## Overview

The template mapping system consists of two main components:

1. **TemplateMapper** - Maps purpose values to appropriate PromptTemplates
2. **PurposeBasedTester** - React component for testing templates by purpose

## TemplateMapper Class

### Purpose Mapping Configuration

The system maps 5 predefined purposes to their corresponding templates:

| Purpose | Description | Response Format | Model |
|---------|-------------|-----------------|-------|
| `lesson_plan` | Lesson Plan Generation | JSON | gpt-4o-mini |
| `curriculum` | Curriculum Generation | JSON | gpt-4o-mini |
| `talking_points` | Parent Meeting Talking Points | Text | gpt-4o-mini |
| `feedback_report` | Performance Feedback Report | Text | gpt-4o-mini |
| `scheduling_email` | Scheduling Email | Text | gpt-4o-mini |

### Key Methods

#### `get_template_by_purpose(purpose, user=None)`
Returns the most appropriate active template for a given purpose.

```python
template = TemplateMapper.get_template_by_purpose('lesson_plan')
```

#### `get_all_available_purposes()`
Returns all available purposes with their configuration.

```python
purposes = TemplateMapper.get_all_available_purposes()
```

#### `get_templates_by_priority(user=None)`
Returns all available templates organized by purpose priority.

```python
templates = TemplateMapper.get_templates_by_priority()
```

#### `get_recommended_template(context)`
Returns a recommended template based on context hints.

```python
context = {'type': 'training_program', 'duration': '12_sessions'}
template = TemplateMapper.get_recommended_template(context)
```

#### `validate_template_compatibility(template, purpose)`
Validates if a template is compatible with a given purpose.

```python
is_compatible = TemplateMapper.validate_template_compatibility(template, 'lesson_plan')
```

#### `get_template_stats()`
Returns statistics about available templates.

```python
stats = TemplateMapper.get_template_stats()
```

## API Endpoints

### Purpose-Based Testing

**POST** `/api/prompt-templates/test-by-purpose/`

Test a prompt template by purpose with streaming response.

**Request Body:**
```json
{
    "purpose": "lesson_plan",
    "message_body": "Athlete is 15 years old, intermediate level, wants to improve technique",
    "athlete_id": 123
}
```

**Response:** Streaming JSON response with AI-generated content.

### Template-Specific Testing

**POST** `/api/prompt-templates/{id}/test/`

Test a specific prompt template by ID with streaming response.

**Request Body:**
```json
{
    "message_body": "Athlete performance data...",
    "athlete_id": 123
}
```

## React Components

### PurposeBasedTester

A React component that provides a purpose-based interface for testing AI prompts.

**Features:**
- Purpose selection dropdown
- Message body input
- Optional athlete ID
- Real-time streaming response
- Error handling

**Usage:**
```tsx
import { PurposeBasedTester } from './object-actions/prompt-tester';

function App() {
    return <PurposeBasedTester />;
}
```

### PromptTester

The original template-specific testing component.

**Usage:**
```tsx
import { PromptTester } from './object-actions/prompt-tester';

function App() {
    return <PromptTester />;
}
```

## Template Variables

Templates support the following variables for dynamic content:

- `{message_body}` - Replaced with the input message
- `{athlete_name}` - Replaced with athlete's name (if athlete ID provided)

## Setup and Usage

### 1. Create Sample Templates

```bash
python manage.py create_sample_prompt_templates
```

### 2. Use Purpose-Based Testing

```python
# Backend
from oasheets_app.services.template_mapper import TemplateMapper

template = TemplateMapper.get_template_by_purpose('lesson_plan')
tester = PromptTester.create_by_purpose('lesson_plan', user, athlete, message_body)
```

```tsx
// Frontend
import { PurposeBasedTester } from './object-actions/prompt-tester';

<PurposeBasedTester />
```

### 3. API Testing

```bash
# Test by purpose
curl -X POST /api/prompt-templates/test-by-purpose/ \
  -H "Content-Type: application/json" \
  -d '{"purpose": "lesson_plan", "message_body": "Test message"}'

# Test by template ID
curl -X POST /api/prompt-templates/1/test/ \
  -H "Content-Type: application/json" \
  -d '{"message_body": "Test message"}'
```

## Context-Based Selection

The system supports intelligent template selection based on context:

```python
context = {
    'type': 'training_program',
    'duration': '12_sessions',
    'audience': 'parents',
    'format': 'email'
}

template = TemplateMapper.get_recommended_template(context)
```

## Error Handling

The system includes comprehensive error handling for:

- Missing templates for a purpose
- Invalid purpose values
- Template compatibility issues
- Streaming errors
- Network connectivity issues

## Performance Considerations

- Templates are cached for better performance
- Streaming responses provide immediate feedback
- Context-based selection reduces API calls
- Template validation prevents runtime errors

## Future Enhancements

- Dynamic template creation based on context
- A/B testing for template effectiveness
- Template performance analytics
- Custom template variables
- Multi-language support
