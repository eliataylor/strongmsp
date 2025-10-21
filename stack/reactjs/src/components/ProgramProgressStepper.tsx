import {
    Button,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Typography
} from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';
import RelEntityHead from 'src/object-actions/components/RelEntityHead';
import { useAuth } from '../allauth/auth/hooks';
import { AthletePaymentAssignment } from '../object-actions/types/types';
import { getUserRoleInAssignment } from '../utils/assignmentPermissions';

const ProgramProgressStepper: React.FC<{ assignment: AthletePaymentAssignment }> = ({ assignment }) => {
    const auth = useAuth();
    const currentUserId = auth?.data?.user?.id;

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
                                <Button
                                    component={Link}
                                    to={`/assessments/${assignment.pre_assessment.id}`}
                                    variant="contained"
                                    size="small"
                                    fullWidth
                                >
                                    Start Pre-Assessment
                                </Button>
                            )}
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
                            return (
                                <div>
                                    {content.map((item, index) => (
                                        <RelEntityHead key={`feedback-${index}`} rel={item} />
                                    ))}
                                </div>
                            );
                        }
                        return (
                            <Typography variant="body2" color="text.secondary">
                                Review detailed feedback and recommendations based on your assessment results.
                            </Typography>
                        );
                    })()}
                </StepContent>
            </Step>
            <Step expanded={shouldShowCoachContent('talking_points') || shouldShowAgentResponse('talking_points')}>
                <StepLabel>Talking Points</StepLabel>
                <StepContent>
                    {(() => {
                        const content = getContentForPurpose('talking_points');
                        if (content && content.length > 0) {
                            return (
                                <div>
                                    {content.map((item, index) => (
                                        <RelEntityHead key={`talking-${index}`} rel={item} />
                                    ))}
                                </div>
                            );
                        }
                        return (
                            <Typography variant="body2" color="text.secondary">
                                Key discussion points and conversation starters for meaningful family discussions.
                            </Typography>
                        );
                    })()}
                </StepContent>
            </Step>
            <Step expanded={shouldShowCoachContent('curriculum') || shouldShowAgentResponse('curriculum')}>
                <StepLabel>12 Session Curriculum</StepLabel>
                <StepContent>
                    {(() => {
                        const content = getContentForPurpose('curriculum');
                        if (content && content.length > 0) {
                            return (
                                <div>
                                    {content.map((item, index) => (
                                        <RelEntityHead key={`curriculum-${index}`} rel={item} />
                                    ))}
                                </div>
                            );
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
                            return (
                                <div>
                                    {content.map((item, index) => (
                                        <RelEntityHead key={`lesson-${index}`} rel={item} />
                                    ))}
                                </div>
                            );
                        }
                        return (
                            <Typography variant="body2" color="text.secondary">
                                Access detailed lesson plans and resources for each session to maximize your learning experience.
                            </Typography>
                        );
                    })()}
                </StepContent>
            </Step>

            {assignment.post_assessment &&
                <Step expanded={true}>
                    <StepLabel>Post Assessment</StepLabel>
                    <StepContent>
                        <Typography variant="body2" color="text.secondary">
                            {assignment.post_assessment_submitted_at ? (
                                <Typography variant="body2" color="text.secondary">
                                    Post-Assessment: Completed
                                </Typography>
                            ) : (
                                <Button
                                    component={Link}
                                    to={`/assessments/${assignment.post_assessment.id}`}
                                    variant="contained"
                                    size="small"
                                    fullWidth
                                >
                                    Start Post-Assessment
                                </Button>
                            )}
                        </Typography>
                    </StepContent>
                </Step>
            }
        </Stepper>
    );
};

export default ProgramProgressStepper;
