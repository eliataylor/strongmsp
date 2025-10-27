import {
    Alert,
    Box,
    Card,
    CardContent,
    Container,
    Grid2 as Grid,
    MenuItem,
    Paper,
    Select,
    Toolbar,
    Typography
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useUser } from 'src/allauth/auth';
import ProgramProgressStepper from 'src/components/ProgramProgressStepper';
import ProgramProgressStepperCoach from 'src/components/ProgramProgressStepperCoach';
import SpiderChart from 'src/components/SpiderChart';
import AutoPaginatingList from '../components/AutoPaginatingList';
import PaymentAssignmentCard from '../components/PaymentAssignmentCard';
import { AthletePaymentAssignment, PaginatedResponse } from '../object-actions/types/types';

const Dashboard: React.FC = () => {
    const [athletes, setAthletes] = useState<AthletePaymentAssignment[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(10);
    const [preAssessmentFilter, setPreAssessmentFilter] = useState<string>('all');
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
        return `/api/athlete-assignments?${params.toString()}`;
    }, [limit, offset, preAssessmentFilter]);

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
    }, [limit, preAssessmentFilter]);

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

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Box p={2}>
            {/* Toolbar with filters */}
            <Paper sx={{ mb: 2 }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Athlete Assignments
                    </Typography>
                    <Select
                        value={preAssessmentFilter}
                        onChange={(e) => setPreAssessmentFilter(e.target.value)}
                        size="small"
                        sx={{ minWidth: 200 }}
                    >
                        <MenuItem value="all">All Assessments</MenuItem>
                        <MenuItem value="submitted">Pre-Assessment Submitted</MenuItem>
                        <MenuItem value="not_submitted">Pre-Assessment Not Submitted</MenuItem>
                    </Select>
                </Toolbar>
            </Paper>

            {/* Auto-paginating athlete list */}
            <AutoPaginatingList
                basePath={buildApiPath()}
                count={totalCount}
                limit={limit}
                offset={offset}
                onSuccess={handleSuccess}
                onError={handleError}
            >
                <Box sx={{ mb: 3 }}>
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
                            <Paper elevation={3} sx={{ mb: 4, p: 2 }} key={athleteAssignment.athlete_id}>
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
                                {athleteAssignment.my_roles.includes('coach') ? (
                                    <ProgramProgressStepperCoach assignment={athleteAssignment} key={index} />
                                ) :
                                    <ProgramProgressStepper assignment={athleteAssignment} key={index} />}
                            </Paper>
                        ))
                    )}
                </Box>
            </AutoPaginatingList>
        </Box>
    );
};

export default Dashboard;
