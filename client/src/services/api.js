import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const getWebsites = () => api.get('/websites');
export const addWebsite = (data) => api.post('/websites', data);
export const deleteWebsite = (id) => api.delete(`/websites/${id}`);
export const triggerCheck = (id) => api.post(`/websites/${id}/check`);
export const getCheckHistory = (id) => api.get(`/websites/${id}/checks`);

// API endpoints
export const getApis = () => api.get('/apis');
export const addApi = (data) => api.post('/apis', data);
export const deleteApi = (id) => api.delete(`/apis/${id}`);
export const triggerApiCheck = (id) => api.post(`/apis/${id}/check`);
export const getApiCheckHistory = (id) => api.get(`/apis/${id}/checks`);

// Interval endpoints
export const setWebsiteInterval = (id, checkInterval) => 
  api.patch(`/websites/${id}/interval`, { checkInterval });

export const setApiInterval = (id, checkInterval) => 
  api.patch(`/apis/${id}/interval`, { checkInterval });

export default api;