import { Box, Paper, Typography } from '@mui/material';
import React from 'react';
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer
} from 'recharts';

interface CategoryStat {
    category: string;
    total_response: number;
    response_count: number;
    average_response: number;
}

interface SpiderChartProps {
    data: CategoryStat[];
    title?: string;
    showLegend?: boolean;
    height?: number;
}

const SpiderChart: React.FC<SpiderChartProps> = ({
    data,
    title = undefined,
    showLegend = true,
    height = 400
}) => {
    // Transform data for the radar chart
    const chartData = data.map(item => ({
        category: item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        average_response: item.average_response,
        total_response: item.total_response,
        response_count: item.response_count
    }));

    // Find the maximum value to set appropriate scale
    const maxValue = Math.max(...data.map(item => item.average_response), 5);

    if (!data || data.length === 0) {
        return (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                    No data available for spider chart
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper>
            {title && (
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                    {title}
                </Typography>
            )}
            <Box sx={{ width: '100%', height: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                        <PolarGrid />
                        <PolarAngleAxis
                            dataKey="category"
                            tick={{ fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, maxValue]}
                            tick={{ fontSize: 10 }}
                        />
                        <Radar
                            name="Average Response"
                            dataKey="average_response"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.3}
                            strokeWidth={2}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </Box>

            {showLegend && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                    {data.map((item, index) => (
                        <Box key={index} sx={{ textAlign: 'center', minWidth: 120 }}>
                            <Typography variant="subtitle2" color="primary">
                                {item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Avg: {item.average_response.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ({item.response_count} responses)
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Paper>
    );
};

export default SpiderChart;
