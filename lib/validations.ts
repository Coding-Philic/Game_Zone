import { z } from "zod";

const phoneRegex = /^[6-9]\d{9}$/;

export const memberSchema = z.object({
  name: z.string().min(1, "Member name is required"),
  ign: z.string().min(1, "In-game name is required"),
  phone: z
    .string()
    .regex(phoneRegex, "Enter a valid 10-digit Indian phone number"),
});

export const soloSchema = z.object({
  leader_name: z.string().min(1, "Your name is required"),
  leader_email: z
    .string()
    .email("Enter a valid email address"),
  leader_phone: z
    .string()
    .regex(phoneRegex, "Enter a valid 10-digit Indian phone number"),
  college_name: z.string().min(1, "College name is required"),
  gamer_id: z.string().min(1, "In-game name / Gamer ID is required"),
});

export const teamSchema = (maxMembers: number) =>
  z.object({
    team_name: z.string().min(1, "Team name is required"),
    leader_name: z.string().min(1, "Leader name is required"),
    leader_email: z
      .string()
      .email("Enter a valid email address"),
    leader_phone: z
      .string()
      .regex(phoneRegex, "Enter a valid 10-digit Indian phone number"),
    college_name: z.string().min(1, "College name is required"),
    gamer_id: z.string().min(1, "Leader's in-game name is required"),
    members: z
      .array(memberSchema)
      .min(1, "At least 1 team member is required")
      .max(maxMembers - 1, `Maximum ${maxMembers - 1} additional members`),
  });

export type SoloFormData = z.infer<typeof soloSchema>;
export type TeamFormData = z.infer<ReturnType<typeof teamSchema>>;
export type MemberData = z.infer<typeof memberSchema>;
