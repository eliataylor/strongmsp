import {
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
    Grid,
    Paper,
    TextField,
    Typography
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import ApiClient from "../../config/ApiClient";
import AgentResponseScreen from "../../screens/AgentResponseScreen";
import AutocompleteField from "../forming/AutocompleteField";
import { AgentResponses, PromptTemplates, RelEntity, StreamChunk } from "../types/types";
import { PromptTemplateSelector } from "./index";
import { getPurposeColor, getPurposeDisplay } from "./PromptTemplateSelector";

const PromptTester: React.FC = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplates | null>(null);
    const [messageBody, setMessageBody] = useState<string>("");
    const [selectedUser, setSelectedUser] = useState<RelEntity<"Users"> | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<string>("");
    const [agentResponseId, setAgentResponseId] = useState<number | null>(null);
    const [agentResponse, setAgentResponse] = useState<AgentResponses | null>(null);

    // Refs for streaming
    const aiResponseRef = useRef("");
    const agentResponseIdRef = useRef<number | null>(null);

    // Function to fetch complete AgentResponses object
    const fetchAgentResponse = async (id: number) => {
        try {
            const response = await ApiClient.get(`/api/agent-responses/${id}/`);
            if (response.success && response.data) {
                setAgentResponse(response.data as AgentResponses);
            }
        } catch (error) {
            console.error("Failed to fetch agent response:", error);
        }
    };

    const handleTest = () => {
        if (!selectedTemplate) {
            setError("Please select a prompt template");
            return;
        }

        if (!selectedUser) {
            setError("Please select a User");
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
        setAgentResponse(null);

        const testData: any = {
            message_body: messageBody
        };

        if (selectedUser) {
            testData.athlete_id = selectedUser.id;
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
                            // Fetch the complete AgentResponses object
                            fetchAgentResponse(chunk.agent_response_id);
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
        setAgentResponse(null);
    };

    const handleUserSelect = (user: RelEntity<"Users"> | null, field_name: string) => {
        setSelectedUser(user);
        setError(null);
    };

    return (
        <Box>

            <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} >
                    <PromptTemplateSelector
                        onTemplateSelect={handleTemplateSelect}
                        selectedTemplate={selectedTemplate}
                    />
                    {selectedTemplate && (
                        <Paper sx={{ p: 3, mb: 3 }}>

                            <Box>
                                <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="h4" >
                                        {selectedTemplate.author.str}
                                    </Typography>
                                    <Chip label={getPurposeDisplay(selectedTemplate.purpose)} size="small"
                                        color={getPurposeColor(selectedTemplate.purpose) as any} />
                                </Box>

                                {selectedTemplate.instructions && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>
                                            <strong>Instructions:</strong> {selectedTemplate.instructions}
                                        </Typography>
                                    </Box>
                                )}
                                {selectedTemplate.prompt && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>
                                            <strong>Prompt:</strong> {selectedTemplate.prompt}
                                        </Typography>
                                    </Box>
                                )}

                                <AutocompleteField
                                    type="Users"
                                    search_fields={["username", "email", "first_name", "last_name"]}
                                    image_field={undefined}
                                    field_name="user"
                                    field_label="Athelete"
                                    query_filters="group=athletes"
                                    selected={selectedUser}
                                    onSelect={handleUserSelect}
                                />

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Message Body"
                                    placeholder="Enter the message content to test with this template..."
                                    value={messageBody}
                                    onChange={(e) => setMessageBody(e.target.value)}
                                    disabled={loading}
                                    sx={{ my: 2 }}
                                />

                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Available Tokens (use double curly braces):
                                    </Typography>
                                    <Typography variant="body2" component="div">
                                        • <strong>{`{{athlete_name}}`}</strong> - Selected athlete's full name<br />
                                        • <strong>{`{{assessment_aggregated}}`}</strong> - Aggregated assessment results<br />
                                        • <strong>{`{{assessment_responses}}`}</strong> - Detailed assessment responses<br />
                                        • <strong>{`{{lessonpackage}}`}</strong> - Most recent lesson package response<br />
                                        • <strong>{`{{12sessions}}`}</strong> - Most recent 12-sessions response<br />
                                        • <strong>{`{{talkingpoints}}`}</strong> - Most recent talking points response<br />
                                        • <strong>{`{{feedbackreport}}`}</strong> - Most recent feedback report response<br />
                                        • <strong>{`{{parentemail}}`}</strong> - Most recent parent email response
                                    </Typography>
                                </Alert>

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
                                    disabled={loading || !selectedTemplate || !selectedUser || !messageBody.trim()}
                                    fullWidth
                                >
                                    {loading ? "Testing..." : "Test Template"}
                                </Button>
                            </Box>
                        </Paper>
                    )}
                </Grid>
            </Grid>

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
                <>
                    <Divider sx={{ mb: 2 }} />
                    {agentResponse ? (
                        <AgentResponseScreen entity={agentResponse} />
                    ) : (
                        <>
                            <ReactMarkdown>{aiResponse}</ReactMarkdown>
                            {agentResponseId && (
                                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Response ID: {agentResponseId} | Saved to database
                                    </Typography>
                                </Box>
                            )}
                        </>
                    )}
                </>
            )}

        </Box>
    );
};

export default PromptTester;
