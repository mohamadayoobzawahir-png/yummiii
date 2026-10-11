<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderStatusTest extends TestCase
{
    use RefreshDatabase;

    private function placeOrder(Product $product, int $quantity): Order
    {
        $this->postJson('/api/orders', $this->orderPayload($this->deliveryArea(), [$product->id => $quantity]))->assertCreated();

        return Order::latest('id')->first();
    }

    public function test_an_order_moves_forward_one_step_at_a_time(): void
    {
        $order = $this->placeOrder(Product::factory()->create(), 1);
        $this->actingAsAdmin();

        $this->patchJson("/api/admin/orders/{$order->id}", ['status' => 'delivered'])
            ->assertStatus(422)
            ->assertJsonPath('message', "A pending order can't be changed to delivered.");

        foreach (['confirmed', 'out_for_delivery', 'delivered'] as $status) {
            $this->patchJson("/api/admin/orders/{$order->id}", ['status' => $status])
                ->assertOk()->assertJsonPath('status', $status);
        }

        // Delivered is final
        $this->patchJson("/api/admin/orders/{$order->id}", ['status' => 'cancelled'])->assertStatus(422);
    }

    public function test_cancelling_puts_the_stock_back_and_records_who_did_it(): void
    {
        $cake = Product::factory()->create(['stock' => 10]);
        $order = $this->placeOrder($cake, 4);
        $admin = $this->actingAsAdmin();

        $this->patchJson("/api/admin/orders/{$order->id}", ['status' => 'cancelled'])->assertOk();

        $this->assertSame(10, $cake->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $cake->id, 'quantity' => 4, 'reason' => 'cancelled',
            'order_id' => $order->id, 'user_id' => $admin->id,
        ]);
    }
}
