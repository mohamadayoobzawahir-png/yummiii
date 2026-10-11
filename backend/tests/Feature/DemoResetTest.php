<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemoResetTest extends TestCase
{
    // Not RefreshDatabase: the reset itself rebuilds the database, which can't happen
    // inside the transaction RefreshDatabase wraps each test in
    use DatabaseMigrations;

    public function test_the_reset_refuses_to_run_on_the_real_shop(): void
    {
        config(['yummiii.demo' => false]);
        $realProduct = Product::factory()->create();

        $this->artisan('yummiii:reset-demo')->assertFailed();

        $this->assertModelExists($realProduct);   // nothing was wiped
    }

    public function test_the_demo_reset_builds_a_believable_shop(): void
    {
        config(['yummiii.demo' => true]);
        Storage::fake('public');

        $this->artisan('yummiii:reset-demo')->assertSuccessful();

        $this->assertTrue(User::where('email', 'demo@yummiii.app')->value('is_admin'));
        $this->assertSame(15, Product::count());
        $this->assertGreaterThan(30, Order::count());
        $this->assertTrue(Order::where('status', 'pending')->exists());   // something for visitors to confirm

        // Every product's stock matches the last line of its stock history
        foreach (Product::all() as $product) {
            $this->assertSame($product->stock, $product->stockMovements()->latest('id')->value('stock_after'));
        }
    }

    public function test_the_demo_login_is_only_shown_on_the_demo(): void
    {
        config(['yummiii.demo' => false]);
        $this->getJson('/api/config')->assertExactJson(['demo' => false]);

        config(['yummiii.demo' => true]);
        $this->getJson('/api/config')->assertJsonPath('demo', true)->assertJsonPath('demo_email', 'demo@yummiii.app');
    }
}
