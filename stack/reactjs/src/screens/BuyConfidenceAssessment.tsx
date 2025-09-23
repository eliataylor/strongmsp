import {
    CheckCircle,
    Psychology,
    School,
    Security,
    Speed,
    Star,
    Support,
    TrendingUp
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Container,
    Fade,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import { ButtonPill } from '../theme/StyledFields';

interface PricingTier {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    popular?: boolean;
    buttonText: string;
    buttonVariant: 'contained' | 'outlined';
}

const BuyConfidenceAssessment: React.FC = () => {
    const theme = useTheme();

    const pricingTiers: PricingTier[] = [
        {
            name: "Individual Assessment",
            price: "$29",
            period: "one-time",
            description: "Perfect for parents wanting to understand their athlete's confidence level",
            features: [
                "Complete confidence assessment",
                "Personalized results report",
                "Actionable recommendations",
                "Email support",
                "30-day access to results"
            ],
            buttonText: "Purchase Individual",
            buttonVariant: "outlined"
        },
        {
            name: "Coach Package",
            price: "$99",
            period: "one-time",
            description: "Ideal for coaches working with multiple athletes",
            features: [
                "Up to 10 athlete assessments",
                "Team confidence overview dashboard",
                "Group coaching recommendations",
                "Priority email support",
                "90-day access to all results",
                "Coach training materials"
            ],
            popular: true,
            buttonText: "Purchase Coach Package",
            buttonVariant: "contained"
        },
        {
            name: "Team License",
            price: "$199",
            period: "one-time",
            description: "Perfect for organizations, clubs, and large teams",
            features: [
                "Unlimited athlete assessments",
                "Advanced analytics dashboard",
                "Custom team reports",
                "Phone & email support",
                "1-year access to all results",
                "Coach training & certification",
                "Custom branding options"
            ],
            buttonText: "Purchase Team License",
            buttonVariant: "outlined"
        }
    ];

    const benefits = [
        {
            icon: <Psychology sx={{ fontSize: 40, color: 'primary.main' }} />,
            title: "Evidence-Based Assessment",
            description: "Built on proven psychological frameworks for measuring confidence in youth athletes"
        },
        {
            icon: <TrendingUp sx={{ fontSize: 40, color: 'secondary.main' }} />,
            title: "Track Progress Over Time",
            description: "Monitor confidence development and identify areas for improvement"
        },
        {
            icon: <School sx={{ fontSize: 40, color: 'success.main' }} />,
            title: "Educational Resources",
            description: "Access to training materials and strategies for building confidence"
        },
        {
            icon: <Support sx={{ fontSize: 40, color: 'warning.main' }} />,
            title: "Expert Support",
            description: "Get guidance from sports psychology professionals"
        },
        {
            icon: <Security sx={{ fontSize: 40, color: 'info.main' }} />,
            title: "Secure & Private",
            description: "All data is encrypted and stored securely with full privacy protection"
        },
        {
            icon: <Speed sx={{ fontSize: 40, color: 'primary.main' }} />,
            title: "Quick Results",
            description: "Get comprehensive results within minutes of completing the assessment"
        }
    ];

    const handlePurchase = (tier: PricingTier) => {
        // TODO: Implement actual payment processing
        console.log(`Purchasing ${tier.name} for ${tier.price}`);
        // This would typically redirect to a payment processor like Stripe
    };

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            {/* Hero Section */}
            <Fade in={true} timeout={1000}>
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography
                        variant="h2"
                        component="h1"
                        gutterBottom
                        sx={{
                            fontWeight: 'bold',
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 3
                        }}
                    >
                        Buy the Confidence Assessment
                    </Typography>
                    <Typography
                        variant="h5"
                        color="text.secondary"
                        sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}
                    >
                        Unlock your athlete's potential with our comprehensive confidence assessment.
                        Get personalized insights and actionable strategies to build lasting confidence.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Chip
                            icon={<Star />}
                            label="4.9/5 Rating"
                            color="primary"
                            variant="outlined"
                        />
                        <Chip
                            icon={<CheckCircle />}
                            label="1000+ Athletes Assessed"
                            color="success"
                            variant="outlined"
                        />
                        <Chip
                            icon={<Security />}
                            label="Secure & Private"
                            color="info"
                            variant="outlined"
                        />
                    </Box>
                </Box>
            </Fade>

            {/* Benefits Section */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
                    Why Choose Our Assessment?
                </Typography>
                <Grid container spacing={4}>
                    {benefits.map((benefit, index) => (
                        <Grid item xs={12} md={6} lg={4} key={index}>
                            <Fade in={true} timeout={1000 + index * 200}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        height: '100%',
                                        textAlign: 'center',
                                        p: 3,
                                        transition: 'transform 0.3s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: 4
                                        }
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ mb: 2 }}>
                                            {benefit.icon}
                                        </Box>
                                        <Typography variant="h6" gutterBottom fontWeight="bold">
                                            {benefit.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {benefit.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Fade>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Pricing Section */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
                    Choose Your Package
                </Typography>
                <Grid container spacing={4} justifyContent="center">
                    {pricingTiers.map((tier, index) => (
                        <Grid item xs={12} md={6} lg={4} key={index}>
                            <Fade in={true} timeout={1000 + index * 200}>
                                <Card
                                    elevation={tier.popular ? 8 : 2}
                                    sx={{
                                        height: '100%',
                                        position: 'relative',
                                        border: tier.popular ? `2px solid ${theme.palette.primary.main}` : 'none',
                                        transform: tier.popular ? 'scale(1.05)' : 'none',
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                            transform: tier.popular ? 'scale(1.08)' : 'scale(1.03)',
                                            boxShadow: 8
                                        }
                                    }}
                                >
                                    {tier.popular && (
                                        <Chip
                                            label="Most Popular"
                                            color="primary"
                                            sx={{
                                                position: 'absolute',
                                                top: -12,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                zIndex: 1
                                            }}
                                        />
                                    )}
                                    <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="h4" component="h3" gutterBottom fontWeight="bold">
                                            {tier.name}
                                        </Typography>
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="h2" component="span" color="primary.main" fontWeight="bold">
                                                {tier.price}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                                                {tier.period}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                            {tier.description}
                                        </Typography>

                                        <List sx={{ flexGrow: 1, mb: 3 }}>
                                            {tier.features.map((feature, featureIndex) => (
                                                <ListItem key={featureIndex} sx={{ px: 0 }}>
                                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                                        <CheckCircle color="success" fontSize="small" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={feature}
                                                        primaryTypographyProps={{ variant: 'body2' }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>

                                        <ButtonPill
                                            variant={tier.buttonVariant}
                                            size="large"
                                            fullWidth
                                            onClick={() => handlePurchase(tier)}
                                            sx={{
                                                mt: 'auto',
                                                py: 1.5,
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {tier.buttonText}
                                        </ButtonPill>
                                    </CardContent>
                                </Card>
                            </Fade>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* FAQ Section */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
                    Frequently Asked Questions
                </Typography>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                How long does the assessment take?
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                The assessment typically takes 15-20 minutes to complete. It's designed to be engaging and not overwhelming for young athletes.
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                Is my data secure?
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Yes, absolutely. We use enterprise-grade encryption and follow strict privacy protocols. Your data is never shared without consent.
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                Can I get a refund?
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                We offer a 30-day money-back guarantee. If you're not satisfied with the assessment results, we'll provide a full refund.
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                Do you offer team discounts?
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Yes! Contact us for custom pricing on team packages of 20+ athletes. We offer significant discounts for larger groups.
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            {/* CTA Section */}
            <Fade in={true} timeout={1500}>
                <Paper
                    elevation={4}
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.secondary.light}15 100%)`,
                        borderRadius: 3
                    }}
                >
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Ready to Build Unshakeable Confidence?
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                        Join thousands of athletes who have transformed their confidence and performance
                    </Typography>
                    <ButtonPill
                        variant="contained"
                        size="large"
                        sx={{
                            py: 2,
                            px: 6,
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                        }}
                        onClick={() => {
                            // Scroll to pricing section
                            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        Get Started Today
                    </ButtonPill>
                </Paper>
            </Fade>
        </Container>
    );
};

export default BuyConfidenceAssessment;
