import {
    Box,
    Chip,
    Divider,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AgentResponses } from '../object-actions/types/types';

interface AgentResponseScreenProps {
    entity: AgentResponses;
}

const AgentResponseScreen: React.FC<AgentResponseScreenProps> = ({
    entity
}) => {
    const theme = useTheme();

    return (
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
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
                    AI Agent Response
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Chip
                        label={`Purpose: ${entity.purpose}`}
                        color="primary"
                        variant="outlined"
                    />
                    <Chip
                        label={`Athlete: ${entity.athlete.str}`}
                        color="secondary"
                        variant="outlined"
                    />
                    <Chip
                        label={`Template: ${entity.prompt_template.str}`}
                        color="default"
                        variant="outlined"
                    />
                </Box>
            </Box>

            {/* Message Body Section */}
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
                    Message Body
                </Typography>
                <Paper
                    variant="outlined"
                    style={{ whiteSpace: 'pre-wrap' }}
                    sx={{
                        p: 3,
                        borderRadius: 1
                    }}
                >
                    <ReactMarkdown>
                        {entity.message_body}
                    </ReactMarkdown>
                </Paper>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* AI Response Section */}
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
                    AI Response
                </Typography>
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        backgroundColor: 'primary.50',
                        borderRadius: 1
                    }}
                >
                    <ReactMarkdown>
                        {entity.ai_response}
                    </ReactMarkdown>
                </Paper>
            </Box>

            {/* AI Reasoning Section (if available) */}
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
                            AI Reasoning
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
        </Paper>
    );
};

export default AgentResponseScreen;
