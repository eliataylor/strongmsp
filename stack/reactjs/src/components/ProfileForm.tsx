import { Alert, Avatar, Box, Button, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import ApiClient from "../config/ApiClient";

type ProfileData = {
    first_name: string;
    last_name: string;
    gender: string | null;
    ethnicity: string[] | null;
    birthdate: string | null; // yyyy-mm-dd
    zip_code: string | null;
    bio: string | null;
    avatar?: string | null; // URL from GET
    photo?: string | null;  // URL from GET
};

const genderOptions = [
    { value: "", label: "Unspecified" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "rather_not_say", label: "Rather Not Say" }
];

export default function ProfileForm() {
    const [data, setData] = useState<ProfileData>({
        first_name: "",
        last_name: "",
        gender: "",
        ethnicity: [],
        birthdate: "",
        zip_code: "",
        bio: "",
        avatar: null,
        photo: null
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const avatarPreview = useMemo(() => {
        if (avatarFile) return URL.createObjectURL(avatarFile);
        return data.avatar || null;
    }, [avatarFile, data.avatar]);

    const photoPreview = useMemo(() => {
        if (photoFile) return URL.createObjectURL(photoFile);
        return data.photo || null;
    }, [photoFile, data.photo]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const resp = await ApiClient.get<ProfileData>("/api/account/profile");
            if (mounted) {
                if (resp.success && resp.data) {
                    // Normalize fields
                    const d = resp.data as any;
                    setData({
                        first_name: d.first_name || "",
                        last_name: d.last_name || "",
                        gender: d.gender || "",
                        ethnicity: Array.isArray(d.ethnicity) ? d.ethnicity : [],
                        birthdate: d.birthdate || "",
                        zip_code: d.zip_code || "",
                        bio: d.bio || "",
                        avatar: d.avatar || null,
                        photo: d.photo || null
                    });
                } else {
                    setError(resp.error || "Failed to load profile");
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const form = new FormData();
            form.append("first_name", data.first_name || "");
            form.append("last_name", data.last_name || "");
            if (data.gender) form.append("gender", data.gender);
            if (data.birthdate) form.append("birthdate", data.birthdate);
            if (data.zip_code) form.append("zip_code", data.zip_code);
            if (data.bio) form.append("bio", data.bio);
            if (data.ethnicity && data.ethnicity.length) form.append("ethnicity", JSON.stringify(data.ethnicity));
            if (avatarFile) form.append("avatar", avatarFile);
            if (photoFile) form.append("photo", photoFile);

            const resp = await ApiClient.put<ProfileData>("/api/account/profile", form, {
                "Content-Type": "multipart/form-data"
            });

            if (resp.success && resp.data) {
                setSuccess("Profile updated");
                const d = resp.data as any;
                setData((prev) => ({
                    ...prev,
                    avatar: d.avatar || prev.avatar,
                    photo: d.photo || prev.photo
                }));
                setAvatarFile(null);
                setPhotoFile(null);
            } else {
                setError(resp.error || "Failed to save profile");
            }
        } catch (err: any) {
            setError(err?.message || "Unexpected error");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 800, mx: "auto", p: 2 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
            )}

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="First Name"
                        value={data.first_name}
                        onChange={(e) => setData({ ...data, first_name: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Last Name"
                        value={data.last_name}
                        onChange={(e) => setData({ ...data, last_name: e.target.value })}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        select
                        fullWidth
                        label="Gender"
                        value={data.gender || ""}
                        onChange={(e) => setData({ ...data, gender: e.target.value })}
                    >
                        {genderOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Ethnicity (comma separated)"
                        value={(data.ethnicity || []).join(", ")}
                        onChange={(e) => setData({ ...data, ethnicity: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Birthdate"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={data.birthdate || ""}
                        onChange={(e) => setData({ ...data, birthdate: e.target.value })}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Zip Code"
                        value={data.zip_code || ""}
                        onChange={(e) => setData({ ...data, zip_code: e.target.value })}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Bio"
                        value={data.bio || ""}
                        onChange={(e) => setData({ ...data, bio: e.target.value })}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <Stack spacing={1} alignItems="flex-start">
                        <Typography variant="subtitle1">Avatar</Typography>
                        {avatarPreview && <Avatar src={avatarPreview} sx={{ width: 80, height: 80 }} />}
                        <Button variant="outlined" component="label">
                            Choose File
                            <input type="file" accept="image/*" hidden onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setAvatarFile(file);
                            }} />
                        </Button>
                    </Stack>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <Stack spacing={1} alignItems="flex-start">
                        <Typography variant="subtitle1">Photo</Typography>
                        {photoPreview && <Avatar variant="rounded" src={photoPreview} sx={{ width: 120, height: 120 }} />}
                        <Button variant="outlined" component="label">
                            Choose File
                            <input type="file" accept="image/*" hidden onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setPhotoFile(file);
                            }} />
                        </Button>
                    </Stack>
                </Grid>

                <Grid item xs={12}>
                    <Button type="submit" variant="contained" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}


