import { AgentResponses, AthletePaymentAssignment, CoachContent, ContentProgressTracking, PurposeNames, RelEntity } from '../object-actions/types/types';

export type UserRole = 'author' | 'parent' | 'athlete' | 'coach' | 'none';

export type EditableField = 'athlete' | 'coaches' | 'parents';

/**
 * Determine user's role in a PaymentAssignment
 */
export function getUserRoleInAssignment(
    userId: number | string | null | undefined,
    assignment: AthletePaymentAssignment,
    userRole?: string | null
): UserRole {
    if (!userId) return 'none';

    // Check if user is the athlete
    if (assignment.athlete.id === userId) {
        return 'athlete';
    }

    // Check if user is a coach
    if (assignment.coaches.some(coach => coach.id === userId)) {
        return 'coach';
    }

    // Check if user is a parent
    if (assignment.parents.some(parent => parent.id === userId)) {
        return 'parent';
    }

    // Note: payments array was removed from AthletePaymentAssignment
    // If we need to check payer role, we'll need to add it back or get it from elsewhere
    // For now, skip this check


    return 'none';
}

/**
 * Check if a user can edit a specific field based on their role and submission status
 */
export function canEditField(
    role: UserRole,
    field: EditableField,
    isSubmitted: boolean
): boolean {
    // Block all edits if any assessment is submitted
    if (isSubmitted) {
        return false;
    }

    // Define field permissions by role
    const rolePermissions: Record<UserRole, EditableField[]> = {
        'author': [], // No special content access permissions
        'parent': ['athlete', 'coaches'], // Cannot edit parents
        'athlete': ['coaches'], // Can only edit coaches
        'coach': ['coaches'], // Can only edit coaches
        'none': []
    };

    return rolePermissions[role].includes(field);
}

/**
 * Get all fields a user can edit based on their role and submission status
 */
export function getEditableFields(
    role: UserRole,
    isSubmitted: boolean
): EditableField[] {
    if (isSubmitted) {
        return [];
    }

    const rolePermissions: Record<UserRole, EditableField[]> = {
        'author': [], // No special content access permissions
        'parent': ['athlete', 'coaches'],
        'athlete': ['coaches'],
        'coach': ['coaches'],
        'none': []
    };

    return rolePermissions[role];
}

/**
 * Check if user can perform any edit actions on the assignment
 */
export function canEditAssignment(
    userId: number | string | null | undefined,
    assignment: AthletePaymentAssignment,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = !!(assignment.pre_assessment_submitted_at || assignment.post_assessment_submitted_at);

    return getEditableFields(role, isSubmitted).length > 0;
}

/**
 * Check if user can remove a specific coach from the assignment
 */
export function canRemoveCoach(
    userId: number | string | null | undefined,
    assignment: AthletePaymentAssignment,
    coachId: number | string,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = !!(assignment.pre_assessment_submitted_at || assignment.post_assessment_submitted_at);

    // Can't remove if submitted
    if (isSubmitted) return false;

    // Can remove coaches if user can edit coaches field
    return canEditField(role, 'coaches', isSubmitted);
}

/**
 * Check if user can remove a specific parent from the assignment
 */
export function canRemoveParent(
    userId: number | string | null | undefined,
    assignment: AthletePaymentAssignment,
    parentId: number | string,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = !!(assignment.pre_assessment_submitted_at || assignment.post_assessment_submitted_at);

    // Can't remove if submitted
    if (isSubmitted) return false;

    // Can remove parents if user can edit parents field
    return canEditField(role, 'parents', isSubmitted);
}

/**
 * Check if user can change the athlete
 */
export function canChangeAthlete(
    userId: number | string | null | undefined,
    assignment: AthletePaymentAssignment,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = !!(assignment.pre_assessment_submitted_at || assignment.post_assessment_submitted_at);

    return canEditField(role, 'athlete', isSubmitted);
}



// Helper function to get content to display for a purpose
export const getCoachContentForPurpose = (assignment: AthletePaymentAssignment, purpose: keyof typeof PurposeNames) => {
    // Ensure content_progress is an object, not null
    const contentProgress = assignment.content_progress || {};
    const coachContent = contentProgress[purpose];

    // Show coach content if it should be shown and exists
    if (coachContent && coachContent.length > 0) {
        if (assignment.my_roles.includes('coach')) {
            return coachContent;
        }
        const now = new Date();
        const canSee = coachContent.filter(item => {
            const coachDelivered = item.entity?.coach_delivered;
            return coachDelivered && new Date(coachDelivered) < now;
        });
        if (canSee && canSee.length > 0) return canSee;
    }

    if (assignment.my_roles.includes('coach')) {
        return getAgentForPurpose(assignment, purpose);
    }

    return null;
};


// Helper function to get content to display for a purpose
export const getAgentForPurpose = (assignment: AthletePaymentAssignment, purpose: keyof typeof PurposeNames) => {
    if (!assignment.my_roles.includes('coach')) return null;

    // Ensure agent_progress is an object, not null
    const agentProgress = assignment.agent_progress || {};
    const items = agentProgress[purpose];

    if (items && items.length > 0) {
        return items
    }

    return null;
};


export const getContentStage = (assignment: AthletePaymentAssignment, content: RelEntity<"CoachContent"> | RelEntity<"AgentResponses">) => {

    /*
State label for Content when viewed by Coach
- Generated (agent response)
- Edited (agent response | coach content)
- Published (coach content)
- Received by ANY Parent (coach content)
- Received by Athlete (coach content)
- Completed (not yet implemented)

Progress States for Parent
- Published  (coach content not yet received)
- Received by ANY Parent  (coach content received)
- Completed (not yet implemented)

Progress States for Athlete
- Published (coach content not yet received)
- Received (coach content received)
- Completed (not yet implemented)
*/
    const entity = content.entity;
    if (!entity) return 'Generated';

    const now = new Date();

    if (content._type === "CoachContent") {
        const coachContent = entity as CoachContent;

        // Check if athlete has received the content
        if (coachContent.athlete_received && new Date(coachContent.athlete_received) < now) {
            return 'Received by Athlete';
        }

        // Check if any parent has received the content
        if (coachContent.parent_received && new Date(coachContent.parent_received) < now) {
            return 'Received by ANY Parent';
        }

        // Check if content has been published (coach delivered)
        if (coachContent.coach_delivered && new Date(coachContent.coach_delivered) < now) {
            return 'Published';
        }

        // If coach content exists but not published, it's in edited state
        return 'Edited';

    } else if (content._type === "AgentResponses") {
        const agentResponse = entity as AgentResponses;

        // For coaches viewing agent responses
        if (assignment.my_roles.includes('coach')) {
            // Check if there's corresponding coach content that has been seen
            const purpose = agentResponse.purpose as keyof ContentProgressTracking;
            const contentProgress = assignment.content_progress || {};
            const coachContent = contentProgress[purpose];

            if (coachContent && coachContent.length > 0) {
                const hasBeenSeen = coachContent.some(item => {
                    const itemEntity = item.entity;
                    if (!itemEntity) return false;

                    return (itemEntity.athlete_received && new Date(itemEntity.athlete_received) < now) ||
                        (itemEntity.parent_received && new Date(itemEntity.parent_received) < now);
                });

                if (hasBeenSeen) {
                    return 'Edited'; // Agent response has been converted to coach content and seen
                }
            }

            return 'Generated'; // Agent response is still in generated state
        }

        // For non-coaches, agent responses should not be visible
        return 'Generated';
    }

    return 'Generated';
}
