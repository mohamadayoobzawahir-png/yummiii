<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One change in a product's stock. Created by Product::changeStock(), never by hand.
class StockMovement extends Model
{
    public const REASONS = [
        'opening',     // starting stock when stock history was switched on
        'created',     // a new product was added
        'order',       // a customer ordered (minus)
        'cancelled',   // an order was cancelled (plus)
        'restock',     // the admin added stock (plus)
        'adjusted',    // the admin lowered stock: breakage, counting mistakes (minus)
    ];

    protected $fillable = ['product_id', 'product_name', 'quantity', 'stock_after', 'reason', 'order_id', 'user_id'];

    protected $casts = [
        'quantity' => 'integer',
        'stock_after' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
