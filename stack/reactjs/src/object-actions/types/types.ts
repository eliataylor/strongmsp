//---OBJECT-ACTIONS-API-RESP-STARTS---//
export type ModelName = "Users" | "Courses" | "Assessments" | "AssessmentQuestions" | "Questions" | "QuestionResponses" | "Payments" | "Products" | "PromptTemplates" | "AgentResponses" | "CoachContent" | "Shares" | "Notifications" | "PaymentAssignments";

export type ModelType<T extends ModelName> = T extends 'Users' ? Users :
  T extends 'Courses' ? Courses :
  T extends 'Assessments' ? Assessments :
  T extends 'AssessmentQuestions' ? AssessmentQuestions :
  T extends "PaymentAssignments" ? PaymentAssignments :
  T extends 'Questions' ? Questions :
  T extends 'QuestionResponses' ? QuestionResponses :
  T extends 'Payments' ? Payments :
  T extends 'PromptTemplates' ? PromptTemplates :
  T extends 'AgentResponses' ? AgentResponses :
  T extends 'CoachContent' ? CoachContent :
  T extends 'Shares' ? Shares :
  T extends 'Notifications' ? Notifications : never

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
    "avatar": {
      "machine": "avatar",
      "singular": "Avatar",
      "plural": "Avatars",
      "field_type": "image",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "photo": {
      "machine": "photo",
      "singular": "Photo",
      "plural": "Photos",
      "field_type": "image",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "gender": {
      "machine": "gender",
      "singular": "Gender",
      "plural": "Genders",
      "field_type": "select",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": "",
      "options": [
        {
          "label": "Male",
          "id": "male"
        },
        {
          "label": "Female",
          "id": "female"
        },
        {
          "label": "Rather Not Say",
          "id": "rather_not_say"
        }
      ]
    },
    "ethnicity": {
      "machine": "ethnicity",
      "singular": "Ethnicity",
      "plural": "Ethnicities",
      "field_type": "multiselect",
      "data_type": "object",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": "",
      "options": [
        {
          "label": "Black or African American",
          "id": "african_american"
        },
        {
          "label": "White",
          "id": "caucasian"
        },
        {
          "label": "Native American",
          "id": "american_native"
        },
        {
          "label": "Asian",
          "id": "south_asian"
        },
        {
          "label": "Hispanic or Latino",
          "id": "hispanic_latino"
        },
        {
          "label": "Other",
          "id": "other"
        },
        {
          "label": "Prefer Not to Say",
          "id": "prefer_not_to_say"
        }
      ]
    },
    "birthdate": {
      "machine": "birthdate",
      "singular": "Birthdate",
      "plural": "Birthdates",
      "field_type": "date",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "zip_code": {
      "machine": "zip_code",
      "singular": "Zip Code",
      "plural": "Zip Codes",
      "field_type": "text",
      "data_type": "string",
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
      "plural": "Questions",
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
      "plural": "Conditions",
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
      "plural": "Question Categories",
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
      "plural": "Payments",
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
      "plural": "Subscription Ends",
      "field_type": "date",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  },
  "PaymentAssignments": {
    "payment": {
      "machine": "payment",
      "singular": "Payment",
      "plural": "Payments",
      "relationship": "Payments",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
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
    "coaches": {
      "machine": "coaches",
      "singular": "Coach",
      "plural": "Coaches",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": Infinity,
      "default": "",
      "required": false,
      "example": ""
    },
    "parents": {
      "machine": "parents",
      "singular": "Parent",
      "plural": "Parents",
      "relationship": "Users",
      "field_type": "user_account",
      "data_type": "RelEntity",
      "cardinality": Infinity,
      "default": "",
      "required": false,
      "example": ""
    },
    "pre_assessment_submitted_at": {
      "machine": "pre_assessment_submitted_at",
      "singular": "Pre-Assessment Submitted At",
      "plural": "Pre-Assessment Submitted At",
      "field_type": "datetime",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "post_assessment_submitted_at": {
      "machine": "post_assessment_submitted_at",
      "singular": "Post-Assessment Submitted At",
      "plural": "Post-Assessment Submitted At",
      "field_type": "datetime",
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
      "plural": "Instructions",
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
      "example": "lesson_plan, curriculum, talking_points, feedback_report, scheduling_email",
      "options": [
        {
          "label": "Lesson Plan",
          "id": "lesson_plan"
        },
        {
          "label": "Curriculum",
          "id": "curriculum"
        },
        {
          "label": "Talking Points",
          "id": "talking_points"
        },
        {
          "label": "Feedback Report",
          "id": "feedback_report"
        },
        {
          "label": "Scheduling Email",
          "id": "scheduling_email"
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
      "example": "lesson_plan, curriculum, talking_points, feedback_report, scheduling_email",
      "options": [
        {
          "label": "Lesson Plan",
          "id": "lesson_plan"
        },
        {
          "label": "Curriculum",
          "id": "curriculum"
        },
        {
          "label": "Talking Points",
          "id": "talking_points"
        },
        {
          "label": "Feedback Report",
          "id": "feedback_report"
        },
        {
          "label": "Scheduling Email",
          "id": "scheduling_email"
        }
      ]
    },
    "message_body": {
      "machine": "message_body",
      "singular": "Message Body",
      "plural": "Message Bodies",
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
      "plural": "AI Reasoning",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "assignment": {
      "machine": "assignment",
      "singular": "Payment Assignment",
      "plural": "Payment Assignments",
      "relationship": "PaymentAssignments",
      "field_type": "type_reference",
      "data_type": "RelEntity",
      "cardinality": 1,
      "default": "",
      "required": true,
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
      "plural": "Bodies",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "screenshot_light": {
      "machine": "screenshot_light",
      "singular": "Screenshot Light",
      "plural": "Screenshot Lights",
      "field_type": "image",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "screenshot_dark": {
      "machine": "screenshot_dark",
      "singular": "Screenshot Dark",
      "plural": "Screenshot Darks",
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
      "plural": "Privacy",
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
  "Products": {
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
    "stripe_product_id": {
      "machine": "stripe_product_id",
      "singular": "Stripe Product ID",
      "plural": "Stripe Product IDs",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "stripe_price_id": {
      "machine": "stripe_price_id",
      "singular": "Stripe Price ID",
      "plural": "Stripe Price IDs",
      "field_type": "text",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    },
    "is_active": {
      "machine": "is_active",
      "singular": "Is Active",
      "plural": "Is Active",
      "field_type": "boolean",
      "data_type": "boolean",
      "cardinality": 1,
      "default": "true",
      "required": true,
      "example": ""
    },
    "features": {
      "machine": "features",
      "singular": "Features",
      "plural": "Features",
      "field_type": "json",
      "data_type": "object",
      "cardinality": 1,
      "default": "",
      "required": false,
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
      "singular": "Expiration",
      "plural": "Expirations",
      "field_type": "date",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": false,
      "example": ""
    }
  },
  "Notifications": {
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
    "message": {
      "machine": "message",
      "singular": "Message",
      "plural": "Messages",
      "field_type": "textarea",
      "data_type": "string",
      "cardinality": 1,
      "default": "",
      "required": true,
      "example": ""
    },
    "channel": {
      "machine": "channel",
      "singular": "Channel",
      "plural": "Channels",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "dashboard",
      "required": true,
      "example": "dashboard",
      "options": [
        { "label": "Dashboard", "id": "dashboard" },
        { "label": "Email", "id": "email" },
        { "label": "SMS", "id": "sms" }
      ]
    },
    "delivery_status": {
      "machine": "delivery_status",
      "singular": "Delivery Status",
      "plural": "Delivery Statuses",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "pending",
      "required": true,
      "example": "pending",
      "options": [
        { "label": "Pending", "id": "pending" },
        { "label": "Sent", "id": "sent" },
        { "label": "Delivered", "id": "delivered" },
        { "label": "Failed", "id": "failed" },
        { "label": "Bounced", "id": "bounced" }
      ]
    },
    "seen": {
      "machine": "seen",
      "singular": "Seen",
      "plural": "Seen",
      "field_type": "checkbox",
      "data_type": "boolean",
      "cardinality": 1,
      "default": "false",
      "required": true,
      "example": "false"
    },
    "priority": {
      "machine": "priority",
      "singular": "Priority",
      "plural": "Priorities",
      "field_type": "enum",
      "data_type": "string",
      "cardinality": 1,
      "default": "normal",
      "required": true,
      "example": "normal",
      "options": [
        { "label": "Low", "id": "low" },
        { "label": "Normal", "id": "normal" },
        { "label": "High", "id": "high" },
        { "label": "Urgent", "id": "urgent" }
      ]
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
  avatar?: string | null;
  photo?: string | null;
  gender?: string | null;
  ethnicity?: string[] | null;
  birthdate?: string | null;
  zip_code?: string | null;
}

// Context API types
export interface OrganizationPublicData {
  id: number;
  name: string;
  short_name?: string | null;
  slug: string;
  is_active: boolean;
  logo?: string | null;
  custom_logo_base64?: string | null;
  branding_palette?: any;
  branding_typography?: any;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface UserOrganizationMembership {
  id: number;  // UserOrganizations ID
  groups: string[];  // user's groups within this organization
  joined_at: string;
  is_active: boolean;
}

export type PurposeChoice = 'lesson_plan' | 'curriculum' | 'talking_points' | 'feedback_report' | 'scheduling_email';

// Progress tracking interfaces - matches PurposeChoice
export interface ProgressTracking {
  lesson_plan: RelEntity<'AgentResponses'>[] | null;
  curriculum: RelEntity<'AgentResponses'>[] | null;
  talking_points: RelEntity<'AgentResponses'>[] | null;
  feedback_report: RelEntity<'AgentResponses'>[] | null;
  scheduling_email: RelEntity<'AgentResponses'>[] | null;
}

export interface ContentProgressTracking {
  lesson_plan: RelEntity<'CoachContent'>[] | null;
  curriculum: RelEntity<'CoachContent'>[] | null;
  talking_points: RelEntity<'CoachContent'>[] | null;
  feedback_report: RelEntity<'CoachContent'>[] | null;
  scheduling_email: RelEntity<'CoachContent'>[] | null;
}

// Athlete-centric payment assignment structure
export interface AthletePaymentAssignment {
  assignments: RelEntity<'PaymentAssignments'>[];
  my_roles: string[];
  athlete: RelEntity<'Users'>;
  coaches: RelEntity<'Users'>[];
  parents: RelEntity<'Users'>[];
  pre_assessment_submitted_at: string | null;
  post_assessment_submitted_at: string | null;
  pre_assessment: RelEntity<'Assessments'> | null;
  post_assessment: RelEntity<'Assessments'> | null;
  payments: {
    id: number;
    status: string;
    subscription_ends: string | null;
    product: RelEntity<'Products'>;
    author?: RelEntity<'Users'>;
  }[];
  agent_progress: ProgressTracking;
  content_progress: ContentProgressTracking;
}

// Context API response type
export interface ContextApiResponse {
  organization: OrganizationPublicData | null;
  membership: UserOrganizationMembership | null;
  payment_assignments: AthletePaymentAssignment[];
}
export interface Courses extends SuperModel {
  title: string;
  description?: string | null;
  preassessment: RelEntity<"Assessments">;
  postassessment: RelEntity<"Assessments">;
  price: number;
}
export interface Assessments extends SuperModel {
  title: string;
  questions: RelEntity<"AssessmentQuestions">[];
}

export interface AssessmentData extends SuperModel {
  title: string;
  description?: string;
  questions: Questions[];
}

export interface AssessmentQuestions extends SuperModel {
  question: RelEntity<"Questions">[];
  order: number;
  conditions?: object | null;
}
export interface Questions extends SuperModel {
  assessment_question_id?: number;
  title: string;
  help_text?: string | null;
  question_category?: string | null;
  scale?: string | null;
  // Optional custom labels for numeric choices, e.g., {"1": "None of the time", ...}
  scale_choice_labels?: Record<string, string> | null;
}
export interface QuestionResponses extends SuperModel {
  author: RelEntity<"Users">;
  question: RelEntity<"Questions">;
  response: number;
}
export interface Products extends SuperModel {
  title: string;
  description?: string | null;
  price: number;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  is_active: boolean;
  features?: Record<string, any> | null;
}

export interface Payments extends SuperModel {
  product?: RelEntity<"Products"> | null;
  pre_assessment?: RelEntity<"Assessments"> | null;
  post_assessment?: RelEntity<"Assessments"> | null;
  paid: number;
  status: string;
  subscription_ends?: string | null;
  features_snapshot?: Record<string, any> | null;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
}

export interface PaymentAssignments extends SuperModel {
  payment: RelEntity<"Payments">;
  athlete?: RelEntity<"Users"> | null;
  coaches: RelEntity<"Users">[];
  parents: RelEntity<"Users">[];
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
  assignment: RelEntity<"PaymentAssignments">;
}
export interface CoachContent extends SuperModel {
  author: RelEntity<"Users">;
  title: string;
  body: string;
  screenshot_light?: string | null;
  screenshot_dark?: string | null;
  privacy: string;
  purpose: string;
  coach_delivered: string | null;
  athlete_received: string | null;
  parent_received: string | null;
  assignment: RelEntity<"PaymentAssignments">;
  source_draft?: RelEntity<"AgentResponses"> | null;
  athlete?: RelEntity<"Users"> | null;
}
export interface Shares extends SuperModel {
  recipient: RelEntity<"Users">;
  content: RelEntity<"CoachContent">;
  expires?: string | null;
}

export interface Notifications extends SuperModel {
  recipient: RelEntity<"Users">;
  message: string;
  message_text?: string | null;
  message_html?: string | null;
  channel: 'dashboard' | 'email' | 'sms';
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sent_at?: string | null;
  seen: boolean;
  notification_type?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  link?: string | null;
  expires?: string | null;
}

// Prompt Testing Interfaces
export interface StreamChunk {
  type: "message" | "done" | "keep_alive" | "error";
  content?: string;
  agent_response_id?: number;
  ai_response?: string;
  error?: string;
}

export interface PurposeOption {
  value: string;
  label: string;
  description: string;
  responseFormat: string;
  model: string;
}

export const PurposeNames = {
  lesson_plan: "Lesson Plan",
  curriculum: "Curriculum",
  talking_points: "Talking Points",
  feedback_report: "Feedback Report",
  scheduling_email: "Scheduling Email"
}

//---OBJECT-ACTIONS-TYPE-SCHEMA-ENDS---//

export type USER_TYPE = 'athlete' | 'parent' | 'coach' | 'admin' | 'agent';

// Role configuration with icons, labels, and colors
export const ROLE_CONFIG = {
  athlete: {
    icon: 'Sports',
    label: "Athlete",
    color: "primary" as const,
    description: "Take assessments, manage your profile, and view coach content shared with you",
    features: [
      "Complete confidence assessments",
      "Track your performance over time",
      "View personalized coach content",
      "Manage your athlete profile"
    ]
  },
  parent: {
    icon: 'Diversity3',
    label: "Parent",
    color: "secondary" as const,
    description: "View your child athlete's profile, assessment results, and manage your subscription",
    features: [
      "Monitor your child's progress",
      "View assessment results and insights",
      "Manage subscription and payments",
      "Access shared coach content"
    ]
  },
  coach: {
    icon: 'SportsEsports',
    label: "Coach",
    color: "success" as const,
    description: "Review all athletes assigned to you, trigger agent responses, and create shared content",
    features: [
      "Review athlete data and progress",
      "Trigger AI agent responses",
      "Create and customize coach content",
      "Share content with athletes and parents"
    ]
  },
  admin: {
    icon: 'AdminPanelSettings',
    label: "Admin",
    color: "error" as const,
    description: "Full system access to manage users, content, and platform settings",
    features: [
      "Manage all users and roles",
      "Access all platform data",
      "Configure system settings",
      "Monitor platform analytics"
    ]
  },
  agent: {
    icon: 'SmartToy',
    label: "Agent",
    color: "info" as const,
    description: "AI agent with specialized access to system functions and data processing",
    features: [
      "Process automated tasks",
      "Access system data for analysis",
      "Execute predefined workflows",
      "Generate automated responses"
    ]
  }
} as const;

//---OBJECT-ACTIONS-NAV-ITEMS-STARTS---//
export interface NavItem<T extends ModelName = ModelName> {
  singular: string;
  plural: string;
  segment: string;
  api: string;
  icon: string;
  type: T;
  model_type?: 'vocabulary' | string;
  search_fields: string[];
  roles?: USER_TYPE[];
}

export const NAVITEMS: { [K in ModelName]: NavItem<K> }[ModelName][] = [
  {
    "singular": "User",
    "plural": "Users",
    "type": "Users",
    "segment": "users",
    "api": "/api/users",
    "icon": "Person",
    "search_fields": [
      "first_name",
      "last_name"
    ],
    "roles": ["admin", "coach", "parent"]
  },
  {
    "singular": "Course",
    "plural": "Courses",
    "type": "Courses",
    "segment": "courses",
    "api": "/api/courses",
    "icon": "School",
    "search_fields": [
      "title"
    ],
    "roles": ["admin", "parent"]
  },
  {
    "singular": "My Assessment",
    "plural": "Assessments",
    "type": "Assessments",
    "segment": "assessments",
    "api": "/api/assessments",
    "icon": "Quiz",
    "search_fields": [
      "title"
    ],
    "roles": ["athlete"]
  },
  {
    "singular": "Assessment Question",
    "plural": "Assessment Questions",
    "type": "AssessmentQuestions",
    "segment": "assessment-questions",
    "api": "/api/assessment-questions",
    "icon": "HelpOutline",
    "model_type": "vocabulary",
    "search_fields": [
      "question__title"
    ],
    "roles": ["coach", "admin"]
  },
  {
    "singular": "Question",
    "plural": "Questions",
    "type": "Questions",
    "segment": "questions",
    "api": "/api/questions",
    "icon": "QuestionMark",
    "model_type": "vocabulary",
    "search_fields": [
      "title"
    ],
    "roles": ["coach", "admin"]
  },
  {
    "singular": "Question Response",
    "plural": "Question Responses",
    "type": "QuestionResponses",
    "segment": "question-responses",
    "api": "/api/question-responses",
    "icon": "AssignmentTurnedIn",
    "model_type": "vocabulary",
    "search_fields": [
      "question__title"
    ],
    "roles": ["athlete", "coach", "admin"]
  },
  {
    "singular": "Payment",
    "plural": "Payments",
    "type": "Payments",
    "segment": "payments",
    "api": "/api/payments",
    "icon": "Payment",
    "model_type": "vocabulary",
    "search_fields": [
      "course__title"
    ],
    "roles": ["parent", "admin"]
  },
  {
    "singular": "Product",
    "plural": "Products",
    "type": "Products",
    "segment": "products",
    "api": "/api/products",
    "icon": "Inventory",
    "search_fields": [
      "title"
    ],
    "roles": ["admin"]
  },
  {
    "singular": "Prompt Template",
    "plural": "Prompt Templates",
    "type": "PromptTemplates",
    "segment": "prompt-templates",
    "api": "/api/prompt-templates",
    "icon": "Description",
    "search_fields": [],
    "roles": ["coach", "admin"]
  },
  {
    "singular": "Agent Response",
    "plural": "Agent Responses",
    "type": "AgentResponses",
    "segment": "agent-responses",
    "api": "/api/agent-responses",
    "icon": "SmartToy",
    "search_fields": [],
    "roles": ["coach", "admin"]
  },
  {
    "singular": "Coach Content",
    "plural": "Coach Content",
    "type": "CoachContent",
    "segment": "coach-content",
    "api": "/api/coach-content",
    "icon": "Sports",
    "search_fields": [
      "title"
    ],
    "roles": ["athlete", "parent", "coach", "admin"]
  },
  {
    "singular": "Share",
    "plural": "Shares",
    "type": "Shares",
    "segment": "shares",
    "api": "/api/shares",
    "icon": "Share",
    "model_type": "vocabulary",
    "search_fields": [
      "content__title"
    ],
    "roles": ["coach", "admin"]
  },
  {
    "singular": "Notification",
    "plural": "Notifications",
    "type": "Notifications",
    "segment": "notifications",
    "api": "/api/notifications",
    "icon": "Notifications",
    "search_fields": [
      "message"
    ],
    "roles": ["athlete", "parent", "coach", "admin"]
  }
]
//---OBJECT-ACTIONS-NAV-ITEMS-ENDS---//
