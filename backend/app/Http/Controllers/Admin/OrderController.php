<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    // Which status can follow which. Delivered and cancelled are final.
    private const NEXT_STATUSES = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['out_for_delivery', 'cancelled'],
        'out_for_delivery' => ['delivered', 'cancelled'],
        'delivered' => [],
        'cancelled' => [],
    ];

    // GET /api/admin/orders — EVERY customer's orders, newest first
    public function index()
    {
        return Order::with('items')->latest()->get();
    }

    // PATCH /api/admin/orders/{order} — move an order to its next status
    public function update(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', 'string'],
        ]);

        $allowed = self::NEXT_STATUSES[$order->status] ?? [];
        if (! in_array($data['status'], $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => "A {$order->status} order can't be changed to {$data['status']}.",
            ]);
        }

        DB::transaction(function () use ($order, $data, $request) {
            // Cancelled → put the items back in stock (skipping products deleted since)
            if ($data['status'] === 'cancelled') {
                foreach ($order->items as $item) {
                    $product = $item->product_id ? Product::lockForUpdate()->find($item->product_id) : null;
                    $product?->changeStock($item->quantity, 'cancelled', $order, $request->user());
                }
            }

            $order->update(['status' => $data['status']]);
        });

        return $order->load('items');
    }
}
