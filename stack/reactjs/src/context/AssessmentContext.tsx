import React, { createContext, ReactNode, useContext, useState } from 'react';
import ApiClient, { HttpResponse } from '../config/ApiClient';
import { AssessmentData, Questions } from "../object-actions/types/types";

export interface AssessmentResponse {
    question: number;
    response: number;
    response_text?: string;
    author?: number; // Optional author ID for the API
}

interface AssessmentContextType {
    title: string;
    description: string;
    questions: Questions[];
    currentQuestionIndex: number;
    responses: AssessmentResponse[];
    isLoading: boolean;
    error: string | null;
    progress: number;
    totalQuestions: number;
    isComplete: boolean;
    answeredQuestions: number;
    loadAssessment: (assessmentId: number) => Promise<void>;
    submitResponse: (questionId: number, response: number, responseText?: string) => Promise<boolean>;
    goToNextQuestion: () => void;
    goToPreviousQuestion: () => void;
    goToQuestion: (index: number) => void;
    submitAllResponses: () => Promise<boolean>;
    resetAssessment: () => void;
    retryLastAction: () => Promise<void>;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const useAssessment = () => {
    const context = useContext(AssessmentContext);
    if (!context) {
        throw new Error('useAssessment must be used within an AssessmentProvider');
    }
    return context;
};

interface AssessmentProviderProps {
    children: ReactNode;
}

export const AssessmentProvider: React.FC<AssessmentProviderProps> = ({ children }) => {
    const [questions, setQuestions] = useState<Questions[]>([]);
    const [title, setTitle] = useState<string>("Generic Health Assesssment")
    const [description, setDescription] = useState<string>("")
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState<AssessmentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastAction, setLastAction] = useState<(() => Promise<any>) | null>(null);

    const totalQuestions = questions.length;
    const answeredQuestions = responses.length;
    const isComplete = totalQuestions > 0 && answeredQuestions === totalQuestions;
    const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    const loadAssessment = async (assessmentId: number) => {
        if (isLoading === true) return;
        setIsLoading(true);
        setError(null);
        setLastAction(() => () => loadAssessment(assessmentId));

        try {
            const response: HttpResponse<AssessmentData> = await ApiClient.get(`/api/assessments/${assessmentId}`);

            if (response.success && response.data) {
                // Extract questions from the assessment
                const assessmentQuestions = response.data.questions || [];
                setTitle(response.data.title);
                setDescription(response.data.description || "");
                setQuestions(assessmentQuestions);

                // Restore existing responses from the API
                const existingResponses: AssessmentResponse[] = [];
                assessmentQuestions.forEach((question: any) => {
                    if (question.response !== undefined && question.response !== null) {
                        existingResponses.push({
                            question: question.id,
                            response: Number(question.response),
                        });
                    }
                });

                setResponses(existingResponses);

                // Find the first unanswered question or start from the beginning
                const firstUnansweredIndex = assessmentQuestions.findIndex(
                    (q: any) => q.response === undefined || q.response === null
                );
                setCurrentQuestionIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
            } else {
                throw new Error(response.error || 'Failed to load assessment');
            }
        } catch (err: any) {
            let errorMessage = 'Failed to load assessment';

            if (err.response?.status === 403) {
                errorMessage = 'You do not have access to this assessment. Please check your payment assignments.';
            } else if (err.response?.status === 401) {
                errorMessage = 'Please log in to access this assessment.';
            } else if (err.response?.status === 404) {
                errorMessage = 'Assessment not found.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            console.error('Error loading assessment:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const submitResponse = async (questionId: number, response: number, responseText?: string): Promise<boolean> => {
        try {
            // Persist immediately to backend per submission
            const payload: any = { question: questionId };
            // EITHER response OR response_text is required; we prefer numeric response here
            if (typeof response === 'number') {
                payload.response = response;
            } else if (responseText) {
                payload.response_text = responseText;
            }
            const result = await ApiClient.post('/api/question-responses/', payload);
            if (!result.success) {
                throw new Error(result.error || 'Failed to submit response');
            }

            // Mirror locally
            setResponses(prev => {
                const existingIndex = prev.findIndex(r => r.question === questionId);
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = { question: questionId, response };
                    return updated;
                } else {
                    return [...prev, { question: questionId, response }];
                }
            });

            // Clear any previous errors on successful submission
            setError(null);
            return true;
        } catch (err: any) {
            let errorMessage = 'Failed to submit response';

            if (err.response?.status === 400) {
                errorMessage = 'Invalid response. Please check your answer and try again.';
            } else if (err.response?.status === 401) {
                errorMessage = 'Please log in to submit responses.';
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to submit responses for this assessment.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            console.error('Error submitting response:', err);
            setError(errorMessage);
            return false;
        }
    };

    const goToNextQuestion = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const goToQuestion = (index: number) => {
        if (index >= 0 && index < totalQuestions) {
            setCurrentQuestionIndex(index);
        }
    };

    const submitAllResponses = async (): Promise<boolean> => {
        if (responses.length === 0) return false;

        setIsLoading(true);
        setError(null);
        setLastAction(() => () => submitAllResponses());

        try {
            // Submit each response individually
            for (const response of responses) {
                // Prepare the data in the format expected by the QuestionResponsesViewSet
                const responseData = {
                    question: response.question,
                    response: response.response,
                    // Note: author will be set by the backend based on the authenticated user
                };

                const result = await ApiClient.post('/api/question-responses/', responseData);
                if (!result.success) {
                    throw new Error(`Failed to submit response for question ${response.question}: ${result.error}`);
                }
            }
            return true;
        } catch (err: any) {
            let errorMessage = 'Failed to submit responses';

            if (err.response?.status === 400) {
                errorMessage = 'Some responses are invalid. Please check your answers and try again.';
            } else if (err.response?.status === 401) {
                errorMessage = 'Please log in to submit responses.';
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to submit responses for this assessment.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            console.error('Error submitting responses:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const retryLastAction = async () => {
        if (lastAction) {
            await lastAction();
        }
    };

    const resetAssessment = () => {
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setResponses([]);
        setError(null);
    };

    const value: AssessmentContextType = {
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
        retryLastAction,
    };

    return (
        <AssessmentContext.Provider value={value}>
            {children}
        </AssessmentContext.Provider>
    );
};
