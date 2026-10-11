<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    // GET /api/admin/products — every product, newest first
    public function index()
    {
        return Product::with('category')->withSoldCount()->latest('id')->get();
    }

    // POST /api/admin/products — add a product (sent as FormData because of the photo)
    public function store(Request $request)
    {
        $data = $request->validate($this->rules(), $this->messages());

        $data['image'] = $request->hasFile('image') ? $this->savePhoto($request) : null;

        // Create with 0, then add the stock through changeStock so it's in the history
        $stock = $data['stock'];
        $product = Product::create([...$data, 'stock' => 0]);
        $product->changeStock($stock, 'created', user: $request->user());

        return response()->json($this->fresh($product), 201);
    }

    // PATCH /api/admin/products/{product} — change some fields (e.g. just in_stock)
    public function update(Request $request, Product $product)
    {
        // 'sometimes' = only check the fields that were actually sent
        $data = $request->validate($this->rules(partial: true), $this->messages());

        // The offer must be cheaper than the price (also when only one of them is changed)
        $price = $data['price'] ?? $product->price;
        $offer = array_key_exists('offer_price', $data) ? $data['offer_price'] : $product->offer_price;
        if ($offer !== null && $offer >= $price) {
            throw ValidationException::withMessages(['offer_price' => 'The offer price must be lower than the normal price.']);
        }

        if ($request->hasFile('image')) {
            $this->deletePhoto($product);
            $data['image'] = $this->savePhoto($request);
        }

        DB::transaction(function () use ($product, $data, $request) {
            // Stock goes through changeStock (history); everything else is a normal update
            $newStock = $data['stock'] ?? null;
            unset($data['stock']);
            $product->update($data);

            if ($newStock !== null) {
                // Lock the row: an order placed at this exact moment waits, so the difference is right
                $locked = Product::lockForUpdate()->find($product->id);
                $difference = $newStock - $locked->stock;
                $locked->changeStock($difference, $difference > 0 ? 'restock' : 'adjusted', user: $request->user());
            }
        });

        return $this->fresh($product);
    }

    // DELETE /api/admin/products/{product}
    // Old orders are safe: they keep their own copy of the name and price
    public function destroy(Product $product)
    {
        $this->deletePhoto($product);
        $product->delete();

        return response()->noContent();
    }

    private function rules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'max:100'],
            'category_id' => [$required, 'integer', 'exists:categories,id'],
            'price' => [$required, 'integer', 'min:1', 'max:1000000'],
            'offer_price' => ['nullable', 'integer', 'min:1', ...($partial ? [] : ['lt:price'])],
            'stock' => [$required, 'integer', 'min:0', 'max:100000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],   // 5 MB
        ];
    }

    private function messages(): array
    {
        return [
            'image.image' => 'Please choose a photo (JPG, PNG or WEBP).',
            'image.mimes' => 'Please choose a photo (JPG, PNG or WEBP).',
            'image.max' => 'The photo is too big. Please choose one smaller than 5 MB.',
            'image.uploaded' => 'The photo is too big. Please choose one smaller than 5 MB.',
            'offer_price.lt' => 'The offer price must be lower than the normal price.',
            'category_id.required' => 'Please choose a category.',
        ];
    }

    // The product as the admin page shows it: with its category and sales
    private function fresh(Product $product): Product
    {
        return Product::with('category')->withSoldCount()->findOrFail($product->id);
    }

    // Saves to storage/app/public/products and returns its web address
    private function savePhoto(Request $request): string
    {
        $path = $request->file('image')->store('products', 'public');

        return Storage::disk('public')->url($path);
    }

    // Only delete photos WE uploaded (not the old placeholder links)
    private function deletePhoto(Product $product): void
    {
        $prefix = Storage::disk('public')->url('');
        if ($product->image && str_starts_with($product->image, $prefix)) {
            Storage::disk('public')->delete(substr($product->image, strlen($prefix)));
        }
    }
}
