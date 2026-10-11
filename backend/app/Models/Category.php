<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'emoji', 'sort_order'];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    // One category has many products
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
