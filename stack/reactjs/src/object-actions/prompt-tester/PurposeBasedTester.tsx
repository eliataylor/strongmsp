import {
    Psychology as AIcon,
    FormatQuote,
    PlayArrow
} from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Fab,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../../allauth/auth";
import ApiClient from "../../config/ApiClient";
import { PurposeOption, StreamChunk } from "../types/types";

const PURPOSE_OPTIONS: PurposeOption[] = [
    {
        value: "lessonpackage",
        label: "Lesson Package",
        description: "Generate personalized lesson packages for athletes",
        responseFormat: "JSON",
        model: "gpt-4o-mini"
    },
    {
        value: "12sessions",
        label: "12-Session Program",
        description: "Create comprehensive 12-session training programs",
        responseFormat: "JSON",
        model: "gpt-4o-mini"
    },
    {
        value: "talkingpoints",
        label: "Talking Points",
        description: "Generate talking points for parent meetings",
        responseFormat: "Text",
        model: "gpt-4o-mini"
    },
    {
        value: "feedbackreport",
        label: "Feedback Report",
        description: "Create performance feedback reports",
        responseFormat: "Text",
        model: "gpt-4o-mini"
    },
    {
        value: "parentemail",
        label: "Parent Email",
        description: "Draft professional emails to parents",
        responseFormat: "Text",
        model: "gpt-4o-mini"
    }
];

const PurposeBasedTester: React.FC = () => {
    const { enqueueSnackbar } = useSnackbar();
    const me = useAuth()?.data?.user;
    const [selectedPurpose, setSelectedPurpose] = useState<string>("");
    const [messageBody, setMessageBody] = useState<string>("");
    const [athleteId, setAthleteId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<string>("");
    const [agentResponseId, setAgentResponseId] = useState<number | null>(null);

    // Refs for streaming
    const aiResponseRef = useRef("");
    const agentResponseIdRef = useRef<number | null>(null);

    const selectedPurposeOption = PURPOSE_OPTIONS.find(option => option.value === selectedPurpose);

    const handleTest = () => {
        if (!selectedPurpose) {
            setError("Please select a purpose");
            return;
        }

        if (!messageBody.trim()) {
            setError("Please enter a message body");
            return;
        }

        setLoading(true);
        setError(null);
        setAiResponse("");
        setAgentResponseId(null);

        const testData: any = {
            purpose: selectedPurpose,
            message_body: messageBody
        };

        if (athleteId) {
            testData.athlete_id = athleteId;
        }

        try {
            ApiClient.stream<StreamChunk>(`/api/prompt-templates/test-by-purpose/`, testData,
                (chunk) => {
                    if (chunk.error) {
                        setError(chunk.error);
                    } else if (chunk.type === "error") {
                        console.error("STREAM ERROR ", chunk);
                        setError(chunk.content as string);
                    } else if (chunk.type === "keep_alive") {
                        enqueueSnackbar("Still working...", { variant: "info" });
                    } else if (chunk.type === "message" && chunk.content) {
                        setAiResponse((prev) => {
                            const newResponse = prev + chunk.content as string;
                            aiResponseRef.current = newResponse;
                            return newResponse;
                        });
                    } else if (chunk.type === "done") {
                        if (chunk.agent_response_id) {
                            setAgentResponseId(chunk.agent_response_id);
                            agentResponseIdRef.current = chunk.agent_response_id;
                        }
                        if (chunk.ai_response) {
                            setAiResponse(chunk.ai_response);
                            aiResponseRef.current = chunk.ai_response;
                        }
                        enqueueSnackbar("Response generated successfully!", { variant: "success" });
                    }
                },
                (error) => {
                    console.error(error);
                    setError(error);
                },
                () => {
                    setLoading(false);
                }
            );
        } catch (err) {
            setError(`An unexpected error occurred: ${err?.toString()}`);
            setLoading(false);
        }
    };

    const handlePurposeChange = (purpose: string) => {
        setSelectedPurpose(purpose);
        setError(null);
        setAiResponse("");
        setAgentResponseId(null);
    };

    return (
        <Box>
            <Grid container justifyContent={"space-between"} wrap={"nowrap"} alignItems={"center"}>
                <Grid item>
                    <Typography variant="h4" component="h1">
                        AI Prompt Testing by Purpose
                    </Typography>
                    <Typography variant="subtitle2" component="h2">
                        Select a purpose and test AI responses with real-time streaming
                    </Typography>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 2 }}>
                {/* Left Column - Purpose Selection and Input */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Select Purpose & Input
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Purpose</InputLabel>
                            <Select
                                value={selectedPurpose}
                                onChange={(e) => handlePurposeChange(e.target.value)}
                                label="Purpose"
                                disabled={loading}
                            >
                                {PURPOSE_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Box>
                                            <Typography variant="body1" fontWeight="medium">
                                                {option.label}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {option.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {selectedPurposeOption && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Purpose Details:
                                </Typography>
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                                    <Chip label={selectedPurposeOption.label} size="small" />
                                    <Chip label={selectedPurposeOption.responseFormat} size="small" />
                                    <Chip label={selectedPurposeOption.model} size="small" />
                                </Box>
                            </Box>
                        )}

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Message Body"
                            placeholder="Enter the message content to test with this purpose..."
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            fullWidth
                            type="number"
                            label="Athlete ID (Optional)"
                            placeholder="Enter athlete ID for personalized responses"
                            value={athleteId || ""}
                            onChange={(e) => setAthleteId(e.target.value ? parseInt(e.target.value) : null)}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={loading ? <CircularProgress size={24} /> : <PlayArrow />}
                            onClick={handleTest}
                            disabled={loading || !selectedPurpose || !messageBody.trim()}
                            fullWidth
                        >
                            {loading ? "Testing..." : "Test by Purpose"}
                        </Button>
                    </Paper>
                </Grid>

                {/* Right Column - AI Response */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            AI Response
                        </Typography>

                        {selectedPurposeOption && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Purpose: <strong>{selectedPurposeOption.label}</strong>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Model: {selectedPurposeOption.model} |
                                    Format: {selectedPurposeOption.responseFormat}
                                </Typography>
                            </Box>
                        )}

                        {loading && (
                            <Box sx={{ textAlign: "center", py: 4 }}>
                                <Typography variant="body1" sx={{ mb: 2, fontStyle: "italic" }}>
                                    <FormatQuote fontSize="small" />
                                    {messageBody}
                                    <FormatQuote fontSize="small" />
                                </Typography>
                                <CircularProgress />
                                <Typography variant="body2" sx={{ mt: 2 }}>
                                    Generating response...
                                </Typography>
                            </Box>
                        )}

                        {aiResponse && (
                            <Box>
                                <Divider sx={{ mb: 2 }} />
                                <ReactMarkdown>{aiResponse}</ReactMarkdown>
                                {agentResponseId && (
                                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Response ID: {agentResponseId} | Saved to database
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {!loading && !aiResponse && selectedPurpose && (
                            <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                                <AIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                <Typography variant="body1">
                                    Click "Test by Purpose" to generate an AI response
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Floating Action Button for loading indicator */}
            {loading && (
                <Fab
                    color="primary"
                    size="small"
                    sx={{
                        position: "fixed",
                        backgroundColor: "transparent",
                        right: 20,
                        bottom: 20
                    }}
                >
                    <CircularProgress color="primary" />
                </Fab>
            )}
        </Box>
    );
};

export default PurposeBasedTester;
