import { useState } from 'react';
import Trades from './pages/Trades';
import ImportPage from './pages/Import';


export default function App() {
const [page, setPage] = useState('trades');
return (
<div>
<nav className="topbar">
<button onClick={() => setPage('trades')}>Trades</button>
<button onClick={() => setPage('import')}>Importer</button>
</nav>
<main>
{page === 'trades' ? <Trades/> : <ImportPage/>}
</main>
</div>
);
}