import { ChevronDown, OctagonAlert } from "lucide-react";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn, ICON_STROKE } from "./cn";

export const CONTROL =
  "h-11 w-full rounded-md bg-sunken border border-control px-3 text-base text-ink placeholder:text-ink-3 hover:border-ink-3 focus-visible:outline-2 focus-visible:outline-focus aria-[invalid=true]:border-critical disabled:text-ink-disabled disabled:cursor-not-allowed";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export interface FieldProps {
  label: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** Hide the label visually (kept for screen readers). */
  hideLabel?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label above, helper or error below, all wired up with ids. */
export function Field({ label, helper, error, className, hideLabel = false, children }: FieldProps) {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = [helper ? helperId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className={cn("text-xs font-medium text-ink-2 mb-1.5", hideLabel && "sr-only")}>
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {helper && !error && (
        <p id={helperId} className="text-xs text-ink-3 mt-1.5">
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs text-critical mt-1.5">
          <OctagonAlert size={12} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Measurement unit shown as a mono suffix inside the control. */
  unit?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ unit, className, ...rest }, ref) {
  if (!unit) return <input ref={ref} className={cn(CONTROL, className)} {...rest} />;
  return (
    <div className="relative">
      <input ref={ref} className={cn(CONTROL, "pr-14 font-mono tabular-nums", className)} {...rest} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-ink-3">{unit}</span>
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(CONTROL, "h-auto min-h-11 py-2.5 resize-none leading-5", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(CONTROL, "appearance-none pr-10 truncate", className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2"
      />
    </div>
  );
});

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Show the label next to the switch; otherwise it is aria-label only. */
  showLabel?: boolean;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
}

export function Switch({ checked, onChange, label, showLabel = false, disabled = false, id, describedBy }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md text-sm text-ink disabled:cursor-not-allowed disabled:text-ink-disabled"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-150",
          checked ? "bg-accent border-accent" : "bg-sunken border-control group-hover:border-ink-3",
          disabled && "opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute size-4 rounded-full transition-transform duration-150 ease-[var(--ease-standard)]",
            checked ? "translate-x-5 bg-on-accent" : "translate-x-1 bg-ink-2",
          )}
        />
      </span>
      {showLabel && <span>{label}</span>}
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </button>
  );
}

export interface SliderProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
  describedBy?: string;
}

/** Native range input with a mono value readout. */
export function Slider({ id, label, value, min, max, step, onChange, format = String, disabled, describedBy }: SliderProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-xs font-medium text-ink-2">
          {label}
        </label>
        <output htmlFor={inputId} className="font-mono text-xs text-ink tabular-nums">
          {format(value)}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
      />
      <div className="flex justify-between font-mono text-2xs text-ink-3" aria-hidden="true">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

/** Radio-group semantics with arrow-key navigation. */
export function SegmentedControl<T extends string>({ label, options, value, onChange, className }: SegmentedControlProps<T>) {
  const move = (dir: 1 | -1, current: number, group: HTMLElement | null) => {
    const next = (current + dir + options.length) % options.length;
    onChange(options[next].value);
    const btns = group?.querySelectorAll<HTMLButtonElement>("[role=radio]");
    btns?.[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex p-0.5 bg-sunken border border-line rounded-md", className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1, i, e.currentTarget.parentElement);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1, i, e.currentTarget.parentElement);
              }
            }}
            className={cn(
              "h-9 px-3 text-sm rounded-sm border",
              selected ? "bg-raised text-ink border-line-strong" : "text-ink-2 border-transparent hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
