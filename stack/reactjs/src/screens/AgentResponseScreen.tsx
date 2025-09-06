import {
    Box,
    Chip,
    Container,
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
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
                        sx={{
                            p: 3,
                            backgroundColor: 'grey.50',
                            borderRadius: 1
                        }}
                    >
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => (
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            mb: 2,
                                            lineHeight: 1.6
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                h1: ({ children }) => (
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            fontWeight: 'bold',
                                            mb: 2,
                                            mt: 3
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                h2: ({ children }) => (
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 'bold',
                                            mb: 2,
                                            mt: 2
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                h3: ({ children }) => (
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 'bold',
                                            mb: 1,
                                            mt: 2
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                ul: ({ children }) => (
                                    <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                                        {children}
                                    </Box>
                                ),
                                ol: ({ children }) => (
                                    <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                                        {children}
                                    </Box>
                                ),
                                li: ({ children }) => (
                                    <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                                        {children}
                                    </Typography>
                                ),
                                blockquote: ({ children }) => (
                                    <Box
                                        sx={{
                                            borderLeft: `4px solid ${theme.palette.primary.main}`,
                                            pl: 2,
                                            ml: 0,
                                            fontStyle: 'italic',
                                            color: 'text.secondary',
                                            mb: 2
                                        }}
                                    >
                                        {children}
                                    </Box>
                                ),
                                code: ({ children }) => (
                                    <Box
                                        component="code"
                                        sx={{
                                            backgroundColor: 'grey.200',
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 0.5,
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        {children}
                                    </Box>
                                ),
                                pre: ({ children }) => (
                                    <Box
                                        component="pre"
                                        sx={{
                                            backgroundColor: 'grey.100',
                                            p: 2,
                                            borderRadius: 1,
                                            overflow: 'auto',
                                            mb: 2
                                        }}
                                    >
                                        {children}
                                    </Box>
                                )
                            }}
                        >
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
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => (
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            mb: 2,
                                            lineHeight: 1.6
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                h1: ({ children }) => (
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            fontWeight: 'bold',
                                            mb: 2,
                                            mt: 3
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                h2: ({ children }) => (
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 'bold',
                                            mb: 2,
                                            mt: 2
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                h3: ({ children }) => (
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 'bold',
                                            mb: 1,
                                            mt: 2
                                        }}
                                    >
                                        {children}
                                    </Typography>
                                ),
                                ul: ({ children }) => (
                                    <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                                        {children}
                                    </Box>
                                ),
                                ol: ({ children }) => (
                                    <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                                        {children}
                                    </Box>
                                ),
                                li: ({ children }) => (
                                    <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                                        {children}
                                    </Typography>
                                ),
                                blockquote: ({ children }) => (
                                    <Box
                                        sx={{
                                            borderLeft: `4px solid ${theme.palette.secondary.main}`,
                                            pl: 2,
                                            ml: 0,
                                            fontStyle: 'italic',
                                            color: 'text.secondary',
                                            mb: 2
                                        }}
                                    >
                                        {children}
                                    </Box>
                                ),
                                code: ({ children }) => (
                                    <Box
                                        component="code"
                                        sx={{
                                            backgroundColor: 'grey.200',
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 0.5,
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        {children}
                                    </Box>
                                ),
                                pre: ({ children }) => (
                                    <Box
                                        component="pre"
                                        sx={{
                                            backgroundColor: 'grey.100',
                                            p: 2,
                                            borderRadius: 1,
                                            overflow: 'auto',
                                            mb: 2
                                        }}
                                    >
                                        {children}
                                    </Box>
                                )
                            }}
                        >
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
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => (
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    mb: 2,
                                                    lineHeight: 1.6
                                                }}
                                            >
                                                {children}
                                            </Typography>
                                        ),
                                        h1: ({ children }) => (
                                            <Typography
                                                variant="h4"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    mb: 2,
                                                    mt: 3
                                                }}
                                            >
                                                {children}
                                            </Typography>
                                        ),
                                        h2: ({ children }) => (
                                            <Typography
                                                variant="h5"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    mb: 2,
                                                    mt: 2
                                                }}
                                            >
                                                {children}
                                            </Typography>
                                        ),
                                        h3: ({ children }) => (
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    mb: 1,
                                                    mt: 2
                                                }}
                                            >
                                                {children}
                                            </Typography>
                                        ),
                                        ul: ({ children }) => (
                                            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                                                {children}
                                            </Box>
                                        ),
                                        ol: ({ children }) => (
                                            <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                                                {children}
                                            </Box>
                                        ),
                                        li: ({ children }) => (
                                            <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                                                {children}
                                            </Typography>
                                        ),
                                        blockquote: ({ children }) => (
                                            <Box
                                                sx={{
                                                    borderLeft: `4px solid ${theme.palette.error.main}`,
                                                    pl: 2,
                                                    ml: 0,
                                                    fontStyle: 'italic',
                                                    color: 'text.secondary',
                                                    mb: 2
                                                }}
                                            >
                                                {children}
                                            </Box>
                                        ),
                                        code: ({ children }) => (
                                            <Box
                                                component="code"
                                                sx={{
                                                    backgroundColor: 'grey.200',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 0.5,
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {children}
                                            </Box>
                                        ),
                                        pre: ({ children }) => (
                                            <Box
                                                component="pre"
                                                sx={{
                                                    backgroundColor: 'grey.100',
                                                    p: 2,
                                                    borderRadius: 1,
                                                    overflow: 'auto',
                                                    mb: 2
                                                }}
                                            >
                                                {children}
                                            </Box>
                                        )
                                    }}
                                >
                                    {entity.ai_reasoning}
                                </ReactMarkdown>
                            </Paper>
                        </Box>
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default AgentResponseScreen;
