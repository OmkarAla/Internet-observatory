import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const getWebsites = () => api.get('/websites');
export const addWebsite = (data) => api.post('/websites', data);
export const deleteWebsite = (id) => api.delete(`/websites/${id}`);
export const triggerCheck = (id) => api.post(`/websites/${id}/check`);
export const getCheckHistory = (id) => api.get(`/websites/${id}/checks`);

export default api;