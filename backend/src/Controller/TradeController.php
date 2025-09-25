<?php

namespace App\Controller;


use App\Document\{TradeDoc, RawTrade, SmcAnalysis};
use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Component\HttpFoundation\{Request, JsonResponse};
use Symfony\Component\Routing\Annotation\Route;


class TradeController
{
        public function __construct(private DocumentManager $dm) {}


        #[Route('/trades', methods: ['GET'])]
        public function list(Request $req): JsonResponse
        {
                $page = max(1, (int)$req->query->get('page', 1));
                $limit = min(100, (int)$req->query->get('limit', 25));
                $repo = $this->dm->getRepository(TradeDoc::class);
                $qb = $repo->createQueryBuilder();
                // TODO: filtres symbol/session/etc.
                $qb->limit($limit)->skip(($page - 1) * $limit)->sort('raw.entryTime', 'desc');
                $items = $qb->getQuery()->execute()->toArray();
                return new JsonResponse(['items' => $items]);
        }

        #[Route('/trades/import', methods: ['POST'])]
        public function import(Request $req): JsonResponse
        {
                $data = $req->toArray(); // attend un tableau de RawTrade normalisés
                $inserted = 0;
                foreach ($data as $row) {
                        $raw = new RawTrade();
                        $raw->source = $row['source'] ?? 'CSV';
                        $raw->symbol = $row['symbol'];
                        $raw->direction = $row['direction'];
                        $raw->entryTime = new \DateTimeImmutable($row['entryTime']);
                        $raw->exitTime = new \DateTimeImmutable($row['exitTime']);
                        $raw->entryPrice = (float)$row['entryPrice'];
                        $raw->exitPrice = (float)$row['exitPrice'];
                        $raw->volume = (float)$row['volume'];
                        $raw->stopLoss = $row['stopLoss'] ?? null;
                        $raw->takeProfit = $row['takeProfit'] ?? null;
                        $raw->commissions = $row['commissions'] ?? null;
                        $raw->pnlCurrency = $row['pnlCurrency'] ?? 'EUR';
                        $raw->pnl = (float)$row['pnl'];
                        $raw->rr = $row['rr'] ?? null;
                        $raw->notes = $row['notes'] ?? null;


                        $doc = new TradeDoc($raw);
                        $this->dm->persist($doc);
                        $inserted++;
                }
                $this->dm->flush();
                return new JsonResponse(['inserted' => $inserted]);
        }

        #[Route('/ai/analyze-trade/{id}', methods: ['POST'])]
        public function analyze(string $id): JsonResponse
        {
                $doc = $this->dm->find(TradeDoc::class, $id);
                if (!$doc) return new JsonResponse(['error' => 'Not found'], 404);


                // TODO: appeler un service IA → pour le MVP on simule une réponse valide
                $smc = new SmcAnalysis();
                $smc->version = 'smc-v1';
                $smc->timeframeAlignment = ['htf' => 'Bullish', 'mtf' => 'Bearish', 'ltf' => 'Range'];
                $smc->structure = ['bias' => 'Bearish', 'chochOrMSS' => 'CHOCH', 'premiumDiscount' => 'Premium'];
                $smc->liquidity = ['taken' => ['BuySide'], 'resting' => ['Below'], 'sweep' => 'BuySide'];
                $smc->orderBlock = ['type' => 'BearishOB', 'timeframe' => 'LTF', 'mitigated' => true];
                $smc->fvg = ['present' => true, 'timeframe' => 'LTF', 'role' => 'Entry'];
                $smc->session = ['name' => 'London', 'killzone' => 'LondonAM'];
                $smc->entryModel = 'FVG';
                $smc->risk = ['riskPerTradePct' => 0.5, 'stopType' => 'Structure', 'partials' => [['atRR' => 1, 'sizePct' => 50]]];
                $smc->newsFilter = ['highImpactNear' => false];
                $smc->qualityScore = 78;
                $smc->rationale = 'Sweep EQH → CHOCH → FVG LTF entrée, alignement MTF acceptable.';
                $smc->improvements = ['Attendre mitigation complète', 'Réduire le risque si HTF contraire'];


                $doc->smc = $smc;
                $this->dm->flush();


                return new JsonResponse(['ok' => true]);
        }
}
