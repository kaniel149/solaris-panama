export type TeamRole = 'admin' | 'sales' | 'engineer' | 'installer';

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: TeamRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TeamMemberInsert = Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>;
export type TeamMemberUpdate = Partial<TeamMemberInsert>;
