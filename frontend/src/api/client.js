import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const response = await apiClient.get('/api/health');
  return response.data;
};

export const getDatasets = async () => {
  const response = await apiClient.get('/api/datasets');
  return response.data;
};

export const getDatasetPreview = async (datasetId, limit = 10) => {
  const response = await apiClient.get(`/api/datasets/${datasetId}/preview`, {
    params: { limit },
  });
  return response.data;
};

export const getDatasetProfile = async (datasetId) => {
  const response = await apiClient.get(`/api/datasets/${datasetId}/profile`);
  return response.data;
};
