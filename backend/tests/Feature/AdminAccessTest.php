<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN_PAGES = ['/api/admin/dashboard', '/api/admin/orders', '/api/admin/products', '/api/admin/sales?period=day'];

    public function test_visitors_who_are_not_logged_in_get_401(): void
    {
        foreach (self::ADMIN_PAGES as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
    }

    public function test_a_logged_in_user_who_is_not_an_admin_gets_403(): void
    {
        $user = User::factory()->create();
        $this->withToken($user->createToken('test')->plainTextToken);

        foreach (self::ADMIN_PAGES as $url) {
            $this->getJson($url)->assertForbidden();
        }
    }

    public function test_admins_can_open_the_admin_pages(): void
    {
        $this->actingAsAdmin();

        foreach (self::ADMIN_PAGES as $url) {
            $this->getJson($url)->assertOk();
        }
    }

    public function test_only_admins_can_log_in_and_everyone_else_gets_the_same_message(): void
    {
        User::factory()->create(['email' => 'customer@test.lk', 'password' => 'secret123']);

        $this->postJson('/api/login', ['email' => 'customer@test.lk', 'password' => 'secret123'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'The email or password is incorrect.');

        $this->postJson('/api/login', ['email' => 'nobody@test.lk', 'password' => 'secret123'])
            ->assertJsonPath('message', 'The email or password is incorrect.');
    }

    public function test_nobody_can_make_themselves_an_admin_with_mass_assignment(): void
    {
        $user = User::create(['name' => 'Sneaky', 'email' => 'sneaky@test.lk', 'password' => 'secret123', 'is_admin' => true]);

        $this->assertFalse($user->fresh()->is_admin);
    }
}
