<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    // At or below this many left, a product counts as "low stock"
    public const LOW_STOCK = 5;

    // Fields that are allowed to be filled in bulk (e.g. from the seeder)
    protected $fillable = ['category_id', 'name', 'price', 'offer_price', 'image', 'stock'];

    protected $casts = [
        'price' => 'integer',
        'offer_price' => 'integer',
        'stock' => 'integer',
    ];

    // Extra calculated fields added to every JSON reply
    protected $appends = ['in_stock', 'final_price', 'discount_percent'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    // Change the stock AND write it in the stock history.
    // Always use this instead of changing `stock` directly, so the history never has gaps.
    // (Callers lock the product row first, so two changes can't overwrite each other.)
    public function changeStock(int $quantity, string $reason, ?Order $order = null, ?User $user = null): void
    {
        if ($quantity === 0) {
            return;
        }

        $this->stock = max(0, $this->stock + $quantity);
        $this->save();

        $this->stockMovements()->create([
            'product_name' => $this->name,
            'quantity' => $quantity,
            'stock_after' => $this->stock,
            'reason' => $reason,
            'order_id' => $order?->id,
            'user_id' => $user?->id,
        ]);
    }

    // true when at least 1 is left. Calculated, never stored: the moment stock reaches 0,
    // the product is out of stock everywhere, automatically
    protected function inStock(): Attribute
    {
        return Attribute::get(fn () => $this->stock > 0);
    }

    // The price the customer actually pays: the offer price if there is one
    protected function finalPrice(): Attribute
    {
        return Attribute::get(fn () => $this->offer_price ?? $this->price);
    }

    // e.g. price 2500, offer 2000 → 20
    protected function discountPercent(): Attribute
    {
        return Attribute::get(fn () => $this->offer_price
            ? (int) round(100 - $this->offer_price * 100 / $this->price)
            : 0);
    }

    // 0 instead of null when nothing has been sold yet
    protected function soldCount(): Attribute
    {
        return Attribute::get(fn ($value) => (int) $value);
    }

    // Product::withSoldCount() adds "sold_count": how many were ordered (cancelled orders don't count)
    public function scopeWithSoldCount(Builder $query): void
    {
        $query->withSum(['orderItems as sold_count' => fn ($items) => $items->whereHas(
            'order', fn ($order) => $order->where('status', '!=', 'cancelled'),
        )], 'quantity');
    }
}
