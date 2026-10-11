<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
                Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->nullable()->unique();  // YUM-00001, set after saving
            $table->string('customer_name');
            $table->string('phone');
            $table->string('delivery_area');            // copied, so old orders keep the area name
            $table->text('address');
            $table->text('notes')->nullable();
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('delivery_fee');
            $table->unsignedInteger('total');
            $table->string('payment_method')->default('cod');      // cash on delivery
            $table->string('status')->default('pending');          // pending → confirmed → out_for_delivery → delivered
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
