import ApiClient from '../config/ApiClient';
import { AgentResponses, CoachContent } from '../object-actions/types/types';

/**
 * Create CoachContent from AgentResponse
 */
export const createCoachContentFromDraft = async (
    agentResponseId: number,
    title: string,
    privacy: string = 'mentioned'
): Promise<CoachContent> => {
    try {
        const response = await ApiClient.post(`/api/agent-responses/${agentResponseId}/create_coach_content`, {
            title,
            privacy
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response.data as CoachContent;
    } catch (error) {
        console.error('Error creating coach content from draft:', error);
        throw error;
    }
};

/**
 * Publish CoachContent (mark as delivered)
 */
export const publishCoachContent = async (coachContentId: number): Promise<CoachContent> => {
    try {
        const response = await ApiClient.post(`/api/coach-content/${coachContentId}/publish`, {});

        if (response.error) {
            throw new Error(response.error);
        }

        return response.data as CoachContent;
    } catch (error) {
        console.error('Error publishing coach content:', error);
        throw error;
    }
};

/**
 * Regenerate AgentResponse with changes
 */
export const regenerateWithChanges = async (
    agentResponseId: number,
    changeRequest: string
): Promise<AgentResponses> => {
    try {
        const response = await ApiClient.post(`/api/agent-responses/${agentResponseId}/regenerate_with_changes`, {
            change_request: changeRequest
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response.data as AgentResponses;
    } catch (error) {
        console.error('Error regenerating with changes:', error);
        throw error;
    }
};

/**
 * Regenerate draft from CoachContent
 */
export const regenerateDraftFromContent = async (
    coachContentId: number,
    changeRequest: string
): Promise<{ new_response: AgentResponses; updated_content: CoachContent }> => {
    try {
        const response = await ApiClient.post(`/api/coach-content/${coachContentId}/regenerate_draft`, {
            change_request: changeRequest
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response.data as { new_response: AgentResponses; updated_content: CoachContent };
    } catch (error) {
        console.error('Error regenerating draft from content:', error);
        throw error;
    }
};

/**
 * Get version history for an AgentResponse
 */
export const getVersionHistory = async (
    agentResponseId: number | string,
    athleteId: number,
    purpose: string,
    assessmentId?: number
): Promise<AgentResponses[]> => {
    // TODO: get actual past versions of this content not just other ones for this athlete and purpose

    try {
        const params = new URLSearchParams({
            id: agentResponseId.toString(),
            athlete: athleteId.toString(),
            purpose,
            ...(assessmentId && { assessment: assessmentId.toString() })
        });

        const response = await ApiClient.get(`/api/agent-responses/?${params}`);

        if (response.error) {
            throw new Error(response.error);
        }

        return (response.data as any).results || [];
    } catch (error) {
        console.error('Error getting version history:', error);
        throw error;
    }
};

/**
 * Check if CoachContent is published (has coach_delivered timestamp)
 */
export const isContentPublished = (coachContent: CoachContent): boolean => {
    return !!coachContent.coach_delivered;
};

/**
 * Get delivery status for CoachContent
 */
export const getDeliveryStatus = (coachContent: CoachContent) => {
    return {
        coachDelivered: !!coachContent.coach_delivered,
        athleteReceived: !!coachContent.athlete_received,
        parentReceived: !!coachContent.parent_received,
        isPublished: isContentPublished(coachContent)
    };
};

/**
 * Format delivery timestamp for display
 */
export const formatDeliveryTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'Not delivered';

    const date = new Date(timestamp);
    return date.toLocaleString();
};

/**
 * Get source draft info for display
 */
export const getSourceDraftInfo = (coachContent: CoachContent) => {
    if (!coachContent.source_draft) return null;

    return {
        id: coachContent.source_draft.id,
        displayText: `Based on Agent Draft #${coachContent.source_draft.id}`
    };
};

/**
 * Mark CoachContent as received by athlete
 */
export const markAthleteReceived = async (coachContentId: number): Promise<CoachContent> => {
    try {
        const response = await ApiClient.post(`/api/coach-content/${coachContentId}/mark_athlete_received`, {});

        if (response.error) {
            throw new Error(response.error);
        }

        return response.data as CoachContent;
    } catch (error) {
        console.error('Error marking athlete received:', error);
        throw error;
    }
};

/**
 * Mark CoachContent as received by parent
 */
export const markParentReceived = async (coachContentId: number): Promise<CoachContent> => {
    try {
        const response = await ApiClient.post(`/api/coach-content/${coachContentId}/mark_parent_received`, {});

        if (response.error) {
            throw new Error(response.error);
        }

        return response.data as CoachContent;
    } catch (error) {
        console.error('Error marking parent received:', error);
        throw error;
    }
};
