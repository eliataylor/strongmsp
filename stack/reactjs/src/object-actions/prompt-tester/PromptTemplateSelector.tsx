import { Psychology as AIcon, PlayArrow, Search } from "@mui/icons-material";
import {
    Alert,
    Box,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    IconButton,
    InputAdornment,
    TextField,
    Typography
} from "@mui/material";
import React, { useEffect, useState } from "react";
import ApiClient from "../../config/ApiClient";
import { PromptTemplates } from "../types/types";


export const getPurposeColor = (purpose: string) => {
    const colors: { [key: string]: string } = {
        "lessonpackage": "primary",
        "12sessions": "secondary",
        "talkingpoints": "success",
        "feedbackreport": "warning",
        "parentemail": "info"
    };
    return colors[purpose] || "default";
};

export const getPurposeDisplay = (purpose: string) => {
    const colors: { [key: string]: string } = {
        "lessonpackage": "Lesson Package",
        "12sessions": "12-Sessions",
        "talkingpoints": "Talking Points",
        "feedbackreport": "Feedback Report",
        "parentemail": "Parent Email"
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
    const [searchTerm, setSearchTerm] = useState<string>("");

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

    const filteredTemplates = templates.filter(template =>
        template.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.instructions && template.instructions.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
            <TextField
                fullWidth
                placeholder="Search templates by purpose, prompt, or instructions..."
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
                {filteredTemplates.length} template(s) found
            </Typography>

            <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                {filteredTemplates.map((template) => (
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
                    >
                        <CardHeader
                            title={getPurposeDisplay(template.purpose)}
                            subheader={`Created: ${new Date(template.created_at).toLocaleDateString()}`}
                            color={getPurposeColor(template.purpose) as any}
                            action={
                                <IconButton onClick={(e) => {
                                    e.stopPropagation();
                                    onTemplateSelect(template);
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
            </Box>

            {filteredTemplates.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    <AIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1">
                        {searchTerm ? "No templates match your search" : "No prompt templates available"}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default PromptTemplateSelector;
