"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/axios";

type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  joined_at: string;
};

type Department = {
  id: number;
  name: string;
};

type EmployeeForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  department_id: string;
};

const emptyForm: EmployeeForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  department_id: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  async function fetchEmployees() {
    try {
      const res = await api.get<Employee[]>("/owner/employees");
      setEmployees(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
    api
      .get<Department[]>("/owner/departments")
      .then((res) => setDepartments(res.data))
      .catch(() => {});
  }, []);

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp);
    setForm({
      name: emp.name,
      email: emp.email,
      password: "",
      role: emp.role,
      department_id: "",
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email) {
      errors.email = "Email is required.";
    } else if (!emailRegex.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!editTarget) {
      if (!form.password) {
        errors.password = "Password is required.";
      } else if (form.password.length < 8) {
        errors.password = "Password must be at least 8 characters.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/owner/employees/${editTarget.id}`, form);
      } else {
        await api.post("/owner/employees", form);
      }
      setDialogOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } }).response?.status === 422
      ) {
        const serverErrors =
          (err as { response: { data: { errors: Record<string, string[]> } } }).response.data.errors ?? {};
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(serverErrors)) {
          mapped[field] = messages[0];
        }
        setFormErrors(mapped);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this employee?")) return;
    try {
      await api.delete(`/owner/employees/${id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch {
      /* silent */
    }
  }

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-heading">
            Employees
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your team members and their details.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormErrors({}); }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="cursor-pointer">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editTarget ? "Edit Employee" : "Add New Employee"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Full Name
                </label>
                <Input
                  placeholder="John Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Email
                </label>
                <div className="pb-px">
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={form.email}
                    className={formErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: "" }));
                    }}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>
              {!editTarget && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Password
                  </label>
                  <div className="pb-px">
                    <Input
                      type="password"
                      placeholder="Temporary password (min. 8 characters)"
                      value={form.password}
                      className={formErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                      onChange={(e) => {
                        setForm({ ...form, password: e.target.value });
                        if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: "" }));
                      }}
                    />
                  </div>
                  {formErrors.password && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Role
                </label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Department
                </label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.department_id}
                  onChange={(e) =>
                    setForm({ ...form, department_id: e.target.value })
                  }
                >
                  <option value="">— Select department —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editTarget ? "Save Changes" : "Create Employee"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Card */}
      <Card className="border border-gray-100 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              All Employees
              <span className="ml-1 text-xs font-normal text-gray-400">
                ({filtered.length})
              </span>
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
              No employees found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-gray-500">{emp.email}</TableCell>
                    <TableCell>{emp.department ?? "—"}</TableCell>
                    <TableCell>
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {emp.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {emp.joined_at
                        ? new Date(emp.joined_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(emp)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(emp.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
    </div>
  );
}
