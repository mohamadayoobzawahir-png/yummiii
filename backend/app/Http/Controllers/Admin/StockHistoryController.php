<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockHistoryController extends Controller
{
    // GET /api/admin/stock-history?product_id=3&reason=order&page=2 — newest first, 30 per page
    public function index(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'integer'],
            'reason' => ['nullable', Rule::in(StockMovement::REASONS)],
        ]);

        return StockMovement::with(['order:id,order_number', 'user:id,name'])
            ->when($data['product_id'] ?? null, fn ($query, $id) => $query->where('product_id', $id))
            ->when($data['reason'] ?? null, fn ($query, $reason) => $query->where('reason', $reason))
            ->latest('id')
            ->paginate(30);
    }
}
