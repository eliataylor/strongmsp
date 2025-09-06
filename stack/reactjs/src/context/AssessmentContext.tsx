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
    loadAssessment: (assessmentId: number) => Promise<void>;
    submitResponse: (questionId: number, response: number, responseText?: string) => Promise<boolean>;
    goToNextQuestion: () => void;
    goToPreviousQuestion: () => void;
    goToQuestion: (index: number) => void;
    submitAllResponses: () => Promise<boolean>;
    resetAssessment: () => void;
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

    const totalQuestions = questions.length;
    const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

    const loadAssessment = async (assessmentId: number) => {
        if (isLoading === true) return;
        setIsLoading(true);
        setError(null);

        try {
            const response: HttpResponse<AssessmentData> = await ApiClient.get(`/api/assessments/${assessmentId}`);

            if (response.success && response.data) {
                // Extract questions from the assessment
                const assessmentQuestions = response.data.questions || [];
                setTitle(response.data.title)
                // Note: description is not available in AssessmentData type
                setDescription("")
                setQuestions(assessmentQuestions);
                setCurrentQuestionIndex(0);
                setResponses([]);
            } else {
                throw new Error(response.error || 'Failed to load assessment');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load assessment');
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
            return true;
        } catch (err) {
            console.error('Error submitting response:', err);
            setError((err as any)?.message || 'Failed to submit response');
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
            setError(err.message || 'Failed to submit responses');
            console.error('Error submitting responses:', err);
            return false;
        } finally {
            setIsLoading(false);
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
        loadAssessment,
        submitResponse,
        goToNextQuestion,
        goToPreviousQuestion,
        goToQuestion,
        submitAllResponses,
        resetAssessment,
    };

    return (
        <AssessmentContext.Provider value={value}>
            {children}
        </AssessmentContext.Provider>
    );
};
