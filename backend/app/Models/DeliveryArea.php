<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryArea extends Model
{
    protected $fillable = ['name', 'fee'];

    protected $casts = [
        'fee' => 'integer',
    ];
}
