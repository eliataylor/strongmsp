import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    Typography
} from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';
import { UserPaymentAssignment } from '../object-actions/types/types';

interface PaymentAssignmentCardProps {
    assignment: UserPaymentAssignment;
}

const PaymentAssignmentCard: React.FC<PaymentAssignmentCardProps> = ({ assignment }) => {
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'athlete': return 'primary';
            case 'coach': return 'secondary';
            case 'parent': return 'success';
            default: return 'default';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'athlete': return 'Athlete';
            case 'coach': return 'Coach';
            case 'parent': return 'Parent';
            default: return 'Unknown';
        }
    };

    const getUserDisplayName = () => {
        if (assignment.user_role === 'athlete' && assignment.athlete) {
            return assignment.athlete.str;
        }
        if (assignment.user_role === 'coach' && assignment.coaches.length > 0) {
            return assignment.coaches[0].str;
        }
        if (assignment.user_role === 'parent' && assignment.parents.length > 0) {
            return assignment.parents[0].str;
        }
        return 'Unknown User';
    };

    const getUserAvatar = () => {
        if (assignment.user_role === 'athlete' && assignment.athlete?.img) {
            return assignment.athlete.img;
        }
        if (assignment.user_role === 'coach' && assignment.coaches.length > 0 && assignment.coaches[0].img) {
            return assignment.coaches[0].img;
        }
        if (assignment.user_role === 'parent' && assignment.parents.length > 0 && assignment.parents[0].img) {
            return assignment.parents[0].img;
        }
        return null;
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'No expiration';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
                avatar={
                    <Avatar
                        src={getUserAvatar() || undefined}
                        sx={{ bgcolor: 'primary.main' }}
                    >
                        {getInitials(getUserDisplayName())}
                    </Avatar>
                }
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" component="div">
                            {getUserDisplayName()}
                        </Typography>
                        <Chip
                            label={getRoleLabel(assignment.user_role || '')}
                            color={getRoleColor(assignment.user_role || '')}
                            size="small"
                        />
                    </Box>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary">
                        {assignment.payment.product?.str || 'Unknown Product'}
                    </Typography>
                }
            />
            <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Subscription ends: {formatDate(assignment.payment.subscription_ends || null)}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status: {assignment.payment.status}
                </Typography>

                {(assignment.pre_assessment || assignment.post_assessment) && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Available Assessments:
                        </Typography>
                        <List dense>
                            {assignment.pre_assessment && (
                                <ListItem disablePadding>
                                    <ListItemText
                                        primary="Pre-Assessment"
                                        secondary={assignment.pre_assessment.str}
                                    />
                                </ListItem>
                            )}
                            {assignment.post_assessment && (
                                <ListItem disablePadding>
                                    <ListItemText
                                        primary="Post-Assessment"
                                        secondary={assignment.post_assessment.str}
                                    />
                                </ListItem>
                            )}
                        </List>
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {assignment.pre_assessment && (
                        <Button
                            component={Link}
                            to={`/assessments/${assignment.pre_assessment.id}`}
                            variant="contained"
                            size="small"
                            fullWidth
                        >
                            Start Pre-Assessment
                        </Button>
                    )}
                    {assignment.post_assessment && (
                        <Button
                            component={Link}
                            to={`/assessments/${assignment.post_assessment.id}`}
                            variant="outlined"
                            size="small"
                            fullWidth
                        >
                            Start Post-Assessment
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default PaymentAssignmentCard;
