"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import {
  Plus,
  Edit2,
  MessageSquare,
  Phone,
  Mail,
  Image as ImageIcon,
  Trash2,
  Calendar,
  User,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

async function fetchActivities(date?: string) {
  const url = date ? `/api/activity?date=${date}` : "/api/activity";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CREATED: { icon: Plus, color: "text-[#22c55e]", label: "Created" },
  UPDATED: { icon: Edit2, color: "text-[#94a3b8]", label: "Updated" },
  STATUS_CHANGED: { icon: CheckCircle, color: "text-[#3b82f6]", label: "Status Changed" },
  NOTE_ADDED: { icon: MessageSquare, color: "text-[#f59e0b]", label: "Note Added" },
  CONTACT_ADDED: { icon: Phone, color: "text-[#f59e0b]", label: "Contact Added" },
  PHOTO_ADDED: { icon: ImageIcon, color: "text-[#8b5cf6]", label: "Photo Added" },
  PHOTO_DELETED: { icon: Trash2, color: "text-[#ef4444]", label: "Photo Deleted" },
};

function groupByDate(activities: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { [key: string]: any[] } = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  activities.forEach((activity) => {
    const actDate = new Date(activity.createdAt);
    actDate.setHours(0, 0, 0, 0);
    if (actDate.getTime() === today.getTime()) {
      groups.Today.push(activity);
    } else if (actDate.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(activity);
    } else if (actDate >= weekAgo) {
      groups["This Week"].push(activity);
    } else {
      groups.Older.push(activity);
    }
  });

  return groups;
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#94a3b8]">Loading...</div>}>
      <ActivityContent />
    </Suspense>
  );
}

function ActivityContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get("date") || "";

  useEffect(() => {
    if (session?.user && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity", dateFilter],
    queryFn: () => fetchActivities(dateFilter || undefined),
    enabled: session?.user?.role === "ADMIN",
  });

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  const grouped = groupByDate(activities);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Activity Log</h1>
        <div className="flex gap-2">
          <Link
            href="/activity"
            className={`px-3 py-2 rounded-lg text-sm ${
              !dateFilter ? "bg-[#3b82f6]/10 text-[#3b82f6]" : "bg-[#161d2e] text-[#94a3b8] hover:text-white"
            }`}
          >
            All
          </Link>
          <Link
            href="/activity?date=today"
            className={`px-3 py-2 rounded-lg text-sm ${
              dateFilter === "today" ? "bg-[#3b82f6]/10 text-[#3b82f6]" : "bg-[#161d2e] text-[#94a3b8] hover:text-white"
            }`}
          >
            Today
          </Link>
          <Link
            href="/activity?date=week"
            className={`px-3 py-2 rounded-lg text-sm ${
              dateFilter === "week" ? "bg-[#3b82f6]/10 text-[#3b82f6]" : "bg-[#161d2e] text-[#94a3b8] hover:text-white"
            }`}
          >
            This Week
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[#94a3b8]">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-[#94a3b8]">No activities found.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([label, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={label}>
                <h2 className="text-sm font-medium text-[#94a3b8] mb-3">{label}</h2>
                <div className="space-y-2">
                  {items.map((activity: any) => {
                    const config = actionConfig[activity.action] || {
                      icon: Clock,
                      color: "text-[#94a3b8]",
                      label: activity.action,
                    };
                    const Icon = config.icon;
                    return (
                      <div
                        key={activity.id}
                        className="glass-card p-4 flex items-start gap-4"
                      >
                        <div className={`p-2 rounded-lg bg-[#161d2e] ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-white">
                              {activity.user?.name || "Unknown"}
                            </span>
                            <span className={config.color}>{config.label}</span>
                            {activity.property && (
                              <>
                                <span className="text-[#94a3b8]">on</span>
                                <Link
                                  href={`/properties/${activity.property.id}`}
                                  className="text-[#3b82f6] hover:underline truncate"
                                >
                                  {activity.property.addressRaw}
                                </Link>
                              </>
                            )}
                          </div>
                          {activity.details && (
                            <p className="text-xs text-[#94a3b8] mt-1">{activity.details}</p>
                          )}
                          <p className="text-xs text-[#64748b] mt-1">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
