import Grid from '@mui/material/Grid2';
import React from 'react';
import RelEntityHead from 'src/object-actions/components/RelEntityHead';
import { AthletePaymentAssignment, RelEntity } from '../object-actions/types/types';

interface PaymentAssignmentCardProps {
    assignment: AthletePaymentAssignment;
}

const PaymentAssignmentCard: React.FC<PaymentAssignmentCardProps> = ({ assignment }) => {

    return (
        <Grid container spacing={2}>
            <Grid size={12} >
                <RelEntityHead rel={assignment.athlete} label="Athlete" titleVariant="h5" />
            </Grid>

            {/* Parents */}
            {assignment.parents.length > 0 && (
                <Grid container justifyContent="flex-start" >
                    {assignment.parents.map((parent) => (
                        <Grid key={parent.id}>
                            <RelEntityHead rel={parent as RelEntity<'Users'>} label="Parent" />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Coaches */}
            {assignment.coaches.length > 0 && (
                <Grid container justifyContent="flex-start" >
                    {assignment.coaches.map((coach) => (
                        <Grid key={coach.id}>
                            <RelEntityHead rel={coach as RelEntity<'Users'>} label="Coach" />
                        </Grid>
                    ))}
                </Grid>
            )}


        </Grid>
    );
};

export default PaymentAssignmentCard;
