import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createScanRequest,
  getScanRequest,
  listMyScanRequests,
  type ScanRequest,
} from '@/services/scannerRpcService';

/** Max bbox side (degrees). The worker rejects anything bigger. */
export const MAX_BBOX_SIDE_DEG = 0.2;

/** Poll interval while any tracked request is queued/running. */
const POLL_INTERVAL_MS = 15_000;

const ACTIVE_STATES: ScanRequest['status'][] = ['queued', 'running'];

function isActive(req: ScanRequest): boolean {
  return ACTIVE_STATES.includes(req.status);
}

/**
 * Manages the async "background scan" queue:
 *  - loads the caller's recent scan_requests on mount
 *  - queues a new request (with a too-large-bbox guard)
 *  - polls active (queued/running) requests every ~15s until they settle
 *
 * All timers are cleaned up on unmount.
 */
export function useScanRequests() {
  const [requests, setRequests] = useState<ScanRequest[]>([]);
  const [isQueuing, setIsQueuing] = useState(false);

  // Keep a live ref of requests so the poll loop reads fresh data without
  // re-creating the interval on every state change.
  const requestsRef = useRef<ScanRequest[]>([]);
  requestsRef.current = requests;

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Merge a freshly-fetched row into state (replace by id, else prepend).
  const mergeRequest = useCallback((row: ScanRequest) => {
    setRequests((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx === -1) return [row, ...prev];
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    const active = requestsRef.current.filter(isActive);
    if (active.length === 0) {
      stopPolling();
      return;
    }
    const results = await Promise.all(
      active.map((r) => getScanRequest(r.id).catch(() => null))
    );
    if (!mountedRef.current) return;
    for (const row of results) {
      if (row) mergeRequest(row);
    }
  }, [mergeRequest, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollTimer.current) return; // already running
    pollTimer.current = setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);
  }, [pollOnce]);

  // Start/stop the poll loop whenever the active-count crosses zero.
  useEffect(() => {
    const hasActive = requests.some(isActive);
    if (hasActive) startPolling();
    else stopPolling();
  }, [requests, startPolling, stopPolling]);

  // Initial load + unmount cleanup.
  useEffect(() => {
    mountedRef.current = true;
    listMyScanRequests(10)
      .then((rows) => {
        if (mountedRef.current) setRequests(rows);
      })
      .catch(() => {
        /* non-fatal — panel just starts empty */
      });
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  /**
   * Queue a background scan.
   * @returns the new request id on success, or null on failure / guard hit.
   * @throws nothing — surfaces errors via the returned object instead.
   */
  const queueScan = useCallback(
    async (
      areaGeojson: unknown,
      bbox: number[],
      filters: Record<string, unknown> = {}
    ): Promise<{ id: string } | { error: string }> => {
      setIsQueuing(true);
      try {
        const id = await createScanRequest(areaGeojson, bbox, filters);
        // Optimistically insert a queued row so the panel updates immediately;
        // the poll loop will refine it as the worker progresses.
        const optimistic: ScanRequest = {
          id,
          area_geojson: areaGeojson,
          bbox,
          filters,
          status: 'queued',
          counts: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (mountedRef.current) mergeRequest(optimistic);
        // Pull the real row (in case the worker already advanced it).
        getScanRequest(id)
          .then((row) => {
            if (row && mountedRef.current) mergeRequest(row);
          })
          .catch(() => {});
        return { id };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Unknown error' };
      } finally {
        if (mountedRef.current) setIsQueuing(false);
      }
    },
    [mergeRequest]
  );

  return { requests, isQueuing, queueScan };
}
