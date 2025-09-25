const axios = require('axios');
require('dotenv').config();

const api = axios.create({ baseURL: process.env.BACKEND_BASE_URL });

async function pushTrades(rawTrades) {
  // Attend un tableau RawTrade normalisé (même schéma que /trades/import)
  const { data } = await api.post('/trades/import', rawTrades);
  return data;
}

module.exports = { pushTrades };
