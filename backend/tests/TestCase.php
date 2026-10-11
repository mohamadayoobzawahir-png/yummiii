<?php

namespace Tests;

use App\Models\DeliveryArea;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    // Safety guard: tests empty the database they use (RefreshDatabase). Only ever allow the
    // temporary in-memory one, never the real shop's MySQL. This runs right BEFORE the
    // database traits, so a wrong setting stops the tests before anything is wiped.
    protected function setUpTraits()
    {
        if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== ':memory:') {
            throw new RuntimeException('Tests must use the in-memory SQLite database (see phpunit.xml).');
        }

        return parent::setUpTraits();
    }

    // An admin, already logged in for the next requests
    protected function actingAsAdmin(): User
    {
        $admin = User::factory()->create();
        $admin->is_admin = true;
        $admin->save();
        $this->withToken($admin->createToken('test')->plainTextToken);

        return $admin;
    }

    protected function deliveryArea(int $fee = 150): DeliveryArea
    {
        return DeliveryArea::create(['name' => 'Kandy', 'fee' => $fee]);
    }

    // A valid checkout request for the given [product id => quantity]
    protected function orderPayload(DeliveryArea $area, array $items, array $extra = []): array
    {
        return [
            'customer_name' => 'Fathima',
            'phone' => '0771234567',
            'delivery_area_id' => $area->id,
            'address' => '12 Main Street',
            'items' => collect($items)->map(fn ($qty, $id) => ['product_id' => $id, 'quantity' => $qty])->values()->all(),
            ...$extra,
        ];
    }
}
