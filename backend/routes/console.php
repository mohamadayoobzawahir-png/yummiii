<?php

use Illuminate\Foundation\Inspiring;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// php artisan yummiii:admin you@example.com
// Creates an admin (or makes an existing account an admin, with a new password).
// The only way to make an admin: customers can't register, and is_admin isn't fillable.
Artisan::command('yummiii:admin {email}', function (string $email) {
    $user = User::where('email', $email)->first();
    $name = $this->ask('Name', $user?->name);
    $password = $this->secret('Password (at least 10 characters, typing is hidden)');

    $validator = Validator::make(
        ['email' => $email, 'name' => $name, 'password' => $password],
        ['email' => ['required', 'email'], 'name' => ['required', 'max:100'], 'password' => ['required', 'min:10']],
    );
    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }

    $user ??= new User(['email' => $email]);
    $user->fill(['name' => $name, 'password' => $password]);
    $user->is_admin = true;   // set directly: not fillable on purpose
    $user->save();
    $user->tokens()->delete();   // log out any old sessions of this account

    $this->info("✅ {$email} is an admin. Log in at /admin/login");
})->purpose('Create an admin account (or reset an admin password)');

