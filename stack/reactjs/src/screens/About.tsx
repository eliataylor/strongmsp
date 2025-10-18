import { Email as EmailIcon } from "@mui/icons-material";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Grid,
    Typography
} from "@mui/material";
import React, { useEffect, useState } from "react";
import PublicHeader from "../components/PublicHeader";
import ApiClient, { HttpResponse } from "../config/ApiClient";
import { ApiListResponse, Users } from "../object-actions/types/types";

const About: React.FC = () => {
    const [coaches, setCoaches] = useState<Users[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCoaches = async () => {
            try {
                setLoading(true);
                const response: HttpResponse<ApiListResponse<'Users'>> = await ApiClient.get('/api/users?organization=smsp');
                if (response.success && response.data) {
                    setCoaches(response.data.results);
                } else {
                    setError(response.error || 'Failed to load coach information');
                }
            } catch (err) {
                console.error('Error fetching coaches:', err);
                setError('Failed to load coach information. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchCoaches();
    }, []);

    const handleContactClick = () => {
        window.location.href = 'mailto:info@strongmindstrongperformance.com';
    };

    return (
        <Box>
            <PublicHeader />

            <Container maxWidth="lg" sx={{ py: 8 }}>
                {/* Founder Story Section */}
                <Box sx={{ mb: 8 }}>
                    <Typography variant="h2" component="h1" sx={{
                        textAlign: 'center',
                        mb: 4,
                        fontWeight: 'bold'
                    }}>
                        About Strong Mind Strong Performance
                    </Typography>

                    <Typography variant="h5" component="p" sx={{
                        textAlign: 'center',
                        maxWidth: 800,
                        mx: 'auto',
                        lineHeight: 1.6,
                        mb: 4
                    }}>
                        Founded by a parent of two teenage athletes and with over 10 years of youth development experience.
                        Strong Mind Strong Performance was created to help parents and coaches connect with young athletes—going
                        beyond skill and strength into self-belief, emotional regulation, and mental resilience.
                    </Typography>

                    <Typography variant="body1" sx={{
                        textAlign: 'center',
                        maxWidth: 800,
                        mx: 'auto',
                        fontSize: '1.1rem',
                        lineHeight: 1.6,
                        color: 'text.secondary'
                    }}>
                        We know that sports success is 90% psychological, and we're here to train that side too.
                    </Typography>
                </Box>

                {/* Meet Your Coaches Section */}
                <Box sx={{ mb: 8 }}>
                    <Typography variant="h3" component="h2" sx={{
                        textAlign: 'center',
                        mb: 6,
                        fontWeight: 'bold'
                    }}>
                        Meet Your Coaches
                    </Typography>

                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={60} />
                        </Box>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 4 }}>
                            {error}
                        </Alert>
                    )}

                    {!loading && !error && coaches.length === 0 && (
                        <Alert severity="info" sx={{ mb: 4 }}>
                            No coaches found. Please check back later.
                        </Alert>
                    )}

                    {!loading && !error && coaches.length > 0 && (
                        <Grid container spacing={4}>
                            {coaches.map((coach) => (
                                <Grid item xs={12} sm={6} md={4} key={coach.id}>
                                    <Card
                                        elevation={3}
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'transform 0.2s ease-in-out',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6
                                            }
                                        }}
                                    >
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            pt: 3,
                                            pb: 2
                                        }}>
                                            <Avatar
                                                alt={`${coach.first_name} ${coach.last_name}`}
                                                sx={{
                                                    width: 120,
                                                    height: 120,
                                                    fontSize: '2rem',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {coach.first_name?.[0]}{coach.last_name?.[0]}
                                            </Avatar>
                                        </Box>

                                        <CardContent sx={{
                                            textAlign: 'center',
                                            flexGrow: 1,
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}>
                                            <Typography variant="h5" component="h3" sx={{
                                                mb: 1,
                                                fontWeight: 'bold',
                                                color: 'primary.main'
                                            }}>
                                                {coach.first_name} {coach.last_name}
                                            </Typography>

                                            {coach.bio && (
                                                <Typography variant="body1" sx={{
                                                    lineHeight: 1.6,
                                                    color: 'text.secondary',
                                                    flexGrow: 1
                                                }}>
                                                    {coach.bio}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>

                {/* Contact CTA */}
                <Box sx={{
                    textAlign: 'center',
                    py: 6,
                    px: 4,
                    borderRadius: 2
                }}>
                    <Typography variant="h4" component="h2" sx={{
                        mb: 2,
                        fontWeight: 'bold'
                    }}>
                        Ready to Get Started?
                    </Typography>
                    <Typography variant="body1" sx={{
                        mb: 4,
                        color: 'text.secondary',
                        maxWidth: 600,
                        mx: 'auto'
                    }}>
                        Contact us now to learn more about how Strong Mind Strong Performance can help your athlete reach their full potential.
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<EmailIcon />}
                        onClick={handleContactClick}
                        sx={{
                            px: 4,
                            py: 1.5,
                            fontSize: '1.1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Contact Us Now
                    </Button>
                </Box>
            </Container>
        </Box>
    );
};

export default About;
