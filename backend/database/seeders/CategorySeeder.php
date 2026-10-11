<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Cakes',     'slug' => 'cakes',     'emoji' => '🎂', 'sort_order' => 0],
            ['name' => 'Fast Food', 'slug' => 'fast-food', 'emoji' => '🍔', 'sort_order' => 1],
            ['name' => 'Sweets',    'slug' => 'sweets',    'emoji' => '🍬', 'sort_order' => 2],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
