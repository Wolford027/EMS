<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:web')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Owner-only routes
    Route::middleware('role.owner')->prefix('owner')->group(function () {
        Route::get('/stats', function () {
            return response()->json([
                'total_employees' => \App\Models\User::count(),
                'departments'     => 0,
                'pending_leaves'  => 0,
                'active_today'    => 0,
            ]);
        });
    });
});
