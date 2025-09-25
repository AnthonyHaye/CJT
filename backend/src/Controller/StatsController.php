<?php

namespace App\Controller;


use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;


class StatsController
{
        public function __construct(private DocumentManager $dm) {}


        #[Route('/stats/overview', methods: ['GET'])]
        public function overview(): JsonResponse
        {
                $db = $this->dm->getDocumentDatabase('App\\Document\\TradeDoc');
                $agg = $db->selectCollection('trades')->aggregate([
                        ['\$group' => [
                                '_id' => null,
                                'count' => ['\$sum' => 1],
                                'netPnl' => ['\$sum' => '\$raw.pnl'],
                                'avgR' => ['\$avg' => ['\$ifNull' => ['\$raw.rr', 0]]],
                                'winrate' => ['\$avg' => ['\$cond' => [['\$gt' => ['\$raw.pnl', 0]], 1, 0]]]
                        ]]
                ]);
                $doc = $agg->toArray()[0] ?? ['count' => 0, 'netPnl' => 0, 'avgR' => 0, 'winrate' => 0];
                return new JsonResponse([
                        'count' => $doc['count'] ?? 0,
                        'netPnl' => $doc['netPnl'] ?? 0,
                        'avgR' => $doc['avgR'] ?? 0,
                        'winrate' => round(($doc['winrate'] ?? 0) * 100, 2)
                ]);
        }
}
