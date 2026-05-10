<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_variables', function (Blueprint $table) {
            $table->id();
            $table->string('name');                              // Human-readable name e.g. "Transportation Allowance"
            $table->string('key')->unique();                    // Machine key e.g. "transportation_allowance"
            $table->enum('type', ['allowance', 'deduction', 'salary_component']);
            $table->decimal('default_value', 12, 2)->default(0);
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_variables');
    }
};
