//---OBJECT-ACTIONS-API-RESP-STARTS---//
export type ModelName = "Users" | "Courses" | "Assessments" | "AssessmentQuestions" | "Questions" | "QuestionResponses" | "Payments" | "PromptTemplates" | "AgentResponses" | "CoachContent" | "Shares";

export type ModelType<T extends ModelName> = T extends 'Users' ? Users : 
T extends 'Courses' ? Courses :
T extends 'Assessments' ? Assessments :
T extends 'AssessmentQuestions' ? AssessmentQuestions :
T extends 'Questions' ? Questions :
T extends 'QuestionResponses' ? QuestionResponses :
T extends 'Payments' ? Payments :
T extends 'PromptTemplates' ? PromptTemplates :
T extends 'AgentResponses' ? AgentResponses :
T extends 'CoachContent' ? CoachContent :
T extends 'Shares' ? Shares : never

export interface RelEntity<T extends ModelName = ModelName> {
  id: string | number;
  str: string;
  _type: T;
  img?: string;
  entity?: Partial<ModelType<T>>;
}

export type ITypeFieldSchema = {
  [K in ModelName]: {
    [fieldName: string]: FieldTypeDefinition;
  };
}

export interface ApiListResponse<T extends ModelName> {
    count: number;
    offset: number;
    limit: number;
    meta: any;
    error: string | null;
    results: Array<ModelType<T>>
}

export function getProp<T extends ModelName, K extends keyof ModelType<T>>(
  entity: ModelType<T>,
  key: K
): ModelType<T>[K] | null {
  if (key in entity) return entity[key];
  return null;
}

export function restructureAsAllEntities<T extends ModelName>(
  modelName: T,
  entity: Partial<ModelType<T>>
): ModelType<T> {
  const schema = TypeFieldSchema[modelName];
  const result: any = { id: entity.id || 0, _type: modelName };

  Object.entries(schema).forEach(([key, field]) => {
    const value = (entity as any)[key];

    if (field.data_type === 'RelEntity') {
      if (!value) {
        // Skip undefined values
      } else if (Array.isArray(value)) {
        // Transform array of RelEntities
        result[key] = value.map((item) =>
          item.entity ? restructureAsAllEntities(item._type as ModelName, item.entity) : item
        );
      } else if (value.entity) {
        // Transform single RelEntity
        result[key] = value.entity ?
          restructureAsAllEntities(value._type as ModelName, value.entity) :
          value;
      } else {
        result[key] = { id: value.id };
      }
    } else if (value !== undefined) {
      result[key] = value;
    }
  });
  return result as ModelType<T>;
}
//---OBJECT-ACTIONS-API-RESP-ENDS---//

//---OBJECT-ACTIONS-NAV-ITEMS-STARTS---//
export interface NavItem<T extends ModelName = ModelName> {
  singular: string;
  plural: string;
  segment: string;
  api: string;
  icon?: string;
  type: T;
  model_type?: 'vocabulary' | string;
  search_fields: string[];
}

export const NAVITEMS: { [K in ModelName]: NavItem<K> }[ModelName][] = [
  {
    "singular": "User",
    "plural": "Users",
    "type": "Users",
    "segment": "users",
    "api": "/api/users",
    "search_fields": [
      "first_name",
      "last_name"
    ]
  },
  {
    "singular": "Course",
    "plural": "Courses",
    "type": "Courses",
    "segment": "courses",
    "api": "/api/courses",
    "search_fields": [
      "title"
    ]
  },
  {
    "singular": "Assessment",
    "plural": "Assessments",
    "type": "Assessments",
    "segment": "assessments",
    "api": "/api/assessments",
    "search_fields": [
      "title"
    ]
  },
  {
    "singular": "Assessment Question",
    "plural": "Assessment Questions",
    "type": "AssessmentQuestions",
    "segment": "assessment-questions",
    "api": "/api/assessment-questions",
    "search_fields": [
      "question__title"
    ]
  },
  {
    "singular": "Question",
    "plural": "Questions",
    "type": "Questions",
    "segment": "questions",
    "api": "/api/questions",
    "search_fields": [
      "title"
    ]
  },
  {
    "singular": "Question Response",
    "plural": "Question Responses",
    "type": "QuestionResponses",
    "segment": "question-responses",
    "api": "/api/question-responses",
    "search_fields": [
      "question__title"
    ]
  },
  {
    "singular": "Payment",
    "plural": "Payments",
    "type": "Payments",
    "segment": "payments",
    "api": "/api/payments",
    "search_fields": [
      "course__title"
    ]
  },
  {
    "singular": "Prompt Template",
    "plural": "Prompt Templates",
    "type": "PromptTemplates",
    "segment": "prompt-templates",
    "api": "/api/prompt-templates",
    "search_fields": []
  },
  {
    "singular": "Agent Response",
    "plural": "Agent Responses",
    "type": "AgentResponses",
    "segment": "agent-responses",
    "api": "/api/agent-responses",
    "search_fields": []
  },
  {
    "singular": "Coach Content",
    "plural": "Coach Content",
    "type": "CoachContent",
    "segment": "coach-content",
    "api": "/api/coach-content",
    "search_fields": [
      "title"
    ]
  },
  {
    "singular": "Share",
    "plural": "Shares",
    "type": "Shares",
    "segment": "shares",
    "api": "/api/shares",
    "search_fields": [
      "content__title"
    ]
  }
]
//---OBJECT-ACTIONS-NAV-ITEMS-ENDS---//

