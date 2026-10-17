"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import type { Game } from "@/config/site";
import { soloSchema, teamSchema, type SoloFormData, type TeamFormData } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";

interface RegistrationDialogProps {
  game: Game | null;
  onClose: () => void;
}

export default function RegistrationDialog({
  game,
  onClose,
}: RegistrationDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeam = game?.type === "team";
  const schema = isTeam ? teamSchema(game?.maxMembers ?? 4) : soloSchema;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SoloFormData | TeamFormData>({
    resolver: zodResolver(schema),
    defaultValues: isTeam
      ? {
          team_name: "",
          leader_name: "",
          leader_email: "",
          leader_phone: "",
          college_name: "",
          gamer_id: "",
          members: [{ name: "", ign: "", phone: "" }],
        }
      : {
          leader_name: "",
          leader_email: "",
          leader_phone: "",
          college_name: "",
          gamer_id: "",
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: control as never,
    name: "members",
  });

  async function onSubmit(data: SoloFormData | TeamFormData) {
    if (!game) return;
    setSubmitting(true);
    setError(null);

    try {
      const isPlaceholderConfig =
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your_supabase_url");

      const insertData: Record<string, unknown> = {
        game_id: game.id,
        leader_name: data.leader_name,
        leader_email: data.leader_email,
        leader_phone: data.leader_phone,
        college_name: data.college_name,
        gamer_id: data.gamer_id || "",
      };

      if (isTeam && "team_name" in data) {
        insertData.team_name = data.team_name;
        insertData.members = (data as TeamFormData).members.map((m) => ({
          name: m.name,
          ign: m.ign,
          phone: m.phone,
        }));
      } else {
        insertData.members = [];
      }

      if (isPlaceholderConfig) {
        // Save demo registration to localStorage so testing in local environment is immediate
        try {
          const key = "gaming_fest_registrations";
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          const isDuplicate = existing.some(
            (r: { game_id: string; leader_email: string }) =>
              r.game_id === game.id &&
              r.leader_email.toLowerCase() === data.leader_email.toLowerCase()
          );
          if (isDuplicate) {
            setError("You have already registered for this game with this email.");
            setSubmitting(false);
            return;
          }
          existing.push({
            id: crypto.randomUUID(),
            ...insertData,
            status: "pending",
            created_at: new Date().toISOString(),
            games: { id: game.id, slug: game.slug, name: game.name },
          });
          localStorage.setItem(key, JSON.stringify(existing));
        } catch (e) {
          console.error("Local demo save failed", e);
        }

        setSuccess(true);
        reset();
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2200);
        return;
      }

      const supabase = createClient();

      // Resolve valid UUID if game.id is a slug or legacy id
      let targetGameId = game.id;
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          targetGameId
        )
      ) {
        const { data: gameRec } = await supabase
          .from("games")
          .select("id")
          .eq("slug", game.slug)
          .maybeSingle();
        if (gameRec?.id) {
          targetGameId = gameRec.id;
        }
      }
      insertData.game_id = targetGameId;

      const { error: dbError } = await supabase
        .from("registrations")
        .insert(insertData);

      if (dbError) {
        if (dbError.code === "23505") {
          setError("You have already registered for this game with this email.");
        } else {
          setError(dbError.message);
        }
        return;
      }

      setSuccess(true);
      reset();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const teamErrors = errors as Record<string, { message?: string } & Record<string, { message?: string }[]>>;

  return (
    <AnimatePresence>
      {game && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-gray-900/95 shadow-2xl shadow-amber-500/10 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-gray-900/95 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Register for {game.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-400">
                    {isTeam
                      ? `Team Registration (${game.maxMembers} players)`
                      : "Solo Registration"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Success State */}
            {success ? (
              <div className="flex flex-col items-center gap-3 p-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-green-400/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-green-400"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Registration Successful!
                </h3>
                <p className="text-sm text-gray-400">
                  You&apos;re all set for {game.name}
                </p>
              </div>
            ) : (
              /* Form */
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 p-6"
              >
                {/* Team name (team only) */}
                {isTeam && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      Team Name
                    </label>
                    <input
                      {...register("team_name" as never)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                      placeholder="Enter your team name"
                    />
                    {"team_name" in errors && (
                      <p className="mt-1 text-xs text-red-400">
                        {(errors as Record<string, { message?: string }>).team_name?.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Leader info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
                    {isTeam ? "Team Leader" : "Player Info"}
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">
                        Full Name
                      </label>
                      <input
                        {...register("leader_name")}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                        placeholder="Your full name"
                      />
                      {errors.leader_name && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors.leader_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">
                        Email
                      </label>
                      <input
                        {...register("leader_email")}
                        type="email"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                        placeholder="you@email.com"
                      />
                      {errors.leader_email && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors.leader_email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">
                        Phone
                      </label>
                      <input
                        {...register("leader_phone")}
                        type="tel"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                        placeholder="10-digit phone number"
                      />
                      {errors.leader_phone && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors.leader_phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">
                        College
                      </label>
                      <input
                        {...register("college_name")}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                        placeholder="College / University name"
                      />
                      {errors.college_name && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors.college_name.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      In-Game Name / Gamer ID
                    </label>
                    <input
                      {...register("gamer_id" as never)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                      placeholder="Your in-game name"
                    />
                    {(errors as Record<string, { message?: string }>).gamer_id && (
                      <p className="mt-1 text-xs text-red-400">
                        {(errors as Record<string, { message?: string }>).gamer_id?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Team members (team only) */}
                {isTeam && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-cyan-400/80">
                        Team Members
                      </h4>
                      {fields.length < (game.maxMembers - 1) && (
                        <button
                          type="button"
                          onClick={() =>
                            append({ name: "", ign: "", phone: "" })
                          }
                          className="flex items-center gap-1 rounded-md bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 ring-1 ring-cyan-400/20 transition-colors hover:bg-cyan-500/20"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                          Add Member
                        </button>
                      )}
                    </div>

                    {fields.map((field, index) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-400">
                            Member {index + 1}
                          </span>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            {...register(`members.${index}.name` as never)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50"
                            placeholder="Name"
                          />
                          <input
                            {...register(`members.${index}.ign` as never)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50"
                            placeholder="In-Game Name"
                          />
                          <input
                            {...register(`members.${index}.phone` as never)}
                            type="tel"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50"
                            placeholder="Phone"
                          />
                        </div>
                        {teamErrors.members?.[index] && (
                          <p className="text-xs text-red-400">
                            Please fill all fields for this member
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !game.registrationOpen}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : !game.registrationOpen
                      ? "Registration Closed"
                      : "Submit Registration"}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
