import { clsx } from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cn(...args: Parameters<typeof clsx>) {
  return clsx(...args);
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-stone-300",
    secondary:
      "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:text-stone-400",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-300",
    ghost: "text-stone-600 hover:bg-stone-100",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
        className
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  required,
  className,
}: {
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("mb-1 block text-sm font-medium text-stone-700", className)}>
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-stone-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 border-b border-stone-200 pb-2 text-lg font-semibold text-stone-800">
      {children}
    </h2>
  );
}
