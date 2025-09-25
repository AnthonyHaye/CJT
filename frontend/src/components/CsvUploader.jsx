import { useCallback, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { importTrades } from '../api';


const SAMPLE_HEADERS = [
'source','symbol','direction','entryTime','exitTime','entryPrice','exitPrice','volume','stopLoss','takeProfit','commissions','pnlCurrency','pnl','rr','notes'
];


export default function CsvUploader({ onImported }) {
const [dragOver, setDragOver] = useState(false);
const [rows, setRows] = useState([]);
const [errors, setErrors] = useState([]);
const [busy, setBusy] = useState(false);


const handleFiles = useCallback((file) => {
setErrors([]);
Papa.parse(file, {
header: true,
skipEmptyLines: true,
transformHeader: (h) => h.trim(),
complete: (res) => {
if (res.errors?.length) {
setErrors(res.errors.map(e => `${e.type} @ row ${e.row}: ${e.message}`));
}
// Filtrer lignes vides et normaliser
const data = (res.data || []).filter(r => Object.values(r).some(v => String(v||'').trim() !== ''));
setRows(data);
}
});
}, []);


const onDrop = useCallback((e) => {
e.preventDefault(); setDragOver(false);
const file = e.dataTransfer.files?.[0];
if (file) handleFiles(file);
}, [handleFiles]);


const onChange = useCallback((e) => {
const file = e.target.files?.[0];
if (file) handleFiles(file);
}, [handleFiles]);


const headersStatus = useMemo(() => {
if (!rows.length) return null;
const headers = Object.keys(rows[0]);
const missing = SAMPLE_HEADERS.filter(h => !headers.includes(h));
const extra = headers.filter(h => !SAMPLE_HEADERS.includes(h));
return { headers, missing, extra };
}, [rows]);


const normalize = useCallback((r) => {
// Casts prudents, dates ISO conservées
const num = (v) => v === '' || v === undefined || v === null ? undefined : Number(v);
return {
source: r.source || 'CSV',
symbol: String(r.symbol || '').toUpperCase(),
direction: String(r.direction || '').toUpperCase(),
entryTime: r.entryTime, // ex: 2025-08-18T08:47:00Z
exitTime: r.exitTime,
entryPrice: Number(r.entryPrice),
exitPrice: Number(r.exitPrice),
volume: Number(r.volume),
stopLoss: num(r.stopLoss),
takeProfit: num(r.takeProfit),
commissions: num(r.commissions),
pnlCurrency: r.pnlCurrency || 'EUR',
pnl: Number(r.pnl),
rr: num(r.rr),
notes: r.notes || undefined,
};
}, []);

const preview = rows.slice(0, 5);


const handleImport = async () => {
try {
setBusy(true);
const payload = rows.map(normalize);
const res = await importTrades(payload);
onImported?.(res);
setRows([]);
} catch (e) {
setErrors((prev) => [...prev, e?.message || 'Import error']);
} finally {
setBusy(false);
}
};

return (
<div>
<div
className={`dropzone ${dragOver ? 'over' : ''}`}
onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
onDragLeave={() => setDragOver(false)}
onDrop={onDrop}
>
<input type="file" accept=".csv" onChange={onChange} id="csv-file" style={{ display: 'none' }} />
<label htmlFor="csv-file" className="pick-btn">Choisir un fichier CSV</label>
<p>…ou glisse-dépose ton fichier ici</p>
</div>


{headersStatus && (
<div className="headers-check">
{headersStatus.missing.length === 0 ? (
<p className="ok">Entêtes OK ✅</p>
) : (
<p className="warn">Colonnes manquantes: {headersStatus.missing.join(', ')}</p>
)}
{headersStatus.extra.length > 0 && (
<p className="hint">Colonnes ignorées: {headersStatus.extra.join(', ')}</p>
)}
</div>
)}

{preview.length > 0 && (
<div className="preview">
<h3>Aperçu (5 lignes)</h3>
<table>
<thead>
<tr>
{Object.keys(preview[0]).map((h) => <th key={h}>{h}</th>)}
</tr>
</thead>
<tbody>
{preview.map((r, i) => (
<tr key={i}>
{Object.values(r).map((v, j) => <td key={j}>{String(v)}</td>)}
</tr>
))}
</tbody>
</table>
<button disabled={busy} onClick={handleImport}>
{busy ? 'Import en cours…' : `Importer ${rows.length} trades`}
</button>
</div>
)}

{errors.length > 0 && (
<div className="errors">
<h4>Erreurs</h4>
<ul>
{errors.map((e, i) => <li key={i}>{e}</li>)}
</ul>
</div>
)}
</div>
);
}