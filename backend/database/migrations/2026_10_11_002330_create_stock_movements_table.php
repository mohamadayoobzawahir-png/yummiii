<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per stock change: the stock history
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');                // copied: history stays readable if the product is deleted
            $table->integer('quantity');                   // +10 restocked, -2 sold
            $table->unsignedInteger('stock_after');        // the stock right after this change
            $table->string('reason');                      // see StockMovement::REASONS
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();   // the admin who did it
            $table->timestamps();

            $table->index(['product_id', 'id']);           // fast "history of one product"
        });

        // Products that already exist start their history with their current stock
        foreach (DB::table('products')->get() as $product) {
            DB::table('stock_movements')->insert([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $product->stock,
                'stock_after' => $product->stock,
                'reason' => 'opening',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
