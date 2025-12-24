// src/pages/UploadPage.tsx
import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import UploadExcel from '../components/UploadExcel'; // Updated component

const UploadPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Excel File
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Upload Excel to update form data in the system.
        </Typography>
        <UploadExcel />
      </Box>
    </Container>
  );
};

export default UploadPage;