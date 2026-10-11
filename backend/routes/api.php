<?php

use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\SalesController;
use App\Http\Controllers\Admin\StockHistoryController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Models\Category;
use App\Models\DeliveryArea;
use App\Models\Product;
use Illuminate\Support\Facades\Route;

// 🔐 Admin login (customers order as guests, no accounts).
// Max 10 tries per minute, to slow down password guessing.
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1,auth');

// Needs a login token
Route::middleware('auth:sanctum')->group(function () {
    Route::get('user', [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);
});

Route::apiResource('products', ProductController::class)->only(['index', 'show']);

Route::get('categories', fn () => Category::withCount('products')->orderBy('sort_order')->orderBy('name')->get());

Route::get('delivery-areas', fn () => DeliveryArea::orderBy('fee')->get());

// Max 10 orders per minute from one visitor, to stop spam
Route::post('orders', [OrderController::class, 'store'])->middleware('throttle:10,1,orders');

// Track my order (order number + mobile). Max 10 tries a minute, to stop guessing
Route::post('orders/track', [OrderController::class, 'track'])->middleware('throttle:10,1,track');

// 🛠️ Admin only: logged in (auth:sanctum) AND is_admin (admin)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', DashboardController::class);
    Route::get('sales', [SalesController::class, 'index']);
    Route::get('sales/export', [SalesController::class, 'export']);
    Route::get('stock-history', [StockHistoryController::class, 'index']);
    // How many products are low / out, for the badge on the Stock tab
    Route::get('stock-alerts', fn () => [
        'low' => Product::whereBetween('stock', [1, Product::LOW_STOCK])->count(),
        'out' => Product::where('stock', 0)->count(),
    ]);
    Route::get('orders', [AdminOrderController::class, 'index']);
    Route::patch('orders/{order}', [AdminOrderController::class, 'update']);
    Route::apiResource('products', AdminProductController::class)->except('show');
    Route::apiResource('categories', AdminCategoryController::class)->except('show');
});

