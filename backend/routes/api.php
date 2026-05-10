<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeeSelfController;
use App\Http\Controllers\PayrollVariableController;
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
                'total_employees' => \App\Models\User::where('role', '!=', 'owner')->count(),
                'departments'     => \App\Models\Department::count(),
                'pending_leaves'  => 0,
                'active_today'    => 0,
            ]);
        });

        // Department CRUD
        Route::get('/departments', [DepartmentController::class, 'index']);
        Route::post('/departments', [DepartmentController::class, 'store']);
        Route::put('/departments/{department}', [DepartmentController::class, 'update']);
        Route::delete('/departments/{department}', [DepartmentController::class, 'destroy']);

        // Employee CRUD
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
        Route::get('/employees/{employee}/attendance-days', [EmployeeController::class, 'attendanceDays']);

        // Payroll Variables CRUD
        Route::get('/payroll-variables', [PayrollVariableController::class, 'index']);
        Route::post('/payroll-variables', [PayrollVariableController::class, 'store']);
        Route::put('/payroll-variables/{payrollVariable}', [PayrollVariableController::class, 'update']);
        Route::delete('/payroll-variables/{payrollVariable}', [PayrollVariableController::class, 'destroy']);
    });

    // Employee self-service routes
    Route::middleware('role.employee')->prefix('employee')->group(function () {
        Route::get('/profile', [EmployeeSelfController::class, 'profile']);
        Route::get('/attendance', [EmployeeSelfController::class, 'attendance']);
        Route::get('/attendance/summary', [EmployeeSelfController::class, 'attendanceSummary']);
        Route::get('/attendance/today', [EmployeeSelfController::class, 'todayStatus']);
        Route::post('/attendance/clock-in', [EmployeeSelfController::class, 'clockIn']);
        Route::post('/attendance/clock-out', [EmployeeSelfController::class, 'clockOut']);
        Route::get('/payslips', [EmployeeSelfController::class, 'payslips']);
    });
});
