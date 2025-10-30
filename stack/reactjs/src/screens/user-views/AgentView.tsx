import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import React from "react";
import EntityCard from "../../object-actions/components/EntityCard";
import { ModelType } from "../../object-actions/types/types";

interface AgentViewProps {
    userProfile: ModelType<"Users">;
    questionResponseStats: {
        user_id: number;
        category_stats: Array<{
            category: string;
            total_response: number;
            response_count: number;
            average_response: number;
        }>;
        total_categories: number;
    } | null;
    expanded: string | false;
    handleChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

const AgentView: React.FC<AgentViewProps> = ({
    userProfile,
    questionResponseStats,
    expanded,
    handleChange
}) => {
    return (
        <Box>
            <EntityCard entity={userProfile} />

            {/* Agent-specific content */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Agent Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage client relationships and track business metrics.
                </Typography>
            </Box>
        </Box>
    );
};

export default AgentView;
