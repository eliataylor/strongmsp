import { AddAlert } from '@mui/icons-material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Card,
    CardContent,
    CardHeader,
    Container,
    Grid2 as Grid,
    MenuItem,
    TextField,
    Toolbar,
    Typography
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from 'src/allauth/auth';
import ProgramProgressStepper from 'src/components/ProgramProgressStepper';
import ProgramProgressStepperCoach from 'src/components/ProgramProgressStepperCoach';
import SpiderChart from 'src/components/SpiderChart';
import { FadedPaper } from 'src/theme/StyledFields';
import { timeAgo } from 'src/utils';
import AutoPaginatingList from '../components/AutoPaginatingList';
import PaymentAssignmentCard from '../components/PaymentAssignmentCard';
import { AthletePaymentAssignment, PaginatedResponse, PurposeNames } from '../object-actions/types/types';
import { getCoachContentForPurpose, getContentStage } from "../utils/assignmentPermissions";

const Dashboard: React.FC = () => {
    const [athletes, setAthletes] = useState<AthletePaymentAssignment[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(10);
    const [preAssessmentFilter, setPreAssessmentFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('default');
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const user = useUser();

    const buildApiPath = useCallback(() => {
        const params = new URLSearchParams();
        if (limit > 0) params.set('limit', limit.toString());
        if (offset > 0) params.set('offset', offset.toString());
        if (preAssessmentFilter === 'submitted') {
            params.set('pre_assessment_submitted', 'true');
        } else if (preAssessmentFilter === 'not_submitted') {
            params.set('pre_assessment_submitted', 'false');
        }
        if (sortBy !== 'default') {
            params.set('sort_by', sortBy);
        }
        return `/api/athlete-assignments?${params.toString()}`;
    }, [limit, offset, preAssessmentFilter, sortBy]);

    const handleSuccess = (data: PaginatedResponse<AthletePaymentAssignment>) => {
        if (data && data.results) {
            setAthletes(prev => [...prev, ...(data.results as AthletePaymentAssignment[])]);
            setTotalCount(data.count);
        }
        setLoading(false);
    };

    const handleError = (error: string) => {
        setError(error);
        setLoading(false);
    };

    useEffect(() => {
        // Reset athletes when filters change
        setAthletes([]);
        setOffset(0);
        setError(null);
        setLoading(true);
    }, [limit, preAssessmentFilter, sortBy]);

    function structureSpiderData(entity: any) {
        if (!entity) return [];

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
            if (entity[field_name]) {
                const score = entity[field_name]
                const numScore = typeof score === 'number' ? score : (typeof score === 'string' ? parseFloat(score) : 0);
                const category = field_name.replace('category_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (!isNaN(numScore)) {
                    spiderData.push({
                        category: category,
                        average_response: numScore,
                        response_count: staticResponseCounts[category],
                        total_response: numScore * staticResponseCounts[category]
                    });
                }
            }
        }

        return spiderData;
    }

    function renderSummary(assignment: AthletePaymentAssignment) {
        const { content_progress } = assignment;
        if (!content_progress) return null;

        const purposes = [
            { key: 'feedback_report', label: 'Feedback Report' }
        ];

        if (assignment.my_roles.includes('coach')) {
            purposes.push({ key: 'talking_points', label: 'Talking Points' });
            purposes.push({ key: 'scheduling_email', label: 'Scheduling Email' });
        }
        purposes.push({ key: 'curriculum', label: 'Curriculum' });

        // TODO: if purchased lesson_plans
        purposes.push({ key: 'lesson_plan', label: 'Lesson Plan' });

        const docs: React.ReactNode[] = [];

        if (assignment.pre_assessment_submitted_at) {
            docs.push(
                <Box key="pre_assessment" display="flex" alignItems="center" gap={0.5}>
                    <CheckCircleOutline color="secondary" sx={{ fontSize: 16 }} />
                    <Typography component="span">Pre-Assessment Submitted</Typography>
                </Box>
            );
        }

        purposes.forEach(({ key, label }) => {
            const items = getCoachContentForPurpose(assignment, key as keyof typeof PurposeNames);
            if (items && Array.isArray(items) && items.length > 0) {
                const status = getContentStage(assignment, items[0]).toLowerCase();
                const segment = items[0]._type === 'CoachContent' ? 'coach-content' : 'agent-responses';
                docs.push(
                    <Box key={key} display="flex" alignItems="center" gap={0.5}>
                        <CheckCircleOutline color="secondary" sx={{ fontSize: 16 }} />
                        <Typography component="span">
                            <Link to={`/${segment}/${items[0].id}`}>{label}</Link> <small>{status}</small></Typography>
                    </Box>
                );
            }
        });

        if (assignment.post_assessment_submitted_at) {
            docs.push(
                <Box key="post_assessment" display="flex" alignItems="center" gap={0.5}>
                    <CheckCircleOutline color="secondary" sx={{ fontSize: 16 }} />
                    <Typography component="span">Post-Assessments Submitted</Typography>
                </Box>
            );
        }

        /* 
        if (assignment.athlete.entity?.category_total_score) {
            const allCats = ['category_performance_mindset', 'category_emotional_regulation', 'category_confidence', 'category_resilience_motivation', 'category_concentration', 'category_leadership', 'category_mental_wellbeing'];
            allCats.forEach(cat => {
                if (assignment.athlete.entity?.[cat as keyof Users]) {
                    const label = cat.replace('category_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    docs.push(
                        <Chip key="categories"
                            avatar={<span>{assignment.athlete.entity?.[cat as keyof Users]}</span>}
                            label={label} color="primary" size="small" />
                    );
                }
            });
        }
        */

        if (docs.length === 0) {
            if (assignment.athlete_id == user.id) {
                docs.push(
                    <Button
                        sx={{ mt: 1 }}
                        variant="contained"
                        color="secondary"
                        size="small"
                        component={Link}
                        to={`/assessments/${assignment.pre_assessment?.id}`}
                    >
                        Take Assessment
                    </Button>
                );
            } else {
                docs.push(
                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                        <AddAlert color="error" sx={{ fontSize: 15 }} />
                        Awaiting Assessment submission
                    </Typography>
                );
            }
        }

        return (
            <CardHeader sx={{ mb: 1, p: 1, backgroundColor: 'background.default' }}
                title={
                    <React.Fragment>
                        {assignment.athlete.str}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {docs.length > 0 ? 'Last update: ' : 'Assigned: '}
                            {timeAgo(assignment.last_update_at)}
                        </Typography>
                    </React.Fragment>
                }
                subheader={
                    <Box display="flex" flexWrap="wrap" gap={2} mt={1} alignItems="center">
                        {docs}
                    </Box>
                }
            />
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    function renderAthleteAssignment(forceDetail: boolean = false) {
        return <Box sx={{ mb: 3, maxWidth: 1200, mx: 'auto' }}>
            {athletes.length === 0 ? (
                <Card>
                    <CardContent>
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                            No payment assignments found.
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                athletes.map((athleteAssignment, index) => (
                    viewMode === 'detail' || forceDetail ? (
                        <FadedPaper elevation={0} sx={{ mb: 4, p: 2 }} key={athleteAssignment.athlete_id}>
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <PaymentAssignmentCard assignment={athleteAssignment} />
                                </Grid>
                                {athleteAssignment.athlete.entity && athleteAssignment.athlete.entity?.category_leadership && (
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <SpiderChart data={structureSpiderData(athleteAssignment.athlete.entity)} height={250} showLegend={false} />
                                    </Grid>
                                )}
                            </Grid>
                            <Typography variant="h5" component="h2" sx={{ mt: 3, mb: 1 }}>
                                {athleteAssignment.athlete.id == user.id ? 'My Progress' : 'Program Progress: ' + athleteAssignment.athlete.str}
                            </Typography>
                            {athleteAssignment.my_roles.includes('coach') ?
                                <ProgramProgressStepperCoach assignment={athleteAssignment} key={index} />
                                :
                                <ProgramProgressStepper assignment={athleteAssignment} key={index} />}
                        </FadedPaper>
                    ) : (
                        renderSummary(athleteAssignment)
                    )
                ))
            )}
        </Box>
    }

    if (athletes.length === 1 && offset === 0 && preAssessmentFilter === 'all') { // no toolbar
        return <Box p={2}>{renderAthleteAssignment(true)}</Box>;
    }

    return (
        <Box p={2}>
            {/* Toolbar with filters */}
            <FadedPaper sx={{ mb: 2 }}>
                <Toolbar sx={{ flexWrap: 'wrap', gap: 1, p: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Athlete Assignments ({totalCount})
                    </Typography>
                    <ButtonGroup sx={{ mr: 2 }} color="secondary">
                        <Button
                            variant={viewMode === 'list' ? 'contained' : 'outlined'}
                            onClick={() => setViewMode('list')}
                        >
                            List
                        </Button>
                        <Button
                            variant={viewMode === 'detail' ? 'contained' : 'outlined'}
                            onClick={() => setViewMode('detail')}
                        >
                            Detail
                        </Button>
                    </ButtonGroup>
                    <TextField
                        select
                        label="Filter By"
                        value={preAssessmentFilter}
                        onChange={(e) => setPreAssessmentFilter(e.target.value)}
                        size="small"
                        sx={{ minWidth: 200, mr: 2 }}
                    >
                        <MenuItem value="all">All Assessments</MenuItem>
                        <MenuItem value="submitted">Pre-Assessment Submitted</MenuItem>
                        <MenuItem value="not_submitted">Pre-Assessment Not Submitted</MenuItem>
                    </TextField>
                    <TextField
                        select
                        label="Sort By"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        size="small"
                        sx={{ minWidth: 200 }}
                    >
                        <MenuItem value="default">Default</MenuItem>
                        <MenuItem value="newest">Newest</MenuItem>
                        <MenuItem value="oldest">Oldest</MenuItem>
                        <MenuItem value="most_confident">Most Confident</MenuItem>
                        <MenuItem value="least_confident">Least Confident</MenuItem>
                    </TextField>
                </Toolbar>
            </FadedPaper>

            {/* Auto-paginating athlete list */}
            <AutoPaginatingList
                basePath={buildApiPath()}
                count={totalCount}
                limit={limit}
                offset={offset}
                onSuccess={handleSuccess}
                onError={handleError}
            >
                {renderAthleteAssignment()}
            </AutoPaginatingList>
        </Box>
    );
};

export default Dashboard;
