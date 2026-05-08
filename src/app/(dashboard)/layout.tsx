"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import {
  Building2,
  LayoutDashboard,
  MapPin,
  Upload,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Activity,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Properties", href: "/properties", icon: MapPin },
  { name: "CSV Import", href: "/import", icon: Upload },
];

const propertySubLinks = [
  { name: "All Properties", href: "/properties" },
  { name: "New Leads", href: "/properties?status=NEW" },
  { name: "Contacted", href: "/properties?status=CONTACTED" },
  { name: "In Negotiation", href: "/properties?status=NEGOTIATING" },
  { name: "Closed", href: "/properties?status=CLOSED" },
  { name: "High Priority", href: "/properties?priority=HIGH" },
  { name: "Follow-up", href: "/properties?followUp=upcoming" },
];

function getStatusParam(searchParams: URLSearchParams): string {
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const followUp = searchParams.get("followUp");
  if (status) return `status=${status}`;
  if (priority) return `priority=${priority}`;
  if (followUp) return `followUp=${followUp}`;
  return "";
}

function getSubLinkKey(href: string): string {
  if (href === "/properties") return "";
  const match = href.match(/status=(\w+)/);
  if (match) return `status=${match[1]}`;
  const pMatch = href.match(/priority=(\w+)/);
  if (pMatch) return `priority=${pMatch[1]}`;
  const fMatch = href.match(/followUp=(\w+)/);
  if (fMatch) return `followUp=${fMatch[1]}`;
  return "";
}

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [currentFilter, setCurrentFilter] = useState(() => getStatusParam(searchParams));
  const [menuExpanded, setMenuExpanded] = useState(true);

  useEffect(() => {
    setCurrentFilter(getStatusParam(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const handleChange = () => {
      setCurrentFilter(getStatusParam(new URLSearchParams(window.location.search)));
    };
    window.addEventListener("popstate", handleChange);
    return () => window.removeEventListener("popstate", handleChange);
  }, []);

  // Auto-expand when on dashboard or properties pages
  useEffect(() => {
    if (pathname === "/dashboard" || pathname.startsWith("/properties")) {
      setMenuExpanded(true);
    }
  }, [pathname]);

  const isExpanded = menuExpanded;

  return (
    <nav className="flex-1 p-4 space-y-1">
      {navigation.map((item) => {
        if (item.name === "Properties") {
          return (
            <div key={item.name}>
              <button
                onClick={() => setMenuExpanded(!menuExpanded)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#161d2e] transition-all"
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1 text-left">Properties</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-[#1e2738] pl-3">
                  {propertySubLinks.map((sub) => {
                    const subKey = getSubLinkKey(sub.href);
                    const isSubActive = currentFilter === subKey || (sub.href === "/properties" && !currentFilter);
                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          isSubActive
                            ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                            : "text-[#94a3b8] hover:text-white hover:bg-[#161d2e]"
                        }`}
                      >
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                : "text-[#94a3b8] hover:text-white hover:bg-[#161d2e]"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </Link>
        );
      })}
      {session?.user?.role === "ADMIN" && (
        <Link
          href="/activity"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            pathname === "/activity"
              ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
              : "text-[#94a3b8] hover:text-white hover:bg-[#161d2e]"
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity Log
        </Link>
      )}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col fixed h-full bg-[#0f1520] border-r border-[#1e2738]">
        {/* Logo */}
        <div className="p-4 border-b border-[#1e2738]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">New Chapter</h2>
              <p className="text-xs text-[#94a3b8]">Real Estate CRM</p>
            </div>
          </Link>
        </div>

        <Suspense fallback={<div className="flex-1 p-4" />}>
          <SidebarNav />
        </Suspense>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e2738] space-y-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#161d2e] transition-all"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-xs font-medium">
              {(session?.user?.name || "").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-[#94a3b8] truncate">{session?.user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#161d2e] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-6 bg-[#080b12]/80 backdrop-blur-xl border-b border-[#1e2738]">
          <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
            <Link href="/dashboard" className="hover:text-white">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">
              {navigation.find((n) => n.href === pathname)?.name || "Dashboard"}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
