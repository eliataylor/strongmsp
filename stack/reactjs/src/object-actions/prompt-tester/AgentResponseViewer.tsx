import {
    Psychology as AIcon,
    ContentCopy,
    ExpandMore,
    Person,
    Refresh,
    Schedule,
    Search
} from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    InputAdornment,
    TextField,
    Typography
} from "@mui/material";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import ApiClient from "../../config/ApiClient";
import { AgentResponses } from "../types/types";

interface AgentResponseViewerProps {
    templateId?: number;
    onResponseSelect: (response: AgentResponses) => void;
}

const AgentResponseViewer: React.FC<AgentResponseViewerProps> = ({
    templateId,
    onResponseSelect
}) => {
    const [responses, setResponses] = useState<AgentResponses[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");

    useEffect(() => {
        fetchResponses();
    }, [templateId]);

    const fetchResponses = async () => {
        try {
            setLoading(true);
            let url = "/api/agent-responses/";

            if (templateId) {
                url += `?template_id=${templateId}`;
            }

            const response = await ApiClient.get(url);

            if (response.success && response.data) {
                const data = response.data as any;
                setResponses(data.results || data);
            } else {
                setError("Failed to load agent responses");
            }
        } catch (err) {
            setError(`Error loading responses: ${err?.toString()}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredResponses = responses.filter(response =>
        response.message_body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.ai_response.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (response.athlete && response.athlete.str.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getPurposeColor = (purpose: string) => {
        const colors: { [key: string]: string } = {
            "lessonpackage": "primary",
            "12sessions": "secondary",
            "talkingpoints": "success",
            "feedbackreport": "warning",
            "parentemail": "info"
        };
        return colors[purpose] || "default";
    };

    const truncateText = (text: string, maxLength = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">
                    Previous Responses
                    {templateId && " (Filtered by Template)"}
                </Typography>
                <Button
                    startIcon={<Refresh />}
                    onClick={fetchResponses}
                    size="small"
                >
                    Refresh
                </Button>
            </Box>

            <TextField
                fullWidth
                placeholder="Search responses by content, purpose, or athlete..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {filteredResponses.length} response(s) found
            </Typography>

            <Box sx={{ maxHeight: 600, overflowY: "auto" }}>
                {filteredResponses.map((response) => (
                    <Card key={response.id} sx={{ mb: 2 }}>
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Box sx={{ width: "100%", pr: 2 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                        <Typography variant="h6" component="div">
                                            {response.purpose}
                                        </Typography>
                                        <Box sx={{ display: "flex", gap: 0.5 }}>
                                            <Chip
                                                label={response.prompt_template.entity?.model || "gpt-4o-mini"}
                                                size="small"
                                                variant="outlined"
                                            />
                                            <Chip
                                                label={response.prompt_template.entity?.response_format || "text"}
                                                size="small"
                                                variant="outlined"
                                                color={getPurposeColor(response.purpose) as any}
                                            />
                                        </Box>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Input:</strong> {truncateText(response.message_body)}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Output:</strong> {truncateText(response.ai_response)}
                                    </Typography>

                                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                                        {response.athlete && (
                                            <Chip
                                                icon={<Person />}
                                                label={response.athlete.str}
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                        <Chip
                                            icon={<Schedule />}
                                            label={new Date(response.created_at).toLocaleString()}
                                            size="small"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`ID: ${response.id}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                </Box>
                            </AccordionSummary>

                            <AccordionDetails>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Input Message:
                                        </Typography>
                                        <Box sx={{
                                            p: 2,
                                            bgcolor: "action.hover",
                                            borderRadius: 1,
                                            mb: 2,
                                            position: "relative"
                                        }}>
                                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                                {response.message_body}
                                            </Typography>
                                            <Button
                                                size="small"
                                                startIcon={<ContentCopy />}
                                                onClick={() => copyToClipboard(response.message_body)}
                                                sx={{ position: "absolute", top: 8, right: 8 }}
                                            >
                                                Copy
                                            </Button>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            AI Response:
                                        </Typography>
                                        <Box sx={{
                                            p: 2,
                                            bgcolor: "action.hover",
                                            borderRadius: 1,
                                            mb: 2,
                                            position: "relative"
                                        }}>
                                            <ReactMarkdown>{response.ai_response}</ReactMarkdown>
                                            <Button
                                                size="small"
                                                startIcon={<ContentCopy />}
                                                onClick={() => copyToClipboard(response.ai_response)}
                                                sx={{ position: "absolute", top: 8, right: 8 }}
                                            >
                                                Copy
                                            </Button>
                                        </Box>
                                    </Grid>

                                    {response.ai_reasoning && (
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                AI Reasoning:
                                            </Typography>
                                            <Box sx={{
                                                p: 2,
                                                bgcolor: "action.hover",
                                                borderRadius: 1,
                                                position: "relative"
                                            }}>
                                                <ReactMarkdown>{response.ai_reasoning}</ReactMarkdown>
                                                <Button
                                                    size="small"
                                                    startIcon={<ContentCopy />}
                                                    onClick={() => copyToClipboard(response.ai_reasoning || "")}
                                                    sx={{ position: "absolute", top: 8, right: 8 }}
                                                >
                                                    Copy
                                                </Button>
                                            </Box>
                                        </Grid>
                                    )}

                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => onResponseSelect(response)}
                                            >
                                                Use This Response
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                    </Card>
                ))}
            </Box>

            {filteredResponses.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    <AIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1">
                        {searchTerm ? "No responses match your search" : "No responses available"}
                    </Typography>
                    {templateId && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Try testing a template to generate responses
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default AgentResponseViewer;
