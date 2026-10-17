import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const instant = false;

interface GameRow {
  id: string;
  slug: string;
  name: string;
}

interface RegistrationRow {
  id: string;
  game_id: string;
  team_name: string | null;
  leader_name: string;
  leader_email: string;
  leader_phone: string;
  college_name: string;
  members: { name: string; ign: string; phone: string }[];
  created_at: string;
  games: GameRow;
}

export default async function AdminPage() {
  const supabase = await createClient();

  // Verify authentication server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Fetch registrations with game info
  const { data: registrations, error } = await supabase
    .from("registrations")
    .select("*, games(id, slug, name)")
    .order("created_at", { ascending: false });

  // Fetch games list
  const { data: games } = await supabase
    .from("games")
    .select("id, slug, name")
    .order("name");

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <h2 className="text-lg font-bold text-red-400">
            Error Loading Data
          </h2>
          <p className="mt-2 text-sm text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <AdminClient
      registrations={(registrations as unknown as RegistrationRow[]) || []}
      games={(games as unknown as GameRow[]) || []}
      userEmail={user.email || ""}
    />
  );
}
