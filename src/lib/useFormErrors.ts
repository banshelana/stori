"use client";

import { useCallback, useState } from "react";

/**
 * Field-level error state for forms.
 *
 * The important part is `clear`: without it an error raised on submit
 * stays on screen while the user fixes the field, which reads as though
 * the correction was rejected. Every setter calls it for its own key.
 */
export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clear = useCallback((key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const reset = useCallback(() => setErrors({}), []);

  return { errors, setErrors, clear, reset };
}
