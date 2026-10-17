import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GAMES } from "@/config/site";

const phoneRegex = /^[6-9]\d{9}$/;

const memberSchema = z.object({
  name: z.string().min(1),
  ign: z.string().min(1),
  phone: z.string().regex(phoneRegex),
});

const registrationSchema = z.object({
  game_id: z.string().uuid(),
  team_name: z.string().optional(),
  leader_name: z.string().min(1),
  leader_email: z.string().email(),
  leader_phone: z.string().regex(phoneRegex),
  college_name: z.string().min(1),
  gamer_id: z.string().optional(),
  members: z.array(memberSchema).default([]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registrationSchema.parse(body);

    const supabase = await createClient();

    // Verify game exists in DB or fallback to static config
    let game: { id: string; max_members: number; type: string; registration_open?: boolean } | null = null;
    const { data: dbGame } = await supabase
      .from("games")
      .select("id, max_members, type, registration_open")
      .eq("id", parsed.game_id)
      .maybeSingle();

    if (dbGame) {
      game = dbGame;
    } else {
      const staticGame = GAMES.find((g) => g.id === parsed.game_id);
      if (staticGame) {
        game = {
          id: staticGame.id,
          max_members: staticGame.maxMembers,
          type: staticGame.type,
          registration_open: staticGame.registrationOpen,
        };
      }
    }

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    if (game.registration_open === false) {
      return NextResponse.json(
        { error: "Registration is closed for this game" },
        { status: 400 }
      );
    }

    // Validate members count
    if (game.type === "team" && parsed.members.length === 0) {
      return NextResponse.json(
        { error: "Team games require at least 1 member" },
        { status: 400 }
      );
    }

    if (parsed.members.length >= game.max_members) {
      return NextResponse.json(
        {
          error: `Maximum ${game.max_members - 1} additional members allowed`,
        },
        { status: 400 }
      );
    }

    const isPlaceholderConfig =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your_supabase_url");

    if (isPlaceholderConfig) {
      return NextResponse.json(
        {
          data: {
            id: crypto.randomUUID(),
            game_id: parsed.game_id,
            team_name: parsed.team_name || null,
            leader_name: parsed.leader_name,
            leader_email: parsed.leader_email,
            leader_phone: parsed.leader_phone,
            college_name: parsed.college_name,
            gamer_id: parsed.gamer_id || null,
            members: parsed.members,
            status: "pending",
            created_at: new Date().toISOString(),
          },
          note: "Demo Mode: Supabase not configured in .env.local yet.",
        },
        { status: 201 }
      );
    }

    // Insert registration
    const { data, error } = await supabase
      .from("registrations")
      .insert({
        game_id: parsed.game_id,
        team_name: parsed.team_name || null,
        leader_name: parsed.leader_name,
        leader_email: parsed.leader_email,
        leader_phone: parsed.leader_phone,
        college_name: parsed.college_name,
        gamer_id: parsed.gamer_id || null,
        members: parsed.members,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already registered for this game" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
