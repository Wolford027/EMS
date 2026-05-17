import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EmpTrack — Employee Management Platform",
  description:
    "A powerful platform to track employees, manage departments, handle payroll, and streamline HR operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
