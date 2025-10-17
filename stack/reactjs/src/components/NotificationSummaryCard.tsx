import {
    Notifications as NotificationIcon,
    VisibilityOff
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    IconButton,
    Typography
} from '@mui/material';
import React from 'react';
import { Notifications } from '../object-actions/types/types';
import {
    formatRelativeTime,
    getPriorityColor,
    getPriorityLabel,
    truncateMessage
} from '../utils/notificationUtils';

interface NotificationSummaryCardProps {
    notification: Notifications;
    onMarkSeen: (id: number) => void;
}

const NotificationSummaryCard: React.FC<NotificationSummaryCardProps> = ({
    notification,
    onMarkSeen
}) => {

    const handleCardClick = () => {
        if (notification.link) {
            window.open(notification.link, '_blank');
        }
    };

    const handleMarkSeen = (e: React.MouseEvent) => {
        e.stopPropagation();
        onMarkSeen(Number(notification.id));
    };

    return (
        <Card
            sx={{
                cursor: notification.link ? 'pointer' : 'default',
                opacity: notification.seen ? 0.7 : 1,
                transition: 'opacity 0.2s',
                '&:hover': {
                    opacity: 1,
                    boxShadow: notification.link ? 2 : 1
                }
            }}
            onClick={handleCardClick}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <NotificationIcon
                        color={notification.seen ? 'disabled' : 'primary'}
                        sx={{ mt: 0.5 }}
                    />

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip
                                label={getPriorityLabel(notification.priority)}
                                color={getPriorityColor(notification.priority)}
                                size="small"
                            />
                            {!notification.seen && (
                                <Chip
                                    label="Unread"
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                        </Box>

                        <Typography
                            variant="body2"
                            sx={{
                                mb: 1,
                                fontWeight: notification.seen ? 'normal' : 'medium'
                            }}
                        >
                            {truncateMessage(notification.message)}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(notification.created_at)}
                        </Typography>
                    </Box>

                    {!notification.seen && (
                        <IconButton
                            size="small"
                            onClick={handleMarkSeen}
                            sx={{
                                ml: 'auto',
                                opacity: 0.7,
                                '&:hover': { opacity: 1 }
                            }}
                        >
                            <VisibilityOff fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default NotificationSummaryCard;
