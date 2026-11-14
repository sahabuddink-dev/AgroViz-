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

// Pink Bollworm APIs
export const getDegreeDays = async (paramSet = 'both', start = '2023-06-01', end = null) => {
  const params = { param_set: paramSet, start };
  if (end) params.end = end;
  const response = await apiClient.get('/api/analysis/degree-days', { params });
  return response.data;
};

export const getPBWContext = async () => {
  const response = await apiClient.get('/api/pbw/context');
  return response.data;
};

export const getPBWStatus = async () => {
  const response = await apiClient.get('/api/pbw/status');
  return response.data;
};

export const getPBWTemplateURL = () => `${API_BASE_URL}/api/pbw/template`;

export const uploadPBWObservations = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/pbw/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Soil Conditions APIs (Phase 6)
export const getSoilMoisture = async (start = null, end = null, limit = null) => {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  if (limit) params.limit = limit;
  const response = await apiClient.get('/api/soil/moisture', { params });
  return response.data;
};

export const getSoilProperties = async () => {
  const response = await apiClient.get('/api/soil/properties');
  return response.data;
};

export const getSoilTemplateURL = () => `${API_BASE_URL}/api/soil/template`;

export const uploadSoilSensorLog = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/soil/sensor-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
