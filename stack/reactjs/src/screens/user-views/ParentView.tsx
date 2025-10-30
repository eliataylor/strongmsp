import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import React from "react";
import EntityCard from "../../object-actions/components/EntityCard";
import { ModelType } from "../../object-actions/types/types";

interface ParentViewProps {
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

const ParentView: React.FC<ParentViewProps> = ({
    userProfile,
    questionResponseStats,
    expanded,
    handleChange
}) => {
    return (
        <Box>
            <EntityCard entity={userProfile} />

            {/* Parent-specific content */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Family Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Monitor your child's progress and manage family activities.
                </Typography>
            </Box>

        </Box>
    );
};

export default ParentView;
