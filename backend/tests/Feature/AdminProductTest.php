<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminProductTest extends TestCase
{
    use RefreshDatabase;

    // A real 1×1 PNG, so the "is this really a photo?" check passes
    private function photo(): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

        return UploadedFile::fake()->createWithContent('cake.png', $png);
    }

    public function test_an_admin_adds_a_product_with_a_photo_and_its_stock_is_recorded(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();
        $category = Category::factory()->create();

        $response = $this->post('/api/admin/products', [
            'name' => 'Mango Cake', 'category_id' => $category->id,
            'price' => 2200, 'offer_price' => 1900, 'stock' => 12, 'image' => $this->photo(),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('final_price', 1900)
            ->assertJsonPath('discount_percent', 14)
            ->assertJsonPath('stock', 12);

        $path = 'products/'.basename($response->json('image'));
        Storage::disk('public')->assertExists($path);
        $this->assertDatabaseHas('stock_movements', ['quantity' => 12, 'reason' => 'created']);
    }

    public function test_the_offer_must_be_cheaper_than_the_price(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create(['price' => 1000]);

        $this->patchJson("/api/admin/products/{$product->id}", ['offer_price' => 1200])
            ->assertStatus(422)
            ->assertJsonValidationErrors('offer_price');
    }

    public function test_changing_stock_by_hand_is_logged_as_restock_or_adjustment(): void
    {
        $admin = $this->actingAsAdmin();
        $product = Product::factory()->create(['stock' => 10]);

        $this->patchJson("/api/admin/products/{$product->id}", ['stock' => 25])->assertOk();
        $this->patchJson("/api/admin/products/{$product->id}", ['stock' => 20])->assertOk();
        $this->patchJson("/api/admin/products/{$product->id}", ['price' => 1200])->assertOk();   // no stock change → no log

        $this->assertSame(
            [['restock', 15, 25], ['adjusted', -5, 20]],
            $product->stockMovements()->orderBy('id')->get()->map(fn ($m) => [$m->reason, $m->quantity, $m->stock_after])->all(),
        );
        $this->assertSame($admin->id, $product->stockMovements()->first()->user_id);
    }
}
