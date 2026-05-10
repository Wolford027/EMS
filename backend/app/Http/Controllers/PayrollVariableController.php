<?php

namespace App\Http\Controllers;

use App\Models\PayrollVariable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PayrollVariableController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(PayrollVariable::orderBy('type')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'type'          => ['required', Rule::in(['allowance', 'deduction', 'salary_component'])],
            'default_value' => 'required|numeric|min:0',
            'description'   => 'nullable|string|max:255',
            'is_active'     => 'boolean',
        ]);

        $data['key'] = Str::slug($data['name'], '_');

        // Ensure unique key
        $base = $data['key'];
        $i = 2;
        while (PayrollVariable::where('key', $data['key'])->exists()) {
            $data['key'] = $base . '_' . $i++;
        }

        $variable = PayrollVariable::create($data);

        return response()->json($variable, 201);
    }

    public function update(Request $request, PayrollVariable $payrollVariable): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'type'          => ['required', Rule::in(['allowance', 'deduction', 'salary_component'])],
            'default_value' => 'required|numeric|min:0',
            'description'   => 'nullable|string|max:255',
            'is_active'     => 'boolean',
        ]);

        // Re-slug key only when name changes
        if ($data['name'] !== $payrollVariable->name) {
            $data['key'] = Str::slug($data['name'], '_');
            $base = $data['key'];
            $i = 2;
            while (PayrollVariable::where('key', $data['key'])->where('id', '!=', $payrollVariable->id)->exists()) {
                $data['key'] = $base . '_' . $i++;
            }
        }

        $payrollVariable->update($data);

        return response()->json($payrollVariable->fresh());
    }

    public function destroy(PayrollVariable $payrollVariable): JsonResponse
    {
        $payrollVariable->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
