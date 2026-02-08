import { useState, useEffect, useCallback } from 'react';
import type { TeamMember } from '../types/team';
import { supabase } from '../services/supabase';

interface UseTeamReturn {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTeam(): UseTeamReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (dbError) throw dbError;
      setMembers((data as TeamMember[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { members, loading, error, refresh: fetchData };
}
