import {
    Box,
    Container,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useContext, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SpiderChart from '../components/SpiderChart';
import { useActiveRole } from '../context/ActiveRoleContext';
import { CoachContent } from '../object-actions/types/types';
import { ThemeContext } from '../theme/ThemeContext';
import { markAthleteReceived, markParentReceived } from '../utils/contentHelpers';

interface CoachContentReadOnlyViewProps {
    entity: CoachContent;
}

const CoachContentReadOnlyView: React.FC<CoachContentReadOnlyViewProps> = ({
    entity
}) => {
    const theme = useTheme();
    const { activeRole } = useActiveRole();
    const { brandingSettings } = useContext(ThemeContext);

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

    if (!entity || entity._type !== 'CoachContent') return null;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
                {/* Header */}
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="h3"
                            component="h1"
                            sx={{
                                fontWeight: 'bold',
                                color: 'secondary.main',
                                mb: 1
                            }}
                        >
                            {entity.title}
                        </Typography>
                        {entity.created_at && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: 'italic' }}
                            >
                                Created on {new Date(entity.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Typography>
                        )}
                    </Box>

                    {/* Screenshot in header */}
                    {(entity.screenshot_light || entity.screenshot_dark) && (
                        <Box sx={{ flexShrink: 0, maxWidth: 200 }}>
                            <Box
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    boxShadow: 2,
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    const screenshot = theme.palette.mode === 'dark'
                                        ? entity.screenshot_dark
                                        : entity.screenshot_light;
                                    if (screenshot) {
                                        window.open(screenshot, '_blank');
                                    }
                                }}
                            >
                                <img
                                    src={theme.palette.mode === 'dark' ? (entity.screenshot_dark || '') : (entity.screenshot_light || '')}
                                    alt={`${theme.palette.mode} theme screenshot`}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block'
                                    }}
                                />
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* SpiderChart Section */}
                {entity.athlete && (() => {
                    const spiderData = structureSpiderData(entity.athlete);
                    return spiderData.length > 0 && (
                        <SpiderChart
                            data={spiderData}
                            height={250}
                        />
                    );
                })()}

                {/* Content Body */}
                <Box sx={{ mb: 4 }}>
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

            </Paper>
        </Container>
    );
};

export default CoachContentReadOnlyView;
