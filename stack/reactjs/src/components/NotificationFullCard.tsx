import {
    Notifications as NotificationIcon,
    OpenInNew,
    Visibility
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Typography
} from '@mui/material';
import React from 'react';
import { Notifications } from '../object-actions/types/types';
import {
    formatFullDate,
    getDeliveryStatusColor,
    getPriorityColor,
    getPriorityLabel
} from '../utils/notificationUtils';

interface NotificationFullCardProps {
    notification: Notifications;
    onMarkSeen: (id: number) => void;
}

const NotificationFullCard: React.FC<NotificationFullCardProps> = ({
    notification,
    onMarkSeen
}) => {

    const handleLinkClick = () => {
        if (notification.link) {
            window.open(notification.link, '_blank');
        }
    };

    const handleMarkSeen = () => {
        onMarkSeen(Number(notification.id));
    };

    return (
        <Card
            sx={{
                mb: 2,
                opacity: notification.seen ? 0.8 : 1,
                border: notification.seen ? '1px solid #e0e0e0' : '1px solid #1976d2',
                transition: 'all 0.2s'
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <NotificationIcon
                        color={notification.seen ? 'disabled' : 'primary'}
                        sx={{ mt: 0.5 }}
                    />

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            <Chip
                                label={getPriorityLabel(notification.priority)}
                                color={getPriorityColor(notification.priority)}
                                size="small"
                            />
                            <Chip
                                label={notification.delivery_status}
                                color={getDeliveryStatusColor(notification.delivery_status)}
                                variant="outlined"
                                size="small"
                            />
                            {notification.notification_type && (
                                <Chip
                                    label={notification.notification_type}
                                    color="default"
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                            {!notification.seen && (
                                <Chip
                                    label="Unread"
                                    color="primary"
                                    variant="filled"
                                    size="small"
                                />
                            )}
                        </Box>

                        <Typography
                            variant="body1"
                            sx={{
                                mb: 2,
                                fontWeight: notification.seen ? 'normal' : 'medium',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {notification.message}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                Created: {formatFullDate(notification.created_at)}
                            </Typography>
                            {notification.sent_at && (
                                <Typography variant="caption" color="text.secondary">
                                    Sent: {formatFullDate(notification.sent_at)}
                                </Typography>
                            )}
                        </Box>

                        {notification.link && (
                            <Box sx={{ mb: 2 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<OpenInNew />}
                                    onClick={handleLinkClick}
                                    size="small"
                                >
                                    Open Link
                                </Button>
                            </Box>
                        )}

                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                                Channel: {notification.channel}
                            </Typography>

                            {!notification.seen && (
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<Visibility />}
                                    onClick={handleMarkSeen}
                                >
                                    Mark as Seen
                                </Button>
                            )}
                        </Box>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default NotificationFullCard;
