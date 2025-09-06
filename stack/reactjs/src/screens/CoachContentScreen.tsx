import {
    Box,
    Container,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import DOMPurify from 'dompurify';
import React, { useEffect, useState } from 'react';
import { CoachContent } from '../object-actions/types/types';

interface CoachContentScreenProps {
    entity: CoachContent;
}

const CoachContentScreen: React.FC<CoachContentScreenProps> = ({
    entity
}) => {
    const theme = useTheme();
    const [sanitizedDescription, setSanitizedDescription] = useState<string>('');

    useEffect(() => {
        if (entity.body) {
            // Sanitize the HTML content using DOMPurify
            const clean = DOMPurify.sanitize(entity.body, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote'],
                ALLOWED_ATTR: ['href', 'target', 'rel']
            });
            setSanitizedDescription(clean);
        }
    }, [entity.body]);

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
                        {entity.title}
                    </Typography>
                </Box>

                {/* Content Body */}
                <Box sx={{ mb: 4 }}>
                    {sanitizedDescription && (
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{
                                lineHeight: 1.8,
                                fontSize: '1.1rem',
                                '& p': { margin: 0 },
                                '& p + p': { marginTop: 2 },
                                '& h1, & h2, & h3, & h4, & h5, & h6': {
                                    marginTop: 3,
                                    marginBottom: 2,
                                    fontWeight: 'bold'
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
                                    color: 'primary.main',
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
                                    color: 'text.secondary'
                                }
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                        />
                    )}

                    {!sanitizedDescription && (
                        <Typography variant="body1" color="text.secondary">
                            No content available at this time.
                        </Typography>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default CoachContentScreen;
