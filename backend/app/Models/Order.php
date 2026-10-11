<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'order_number', 'customer_name', 'phone', 'delivery_area', 'address', 'notes',
        'subtotal', 'delivery_fee', 'total', 'payment_method', 'status',
    ];

    protected $casts = [
        'subtotal' => 'integer',
        'delivery_fee' => 'integer',
        'total' => 'integer',
    ];

    // One order has many items
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
