<?php

namespace App\Document;


use Doctrine\ODM\MongoDB\Mapping\Annotations as ODM;


#[ODM\Document(collection: 'trades')]
class TradeDoc
{
        #[ODM\Id]
        private string $id;


        #[ODM\EmbedOne(targetDocument: RawTrade::class)]
        private RawTrade $raw;


        #[ODM\EmbedOne(targetDocument: SmcAnalysis::class, nullable: true)]
        private ?SmcAnalysis $smc = null;


        #[ODM\Field(type: 'collection')]
        private array $tags = [];


        #[ODM\Field(type: 'date_immutable')]
        private \DateTimeImmutable $createdAt;


        #[ODM\Field(type: 'date_immutable')]
        private \DateTimeImmutable $updatedAt;


        public function __construct(RawTrade $raw)
        {
                $this->raw = $raw;
                $now = new \DateTimeImmutable('now');
                $this->createdAt = $now;
                $this->updatedAt = $now;
        }


        // getters/setters …
}
