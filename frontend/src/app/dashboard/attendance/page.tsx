"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Search,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
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
import { api } from "@/lib/axios";

type AttendanceRecord = {
  id: number;
  employee_name: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: "present" | "absent" | "late" | "half_day";
};

type Summary = {
  present: number;
  absent: number;
  late: number;
};

const statusConfig: Record<
  AttendanceRecord["status"],
  { label: string; classes: string; icon: React.ReactNode }
> = {
  present: {
    label: "Present",
    classes: "bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  absent: {
    label: "Absent",
    classes: "bg-red-50 text-red-600",
    icon: <XCircle className="h-3 w-3" />,
  },
  late: {
    label: "Late",
    classes: "bg-amber-50 text-amber-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  half_day: {
    label: "Half Day",
    classes: "bg-blue-50 text-blue-700",
    icon: <Clock className="h-3 w-3" />,
  },
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    api
      .get<AttendanceRecord[]>("/owner/attendance", {
        params: { date: dateFilter },
      })
      .then((res) => setRecords(res.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [dateFilter]);

  const filtered = records.filter((r) => {
    const matchSearch = r.employee_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const summary: Summary = {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    late: records.filter((r) => r.status === "late").length,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-heading">
          Attendance
        </h1>
        <p className="text-gray-500 mt-1">
          Track daily attendance records across your team.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border border-gray-100 shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Present Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.present}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Absent Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.absent}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Late Today</p>
              <p className="text-2xl font-bold text-gray-900">{summary.late}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border border-gray-100 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Attendance Records
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {/* Date picker */}
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="date"
                  className="pl-9 w-44"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              {/* Status filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                </select>
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
              No attendance records for this date.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => {
                  const cfg = statusConfig[record.status] ?? statusConfig.absent;
                  const hours =
                    record.clock_in && record.clock_out
                      ? (
                          (new Date(`1970-01-01T${record.clock_out}`).getTime() -
                            new Date(`1970-01-01T${record.clock_in}`).getTime()) /
                          3600000
                        ).toFixed(1)
                      : "—";
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.employee_name}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.clock_in ?? "—"}</TableCell>
                      <TableCell>{record.clock_out ?? "—"}</TableCell>
                      <TableCell>{hours}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.classes}`}
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
  );
}
