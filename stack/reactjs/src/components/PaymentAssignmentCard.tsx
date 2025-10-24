import {
    Box,
    Typography
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import React from 'react';
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
        <Grid container spacing={2}>
            <Grid size={12} mb={2}>
                <RelEntityHead rel={assignment.athlete} label="Athlete" />
            </Grid>

            {/* Parents */}
            {assignment.parents.length > 0 && (
                <Grid container size={12} mb={2}>
                    {assignment.parents.map((parent) => (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} mb={1} key={parent.id}>
                            <RelEntityHead rel={parent as RelEntity<'Users'>} label="Parent" />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Coaches */}
            {assignment.coaches.length > 0 && (
                <Grid container size={12} mb={2}>
                    {assignment.coaches.map((coach) => (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} mb={1} key={coach.id}>
                            <RelEntityHead rel={coach as RelEntity<'Users'>} label="Coach" />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Payers */}
            {assignment.payers.length > 0 && (
                <Grid container size={12} mb={2}>
                    {assignment.payers.map((payer) => (
                        <Grid mb={1} key={payer.id}>
                            <RelEntityHead rel={payer as RelEntity<'Users'>} label="Payer" />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Payment Info */}
            {assignment.payments.length > 0 && (
                <Grid size={12} >
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
                </Grid>
            )}
        </Grid>
    );
};

export default PaymentAssignmentCard;
