import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadResults, type PublishedRun } from "./artifacts";

export interface ResultsState {
  status: "loading" | "ready" | "error";
  runs: PublishedRun[];
  error?: string;
  selectedRun?: string;
  selectRun: (id: string) => void;
  retry: () => void;
}

export const ResultsContext = createContext<ResultsState>({
  status: "loading", runs: [], selectRun: () => {}, retry: () => {},
});

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Pick<ResultsState, "status" | "runs" | "error">>({
    status: "loading", runs: [],
  });
  const [selectedRun, selectRun] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", runs: [] });
    loadResults(controller.signal).then((runs) => {
      if (!controller.signal.aborted) setState({ status: "ready", runs });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setState({ status: "error", runs: [],
          error: error instanceof Error ? error.message : "Results could not be loaded." });
      }
    });
    return () => controller.abort();
  }, [attempt]);
  return (
    <ResultsContext.Provider value={{ ...state, selectedRun, selectRun, retry: () => setAttempt((n) => n + 1) }}>
      {children}
    </ResultsContext.Provider>
  );
}

export const useResults = () => useContext(ResultsContext);