//---OBJECT-ACTIONS-TYPE-CONSTANTS-STARTS---//
export interface FieldTypeDefinition {
    machine: string;
    singular: string;
    plural: string;
    data_type: 'string' | 'number' | 'boolean' | 'object' | 'RelEntity';
    field_type: string;
    cardinality: number | typeof Infinity;
    relationship?: ModelName;
    required: boolean;
    default: string;
    example: string;
    options?: Array<{ label: string; id: string; }>;
}

export const TypeFieldSchema: ITypeFieldSchema = {
  "Users": {
    "email": {
      "machine": "email",
      "singular": "Email",
      "plural": "Emails",
      "field_type": "email",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "username": {
      "machine": "username",
      "singular": "Username",
      "plural": "Usernames",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "real_name": {
      "machine": "real_name",
      "singular": "Real Name",
      "plural": "Real Names",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "bio": {
      "machine": "bio",
      "singular": "Bio",
      "plural": "Bios",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "user_types": {
      "machine": "user_types",
      "singular": "User Type",
      "plural": "User Typeses",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 3,
      "default": "",
      "required": false,
      "example": "athlete, parent, coach",
      "options": [
        {
          "label": "Athlete",
          "id": "athlete"
        },
        {
          "label": "Parent",
          "id": "parent"
        },
        {
          "label": "Coach",
          "id": "coach"
        }
      ]
    },
    "confidence_score": {
      "machine": "confidence_score",
      "singular": "Confidence Score",
      "plural": "Confidence Scores",
      "field_type": "integer",
      "data_type": "number",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  },
  "Courses": {
    "title": {
      "machine": "title",
      "singular": "Title",
      "plural": "Titles",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "description": {
      "machine": "description",
      "singular": "Description",
      "plural": "Descriptions",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "preassessment": {
      "machine": "preassessment",
      "singular": "Pre-Assessment",
      "plural": "Pre-Assessments",
      "relationship": "Assessments",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "postassessment": {
      "machine": "postassessment",
      "singular": "Post-Assessment",
      "plural": "Post-Assessments",
      "relationship": "Assessments",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "price": {
      "machine": "price",
      "singular": "Price",
      "plural": "Prices",
      "field_type": "decimal",
      "data_type": "number",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "icon": {
      "machine": "icon",
      "singular": "Icon",
      "plural": "Icons",
      "field_type": "image",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "cover_photo": {
      "machine": "cover_photo",
      "singular": "Cover Photo",
      "plural": "Cover Photos",
      "field_type": "image",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  },
  "Assessments": {
    "title": {
      "machine": "title",
      "singular": "Title",
      "plural": "Titles",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "questions": {
      "machine": "questions",
      "singular": "Question",
      "plural": "Questionss",
      "relationship": "AssessmentQuestions",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": Infinity,
      "default": "",
      "required": true,
      "example": ""
    }
  },
  "AssessmentQuestions": {
    "question": {
      "machine": "question",
      "singular": "Question",
      "plural": "Questions",
      "relationship": "Questions",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": Infinity,
      "default": "",
      "required": true,
      "example": ""
    },
    "order": {
      "machine": "order",
      "singular": "Order",
      "plural": "Orders",
      "field_type": "integer",
      "data_type": "number",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "conditions": {
      "machine": "conditions",
      "singular": "Condition",
      "plural": "Conditionss",
      "field_type": "json",
      "data_type": "object",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  },
  "Questions": {
    "title": {
      "machine": "title",
      "singular": "Title",
      "plural": "Titles",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "help_text": {
      "machine": "help_text",
      "singular": "Help Text",
      "plural": "Help Texts",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "question_category": {
      "machine": "question_category",
      "singular": "Question Category",
      "plural": "Question Categorys",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": "Performance Mindset, Emotional Regulation, Confidence,Resilience & Motivation, Concentration, Leadership, Mental Well-being",
      "options": [
        {
          "label": "Performance Mindset",
          "id": "performance_mindset"
        },
        {
          "label": "Emotional Regulation",
          "id": "emotional_regulation"
        },
        {
          "label": "Confidence",
          "id": "confidence"
        },
        {
          "label": "Resilience & Motivation",
          "id": "resilience__motivation"
        },
        {
          "label": "Concentration",
          "id": "concentration"
        },
        {
          "label": "Leadership",
          "id": "leadership"
        },
        {
          "label": "Mental Well-being",
          "id": "mental_wellbeing"
        }
      ]
    },
    "scale": {
      "machine": "scale",
      "singular": "Scale",
      "plural": "Scales",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": "percentage,one-to-five,one-to-ten",
      "options": [
        {
          "label": "Percentage",
          "id": "percentage"
        },
        {
          "label": "One-to-five",
          "id": "onetofive"
        },
        {
          "label": "One-to-ten",
          "id": "onetoten"
        }
      ]
    }
  },
  "QuestionResponses": {
    "author": {
      "machine": "author",
      "singular": "Athlete",
      "plural": "Athletes",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "question": {
      "machine": "question",
      "singular": "Question",
      "plural": "Questions",
      "relationship": "Questions",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "response": {
      "machine": "response",
      "singular": "Response",
      "plural": "Responses",
      "field_type": "integer",
      "data_type": "number",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    }
  },
  "Payments": {
    "athlete": {
      "machine": "athlete",
      "singular": "Athlete",
      "plural": "Athletes",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "preferred_coach": {
      "machine": "preferred_coach",
      "singular": "Preferred Coach",
      "plural": "Preferred Coaches",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "course": {
      "machine": "course",
      "singular": "Course",
      "plural": "Courses",
      "relationship": "Courses",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "paid": {
      "machine": "paid",
      "singular": "Paid",
      "plural": "Paids",
      "field_type": "decimal",
      "data_type": "number",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "status": {
      "machine": "status",
      "singular": "Status",
      "plural": "Statuses",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": "paid, order, request, declined",
      "options": [
        {
          "label": "Paid",
          "id": "paid"
        },
        {
          "label": "Order",
          "id": "order"
        },
        {
          "label": "Request",
          "id": "request"
        },
        {
          "label": "Declined",
          "id": "declined"
        }
      ]
    },
    "subscription_ends": {
      "machine": "subscription_ends",
      "singular": "Subscription End",
      "plural": "Subscription Endss",
      "field_type": "date",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  },
  "PromptTemplates": {
    "prompt": {
      "machine": "prompt",
      "singular": "Prompt",
      "plural": "Prompts",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "instructions": {
      "machine": "instructions",
      "singular": "Instruction",
      "plural": "Instructionss",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "model": {
      "machine": "model",
      "singular": "Model",
      "plural": "Models",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "status": {
      "machine": "status",
      "singular": "Status",
      "plural": "Statuses",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "active",
      "required": true,
      "example": "active, archived",
      "options": [
        {
          "label": "Active",
          "id": "active"
        },
        {
          "label": "Archived",
          "id": "archived"
        }
      ]
    },
    "purpose": {
      "machine": "purpose",
      "singular": "Purpose",
      "plural": "Purposes",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": "lesson-package, 12-sessions, talking-points, feedback-report, parent-email",
      "options": [
        {
          "label": "Lesson-package",
          "id": "lessonpackage"
        },
        {
          "label": "12-sessions",
          "id": "12sessions"
        },
        {
          "label": "Talking-points",
          "id": "talkingpoints"
        },
        {
          "label": "Feedback-report",
          "id": "feedbackreport"
        },
        {
          "label": "Parent-email",
          "id": "parentemail"
        }
      ]
    },
    "response_format": {
      "machine": "response_format",
      "singular": "Response Format",
      "plural": "Response Formats",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "text",
      "required": false,
      "example": "text,json",
      "options": [
        {
          "label": "Text",
          "id": "text"
        },
        {
          "label": "Json",
          "id": "json"
        }
      ]
    }
  },
  "AgentResponses": {
    "athlete": {
      "machine": "athlete",
      "singular": "Athlete",
      "plural": "Athletes",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "prompt_template": {
      "machine": "prompt_template",
      "singular": "Prompt Template",
      "plural": "Prompt Templates",
      "relationship": "PromptTemplates",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "purpose": {
      "machine": "purpose",
      "singular": "Purpose",
      "plural": "Purposes",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": "lesson-package, 12-sessions, talking-points, feedback-report, parent-email",
      "options": [
        {
          "label": "Lesson-package",
          "id": "lessonpackage"
        },
        {
          "label": "12-sessions",
          "id": "12sessions"
        },
        {
          "label": "Talking-points",
          "id": "talkingpoints"
        },
        {
          "label": "Feedback-report",
          "id": "feedbackreport"
        },
        {
          "label": "Parent-email",
          "id": "parentemail"
        }
      ]
    },
    "message_body": {
      "machine": "message_body",
      "singular": "Message Body",
      "plural": "Message Bodys",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "ai_response": {
      "machine": "ai_response",
      "singular": "AI Response",
      "plural": "AI Responses",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "ai_reasoning": {
      "machine": "ai_reasoning",
      "singular": "AI Reasoning",
      "plural": "AI Reasonings",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  },
  "CoachContent": {
    "author": {
      "machine": "author",
      "singular": "Coach",
      "plural": "Coaches",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "title": {
      "machine": "title",
      "singular": "Title",
      "plural": "Titles",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "body": {
      "machine": "body",
      "singular": "Body",
      "plural": "Bodys",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "icon": {
      "machine": "icon",
      "singular": "Icon",
      "plural": "Icons",
      "field_type": "image",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "cover_photo": {
      "machine": "cover_photo",
      "singular": "Cover Photo",
      "plural": "Cover Photos",
      "field_type": "image",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "privacy": {
      "machine": "privacy",
      "singular": "Privacy",
      "plural": "Privacys",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "mentioned",
      "required": true,
      "example": "public, authenticated, mentioned",
      "options": [
        {
          "label": "Public",
          "id": "public"
        },
        {
          "label": "Authenticated",
          "id": "authenticated"
        },
        {
          "label": "Mentioned",
          "id": "mentioned"
        }
      ]
    }
  },
  "Shares": {
    "recipient": {
      "machine": "recipient",
      "singular": "Recipient",
      "plural": "Recipients",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "content": {
      "machine": "content",
      "singular": "Content",
      "plural": "Contents",
      "relationship": "CoachContent",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "expires": {
      "machine": "expires",
      "singular": "Expire",
      "plural": "Expireses",
      "field_type": "date",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  }
}
//---OBJECT-ACTIONS-TYPE-CONSTANTS-ENDS---//

//---OBJECT-ACTIONS-TYPE-SCHEMA-STARTS---//
export interface SuperModel {
    readonly id: number | string; 
    author: RelEntity<'Users'>;
    created_at: string;
    modified_at: string;
    _type: ModelName;
}

export interface Users {
	readonly id: number | string
	_type: string
	is_active?: boolean
	is_staff?: boolean
	last_login?: string
	date_joined?: string
	first_name?: string
	last_name?: string
	groups?: string[]
	email: string;
	username: string;
	real_name?: string | null;
	bio?: string | null;
	user_types?: string[] | null;
	confidence_score?: number | null;
}
export interface Courses extends SuperModel {
	title: string;
	description?: string | null;
	preassessment: RelEntity<"Assessments">;
	postassessment: RelEntity<"Assessments">;
	price: number;
	icon?: string | null;
	cover_photo?: string | null;
}
export interface Assessments extends SuperModel {
	title: string;
	questions: RelEntity<"AssessmentQuestions">[];
}
export interface AssessmentQuestions extends SuperModel {
	question: RelEntity<"Questions">[];
	order: number;
	conditions?: object | null;
}
export interface Questions extends SuperModel {
	title: string;
	help_text?: string | null;
	question_category?: string | null;
	scale?: string | null;
}
export interface QuestionResponses extends SuperModel {
	author: RelEntity<"Users">;
	question: RelEntity<"Questions">;
	response: number;
}
export interface Payments extends SuperModel {
	athlete?: RelEntity<"Users"> | null;
	preferred_coach?: RelEntity<"Users"> | null;
	course: RelEntity<"Courses">;
	paid: number;
	status: string;
	subscription_ends?: string | null;
}
export interface PromptTemplates extends SuperModel {
	prompt: string;
	instructions?: string | null;
	model?: string | null;
	status: string;
	purpose: string;
	response_format?: string | null;
}
export interface AgentResponses extends SuperModel {
	athlete: RelEntity<"Users">;
	prompt_template: RelEntity<"PromptTemplates">;
	purpose: string;
	message_body: string;
	ai_response: string;
	ai_reasoning?: string | null;
}
export interface CoachContent extends SuperModel {
	author?: RelEntity<"Users"> | null;
	title: string;
	body: string;
	icon?: string | null;
	cover_photo?: string | null;
	privacy: string;
}
export interface Shares extends SuperModel {
	recipient: RelEntity<"Users">;
	content: RelEntity<"CoachContent">;
	expires?: string | null;
}
//---OBJECT-ACTIONS-TYPE-SCHEMA-ENDS---//