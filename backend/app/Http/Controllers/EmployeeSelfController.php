<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Payroll;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EmployeeSelfController extends Controller
{
    /**
     * Return the authenticated employee's profile with department.
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user()->load('department:id,name');

        return response()->json([
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role,
            'department'  => $user->department?->name,
            'joined_at'   => $user->created_at?->toDateString(),
        ]);
    }

    /**
     * Return the employee's attendance records, optionally filtered by month (YYYY-MM).
     */
    public function attendance(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $query = Attendance::where('user_id', $userId)
            ->orderByDesc('date');

        if ($month = $request->query('month')) {
            try {
                $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
                $end   = $start->copy()->endOfMonth();
                $query->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
            } catch (\Exception) {
                // ignore invalid month param
            }
        }

        $records = $query->get()->map(fn (Attendance $a) => [
            'id'        => $a->id,
            'date'      => $a->date,
            'clock_in'  => $a->clock_in,
            'clock_out' => $a->clock_out,
            'status'    => $a->status,
        ]);

        return response()->json($records);
    }

    /**
     * Return attendance summary counts for the current (or given) month.
     */
    public function attendanceSummary(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $month  = $request->query('month', now()->format('Y-m'));

        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
            $end   = $start->copy()->endOfMonth();
        } catch (\Exception) {
            $start = now()->startOfMonth();
            $end   = now()->endOfMonth();
        }

        $records = Attendance::where('user_id', $userId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get();

        return response()->json([
            'present'  => $records->where('status', 'present')->count(),
            'absent'   => $records->where('status', 'absent')->count(),
            'late'     => $records->where('status', 'late')->count(),
            'half_day' => $records->where('status', 'half_day')->count(),
        ]);
    }

    /**
     * Return the employee's today attendance status.
     */
    public function todayStatus(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $record = Attendance::where('user_id', $request->user()->id)
            ->where('date', $today)
            ->first();

        if (!$record) {
            return response()->json(['clocked_in' => false, 'clocked_out' => false, 'record' => null]);
        }

        return response()->json([
            'clocked_in'  => !is_null($record->clock_in),
            'clocked_out' => !is_null($record->clock_out),
            'record'      => [
                'id'          => $record->id,
                'date'        => $record->date,
                'clock_in'    => $record->clock_in,
                'clock_out'   => $record->clock_out,
                'status'      => $record->status,
                'address'     => $record->address,
                'latitude'    => $record->latitude,
                'longitude'   => $record->longitude,
                'selfie_url'  => $record->selfie_path
                    ? Storage::disk('public')->url($record->selfie_path)
                    : null,
            ],
        ]);
    }

    /**
     * Clock in the employee with selfie and location.
     */
    public function clockIn(Request $request): JsonResponse
    {
        $user  = $request->user();
        $today = now()->toDateString();

        $existing = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        if ($existing && $existing->clock_in) {
            return response()->json(['message' => 'You have already clocked in today.'], 422);
        }

        $data = $request->validate([
            'selfie'    => 'required|string',
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'address'   => 'nullable|string|max:500',
        ]);

        // Decode and store selfie
        $selfieBase64 = $data['selfie'];
        if (str_contains($selfieBase64, ',')) {
            $selfieBase64 = explode(',', $selfieBase64)[1];
        }
        $filename = "selfies/{$user->id}_{$today}.jpg";
        Storage::disk('public')->put($filename, base64_decode($selfieBase64));

        $clockInTime = now()->format('H:i:s');
        // Consider late if after 09:00
        $status = $clockInTime > '09:00:00' ? 'late' : 'present';

        $attendance = Attendance::updateOrCreate(
            ['user_id' => $user->id, 'date' => $today],
            [
                'clock_in'    => $clockInTime,
                'status'      => $status,
                'selfie_path' => $filename,
                'latitude'    => $data['latitude'],
                'longitude'   => $data['longitude'],
                'address'     => $data['address'] ?? null,
            ]
        );

        return response()->json([
            'message'    => 'Clocked in successfully.',
            'clock_in'   => $attendance->clock_in,
            'status'     => $attendance->status,
            'selfie_url' => Storage::disk('public')->url($filename),
            'address'    => $attendance->address,
        ]);
    }

    /**
     * Clock out the employee.
     */
    public function clockOut(Request $request): JsonResponse
    {
        $user  = $request->user();
        $today = now()->toDateString();

        $attendance = Attendance::where('user_id', $user->id)->where('date', $today)->first();

        if (!$attendance || !$attendance->clock_in) {
            return response()->json(['message' => 'You have not clocked in today.'], 422);
        }

        if ($attendance->clock_out) {
            return response()->json(['message' => 'You have already clocked out today.'], 422);
        }

        $attendance->update(['clock_out' => now()->format('H:i:s')]);

        return response()->json([
            'message'   => 'Clocked out successfully.',
            'clock_out' => $attendance->clock_out,
        ]);
    }

    /**
     * Return the employee's payslips ordered by period descending.
     */
    public function payslips(Request $request): JsonResponse
    {
        $payslips = Payroll::where('user_id', $request->user()->id)
            ->orderByDesc('period')
            ->get()
            ->map(fn (Payroll $p) => [
                'id'           => $p->id,
                'period'       => $p->period,
                'basic_salary' => $p->basic_salary,
                'allowances'   => $p->allowances,
                'deductions'   => $p->deductions,
                'net_pay'      => $p->net_pay,
                'status'       => $p->status,
                'created_at'   => $p->created_at?->toDateString(),
            ]);

        return response()->json($payslips);
    }
}
