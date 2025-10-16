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

interface AthleteViewProps {
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

const AthleteView: React.FC<AthleteViewProps> = ({
    userProfile,
    stats,
    questionResponseStats,
    expanded,
    handleChange
}) => {
    return (
        <Box>
            <EntityCard entity={userProfile} />

            {/* Athlete-specific content */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Performance Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Track your athletic progress and performance metrics.
                </Typography>
            </Box>

            {/* Question Response Category Stats Spider Chart */}
            {questionResponseStats && questionResponseStats.category_stats.length > 0 && (
                <SpiderChart
                    data={questionResponseStats.category_stats}
                    title="Performance Analysis"
                    height={400}
                />
            )}

            {/* Training and Performance Data */}
            {NAVITEMS.map((item) => {
                if (item.type === "Users") return null;
                return (
                    <Accordion
                        expanded={expanded === item.type}
                        key={`athlete-${item.type}`}
                        onChange={handleChange(item.type)}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`athlete-${item.type}-content`}
                            id={`athlete-${item.type}-header`}
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
                        <AccordionDetails id={`athlete-${item.type}-content`}>
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

export default AthleteView;
