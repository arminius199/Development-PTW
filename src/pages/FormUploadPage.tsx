// src/pages/FormUploadPage.tsx
import React from 'react';
import { Container } from '@mui/material';
import ExcelFormUploader from '../components/ExcelFormUploader';

const FormUploadPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <ExcelFormUploader />
    </Container>
  );
};

export default FormUploadPage;