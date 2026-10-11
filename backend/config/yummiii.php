<?php

// Yummiii's own settings
return [

    // DEMO_MODE=true turns this copy into the public PORTFOLIO DEMO:
    // the demo admin login is shown on the page, a "demo" banner appears,
    // and `php artisan yummiii:reset-demo` (run nightly) is allowed to wipe it.
    // NEVER set this on the real shop.
    'demo' => (bool) env('DEMO_MODE', false),

    'demo_email' => 'demo@yummiii.app',
    'demo_password' => 'demo1234',

];
