import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import React from "react";
import SpiderChart from "../../components/SpiderChart";
import EntityCard from "../../object-actions/components/EntityCard";
import { ModelType, NAVITEMS } from "../../object-actions/types/types";
import EntityList from "../EntityList";

interface AdminViewProps {
    userProfile: ModelType<"Users">;
    stats: { [key: string]: number };
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

const AdminView: React.FC<AdminViewProps> = ({
    userProfile,
    stats,
    questionResponseStats,
    expanded,
    handleChange
}) => {
    return (
        <Box>
            <EntityCard entity={userProfile} />

            {/* Admin-specific content */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    System Administration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage users, content, and system-wide analytics.
                </Typography>
            </Box>

            {/* Question Response Category Stats Spider Chart */}
            {questionResponseStats && questionResponseStats.category_stats.length > 0 && (
                <SpiderChart
                    data={questionResponseStats.category_stats}
                    title="System Analytics"
                    height={400}
                />
            )}

            {/* System-wide Data Management */}
            {NAVITEMS.map((item) => {
                if (item.type === "Users") return null;
                return (
                    <Accordion
                        expanded={expanded === item.type}
                        key={`admin-${item.type}`}
                        onChange={handleChange(item.type)}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`admin-${item.type}-content`}
                            id={`admin-${item.type}-header`}
                            sx={{
                                justifyContent: "space-between",
                                alignContent: "center",
                                alignItems: "center",
                                display: "flex"
                            }}
                        >
                            {typeof stats[item.type] !== "undefined" && (
                                <Typography variant={"subtitle2"} mr={2}>
                                    {stats[item.type]}
                                </Typography>
                            )}

                            <Typography variant={"subtitle2"}>{item.plural}</Typography>
                        </AccordionSummary>
                        <AccordionDetails id={`admin-${item.type}-content`}>
                            <Typography>
                                {expanded === item.type && (
                                    <EntityList author={userProfile.id.toString()} model={item.type} />
                                )}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Box>
    );
};

export default AdminView;
