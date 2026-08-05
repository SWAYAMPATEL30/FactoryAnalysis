import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamUrl } from "../api/client";
import type { JobPhase, JobStatusValue } from "../api/types";

export interface StreamEvent {
  stage: JobPhase;
  status: "pending" | "running" | "done" | "error";
  detail: string;
  progress: number | null;
  ts: number;
}

export function useJobStream(jobId: string | undefined, isTerminal: boolean) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [sseError, setSseError] = useState(false);
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId || isTerminal) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    const es = new EventSource(streamUrl(jobId));
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data: StreamEvent = JSON.parse(e.data);
        setEvents((prev) => {
          // avoid duplicates (naive approach)
          if (prev.some((ev) => ev.ts === data.ts && ev.detail === data.detail)) return prev;
          return [...prev, data];
        });

        // If job completed or failed, close SSE from client side gracefully
        if (data.stage === "COMPLETED" || data.status === "error") {
          es.close();
        }

        // Whenever we get an SSE event, we also eagerly update the react-query status cache
        // to match the latest phase, so the rest of the UI stays in sync without polling.
        queryClient.setQueryData(["status", jobId], (old: any) => {
          if (!old) return old;
          let newStatus: JobStatusValue = old.status;
          if (data.status === "error") newStatus = "FAILED";
          else if (data.stage === "COMPLETED") newStatus = "COMPLETED";
          else newStatus = "PROCESSING";
          
          return {
            ...old,
            status: newStatus,
            phase: data.stage,
          };
        });

      } catch (err) {
        console.error("Failed to parse SSE event", err);
      }
    };

    es.onerror = () => {
      // SSE connection dropped. Close it and let react-query polling take over.
      es.close();
      setSseError(true);
    };

    return () => {
      es.close();
      if (esRef.current === es) {
        esRef.current = null;
      }
    };
  }, [jobId, isTerminal, queryClient]);

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return { events, latestEvent, sseError };
}
