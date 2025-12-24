import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Paper,
  Typography,
  Box,
  Chip,
  useTheme,
} from '@mui/material';

interface TypeBreakdownChartProps {
  records: any[];
}

const TypeBreakdownChart: React.FC<TypeBreakdownChartProps> = ({ records }) => {
  const theme = useTheme();

  const processData = () => {
    const typeMap = new Map();
    
    records.forEach(record => {
      const type = record.type || 'Unknown';
      if (!typeMap.has(type)) {
        // Determine risk level
        let riskLevel = 'Medium';
        if (type.includes('HN') || type.includes('Hot Naked')) {
          riskLevel = 'High';
        } else if (type.includes('H')) {
          riskLevel = 'Medium';
        } else if (type.includes('C')) {
          riskLevel = 'Low';
        }
        
        typeMap.set(type, {
          count: 0,
          riskLevel,
          color: riskLevel === 'High' ? theme.palette.error.main :
                 riskLevel === 'Medium' ? theme.palette.warning.main :
                 theme.palette.success.main,
        });
      }
      
      const typeData = typeMap.get(type);
      typeData.count++;
    });
    
    return Array.from(typeMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.count,
        riskLevel: data.riskLevel,
        color: data.color,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const data = processData();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const riskCounts = {
    High: data.filter(item => item.riskLevel === 'High').reduce((sum, item) => sum + item.value, 0),
    Medium: data.filter(item => item.riskLevel === 'Medium').reduce((sum, item) => sum + item.value, 0),
    Low: data.filter(item => item.riskLevel === 'Low').reduce((sum, item) => sum + item.value, 0),
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {payload[0].name}
          </Typography>
          <Typography variant="body2" color="primary">
            {payload[0].value} permits
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {((payload[0].value / total) * 100).toFixed(1)}% of total
          </Typography>
          <Chip 
            label={payload[0].payload.riskLevel + ' Risk'}
            size="small"
            color={payload[0].payload.riskLevel === 'High' ? 'error' : 
                   payload[0].payload.riskLevel === 'Medium' ? 'warning' : 'success'}
            sx={{ mt: 0.5 }}
          />
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Work Type Breakdown
      </Typography>
      
      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              RISK DISTRIBUTION:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.error.main, borderRadius: '50%' }} />
                  <Typography variant="body2">High Risk (HN + Hot Naked Flame)</Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {riskCounts.High} ({total > 0 ? ((riskCounts.High / total) * 100).toFixed(0) : 0}%)
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.warning.main, borderRadius: '50%' }} />
                  <Typography variant="body2">Medium Risk (H)</Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {riskCounts.Medium} ({total > 0 ? ((riskCounts.Medium / total) * 100).toFixed(0) : 0}%)
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.success.main, borderRadius: '50%' }} />
                  <Typography variant="body2">Low Risk (C)</Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {riskCounts.Low} ({total > 0 ? ((riskCounts.Low / total) * 100).toFixed(0) : 0}%)
                </Typography>
              </Box>
            </Box>
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
            No work type data available
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TypeBreakdownChart;