export type GameType = "solo" | "team";

export interface Game {
  id: string;
  slug: string;
  name: string;
  posterUrl: string;
  type: GameType;
  maxMembers: number;
  registrationOpen: boolean;
}

export const GAMES: Game[] = [
  {
    id: "a1111111-1111-4111-a111-111111111111",
    slug: "tekken",
    name: "Tekken 8",
    posterUrl: "/games/tekken.jpg",
    type: "solo",
    maxMembers: 1,
    registrationOpen: true,
  },
  {
    id: "a2222222-2222-4222-a222-222222222222",
    slug: "mortal-kombat",
    name: "Mortal Kombat 1",
    posterUrl: "/games/mortal-kombat.jpg",
    type: "solo",
    maxMembers: 1,
    registrationOpen: true,
  },
  {
    id: "a3333333-3333-4333-a333-333333333333",
    slug: "fifa-26",
    name: "FIFA 26",
    posterUrl: "/games/fifa-26.jpg",
    type: "solo",
    maxMembers: 1,
    registrationOpen: true,
  },
  {
    id: "a4444444-4444-4444-a444-444444444444",
    slug: "codm",
    name: "Call of Duty: Mobile",
    posterUrl: "/games/codm.jpg",
    type: "team",
    maxMembers: 5,
    registrationOpen: true,
  },
  {
    id: "a5555555-5555-4555-a555-555555555555",
    slug: "bgmi",
    name: "BGMI",
    posterUrl: "/games/bgmi.jpg",
    type: "team",
    maxMembers: 4,
    registrationOpen: true,
  },
];

export const SITE = {
  name: "Gaming Fest",
  tagline: "The Ultimate Gaming Arena",
  edition: "1st Edition",
  background: {
    url: "/bg/cyberpunk-arena.jpg",
    type: "image" as const, // 'image' | 'video'
  },
  navLinks: [
    { label: "Home", href: "/" },
    { label: "Games", href: "#games" },
    { label: "Register", href: "#games" },
  ],
  socialLinks: [
    { label: "Instagram", href: "#", icon: "instagram" },
    { label: "Twitter", href: "#", icon: "twitter" },
    { label: "Discord", href: "#", icon: "discord" },
    { label: "YouTube", href: "#", icon: "youtube" },
  ],
};
