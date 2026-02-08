import { useState, useEffect, useCallback } from 'react';
import type { Client, ClientFilters } from '../types/client';
import * as clientService from '../services/clientService';

interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  count: number;
  refresh: () => void;
}

export function useClients(filters?: ClientFilters): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const filterKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await clientService.getClients(filters);
      setClients(result.data);
      setCount(result.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { clients, loading, error, count, refresh: fetchData };
}
