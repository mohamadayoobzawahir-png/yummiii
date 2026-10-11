<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $category = Category::pluck('id', 'name');   // ['Cakes' => 1, 'Fast Food' => 2, ...]

        $products = [
            ['name' => 'Chocolate Fudge Cake', 'category_id' => $category['Cakes'],     'price' => 2500, 'offer_price' => 2000, 'stock' => 10, 'image' => 'https://placehold.co/400x300?text=Chocolate+Cake'],
            ['name' => 'Red Velvet Cake',      'category_id' => $category['Cakes'],     'price' => 2800, 'offer_price' => null, 'stock' => 8,  'image' => 'https://placehold.co/400x300?text=Red+Velvet'],
            ['name' => 'Chicken Burger',       'category_id' => $category['Fast Food'], 'price' => 850,  'offer_price' => 750,  'stock' => 25, 'image' => 'https://placehold.co/400x300?text=Burger'],
            ['name' => 'Cheese Pizza',         'category_id' => $category['Fast Food'], 'price' => 1600, 'offer_price' => null, 'stock' => 0,  'image' => 'https://placehold.co/400x300?text=Pizza'],
            ['name' => 'Chocolate Brownie',    'category_id' => $category['Sweets'],    'price' => 350,  'offer_price' => null, 'stock' => 3,  'image' => 'https://placehold.co/400x300?text=Brownie'],
            ['name' => 'Glazed Donut',         'category_id' => $category['Sweets'],    'price' => 200,  'offer_price' => null, 'stock' => 40, 'image' => 'https://placehold.co/400x300?text=Donut'],
        ];

        foreach ($products as $product) {
            // Stock goes through changeStock, so the history starts with the opening stock
            Product::create([...$product, 'stock' => 0])->changeStock($product['stock'], 'opening');
        }
    }
}
