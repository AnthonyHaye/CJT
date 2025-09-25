import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

export const listTrades = async (page = 1, limit = 25) =>
  (await api.get('/trades', { params: { page, limit } })).data;

export const importTrades = async (rows) =>
  (await api.post('/trades/import', rows)).data;

export const analyzeTrade = async (id) =>
  (await api.post(`/ai/analyze-trade/${id}`)).data;

export default api;
