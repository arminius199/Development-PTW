import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Paper,
  Typography,
  Box,
  Chip,
  useTheme,
} from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface PermitsPerDayChartProps {
  records: any[];
}

const PermitsPerDayChart: React.FC<PermitsPerDayChartProps> = ({ records }) => {
  const theme = useTheme();

  const processData = () => {
    const dayMap = new Map();
    
    records.forEach(record => {
      if (!record.day) return;
      const day = record.day.split('T')[0];
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    
    return Array.from(dayMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .slice(-30);
  };

  const data = processData();
  
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const average = data.length > 0 ? total / data.length : 0;
  
  // Calculate trend (last 7 days vs previous 7 days)
  const last7Days = data.slice(-7).reduce((sum, item) => sum + item.count, 0);
  const prev7Days = data.slice(-14, -7).reduce((sum, item) => sum + item.count, 0);
  const trend = prev7Days > 0 ? ((last7Days - prev7Days) / prev7Days) * 100 : 0;

  const getTrendIcon = () => {
    if (trend > 5) return <TrendingUp sx={{ color: theme.palette.success.main }} />;
    if (trend < -5) return <TrendingDown sx={{ color: theme.palette.error.main }} />;
    return <TrendingFlat sx={{ color: theme.palette.warning.main }} />;
  };

  const getTrendColor = () => {
    if (trend > 5) return 'success';
    if (trend < -5) return 'error';
    return 'warning';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      return (
        <Paper sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Typography>
          <Typography variant="body2" color="primary">
            {payload[0].value} permits
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Permits Per Day (Last 30 days)
        </Typography>
        <Chip
          icon={getTrendIcon()}
          label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
          color={getTrendColor() as any}
          size="small"
          variant="outlined"
        />
      </Box>
      
      {data.length > 0 ? (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Total Permits
              </Typography>
              <Typography variant="h6">
                {total}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Avg Per Day
              </Typography>
              <Typography variant="h6">
                {average.toFixed(1)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Trend
              </Typography>
              <Typography variant="h6" color={getTrendColor()}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </Typography>
            </Box>
          </Box>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={theme.palette.divider}
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                stroke={theme.palette.text.secondary}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                fill={theme.palette.primary.light}
                fillOpacity={0.3}
                activeDot={{ r: 6, strokeWidth: 2, fill: theme.palette.background.paper }}
              />
            </AreaChart>
          </ResponsiveContainer>
          
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              CRITICAL NIGHT WORK: None – all Day shift.
            </Typography>
          </Box>
        </>
      ) : (
        <Box sx={{ 
          height: 300, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}>
          <Typography variant="body1" color="text.secondary">
            No daily data available
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Upload data to see daily trends
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PermitsPerDayChart;