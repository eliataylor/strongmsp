import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Grid2 as Grid,
    Pagination,
    Paper,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from 'src/allauth/auth';
import ProgramProgressStepper from 'src/components/ProgramProgressStepper';
import ProgramProgressStepperCoach from 'src/components/ProgramProgressStepperCoach';
import SpiderChart from 'src/components/SpiderChart';
import NotificationSummaryCard from '../components/NotificationSummaryCard';
import PaymentAssignmentCard from '../components/PaymentAssignmentCard';
import ApiClient, { HttpResponse } from '../config/ApiClient';
import { useAppContext } from '../context/AppContext';
import { ApiListResponse, Notifications } from '../object-actions/types/types';

const Dashboard: React.FC = () => {
    const { paymentAssignments, loading: contextLoading, error: contextError } = useAppContext();
    const [notifications, setNotifications] = useState<Notifications[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsError, setNotificationsError] = useState<string | null>(null);
    const [notificationsPage, setNotificationsPage] = useState(1);
    const [notificationsTotal, setNotificationsTotal] = useState(0);
    const notificationsPerPage = 10;
    const user = useUser();

    const fetchNotifications = async (page = 1) => {
        setNotificationsLoading(true);
        setNotificationsError(null);

        try {
            const response: HttpResponse<ApiListResponse<'Notifications'>> = await ApiClient.get(
                `/api/notifications/dashboard/?offset=${(page - 1) * notificationsPerPage}&limit=${notificationsPerPage}`
            );

            if (response.success && response.data) {
                setNotifications(response.data.results || []);
                setNotificationsTotal(response.data.count || 0);
            } else {
                setNotificationsError(response.error || 'Failed to load notifications');
            }
        } catch (err) {
            setNotificationsError('Failed to load notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setNotificationsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(notificationsPage);
    }, [notificationsPage]);

    const handleMarkNotificationSeen = async (notificationId: number) => {
        try {
            const response = await ApiClient.post(`/api/notifications/${notificationId}/mark_seen/`, {});

            if (response.success) {
                // Update the notification in the local state
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, seen: true }
                            : notification
                    )
                );
            }
        } catch (err) {
            console.error('Error marking notification as seen:', err);
        }
    };

    const handleNotificationsPageChange = (event: React.ChangeEvent<unknown>, page: number) => {
        setNotificationsPage(page);
    };

    if (contextLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (contextError) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">{contextError}</Alert>
            </Container>
        );
    }

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

    return (
        <Box p={2}>
            <Box sx={{ mb: 3 }}>
                {paymentAssignments.length === 0 ? (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" textAlign="center">
                                No payment assignments found.
                            </Typography>
                        </CardContent>
                    </Card>
                ) : (
                    paymentAssignments.map((athleteAssignment, index) => (
                        <Paper elevation={3} sx={{ mb: 4, p: 2 }} key={athleteAssignment.athlete.id}>
                            <Grid container spacing={1} >
                                <Grid size={{ xs: 12, sm: 6 }} >
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

            {/* Notifications Section */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" component="h2">
                        Recent Notifications
                    </Typography>
                    <Button
                        component={Link}
                        to="/notifications"
                        variant="outlined"
                        size="small"
                    >
                        View All Notifications
                    </Button>
                </Box>

                {notificationsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : notificationsError ? (
                    <Alert severity="error">{notificationsError}</Alert>
                ) : notifications.length === 0 ? (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" textAlign="center">
                                No notifications found.
                            </Typography>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Grid container spacing={2}>
                            {notifications.map((notification) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={notification.id}>
                                    <NotificationSummaryCard
                                        notification={notification}
                                        onMarkSeen={handleMarkNotificationSeen}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                        {notificationsTotal > notificationsPerPage && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <Pagination
                                    count={Math.ceil(notificationsTotal / notificationsPerPage)}
                                    page={notificationsPage}
                                    onChange={handleNotificationsPageChange}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </>
                )}
            </Box>


        </Box>
    );
};

export default Dashboard;
