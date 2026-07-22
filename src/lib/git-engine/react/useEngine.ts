"use client";

import { useSyncExternalStore } from "react";
import type { GitEngine } from "../store";

/**
 * Підписує компонент на зміни рушія. Повертає номер версії (примітив),
 * тож getSnapshot стабільний і useSyncExternalStore не зациклюється.
 */
export function useEngineVersion(engine: GitEngine): number {
  return useSyncExternalStore(
    engine.subscribe,
    engine.getVersion,
    () => 0, // getServerSnapshot: стала для SSR (localStorage недоступний на сервері)
  );
}
