<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = ['product_id', 'product_name', 'price', 'quantity', 'line_total'];

    protected $casts = [
        'price' => 'integer',
        'quantity' => 'integer',
        'line_total' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // Each item belongs to one order
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
