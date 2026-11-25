import { Loader2, type LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn, ICON_STROKE } from "./cn";
import { Tooltip } from "./Tooltip";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 ease-[var(--ease-standard)] disabled:cursor-not-allowed select-none";

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-13 px-5 text-md",
};

export const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press disabled:bg-raised disabled:text-ink-disabled",
  secondary: "bg-panel text-ink border border-line-strong hover:bg-raised hover:border-control disabled:text-ink-disabled",
  ghost: "bg-transparent text-ink-2 hover:bg-raised hover:text-ink disabled:text-ink-disabled",
  danger: "bg-critical-solid text-white hover:bg-critical-solid-hover disabled:bg-raised disabled:text-ink-disabled",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, loading = false, className, children, type = "button", disabled, ...rest },
  ref,
) {
  const iconSize = size === "lg" ? 20 : 16;
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, SIZE[size], VARIANT[variant], className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader2 size={iconSize} strokeWidth={ICON_STROKE} className="animate-spin shrink-0" aria-hidden="true" />
      ) : (
        Icon && <Icon size={iconSize} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight size={iconSize} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" />}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  /** Required: rendered as aria-label and as the tooltip. */
  label: string;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
  tooltipSide?: "top" | "bottom" | "right" | "left";
  hideTooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = "ghost", size = "md", tooltipSide = "bottom", hideTooltip = false, className, type = "button", ...rest },
  ref,
) {
  return (
    <Tooltip content={label} side={tooltipSide} disabled={hideTooltip}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={cn(BASE, size === "sm" ? "size-9" : "size-11", "shrink-0", VARIANT[variant], className)}
        {...rest}
      >
        <Icon size={size === "sm" ? 16 : 20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </button>
    </Tooltip>
  );
});
