"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useAuthStore, AuthUser } from "@/store/auth-store";
import EmployeeSidebar from "@/components/employee-dashboard/employee-sidebar";
import { Loader2 } from "lucide-react";

export default function EmployeeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (user) return;

    api
      .get<{ user: AuthUser }>("/user")
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, setUser, router]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "owner") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || user.role === "owner") return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <EmployeeSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
