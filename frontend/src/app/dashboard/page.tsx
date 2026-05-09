"use client";

import { useEffect, useState } from "react";
import {
  Users,
  FolderKanban,
  CalendarOff,
  Clock,
  UserPlus,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/axios";
import Link from "next/link";

type Stats = {
  total_employees: number;
  departments: number;
  pending_leaves: number;
  active_today: number;
};

const quickActions = [
  {
    label: "Add Employee",
    description: "Onboard a new team member",
    icon: UserPlus,
    href: "/dashboard/employees/new",
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "View Reports",
    description: "Analyse workforce data",
    icon: BarChart3,
    href: "/dashboard/reports",
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Manage Roles",
    description: "Update permissions & access",
    icon: ShieldCheck,
    href: "/dashboard/settings",
    color: "bg-amber-50 text-amber-600",
  },
  {
    label: "Workforce Trends",
    description: "Track growth over time",
    icon: TrendingUp,
    href: "/dashboard/reports",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function OwnerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api
      .get<Stats>("/owner/stats")
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  const statCards = [
    {
      label: "Total Employees",
      value: stats?.total_employees ?? "—",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Departments",
      value: stats?.departments ?? "—",
      icon: FolderKanban,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Pending Leaves",
      value: stats?.pending_leaves ?? "—",
      icon: CalendarOff,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Active Today",
      value: stats?.active_today ?? "—",
      icon: Clock,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
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
        <h1 className="text-3xl font-bold text-gray-900 font-heading">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your organisation today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border border-gray-100 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 font-heading">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map(({ label, description, icon: Icon, href, color }) => (
            <Card
              key={label}
              className="border border-gray-100 shadow-none hover:shadow-sm transition-shadow"
            >
              <CardContent className="pt-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{label}</h3>
                <p className="text-xs text-gray-500 mb-4">{description}</p>
                <Button size="sm" variant="outline" asChild className="w-full">
                  <Link href={href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Owner Permissions Banner */}
      <Card className="border border-blue-100 bg-blue-50 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2 font-heading">
            <ShieldCheck className="h-4 w-4" />
            Owner Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700">
            You have full administrative control over this organisation — including
            managing roles, viewing all employee records, approving leaves, and
            configuring system settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
