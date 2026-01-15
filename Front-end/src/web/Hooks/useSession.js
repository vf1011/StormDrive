// src/web/Hooks/useSession.js
import { useSyncExternalStore } from "react";

export function useSession(session) {
  return useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.getState(),
    () => session.getState()
  );
}
