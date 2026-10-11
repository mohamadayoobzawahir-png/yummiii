<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->postJson('/api/orders', $this->orderPayload($this->deliveryArea(), [Product::factory()->create()->id => 1]))
            ->assertCreated();
    }

    public function test_customers_find_their_order_with_order_number_and_mobile(): void
    {
        // Forgiving input: lowercase, '#', spaces in the phone number
        $this->postJson('/api/orders/track', ['order_number' => '#yum-00001', 'phone' => '077 123 4567'])
            ->assertOk()
            ->assertJsonPath('order_number', 'YUM-00001')
            ->assertJsonPath('status', 'pending')
            ->assertJsonMissingPath('address')      // private details are never shown
            ->assertJsonMissingPath('notes');
    }

    public function test_a_wrong_mobile_gets_the_same_message_as_a_made_up_order(): void
    {
        $wrongPhone = $this->postJson('/api/orders/track', ['order_number' => 'YUM-00001', 'phone' => '0779999999']);
        $madeUp = $this->postJson('/api/orders/track', ['order_number' => 'YUM-99999', 'phone' => '0771234567']);

        $wrongPhone->assertNotFound();
        $madeUp->assertNotFound();
        $this->assertSame($wrongPhone->json('message'), $madeUp->json('message'));
    }
}
