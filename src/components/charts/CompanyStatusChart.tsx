import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Paper,
  Typography,
  Box,
  useTheme,
} from '@mui/material';

interface CompanyStatusChartProps {
  records: any[];
}

const CompanyStatusChart: React.FC<CompanyStatusChartProps> = ({ records }) => {
  const theme = useTheme();

  const processData = () => {
    const companyMap = new Map();
    
    records.forEach(record => {
      if (!record.company) return;
      if (!companyMap.has(record.company)) {
        companyMap.set(record.company, {
          Extended: 0,
          Closed: 0,
          Planned: 0,
          Open: 0,
          Hold: 0,
        });
      }
      const companyData = companyMap.get(record.company);
      
      // Map statuses
      const status = record.status?.toLowerCase() || '';
      if (status.includes('extended') || status.includes('extend')) {
        companyData.Extended++;
      } else if (status.includes('closed') || status.includes('completed')) {
        companyData.Closed++;
      } else if (status.includes('planned') || status.includes('scheduled')) {
        companyData.Planned++;
      } else if (status.includes('open') || status.includes('active')) {
        companyData.Open++;
      } else if (status.includes('hold') || status.includes('on hold')) {
        companyData.Hold++;
      } else {
        companyData.Open++; // Default to Open
      }
    });
    
    return Array.from(companyMap.entries()).map(([company, data]) => ({
      company,
      ...data,
      total: data.Extended + data.Closed + data.Planned + data.Open + data.Hold,
    })).sort((a, b) => b.total - a.total).slice(0, 8);
  };

  const data = processData();

  const colors = {
    Extended: theme.palette.warning.main,
    Closed: theme.palette.success.main,
    Planned: theme.palette.info.main,
    Open: theme.palette.primary.main,
    Hold: theme.palette.grey[500],
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <Paper sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, bgcolor: entry.color, borderRadius: '50%' }} />
                <Typography variant="caption" color="text.secondary">
                  {entry.name}:
                </Typography>
              </Box>
              <Typography variant="caption" fontWeight="bold">
                {entry.value} ({Math.round((entry.value / total) * 100)}%)
              </Typography>
            </Box>
          ))}
          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" fontWeight="bold">
              Total: {total} permits
            </Typography>
          </Box>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Company & Status Distribution
      </Typography>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis
              dataKey="company"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11 }}
              stroke={theme.palette.text.secondary}
            />
            <YAxis stroke={theme.palette.text.secondary} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Extended" stackId="a" fill={colors.Extended} name="Extended" />
            <Bar dataKey="Closed" stackId="a" fill={colors.Closed} name="Closed" />
            <Bar dataKey="Planned" stackId="a" fill={colors.Planned} name="Planned" />
            <Bar dataKey="Open" stackId="a" fill={colors.Open} name="Open" />
            <Bar dataKey="Hold" stackId="a" fill={colors.Hold} name="Hold" />
          </BarChart>
        </ResponsiveContainer>
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
            No data available
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Upload data to see company distribution
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CompanyStatusChart;