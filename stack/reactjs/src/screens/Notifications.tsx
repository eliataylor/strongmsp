import {
    Alert,
    Box,
    Card,
    CardContent,
    CircularProgress,
    Container,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Pagination,
    Select,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import NotificationFullCard from '../components/NotificationFullCard';
import ApiClient from '../config/ApiClient';
import { ApiListResponse, Notifications } from '../object-actions/types/types';


const NotificationsScreen: React.FC = () => {
    const [notifications, setNotifications] = useState<Notifications[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [seenFilter, setSeenFilter] = useState<string>('all');
    const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
    const notificationsPerPage = 10;

    const fetchNotifications = async (pageNum: number = 1) => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                channel: 'dashboard',
                offset: ((pageNum - 1) * notificationsPerPage).toString(),
                limit: notificationsPerPage.toString()
            });

            if (seenFilter !== 'all') {
                params.set('seen', seenFilter);
            }

            if (deliveryStatusFilter !== 'all') {
                params.set('delivery_status', deliveryStatusFilter);
            }

            const response = await ApiClient.get(`/api/notifications/?${params.toString()}`);

            if (response.success && response.data) {
                const data = response.data as ApiListResponse<'Notifications'>;
                setNotifications(data.results || []);
                setTotal(data.count || 0);
            } else {
                setError(response.error || 'Failed to load notifications');
            }
        } catch (err) {
            setError('Failed to load notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(page);
    }, [page, seenFilter, deliveryStatusFilter]);

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

    const handlePageChange = (event: React.ChangeEvent<unknown>, pageNum: number) => {
        setPage(pageNum);
    };

    const handleSeenFilterChange = (event: any) => {
        setSeenFilter(event.target.value);
        setPage(1); // Reset to first page when filter changes
    };

    const handleDeliveryStatusFilterChange = (event: any) => {
        setDeliveryStatusFilter(event.target.value);
        setPage(1); // Reset to first page when filter changes
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
                Notifications
            </Typography>

            {/* Filters */}
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Filters
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Seen Status</InputLabel>
                                <Select
                                    value={seenFilter}
                                    label="Seen Status"
                                    onChange={handleSeenFilterChange}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="true">Seen</MenuItem>
                                    <MenuItem value="false">Unseen</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Delivery Status</InputLabel>
                                <Select
                                    value={deliveryStatusFilter}
                                    label="Delivery Status"
                                    onChange={handleDeliveryStatusFilterChange}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="sent">Sent</MenuItem>
                                    <MenuItem value="delivered">Delivered</MenuItem>
                                    <MenuItem value="failed">Failed</MenuItem>
                                    <MenuItem value="bounced">Bounced</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Notifications List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : notifications.length === 0 ? (
                <Card>
                    <CardContent>
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                            No notifications found matching your filters.
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Showing {notifications.length} of {total} notifications
                        </Typography>
                    </Box>

                    {notifications.map((notification) => (
                        <NotificationFullCard
                            key={notification.id}
                            notification={notification}
                            onMarkSeen={handleMarkNotificationSeen}
                        />
                    ))}

                    {total > notificationsPerPage && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={Math.ceil(total / notificationsPerPage)}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}
        </Container>
    );
};

export default NotificationsScreen;
