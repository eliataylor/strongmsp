import {
    Assessment as AssessmentIcon,
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon
} from "@mui/icons-material";
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Fade,
    Grid,
    Typography,
    useTheme
} from "@mui/material";
import React, { useState } from "react";
import HeroImage from "../components/HeroImage";
import PublicHeader from "../components/PublicHeader";
import SignupModal from "../components/SignupModal";

const LandingPage: React.FC = () => {
    const theme = useTheme();
    const [signupModalOpen, setSignupModalOpen] = useState(false);

    const scrollToHowItWorks = () => {
        const element = document.getElementById('how-it-works');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const testimonials = [
        {
            quote: "Something like SMSP which prepares kids to be mentally strong along with being physically prepared has been the missing link.",
            author: "B. Steele",
            role: "Athletic Director"
        },
        {
            quote: "I love this site and the Bell family is excited to have this resource ready for our young athlete.",
            author: "K. Bell",
            role: "Parent of student athlete"
        },
        {
            quote: "In my previous work as an educator I often wished student athletes had access to resources like these to help them perform at their best while truly enjoying the sport they are involved in.",
            author: "G. Gordon",
            role: "Parent of student athlete / Former Educator"
        },
        {
            quote: "My daughter quit basketball during COVID and could have used this program to boost her confidence during that isolated time.",
            author: "C. Johnson",
            role: "Parent of student athlete"
        },
        {
            quote: "Super valuable for the kids. Belief is where it starts and I could have made it a lot further in the game if I wasn't in my head.",
            author: "Anonymous",
            role: "High School Basketball Coach"
        }
    ];

    const howItWorksSteps = [
        {
            label: "Take the Assessment",
            description: "Uncover the athlete's baseline confidence score. Our 50-question pre-assessment reveals key mindset patterns and confidence blockers.",
            icon: <AssessmentIcon />
        },
        {
            label: "Choose Your Path",
            description: "Work with a performance coach, or go at your own pace with a self-guided curriculum.",
            icon: <PersonIcon />
        },
        {
            label: "Build Consistency",
            description: "Weekly lessons teach visualization, affirmations, mental resets, and emotional control—building habits that last beyond the season.",
            icon: <TrendingUpIcon />
        }
    ];

    return (
        <Box>
            <PublicHeader />

            {/* Hero Section */}
            <HeroImage height={700} showStats={true} />

            {/* Call to Action Buttons */}
            <Container maxWidth="lg" sx={{ py: 6 }}>
                <Grid container spacing={2} justifyContent="center">
                    <Grid item>
                        <Button
                            onClick={scrollToHowItWorks}
                            variant="contained"
                            size="large"
                            sx={{
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 'bold'
                            }}
                        >
                            Learn How It Works
                        </Button>
                    </Grid>
                    <Grid item>
                        <Button
                            onClick={() => setSignupModalOpen(true)}
                            variant="outlined"
                            size="large"
                            sx={{
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 'bold'
                            }}
                        >
                            Get Started
                        </Button>
                    </Grid>
                </Grid>
            </Container>

            {/* Why It Works Section */}
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Typography variant="h3" component="h2" sx={{
                    textAlign: 'center',
                    mb: 4,
                    fontWeight: 'bold'
                }}>
                    Why It Works
                </Typography>
                <Typography variant="h5" component="p" sx={{
                    textAlign: 'center',
                    maxWidth: 800,
                    mx: 'auto',
                    lineHeight: 1.6,
                    mb: 4
                }}>
                    Confidence isn't something you either have or don't—it's something you build. Our program is designed to teach athletes how to mentally prepare, emotionally recover, and lead from within.
                </Typography>
                <Typography variant="body1" sx={{
                    textAlign: 'center',
                    maxWidth: 800,
                    mx: 'auto',
                    fontSize: '1.1rem',
                    lineHeight: 1.6
                }}>
                    Whether you're coming off a tough game or gearing up for your biggest season yet, Strong Mind Strong Performance provides the system, support, and structure needed to rise.
                </Typography>
            </Container>

            {/* Testimonials Section */}
            <Box sx={{ py: 8 }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" component="h2" sx={{
                        textAlign: 'center',
                        mb: 6,
                        fontWeight: 'bold'
                    }}>
                        What People Are Saying
                    </Typography>
                    <Grid container spacing={4}>
                        {testimonials.map((testimonial, index) => (
                            <Grid item xs={12} md={6} key={index}>
                                <Fade in={true} timeout={1000 + index * 200}>
                                    <Card
                                        elevation={2}
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            p: 3
                                        }}
                                    >
                                        <CardContent sx={{ flexGrow: 1 }}>
                                            <Typography variant="body1" sx={{
                                                fontStyle: 'italic',
                                                mb: 2,
                                                fontSize: '1.1rem',
                                                lineHeight: 1.6
                                            }}>
                                                "{testimonial.quote}"
                                            </Typography>
                                            <Typography variant="subtitle1" sx={{
                                                fontWeight: 'bold',
                                                color: 'primary.main'
                                            }}>
                                                — {testimonial.author}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {testimonial.role}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Fade>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* How It Works Section */}
            <Container maxWidth="lg" sx={{ py: 8 }} id="how-it-works">
                <Typography variant="h3" component="h2" sx={{
                    textAlign: 'center',
                    mb: 6,
                    fontWeight: 'bold'
                }}>
                    How It Works in 3 Easy Steps
                </Typography>

                <Grid container spacing={4}>
                    {howItWorksSteps.map((step, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <Fade in={true} timeout={1000 + index * 300}>
                                <Card
                                    elevation={3}
                                    sx={{
                                        height: '100%',
                                        textAlign: 'center',
                                        p: 4,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Box sx={{
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: 80,
                                        height: 80,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 3
                                    }}>
                                        {step.icon}
                                    </Box>
                                    <Typography variant="h4" component="h3" sx={{
                                        mb: 2,
                                        fontWeight: 'bold',
                                        color: 'primary.main'
                                    }}>
                                        {index + 1}. {step.label}
                                    </Typography>
                                    <Typography variant="body1" sx={{
                                        lineHeight: 1.6,
                                        color: 'text.secondary'
                                    }}>
                                        {step.description}
                                    </Typography>
                                </Card>
                            </Fade>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Final Call to Action */}
            <Box sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                py: 8
            }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" component="h2" sx={{
                        textAlign: 'center',
                        mb: 4,
                        fontWeight: 'bold'
                    }}>
                        Ready to Build Your Athlete's Confidence?
                    </Typography>
                    <Typography variant="h6" sx={{
                        textAlign: 'center',
                        mb: 4,
                        opacity: 0.9
                    }}>
                        Use promo code <strong>FIRST100</strong> to receive 90% discount on full self-guided track + assessment.
                    </Typography>
                    <Grid container spacing={2} justifyContent="center">
                        <Grid item>
                            <Button
                                onClick={() => setSignupModalOpen(true)}
                                variant="contained"
                                size="large"
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                Get Started
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button
                                href="https://buy.stripe.com/eVq4gB3Vv5IngOp6v0abK0v"
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="outlined"
                                size="large"
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    borderColor: 'white',
                                    color: 'white',
                                    '&:hover': {
                                        borderColor: 'white',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                }}
                            >
                                Purchase Now
                            </Button>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Signup Modal */}
            <SignupModal
                open={signupModalOpen}
                onClose={() => setSignupModalOpen(false)}
            />
        </Box>
    );
};

export default LandingPage;
