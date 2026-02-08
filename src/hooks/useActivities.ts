import { useState, useEffect, useCallback } from 'react';
import type { Activity, ActivityInsert } from '../types/activity';
import { supabase } from '../services/supabase';

interface UseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addActivity: (activity: ActivityInsert) => Promise<void>;
}

export function useActivities(projectId?: string, clientId?: string): UseActivitiesReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('activities')
        .select('*, user:team_members!user_id(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;
      setActivities((data as Activity[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [projectId, clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addActivity = useCallback(async (activity: ActivityInsert) => {
    const { error: dbError } = await supabase.from('activities').insert(activity);
    if (dbError) throw dbError;
    await fetchData();
  }, [fetchData]);

  return { activities, loading, error, refresh: fetchData, addActivity };
}
