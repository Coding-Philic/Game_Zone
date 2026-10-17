"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import gsap from "gsap";
import type { Game } from "@/config/site";
import {
  soloSchema,
  teamSchema,
  type SoloFormData,
  type TeamFormData,
} from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { sound } from "@/lib/audio";

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
  const [activeField, setActiveField] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 3D spring physics for interactive mouse tilt
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    damping: 26,
    stiffness: 260,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    damping: 26,
    stiffness: 260,
  });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  // Play entry sound when dialog opens
  useEffect(() => {
    if (game) {
      sound.playWarp();
    }
  }, [game]);

  const isTeam = game?.type === "team";
  const schema = isTeam ? teamSchema(game?.maxMembers ?? 4) : soloSchema;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
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

  // Watch form values for live Cyber Readiness / Power Level Meter
  const watchedValues = watch();

  const readiness = useMemo(() => {
    let filled = 0;
    let total = isTeam ? 6 : 5;

    if (watchedValues.leader_name?.trim()) filled++;
    if (watchedValues.leader_email?.trim()) filled++;
    if (watchedValues.leader_phone?.trim()) filled++;
    if (watchedValues.college_name?.trim()) filled++;
    if (watchedValues.gamer_id?.trim()) filled++;

    if (isTeam && "team_name" in watchedValues && (watchedValues as TeamFormData).team_name?.trim()) {
      filled++;
    }

    if (isTeam && "members" in watchedValues && Array.isArray((watchedValues as TeamFormData).members)) {
      const teamMembers = (watchedValues as TeamFormData).members;
      total += teamMembers.length * 3;
      teamMembers.forEach((m) => {
        if (m?.name?.trim()) filled++;
        if (m?.ign?.trim()) filled++;
        if (m?.phone?.trim()) filled++;
      });
    }

    return Math.min(100, Math.round((filled / total) * 100));
  }, [watchedValues, isTeam]);

  // Keystroke interactive trigger: sound + GSAP micro-spark
  function handleTyping(e: React.KeyboardEvent<HTMLInputElement>) {
    sound.playKeyClick();
    // GSAP micro-pulse on target input
    const target = e.currentTarget;
    gsap.killTweensOf(target);
    gsap.fromTo(
      target,
      { boxShadow: "0 0 25px rgba(56, 189, 248, 0.6)" },
      { boxShadow: "0 0 10px rgba(56, 189, 248, 0.25)", duration: 0.35, ease: "power1.out" }
    );
  }

  async function onSubmit(data: SoloFormData | TeamFormData) {
    if (!game) return;
    setSubmitting(true);
    setError(null);
    sound.playWarp();

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

        sound.playSuccessChime();
        setSuccess(true);
        reset();
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2200);
        return;
      }

      const supabase = createClient();
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

      sound.playSuccessChime();
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          style={{ perspective: "1400px" }}
          onClick={onClose}
        >
          {/* Cyberpunk Holographic Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.12)_0%,transparent_75%)]" />

          {/* 3D Holographic Gaming Terminal Modal */}
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.88, rotateX: 18, y: 30 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, rotateX: -18, y: 30 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 my-auto max-h-[88vh] w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#060a14]/95 shadow-[0_0_60px_rgba(56,189,248,0.2)] backdrop-blur-2xl"
          >
            {/* Sci-Fi Decorative Corner Brackets */}
            <div className="pointer-events-none absolute left-2 top-2 z-20 font-mono text-[9px] text-cyan-400/70 select-none">
              ┌─── [SYS.ARENA]
            </div>
            <div className="pointer-events-none absolute right-2 top-2 z-20 font-mono text-[9px] text-amber-400/70 select-none">
              [ENCRYPTED] ───┐
            </div>
            <div className="pointer-events-none absolute bottom-2 left-2 z-20 font-mono text-[9px] text-cyan-400/50 select-none">
              └─── [SEC.LVL.01]
            </div>
            <div className="pointer-events-none absolute bottom-2 right-2 z-20 font-mono text-[9px] text-amber-400/50 select-none">
              [AUTH.ACTIVE] ───┘
            </div>

            {/* Ambient Laser Scanline Top Highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            {/* Scrollable Container */}
            <div className="max-h-[88vh] overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
              {/* Header */}
              <div className="relative mb-5 border-b border-cyan-500/20 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                        BATTLEFIELD ACCESS TERMINAL
                      </span>
                    </div>
                    <h2 className="mt-1 font-sans text-2xl font-black uppercase tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] sm:text-3xl">
                      {game.name}
                    </h2>
                    <div className="mt-1 flex items-center gap-2 font-mono text-xs text-amber-400">
                      <span className="rounded bg-amber-400/10 px-2 py-0.5 border border-amber-400/30">
                        {isTeam ? `SQUAD REGISTRATION (${game.maxMembers} PLAYERS)` : "SOLO OPERATIVE ENTRY"}
                      </span>
                      <span className="text-gray-400">• ENTRY: FREE</span>
                    </div>
                  </div>

                  {/* Close button with high-tech hover */}
                  <button
                    onClick={() => {
                      sound.playBeep(440, 0.05);
                      onClose();
                    }}
                    className="group relative rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:border-red-400 hover:bg-red-500/20 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
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

                {/* Live Cyber Readiness Power Bar */}
                <div className="mt-4 rounded-lg border border-cyan-500/20 bg-black/40 p-2.5">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      DEPLOYMENT READINESS
                    </span>
                    <span
                      className={`font-bold tracking-wider ${
                        readiness === 100 ? "text-amber-400 animate-pulse" : "text-cyan-400"
                      }`}
                    >
                      {readiness}% {readiness === 100 ? "• READY TO DEPLOY" : "• PROTOCOL PENDING"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-900 border border-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${readiness}%` }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={`h-full rounded-full transition-colors duration-300 ${
                        readiness === 100
                          ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_#f59e0b]"
                          : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_#38bdf8]"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Success State */}
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-10 text-center"
                >
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_35px_rgba(52,211,153,0.5)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="42"
                      height="42"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-400"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-sans text-2xl font-black uppercase text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                      ENTRY CONFIRMED!
                    </h3>
                    <p className="mt-1 font-mono text-sm text-emerald-400">
                      OPERATIVE PROTOCOL ACTIVATED FOR {game.name}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Prepare your gear. See you in the arena!
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Team name (team only) */}
                  {isTeam && (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="relative rounded-xl border border-cyan-500/20 bg-black/30 p-3.5 transition-all focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-mono text-xs uppercase tracking-wider text-cyan-300">
                          SQUAD / TEAM NAME
                        </label>
                        {"team_name" in watchedValues && (watchedValues as TeamFormData).team_name?.trim() ? (
                          <span className="font-mono text-[10px] text-emerald-400">✓ VERIFIED</span>
                        ) : null}
                      </div>
                      <input
                        {...register("team_name" as never)}
                        onFocus={() => {
                          setActiveField("team_name");
                          sound.playBeep(720, 0.04);
                        }}
                        onBlur={() => setActiveField(null)}
                        onKeyDown={handleTyping}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-sans text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-cyan-400 focus:bg-white/10"
                        placeholder="e.g. Apex Predators"
                      />
                      {"team_name" in errors && (
                        <p className="mt-1 font-mono text-xs text-red-400">
                          {(errors as Record<string, { message?: string }>).team_name?.message}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Leader info block */}
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                        {isTeam ? "SQUAD LEADER PROFILE" : "OPERATIVE PROFILE"}
                      </h4>
                      <span className="font-mono text-[10px] text-gray-500">
                        PRIMARY RECON
                      </span>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {/* Leader Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[11px] uppercase tracking-wider text-gray-300">
                            FULL NAME
                          </label>
                          {watchedValues.leader_name?.trim() && (
                            <span className="font-mono text-[9px] text-emerald-400">✓ READY</span>
                          )}
                        </div>
                        <input
                          {...register("leader_name")}
                          onFocus={() => {
                            setActiveField("leader_name");
                            sound.playBeep(640, 0.04);
                          }}
                          onBlur={() => setActiveField(null)}
                          onKeyDown={handleTyping}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-amber-400 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                          placeholder="Your real name"
                        />
                        {errors.leader_name && (
                          <p className="mt-1 font-mono text-[11px] text-red-400">
                            {errors.leader_name.message}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[11px] uppercase tracking-wider text-gray-300">
                            COMM EMAIL
                          </label>
                          {watchedValues.leader_email?.trim() && (
                            <span className="font-mono text-[9px] text-emerald-400">✓ READY</span>
                          )}
                        </div>
                        <input
                          {...register("leader_email")}
                          type="email"
                          onFocus={() => {
                            setActiveField("leader_email");
                            sound.playBeep(680, 0.04);
                          }}
                          onBlur={() => setActiveField(null)}
                          onKeyDown={handleTyping}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-amber-400 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                          placeholder="you@email.com"
                        />
                        {errors.leader_email && (
                          <p className="mt-1 font-mono text-[11px] text-red-400">
                            {errors.leader_email.message}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[11px] uppercase tracking-wider text-gray-300">
                            PHONE NUMBER
                          </label>
                          {watchedValues.leader_phone?.trim() && (
                            <span className="font-mono text-[9px] text-emerald-400">✓ READY</span>
                          )}
                        </div>
                        <input
                          {...register("leader_phone")}
                          type="tel"
                          onFocus={() => {
                            setActiveField("leader_phone");
                            sound.playBeep(720, 0.04);
                          }}
                          onBlur={() => setActiveField(null)}
                          onKeyDown={handleTyping}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-amber-400 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                          placeholder="10-digit number"
                        />
                        {errors.leader_phone && (
                          <p className="mt-1 font-mono text-[11px] text-red-400">
                            {errors.leader_phone.message}
                          </p>
                        )}
                      </div>

                      {/* College */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[11px] uppercase tracking-wider text-gray-300">
                            ACADEMY / COLLEGE
                          </label>
                          {watchedValues.college_name?.trim() && (
                            <span className="font-mono text-[9px] text-emerald-400">✓ READY</span>
                          )}
                        </div>
                        <input
                          {...register("college_name")}
                          onFocus={() => {
                            setActiveField("college_name");
                            sound.playBeep(760, 0.04);
                          }}
                          onBlur={() => setActiveField(null)}
                          onKeyDown={handleTyping}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-amber-400 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                          placeholder="College / Institute name"
                        />
                        {errors.college_name && (
                          <p className="mt-1 font-mono text-[11px] text-red-400">
                            {errors.college_name.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Gamer ID */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-mono text-[11px] uppercase tracking-wider text-gray-300">
                          IN-GAME HANDLE / GAMER ID
                        </label>
                        {watchedValues.gamer_id?.trim() && (
                          <span className="font-mono text-[9px] text-emerald-400">✓ READY</span>
                        )}
                      </div>
                      <input
                        {...register("gamer_id" as never)}
                        onFocus={() => {
                          setActiveField("gamer_id");
                          sound.playBeep(800, 0.04);
                        }}
                        onBlur={() => setActiveField(null)}
                        onKeyDown={handleTyping}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-amber-400 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                        placeholder="e.g. Phoenix_99 or UID"
                      />
                      {(errors as Record<string, { message?: string }>).gamer_id && (
                        <p className="mt-1 font-mono text-[11px] text-red-400">
                          {(errors as Record<string, { message?: string }>).gamer_id?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Team members (team only) */}
                  {isTeam && (
                    <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-black/30 p-4">
                      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          SQUAD ROSTER ({fields.length + 1} / {game.maxMembers})
                        </h4>
                        {fields.length < (game.maxMembers - 1) && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => {
                              sound.playCardAdd();
                              append({ name: "", ign: "", phone: "" });
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/20 px-3 py-1 font-mono text-xs font-bold text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.25)] transition-all hover:border-amber-400 hover:bg-amber-500/20 hover:text-white"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                            + ADD OPERATIVE
                          </motion.button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <motion.div
                            key={field.id}
                            initial={{ opacity: 0, rotateX: -30, scale: 0.92, y: -15 }}
                            animate={{ opacity: 1, rotateX: 0, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, height: 0 }}
                            transition={{ type: "spring", stiffness: 360, damping: 24 }}
                            className="relative rounded-lg border border-cyan-500/25 bg-black/40 p-3 shadow-inner"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                                OPERATIVE 0{index + 2} // SQUAD SLOT
                              </span>
                              {fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playBeep(320, 0.05);
                                    remove(index);
                                  }}
                                  className="font-mono text-[10px] text-red-400 transition-colors hover:text-red-300"
                                >
                                  [ DISMISS ]
                                </button>
                              )}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3">
                              <input
                                {...register(`members.${index}.name` as never)}
                                onKeyDown={handleTyping}
                                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 focus:bg-white/10"
                                placeholder="Player Name"
                              />
                              <input
                                {...register(`members.${index}.ign` as never)}
                                onKeyDown={handleTyping}
                                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 focus:bg-white/10"
                                placeholder="IGN / Gamertag"
                              />
                              <input
                                {...register(`members.${index}.phone` as never)}
                                type="tel"
                                onKeyDown={handleTyping}
                                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 focus:bg-white/10"
                                placeholder="Phone"
                              />
                            </div>
                            {teamErrors.members?.[index] && (
                              <p className="mt-1 font-mono text-[10px] text-red-400">
                                Required: Please complete all operative details.
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-400 flex items-center gap-2"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      {error}
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting || !game.registrationOpen}
                    className="relative group w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-[1px] shadow-[0_0_30px_rgba(245,158,11,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex h-full w-full items-center justify-center gap-2 rounded-xl bg-[#0a0f1d] px-6 py-3.5 transition-all group-hover:bg-transparent">
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                          <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-300">
                            ENCRYPTING & DEPLOYING...
                          </span>
                        </>
                      ) : !game.registrationOpen ? (
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500">
                          REGISTRATION LOCKED
                        </span>
                      ) : (
                        <>
                          <span className="font-mono text-xs font-black uppercase tracking-widest text-amber-300 group-hover:text-black transition-colors">
                            DEPLOY TO ARENA // SUBMIT REGISTRATION
                          </span>
                          <span className="font-mono text-amber-400 group-hover:text-black transition-colors">
                            ➔
                          </span>
                        </>
                      )}
                    </div>
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
