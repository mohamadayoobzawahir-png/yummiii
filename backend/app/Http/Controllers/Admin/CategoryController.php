<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    // GET /api/admin/categories — with how many products each one has
    public function index()
    {
        return Category::withCount('products')->orderBy('sort_order')->orderBy('name')->get();
    }

    // POST /api/admin/categories
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:categories,name'],
            'emoji' => ['nullable', 'string', 'max:8'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ]);
        $data['slug'] = $this->uniqueSlug($data['name']);
        $data['sort_order'] ??= (int) Category::max('sort_order') + 1;   // new ones go last

        $category = Category::create($data);

        return response()->json($category->loadCount('products'), 201);
    }

    // PATCH /api/admin/categories/{category}
    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:50', Rule::unique('categories', 'name')->ignore($category->id)],
            'emoji' => ['nullable', 'string', 'max:8'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);
        if (isset($data['name']) && $data['name'] !== $category->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $category->id);
        }

        $category->update($data);

        return $category->loadCount('products');
    }

    // DELETE /api/admin/categories/{category} — only when it's empty
    public function destroy(Category $category)
    {
        $count = $category->products()->count();
        if ($count > 0) {
            throw ValidationException::withMessages([
                'category' => "Move or delete the {$count} product(s) in {$category->name} first.",
            ]);
        }

        $category->delete();

        return response()->noContent();
    }

    // 'Fast Food' → 'fast-food' (used in the URL). Names in Sinhala/Tamil have no
    // Latin letters, so they get a short random slug instead of an empty one.
    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'category-'.Str::lower(Str::random(5));
        $slug = $base;
        $n = 2;
        while (Category::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }
}
