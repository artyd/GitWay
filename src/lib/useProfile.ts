"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "gitshlyah-profile";

interface State {
  profile: string | null;
  ready: boolean;
}

export function useProfile() {
  const [state, setState] = useState<State>({ profile: null, ready: false });

  useEffect(() => {
    // Одноразова синхронізація з localStorage при маунті — не каскадний
    // рендер, а обов'язковий крок, бо localStorage недоступний під час SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ profile: localStorage.getItem(KEY), ready: true });
  }, []);

  const setProfile = useCallback((name: string) => {
    localStorage.setItem(KEY, name);
    setState({ profile: name, ready: true });
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(KEY);
    setState({ profile: null, ready: true });
  }, []);

  return { profile: state.profile, setProfile, clearProfile, ready: state.ready };
}
