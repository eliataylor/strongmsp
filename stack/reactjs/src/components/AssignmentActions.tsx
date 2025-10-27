import {
    Delete as DeleteIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Tooltip,
    Typography
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useState } from 'react';
import { useAuth } from '../allauth/auth';
import EditAssignmentDialog from '../components/EditAssignmentDialog';
import ApiClient from '../config/ApiClient';
import { AthletePaymentAssignment } from '../object-actions/types/types';
import {
    canEditAssignment,
    canRemoveCoach,
    canRemoveParent
} from '../utils/assignmentPermissions';

interface AssignmentActionsProps {
    assignment: AthletePaymentAssignment;
    onUpdate: () => void;
}

const AssignmentActions: React.FC<AssignmentActionsProps> = ({ assignment, onUpdate }) => {
    const { enqueueSnackbar } = useSnackbar();
    const auth = useAuth();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<{
        type: 'coach' | 'parent';
        id: number | string;
        name: string;
    } | null>(null);

    const currentUser = auth?.data?.user;
    const userId = currentUser?.id;

    // Determine user role based on their relationship to the assignment
    const userRole = assignment.my_roles.length > 0 ? assignment.my_roles[0] : null;

    const canEdit = canEditAssignment(userId, assignment, userRole);
    const isSubmitted = !!(assignment.pre_assessment_submitted_at || assignment.post_assessment_submitted_at);

    const handleEditClick = () => {
        if (!canEdit) {
            enqueueSnackbar('You do not have permission to edit this assignment', { variant: 'error' });
            return;
        }
        setEditDialogOpen(true);
    };

    const handleRemoveClick = (type: 'coach' | 'parent', id: number | string, name: string) => {
        const canRemove = type === 'coach'
            ? canRemoveCoach(userId, assignment, id, userRole)
            : canRemoveParent(userId, assignment, id, userRole);

        if (!canRemove) {
            enqueueSnackbar(`You do not have permission to remove this ${type}`, { variant: 'error' });
            return;
        }

        setItemToRemove({ type, id, name });
        setRemoveDialogOpen(true);
    };

    const handleRemoveConfirm = async () => {
        if (!itemToRemove) return;

        try {
            // Prepare the update data
            const updateData: any = {};

            if (itemToRemove.type === 'coach') {
                updateData.coaches = assignment.coaches
                    .filter(coach => coach.id !== itemToRemove.id)
                    .map(coach => coach.id);
            } else {
                updateData.parents = assignment.parents
                    .filter(parent => parent.id !== itemToRemove.id)
                    .map(parent => parent.id);
            }

            // Make API call to update assignment using ApiClient
            // Use the first paymentassignment_id
            const assignmentId = assignment.paymentassignment_ids[0];
            const response = await ApiClient.patch(`/api/payment-assignments/${assignmentId}/`, updateData);

            if (response.success) {
                enqueueSnackbar(`${itemToRemove.type} removed successfully`, { variant: 'success' });
                onUpdate();
            } else {
                enqueueSnackbar(response.error || 'Failed to remove item', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error removing item:', error);
            enqueueSnackbar('Failed to remove item', { variant: 'error' });
        } finally {
            setRemoveDialogOpen(false);
            setItemToRemove(null);
        }
    };

    const handleEditSuccess = () => {
        setEditDialogOpen(false);
        onUpdate();
    };

    // Don't render anything if user can't edit
    if (!canEdit) {
        return null;
    }

    return (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* Edit Assignment Button */}
            <Tooltip title="Edit Assignment">
                <IconButton
                    size="small"
                    onClick={handleEditClick}
                    disabled={isSubmitted}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* Individual Remove Buttons for Coaches */}
            {assignment.coaches.map((coach) => (
                <Tooltip key={coach.id} title={`Remove ${coach.str}`}>
                    <IconButton
                        size="small"
                        onClick={() => handleRemoveClick('coach', coach.id, coach.str)}
                        disabled={isSubmitted || !canRemoveCoach(userId, assignment, coach.id, userRole)}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            ))}

            {/* Individual Remove Buttons for Parents */}
            {assignment.parents.map((parent) => (
                <Tooltip key={parent.id} title={`Remove ${parent.str}`}>
                    <IconButton
                        size="small"
                        onClick={() => handleRemoveClick('parent', parent.id, parent.str)}
                        disabled={isSubmitted || !canRemoveParent(userId, assignment, parent.id, userRole)}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            ))}

            {/* Edit Assignment Dialog */}
            <EditAssignmentDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSuccess={handleEditSuccess}
                assignment={assignment}
            />

            {/* Remove Confirmation Dialog */}
            <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)}>
                <DialogTitle>Confirm Removal</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to remove {itemToRemove?.name} from this assignment?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRemoveConfirm} color="error" variant="contained">
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AssignmentActions;