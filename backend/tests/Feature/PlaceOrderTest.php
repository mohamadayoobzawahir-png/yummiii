<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlaceOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_server_sets_the_price_even_if_the_browser_sends_a_fake_one(): void
    {
        $area = $this->deliveryArea(150);
        $cake = Product::factory()->create(['price' => 2500, 'offer_price' => 2000]);

        $payload = $this->orderPayload($area, [$cake->id => 2]);
        $payload['items'][0]['price'] = 1;   // a "hacker" edits the price
        $payload['total'] = 5;

        $this->postJson('/api/orders', $payload)
            ->assertCreated()
            ->assertJsonPath('items.0.price', 2000)     // each item saved at the offer price
            ->assertJsonPath('items.0.line_total', 4000)
            ->assertJsonPath('subtotal', 4000)          // 2 × offer price 2000
            ->assertJsonPath('delivery_fee', 150)
            ->assertJsonPath('total', 4150)
            ->assertJsonPath('order_number', 'YUM-00001');
    }

    public function test_an_order_takes_stock_and_writes_stock_history(): void
    {
        $area = $this->deliveryArea();
        $donut = Product::factory()->create(['stock' => 10]);

        $this->postJson('/api/orders', $this->orderPayload($area, [$donut->id => 3]))->assertCreated();

        $this->assertSame(7, $donut->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $donut->id, 'quantity' => -3, 'stock_after' => 7, 'reason' => 'order',
        ]);
    }

    public function test_a_product_becomes_out_of_stock_automatically_at_zero(): void
    {
        $area = $this->deliveryArea();
        $brownie = Product::factory()->create(['stock' => 2]);

        $this->postJson('/api/orders', $this->orderPayload($area, [$brownie->id => 2]))->assertCreated();

        $this->getJson("/api/products/{$brownie->id}")->assertJsonPath('in_stock', false);
        $this->postJson('/api/orders', $this->orderPayload($area, [$brownie->id => 1]))
            ->assertStatus(422)
            ->assertJsonPath('message', "Sorry, {$brownie->name} is out of stock.");
    }

    public function test_you_cannot_order_more_than_the_stock_and_nothing_is_saved(): void
    {
        $area = $this->deliveryArea();
        $donut = Product::factory()->create(['stock' => 10]);
        $brownie = Product::factory()->create(['stock' => 3]);

        $this->postJson('/api/orders', $this->orderPayload($area, [$donut->id => 1, $brownie->id => 5]))
            ->assertStatus(422)
            ->assertJsonPath('message', "Sorry, only 3 × {$brownie->name} left.");

        // The whole order failed: no order, and the donut's stock wasn't touched either
        $this->assertSame(0, Order::count());
        $this->assertSame(10, $donut->fresh()->stock);
    }

    public function test_the_checkout_form_is_validated(): void
    {
        $area = $this->deliveryArea();
        $product = Product::factory()->create();

        $this->postJson('/api/orders', $this->orderPayload($area, [$product->id => 1], ['phone' => '123']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');

        $this->postJson('/api/orders', $this->orderPayload($area, [999 => 1]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.product_id');
    }
}
