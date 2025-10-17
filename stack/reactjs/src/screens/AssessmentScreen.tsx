import { CheckCircle, Psychology } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Fade,
    LinearProgress,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import { useAssessment } from '../context/AssessmentContext';

interface AssessmentScreenProps {
    onComplete?: () => void;
}

const AssessmentScreen: React.FC<AssessmentScreenProps> = ({
    onComplete
}) => {
    const { id } = useParams<{ id: string }>();
    const assessmentId = id ? parseInt(id, 10) : 1;
    const theme = useTheme();
    const {
        title,
        description,
        questions,
        currentQuestionIndex,
        responses,
        isLoading,
        error,
        progress,
        totalQuestions,
        isComplete,
        answeredQuestions,
        loadAssessment,
        submitResponse,
        goToNextQuestion,
        goToPreviousQuestion,
        goToQuestion,
        submitAllResponses,
        resetAssessment,
        retryLastAction
    } = useAssessment();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        if (assessmentId) {
            loadAssessment(assessmentId);
        }
    }, [assessmentId]);

    const handleResponseSubmit = async (response: number, responseText?: string): Promise<boolean> => {
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion) {
            return await submitResponse(Number(currentQuestion.id), response, responseText);
        }
        return false;
    };

    const handleCompleteAssessment = async () => {
        setIsSubmitting(true);
        try {
            const success = await submitAllResponses();
            if (success) {
                setIsCompleted(true);
                onComplete?.();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            goToNextQuestion();
        }
        // Note: Assessment completion is now handled by the dedicated submit button
    };

    const handlePrevious = () => {
        goToPreviousQuestion();
    };

    const getCurrentResponse = () => {
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion) {
            const response = responses.find((r: any) => r.question === Number(currentQuestion.id));
            return response?.response;
        }
        return undefined;
    };

    if (isLoading && questions.length === 0) {
        return (
            <Container maxWidth="md" sx={{ py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={60} sx={{ mb: 3 }} />
                    <Typography variant="h5" gutterBottom>
                        Loading Assessment...
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Please wait while we prepare your assessment questions.
                    </Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 8 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {isLoading ? 'Error During Operation' : 'Error Loading Assessment'}
                    </Typography>
                    <Typography variant="body1">
                        {error}
                    </Typography>
                </Alert>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        onClick={retryLastAction}
                        disabled={isLoading}
                        sx={{ textTransform: 'none' }}
                    >
                        {isLoading ? 'Retrying...' : 'Retry'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => loadAssessment(assessmentId)}
                        disabled={isLoading}
                        sx={{ textTransform: 'none' }}
                    >
                        Reload Assessment
                    </Button>
                    <Button
                        variant="text"
                        onClick={() => window.history.back()}
                        sx={{ textTransform: 'none' }}
                    >
                        Go Back
                    </Button>
                </Box>
            </Container>
        );
    }

    if (isCompleted) {
        return (
            <Container maxWidth="md" sx={{ py: 8 }}>
                <Fade in={true} timeout={1000}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            borderRadius: 3,
                            background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}15 100%)`
                        }}
                    >
                        <CheckCircle
                            sx={{
                                fontSize: 80,
                                color: theme.palette.success.main,
                                mb: 3
                            }}
                        />
                        <Typography variant="h3" gutterBottom fontWeight="bold" color="success.main">
                            Assessment Complete!
                        </Typography>
                        <Typography variant="h6" gutterBottom color="text.secondary">
                            Thank you for completing the assessment
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                            Your responses have been recorded and will help us provide personalized insights.
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={resetAssessment}
                            sx={{ textTransform: 'none', mr: 2 }}
                        >
                            Take Another Assessment
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => window.history.back()}
                            sx={{ textTransform: 'none' }}
                        >
                            Return to Dashboard
                        </Button>
                    </Paper>
                </Fade>
            </Container>
        );
    }

    if (questions.length === 0) {
        return (
            <Container maxWidth="md" sx={{ py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Psychology sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                    <Typography variant="h5" gutterBottom>
                        No Questions Available
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        This assessment doesn't have any questions yet.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => window.history.back()}
                        sx={{ textTransform: 'none' }}
                    >
                        Go Back
                    </Button>
                </Box>
            </Container>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h3" gutterBottom fontWeight="bold" color="primary">
                    {title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }} >
                    {description}
                </Typography>

                {/* Progress Bar */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Question {currentQuestionIndex + 1} of {totalQuestions}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {answeredQuestions} of {totalQuestions} answered ({Math.round(progress)}%)
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                background: isComplete
                                    ? `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
                                    : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                            }
                        }}
                    />
                </Box>

                {/* Submit Button when Complete */}
                {isComplete && (
                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCompleteAssessment}
                            disabled={isSubmitting}
                            sx={{
                                textTransform: 'none',
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                background: `linear-gradient(45deg, ${theme.palette.success.main} 30%, ${theme.palette.success.dark} 90%)`,
                                '&:hover': {
                                    background: `linear-gradient(45deg, ${theme.palette.success.dark} 30%, ${theme.palette.success.main} 90%)`,
                                }
                            }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Question Navigation */}
            {totalQuestions > 1 && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
                    {questions.map((_, index) => {
                        const isAnswered = responses.some(r => r.question === questions[index].id);
                        const isCurrent = index === currentQuestionIndex;
                        return (
                            <Button
                                key={index}
                                variant={isCurrent ? "contained" : isAnswered ? "outlined" : "text"}
                                size="small"
                                onClick={() => goToQuestion(index)}
                                sx={{
                                    minWidth: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    color: isAnswered ? 'success.main' : 'text.secondary',
                                    borderColor: isAnswered ? 'success.main' : 'divider',
                                    '&:hover': {
                                        backgroundColor: isAnswered ? 'success.light' : 'action.hover',
                                    }
                                }}
                            >
                                {index + 1}
                            </Button>
                        );
                    })}
                </Box>
            )}

            {/* Question Card */}
            <Fade in={true} timeout={300}>
                <Box>
                    <QuestionCard
                        question={currentQuestion}
                        onResponseSubmit={handleResponseSubmit}
                        onNext={handleNext}
                        onPrevious={handlePrevious}
                        isFirst={currentQuestionIndex === 0}
                        isLast={currentQuestionIndex === totalQuestions - 1}
                        currentResponse={getCurrentResponse()}
                    />
                </Box>
            </Fade>

            {/* Loading Overlay for Submission */}
            {isSubmitting && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}
                >
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                        <CircularProgress size={40} sx={{ mb: 2 }} />
                        <Typography variant="h6">
                            Submitting Your Responses...
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Please wait while we save your assessment data.
                        </Typography>
                    </Paper>
                </Box>
            )}
        </Container>
    );
};

export default AssessmentScreen;