"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  ShieldCheck,
  Users,
  Receipt,
  Calendar,
  Package,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/quotes", icon: FileText, label: "Quotes" },
  { href: "/swms", icon: ShieldCheck, label: "SWMS" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/parts", icon: Package, label: "Parts" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg">TradieMate</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <UserButton  />
          <span className="text-sm text-gray-400">Account</span>
        </div>
      </div>
    </aside>
  );
}
