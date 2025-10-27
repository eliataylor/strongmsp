import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../allauth/auth';
import ApiClient from '../config/ApiClient';
import { AthletePaymentAssignment } from '../object-actions/types/types';
import {
    getEditableFields,
    getUserRoleInAssignment
} from '../utils/assignmentPermissions';

interface CoachSearchResult {
    id: number;
    str: string;
    _type: 'Users';
    img?: string;
}

interface CoachSearchResponse {
    results: CoachSearchResult[];
}

interface EditAssignmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assignment: AthletePaymentAssignment;
}

const EditAssignmentDialog: React.FC<EditAssignmentDialogProps> = ({
    open,
    onClose,
    onSuccess,
    assignment
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [athleteEmail, setAthleteEmail] = useState('');
    const [parentEmails, setParentEmails] = useState<string[]>([]);
    const [selectedCoaches, setSelectedCoaches] = useState<CoachSearchResult[]>([]);
    const [coachSearchTerm, setCoachSearchTerm] = useState('');
    const [coachSearchResults, setCoachSearchResults] = useState<CoachSearchResult[]>([]);
    const [coachSearchLoading, setCoachSearchLoading] = useState(false);

    // Get current user context
    const auth = useAuth();
    const currentUser = auth?.data?.user;
    const userId = currentUser?.id;
    const userRole = assignment.my_roles.length > 0 ? assignment.my_roles[0] : null;

    const role = getUserRoleInAssignment(userId, assignment, userRole);
    const editableFields = getEditableFields(role, !!(assignment.pre_assessment_submitted_at || assignment.post_assessment_submitted_at));

    // Initialize form data when dialog opens
    useEffect(() => {
        if (open) {
            // For RelEntity objects, we need to get email from the entity property or use str as fallback
            setAthleteEmail(assignment.athlete.entity?.email || assignment.athlete.str || '');
            setParentEmails(assignment.parents.map(p => p.entity?.email || p.str || ''));
            setSelectedCoaches([]); // Will be populated from search
            setError(null);
        }
    }, [open, assignment]);

    // Search for coaches
    const searchCoaches = async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            setCoachSearchResults([]);
            return;
        }

        setCoachSearchLoading(true);
        try {
            const response = await ApiClient.get(`/api/users/search-coaches/?q=${encodeURIComponent(searchTerm)}`);
            if (response.success && response.data) {
                const data = response.data as CoachSearchResponse;
                setCoachSearchResults(data.results || []);
            }
        } catch (error) {
            console.error('Error searching coaches:', error);
            enqueueSnackbar('Failed to search coaches', { variant: 'error' });
        } finally {
            setCoachSearchLoading(false);
        }
    };

    // Debounced coach search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchCoaches(coachSearchTerm);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [coachSearchTerm]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const updateData: any = {};

            // Update athlete if allowed and email provided
            if (editableFields.includes('athlete') && athleteEmail.trim()) {
                // For now, we'll require the user to provide the exact email
                // In a real implementation, you might want to search for the user by email
                updateData.athlete = athleteEmail.trim();
            }

            // Update coaches if allowed
            if (editableFields.includes('coaches')) {
                updateData.coaches = selectedCoaches.map(coach => coach.id);
            }

            // Update parents if allowed
            if (editableFields.includes('parents')) {
                // For now, we'll require exact email matches
                // In a real implementation, you might want to search for users by email
                updateData.parents = parentEmails.filter(email => email.trim()).map(email => email.trim());
            }

            // Update all assignments for this athlete
            const updatePromises = assignment.paymentassignment_ids.map(async (assignmentId: number) => {
                const response = await ApiClient.patch(`/api/payment-assignments/${assignmentId}/`, updateData);
                return response;
            });

            const responses = await Promise.all(updatePromises);

            // Check if all updates were successful
            const allSuccessful = responses.every((response: any) => response.success);

            if (allSuccessful) {
                enqueueSnackbar('Assignment updated successfully', { variant: 'success' });
                onSuccess();
            } else {
                const failedCount = responses.filter((response: any) => !response.success).length;
                setError(`Failed to update ${failedCount} assignment(s)`);
                enqueueSnackbar(`Failed to update ${failedCount} assignment(s)`, { variant: 'error' });
            }
        } catch (error) {
            console.error('Error updating assignment:', error);
            setError('Failed to update assignment');
            enqueueSnackbar('Failed to update assignment', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (!saving) {
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Edit Assignment
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Your role: {role} | Editable fields: {editableFields.join(', ')}
                </Typography>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                    {/* Athlete Field */}
                    {editableFields.includes('athlete') && (
                        <TextField
                            label="Athlete Email"
                            value={athleteEmail}
                            onChange={(e) => setAthleteEmail(e.target.value)}
                            fullWidth
                            placeholder="Enter exact email address"
                            helperText="Enter the exact email address of the athlete"
                        />
                    )}

                    {/* Parents Field */}
                    {editableFields.includes('parents') && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Parent Emails
                            </Typography>
                            <TextField
                                label="Parent Emails (comma-separated)"
                                value={parentEmails.join(', ')}
                                onChange={(e) => setParentEmails(e.target.value.split(',').map(email => email.trim()))}
                                fullWidth
                                placeholder="email1@example.com, email2@example.com"
                                helperText="Enter exact email addresses separated by commas"
                            />
                        </Box>
                    )}

                    {/* Coaches Field */}
                    {editableFields.includes('coaches') && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Coaches
                            </Typography>
                            <Autocomplete
                                multiple
                                options={coachSearchResults}
                                getOptionLabel={(option) => option.str}
                                value={selectedCoaches}
                                onChange={(_, newValue) => setSelectedCoaches(newValue)}
                                onInputChange={(_, newInputValue) => setCoachSearchTerm(newInputValue)}
                                loading={coachSearchLoading}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Search and select coaches"
                                        placeholder="Type to search for coaches..."
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {coachSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            label={option.str}
                                            {...getTagProps({ index })}
                                        />
                                    ))
                                }
                                renderOption={(props, option) => (
                                    <Box component="li" {...props}>
                                        <Box>
                                            <Typography variant="body2">
                                                {option.str}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            />
                        </Box>
                    )}

                    {editableFields.length === 0 && (
                        <Alert severity="info">
                            You do not have permission to edit any fields in this assignment.
                        </Alert>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving || editableFields.length === 0}
                >
                    {saving ? <CircularProgress size={20} /> : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditAssignmentDialog;
