"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Clock,
  HandCoins,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/auth-store";

const navItems = [
  { label: "Dashboard", href: "/employee-dashboard", icon: LayoutDashboard },
  { label: "My Attendance", href: "/employee-dashboard/attendance", icon: Clock },
  { label: "My Payslips", href: "/employee-dashboard/payslips", icon: HandCoins },
];

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useAuthStore();

  async function handleLogout() {
    try {
      await api.post("/logout");
    } finally {
      clearUser();
      router.push("/login");
    }
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-gray-100 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-800">
        <Building2 className="h-5 w-5 text-blue-400" />
        <span className="text-lg font-bold tracking-tight">EmpTrack</span>
      </div>

      {/* User badge */}
      {user && (
        <div className="px-6 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-0.5">Signed in as</p>
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <span className="inline-block mt-1 text-[10px] uppercase tracking-widest font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
            {user.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
