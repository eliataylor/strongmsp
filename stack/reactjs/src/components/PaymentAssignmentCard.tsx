import {
    Box,
    Button,
    Card,
    CardHeader,
    Divider,
    Typography
} from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';
import RelEntityHead from 'src/object-actions/components/RelEntityHead';
import { useAppContext } from '../context/AppContext';
import { RelEntity, UserPaymentAssignment } from '../object-actions/types/types';
import AssignmentActions from './AssignmentActions';

interface PaymentAssignmentCardProps {
    assignment: UserPaymentAssignment;
}

const PaymentAssignmentCard: React.FC<PaymentAssignmentCardProps> = ({ assignment }) => {
    const { refresh } = useAppContext();

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'No expiration';
        return new Date(dateString).toLocaleDateString();
    };

    const handleUpdate = () => {
        refresh();
    };

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
                action={
                    <AssignmentActions
                        assignment={assignment}
                        onUpdate={handleUpdate}
                    />
                }
                title="Payment Assignment"
                subheader={`ID: ${assignment.id}`}
            />

            <Box sx={{ padding: 2, flexGrow: 1 }}>

                <Box mb={2}>
                    <RelEntityHead rel={assignment.athlete as RelEntity<'Users'>} label="Athlete" />
                </Box>

                {assignment.parents.length > 0 && (
                    assignment.parents.map((coach) => (
                        <Box mb={2} key={coach.id}>
                            <RelEntityHead rel={coach as RelEntity<'Users'>} label="Parent" />
                        </Box>
                    ))
                )}


                {assignment.coaches.length > 0 && (
                    assignment.coaches.map((coach) => (
                        <Box mb={2} key={coach.id}>
                            <RelEntityHead rel={coach as RelEntity<'Users'>} label="Coach" />
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
                    {assignment.pre_assessment && !assignment.pre_assessment_submitted && (
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
                    {assignment.post_assessment && !assignment.post_assessment_submitted && (
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
            </Box>
        </Card>
    );
};

export default PaymentAssignmentCard;
