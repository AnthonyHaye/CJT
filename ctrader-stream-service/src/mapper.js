const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); dayjs.extend(utc);

function mapCTraderDealToRawTrade(deal, symbolMap = {}) {
  const isBuy = String(deal.tradeSide) === 'BUY';
  const symbol = symbolMap[deal.symbolId] || deal.symbol || deal.symbolName || 'UNKNOWN';

  // Timestamps en ms → ISO
  const entryTs = deal.createTimestamp ?? deal.executionTimestamp;
  const exitTs  = deal.executionTimestamp ?? deal.createTimestamp;

  const commissions = Number(deal.commission || 0);
  const pnl = Number(deal.grossProfit ?? 0) - commissions; // ajuste selon ton broker (gross/net)

  // volume cTrader est souvent en "cents" (volume unités/100); adapte si besoin :
  const lots = (Number(deal.volume || deal.filledVolume || 0) / 100000) || 1;

  return {
    source: 'cTrader',
    symbol: String(symbol).toUpperCase(),         // ex: EURUSD
    direction: isBuy ? 'LONG' : 'SHORT',
    entryTime: dayjs.utc(entryTs).toISOString(),  // ex: 2025-08-18T08:47:00Z
    exitTime: dayjs.utc(exitTs).toISOString(),
    entryPrice: Number(deal.executionPrice || deal.openPrice || 0),
    exitPrice: Number(deal.executionPrice || deal.closePrice || 0),
    volume: lots,
    stopLoss: undefined,
    takeProfit: undefined,
    commissions,
    pnlCurrency: 'EUR', // ou 'USD' selon le compte
    pnl,
    rr: undefined,      // tu peux calculer côté back si tu as le risque
    notes: undefined,
  };
}

module.exports = { mapCTraderDealToRawTrade };
