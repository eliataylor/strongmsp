import {
    Psychology as AIcon,
    FormatQuote,
    ListAlt,
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
    Grid,
    Paper,
    TextField,
    Typography
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../../allauth/auth";
import ApiClient from "../../config/ApiClient";
import { AgentResponses, PromptTemplates, StreamChunk } from "../types/types";
import { AgentResponseViewer, PromptTemplateSelector } from "./index";
import { getPurposeColor, getPurposeDisplay } from "./PromptTemplateSelector";

const PromptTester: React.FC = () => {
    const { enqueueSnackbar } = useSnackbar();
    const me = useAuth()?.data?.user;
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplates | null>(null);
    const [messageBody, setMessageBody] = useState<string>("");
    const [athleteId, setAthleteId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<string>("");
    const [agentResponseId, setAgentResponseId] = useState<number | null>(null);
    const [showResponses, setShowResponses] = useState<boolean>(false);

    // Refs for streaming
    const aiResponseRef = useRef("");
    const agentResponseIdRef = useRef<number | null>(null);

    const handleTest = () => {
        if (!selectedTemplate) {
            setError("Please select a prompt template");
            return;
        }

        if (!athleteId) {
            setError("Please select an Athlete");
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
            message_body: messageBody
        };

        if (athleteId) {
            testData.athlete_id = athleteId;
        }

        try {
            ApiClient.stream<StreamChunk>(`/api/prompt-templates/${selectedTemplate.id}/test/`, testData,
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

    const handleTemplateSelect = (template: PromptTemplates) => {
        setSelectedTemplate(template);
        setError(null);
        setAiResponse("");
        setAgentResponseId(null);
    };

    return (
        <Box>
            <Grid container justifyContent={"space-between"} wrap={"nowrap"} alignItems={"center"}>
                <Grid item>
                    <Typography variant="h4" component="h1">
                        Test AI Prompt Templates
                    </Typography>
                    <Typography variant="subtitle2" component="h2">
                        Test and evaluate AI prompt templates with real-time streaming responses
                    </Typography>
                </Grid>
                <Grid item>
                    <Button
                        variant="contained"
                        size="small"
                        color="secondary"
                        startIcon={<ListAlt />}
                        onClick={() => setShowResponses(!showResponses)}
                    >
                        {showResponses ? "Hide Responses" : "View Responses"}
                    </Button>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 2 }}>
                {/* Left Column - Template Selection and Input */}
                <Grid item xs={12} >
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Select Template & Input
                        </Typography>

                        <PromptTemplateSelector
                            onTemplateSelect={handleTemplateSelect}
                            selectedTemplate={selectedTemplate}
                        />

                        {selectedTemplate && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Template Details:
                                </Typography>
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                                    <Chip label={getPurposeDisplay(selectedTemplate.purpose)} size="small"
                                        color={getPurposeColor(selectedTemplate.purpose) as any} />
                                </Box>

                                {selectedTemplate.instructions && (
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        <Typography variant="body2">
                                            <strong>Instructions:</strong> {selectedTemplate.instructions}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Prompt:</strong> {selectedTemplate.prompt}
                                        </Typography>
                                    </Alert>
                                )}

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Message Body"
                                    placeholder="Enter the message content to test with this template..."
                                    value={messageBody}
                                    onChange={(e) => setMessageBody(e.target.value)}
                                    disabled={loading}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Athlete ID"
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
                                    disabled={loading || !selectedTemplate || !messageBody.trim()}
                                    fullWidth
                                >
                                    {loading ? "Testing..." : "Test Template"}
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Right Column - AI Response */}
                <Grid item xs={12} >
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            AI Response
                        </Typography>

                        {selectedTemplate && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Testing: <strong>{selectedTemplate.purpose}</strong>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Model: {selectedTemplate.model || "gpt-4o-mini"} |
                                    Format: {selectedTemplate.response_format || "text"}
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

                        {!loading && !aiResponse && selectedTemplate && (
                            <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                                <AIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                <Typography variant="body1">
                                    Click "Test Template" to generate an AI response
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Agent Responses Viewer */}
            {showResponses && (
                <Box sx={{ mt: 3 }}>
                    <AgentResponseViewer
                        templateId={selectedTemplate?.id ? (typeof selectedTemplate.id === 'string' ? parseInt(selectedTemplate.id) : selectedTemplate.id) : undefined}
                        onResponseSelect={(response: AgentResponses) => {
                            setMessageBody(response.message_body);
                            setAiResponse(response.ai_response);
                            setAgentResponseId(typeof response.id === 'string' ? parseInt(response.id) : response.id);
                        }}
                    />
                </Box>
            )}

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

export default PromptTester;
