<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Needed everywhere, including the live shop
        $this->call(DeliveryAreaSeeder::class);
        $this->call(CategorySeeder::class);

        // Demo data for your computer ONLY. Never on the live site: the test admin's
        // password is "password". Live admins are made with: php artisan yummiii:admin
        if (app()->environment('local')) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'is_admin' => true,
            ]);
            $this->call(ProductSeeder::class);
        }
    }
}
