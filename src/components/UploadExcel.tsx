// components/UploadExcel.tsx
import React, { useCallback, useState } from 'react';
import {
  Paper,
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import { 
  CloudUpload, 
  Error, 
  Warning,
  DeleteForever,
  Save 
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { PTWRecord } from '../types/database.types';
import toast from 'react-hot-toast';
import { dispatchPTWUpdate } from '../hooks/usePTWRecords';

interface UploadResult {
  success: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  mode: 'upsert' | 'replace';
  timestamp: string;
}

interface UploadExcelProps {
  onUploadComplete?: () => void;
}

const UploadExcel: React.FC<UploadExcelProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'upsert' | 'replace'>('upsert');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    
    if (uploadMode === 'replace') {
      setConfirmDialogOpen(true);
    } else {
      await processExcelFile(file, 'upsert');
    }
  }, [uploadMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  const validateRecord = (record: any, rowIndex: number): string[] => {
    const errors: string[] = [];

    if (!record.number || typeof record.number !== 'string') {
      errors.push('Number is required and must be a string');
    }

    if (!record.company || typeof record.company !== 'string') {
      errors.push('Company is required');
    }

    if (!record.type || typeof record.type !== 'string') {
      errors.push('Type is required');
    }

    if (!record.status || typeof record.status !== 'string') {
      errors.push('Status is required');
    }

    if (!record.day || typeof record.day !== 'string') {
      errors.push('Day is required');
    } else {
      const dayStr = record.day.toLowerCase();
      if (dayStr !== 'day' && dayStr !== 'night') {
        const day = new Date(record.day);
        if (isNaN(day.getTime())) {
          errors.push('Day must be "Day", "Night", or a valid date');
        }
      }
    }

    return errors;
  };

  const processExcelFile = async (file: File, mode: 'upsert' | 'replace') => {
    setUploading(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const uploadResults: UploadResult = {
        success: 0,
        errors: [],
        mode,
        timestamp: new Date().toISOString(),
      };

      // Transform and validate all records
      const validRecords: Partial<PTWRecord>[] = [];
      
      jsonData.forEach((row: any, index: number) => {
        const rowIndex = index + 2;
        
        try {
          const dayValue = row.Day || row.day;
          let dayString = '';

          if (dayValue) {
            const dayStr = String(dayValue).toLowerCase();
            if (dayStr === 'day' || dayStr === 'night') {
              dayString = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
            } else {
              const date = new Date(dayValue);
              if (!isNaN(date.getTime())) {
                dayString = date.toISOString().split('T')[0];
              } else {
                dayString = String(dayValue);
              }
            }
          }

          const record: Partial<PTWRecord> = {
            number: String(row.Number || row.number || ''),
            description: String(row.Description || row.description || ''),
            company: String(row.Company || row.company || ''),
            location: String(row.Location || row.location || ''),
            type: String(row.Type || row.type || ''),
            project: String(row.Project || row.project || ''),
            owner: String(row.Owner || row.owner || ''),
            day: dayString,
            status: String(row.Status || row.status || ''),
          };

          const errors = validateRecord(record, rowIndex);
          if (errors.length > 0) {
            uploadResults.errors.push({
              row: rowIndex,
              error: errors.join(', '),
              data: record,
            });
          } else {
            validRecords.push(record);
          }
        } catch (error: any) {
          uploadResults.errors.push({
            row: rowIndex,
            error: error.message || 'Unknown error',
            data: row,
          });
        }
      });

      // Process valid records
      if (validRecords.length > 0) {
        try {
          if (mode === 'replace') {
            // Delete all records first
            const { error: deleteError } = await supabase
              .from('ptw_records')
              .delete()
              .neq('id', '');

            if (deleteError) throw deleteError;

            // Insert new records
            const { error: insertError } = await supabase
              .from('ptw_records')
              .insert(validRecords);

            if (insertError) throw insertError;
            
            uploadResults.success = validRecords.length;
          } else {
            // Upsert mode
            const batchSize = 50;
            for (let i = 0; i < validRecords.length; i += batchSize) {
              const batch = validRecords.slice(i, i + batchSize);
              const { error } = await supabase
                .from('ptw_records')
                .upsert(batch, {
                  onConflict: 'number',
                });

              if (error) throw error;
              uploadResults.success += batch.length;
            }
          }
        } catch (error: any) {
          throw new Error(`Database operation failed: ${error.message}`);
        }
      }

      setResult(uploadResults);
      
      if (uploadResults.success > 0) {
        const action = mode === 'replace' ? 'replaced' : 'uploaded';
        toast.success(`Successfully ${action} ${uploadResults.success} records`);
        
        // 🔥 CRITICAL: Trigger refresh
        dispatchPTWUpdate();
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
      
      if (uploadResults.errors.length > 0) {
        toast.error(`Failed to process ${uploadResults.errors.length} records`);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmReplace = async (file: File) => {
    setConfirmDialogOpen(false);
    await processExcelFile(file, 'replace');
  };

  const downloadErrorReport = () => {
    if (!result || result.errors.length === 0) return;

    const errorData = result.errors.map(err => ({
      Row: err.row,
      Error: err.error,
      ...err.data,
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');
    XLSX.writeFile(workbook, 'upload_errors.xlsx');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Excel File
      </Typography>

      {/* Upload Mode Selection */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Upload Mode</FormLabel>
          <RadioGroup
            row
            value={uploadMode}
            onChange={(e) => setUploadMode(e.target.value as 'upsert' | 'replace')}
          >
            <FormControlLabel 
              value="upsert" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Save fontSize="small" />
                  <span>Upsert (Update existing, add new)</span>
                </Box>
              }
            />
            <FormControlLabel 
              value="replace" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DeleteForever fontSize="small" color="warning" />
                  <span>Replace All (Delete all existing, upload new)</span>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {uploadMode === 'replace' && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <Warning fontSize="small" sx={{ mr: 1 }} />
            This will delete ALL existing records and replace them with the uploaded file.
          </Alert>
        )}
      </Box>

      {/* Dropzone */}
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="body1" gutterBottom>
          {isDragActive
            ? 'Drop the Excel file here'
            : fileName
            ? `Selected: ${fileName}`
            : 'Drag & drop an Excel file here, or click to select'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supports .xls and .xlsx files
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }}>
          Browse Files
        </Button>
      </Box>

      {uploading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
          <CircularProgress size={24} />
          <Typography>
            {uploadMode === 'replace' ? 'Replacing all records...' : 'Uploading...'}
          </Typography>
        </Box>
      )}

      {result && (
        <Box sx={{ mt: 3 }}>
          <Alert 
            severity={result.errors.length === 0 ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            {result.mode === 'replace' ? 'Replace' : 'Upload'} completed: {result.success} successful, {result.errors.length} failed
          </Alert>

          {result.errors.length > 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" color="error">
                  Errors ({result.errors.length})
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={downloadErrorReport}
                >
                  Download Error Report
                </Button>
              </Box>
              
              <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {result.errors.slice(0, 10).map((err, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Error color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Row ${err.row}: ${err.error}`}
                      secondary={JSON.stringify(err.data)}
                    />
                  </ListItem>
                ))}
                {result.errors.length > 10 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${result.errors.length - 10} more errors`}
                    />
                  </ListItem>
                )}
              </List>
            </>
          )}
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Expected columns:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Number, Description, Company, Location, Type, Project, Owner, Day (Day/Night or Date), Status
        </Typography>
      </Box>

      {/* Confirmation Dialog for Replace Mode */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>
          <Warning color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          Confirm Replace All Records
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>WARNING:</strong> This action will permanently delete ALL existing records!
          </Alert>
          <Typography>
            You are about to replace all {fileName ? `with "${fileName}"` : 'records'}. 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={async () => {
              const file = document.querySelector('input[type="file"]')?.files?.[0];
              if (file) {
                await handleConfirmReplace(file);
              }
            }}
            autoFocus
          >
            Yes, Replace All Records
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UploadExcel;