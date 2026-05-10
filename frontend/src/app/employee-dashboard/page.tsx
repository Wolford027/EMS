"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  FolderKanban,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  HandCoins,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/axios";
import Link from "next/link";

type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  joined_at: string;
};

type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  half_day: number;
};

type Payslip = {
  id: number;
  period: string;
  net_pay: number;
  status: "pending" | "paid" | "cancelled";
};

const statusConfig: Record<
  Payslip["status"],
  { label: string; classes: string }
> = {
  paid: { label: "Paid", classes: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Cancelled", classes: "bg-red-50 text-red-700" },
};

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

export default function EmployeeDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [recentPayslips, setRecentPayslips] = useState<Payslip[]>([]);

  useEffect(() => {
    api.get<Profile>("/employee/profile").then((r) => setProfile(r.data)).catch(() => {});
    api.get<AttendanceSummary>("/employee/attendance/summary").then((r) => setSummary(r.data)).catch(() => {});
    api.get<Payslip[]>("/employee/payslips").then((r) => setRecentPayslips(r.data.slice(0, 3))).catch(() => {});
  }, []);

  const attendanceCards = [
    {
      label: "Present",
      value: summary?.present ?? "—",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Absent",
      value: summary?.absent ?? "—",
      icon: XCircle,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Late",
      value: summary?.late ?? "—",
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Half Day",
      value: summary?.half_day ?? "—",
      icon: AlertCircle,
      color: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 mb-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Here&apos;s an overview of your activity this month.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            My Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">Full Name</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {profile?.name ?? "—"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {profile?.email ?? "—"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FolderKanban className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">Department</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {profile?.department ?? "Unassigned"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-xs text-gray-500">Joined</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {profile?.joined_at
                    ? new Date(profile.joined_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            Attendance — {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
          <Link
            href="/employee-dashboard/attendance"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {attendanceCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border border-gray-100 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Payslips */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-blue-500" />
            Recent Payslips
          </h2>
          <Link
            href="/employee-dashboard/payslips"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentPayslips.length === 0 ? (
          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-gray-400">
              No payslips available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentPayslips.map((p) => {
              const cfg = statusConfig[p.status];
              return (
                <Card key={p.id} className="border border-gray-100 shadow-sm">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatPeriod(p.period)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Net Pay:{" "}
                        <span className="font-semibold text-gray-800">
                          ₱{Number(p.net_pay).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.classes}`}
                    >
                      {cfg.label}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
