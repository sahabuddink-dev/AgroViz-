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

export const getWeather = async (start = null, end = null, limit = null) => {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  if (limit) params.limit = limit;
  const response = await apiClient.get('/api/weather', { params });
  return response.data;
};

export const getWeatherSummary = async (start = null, end = null) => {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  const response = await apiClient.get('/api/weather/summary', { params });
  return response.data;
};
