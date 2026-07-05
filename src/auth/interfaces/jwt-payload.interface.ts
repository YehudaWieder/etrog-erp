// Supabase JWT payload shape (for reference only — validation is done via supabase.auth.getUser)
export interface SupabaseJwtPayload {
  sub: string; // Supabase user UUID
  email: string;
  aud: string;
  role: string; // Supabase role ("authenticated"), not our app Role
}
