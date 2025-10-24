# Agentic Flow System Services

This directory contains the services that implement the agentic flow system for generating AI-powered content based on athlete assessments.

## Overview

The agentic flow system processes athlete assessment data through 5 different AI agents, each generating specific types of content. The system supports both automatic triggering (first 3 agents) and manual regeneration (last 2 agents).

## Services

### 1. ConfidenceAnalyzer (`confidence_analyzer.py`)

Generic utility for analyzing question responses across categories.

**Key Methods:**
- `get_category_stats(athlete_id, assessment_id=None)` - Returns category aggregations
- `get_spider_chart_data(athlete_id, assessment_id=None)` - Returns data formatted for spider charts
- `get_question_responses_data(athlete_id, assessment_id=None)` - Returns detailed question response data

**Usage:**
```python
from .confidence_analyzer import ConfidenceAnalyzer

analyzer = ConfidenceAnalyzer()
stats = analyzer.get_category_stats(athlete_id=1, assessment_id=1)
spider_data = analyzer.get_spider_chart_data(athlete_id=1, assessment_id=1)
```

### 2. AgenticContextBuilder (`agentic_context_builder.py`)

**Key Methods:**
- `add_athlete_context(athlete)` - Add athlete profile information
- `add_assessment_context(assessment)` - Add assessment metadata
- `add_question_responses(responses)` - Add question response data
- `add_spider_chart_data(spider_data)` - Add category aggregations
- `add_previous_agent_output(agent_response)` - Add previous agent output
- `build_messages()` - Compile all context into OpenAI messages format
- `replace_template_tokens(template_text)` - Replace tokens in prompt text

**Usage:**
```python
from .agentic_context_builder import AgenticContextBuilder

builder = AgenticContextBuilder()
builder.add_athlete_context(athlete)
builder.add_question_responses(responses)
messages = builder.build_messages()
```

### 3. AgentCompletionService (`agent_completion_service.py`)

Handles OpenAI completions for agent responses using the Completions API (non-streaming).

**Key Methods:**
- `run_completion(prompt_template, athlete, assessment, input_data)` - Runs OpenAI completion using context builder
- `prepare_input_data(athlete, assessment, purpose, previous_response=None)` - Prepares input data

**Usage:**
```python
from .agent_completion_service import AgentCompletionService

service = AgentCompletionService()
agent_response = service.run_completion(template, athlete, assessment, input_data)
```

### 4. AgentOrchestrator (`agent_orchestrator.py`)

Manages agent execution flow with async/sync patterns and notifications.

**Key Methods:**
- `trigger_assessment_agents(athlete_id, assessment_id)` - Triggers first 3 agents asynchronously
- `trigger_sequential_agent(agent_purpose, athlete_id, assessment_id)` - Triggers sequential agents
- `get_athlete_coach(athlete_id)` - Finds coach via Payment records
- `notify_coach(agent_response, coach)` - Creates coach notifications
- `notify_assessment_complete(athlete)` - Notifies athlete and parents

**Usage:**
```python
from .agent_orchestrator import AgentOrchestrator

orchestrator = AgentOrchestrator()
agent_responses = orchestrator.trigger_assessment_agents(athlete_id=1, assessment_id=1)
```

## Agent Flow

### Automatic Triggers (First 3 Agents)

1. **Mr. Dwayne** (`feedback_report`) - Generates < 600 word report
2. **Ms. Sherly** (`talking_points`) - Generates talking points for family conversation
3. **Mr. Bobby** (`scheduling_email`) - Generates < 120 word email to parents

These agents run in parallel when an assessment reaches 90% completion (45+ questions answered).

### Manual Triggers (Last 2 Agents)

4. **Mr. Sam** (`curriculum`) - Generates 12-session curriculum (depends on Dwayne's report)
5. **Mr. Patrick** (`lesson_plan`) - Generates lesson plan package (depends on Sam's output)

These agents are triggered manually via API and run sequentially.

## Data Flow

### Input A: Question Responses
- Raw question response data from `QuestionResponses` model
- Includes question text, category, response value, scale information

### Input B: Spider Chart Data
- Aggregated category statistics from `ConfidenceAnalyzer`
- Includes totals, averages, and response counts per category

### Sequential Agent Inputs
- Mr. Sam: Uses Dwayne's `ai_response` as Input A
- Mr. Patrick: Uses Sam's `ai_response` as Input A

## Notifications

### Coach Notifications
- **Channels:** Email + Dashboard
- **Content:** Full AI response text with formatting
- **Type:** `agent-response`
- **Trigger:** After each agent completes

### Athlete/Parent Notifications
- **Channels:** Email only
- **Content:** Generic completion message
- **Type:** `assessment-submitted`
- **Trigger:** After first 3 agents complete

## API Endpoints

### Trigger Agents
```
POST /api/question-responses/trigger-agents/
Body: {"athlete_id": int, "assessment_id": int}
```

### Regenerate Agent Response
```
POST /api/agent-responses/{id}/regenerate/
```

## Configuration

### Required Settings
- `OPENAI_API_KEY` - OpenAI API key for completions

### Required Models
- `PromptTemplates` - Must have active templates for each purpose
- `AgentResponses` - Stores generated responses
- `Payments` - Used for coach assignment
- `Notifications` - Stores notification data

## Error Handling

- OpenAI API errors are caught and stored in `ai_reasoning` field
- Missing templates are logged and skipped
- Coach/parent lookup failures are logged but don't stop execution
- All errors are logged with appropriate detail levels

## Context Builder Pattern

The system uses a structured context builder pattern for constructing OpenAI completion context:

### Message Structure

The context builder creates multiple system messages with clear prefixes:

```python
[
    {
        'role': 'system',
        'content': 'SYSTEM_INSTRUCTIONS:\n\nYou are an expert sports psychologist...'
    },
    {
        'role': 'system', 
        'content': 'ATHLETE_PROFILE:\n\n**Name:** John Smith\n**Age:** 16\n...'
    },
    {
        'role': 'system',
        'content': 'QUESTION_RESPONSES:\n\n### Category: Confidence\n- Q1: ...'
    },
    {
        'role': 'user',
        'content': 'TEMPLATE_PROMPT:\n\nGenerate a comprehensive feedback report...'
    }
]
```

### Token Support

Templates still support `{tokens}` for backward compatibility:

```
Generate a report for {athlete_name} based on {input_a} and {input_b}.
```

Tokens are resolved using context data:
- `{athlete_name}` → Athlete's full name
- `{input_a}` → Question responses or previous agent output
- `{input_b}` → Spider chart data
- `{assessment_title}` → Assessment title


## Migration

The system requires a database migration for the new `assessment` field in `AgentResponses`:

```bash
python manage.py makemigrations strongmsp_app --name add_assessment_to_agent_responses
python manage.py migrate
```
