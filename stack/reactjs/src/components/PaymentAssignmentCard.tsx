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
import { AthletePaymentAssignment, RelEntity } from '../object-actions/types/types';

interface PaymentAssignmentCardProps {
    assignment: AthletePaymentAssignment;
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

    // We'll render all payments below

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
                title={`${assignment.athlete.str} - ${assignment.assignments.length} Assignment(s)`}
            />

            <Box sx={{ padding: 2, flexGrow: 1 }}>
                {/* Athlete Info */}
                <Box mb={2}>
                    <RelEntityHead rel={assignment.athlete} label="Athlete" />
                </Box>

                {/* Parents */}
                {assignment.parents.length > 0 && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Parents:</Typography>
                        {assignment.parents.map((parent) => (
                            <Box mb={1} key={parent.id}>
                                <RelEntityHead rel={parent as RelEntity<'Users'>} label="Parent" />
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Coaches */}
                {assignment.coaches.length > 0 && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Coaches:</Typography>
                        {assignment.coaches.map((coach) => (
                            <Box mb={1} key={coach.id}>
                                <RelEntityHead rel={coach as RelEntity<'Users'>} label="Coach" />
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Payers */}
                {assignment.payers.length > 0 && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Payers:</Typography>
                        {assignment.payers.map((payer) => (
                            <Box mb={1} key={payer.id}>
                                <RelEntityHead rel={payer as RelEntity<'Users'>} label="Payer" />
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Payment Info */}
                {assignment.payments.length > 0 && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Payments:</Typography>
                        {assignment.payments.map((payment, index) => (
                            <Box key={payment.id} mb={1} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Payment #{index + 1}: {payment.product.str}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Status: {payment.status}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Expiration: {formatDate(payment.subscription_ends)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Assessment Actions */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {assignment.pre_assessment && !assignment.pre_assessment_submitted_at && (
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
                    {assignment.post_assessment && !assignment.post_assessment_submitted_at && (
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

                {/* Progress Tracking */}
                <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>Progress:</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Pre-Assessment: {assignment.pre_assessment_submitted_at ? 'Completed' : 'Pending'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Post-Assessment: {assignment.post_assessment_submitted_at ? 'Completed' : 'Pending'}
                    </Typography>
                </Box>
            </Box>
        </Card>
    );
};

export default PaymentAssignmentCard;
