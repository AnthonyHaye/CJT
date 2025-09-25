1) Objectifs (clairs et mesurables)

Importer tes trades (FTMO/cTrader/CSV) → base unique normalisée.

Annoter SMC automatiquement (structure, OB, FVG, liquidité, sessions, etc.) via un service d’analyse IA.

Visualiser ton equity, winrate, R multiples, drawdown, perfs par session/paires/setup SMC.

Rejouer chaque trade (contexte multi-TF, raisons SMC, journal texte).

Itérer (tag manuel, correction de l’IA, feedback loop).

2) Architecture proposée (solide et simple)

Frontend : React + TypeScript + (Sass ou Tailwind, à ton goût).

Backend API : tu as déjà du Symfony + MongoDB (Doctrine ODM) pour ton projet journal → on réutilise (ou Node/Express si tu préfères).

DB : MongoDB (parfait pour un schéma flexible SMC + historique versions/annotations).

Service IA : endpoint backend /ai/analyze-trade qui appelle l’API LLM (réponse JSON stricte).

Ingestion :

v1 : Upload CSV/Excel FTMO/cTrader.

v2 : Lien temps réel (ton microservice cTrader OpenAPI que tu as déjà commencé) → push vers Symfony/Mongo.

3) Schéma de données (noyau)

TypeScript côté front (miroir en Mongo côté back) :

```ts
// Trade "brut" (après normalisation import)
export interface RawTrade {
  id: string;                  // UUID
  source: 'FTMO' | 'cTrader' | 'CSV';
  symbol: string;              // "EURUSD"
  direction: 'LONG' | 'SHORT';
  entryTime: string;           // ISO
  exitTime: string;            // ISO
  entryPrice: number;
  exitPrice: number;
  volume: number;              // lots ou unités
  stopLoss?: number;
  takeProfit?: number;
  commissions?: number;
  pnlCurrency?: 'EUR' | 'USD';
  pnl: number;                 // en devise du compte
  rr?: number;                 // Risk-Reward réalisé
  notes?: string;              // note trader libre
}

// Enrichissement SMC produit par l’IA
export interface SmcAnalysis {
  version: string;             // ex: 'smc-v1'
  timeframeAlignment: {
    htf: 'Bullish' | 'Bearish' | 'Sideways';
    mtf: 'Bullish' | 'Bearish' | 'Sideways';
    ltf: 'Bullish' | 'Bearish' | 'Range';
  };
  structure: {
    bias: 'Bullish' | 'Bearish';
    chochOrMSS: 'CHOCH' | 'MSS' | 'None';
    premiumDiscount: 'Premium' | 'Discount' | 'Equilibrium';
  };
  liquidity: {
    taken: Array<'EqualHighs'|'EqualLows'|'RelativeEQH'|'RelativeEQL'|'BuySide'|'SellSide'>;
    resting: Array<'Above'|'Below'|'InternalRange'|'ExternalRange'>;
    sweep?: 'BuySide' | 'SellSide' | 'None';
  };
  orderBlock?: {
    type: 'BullishOB' | 'BearishOB' | 'None';
    timeframe: 'HTF'|'MTF'|'LTF';
    mitigated: boolean;
  };
  fvg?: {
    present: boolean;
    timeframe?: 'HTF'|'MTF'|'LTF';
    role?: 'Entry'|'TP Trail'|'None';
  };
  session: {
    name: 'Asia' | 'London' | 'NewYork';
    killzone?: 'LondonAM' | 'NYAM' | 'NYPM' | 'None';
  };
  entryModel?: 'BreakOfStructure' | 'Mitigation' | 'FVG' | 'LiquiditySweep' | 'Other';
  risk: {
    riskPerTradePct?: number;
    stopType?: 'Structure' | 'OB' | 'FVG' | 'Liquidity' | 'Other';
    partials?: Array<{ atRR: number; sizePct: number }>;
  };
  newsFilter?: { highImpactNear: boolean; minutesFromEvent?: number };
  qualityScore: number;        // 0–100 (voir barème)
  rationale: string;           // explication compacte
  improvements: string[];      // TODOs actionnables
}

// Document final stocké
export interface TradeDoc {
  _id: string;
  raw: RawTrade;
  smc?: SmcAnalysis;           // existe après traitement IA
  tags: string[];              // ex: ['A+','London','FVG']
  createdAt: string;
  updatedAt: string;
}

```

4) Pipeline de traitement

Ingestion (CSV/Excel ou API) → RawTrade.

Normalisation (unités, fuseaux Europe/Paris, symboles).

Analyse IA (LLM) → SmcAnalysis JSON conforme au schéma.

Validation (JSON schema côté back, valeurs bornées).

Persistance (TradeDoc).

Stats/agrégations (Mongo pipelines ou service dédié).

