import CsvUploader from '../components/CsvUploader';


export default function ImportPage() {
return (
<div className="container">
<h1>Importer des trades</h1>
<p>Format attendu : colonnes {`source,symbol,direction,entryTime,exitTime,entryPrice,exitPrice,volume,stopLoss,takeProfit,commissions,pnlCurrency,pnl,rr,notes`}.</p>
<CsvUploader onImported={() => alert('Import terminé ✅')} />
</div>
);
}