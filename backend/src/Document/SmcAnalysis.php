<?php

namespace App\Document;


use Doctrine\ODM\MongoDB\Mapping\Annotations as ODM;


#[ODM\EmbeddedDocument]
class SmcAnalysis
{
        #[ODM\Field(type: 'string')]
        public string $version;


        #[ODM\Field(type: 'hash')]
        public array $timeframeAlignment = [];


        #[ODM\Field(type: 'hash')]
        public array $structure = [];


        #[ODM\Field(type: 'hash')]
        public array $liquidity = [];


        #[ODM\Field(type: 'hash', nullable: true)]
        public ?array $orderBlock = null;


        #[ODM\Field(type: 'hash', nullable: true)]
        public ?array $fvg = null;


        #[ODM\Field(type: 'hash')]
        public array $session = [];


        #[ODM\Field(type: 'string', nullable: true)]
        public ?string $entryModel = null;


        #[ODM\Field(type: 'hash')]
        public array $risk = [];


        #[ODM\Field(type: 'hash', nullable: true)]
        public ?array $newsFilter = null;


        #[ODM\Field(type: 'int')]
        public int $qualityScore;


        #[ODM\Field(type: 'string')]
        public string $rationale;


        #[ODM\Field(type: 'collection')]
        public array $improvements = [];
}
