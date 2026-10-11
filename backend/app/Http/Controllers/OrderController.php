<?php

namespace App\Http\Controllers;

use App\Models\DeliveryArea;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    // POST /api/orders — place a Cash on Delivery order
    public function store(Request $request)
    {
        // 1. Check what the customer sent. Notice: NO prices are accepted from the browser
        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'regex:/^07\d{8}$/'],
            'delivery_area_id' => ['required', 'integer', 'exists:delivery_areas,id'],
            'address' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:50'],
        ], [
            'phone.regex' => 'Enter a 10-digit mobile number starting with 07.',
        ]);

        $area = DeliveryArea::findOrFail($data['delivery_area_id']);

        // 2–4 happen inside ONE transaction: if anything fails, nothing is saved
        // and no stock is taken
        $order = DB::transaction(function () use ($data, $area) {
            // 2. Look up the REAL products. lockForUpdate: if two customers buy the last
            //    cake at the same moment, the second one waits until the first is done
            $products = Product::whereIn('id', array_column($data['items'], 'product_id'))
                ->lockForUpdate()->get()->keyBy('id');

            // 3. Check stock and calculate every price on the server (offer price if any)
            $lines = [];
            foreach ($data['items'] as $index => $item) {
                $product = $products[$item['product_id']];

                if ($product->stock < $item['quantity']) {
                    throw ValidationException::withMessages([
                        "items.$index.product_id" => $product->stock === 0
                            ? "Sorry, {$product->name} is out of stock."
                            : "Sorry, only {$product->stock} × {$product->name} left.",
                    ]);
                }

                $lines[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'price' => $product->final_price,
                    'quantity' => $item['quantity'],
                    'line_total' => $product->final_price * $item['quantity'],
                ];
            }
            $subtotal = array_sum(array_column($lines, 'line_total'));

            // 4. Save the order and its items
            $order = Order::create([
                'customer_name' => $data['customer_name'],
                'phone' => $data['phone'],
                'delivery_area' => $area->name,
                'address' => $data['address'],
                'notes' => $data['notes'] ?? null,
                'subtotal' => $subtotal,
                'delivery_fee' => $area->fee,
                'total' => $subtotal + $area->fee,
            ]);

            $order->items()->createMany($lines);
            $order->update(['order_number' => 'YUM-'.str_pad($order->id, 5, '0', STR_PAD_LEFT)]);

            // 5. Take the items out of stock (each change is written in the stock history)
            foreach ($data['items'] as $item) {
                $products[$item['product_id']]->changeStock(-$item['quantity'], 'order', $order);
            }

            return $order;
        });

        // 201 = "Created"
        return response()->json($order->load('items'), 201);
    }

    // POST /api/orders/track — a guest checks their order with order number + phone.
    // POST (not GET) so the phone number doesn't end up in URLs and server logs.
    public function track(Request $request)
    {
        $data = $request->validate([
            'order_number' => ['required', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:20'],
        ]);

        // Be forgiving with what customers type: "#yum-00003", "YUM-00003" and "3" all work
        $number = strtoupper(ltrim(trim($data['order_number']), '#'));
        if (ctype_digit($number)) {
            $number = 'YUM-'.str_pad($number, 5, '0', STR_PAD_LEFT);
        }

        $order = Order::with('items')
            ->where('order_number', $number)
            ->where('phone', preg_replace('/\D/', '', $data['phone']))   // keep digits only: "077 123 4567" works
            ->first();

        // Same message whether the number is wrong or the phone doesn't match,
        // so nobody can find out which order numbers exist
        if (! $order) {
            return response()->json([
                'message' => "We couldn't find an order with that number and mobile. Please check and try again.",
            ], 404);
        }

        // Only what the customer needs to see: no address or notes
        return $order->only([
            'order_number', 'customer_name', 'status', 'delivery_area',
            'subtotal', 'delivery_fee', 'total', 'created_at', 'items',
        ]);
    }
}
