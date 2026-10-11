<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /api/login — admins only: check email + password, hand out a token
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // Same message for "no such email", "wrong password" and "not an admin",
        // so attackers can't find out which emails have accounts
        if (! $user || ! Hash::check($data['password'], $user->password) || ! $user->is_admin) {
            throw ValidationException::withMessages([
                'email' => 'The email or password is incorrect.',
            ]);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('web')->plainTextToken,
        ]);
    }

    // GET /api/user — who is logged in? (React calls this when the page loads)
    public function me(Request $request)
    {
        return $request->user();
    }

    // POST /api/logout — delete the token, so it can never be used again
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();   // 204: done, nothing to send back
    }
}
