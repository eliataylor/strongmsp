import {
    Box,
    Button,
    Card,
    Divider,
    Typography
} from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';
import RelEntityHead from 'src/object-actions/components/RelEntityHead';
import { RelEntity, UserPaymentAssignment } from '../object-actions/types/types';

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
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 2 }}>

            <Box mb={2}>
                <RelEntityHead rel={assignment.athlete as RelEntity<'Users'>} label="Athlete" />
            </Box>

            {assignment.coaches.length > 0 && (
                assignment.coaches.map((coach) => (
                    <Box mb={2} key={coach.id}>
                        <RelEntityHead rel={coach as RelEntity<'Users'>} label="Coach" />
                    </Box>
                ))
            )}

            {assignment.parents.length > 0 && (
                assignment.parents.map((coach) => (
                    <Box mb={2} key={coach.id}>
                        <RelEntityHead rel={coach as RelEntity<'Users'>} label="Parent" />
                    </Box>
                ))
            )}


            <Typography variant="body2" color="text.secondary" gutterBottom>
                Expiration: {formatDate(assignment.payment.subscription_ends || null)}
            </Typography>

            {assignment.payment.status !== 'succeeded' && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status: {assignment.payment.status}
                </Typography>
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
        </Card>
    );
};

export default PaymentAssignmentCard;
