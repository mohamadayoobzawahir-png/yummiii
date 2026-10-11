<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    private const SHOP_TIMEZONE = 'Asia/Colombo';   // "today" means today in Sri Lanka

    // GET /api/admin/dashboard — the numbers for the admin home page
    public function __invoke()
    {
        $notCancelled = fn ($query) => $query->where('status', '!=', 'cancelled');

        return [
            // Cash already in hand (delivered) and cash still to collect (on its way)
            'cash_collected' => (int) Order::where('status', 'delivered')->sum('total'),
            'cash_to_collect' => (int) Order::whereIn('status', ['pending', 'confirmed', 'out_for_delivery'])->sum('total'),

            'orders_today' => Order::whereBetween('created_at', $this->day(0))->count(),
            'orders_total' => Order::count(),
            'items_sold' => (int) OrderItem::whereHas('order', $notCancelled)->sum('quantity'),

            // e.g. { "pending": 2, "delivered": 5 }
            'status_counts' => Order::selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),

            'best_sellers' => Product::withSoldCount()->orderByDesc('sold_count')->take(5)->get()
                ->filter(fn ($product) => $product->sold_count > 0)->values(),

            'low_stock' => Product::where('stock', '<=', Product::LOW_STOCK)->orderBy('stock')->get(),

            // Oldest day first, today last
            'last_7_days' => collect(range(6, 0))->map(function ($daysAgo) use ($notCancelled) {
                $orders = Order::whereBetween('created_at', $this->day($daysAgo))->where($notCancelled);

                return [
                    'date' => now(self::SHOP_TIMEZONE)->subDays($daysAgo)->toDateString(),
                    'orders' => (clone $orders)->count(),
                    'sales' => (int) (clone $orders)->sum('total'),
                ];
            }),
        ];
    }

    // Start and end of a Sri Lanka day, converted to the app's timezone (UTC) for the database
    private function day(int $daysAgo): array
    {
        $start = Carbon::now(self::SHOP_TIMEZONE)->subDays($daysAgo)->startOfDay();

        return [$start->copy()->utc(), $start->copy()->endOfDay()->utc()];
    }
}
