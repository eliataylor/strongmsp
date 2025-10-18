import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Container,
    Grid,
    Paper,
    TextField,
    Typography
} from "@mui/material";
import React, { useState } from "react";
import PublicHeader from "../components/PublicHeader";

const FAQs: React.FC = () => {
    const [email, setEmail] = useState("");

    const faqs = [
        {
            question: "What age is this program for?",
            answer: "Athletes ages 13–18, typically middle and high school students."
        },
        {
            question: "Do I need the full coaching plan to benefit?",
            answer: "No—our self-guided plan is effective for many athletes who are independent learners. The coaching option is best for athletes needing structure and accountability."
        },
        {
            question: "Can I retake the assessment later?",
            answer: "Yes, we recommend re-taking the confidence assessment every 3–6 months to track growth and set new goals."
        },
        {
            question: "What sports is this for?",
            answer: "This system is designed for all sports: basketball, soccer, track, swimming, volleyball, and more."
        }
    ];

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle newsletter signup
        console.log("Newsletter signup:", email);
        setEmail("");
    };

    return (
        <Box>
            <PublicHeader />

            <Container maxWidth="md" sx={{ py: 8 }}>
                <Typography variant="h2" component="h1" sx={{
                    textAlign: 'center',
                    mb: 6,
                    fontWeight: 'bold'
                }}>
                    Frequently Asked Questions
                </Typography>

                <Box sx={{ mb: 8 }}>
                    {faqs.map((faq, index) => (
                        <Accordion key={index} elevation={2} sx={{ mb: 2 }}>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`panel${index}-content`}
                                id={`panel${index}-header`}
                                sx={{
                                    '& .MuiAccordionSummary-content': {
                                        margin: '16px 0'
                                    }
                                }}
                            >
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {faq.question}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                                    {faq.answer}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>

                {/* Newsletter Signup */}
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, rgba(135, 112, 16, 0.1) 0%, rgba(42, 116, 183, 0.1) 100%)'
                    }}
                >
                    <Typography variant="h4" component="h2" sx={{
                        mb: 2,
                        fontWeight: 'bold',
                        color: 'primary.main'
                    }}>
                        Stay Connected
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                        Sign up with your email address to receive news and updates.
                    </Typography>

                    <Box component="form" onSubmit={handleNewsletterSubmit}>
                        <Grid container spacing={2} justifyContent="center" alignItems="center">
                            <Grid item xs={12} sm={8} md={6}>
                                <TextField
                                    fullWidth
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'white'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    sx={{
                                        py: 1.5,
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Sign Up
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    <Typography variant="caption" sx={{
                        mt: 2,
                        display: 'block',
                        color: 'text.secondary'
                    }}>
                        We respect your privacy.
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

export default FAQs;
