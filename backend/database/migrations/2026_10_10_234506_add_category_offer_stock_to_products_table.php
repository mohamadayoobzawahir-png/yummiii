<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // restrictOnDelete: a category can't be deleted while it still has products
            $table->foreignId('category_id')->nullable()->after('id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('offer_price')->nullable()->after('price');   // null = no offer
            $table->unsignedInteger('stock')->default(0)->after('offer_price');
        });

        // Move the existing data: category names → the new categories table,
        // in stock → 20 to start with, out of stock → 0
        $emojis = ['Cakes' => '🎂', 'Fast Food' => '🍔', 'Sweets' => '🍬'];
        $names = DB::table('products')->distinct()->orderBy('category')->pluck('category');
        foreach ($names as $index => $name) {
            $id = DB::table('categories')->insertGetId([
                'name' => $name,
                'slug' => Str::slug($name),
                'emoji' => $emojis[$name] ?? '🍽️',
                'sort_order' => $index,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('products')->where('category', $name)->update(['category_id' => $id]);
        }
        DB::table('products')->where('in_stock', true)->update(['stock' => 20]);

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['category', 'in_stock']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('category')->default('')->after('name');
            $table->boolean('in_stock')->default(true)->after('price');
        });

        foreach (DB::table('categories')->get() as $category) {
            DB::table('products')->where('category_id', $category->id)->update(['category' => $category->name]);
        }
        DB::table('products')->update(['in_stock' => DB::raw('stock > 0')]);

        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn(['offer_price', 'stock']);
        });
    }
};
