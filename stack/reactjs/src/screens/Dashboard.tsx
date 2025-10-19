import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Grid,
    Pagination,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

    return (
        <Box p={2}>
            {/* Payment Assignments Section */}
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
                    <Grid container spacing={3}>
                        {paymentAssignments.map((assignment) => (
                            <Grid item xs={12} md={6} lg={4} key={assignment.id}>
                                <PaymentAssignmentCard assignment={assignment} />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Program Progress Stepper Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                    Program Progress
                </Typography>
                <Card>
                    <CardContent>
                        <Stepper orientation="vertical">
                            <Step>
                                <StepLabel>Pre Assessment</StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Complete the initial assessment to evaluate current performance levels and identify areas for improvement.
                                    </Typography>
                                </StepContent>
                            </Step>
                            <Step>
                                <StepLabel>Feedback Report</StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Review detailed feedback and recommendations based on your assessment results.
                                    </Typography>
                                </StepContent>
                            </Step>
                            <Step>
                                <StepLabel>Family Conversation</StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Engage in meaningful discussions with family members about goals and expectations.
                                    </Typography>
                                </StepContent>
                            </Step>
                            <Step>
                                <StepLabel>12 Session Curriculum</StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Follow the structured 12-session program designed to enhance mental performance and resilience.
                                    </Typography>
                                </StepContent>
                            </Step>

                            <Step>
                                <StepLabel>Lesson Plan</StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Access detailed lesson plans and resources for each session to maximize your learning experience.
                                    </Typography>
                                </StepContent>
                            </Step>

                            <Step>
                                <StepLabel>Post Assessment</StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Post Assessment to evaluate the progress and effectiveness of the program.
                                    </Typography>
                                </StepContent>
                            </Step>
                        </Stepper>
                    </CardContent>
                </Card>
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
                                <Grid item xs={12} sm={6} key={notification.id}>
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
