import { UserPaymentAssignment } from '../object-actions/types/types';

export type UserRole = 'payer' | 'parent' | 'athlete' | 'coach' | 'none';

export type EditableField = 'athlete' | 'coaches' | 'parents';

/**
 * Determine user's role in a PaymentAssignment
 */
export function getUserRoleInAssignment(
    userId: number | string | null | undefined,
    assignment: UserPaymentAssignment,
    userRole?: string | null
): UserRole {
    if (!userId) return 'none';

    // Check if user is the payer (payment author)
    if (assignment.payment.author.id === userId) {
        return 'payer';
    }

    // Check if user is the athlete
    if (assignment.athlete?.id === userId) {
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
        'payer': ['athlete', 'coaches', 'parents'],
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
        'payer': ['athlete', 'coaches', 'parents'],
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
    assignment: UserPaymentAssignment,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = assignment.pre_assessment_submitted || assignment.post_assessment_submitted;

    return getEditableFields(role, isSubmitted).length > 0;
}

/**
 * Check if user can remove a specific coach from the assignment
 */
export function canRemoveCoach(
    userId: number | string | null | undefined,
    assignment: UserPaymentAssignment,
    coachId: number | string,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = assignment.pre_assessment_submitted || assignment.post_assessment_submitted;

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
    assignment: UserPaymentAssignment,
    parentId: number | string,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = assignment.pre_assessment_submitted || assignment.post_assessment_submitted;

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
    assignment: UserPaymentAssignment,
    userRole?: string | null
): boolean {
    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const isSubmitted = assignment.pre_assessment_submitted || assignment.post_assessment_submitted;

    return canEditField(role, 'athlete', isSubmitted);
}
