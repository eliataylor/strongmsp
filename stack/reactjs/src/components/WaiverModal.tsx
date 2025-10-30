import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import React, { useCallback, useMemo } from "react";
import { AuthContext } from "../allauth/auth/AuthContext";
import { getAuth } from "../allauth/lib/allauth";
import ApiClient from "../config/ApiClient";

export default function WaiverModal() {
    const { auth } = React.useContext<any>(AuthContext) || {};

    const user = auth?.data?.user;
    const isAuthenticated = auth?.meta?.is_authenticated === true;
    const open = useMemo(() => Boolean(isAuthenticated && user && user.waiver_signed === false), [isAuthenticated, user]);

    const onAccept = useCallback(async () => {
        if (!user?.id) return;
        const resp = await ApiClient.patch(`/api/users/${user.id}`, { waiver_signed: true });
        if (resp.success) {
            try {
                await getAuth(); // refresh session; event updates AuthContext
            } catch (e) {
                // ignore, session refresh will retry on next tick
            }
        }
    }, [user]);

    if (!open) return null;

    return (
        <Dialog open={open} aria-labelledby="waiver-title">
            <DialogTitle id="waiver-title">Liability Waiver</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    By clicking "I accept", you acknowledge and agree that training and
                    performance activities involve inherent risk. You assume all risk of
                    injury and release Strong Mind Strong Performance from liability to the
                    fullest extent permitted by law.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button color="primary" variant="contained" onClick={onAccept}>
                    I accept
                </Button>
            </DialogActions>
        </Dialog>
    );
}


