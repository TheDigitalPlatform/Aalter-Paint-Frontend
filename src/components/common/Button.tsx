import React, { forwardRef, type ButtonHTMLAttributes } from "react";
import * as Icons from "lucide-react";

export type ButtonVariant = "primary" | "solid" | "peach" | "ghost" | "danger" | "export";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeMap: Record<ButtonSize, string> = {
  xs: "ea-btn-xs",
  sm: "ea-btn-sm",
  md: "",
  lg: "ea-btn-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      children,
      disabled,
      className = "",
      ...rest
    },
    ref,
  ) => {
    const cls = [
      "ea-btn",
      `ea-btn-${variant}`,
      sizeMap[size],
      fullWidth ? "w-full" : "",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={cls}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? <Icons.Loader2 size={16} className="animate-spin" /> : iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);

Button.displayName = "Button";
