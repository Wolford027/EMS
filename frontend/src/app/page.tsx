import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navigations/navbar";
import {
  Users,
  BarChart3,
  Shield,
  Clock,
  ChevronRight,
  Building2,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Employee Profiles",
    desc: "Maintain detailed employee records including personal info, roles, and contact details.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Gain insights with visual dashboards and exportable reports on workforce metrics.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Granular permissions ensure employees only see what they're authorized to access.",
  },
  {
    icon: Clock,
    title: "Attendance Tracking",
    desc: "Monitor check-ins, absences, and overtime with an intuitive time tracking system.",
  },
  {
    icon: Building2,
    title: "Department Management",
    desc: "Organize your company structure with easy-to-manage department hierarchies.",
  },
  {
    icon: CheckCircle2,
    title: "Leave Management",
    desc: "Automate leave requests, approvals, and balance tracking across all teams.",
  },
];

const stats = [
  { value: "10,000+", label: "Employees Managed" },
  { value: "500+", label: "Companies" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-b from-blue-50 to-white py-28 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <CheckCircle2 className="h-4 w-4" />
            Employee Management Made Simple
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight font-heading">
            Manage your workforce
            <br />
            <span className="text-blue-600">with confidence</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            A powerful platform to track employees, manage departments, handle
            payroll, and streamline HR operations — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-base px-8">
              <Link href="/signup">
                Get Started Free <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-100 rounded-full opacity-40 blur-3xl pointer-events-none" />
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-extrabold text-blue-600 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-heading">
              Everything you need
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Powerful features designed to make HR management effortless.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-heading">
            Ready to get started?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join hundreds of companies already using EmpTrack to manage their workforce.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-base px-8">
            <Link href="/signup">Create Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-400" />
            <span className="text-white font-semibold">EmpTrack</span>
          </div>
          <p className="text-sm">© 2026 EmpTrack. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-white transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
