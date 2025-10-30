import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Paper,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useContext, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import MarkdownEditor from '../components/MarkdownEditor';
import SpiderChart from '../components/SpiderChart';
import ApiClient from '../config/ApiClient';
import { useActiveRole } from '../context/ActiveRoleContext';
import { CoachContent } from '../object-actions/types/types';
import { ThemeContext } from '../theme/ThemeContext';
import {
    getDeliveryStatus,
    getSourceDraftInfo,
    markAthleteReceived,
    markParentReceived,
    publishCoachContent,
    regenerateDraftFromContent
} from '../utils/contentHelpers';

interface CoachContentScreenProps {
    entity: CoachContent;
}

const CoachContentEditorView: React.FC<CoachContentScreenProps> = ({
    entity
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { activeRole } = useActiveRole();
    const { brandingSettings } = useContext(ThemeContext);

    // State for editorial features
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
    const [changeRequest, setChangeRequest] = useState('');

    // Edit form state
    const [editTitle, setEditTitle] = useState(entity.title);
    const [editBody, setEditBody] = useState(entity.body);

    // Delivery status
    const deliveryStatus = getDeliveryStatus(entity);
    const sourceDraftInfo = getSourceDraftInfo(entity);

    // Helper function to convert athlete category scores to SpiderChart data format
    const structureSpiderData = (entity: any) => {
        if (!entity?.entity) return [];

        const staticResponseCounts: Record<string, number> = {
            category_performance_mindset: 6,
            category_emotional_regulation: 6,
            category_confidence: 6,
            category_resilience_motivation: 5,
            category_concentration: 13,
            category_leadership: 6,
            category_mental_wellbeing: 8,
        };

        const spiderData = [];
        for (const [field_name, count] of Object.entries(staticResponseCounts)) {
            if (entity.entity[field_name]) {
                const score = entity.entity[field_name];
                const numScore = typeof score === 'number' ? score : (typeof score === 'string' ? parseFloat(score) : 0);
                const category = field_name.replace('category_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (!isNaN(numScore)) {
                    spiderData.push({
                        category: category,
                        average_response: numScore,
                        response_count: count,
                        total_response: numScore * count
                    });
                }
            }
        }

        return spiderData;
    };

    // Mark as received when athlete or parent accesses the page (only if not already marked)
    useEffect(() => {
        const markAsReceived = async () => {
            try {
                if (activeRole === 'athlete' && !entity.athlete_received) {
                    await markAthleteReceived(Number(entity.id));
                } else if (activeRole === 'parent' && !entity.parent_received) {
                    await markParentReceived(Number(entity.id));
                }
            } catch (error) {
                console.error('Error marking content as received:', error);
                // Don't show error to user as this is a background operation
            }
        };

        markAsReceived();
    }, [activeRole, entity.id, entity.athlete_received, entity.parent_received]);

    if (!entity || entity._type !== 'CoachContent') return <LinearProgress />;

    const handlePublish = async () => {
        setLoading(true);
        try {
            await publishCoachContent(Number(entity.id));
            enqueueSnackbar('Content published successfully!', { variant: 'success' });
            // Refresh the page to show updated status
            window.location.reload();
        } catch (error) {
            enqueueSnackbar('Failed to publish content', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await ApiClient.put(`/api/coach-content/${entity.id}/`, {
                title: editTitle,
                body: editBody, // Save as Markdown directly
            });

            if (response.error) {
                throw new Error(response.error);
            }

            enqueueSnackbar('Content saved successfully!', { variant: 'success' });
            setIsEditMode(false);
            // Refresh the page to show updated content
            window.location.reload();
        } catch (error) {
            enqueueSnackbar('Failed to save content', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateDraft = async () => {
        if (!changeRequest.trim()) return;

        setLoading(true);
        try {
            const result = await regenerateDraftFromContent(Number(entity.id), changeRequest);
            setRegenerateDialogOpen(false);
            setChangeRequest('');
            enqueueSnackbar('Draft regenerated successfully!', { variant: 'success' });

            // Update the content with new draft
            setEditBody(result.updated_content.body || ''); // Use Markdown directly
        } catch (error) {
            enqueueSnackbar('Failed to regenerate draft', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h3"
                        component="h1"
                        gutterBottom
                        sx={{
                            fontWeight: 'bold',
                            color: 'primary.main',
                            mb: 2
                        }}
                    >
                        {isEditMode ? (
                            <TextField
                                fullWidth
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                variant="outlined"
                                size="medium"
                            />
                        ) : (
                            entity.title
                        )}
                    </Typography>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        {!isEditMode ? (
                            <>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsEditMode(true)}
                                >
                                    Edit
                                </Button>
                                {!deliveryStatus.isPublished && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={handlePublish}
                                        disabled={loading}
                                        startIcon={loading ? <CircularProgress size={20} /> : undefined}
                                    >
                                        Publish
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate(`/agent-responses/${entity.athlete?.id}`)}
                                >
                                    Preview as Athlete
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleSave}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : undefined}
                                >
                                    Save
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => setIsEditMode(false)}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </Box>

                    {/* Source Draft Info */}
                    {sourceDraftInfo && (
                        <Box sx={{ mb: 2 }}>
                            <Chip
                                label={sourceDraftInfo.displayText}
                                color="info"
                                variant="outlined"
                                onClick={() => navigate(`/agent-responses/${sourceDraftInfo.id}`)}
                                sx={{ cursor: 'pointer' }}
                            />
                            {isEditMode && (
                                <Button
                                    size="small"
                                    onClick={() => setRegenerateDialogOpen(true)}
                                    sx={{ ml: 1 }}
                                >
                                    Request Changes
                                </Button>
                            )}
                        </Box>
                    )}

                    {deliveryStatus.coachDelivered && (
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            <Chip
                                label={`Coach Delivered: ${deliveryStatus.coachDelivered ? 'Yes' : 'No'}`}
                                color={deliveryStatus.coachDelivered ? 'success' : 'default'}
                                size="small"
                            />
                            <Chip
                                label={`Athlete Received: ${deliveryStatus.athleteReceived ? 'Yes' : 'No'}`}
                                color={deliveryStatus.athleteReceived ? 'success' : 'default'}
                                size="small"
                            />
                            <Chip
                                label={`Parent Received: ${deliveryStatus.parentReceived ? 'Yes' : 'No'}`}
                                color={deliveryStatus.parentReceived ? 'success' : 'default'}
                                size="small"
                            />
                        </Box>
                    )}
                </Box>

                {/* SpiderChart Section */}
                {entity.athlete && (() => {
                    const spiderData = structureSpiderData(entity.athlete);
                    return spiderData.length > 0 && (
                        <SpiderChart
                            data={spiderData}
                            height={300}
                        />
                    );
                })()}

                {/* Content Body */}
                <Box sx={{ mb: 2, mt: 2 }}>
                    {isEditMode ? (
                        <Box>
                            <MarkdownEditor
                                value={editBody}
                                onChange={setEditBody}
                                placeholder="Enter your content here..."
                                minHeight={400}
                            />
                        </Box>
                    ) : (
                        <Box>
                            {entity.body ? (
                                <Box
                                    sx={{
                                        '& p': { margin: 0 },
                                        '& p + p': { marginTop: 2 },
                                        '& h1, & h2, & h3, & h4, & h5, & h6': {
                                            marginTop: 3,
                                            marginBottom: 2,
                                            fontWeight: 'bold',
                                            color: 'text.primary',
                                            fontFamily: brandingSettings?.typography?.fontFamily || theme.typography.fontFamily
                                        },
                                        '& ul, & ol': {
                                            marginTop: 2,
                                            marginBottom: 2,
                                            paddingLeft: 3
                                        },
                                        '& li': {
                                            marginBottom: 1
                                        },
                                        '& a': {
                                            color: theme.palette.primary.main,
                                            textDecoration: 'none',
                                            '&:hover': {
                                                textDecoration: 'underline'
                                            }
                                        },
                                        '& blockquote': {
                                            borderLeft: `4px solid ${theme.palette.primary.main}`,
                                            paddingLeft: 2,
                                            marginLeft: 0,
                                            fontStyle: 'italic',
                                            color: 'text.secondary',
                                            backgroundColor: brandingSettings?.palette?.[theme.palette.mode]?.paper?.main || (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50'),
                                            padding: 2,
                                            borderRadius: 1
                                        },
                                        '& code': {
                                            backgroundColor: brandingSettings?.palette?.[theme.palette.mode]?.paper?.main || (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
                                            padding: '2px 4px',
                                            borderRadius: 1,
                                            fontFamily: 'monospace'
                                        },
                                        '& pre': {
                                            backgroundColor: brandingSettings?.palette?.[theme.palette.mode]?.paper?.main || (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
                                            padding: 2,
                                            borderRadius: 1,
                                            overflow: 'auto'
                                        }
                                    }}
                                >
                                    <ReactMarkdown>{entity.body}</ReactMarkdown>
                                </Box>
                            ) : (
                                <Typography variant="body1" color="text.secondary">
                                    No content available at this time.
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>

                {/* Screenshots Section */}
                {(entity.screenshot_light || entity.screenshot_dark) && (
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            variant="h5"
                            component="h2"
                            gutterBottom
                            sx={{
                                fontWeight: 'bold',
                                color: 'primary.main',
                                mb: 3
                            }}
                        >
                            Screenshots
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {entity.screenshot_light && (
                                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary' }}>
                                        Light Theme
                                    </Typography>
                                    <Box
                                        sx={{
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            boxShadow: 2
                                        }}
                                    >
                                        <img
                                            src={entity.screenshot_light}
                                            alt="Light theme screenshot"
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                display: 'block',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => entity.screenshot_light && window.open(entity.screenshot_light, '_blank')}
                                        />
                                    </Box>
                                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => entity.screenshot_light && window.open(entity.screenshot_light, '_blank')}
                                        >
                                            View Full Size
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => {
                                                if (entity.screenshot_light) {
                                                    const link = document.createElement('a');
                                                    link.href = entity.screenshot_light;
                                                    link.download = `coach_content_${entity.id}_light.png`;
                                                    link.click();
                                                }
                                            }}
                                        >
                                            Download
                                        </Button>
                                    </Box>
                                </Box>
                            )}

                            {entity.screenshot_dark && (
                                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary' }}>
                                        Dark Theme
                                    </Typography>
                                    <Box
                                        sx={{
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            boxShadow: 2
                                        }}
                                    >
                                        <img
                                            src={entity.screenshot_dark}
                                            alt="Dark theme screenshot"
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                display: 'block',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => entity.screenshot_dark && window.open(entity.screenshot_dark, '_blank')}
                                        />
                                    </Box>
                                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => entity.screenshot_dark && window.open(entity.screenshot_dark, '_blank')}
                                        >
                                            View Full Size
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => {
                                                if (entity.screenshot_dark) {
                                                    const link = document.createElement('a');
                                                    link.href = entity.screenshot_dark;
                                                    link.download = `coach_content_${entity.id}_dark.png`;
                                                    link.click();
                                                }
                                            }}
                                        >
                                            Download
                                        </Button>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Regenerate Draft Dialog */}
                <Dialog
                    open={regenerateDialogOpen}
                    onClose={() => setRegenerateDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Request Changes</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Change Request"
                            placeholder="Describe what changes you'd like..."
                            fullWidth
                            multiline
                            rows={4}
                            value={changeRequest}
                            onChange={(e) => setChangeRequest(e.target.value)}
                            variant="outlined"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRegenerateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRegenerateDraft}
                            variant="contained"
                            disabled={!changeRequest.trim() || loading}
                        >
                            {loading ? <CircularProgress size={20} /> : 'Request Changes'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Paper>
        </Container>
    );
};

export default CoachContentEditorView;
