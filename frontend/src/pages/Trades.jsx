import { useEffect, useState } from 'react';
import { listTrades, analyzeTrade } from '../api';

export default function Trades() {
  const [items, setItems] = useState([]);

 useEffect(() => {
  let t = setInterval(() => listTrades().then(d => setItems(d.items)), 5000);
  return () => clearInterval(t);
}, []);

  return (
    <div className="container">
      <h1>Trades</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbole</th>
            <th>Dir</th>
            <th>PnL</th>
            <th>R</th>
            <th>Session</th>
            <th>Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t._id}>
              <td>{new Date(t.raw.entryTime).toLocaleString()}</td>
              <td>{t.raw.symbol}</td>
              <td>{t.raw.direction}</td>
              <td>{t.raw.pnl.toFixed(2)}</td>
              <td>{t.raw.rr ?? '-'}</td>
              <td>{t.smc?.session?.name ?? '-'}</td>
              <td>{t.smc?.qualityScore ?? '-'}</td>
              <td>
                <button onClick={() => analyzeTrade(t._id)}>
                  Analyser
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
