<?php

namespace App\Document;


use Doctrine\ODM\MongoDB\Mapping\Annotations as ODM;


#[ODM\EmbeddedDocument]
class RawTrade
{
        #[ODM\Field(type: 'string')]
        public string $source; // FTMO|cTrader|CSV


        #[ODM\Field(type: 'string')]
        public string $symbol; // EURUSD


        #[ODM\Field(type: 'string')]
        public string $direction; // LONG|SHORT


        #[ODM\Field(type: 'date_immutable')]
        public \DateTimeImmutable $entryTime;


        #[ODM\Field(type: 'date_immutable')]
        public \DateTimeImmutable $exitTime;


        #[ODM\Field(type: 'float')]
        public float $entryPrice;


        #[ODM\Field(type: 'float')]
        public float $exitPrice;


        #[ODM\Field(type: 'float')]
        public float $volume; // lots


        #[ODM\Field(type: 'float', nullable: true)]
        public ?float $stopLoss = null;


        #[ODM\Field(type: 'float', nullable: true)]
        public ?float $takeProfit = null;


        #[ODM\Field(type: 'float', nullable: true)]
        public ?float $commissions = null;


        #[ODM\Field(type: 'string', nullable: true)]
        public ?string $pnlCurrency = null; // EUR|USD


        #[ODM\Field(type: 'float')]
        public float $pnl;


        #[ODM\Field(type: 'float', nullable: true)]
        public ?float $rr = null;


        #[ODM\Field(type: 'string', nullable: true)]
        public ?string $notes = null;
}
