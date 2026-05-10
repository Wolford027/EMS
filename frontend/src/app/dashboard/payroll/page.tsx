"use client";

import { useEffect, useState } from "react";
import {
  HandCoins,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarDays,
  Download,
  Plus,
  Users,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/axios";

type Employee = {
  id: number;
  name: string;
  department: string;
};

type PayrollType = "weekly" | "bi-weekly" | "monthly";

type PayrollVariable = {
  id: number;
  name: string;
  key: string;
  type: "allowance" | "deduction" | "salary_component";
  default_value: string;
  description: string | null;
  is_active: boolean;
};

// Daily rate is always based on 22 standard working days per month
const DAILY_RATE_BASE = 22;

// Max days in each payroll period (hint only)
const MAX_DAYS: Record<PayrollType, number> = {
  weekly: 5,
  "bi-weekly": 11,
  monthly: 22,
};

type PayrollFormFields = {
  period: string;
  monthly_rate: string;
  days_worked: string;
  payroll_type: PayrollType;
};

const emptyForm = (period: string): PayrollFormFields => ({
  period,
  monthly_rate: "",
  days_worked: "",
  payroll_type: "monthly",
});

type PayrollRecord = {
  id: number;
  employee_name: string;
  department: string;
  period: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: "paid" | "pending" | "failed";
};

type PayrollSummary = {
  total_paid: number;
  total_pending: number;
  total_employees: number;
};

const statusConfig: Record<
  PayrollRecord["status"],
  { label: string; classes: string; icon: React.ReactNode }
> = {
  paid: {
    label: "Paid",
    classes: "bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending: {
    label: "Pending",
    classes: "bg-amber-50 text-amber-700",
    icon: <Clock className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    classes: "bg-red-50 text-red-600",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function PayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(currentPeriod);
  const [processing, setProcessing] = useState<number | null>(null);

  // Create payroll dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"single" | "bulk">("single");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollVars, setPayrollVars] = useState<PayrollVariable[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [selectedSingle, setSelectedSingle] = useState<string>("");
  const [selectedBulk, setSelectedBulk] = useState<Set<number>>(new Set());
  const [selectedDeductions, setSelectedDeductions] = useState<Set<number>>(new Set());
  const [selectedAllowances, setSelectedAllowances] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<PayrollFormFields>(emptyForm(currentPeriod()));
  const [saving, setSaving] = useState(false);
  const [fetchingDays, setFetchingDays] = useState(false);

  // Derived payroll computations
  const dailyRate = form.monthly_rate
    ? parseFloat(form.monthly_rate) / DAILY_RATE_BASE
    : 0;
  const computedBasicSalary = dailyRate * (parseFloat(form.days_worked) || 0);

  const deductionVars = payrollVars.filter((v) => v.type === "deduction" && v.is_active);
  const allowanceVars = payrollVars.filter((v) => v.type === "allowance" && v.is_active);

  const totalDeductions = deductionVars
    .filter((v) => selectedDeductions.has(v.id))
    .reduce((sum, v) => sum + parseFloat(v.default_value), 0);

  const totalAllowances = allowanceVars
    .filter((v) => selectedAllowances.has(v.id))
    .reduce((sum, v) => sum + parseFloat(v.default_value), 0);

  const netPreview = computedBasicSalary + totalAllowances - totalDeductions;

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        api.get<PayrollRecord[]>("/owner/payroll", { params: { period } }),
        api.get<PayrollSummary>("/owner/payroll/summary", { params: { period } }),
      ]);
      setRecords(recordsRes.data);
      setSummary(summaryRes.data);
    } catch {
      setRecords([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get<PayrollRecord[]>("/owner/payroll", { params: { period } }),
      api.get<PayrollSummary>("/owner/payroll/summary", { params: { period } }),
    ])
      .then(([recordsRes, summaryRes]) => {
        setRecords(recordsRes.data);
        setSummary(summaryRes.data);
      })
      .catch(() => {
        setRecords([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [period]);

  // Fetch employees + payroll variables when dialog opens
  useEffect(() => {
    if (!createOpen) return;
    Promise.all([
      api.get<Employee[]>("/owner/employees"),
      api.get<PayrollVariable[]>("/owner/payroll-variables"),
    ])
      .then(([empRes, varRes]) => {
        setEmployees(empRes.data);
        setPayrollVars(varRes.data);
      })
      .catch(() => {});
  }, [createOpen]);

  // Auto-fetch days worked when a single employee + period is chosen
  useEffect(() => {
    if (createMode !== "single" || !selectedSingle || !form.period) return;
    setFetchingDays(true);
    api
      .get<{ days_worked: number }>(`/owner/employees/${selectedSingle}/attendance-days`, {
        params: { period: form.period },
      })
      .then((res) => {
        setForm((f) => ({ ...f, days_worked: String(res.data.days_worked) }));
      })
      .catch(() => {})
      .finally(() => setFetchingDays(false));
  }, [selectedSingle, form.period, createMode]);

  function openCreate() {
    setCreateMode("single");
    setSelectedSingle("");
    setSelectedBulk(new Set());
    setSelectedDeductions(new Set());
    setSelectedAllowances(new Set());
    setEmpSearch("");
    setForm(emptyForm(period));
    setCreateOpen(true);
  }

  function toggleBulk(id: number) {
    setSelectedBulk((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll(visible: Employee[]) {
    const allSelected = visible.every((e) => selectedBulk.has(e.id));
    setSelectedBulk((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visible.forEach((e) => next.delete(e.id));
      } else {
        visible.forEach((e) => next.add(e.id));
      }
      return next;
    });
  }

  async function handleCreate() {
    const payload = {
      period: form.period,
      basic_salary: computedBasicSalary,
      allowances: totalAllowances,
      deductions: totalDeductions,
    };

    setSaving(true);
    try {
      if (createMode === "single") {
        await api.post("/owner/payroll", {
          ...payload,
          employee_id: parseInt(selectedSingle),
        });
      } else {
        await api.post("/owner/payroll/bulk", {
          ...payload,
          employee_ids: Array.from(selectedBulk),
        });
      }
      setCreateOpen(false);
      await fetchPayroll();
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  async function handleProcess(id: number) {
    setProcessing(id);
    try {
      await api.post(`/owner/payroll/${id}/process`);
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "paid" } : r))
      );
    } catch {
      /* silent */
    } finally {
      setProcessing(null);
    }
  }

  const filteredEmp = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.department?.toLowerCase().includes(empSearch.toLowerCase())
  );

  const canSubmit =
    !!form.period &&
    !!form.monthly_rate &&
    !!form.days_worked &&
    (createMode === "single" ? !!selectedSingle : selectedBulk.size > 0);

  const filtered = records.filter(
    (r) =>
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayable = filtered.reduce((sum, r) => sum + r.net_salary, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-heading">
            Payroll
          </h1>
          <p className="text-gray-500 mt-1">
            Manage salary disbursements and payroll records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          {/* Create Payroll Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Create Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Payroll</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-1">
                {/* Mode toggle */}
                <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setCreateMode("single")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      createMode === "single"
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Single Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode("bulk")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      createMode === "bulk"
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    Multiple Employees
                  </button>
                </div>

                {/* Employee selection — shown first so days can auto-fetch */}
                {createMode === "single" ? (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Employee
                    </label>
                    <select
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedSingle}
                      onChange={(e) => setSelectedSingle(e.target.value)}
                    >
                      <option value="">— Select employee —</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                          {e.department ? ` · ${e.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Select Employees
                        {selectedBulk.size > 0 && (
                          <span className="ml-2 text-xs font-normal text-blue-600">
                            {selectedBulk.size} selected
                          </span>
                        )}
                      </label>
                      {filteredEmp.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline cursor-pointer"
                          onClick={() => toggleSelectAll(filteredEmp)}
                        >
                          {filteredEmp.every((e) => selectedBulk.has(e.id))
                            ? "Deselect all"
                            : "Select all"}
                        </button>
                      )}
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-9"
                        placeholder="Search employees…"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                      />
                    </div>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {filteredEmp.length === 0 ? (
                        <p className="text-center text-gray-400 py-6 text-sm">
                          No employees found.
                        </p>
                      ) : (
                        filteredEmp.map((emp) => (
                          <label
                            key={emp.id}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedBulk.has(emp.id)}
                              onChange={() => toggleBulk(emp.id)}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {emp.name}
                              </p>
                              {emp.department && (
                                <p className="text-xs text-gray-400">
                                  {emp.department}
                                </p>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Salary fields */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Payroll Type */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Payroll Type
                    </label>
                    <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
                      {(["weekly", "bi-weekly", "monthly"] as PayrollType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, payroll_type: t, days_worked: "" }));
                          }}
                          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors capitalize cursor-pointer ${
                            form.payroll_type === t
                              ? "bg-blue-600 text-white"
                              : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pay Period */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Pay Period
                    </label>
                    <Input
                      type="month"
                      value={form.period}
                      onChange={(e) => setForm({ ...form, period: e.target.value })}
                    />
                  </div>

                  {/* Monthly Rate */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Monthly Rate (₱)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.monthly_rate}
                      onChange={(e) => setForm({ ...form, monthly_rate: e.target.value })}
                    />
                    {dailyRate > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Daily rate: ₱{dailyRate.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  {/* Days Worked */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Days Worked
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        (max {MAX_DAYS[form.payroll_type]})
                      </span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max={MAX_DAYS[form.payroll_type]}
                        step="0.5"
                        placeholder={`0 – ${MAX_DAYS[form.payroll_type]}`}
                        value={form.days_worked}
                        onChange={(e) => setForm({ ...form, days_worked: e.target.value })}
                      />
                      {fetchingDays && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        </div>
                      )}
                    </div>
                    {createMode === "single" && selectedSingle && !fetchingDays && form.days_worked && (
                      <p className="text-xs text-blue-600 mt-1">
                        Auto-fetched from attendance records.
                      </p>
                    )}
                  </div>

                  {/* Computed Basic Salary (read-only) */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Basic Salary
                      <span className="ml-1.5 text-xs font-normal text-gray-400">(auto-computed)</span>
                    </label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800">
                      ₱{computedBasicSalary.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Allowances multi-select */}
                {allowanceVars.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Allowances
                      {totalAllowances > 0 && (
                        <span className="ml-2 text-xs font-normal text-emerald-600">
                          +₱{totalAllowances.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </label>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-36 overflow-y-auto">
                      {allowanceVars.map((v) => (
                        <label
                          key={v.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedAllowances.has(v.id)}
                              onChange={() => {
                                setSelectedAllowances((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(v.id)) next.delete(v.id);
                                  else next.add(v.id);
                                  return next;
                                });
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{v.name}</p>
                              {v.description && (
                                <p className="text-xs text-gray-400">{v.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-emerald-600 shrink-0">
                            +₱{parseFloat(v.default_value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deductions multi-select */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Deductions
                    {totalDeductions > 0 && (
                      <span className="ml-2 text-xs font-normal text-red-500">
                        −₱{totalDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </label>
                  {deductionVars.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">
                      No deduction variables configured.{" "}
                      <a href="/dashboard/settings" className="text-blue-500 hover:underline">
                        Add them in Settings → Payroll Variables.
                      </a>
                    </p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                      {deductionVars.map((v) => (
                        <label
                          key={v.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedDeductions.has(v.id)}
                              onChange={() => {
                                setSelectedDeductions((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(v.id)) next.delete(v.id);
                                  else next.add(v.id);
                                  return next;
                                });
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{v.name}</p>
                              {v.description && (
                                <p className="text-xs text-gray-400">{v.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-red-500 shrink-0">
                            −₱{parseFloat(v.default_value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Net preview */}
                {form.monthly_rate && form.days_worked && (
                  <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Basic Salary</span>
                      <span>₱{computedBasicSalary.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {totalAllowances > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>+ Allowances</span>
                        <span>₱{totalAllowances.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {totalDeductions > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>− Deductions</span>
                        <span>₱{totalDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-gray-200 flex justify-between font-semibold text-gray-900">
                      <span>Net Salary</span>
                      <span>₱{netPreview.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {/* Employee selection */}
                {createMode === "single" ? (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Employee
                    </label>
                    <select
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedSingle}
                      onChange={(e) => setSelectedSingle(e.target.value)}
                    >
                      <option value="">— Select employee —</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                          {e.department ? ` · ${e.department}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Select Employees
                        {selectedBulk.size > 0 && (
                          <span className="ml-2 text-xs font-normal text-blue-600">
                            {selectedBulk.size} selected
                          </span>
                        )}
                      </label>
                      {filteredEmp.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline cursor-pointer"
                          onClick={() => toggleSelectAll(filteredEmp)}
                        >
                          {filteredEmp.every((e) => selectedBulk.has(e.id))
                            ? "Deselect all"
                            : "Select all"}
                        </button>
                      )}
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-9"
                        placeholder="Search employees…"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                      />
                    </div>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {filteredEmp.length === 0 ? (
                        <p className="text-center text-gray-400 py-6 text-sm">
                          No employees found.
                        </p>
                      ) : (
                        filteredEmp.map((emp) => (
                          <label
                            key={emp.id}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedBulk.has(emp.id)}
                              onChange={() => toggleBulk(emp.id)}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {emp.name}
                              </p>
                              {emp.department && (
                                <p className="text-xs text-gray-400">
                                  {emp.department}
                                </p>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={saving || !canSubmit}
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {createMode === "single"
                    ? "Create Payroll Record"
                    : `Create for ${selectedBulk.size || ""} Employee${selectedBulk.size !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border border-gray-100 shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary ? formatCurrency(summary.total_paid) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary ? formatCurrency(summary.total_pending) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <HandCoins className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Employees on Payroll</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.total_employees ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border border-gray-100 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-blue-600" />
                Payroll Records
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Total payable: {formatCurrency(totalPayable)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Period picker */}
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="month"
                  className="pl-9 w-44"
                  value={period}
                  onChange={(e) => {
                    setLoading(true);
                    setPeriod(e.target.value);
                  }}
                />
              </div>
              {/* Search */}
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search employee…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">
              No payroll records for this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => {
                  const cfg =
                    statusConfig[record.status] ?? statusConfig.pending;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.employee_name}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {record.department ?? "—"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(record.basic_salary)}
                      </TableCell>
                      <TableCell className="text-emerald-600">
                        +{formatCurrency(record.allowances)}
                      </TableCell>
                      <TableCell className="text-red-500">
                        -{formatCurrency(record.deductions)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(record.net_salary)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.classes}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={processing === record.id}
                            onClick={() => handleProcess(record.id)}
                          >
                            {processing === record.id && (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            )}
                            Process
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
