"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  User,
  Users,
  Lock,
  Bell,
  HandCoins,
  Loader2,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/auth-store";

type Tab = "profile" | "password" | "notifications" | "payroll_variables" | "employee_roles";

// ─── Payroll Variables types ───────────────────────────────────────────────
type VariableType = "allowance" | "deduction" | "salary_component";

type PayrollVariable = {
  id: number;
  name: string;
  key: string;
  type: VariableType;
  default_value: string;
  description: string | null;
  is_active: boolean;
};

type EmployeeRole = {
  id: number;
  name: string;
  salary: string;
}

type VariableForm = {
  name: string;
  type: VariableType;
  default_value: string;
  description: string;
  is_active: boolean;
};

const emptyVarForm: VariableForm = {
  name: "",
  type: "allowance",
  default_value: "0",
  description: "",
  is_active: true,
};

const typeConfig: Record<VariableType, { label: string; classes: string }> = {
  allowance:        { label: "Allowance",        classes: "bg-green-100 text-green-700" },
  deduction:        { label: "Deduction",         classes: "bg-red-100 text-red-700"   },
  salary_component: { label: "Salary Component",  classes: "bg-blue-100 text-blue-700"  },
};

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",           label: "Profile",            icon: User      },
  { id: "password",          label: "Password",           icon: Lock      },
  { id: "notifications",     label: "Notifications",      icon: Bell      },
  { id: "payroll_variables", label: "Payroll Variables",  icon: HandCoins },
  { id: "employee_roles",    label: "Employee Roles",    icon: Users     },
];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Notification prefs (stored locally for now)
  const [notifPrefs, setNotifPrefs] = useState({
    payroll_alerts: true,
    attendance_alerts: true,
    leave_requests: true,
  });
  const [notifSuccess, setNotifSuccess] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      const res = await api.put<{ user: typeof user }>("/user/profile", profileForm);
      if (res.data.user) setUser(res.data.user);
      setProfileSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update profile.";
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess(false);
    try {
      await api.put("/user/password", passwordForm);
      setPasswordSuccess(true);
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update password.";
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  }

  function handleNotifSave(e: React.FormEvent) {
    e.preventDefault();
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 2500);
  }

  // ─── Payroll Variables state ─────────────────────────────────────────────
  const [variables, setVariables] = useState<PayrollVariable[]>([]);
  const [varLoading, setVarLoading] = useState(false);
  const [varDialogOpen, setVarDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PayrollVariable | null>(null);
  const [varForm, setVarForm] = useState<VariableForm>(emptyVarForm);
  const [varSaving, setVarSaving] = useState(false);
  const [varError, setVarError] = useState("");

  async function fetchVariables() {
    setVarLoading(true);
    try {
      const res = await api.get<PayrollVariable[]>("/owner/payroll-variables");
      setVariables(res.data);
    } catch {
      /* silent */
    } finally {
      setVarLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "payroll_variables" && variables.length === 0) {
      fetchVariables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function openAddVar() {
    setEditTarget(null);
    setVarForm(emptyVarForm);
    setVarError("");
    setVarDialogOpen(true);
  }

  function openEditVar(v: PayrollVariable) {
    setEditTarget(v);
    setVarForm({
      name:          v.name,
      type:          v.type,
      default_value: v.default_value,
      description:   v.description ?? "",
      is_active:     v.is_active,
    });
    setVarError("");
    setVarDialogOpen(true);
  }

  async function handleVarSave(e: React.FormEvent) {
    e.preventDefault();
    setVarSaving(true);
    setVarError("");
    try {
      if (editTarget) {
        const res = await api.put<PayrollVariable>(
          `/owner/payroll-variables/${editTarget.id}`,
          varForm
        );
        setVariables((prev) => prev.map((v) => (v.id === editTarget.id ? res.data : v)));
      } else {
        const res = await api.post<PayrollVariable>("/owner/payroll-variables", varForm);
        setVariables((prev) => [...prev, res.data]);
      }
      setVarDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save variable.";
      setVarError(msg);
    } finally {
      setVarSaving(false);
    }
  }

  async function handleVarDelete(id: number) {
    try {
      await api.delete(`/owner/payroll-variables/${id}`);
      setVariables((prev) => prev.filter((v) => v.id !== id));
    } catch {
      /* silent */
    }
  }

  // ─── Employee Role state ─────────────────────────────────────────────
  const [roles, setRoles] = useState<EmployeeRole[]>([]);

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account and preferences</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Tab nav */}
        <aside className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your name and email address.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Input value={user?.role ?? ""} disabled className="capitalize" />
                  </div>
                  {profileError && (
                    <p className="text-sm text-red-600">{profileError}</p>
                  )}
                  {profileSuccess && (
                    <p className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Profile updated successfully.
                    </p>
                  )}
                  <Separator />
                  <Button type="submit" disabled={profileSaving}>
                    {profileSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Password */}
          {activeTab === "password" && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Choose a strong password and don&apos;t reuse it for other accounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, current_password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, password: e.target.value }))
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.password_confirmation}
                      onChange={(e) =>
                        setPasswordForm((f) => ({
                          ...f,
                          password_confirmation: e.target.value,
                        }))
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  {passwordError && (
                    <p className="text-sm text-red-600">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Password updated successfully.
                    </p>
                  )}
                  <Separator />
                  <Button type="submit" disabled={passwordSaving}>
                    {passwordSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose which alerts you want to receive.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNotifSave} className="space-y-5 max-w-md">
                  {(
                    [
                      { key: "payroll_alerts", label: "Payroll Alerts", desc: "Get notified when payroll is processed." },
                      { key: "attendance_alerts", label: "Attendance Alerts", desc: "Daily attendance summary notifications." },
                      { key: "leave_requests", label: "Leave Requests", desc: "Notifications for new leave applications." },
                    ] as const
                  ).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifPrefs[key]}
                        onClick={() =>
                          setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                          notifPrefs[key] ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                            notifPrefs[key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                  {notifSuccess && (
                    <p className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Preferences saved.
                    </p>
                  )}
                  <Separator />
                  <Button type="submit">Save Preferences</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Payroll Variables */}
          {activeTab === "payroll_variables" && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Payroll Variables</CardTitle>
                  <CardDescription>
                    Define default values for allowances, deductions, and salary components
                    used when processing payroll.
                  </CardDescription>
                </div>
                <Dialog open={varDialogOpen} onOpenChange={setVarDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openAddVar} size="sm">
                      <Plus className="h-4 w-4 mr-1.5" /> Add Variable
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editTarget ? "Edit Variable" : "Add Payroll Variable"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleVarSave} className="space-y-4 pt-2">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="var_name">Name</Label>
                        <Input
                          id="var_name"
                          placeholder="e.g. Transportation Allowance"
                          value={varForm.name}
                          onChange={(e) =>
                            setVarForm((f) => ({ ...f, name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      {/* Type */}
                      <div className="space-y-1.5">
                        <Label htmlFor="var_type">Type</Label>
                        <select
                          id="var_type"
                          value={varForm.type}
                          onChange={(e) =>
                            setVarForm((f) => ({ ...f, type: e.target.value as VariableType }))
                          }
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          required
                        >
                          <option value="allowance">Allowance</option>
                          <option value="deduction">Deduction</option>
                          <option value="salary_component">Salary Component</option>
                        </select>
                      </div>
                      {/* Default value */}
                      <div className="space-y-1.5">
                        <Label htmlFor="var_value">Default Value (₱)</Label>
                        <Input
                          id="var_value"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={varForm.default_value}
                          onChange={(e) =>
                            setVarForm((f) => ({ ...f, default_value: e.target.value }))
                          }
                          required
                        />
                      </div>
                      {/* Description */}
                      <div className="space-y-1.5">
                        <Label htmlFor="var_desc">Description (optional)</Label>
                        <Input
                          id="var_desc"
                          placeholder="Brief description"
                          value={varForm.description}
                          onChange={(e) =>
                            setVarForm((f) => ({ ...f, description: e.target.value }))
                          }
                        />
                      </div>
                      {/* Active toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Active</p>
                          <p className="text-xs text-gray-500">
                            Inactive variables are excluded from payroll calculations.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={varForm.is_active}
                          onClick={() =>
                            setVarForm((f) => ({ ...f, is_active: !f.is_active }))
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            varForm.is_active ? "bg-blue-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                              varForm.is_active ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      {varError && (
                        <p className="text-sm text-red-600">{varError}</p>
                      )}
                      <Separator />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setVarDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={varSaving}>
                          {varSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {editTarget ? "Save Changes" : "Add Variable"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {varLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : variables.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No payroll variables yet. Click &ldquo;Add Variable&rdquo; to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Default Value</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variables.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${typeConfig[v.type].classes}`}
                            >
                              {typeConfig[v.type].label}
                            </span>
                          </TableCell>
                          <TableCell>
                            ₱{parseFloat(v.default_value).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {v.description ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                                v.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {v.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditVar(v)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleVarDelete(v.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employee Roles */}
          {activeTab === "employee_roles" && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Employee Roles</CardTitle>
                  <CardDescription>
                    Manage the different roles and permissions for employees within the organization.
                  </CardDescription>
                </div>
                <Dialog open={varDialogOpen} onOpenChange={setVarDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openAddVar} size="sm">
                      <Plus className="h-4 w-4 mr-1.5" /> Add Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editTarget ? "Edit Variable" : "Add Payroll Variable"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleVarSave} className="space-y-4 pt-2">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="var_name">Name</Label>
                        <Input
                          id="var_name"
                          placeholder="e.g. Manager"
                          value={varForm.name}
                          onChange={(e) =>
                            setVarForm((f) => ({ ...f, name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      {/* Type */}
                      <div className="space-y-1.5">
                        <Label htmlFor="var_type">Salary</Label>
                        <select
                          id="var_type"
                          value={varForm.type}
                          onChange={(e) =>
                            setVarForm((f) => ({ ...f, type: e.target.value as VariableType }))
                          }
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          required
                        >
                          <option value="allowance">Allowance</option>
                          <option value="deduction">Deduction</option>
                          <option value="salary_component">Salary Component</option>
                        </select>
                      </div>
                      {varError && (
                        <p className="text-sm text-red-600">{varError}</p>
                      )}
                      <Separator />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setVarDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={varSaving}>
                          {varSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {editTarget ? "Save Changes" : "Add Variable"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {varLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : variables.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No payroll variables yet. Click &ldquo;Add Variable&rdquo; to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Default Value</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variables.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${typeConfig[v.type].classes}`}
                            >
                              {typeConfig[v.type].label}
                            </span>
                          </TableCell>
                          <TableCell>
                            ₱{parseFloat(v.default_value).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {v.description ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                                v.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {v.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditVar(v)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleVarDelete(v.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
