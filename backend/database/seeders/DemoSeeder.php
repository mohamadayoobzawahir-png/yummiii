<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\DeliveryArea;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

// Fills the PORTFOLIO DEMO with a believable shop: products with pictures and two months
// of orders, so the dashboard, sales chart, best sellers and stock history all look alive.
// Run by: php artisan yummiii:reset-demo   (refuses unless DEMO_MODE=true)
class DemoSeeder extends Seeder
{
    private const TIMEZONE = 'Asia/Colombo';
    private const DAYS = 60;   // how far back the order history goes

    private User $admin;

    public function run(): void
    {
        mt_srand(2026);   // the same "random" shop after every reset

        $this->call(DeliveryAreaSeeder::class);

        $this->admin = new User([
            'name' => 'Demo Admin',
            'email' => config('yummiii.demo_email'),
            'password' => config('yummiii.demo_password'),
        ]);
        $this->admin->is_admin = true;   // not fillable on purpose
        $this->admin->save();

        // One transaction: hundreds of rows are saved in one go (much faster), and a
        // half-finished demo is never left behind if something fails
        DB::transaction(function () {
            $products = $this->createProducts();
            $this->createOrders($products);
            $this->finishStock($products);
        });
    }

    /** @return array<string, Product> keyed by name */
    private function createProducts(): array
    {
        // name, price, offer price, emoji — grouped by category
        $menu = [
            ['🎂', 'Cakes', ['#FDE68A', '#F59E0B'], [
                ['Chocolate Fudge Cake', 2500, 2100, '🎂'],
                ['Red Velvet Cake', 2800, null, '🍰'],
                ['Ribbon Cake', 1900, null, '🎀'],
                ['Strawberry Cupcakes (6)', 1200, 990, '🧁'],
            ]],
            ['🍔', 'Fast Food', ['#FCA5A5', '#EB2023'], [
                ['Chicken Burger', 850, 750, '🍔'],
                ['Cheese Pizza', 1600, null, '🍕'],
                ['Chicken Submarine', 950, null, '🥖'],
            ]],
            ['🥟', 'Short Eats', ['#BEF264', '#5CB946'], [
                ['Fish Bun', 120, null, '🥯'],
                ['Chicken Roll', 150, 130, '🌯'],
                ['Vegetable Samosa', 100, null, '🥟'],
            ]],
            ['🍬', 'Sweets', ['#C4B5FD', '#7C3AED'], [
                ['Chocolate Brownie', 350, null, '🍫'],
                ['Glazed Donut', 200, null, '🍩'],
                ['Watalappan', 450, 400, '🍮'],
            ]],
            ['🥤', 'Drinks', ['#7DD3FC', '#0284C7'], [
                ['Mango Smoothie', 550, null, '🥭'],
                ['Iced Milo', 400, null, '🧋'],
            ]],
        ];

        $start = CarbonImmutable::now(self::TIMEZONE)->subDays(self::DAYS)->setTime(8, 0)->utc();
        $products = [];

        foreach ($menu as $order => [$categoryEmoji, $categoryName, $colors, $items]) {
            $category = Category::create([
                'name' => $categoryName,
                'slug' => Str::slug($categoryName),
                'emoji' => $categoryEmoji,
                'sort_order' => $order,
            ]);

            foreach ($items as [$name, $price, $offer, $emoji]) {
                $path = 'products/demo-'.Str::slug($name).'.svg';
                Storage::disk('public')->put($path, $this->picture($emoji, $name, ...$colors));

                $product = Product::create([
                    'category_id' => $category->id,
                    'name' => $name,
                    'price' => $price,
                    'offer_price' => $offer,
                    'image' => Storage::disk('public')->url($path),
                    'stock' => 0,
                ]);
                $product->changeStock(120, 'opening');
                $this->backdateLastMovement($product, $start);

                $products[$name] = $product;
            }
        }

        return $products;
    }

