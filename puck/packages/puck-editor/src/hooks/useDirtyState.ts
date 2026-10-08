import { useCallback, useEffect, useRef, useState } from 'react';

export interface DirtyState {
  /** True when the canvas differs from the last saved / loaded baseline. */
  isDirty: boolean;
  /**
   * Feed every Puck `onChange` payload through this. The very first call after
   * a (re)load establishes the baseline and is treated as "clean" — Puck emits
   * an `onChange` on mount while it normalises the incoming data, and that must
   * not be mistaken for an edit by the user.
   */
  markChange: (data: unknown) => void;
  /** Mark the current data as the saved baseline (call after a successful save). */
  markSaved: (data: unknown) => void;
}

/**
 * Tracks whether the Puck canvas has unsaved edits.
 *
 * Puck is an uncontrolled editor that fires `onChange` once on mount (to report
 * its normalised version of the initial data). Naively flagging the editor
 * dirty on the first `onChange` makes a freshly-opened page look "Unsaved" even
 * though nothing was touched. We instead capture that first payload as the
 * baseline and only flag dirty when a later payload diverges from it.
 *
 * `resetKey` should change whenever the document shown in the canvas is swapped
 * out (different page/content, or a historical version applied) so a new
 * baseline is captured for the new document.
 */
export const useDirtyState = (resetKey: string): DirtyState => {
  const [isDirty, setIsDirty] = useState(false);
  const baselineRef = useRef<string | null>(null);

  useEffect(() => {
    // New document mounted — drop the old baseline and wait for the next
    // `onChange` (Puck's normalised mount payload) to set a fresh one.
    baselineRef.current = null;
    setIsDirty(false);
  }, [resetKey]);

  const markChange = useCallback((data: unknown) => {
    const serialized = JSON.stringify(data);
    if (baselineRef.current === null) {
      baselineRef.current = serialized;
      return;
    }
    setIsDirty(serialized !== baselineRef.current);
  }, []);

  const markSaved = useCallback((data: unknown) => {
    baselineRef.current = JSON.stringify(data);
    setIsDirty(false);
  }, []);

  return { isDirty, markChange, markSaved };
};
