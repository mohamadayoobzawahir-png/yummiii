<?php

namespace App\Services;

use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

// Builds the sales numbers for one day / week / month / year.
// Used by the Sales page (JSON) and the Excel download, so both always agree.
class SalesReport
{
    public const TIMEZONE = 'Asia/Colombo';   // "today" means today in Sri Lanka
    public const PERIODS = ['day', 'week', 'month', 'year'];

    public const STATUS_LABELS = [
        'pending' => 'Waiting for confirmation',
        'confirmed' => 'Confirmed',
        'out_for_delivery' => 'Out for delivery',
        'delivered' => 'Delivered',
        'cancelled' => 'Cancelled',
    ];

    private CarbonImmutable $start;
    private CarbonImmutable $end;

    // $date: any day inside the period we want (e.g. '2026-10-11' + 'month' = October 2026)
    public function __construct(private string $period, ?string $date = null)
    {
        $anchor = $date
            ? CarbonImmutable::parse($date, self::TIMEZONE)
            : CarbonImmutable::now(self::TIMEZONE);

        [$this->start, $this->end] = match ($period) {
            'day' => [$anchor->startOfDay(), $anchor->endOfDay()],
            'week' => [$anchor->startOfWeek(CarbonImmutable::MONDAY), $anchor->endOfWeek(CarbonImmutable::SUNDAY)],
            'month' => [$anchor->startOfMonth(), $anchor->endOfMonth()],
            'year' => [$anchor->startOfYear(), $anchor->endOfYear()],
        };
    }

    public function label(): string
    {
        return match ($this->period) {
            'day' => $this->start->format('D j M Y'),                                    // Sat 11 Oct 2026
            'week' => $this->start->format('j M').' – '.$this->end->format('j M Y'),     // 6 Oct – 12 Oct 2026
            'month' => $this->start->format('F Y'),                                      // October 2026
            'year' => $this->start->format('Y'),                                         // 2026
        };
    }

    // e.g. yummiii-sales-month-2026-10-01.xlsx
    public function fileName(): string
    {
        return "yummiii-sales-{$this->period}-{$this->start->toDateString()}.xlsx";
    }

    // Every order placed in the period (cancelled ones too: the Excel lists them)
    public function orders(): Collection
    {
        return Order::with('items')
            // The database stores UTC, so convert the Sri Lanka start/end to UTC
            ->whereBetween('created_at', [$this->start->utc(), $this->end->utc()])
            ->orderBy('created_at')
            ->get();
    }

    public function build(): array
    {
        $orders = $this->orders();
        $sold = $orders->where('status', '!=', 'cancelled');   // cancelled orders aren't sales
        $salesTotal = (int) $sold->sum('total');
        $now = CarbonImmutable::now(self::TIMEZONE);

        return [
            'period' => $this->period,
            'label' => $this->label(),
            'start' => $this->start->toDateString(),
            'end' => $this->end->toDateString(),
            'is_current' => $now->between($this->start, $this->end),
            // Any day in the previous / next period, for the ‹ › buttons
            'previous' => $this->start->subDay()->toDateString(),
            'next' => $this->end->addDay()->toDateString(),

            'summary' => [
                'orders' => $sold->count(),
                'items_sold' => (int) $sold->flatMap->items->sum('quantity'),
                'sales_total' => $salesTotal,
                'cash_collected' => (int) $sold->where('status', 'delivered')->sum('total'),
                'cash_to_collect' => (int) $sold->where('status', '!=', 'delivered')->sum('total'),
                'average_order' => $sold->count() ? (int) round($salesTotal / $sold->count()) : 0,
                'cancelled_orders' => $orders->where('status', 'cancelled')->count(),
            ],

            'chart' => $this->chart($sold),

            // Best sellers in this period (by sales)
            'products' => $sold->flatMap->items
                ->groupBy('product_name')
                ->map(fn ($items, $name) => [
                    'name' => $name,
                    'quantity' => (int) $items->sum('quantity'),
                    'sales' => (int) $items->sum('line_total'),
                ])
                ->sortByDesc('sales')
                ->values(),

            'orders' => $orders->sortByDesc('created_at')->values()->map(fn ($order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'created_at' => $order->created_at,
                'customer_name' => $order->customer_name,
                'phone' => $order->phone,
                'delivery_area' => $order->delivery_area,
                'status' => $order->status,
                'items' => (int) $order->items->sum('quantity'),
                'total' => $order->total,
            ]),
        ];
    }

    // Bars for the chart: hours of the day, days of the week/month, or months of the year
    private function chart(Collection $sold): array
    {
        $buckets = match ($this->period) {
            'day' => collect(range(0, 23))->map(fn ($h) => ['key' => $h, 'label' => $this->start->setTime($h, 0)->format('ga')]),
            'week' => collect(range(0, 6))->map(fn ($d) => ['key' => $this->start->addDays($d)->toDateString(), 'label' => $this->start->addDays($d)->format('D')]),
            'month' => collect(range(1, $this->start->daysInMonth))->map(fn ($d) => ['key' => $d, 'label' => (string) $d]),
            'year' => collect(range(1, 12))->map(fn ($m) => ['key' => $m, 'label' => $this->start->setMonth($m)->format('M')]),
        };

        // Which bucket each order falls in (in Sri Lanka time)
        $keyOf = function ($order) {
            $at = CarbonImmutable::parse($order->created_at)->setTimezone(self::TIMEZONE);

            return match ($this->period) {
                'day' => $at->hour,
                'week' => $at->toDateString(),
                'month' => $at->day,
                'year' => $at->month,
            };
        };
        $grouped = $sold->groupBy($keyOf);

        return $buckets->map(fn ($bucket) => [
            'label' => $bucket['label'],
            'orders' => isset($grouped[$bucket['key']]) ? $grouped[$bucket['key']]->count() : 0,
            'sales' => isset($grouped[$bucket['key']]) ? (int) $grouped[$bucket['key']]->sum('total') : 0,
        ])->values()->all();
    }
}
