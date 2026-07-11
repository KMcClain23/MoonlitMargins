import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const styles: Record<Variant, string> = {
  primary:
    "bg-lilac text-ink hover:bg-lilac-soft",
  secondary:
    "border border-muted/50 text-parchment hover:border-parchment",
};

const base =
  "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-colors";

export function LinkButton({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${styles[variant]}`}>
      {children}
    </Link>
  );
}

export function SubmitButton({
  variant = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button type="submit" className={`${base} ${styles[variant]} disabled:opacity-50`} {...props}>
      {children}
    </button>
  );
}
