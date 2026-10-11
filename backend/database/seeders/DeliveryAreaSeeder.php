<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\DeliveryArea;
use Illuminate\Database\Seeder;

class DeliveryAreaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ⚠️ Example towns and fees — change them to your real ones
        $areas = [
            ['name' => 'Akurana',      'fee' => 0],
            ['name' => 'Alawathugoda', 'fee' => 150],
            ['name' => 'Katugastota',  'fee' => 200],
            ['name' => 'Kandy',        'fee' => 350],
            ['name' => 'Matale',       'fee' => 450],
        ];

        foreach ($areas as $area) {
            DeliveryArea::create($area);
        }
    }
}
