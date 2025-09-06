import { Psychology as AIcon, PlayArrow, Search } from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    CircularProgress,
    InputAdornment,
    TextField,
    Typography
} from "@mui/material";
import React, { useEffect, useState } from "react";
import ApiClient from "../../config/ApiClient";
import { PromptTemplates } from "../types/types";

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
                        onClick={() => onTemplateSelect(template)}
                    >
                        <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                <Typography variant="h6" component="div">
                                    {template.purpose}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 0.5 }}>
                                    <Chip
                                        label={template.model || "gpt-4o-mini"}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={template.response_format || "text"}
                                        size="small"
                                        variant="outlined"
                                        color={getPurposeColor(template.purpose) as any}
                                    />
                                </Box>
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {truncateText(template.prompt)}
                            </Typography>

                            {template.instructions && (
                                <Typography variant="body2" sx={{
                                    fontStyle: "italic",
                                    color: "text.secondary",
                                    mb: 1,
                                    p: 1,
                                    bgcolor: "action.hover",
                                    borderRadius: 1
                                }}>
                                    <strong>Instructions:</strong> {truncateText(template.instructions, 150)}
                                </Typography>
                            )}

                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                <Chip
                                    label={template.status}
                                    size="small"
                                    color={template.status === "active" ? "success" : "default"}
                                />
                                <Chip
                                    label={new Date(template.created_at).toLocaleDateString()}
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>
                        </CardContent>

                        <CardActions>
                            <Button
                                size="small"
                                startIcon={<PlayArrow />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTemplateSelect(template);
                                }}
                            >
                                Select & Test
                            </Button>
                        </CardActions>
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
