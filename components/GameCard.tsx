"use client";

import type { Game } from "@/config/site";
import GoldenFrameCard from "./GoldenFrameCard";

interface GameCardProps {
  game: Game;
  delay?: number;
  onSelect: (game: Game) => void;
}

export default function GameCard({ game, delay = 0, onSelect }: GameCardProps) {
  return (
    <GoldenFrameCard delay={delay} onClick={() => onSelect(game)}>
      {/* Poster image */}
      <img
        src={game.posterUrl}
        alt={game.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      />

      {/* Dark gradient over poster for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Game info overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-4 pb-[12%]">
        {/* Game type badge */}
        <span
          className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            game.type === "team"
              ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30"
              : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
          }`}
        >
          {game.type === "team" ? `Team (${game.maxMembers})` : "Solo"}
        </span>

        {/* Game name */}
        <h3 className="text-center font-bold text-white drop-shadow-lg text-lg md:text-xl">
          {game.name}
        </h3>

        {/* CTA Button */}
        <button
          className="mt-1 rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/25 transition-all duration-300 hover:shadow-amber-500/50 hover:brightness-110"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(game);
          }}
        >
          Register Now
        </button>

        {!game.registrationOpen && (
          <span className="text-[10px] font-medium text-red-400">
            Registration Closed
          </span>
        )}
      </div>
    </GoldenFrameCard>
  );
}