    private function createOrders(array $products): void
    {
        $names = ['Fathima Rizna', 'Nimal Perera', 'Ayesha Nazeer', 'Kasun Silva', 'Shifna Ameer', 'Dilani Fernando',
            'Mohamed Rifkhan', 'Tharushi Jayasinghe', 'Sajith Bandara', 'Nusrath Haniffa', 'Ishara Wickramasinghe',
            'Rukshan Kumara', 'Zainab Fauzer', 'Pradeep Rathnayake', 'Hasini Gunawardena'];
        $streets = ['Main Street', 'Temple Road', 'Lake Road', 'Peradeniya Road', 'Katugastota Road', 'Mosque Lane', 'Hill Street'];
        $areas = DeliveryArea::all();
        $catalog = array_values($products);
        $now = CarbonImmutable::now(self::TIMEZONE);
        $count = 0;

        for ($daysAgo = self::DAYS; $daysAgo >= 0; $daysAgo--) {
            // Busier recently and on weekends. "Today" always gets 3 orders from the last
            // few hours, so visitors find orders waiting to be confirmed whenever they come.
            $day = $now->subDays($daysAgo);
            $orders = $daysAgo === 0 ? 3 : mt_rand(0, $daysAgo < 14 ? 4 : 2) + ($day->isWeekend() ? 1 : 0);

            for ($i = 0; $i < $orders; $i++) {
                $at = $daysAgo === 0
                    ? $now->subMinutes(mt_rand(15, 300))
                    : $day->setTime(mt_rand(8, 20), mt_rand(0, 59));

                // 1–3 different products, 1–3 of each
                $picked = (array) array_rand($catalog, mt_rand(1, 3));
                $lines = [];
                foreach ($picked as $index) {
                    $product = $catalog[$index]->fresh();
                    $quantity = mt_rand(1, 3);
                    $lines[] = [$product, $quantity, $product->final_price];
                }

                $area = $areas->random();
                $subtotal = array_sum(array_map(fn ($l) => $l[1] * $l[2], $lines));

                $order = new Order([
                    'customer_name' => $names[array_rand($names)],
                    'phone' => '07'.mt_rand(10000000, 99999999),
                    'delivery_area' => $area->name,
                    'address' => mt_rand(1, 199).' '.$streets[array_rand($streets)].', '.$area->name,
                    'notes' => mt_rand(1, 5) === 1 ? 'Please call when you arrive' : null,
                    'subtotal' => $subtotal,
                    'delivery_fee' => $area->fee,
                    'total' => $subtotal + $area->fee,
                    'status' => $this->statusFor($daysAgo),
                ]);
                $order->created_at = $at->utc();
                $order->updated_at = $at->utc();
                $order->save();
                $order->update(['order_number' => 'YUM-'.str_pad($order->id, 5, '0', STR_PAD_LEFT)]);
                $count++;

                foreach ($lines as [$product, $quantity, $price]) {
                    $order->items()->create([
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'price' => $price,
                        'quantity' => $quantity,
                        'line_total' => $price * $quantity,
                    ]);
                    $product->changeStock(-$quantity, 'order', $order);
                    $this->backdateLastMovement($product, $at->utc());

                    if ($order->status === 'cancelled') {
                        $product->changeStock($quantity, 'cancelled', $order, $this->admin);
                        $this->backdateLastMovement($product, $at->addHours(2)->utc());
                    }
                }
            }
        }

        $this->command?->info("   {$count} demo orders created");
    }

    // Old orders are mostly delivered; recent ones are still on their way
    private function statusFor(int $daysAgo): string
    {
        $roll = mt_rand(1, 100);

        return match (true) {
            $daysAgo === 0 => $roll <= 70 ? 'pending' : 'confirmed',
            $daysAgo === 1 => $roll <= 50 ? 'out_for_delivery' : ($roll <= 85 ? 'delivered' : 'confirmed'),
            default => $roll <= 88 ? 'delivered' : 'cancelled',
        };
    }

    // A restock, a breakage and some low / sold-out items, so the Stock page has something to show
    private function finishStock(array $products): void
    {
        $now = CarbonImmutable::now(self::TIMEZONE);
        $adjust = function (string $name, int $setTo, string $reason, CarbonImmutable $at) use ($products) {
            $product = $products[$name]->fresh();
            $product->changeStock($setTo - $product->stock, $reason, user: $this->admin);
            $this->backdateLastMovement($product, $at->utc());
        };

        $adjust('Fish Bun', 150, 'restock', $now->subDays(20)->setTime(7, 30));
        $adjust('Glazed Donut', 140, 'restock', $now->subDays(9)->setTime(7, 45));
        $adjust('Watalappan', 60, 'adjusted', $now->subDays(5)->setTime(18, 10));
        $adjust('Chocolate Brownie', 3, 'adjusted', $now->subDays(1)->setTime(19, 0));
        $adjust('Ribbon Cake', 4, 'adjusted', $now->subDays(1)->setTime(19, 5));
        $adjust('Cheese Pizza', 0, 'adjusted', $now->subHours(5));
    }

    private function backdateLastMovement(Product $product, $at): void
    {
        $movement = $product->stockMovements()->latest('id')->first();
        $movement->created_at = $at;
        $movement->updated_at = $at;
        $movement->save();
    }

    // A simple on-brand picture: a gradient, a big emoji and the product name
    private function picture(string $emoji, string $name, string $from, string $to): string
    {
        $label = htmlspecialchars($name, ENT_XML1);

        return <<<SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="{$from}"/>
              <stop offset="1" stop-color="{$to}"/>
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill="url(#g)"/>
          <circle cx="200" cy="128" r="84" fill="#FFFFFF" opacity="0.28"/>
          <text x="200" y="162" font-size="100" text-anchor="middle">{$emoji}</text>
          <text x="200" y="266" font-size="22" font-weight="800" font-family="Nunito, Arial, sans-serif"
                fill="#FFFFFF" text-anchor="middle">{$label}</text>
        </svg>
        SVG;
    }
}
