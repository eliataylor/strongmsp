import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
    Box,
    Button,
    Card,
    CardMedia,
    Chip,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../allauth/auth/hooks';
import { AthletePaymentAssignment, PurposeNames } from '../object-actions/types/types';
import { getUserRoleInAssignment } from '../utils/assignmentPermissions';

const ProgramProgressStepperCoach: React.FC<{ assignment: AthletePaymentAssignment }> = ({ assignment }) => {
    const auth = useAuth();
    const theme = useTheme();
    const currentUserId = auth?.data?.user?.id;

    // State to track which purposes have their previous versions expanded
    const [expandedPurposes, setExpandedPurposes] = useState<Set<string>>(new Set());

    // Helper function to toggle expanded state for a purpose
    const toggleExpanded = (purpose: string) => {
        setExpandedPurposes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(purpose)) {
                newSet.delete(purpose);
            } else {
                newSet.add(purpose);
            }
            return newSet;
        });
    };

    // Determine if current user is a coach
    const userRole = getUserRoleInAssignment(currentUserId, assignment);
    const isCoach = userRole === 'coach';

    const agentProgress = assignment.agent_progress;
    const contentProgress = assignment.content_progress;

    // Helper function to check if coach content should be shown
    const shouldShowCoachContent = (purpose: keyof typeof contentProgress) => {
        const content = contentProgress[purpose];
        if (!content || content.length === 0) return false;

        // Always show for coaches
        if (isCoach) return true;

        // For non-coaches, only show if coach_delivered < now
        const now = new Date();
        return content.some(item => {
            const coachDelivered = item.entity?.coach_delivered;
            return coachDelivered && new Date(coachDelivered) < now;
        });
    };


    const shouldShowAgentResponse = (purpose: keyof typeof contentProgress) => {
        if (!isCoach) return false;

        const coachContent = contentProgress[purpose];
        if (coachContent && coachContent.length > 0) {
            // if a parent or athlete already saw the content, don't show the agent response anymore even to the coach
            const beenSeen = coachContent.some(item =>
                (item.entity?.athlete_received && new Date(item.entity?.athlete_received) < new Date())
                || (item.entity?.parent_received && new Date(item.entity?.parent_received) < new Date())
            );
            if (beenSeen) {
                console.log("Agent response not shown because it has been seen by the athlete or parent");
                return false;
            }
        }

        const agentResponse = agentProgress[purpose];
        if (!agentResponse || agentResponse.length === 0) return false;
        return true;
    }


    // Helper function to get content to display for a purpose
    const getContentForPurpose = (purpose: keyof typeof contentProgress) => {
        const coachContent = contentProgress[purpose];
        const agentContent = agentProgress[purpose];

        // If coach content should be shown and exists, show it
        if (shouldShowCoachContent(purpose) && coachContent && coachContent.length > 0) {
            return coachContent;
        }

        // If user is coach and no coach content exists, show agent content
        if (isCoach && agentContent && agentContent.length > 0) {
            return agentContent;
        }

        return null;
    };

    // Helper function to format date and time
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Helper function to get the appropriate screenshot based on theme
    const getScreenshotUrl = (item: any) => {
        if (!item.entity) return null;

        // Use dark theme screenshot if available and theme is dark, otherwise use light
        const isDarkTheme = theme.palette.mode === 'dark';
        if (isDarkTheme && item.entity.screenshot_dark) {
            return item.entity.screenshot_dark;
        } else if (item.entity.screenshot_light) {
            return item.entity.screenshot_light;
        } else if (item.entity.screenshot_dark) {
            return item.entity.screenshot_dark;
        }

        return null;
    };

    // Helper function to determine if content is at Agent Response or Coach Content stage
    const getContentStage = (item: any) => {
        if (item._type === 'CoachContent') {
            return 'Coach Content';
        } else if (item._type === 'AgentResponse') {
            return 'Agent Response';
        }
        return 'Unknown';
    };

    // Helper function to get delivery status for each party with checkmarks
    const getDeliveryStatus = (item: any) => {
        const now = new Date();
        const status = {
            athlete: { text: 'Not yet received', hasReceived: false },
            parent: { text: 'Not yet received', hasReceived: false },
            coach: { text: 'Not delivered', hasDelivered: false }
        };

        if (item.entity?.coach_delivered && new Date(item.entity.coach_delivered) < now) {
            status.coach = {
                text: `Delivered ${formatDateTime(item.entity.coach_delivered)}`,
                hasDelivered: true
            };
        }
        if (item.entity?.athlete_received && new Date(item.entity.athlete_received) < now) {
            status.athlete = {
                text: `Received ${formatDateTime(item.entity.athlete_received)}`,
                hasReceived: true
            };
        }
        if (item.entity?.parent_received && new Date(item.entity.parent_received) < now) {
            status.parent = {
                text: `Received ${formatDateTime(item.entity.parent_received)}`,
                hasReceived: true
            };
        }

        return status;
    };

    // Helper function to render content items with delivery status
    const renderContentItems = (content: any[], purpose: string) => {
        if (!content || content.length === 0) return null;

        const isExpanded = expandedPurposes.has(purpose);
        const hasMultipleVersions = content.length > 1;

        // Show only the latest entry (first in array) by default, or all if expanded
        const itemsToShow = isExpanded ? content : [content[0]];

        return (
            <Box>
                {itemsToShow.map((item, index) => {
                    const deliveryStatus = getDeliveryStatus(item);
                    const contentStage = getContentStage(item);
                    const screenshotUrl = getScreenshotUrl(item);
                    let reportTitle = PurposeNames[purpose as keyof typeof PurposeNames];
                    if (content.length > 1) {
                        reportTitle += ` #${item.id}`;
                    }

                    const segment = item._type === 'CoachContent' ? 'coach-content' : 'agent-responses';

                    return (
                        <Box key={`${purpose}-${index}`} mb={2}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                {/* Screenshot thumbnail */}
                                {screenshotUrl && (
                                    <Card sx={{
                                        width: 160,
                                        height: 100,
                                        flexShrink: 0,
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        boxShadow: 1
                                    }}>
                                        <CardMedia
                                            component="img"
                                            image={screenshotUrl}
                                            alt={`${reportTitle} preview`}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                objectPosition: 'top center'
                                            }}
                                        />
                                    </Card>
                                )}

                                {/* Content details */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="h6">
                                            <Link to={`/${segment}/${item.id}`}>View {reportTitle}</Link>
                                        </Typography>
                                        <Chip
                                            label={contentStage}
                                            size="small"
                                            color={contentStage === 'Coach Content' ? 'success' : 'default'}
                                            variant="outlined"
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        {deliveryStatus.athlete.hasReceived ? (
                                            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                                        ) : (
                                            <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Athlete:</strong> {deliveryStatus.athlete.text}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        {deliveryStatus.parent.hasReceived ? (
                                            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                                        ) : (
                                            <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Parent:</strong> {deliveryStatus.parent.text}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {deliveryStatus.coach.hasDelivered ? (
                                            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                                        ) : (
                                            <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Coach:</strong> {deliveryStatus.coach.text}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    );
                })}

                {/* Show Previous Versions button */}
                {hasMultipleVersions && (
                    <Box sx={{ mt: 1, mb: 2 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => toggleExpanded(purpose)}
                            sx={{ textTransform: 'none' }}
                        >
                            {isExpanded ? 'Hide Previous Versions' : `Show Previous Versions (${content.length - 1})`}
                        </Button>
                    </Box>
                )}
            </Box>
        );
    };

    return (

        <Stepper orientation="vertical">
            {assignment.pre_assessment &&
                <Step expanded={true}>
                    <StepLabel>Pre Assessment</StepLabel>
                    <StepContent>
                        <Typography variant="body2" color="text.secondary">
                            {assignment.pre_assessment_submitted_at ? (
                                <Typography variant="body2" color="text.secondary">
                                    Pre-Assessment: Completed
                                </Typography>
                            ) : (
                                userRole === 'athlete' ? (
                                    <Button
                                        component={Link}
                                        to={`/assessments/${assignment.pre_assessment.id}`}
                                        variant="contained"
                                        size="small"
                                        fullWidth
                                    >
                                        Start Pre-Assessment
                                    </Button>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Not yet completed
                                    </Typography>
                                ))}
                        </Typography>
                    </StepContent>
                </Step>
            }
            <Step expanded={shouldShowCoachContent('feedback_report') || shouldShowAgentResponse('feedback_report')}>
                <StepLabel>Feedback Report</StepLabel>
                <StepContent>
                    {(() => {
                        const content = getContentForPurpose('feedback_report');
                        if (content && content.length > 0) {
                            return renderContentItems(content, 'feedback_report');
                        }
                        return (
                            <Typography variant="body2" color="text.secondary">
                                Review detailed feedback and recommendations based on your assessment results.
                            </Typography>
                        );
                    })()}
                </StepContent>
            </Step>

            {userRole === 'coach' && (
                <Step expanded={shouldShowCoachContent('talking_points') || shouldShowAgentResponse('talking_points')}>
                    <StepLabel>Talking Points</StepLabel>
                    <StepContent>
                        {(() => {
                            const content = getContentForPurpose('talking_points');
                            if (content && content.length > 0) {
                                return renderContentItems(content, 'talking_points');
                            }
                            return (
                                <Typography variant="body2" color="text.secondary">
                                    Key discussion points and conversation starters for meaningful family discussions.
                                </Typography>
                            );
                        })()}
                    </StepContent>
                </Step>
            )}

            {userRole === 'coach' && (
                <Step expanded={shouldShowCoachContent('scheduling_email') || shouldShowAgentResponse('scheduling_email')}>
                    <StepLabel>Scheduling Email</StepLabel>
                    <StepContent>
                        {(() => {
                            const content = getContentForPurpose('scheduling_email');
                            if (content && content.length > 0) {
                                return renderContentItems(content, 'scheduling_email');
                            }
                            return (
                                <Typography variant="body2" color="text.secondary">
                                    Scheduling email for the coach to send to the parent.
                                </Typography>
                            );
                        })()}
                    </StepContent>
                </Step>
            )}

            <Step expanded={shouldShowCoachContent('curriculum') || shouldShowAgentResponse('curriculum')}>
                <StepLabel>12 Session Curriculum</StepLabel>
                <StepContent>
                    {(() => {
                        const content = getContentForPurpose('curriculum');
                        if (content && content.length > 0) {
                            return renderContentItems(content, 'curriculum');
                        }
                        return (
                            <Typography variant="body2" color="text.secondary">
                                Follow the structured 12-session program designed to enhance mental performance and resilience.
                            </Typography>
                        );
                    })()}
                </StepContent>
            </Step>

            <Step expanded={shouldShowCoachContent('lesson_plan') || shouldShowAgentResponse('lesson_plan')}>
                <StepLabel>Lesson Plan</StepLabel>
                <StepContent>
                    {(() => {
                        const content = getContentForPurpose('lesson_plan');
                        if (content && content.length > 0) {
                            return renderContentItems(content, 'lesson_plan');
                        }
                        return (
                            <Typography variant="body2" color="text.secondary">
                                Access detailed lesson plans and resources for each session to maximize your learning experience.
                            </Typography>
                        );
                    })()}
                </StepContent>
            </Step>

            {assignment.post_assessments && assignment.post_assessments.length > 0 &&
                <Step expanded={true}>
                    <StepLabel>Post Assessment</StepLabel>
                    <StepContent>
                        <Typography variant="body2" color="text.secondary">
                            {assignment.post_assessment_submitted_at ? (
                                <Typography variant="body2" color="text.secondary">
                                    Completed
                                </Typography>
                            ) : (userRole === 'athlete' ? (
                                <Button
                                    component={Link}
                                    to={`/assessments/${assignment.post_assessments[0].id}`}
                                    variant="contained"
                                    size="small"
                                    fullWidth
                                >
                                    Start Post-Assessment
                                </Button>
                            ) : assignment.pre_assessment_submitted_at ? (
                                <Typography variant="body2" color="text.secondary">
                                    Not yet completed
                                </Typography>
                            ) : null)}
                        </Typography>
                    </StepContent>
                </Step>
            }
        </Stepper>
    );
};

export default ProgramProgressStepperCoach;
