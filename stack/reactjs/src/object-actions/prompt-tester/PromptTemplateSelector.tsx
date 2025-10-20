import { Psychology as AIcon, ExpandLess, ExpandMore, PlayArrow } from "@mui/icons-material";
import {
    Alert,
    Box,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Collapse,
    IconButton,
    Typography
} from "@mui/material";
import React, { useEffect, useState } from "react";
import ApiClient from "../../config/ApiClient";
import { PromptTemplates } from "../types/types";


export const getPurposeColor = (purpose: string) => {
    const colors: { [key: string]: string } = {
        "lesson_plan": "primary",
        "curriculum": "secondary",
        "talking_points": "success",
        "feedback_report": "warning",
        "scheduling_email": "info"
    };
    return colors[purpose] || "default";
};

export const getPurposeDisplay = (purpose: string) => {
    const colors: { [key: string]: string } = {
        "lesson_plan": "Lesson Plan",
        "curriculum": "Curriculum",
        "talking_points": "Talking Points",
        "feedback_report": "Feedback Report",
        "scheduling_email": "Scheduling Email"
    };
    return colors[purpose] || "Default";
};


interface PromptTemplateSelectorProps {
    onTemplateSelect: (template: PromptTemplates) => void;
    selectedTemplate: PromptTemplates | null;
}

const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
    onTemplateSelect,
    selectedTemplate
}) => {
    const [templates, setTemplates] = useState<PromptTemplates[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await ApiClient.get("/api/prompt-templates/");

            if (response.success && response.data) {
                const data = response.data as any;
                setTemplates(data.results || data);
            } else {
                setError("Failed to load prompt templates");
            }
        } catch (err) {
            setError(`Error loading templates: ${err?.toString()}`);
        } finally {
            setLoading(false);
        }
    };


    const truncateText = (text: string, maxLength = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
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
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    p: 1,
                    borderRadius: 1,
                    "&:hover": {
                        bgcolor: "action.hover"
                    }
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Typography variant="h6">
                    Prompt Templates ({templates.length})
                </Typography>
                <IconButton size="small">
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            </Box>

            <Collapse in={isExpanded}>
                <Box id="prompt-template-selector" sx={{ mt: 2 }}>
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            sx={{
                                mb: 2,
                                cursor: "pointer",
                                border: selectedTemplate?.id === template.id ? 2 : 1,
                                borderColor: selectedTemplate?.id === template.id ? "primary.main" : "divider",
                                "&:hover": {
                                    boxShadow: 2,
                                }
                            }}
                            onClick={() => {
                                onTemplateSelect(template);
                                setIsExpanded(false);
                            }}
                        >
                            <CardHeader
                                title={template.author.str}
                                subheader={getPurposeDisplay(template.purpose)}
                                action={
                                    <IconButton onClick={(e) => {
                                        e.stopPropagation();
                                        onTemplateSelect(template);
                                        setIsExpanded(false);
                                    }}>
                                        <PlayArrow />
                                    </IconButton>
                                }
                            />
                            <CardContent>
                                {template.instructions && (
                                    <Typography variant="body2" sx={{
                                        fontStyle: "italic",
                                        color: "text.secondary",
                                        mb: 1,
                                        p: 1,
                                        bgcolor: "action.hover",
                                        borderRadius: 1
                                    }}>
                                        <strong>System Instructions:</strong> {truncateText(template.instructions, 150)}
                                    </Typography>
                                )}

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {truncateText(template.prompt)}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}

                    {templates.length === 0 && (
                        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                            <AIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                            <Typography variant="body1">
                                No prompt templates available
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

export default PromptTemplateSelector;
