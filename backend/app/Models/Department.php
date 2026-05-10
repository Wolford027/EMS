<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['name', 'description'])]
class Department extends Model
{
    public function employees(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function manager(): HasOne
    {
        return $this->hasOne(User::class)->where('role', 'manager');
    }
}
