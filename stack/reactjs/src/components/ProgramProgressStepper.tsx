import {
    Box,
    Button,
    Card,
    CardMedia,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AthletePaymentAssignment, PurposeNames } from '../object-actions/types/types';
import { getCoachContentForPurpose } from '../utils/assignmentPermissions';

const ProgramProgressStepper: React.FC<{ assignment: AthletePaymentAssignment }> = ({ assignment }) => {
    const theme = useTheme();

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

    const docs: Record<keyof typeof PurposeNames, any | null> = {} as any;
    for (const purpose of Object.keys(PurposeNames)) {
        docs[purpose as keyof typeof PurposeNames] = getCoachContentForPurpose(assignment, purpose as keyof typeof PurposeNames);
    }

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

    // Helper function to get created date
    const getCreatedDate = (item: any) => {
        if (item.entity?.created_at) {
            return formatDateTime(item.entity.created_at);
        }
        return 'Date not available';
    };

    // Helper function to render content items
    const renderContentItems = (content: any[], purpose: string) => {
        if (!content || content.length === 0) return null;

        const isExpanded = expandedPurposes.has(purpose);
        const hasMultipleVersions = content.length > 1;

        // Show only the latest entry (first in array) by default, or all if expanded
        const itemsToShow = isExpanded ? content : [content[0]];

        return (
            <Box>
                {itemsToShow.map((item, index) => {
                    const createdDate = getCreatedDate(item);
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
                                    <Typography variant="h6">
                                        <Link to={`/${segment}/${item.id}`}>View {reportTitle}</Link>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {createdDate}
                                    </Typography>
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
            <Step expanded={docs['feedback_report'] && docs['feedback_report'].length > 0}>
                <StepLabel>Feedback Report</StepLabel>
                <StepContent>
                    {(() => {
                        const content = docs['feedback_report'];
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

            <Step expanded={docs['curriculum'] && docs['curriculum'].length > 0}>
                <StepLabel>12 Session Curriculum</StepLabel>
                <StepContent>
                    {(() => {
                        const content = docs['curriculum'];
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

            <Step expanded={docs['lesson_plan'] && docs['lesson_plan'].length > 0}>
                <StepLabel>Lesson Plan</StepLabel>
                <StepContent>
                    {(() => {
                        const content = docs['lesson_plan'];
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
                            ) : (
                                <Button
                                    component={Link}
                                    to={`/assessments/${assignment.post_assessments[0].id}`}
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
