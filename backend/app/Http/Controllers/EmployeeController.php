<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class EmployeeController extends Controller
{
    public function index(): JsonResponse
    {
        $employees = User::where('role', '!=', 'owner')
            ->with('department:id,name')
            ->get()
            ->map(fn (User $u) => [
                'id'          => $u->id,
                'name'        => $u->name,
                'email'       => $u->email,
                'role'        => $u->role,
                'department'  => $u->department?->name,
                'joined_at'   => $u->created_at?->toDateString(),
            ]);

        return response()->json($employees);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password'      => ['required', Password::min(8)],
            'role'          => ['required', 'in:employee,manager'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        $employee = User::create([
            'name'          => $validated['name'],
            'email'         => $validated['email'],
            'password'      => Hash::make($validated['password']),
            'role'          => $validated['role'],
            'department_id' => $validated['department_id'] ?? null,
        ]);

        $employee->load('department:id,name');

        return response()->json([
            'id'         => $employee->id,
            'name'       => $employee->name,
            'email'      => $employee->email,
            'role'       => $employee->role,
            'department' => $employee->department?->name,
            'joined_at'  => $employee->created_at?->toDateString(),
        ], 201);
    }

    public function update(Request $request, User $employee): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $employee->id],
            'role'          => ['required', 'in:employee,manager'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        $employee->update($validated);
        $employee->load('department:id,name');

        return response()->json([
            'id'         => $employee->id,
            'name'       => $employee->name,
            'email'      => $employee->email,
            'role'       => $employee->role,
            'department' => $employee->department?->name,
            'joined_at'  => $employee->created_at?->toDateString(),
        ]);
    }

    public function destroy(User $employee): JsonResponse
    {
        $employee->delete();

        return response()->json(['message' => 'Employee deleted']);
    }

    /**
     * Return attendance days worked for an employee in a given period (YYYY-MM).
     * Used by the payroll creation dialog to auto-fill days worked.
     */
    public function attendanceDays(Request $request, User $employee): JsonResponse
    {
        $period = $request->query('period', now()->format('Y-m'));

        try {
            $start = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
            $end   = $start->copy()->endOfMonth();
        } catch (\Exception) {
            return response()->json(['message' => 'Invalid period format.'], 422);
        }

        $daysWorked = Attendance::where('user_id', $employee->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['present', 'late'])
            ->count();

        $halfDays = Attendance::where('user_id', $employee->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->where('status', 'half_day')
            ->count();

        // Half days count as 0.5
        $total = $daysWorked + ($halfDays * 0.5);

        return response()->json([
            'employee_id' => $employee->id,
            'period'      => $period,
            'days_worked' => $total,
        ]);
    }
}
