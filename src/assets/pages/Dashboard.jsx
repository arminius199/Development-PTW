import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  FileDownload,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
  PlayCircle,
  PauseCircle,
  CorporateFare,
  LocalFireDepartment,
  Assessment,
  Lightbulb,
  CloudUpload,
  Close,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CompanyStatusChart from '../components/charts/CompanyStatusChart';
import TypeBreakdownChart from '../components/charts/TypeBreakdownChart';
import PermitsPerDayChart from '../components/charts/PermitsPerDayChart';
import StatusTrendChart from '../components/charts/StatusTrendChart';
import { usePTWRecords, dispatchPTWUpdate } from '../hooks/usePTWRecords';
import { PTWRecord } from '../types/database.types';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import UploadExcel from '../components/UploadExcel';

interface CompanyStats {
  company: string;
  total: number;
  extended: number;
  closed: number;
  planned: number;
  open: number;
  hold: number;
}

interface WorkTypeStats {
  type: string;
  count: number;
  riskLevel: 'High' | 'Medium' | 'Low';
}

const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    status: '',
    type: '',
  });
  const [activeTab, setActiveTab] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  
  // Use the new hook with real-time enabled
  const {
    records,
    loading,
    error,
    totalCount,
    refetch,
  } = usePTWRecords({
    filters: {
      ...filters,
      ...(filters.search && { search: filters.search }),
    },
    enableRealtime: true, // 🔥 Enable real-time updates
  });

  // Extract unique values for filters
  const uniqueCompanies = [...new Set(records.map(r => r.company).filter(Boolean))] as string[];
  const uniqueStatuses = [...new Set(records.map(r => r.status).filter(Boolean))] as string[];
  const uniqueTypes = [...new Set(records.map(r => r.type).filter(Boolean))] as string[];

  // Listen for custom refresh events
  useEffect(() => {
    const handleRecordsUpdated = () => {
      console.log('Dashboard: Records updated event received');
      refetch();
    };

    window.addEventListener('ptw-records-updated', handleRecordsUpdated);
    
    return () => {
      window.removeEventListener('ptw-records-updated', handleRecordsUpdated);
    };
  }, [refetch]);

  const analyzeCompanyStats = (): CompanyStats[] => {
    const companyMap = new Map<string, CompanyStats>();
    
    records.forEach(record => {
      if (!record.company) return;
      
      if (!companyMap.has(record.company)) {
        companyMap.set(record.company, {
          company: record.company,
          total: 0,
          extended: 0,
          closed: 0,
          planned: 0,
          open: 0,
          hold: 0,
        });
      }
      
      const stats = companyMap.get(record.company)!;
      stats.total++;
      
      const status = record.status?.toLowerCase() || '';
      if (status.includes('extended') || status.includes('extend')) {
        stats.extended++;
      } else if (status.includes('closed') || status.includes('completed')) {
        stats.closed++;
      } else if (status.includes('planned') || status.includes('scheduled')) {
        stats.planned++;
      } else if (status.includes('open') || status.includes('active')) {
        stats.open++;
      } else if (status.includes('hold') || status.includes('on hold')) {
        stats.hold++;
      }
    });

    return Array.from(companyMap.values())
      .sort((a, b) => b.total - a.total);
  };

  const analyzeWorkTypes = (): WorkTypeStats[] => {
    const typeMap = new Map<string, WorkTypeStats>();
    
    records.forEach(record => {
      const type = record.type || 'Unknown';
      if (!typeMap.has(type)) {
        typeMap.set(type, {
          type,
          count: 0,
          riskLevel: determineRiskLevel(type),
        });
      }
      
      const stats = typeMap.get(type)!;
      stats.count++;
    });

    return Array.from(typeMap.values())
      .sort((a, b) => b.count - a.count);
  };

  const determineRiskLevel = (type: string): 'High' | 'Medium' | 'Low' => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('hn') || lowerType.includes('hot naked')) {
      return 'High';
    } else if (lowerType.includes('h') || lowerType.includes('hot')) {
      return 'Medium';
    } else if (lowerType.includes('c') || lowerType.includes('cold')) {
      return 'Low';
    }
    return 'Medium';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return '#f44336';
      case 'Medium': return '#ff9800';
      case 'Low': return '#4caf50';
      default: return '#757575';
    }
  };

  const calculateStats = () => {
    const companyStats = analyzeCompanyStats();
    const workTypes = analyzeWorkTypes();
    
    const total = records.length;
    const totalExtended = companyStats.reduce((sum, c) => sum + c.extended, 0);
    const totalClosed = companyStats.reduce((sum, c) => sum + c.closed, 0);
    const totalPlanned = companyStats.reduce((sum, c) => sum + c.planned, 0);
    const totalOpen = companyStats.reduce((sum, c) => sum + c.open, 0);
    const totalHold = companyStats.reduce((sum, c) => sum + c.hold, 0);
    
    const extendedRate = total > 0 ? (totalExtended / total * 100).toFixed(0) : '0';
    const closureRate = total > 0 ? (totalClosed / total * 100).toFixed(0) : '0';
    
    const highRiskCount = workTypes
      .filter(t => t.riskLevel === 'High')
      .reduce((sum, t) => sum + t.count, 0);
    
    const mediumRiskCount = workTypes
      .filter(t => t.riskLevel === 'Medium')
      .reduce((sum, t) => sum + t.count, 0);
    
    const lowRiskCount = workTypes
      .filter(t => t.riskLevel === 'Low')
      .reduce((sum, t) => sum + t.count, 0);

    return {
      total,
      totalExtended,
      totalClosed,
      totalPlanned,
      totalOpen,
      totalHold,
      extendedRate,
      closureRate,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      companyStats,
      workTypes,
    };
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PTW Records');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(data, `ptw-records-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data exported successfully');
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      company: '',
      status: '',
      type: '',
    });
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Number', width: 120 },
    { field: 'company', headerName: 'Company', width: 150 },
    { field: 'location', headerName: 'Location', width: 150 },
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'project', headerName: 'Project', width: 150 },
    { field: 'owner', headerName: 'Owner', width: 150 },
    { 
      field: 'day', 
      headerName: 'Day/Date', 
      width: 120,
      valueFormatter: (params) => {
        const value = params.value;
        if (!value) return '';
        
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
        return value;
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'Extended' ? 'warning' :
            params.value === 'Closed' ? 'success' :
            params.value === 'Active' ? 'primary' :
            params.value === 'Hold' ? 'default' : 'default'
          }
        />
      )
    },
  ];

  const stats = calculateStats();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" fontWeight="bold">
              PTW ANALYSIS DASHBOARD
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  refetch();
                  toast.success('Data refreshed');
                }}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
              {/* UPLOAD BUTTON - Opens UploadExcel in dialog */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudUpload />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Excel
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownload />}
                onClick={handleExport}
                disabled={records.length === 0}
              >
                Export
              </Button>
            </Box>
          </Box>

          {/* Upload Dialog */}
          <Dialog
            open={uploadDialogOpen}
            onClose={() => setUploadDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Upload Excel File</Typography>
                <IconButton onClick={() => setUploadDialogOpen(false)} size="small">
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <UploadExcel 
                onUploadComplete={() => {
                  setUploadDialogOpen(false);
                  refetch();
                  toast.success('Data refreshed after upload');
                }} 
              />
            </DialogContent>
          </Dialog>

          {/* Tabs */}
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
          >
            <Tab label="Overview" icon={<Assessment />} iconPosition="start" />
            <Tab label="Distribution" icon={<CorporateFare />} iconPosition="start" />
            <Tab label="Risk Analysis" icon={<LocalFireDepartment />} iconPosition="start" />
            <Tab label="Insights" icon={<Lightbulb />} iconPosition="start" />
            <Tab label="All Data" icon={<FilterList />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Company</InputLabel>
                <Select
                  value={filters.company}
                  onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                  label="Company"
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueCompanies.map(company => (
                    <MenuItem key={company} value={company}>{company}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  label="Type"
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
              <Button
                variant="outlined"
                onClick={handleResetFilters}
                fullWidth
              >
                Reset
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {loading && <CircularProgress size={20} />}
                <Typography variant="body2" color="text.secondary">
                  {records.length} records loaded
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading data: {error}
          </Alert>
        )}

        {/* Overview Tab */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Stats Cards */}
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#E3F2FD', height: '100%' }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  Total Records
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {stats.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  All permits analyzed
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#FFF3E0', height: '100%' }}>
                <Typography variant="h6" color="warning.main" gutterBottom>
                  Extended Rate
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="warning.main">
                  {stats.extendedRate}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={parseInt(stats.extendedRate)} 
                  color="warning"
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#E8F5E9', height: '100%' }}>
                <Typography variant="h6" color="success.main" gutterBottom>
                  Closure Rate
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {stats.closureRate}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={parseInt(stats.closureRate)} 
                  color="success"
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#FFEBEE', height: '100%' }}>
                <Typography variant="h6" color="error.main" gutterBottom>
                  High Risk
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="error.main">
                  {stats.highRiskCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  HN + Hot Naked Flame
                </Typography>
              </Card>
            </Grid>

            {/* Charts */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 400 }}>
                <CompanyStatusChart records={records} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, height: 400 }}>
                <TypeBreakdownChart records={records} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, height: 400 }}>
                <PermitsPerDayChart records={records} />
              </Paper>
            </Grid>

            {/* Urgent Actions */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning color="error" /> URGENT ACTIONS REQUIRED
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Alert severity="error">
                      <Typography variant="subtitle2">High Risk Work</Typography>
                      <Typography variant="body2">
                        {stats.highRiskCount} permits need enhanced fire watch & gas monitoring
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="warning">
                      <Typography variant="subtitle2">Planned Tomorrow</Typography>
                      <Typography variant="body2">
                        {stats.totalPlanned} permits require pre-job planning
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert severity="info">
                      <Typography variant="subtitle2">Open Permits</Typography>
                      <Typography variant="body2">
                        {stats.totalOpen} permits need immediate supervision
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Alert>
                      <Typography variant="subtitle2">Low Closure Rate</Typography>
                      <Typography variant="body2">
                        Focus on permit completion ({stats.closureRate}%)
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Distribution Tab */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  PERMIT DISTRIBUTION BY COMPANY & STATUS
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Company</strong></TableCell>
                        <TableCell align="right"><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>Extended</strong></TableCell>
                        <TableCell align="right"><strong>Closed</strong></TableCell>
                        <TableCell align="right"><strong>Planned</strong></TableCell>
                        <TableCell align="right"><strong>Open</strong></TableCell>
                        <TableCell align="right"><strong>Hold</strong></TableCell>
                        <TableCell align="right"><strong>Extended Rate</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.companyStats.map((company, index) => (
                        <TableRow key={company.company}>
                          <TableCell><strong>{company.company}</strong></TableCell>
                          <TableCell align="right">{company.total}</TableCell>
                          <TableCell align="right">
                            <Chip label={company.extended} size="small" color="warning" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={company.closed} size="small" color="success" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={company.planned} size="small" color="info" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={company.open} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={company.hold} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${(company.extended / company.total * 100).toFixed(0)}%`}
                              color="warning"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2">KEY STATISTICS:</Typography>
                  <Typography variant="body2">
                    • Extended Rate: {stats.extendedRate}% ({stats.totalExtended}/{stats.total})
                  </Typography>
                  <Typography variant="body2">
                    • Closure Rate: {stats.closureRate}% ({stats.totalClosed}/{stats.total})
                  </Typography>
                  <Typography variant="body2">
                    • Planned Permits: {stats.totalPlanned} for next day
                  </Typography>
                  <Typography variant="body2">
                    • Open Permits: {stats.totalOpen} requiring immediate attention
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Risk Analysis Tab */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  WORK TYPE BREAKDOWN
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell align="right"><strong>Count</strong></TableCell>
                        <TableCell align="right"><strong>Risk Level</strong></TableCell>
                        <TableCell><strong>Risk Color</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.workTypes.map((workType, index) => (
                        <TableRow key={workType.type}>
                          <TableCell><strong>{workType.type}</strong></TableCell>
                          <TableCell align="right">
                            <Chip label={workType.count} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={workType.riskLevel}
                              size="small"
                              color={workType.riskLevel === 'High' ? 'error' : 
                                     workType.riskLevel === 'Medium' ? 'warning' : 'success'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ 
                              width: 20, 
                              height: 20, 
                              backgroundColor: getRiskColor(workType.riskLevel),
                              borderRadius: '50%'
                            }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2">DETAILED COUNT:</Typography>
                  {stats.workTypes.map(workType => (
                    <Typography key={workType.type} variant="body2">
                      • {workType.type}: {workType.count} permits
                    </Typography>
                  ))}
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  RISK DISTRIBUTION
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: '#FFEBEE', borderRadius: 1, mb: 2 }}>
                      <Typography variant="subtitle2" color="error">
                        High Risk (HN + Hot Naked Flame)
                      </Typography>
                      <Typography variant="h4" color="error">
                        {stats.highRiskCount} permits ({stats.total > 0 ? (stats.highRiskCount / stats.total * 100).toFixed(0) : 0}%)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 1, mb: 2 }}>
                      <Typography variant="subtitle2" color="warning.main">
                        Medium Risk (H)
                      </Typography>
                      <Typography variant="h4" color="warning.main">
                        {stats.mediumRiskCount} permits ({stats.total > 0 ? (stats.mediumRiskCount / stats.total * 100).toFixed(0) : 0}%)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="success.main">
                        Low Risk (C)
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {stats.lowRiskCount} permits ({stats.total > 0 ? (stats.lowRiskCount / stats.total * 100).toFixed(0) : 0}%)
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Insights Tab */}
        {activeTab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lightbulb color="warning" /> KEY INSIGHTS
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: '#FFF3E0' }}>
                      <Typography variant="subtitle2" color="warning.main" gutterBottom>
                        Extended Permits
                      </Typography>
                      <Typography variant="h5">{stats.extendedRate}%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        High continuity requirement
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: '#E8F5E9' }}>
                      <Typography variant="subtitle2" color="success.main" gutterBottom>
                        Closed Permits
                      </Typography>
                      <Typography variant="h5">{stats.closureRate}%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Closure rate needs improvement
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, bgcolor: '#E3F2FD' }}>
                      <Typography variant="subtitle2" color="info.main" gutterBottom>
                        Planned Tomorrow
                      </Typography>
                      <Typography variant="h5">{stats.totalPlanned}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Advance preparation required
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Critical Insights</Typography>
                      <Typography variant="body2">
                        • {stats.extendedRate}% extended permits – high continuity requirement<br />
                        • {stats.closureRate}% closed permits – closure rate needs improvement<br />
                        • {stats.totalPlanned} planned permits – advance preparation required<br />
                        • {stats.totalOpen} open permits – immediate supervision needed<br />
                        • {stats.totalHold} SSCO permits on hold – needs resolution<br />
                        • High concentration of hot work (86%) – fire safety critical<br />
                        • No night work – all operations during day shift only
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* All Data Tab */}
        {activeTab === 4 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  All Records ({records.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<FileDownload />}
                  onClick={handleExport}
                  disabled={records.length === 0}
                >
                  Export
                </Button>
              </Box>
              <div style={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={records}
                  columns={columns}
                  pageSize={pageSize}
                  onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  pagination
                  loading={loading}
                  disableSelectionOnClick
                />
              </div>
            </Paper>
          </Grid>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Dashboard;