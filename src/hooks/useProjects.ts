import { useState, useEffect, useCallback } from 'react';
import type { Project, ProjectFilters, ProjectStats } from '../types/project';
import * as projectService from '../services/projectService';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  count: number;
  stats: ProjectStats | null;
  refresh: () => void;
}

export function useProjects(filters?: ProjectFilters): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<ProjectStats | null>(null);

  const filterKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectsResult, statsResult] = await Promise.all([
        projectService.getProjects(filters),
        projectService.getProjectStats(),
      ]);
      setProjects(projectsResult.data);
      setCount(projectsResult.count);
      setStats(statsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { projects, loading, error, count, stats, refresh: fetchData };
}
