"use client";

import { useEffect, useState } from "react";
import {
  HandCoins,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/axios";

type Payslip = {
  id: number;
  period: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
};

const statusConfig: Record<
  Payslip["status"],
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
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

function formatCurrency(value: number) {
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payslip | null>(null);

  useEffect(() => {
    api
      .get<Payslip[]>("/employee/payslips")
      .then((r) => setPayslips(r.data))
      .catch(() => setPayslips([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HandCoins className="h-6 w-6 text-blue-600" />
          My Payslips
        </h1>
        <p className="text-sm text-gray-500 mt-1">Your salary history and payment details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-semibold text-gray-700">All Payslips</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : payslips.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-16">
                  No payslips available yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold text-gray-500">Period</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Net Pay</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((p) => {
                      const cfg = statusConfig[p.status];
                      const isSelected = selected?.id === p.id;
                      return (
                        <TableRow
                          key={p.id}
                          onClick={() => setSelected(isSelected ? null : p)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50"
                              : "hover:bg-gray-50/50"
                          }`}
                        >
                          <TableCell className="text-sm font-medium text-gray-900">
                            {formatPeriod(p.period)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-800">
                            {formatCurrency(p.net_pay)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.classes}`}
                            >
                              {cfg.icon}
                              {cfg.label}
                            </span>
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

        {/* Detail panel */}
        <div>
          {selected ? (
            <Card className="border border-blue-100 shadow-sm sticky top-8">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  {formatPeriod(selected.period)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Basic Salary</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selected.basic_salary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Allowances</span>
                  <span className="font-medium text-emerald-700">+{formatCurrency(selected.allowances)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Deductions</span>
                  <span className="font-medium text-red-700">-{formatCurrency(selected.deductions)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Net Pay</span>
                  <span className="text-gray-900 text-base">{formatCurrency(selected.net_pay)}</span>
                </div>
                <div className="pt-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusConfig[selected.status].classes}`}
                  >
                    {statusConfig[selected.status].icon}
                    {statusConfig[selected.status].label}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-40 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
              Select a payslip to see details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
