<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $departments = Department::withCount('employees')
            ->with('manager:id,name,department_id')
            ->get()
            ->map(fn (Department $d) => [
                'id'             => $d->id,
                'name'           => $d->name,
                'description'    => $d->description,
                'employee_count' => $d->employees_count,
                'manager'        => $d->manager?->name,
            ]);

        return response()->json($departments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255', 'unique:departments'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $department = Department::create($validated);

        return response()->json([
            'id'             => $department->id,
            'name'           => $department->name,
            'description'    => $department->description,
            'employee_count' => 0,
            'manager'        => null,
        ], 201);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255', 'unique:departments,name,' . $department->id],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $department->update($validated);

        return response()->json($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return response()->json(['message' => 'Department deleted']);
    }
}
