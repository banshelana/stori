"use client";

import { useId } from "react";

// ---------------------------------------------------------------
// Shared form primitives. Every field renders the same label /
// error / hint structure and wires aria-invalid and
// aria-describedby, so accessibility doesn't depend on each form
// remembering to do it.
// ---------------------------------------------------------------

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

function useFieldIds(error?: string, hint?: string) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = !error && hint ? `${id}-hint` : undefined;
  return { id, errorId, hintId, describedBy: errorId ?? hintId };
}

function controlClass(error?: string, extra = "") {
  return `w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${
    error
      ? "border-rose-300 focus:border-rose-500"
      : "border-slate-200 focus:border-indigo-500"
  } ${extra}`;
}

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
    >
      {children}
      {required && (
        <span className="ms-1 text-rose-500" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

function Messages({
  error,
  hint,
  errorId,
  hintId,
}: {
  error?: string;
  hint?: string;
  errorId?: string;
  hintId?: string;
}) {
  if (error) {
    return (
      <p id={errorId} className="mt-1 text-xs text-rose-600">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={hintId} className="mt-1 text-xs text-slate-400">
        {hint}
      </p>
    );
  }
  return null;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  autoComplete,
  error,
  hint,
  required,
  disabled,
  className = "",
  dir,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
}) {
  const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);

  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        dir={dir}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={controlClass(error)}
      />
      <Messages error={error} hint={hint} errorId={errorId} hintId={hintId} />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  error,
  hint,
  required,
  className = "",
  dir,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}) {
  const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);

  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={controlClass(error, "resize-y leading-relaxed")}
      />
      <Messages error={error} hint={hint} errorId={errorId} hintId={hintId} />
    </div>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  required,
  disabled,
  className = "",
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);

  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={controlClass(error)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Messages error={error} hint={hint} errorId={errorId} hintId={hintId} />
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  className = "",
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-2 text-sm text-slate-700 ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

/** Read-only display of a value, used on the profile's basic-info block. */
export function ReadOnlyField({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 font-medium text-slate-900 ${ltr ? "force-ltr" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
