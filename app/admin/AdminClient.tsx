"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exportToCSV } from "@/lib/utils";

interface GameRow {
  id: string;
  slug: string;
  name: string;
}

interface Member {
  name: string;
  ign: string;
  phone: string;
}

interface RegistrationRow {
  id: string;
  game_id: string;
  team_name: string | null;
  leader_name: string;
  leader_email: string;
  leader_phone: string;
  college_name: string;
  gamer_id?: string;
  status?: string;
  members: Member[];
  created_at: string;
  games: GameRow;
}

interface AdminClientProps {
  registrations: RegistrationRow[];
  games: GameRow[];
  userEmail: string;
}

export default function AdminClient({
  registrations,
  games,
  userEmail,
}: AdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const tabs = [
    { id: "all", label: "All", count: registrations.length },
    ...games.map((g) => ({
      id: g.slug,
      label: g.name,
      count: registrations.filter((r) => r.games?.slug === g.slug).length,
    })),
  ];

  const filtered = useMemo(() => {
    let result = registrations;

    // Filter by game tab
    if (activeTab !== "all") {
      result = result.filter((r) => r.games?.slug === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.leader_name.toLowerCase().includes(q) ||
          r.leader_email.toLowerCase().includes(q) ||
          r.college_name.toLowerCase().includes(q) ||
          (r.team_name && r.team_name.toLowerCase().includes(q)) ||
          r.games?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [registrations, activeTab, search]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  function handleExport() {
    const data = filtered.map((r) => ({
      Game: r.games?.name || "",
      "Team Name": r.team_name || "-",
      "Leader Name": r.leader_name,
      "Gamer ID / IGN": r.gamer_id || "-",
      Email: r.leader_email,
      Phone: r.leader_phone,
      College: r.college_name,
      Status: r.status || "pending",
      Members: r.members?.length
        ? r.members.map((m: Member) => `${m.name} (${m.ign})`).join("; ")
        : "-",
      "Registered At": new Date(r.created_at).toLocaleString(),
    }));
    exportToCSV(data, `registrations-${activeTab}-${Date.now()}`);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-400">
              Logged in as{" "}
              <span className="text-amber-400">{userEmail}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 ring-1 ring-red-500/20 transition-colors hover:bg-red-500/20"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                activeTab === tab.id
                  ? "border-amber-400/30 bg-amber-500/10 shadow-lg shadow-amber-500/5"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5"
              }`}
            >
              <p className="text-2xl font-bold text-white">{tab.count}</p>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {tab.label}
              </p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, college, team..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left font-medium text-gray-400">
                    Game
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">
                    Team/Player
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">
                    Leader
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-gray-400 md:table-cell">
                    Email
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-gray-400 lg:table-cell">
                    College
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-gray-400 sm:table-cell">
                    Members
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-gray-600"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <line x1="10" y1="9" x2="8" y2="9" />
                        </svg>
                        <p className="text-sm text-gray-500">
                          No registrations found
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((reg) => (
                    <>
                      <tr
                        key={reg.id}
                        onClick={() =>
                          setExpandedRow(
                            expandedRow === reg.id ? null : reg.id
                          )
                        }
                        className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-400/20">
                            {reg.games?.name || "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {reg.team_name || reg.leader_name}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {reg.leader_name}
                        </td>
                        <td className="hidden px-4 py-3 text-gray-400 md:table-cell">
                          {reg.leader_email}
                        </td>
                        <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                          {reg.college_name}
                        </td>
                        <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                          {reg.members?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDate(reg.created_at)}
                        </td>
                      </tr>

                      {/* Expanded row for member details */}
                      {expandedRow === reg.id && reg.members?.length > 0 && (
                        <tr key={`${reg.id}-details`}>
                          <td
                            colSpan={7}
                            className="border-b border-white/5 bg-white/[0.02] px-8 py-4"
                          >
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                                Team Members
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {reg.members.map(
                                  (m: Member, i: number) => (
                                    <div
                                      key={i}
                                      className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                                    >
                                      <p className="text-sm font-medium text-white">
                                        {m.name}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        IGN: {m.ign}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        📞 {m.phone}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>

                              {/* Full details for mobile */}
                              <div className="mt-3 space-y-1 md:hidden">
                                <p className="text-xs text-gray-400">
                                  <span className="text-gray-500">Email:</span>{" "}
                                  {reg.leader_email}
                                </p>
                                <p className="text-xs text-gray-400">
                                  <span className="text-gray-500">Phone:</span>{" "}
                                  {reg.leader_phone}
                                </p>
                                <p className="text-xs text-gray-400">
                                  <span className="text-gray-500">
                                    College:
                                  </span>{" "}
                                  {reg.college_name}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-right text-xs text-gray-500">
          Showing {filtered.length} of {registrations.length} registrations
        </div>
      </div>
    </div>
  );
}
