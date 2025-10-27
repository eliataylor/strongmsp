import { Notifications as NotificationsIcon } from '@mui/icons-material';
import {
    Badge,
    Box,
    Dialog,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Typography
} from '@mui/material';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import React, { useEffect, useState } from 'react';
import ApiClient, { HttpResponse } from '../config/ApiClient';
import { ApiListResponse, Notifications } from '../object-actions/types/types';

const NotificationButton: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notifications[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);

        try {
            const response: HttpResponse<ApiListResponse<'Notifications'>> = await ApiClient.get(
                `/api/notifications/dashboard/?offset=0&limit=50`
            );

            if (response.success && response.data) {
                setNotifications(response.data.results || []);
                const unread = (response.data.results || []).filter(n => !n.seen).length;
                setUnreadCount(unread);
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
        if (open) {
            fetchNotifications();
        }
    }, [open]);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleMarkSeen = async (notificationId: number) => {
        try {
            const response = await ApiClient.post(`/api/notifications/${notificationId}/mark_seen/`, {});

            if (response.success) {
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, seen: true }
                            : notification
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error marking notification as seen:', err);
        }
    };

    return (
        <>
            <IconButton color="inherit" onClick={handleOpen}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Notifications</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {unreadCount} unread
                        </Typography>
                    </Box>
                </DialogTitle>

                <Box sx={{ minHeight: 200, maxHeight: 500, overflow: 'auto', p: 2 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : notifications.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                            No notifications found.
                        </Typography>
                    ) : (
                        <List>
                            {notifications.map((notification) => (
                                <ListItem
                                    key={notification.id}
                                    onClick={() => !notification.seen && handleMarkSeen(Number(notification.id))}
                                    sx={{
                                        backgroundColor: notification.seen ? 'transparent' : 'action.hover',
                                        '&:hover': {
                                            backgroundColor: 'action.selected'
                                        },
                                        cursor: notification.seen ? 'default' : 'pointer'
                                    }}
                                >
                                    <ListItemText
                                        primary={notification.message}
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(notification.created_at).toLocaleString()}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </Dialog>
        </>
    );
};

export default NotificationButton;

