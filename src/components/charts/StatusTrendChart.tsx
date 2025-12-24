import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';

interface StatusTrendChartProps {
  records: any[];
}

const StatusTrendChart: React.FC<StatusTrendChartProps> = ({ records }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    // Get last 14 days
    const dayMap = new Map<string, Record<string, number>>();
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dayMap.set(dateStr, {
        Active: 0,
        Completed: 0,
        'In Progress': 0,
        Cancelled: 0,
      });
    }

    // Count records per day per status
    records.forEach(record => {
      if (record.day && record.status) {
        const day = record.day.split('T')[0];
        if (dayMap.has(day)) {
          const dayData = dayMap.get(day)!;
          dayData[record.status] = (dayData[record.status] || 0) + 1;
        }
      }
    });

    // Convert to array
    return Array.from(dayMap.entries()).map(([day, statusCounts]) => ({
      day,
      date: new Date(day),
      formattedDate: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...statusCounts,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [records]);

  const statusColors = {
    'Active': theme.palette.success.main,
    'Completed': theme.palette.primary.main,
    'In Progress': theme.palette.info.main,
    'Cancelled': theme.palette.error.main,
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Status Trends (Last 14 Days)
      </Typography>
      
      {chartData.length > 0 ? (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="formattedDate"
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke={theme.palette.text.secondary} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {Object.entries(statusColors).map(([status, color]) => (
                <Line
                  key={status}
                  type="monotone"
                  dataKey={status}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          flexDirection: 'column',
          gap: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            No trend data available
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default StatusTrendChart;