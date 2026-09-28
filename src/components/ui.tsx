import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:bg-brote-dark disabled:hover:bg-ink border border-transparent",
  secondary:
    "bg-surface text-ink border border-line hover:border-ink disabled:hover:border-line",
  ghost: "bg-transparent text-ink-soft hover:text-ink border border-transparent",
  danger: "bg-transparent text-alerta border border-transparent hover:bg-alerta/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brote-dark",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </span>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function PanelSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-line px-4 py-5 last:border-b-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: Array<{ value: T; label: string; hint?: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex w-full rounded-full border border-line bg-paper-alt p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            "flex-1 rounded-full font-medium transition-colors",
            size === "sm" ? "px-3 py-1 text-xs" : "px-3 py-1.5 text-sm",
            option.value === value
              ? "bg-surface text-ink shadow-[0_1px_2px_rgba(20,21,26,0.12)]"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brote" | "alerta";
}) {
  const tones = {
    neutral: "bg-paper-alt text-ink-soft",
    brote: "bg-brote-soft text-brote-dark",
    alerta: "bg-alerta/10 text-alerta",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink";