Correction humaine (UI) → sauvegarde versionnée (on garde l’auto + l’édité).

5) Prompt IA (fiable et reproductible)

Technicité : rôle “expert SMC”.

Contexte : symbol, TFs, heures (sessions), R, SL/TP.

Sortie : UNIQUEMENT un JSON valide correspondant au schéma plus haut (pas de texte libre hors champs).

Barème qualité (0–100):

Alignement HTF/MTF/LTF : 0–25

Raison d’entrée SMC claire : 0–25

Gestion du risque/partials : 0–20

Conditions (session/killzone/news) : 0–15

Cohérence structure/liq/OB/FVG : 0–15

Extrait (backend) :

```json
{
  "instruction": "Tu es un analyste Smart Money expert...",
  "input": {
    "rawTrade": { /* RawTrade */ },
    "context": {
      "sessions": ["Asia","London","NewYork"],
      "rules": ["Respect A+ setups", "Risk <= 1%"]
    }
  },
  "output_format": "JSON strict conforme à SmcAnalysis"
}

```

6) Statistiques & tableaux de bord (MVP → ++)

MVP

KPI : Winrate, Net P&L, R moyen, R médian, expectancy, max drawdown, vitesse de trade (durée).

Equity curve + distribution de R (histogramme).

Heatmap par jour/heure/session (Asia/London/NY).

Paires : perf par symbole.

Setups SMC : perf par entryModel, présence FVG/OB/sweep, par killzone.

Qualité IA : score moyen s/100, corrélations score ↔ R.

V2+

Effet news (avant/après évènement).

Confluence count (nb de signaux SMC) vs performance.

Erreur-type (liste improvements fréquentes + impact).

7) UI/UX (React)

Dashboard (KPI cards, equity curve, heatmap sessions, top erreurs + conseils).

Trades (table filtrable : date, pair, R, session, setup SMC, score).

Trade Detail : timeline, résumé SMC (badges), rationale, improvements, champs d’édition/validation.

Uploader (CSV/Excel), Batch Analyze (barre de progression), Audit (anomalies).

Filtres sauvegardés (ex: “London + FVG + A+”).

8) Endpoints backend (exemples)

POST /trades/import : upload CSV/Excel → RawTrade[]

POST /ai/analyze-trade : analyse 1 trade → SmcAnalysis

POST /ai/analyze-batch : file d’attente (batch) → jobs + webhooks internes

GET /trades : pagination + filtres (date, symbol, session, SMC props)

GET /trades/:id / PATCH /trades/:id : correction humaine

GET /stats/overview : KPI globaux

GET /stats/by-session / by-symbol / by-setup / correlations

9) Gouvernance des données & fiabilité

Validation JSON Schema (côté back) des réponses IA.

Versioning des analyses (smc.version, updatedAt).

Traçabilité : garde la requête IA et la réponse pour audit.

Idempotence : hash par (symbol, entryTime, volume, entryPrice) pour éviter doublons.

10) Roadmap (concrète)

Semaine 1

Normalisation import CSV FTMO/cTrader (8 colonnes min).

Modèles Mongo (TradeDoc).

Endpoints POST /trades/import, GET /trades.

Semaine 2

Endpoint POST /ai/analyze-trade + JSON Schema + tests.

UI React : Uploader + Table Trades + Détail basique.

Semaine 3

Stats MVP (/stats/overview, /stats/by-session).

Dashboard React (equity, KPI, heatmap).

Édition/correction SMC dans l’UI.

Semaine 4

Batch analyze + file de jobs.

Sauvegarde de filtres, tags, rapports PDF/CSV.

11) Premier jeu d’exemples (à viser côté import)

```json
{
  "id": "a5c4…",
  "source": "FTMO",
  "symbol": "EURUSD",
  "direction": "SHORT",
  "entryTime": "2025-08-18T08:47:00Z",
  "exitTime": "2025-08-18T09:22:00Z",
  "entryPrice": 1.09320,
  "exitPrice": 1.09190,
  "volume": 1.0,
  "stopLoss": 1.09380,
  "takeProfit": 1.09120,
  "commissions": -3.5,
  "pnlCurrency": "EUR",
  "pnl": 105.4,
  "rr": 1.8,
  "notes": "London AM, sweep EQH puis entrée sur FVG M1."
}
```

12) Décisions à prendre (je propose défauts sûrs)

Stack : React TS + Symfony/Mongo (réutiliser ton existant).

Source v1 : Import CSV/Excel FTMO/cTrader (puis temps réel via ton microservice cTrader).

Sessions (Europe/Paris) : Asia (00:00–07:59), London (08:00–12:59), NY (13:00–17:59).

Killzones : London AM (08:30–10:30), NY AM (14:30–16:00), NY PM (19:00–21:00) – ajustables.

Risk : bornes (0–2% par trade) pour la validation IA.