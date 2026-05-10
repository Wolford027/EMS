<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollVariable extends Model
{
    protected $fillable = [
        'name',
        'key',
        'type',
        'default_value',
        'description',
        'is_active',
    ];

    protected $casts = [
        'default_value' => 'decimal:2',
        'is_active'     => 'boolean',
    ];
}
