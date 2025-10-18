import { CheckCircle, Psychology } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Fade,
    LinearProgress,
    Pagination,
    PaginationItem,
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
    const routeAssessmentId = id ? parseInt(id, 10) : 1;
    const theme = useTheme();
    const {
        title,
        description,
        assessmentId,
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
        submitAssessment,
        resetAssessment,
        retryLastAction
    } = useAssessment();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        if (routeAssessmentId) {
            loadAssessment(routeAssessmentId);
        }
    }, [routeAssessmentId]);

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
            const success = await submitAssessment();
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
                        onClick={() => loadAssessment(routeAssessmentId)}
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
                            You coach will reach out to your soon!
                        </Typography>
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
        <Container >
            {/* Header */}
            <Box sx={{ mb: 1, textAlign: 'center' }}>
                <Typography variant="h3" gutterBottom fontWeight="bold" color="primary">
                    {title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }} >
                    {description}
                </Typography>

                {/* Progress Bar */}
                <Box>
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
                                    ? `linear-gradient(90deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.dark} 100%)`
                                    : `linear-gradient(90deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 100%)`
                            }
                        }}
                    />
                </Box>
            </Box>

            <Box sx={{ mb: 3, width: '100%' }}>
                <Pagination
                    count={totalQuestions}
                    page={currentQuestionIndex + 1}
                    onChange={(_: any, page: number) => goToQuestion(page - 1)}
                    color="primary"
                    variant="outlined"
                    shape="rounded"
                    size="small"
                    sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        '& .MuiPagination-ul': {
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'nowrap',
                            gap: 1,
                        }
                    }}
                    renderItem={(item: any) => {
                        const questionIndex = item.page - 1;
                        const isAnswered = questionIndex >= 0 && questionIndex < questions.length
                            ? responses.some(r => r.question === questions[questionIndex].id)
                            : false;
                        const isCompleted = questionIndex < currentQuestionIndex || isAnswered;

                        return (
                            <PaginationItem
                                {...item}
                                sx={{
                                    ...item.sx,
                                    '&.Mui-selected': {
                                        backgroundColor: isCompleted
                                            ? theme.palette.success.main
                                            : theme.palette.primary.main,
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: isCompleted
                                                ? theme.palette.success.dark
                                                : theme.palette.primary.dark,
                                        },
                                    },
                                    '&:not(.Mui-selected)': {
                                        backgroundColor: isCompleted
                                            ? theme.palette.success.light
                                            : theme.palette.background.default,
                                        color: isCompleted
                                            ? theme.palette.success.contrastText
                                            : theme.palette.text.primary,
                                        '&:hover': {
                                            backgroundColor: isCompleted
                                                ? theme.palette.success.main
                                                : theme.palette.grey[200],
                                            color: isCompleted
                                                ? 'white'
                                                : theme.palette.text.primary,
                                        },
                                    },
                                }}
                            />
                        );
                    }}
                />
            </Box>

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



            {/* Submit Button when Complete */}
            {isComplete && (
                <Box sx={{ my: 3, textAlign: 'center' }}>
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