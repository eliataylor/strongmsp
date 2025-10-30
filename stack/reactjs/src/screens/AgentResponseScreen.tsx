import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    Paper,
    TextField,
    Typography
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { AgentResponses, CoachContent } from '../object-actions/types/types';
import {
    createCoachContentFromDraft,
    getVersionHistory,
    regenerateWithChanges
} from '../utils/contentHelpers';

interface AgentResponseScreenProps {
    entity: AgentResponses;
}

const AgentResponseScreen: React.FC<AgentResponseScreenProps> = ({
    entity
}) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    // State for editorial features
    const [versionHistory, setVersionHistory] = useState<AgentResponses[]>([]);
    const [loading, setLoading] = useState(false);
    const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
    const [changeRequest, setChangeRequest] = useState('');
    const [newResponse, setNewResponse] = useState<AgentResponses | null>(null);
    const [publishedContent, setPublishedContent] = useState<CoachContent | null>(null);

    // Load version history on mount
    useEffect(() => {
        const loadVersionHistory = async () => {
            try {
                const versions = await getVersionHistory(
                    entity.id,
                    Number(entity.athlete.id),
                    entity.purpose,
                    undefined // assessment not available in AgentResponses interface
                );
                setVersionHistory(versions);
            } catch (error) {
                console.error('Error loading version history:', error);
            }
        };

        loadVersionHistory();
    }, [entity]);

    if (!entity || entity._type !== 'AgentResponses') return <LinearProgress />;

    const handleCreateDraft = async () => {
        setLoading(true);
        try {
            const coachContent = await createCoachContentFromDraft(
                Number(entity.id),
                `${entity.purpose.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} for ${entity.athlete.str}`
            );
            setPublishedContent(coachContent);
            enqueueSnackbar('Draft created successfully!', { variant: 'success' });
            navigate(`/coach-content/${coachContent.id}`);
        } catch (error) {
            enqueueSnackbar('Failed to create draft', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateWithChanges = async () => {
        if (!changeRequest.trim()) return;

        setLoading(true);
        try {
            const response = await regenerateWithChanges(Number(entity.id), changeRequest);
            setRegenerateDialogOpen(false);
            setChangeRequest('');
            enqueueSnackbar('Response regenerated successfully!', { variant: 'success' });

            if (response.id !== entity.id) {
                navigate(`/agent-responses/${response.id}`);
            } else {
                setNewResponse(response);
                // Refresh version history
                const versions = await getVersionHistory(
                    entity.id,
                    Number(entity.athlete.id),
                    entity.purpose,
                    undefined // assessment not available in AgentResponses interface
                );
                setVersionHistory(versions);
            }

        } catch (error) {
            enqueueSnackbar('Failed to regenerate response', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 2, m: 2, borderRadius: 2, backgroundColor: 'background.default' }}>
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
                    Agent Response
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Chip
                        label={`Purpose: ${entity.purpose.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
                        color="primary"
                        variant="filled"
                    />
                    <Chip
                        label={`Athlete: ${entity.athlete.str}`}
                        color="secondary"
                        variant="outlined"
                    />
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCreateDraft}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : undefined}
                    >
                        Create Draft
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => setRegenerateDialogOpen(true)}
                        disabled={loading}
                    >
                        Regenerate with Changes
                    </Button>
                </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Agent Response Section */}
            <Box sx={{ mb: 4 }}>
                <ReactMarkdown>
                    {entity.ai_response}
                </ReactMarkdown>
            </Box>

            {/* Agent Reasoning Section (if available) */}
            {entity.ai_reasoning && (
                <>
                    <Divider sx={{ my: 4 }} />
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            variant="h5"
                            component="h2"
                            gutterBottom
                            sx={{
                                fontWeight: 'bold',
                                color: 'text.primary',
                                mb: 2
                            }}
                        >
                            Agent Reasoning
                        </Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 3,
                                backgroundColor: 'secondary.50',
                                borderRadius: 1
                            }}
                        >
                            <ReactMarkdown>
                                {entity.ai_reasoning}
                            </ReactMarkdown>
                        </Paper>
                    </Box>
                </>
            )}

            {/* Version History Section */}
            {versionHistory.length > 0 && (
                <>
                    <Divider sx={{ my: 4 }} />
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            variant="h5"
                            component="h2"
                            gutterBottom
                            sx={{
                                fontWeight: 'bold',
                                color: 'text.primary',
                                mb: 2
                            }}
                        >
                            Version History
                        </Typography>
                        <List>
                            {versionHistory.map((version, index) => (
                                <ListItem key={version.id} divider>
                                    <ListItemText
                                        primary={`Version ${index + 1} (ID: ${version.id})`}
                                        secondary={`Created: ${new Date(version.created_at).toLocaleString()}`}
                                    />
                                    <Button
                                        size="small"
                                        onClick={() => navigate(`/agent-responses/${version.id}`)}
                                    >
                                        View
                                    </Button>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </>
            )}

            {/* Regenerate Dialog */}
            <Dialog
                open={regenerateDialogOpen}
                onClose={() => setRegenerateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Regenerate with Changes</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Change Request"
                        placeholder="Describe what changes you'd like to make..."
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
                        onClick={handleRegenerateWithChanges}
                        variant="contained"
                        disabled={!changeRequest.trim() || loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Regenerate'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default AgentResponseScreen;
