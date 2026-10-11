<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancelled_orders_are_listed_but_not_counted_as_sales(): void
    {
        $area = $this->deliveryArea(0);
        $product = Product::factory()->create(['price' => 500, 'stock' => 50]);
        $this->postJson('/api/orders', $this->orderPayload($area, [$product->id => 2]))->assertCreated();   // Rs. 1000
        $this->postJson('/api/orders', $this->orderPayload($area, [$product->id => 4]))->assertCreated();   // Rs. 2000
        Order::where('order_number', 'YUM-00002')->update(['status' => 'cancelled']);
        $this->actingAsAdmin();

        $this->getJson('/api/admin/sales?period=day')
            ->assertOk()
            ->assertJsonPath('summary.orders', 1)
            ->assertJsonPath('summary.sales_total', 1000)
            ->assertJsonPath('summary.cancelled_orders', 1)
            ->assertJsonCount(2, 'orders');
    }

    public function test_the_excel_download_is_a_real_xlsx_file(): void
    {
        $this->actingAsAdmin();

        $response = $this->get('/api/admin/sales/export?period=month');

        $response->assertOk()->assertDownload();
        $this->assertStringStartsWith('application/vnd.openxmlformats', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('PK', $response->streamedContent());   // .xlsx files are zip files
    }

    public function test_only_day_week_month_and_year_are_allowed(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/admin/sales?period=decade')->assertStatus(422);
    }
}
