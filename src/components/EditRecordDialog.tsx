import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { PTWRecord } from '../types/database.types';

interface EditRecordDialogProps {
  open: boolean;
  record: PTWRecord | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PTWRecord>) => Promise<void>;
}

const statusOptions = ['Active', 'In Progress', 'Completed', 'Cancelled', 'On Hold'];
const typeOptions = ['Electrical', 'Mechanical', 'Civil', 'Hot Work', 'Confined Space', 'Other'];

const EditRecordDialog: React.FC<EditRecordDialogProps> = ({
  open,
  record,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = React.useState<Partial<PTWRecord>>({});
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (record) {
      setFormData({
        description: record.description,
        company: record.company,
        location: record.location,
        number: record.number,
        type: record.type,
        project: record.project,
        owner: record.owner,
        day: record.day,
        status: record.status,
      });
    }
  }, [record]);

  const handleSubmit = async () => {
    if (!record) return;
    
    try {
      setLoading(true);
      await onSave(record.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PTWRecord) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: (event.target as HTMLInputElement).value,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Record</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Number"
              value={formData.number || ''}
              onChange={handleChange('number')}
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Company"
              value={formData.company || ''}
              onChange={handleChange('company')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Location"
              value={formData.location || ''}
              onChange={handleChange('location')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type || ''}
                onChange={handleChange('type')}
                label="Type"
              >
                {typeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Project"
              value={formData.project || ''}
              onChange={handleChange('project')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Owner"
              value={formData.owner || ''}
              onChange={handleChange('owner')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Day"
                value={formData.day ? new Date(formData.day) : null}
                onChange={(date) => {
                  setFormData(prev => ({
                    ...prev,
                    day: date ? date.toISOString().split('T')[0] : '',
                  }));
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status || ''}
                onChange={handleChange('status')}
                label="Status"
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={4}
              value={formData.description || ''}
              onChange={handleChange('description')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditRecordDialog;