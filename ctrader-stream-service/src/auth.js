require('dotenv').config();

async function getAccessToken() {
  const token = process.env.CTRADER_ACCESS_TOKEN;
  if (!token) {
    throw new Error('CTRADER_ACCESS_TOKEN manquant (implémenter OAuth si nécessaire)');
  }
  return token;
}

module.exports = { getAccessToken };
