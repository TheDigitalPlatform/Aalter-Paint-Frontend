import React, {
  forwardRef,
  type InputHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";

// ── FormField wrapper ──────────────────────────────────────
interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  helper,
  required,
  children,
  className = "",
}) => (
  <div className={`ea-form-field ${className}`}>
    {label && (
      <label className="ea-label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span style={{ color: "var(--color-error)", marginLeft: 3 }}>*</span>
        )}
      </label>
    )}
    {children}
    {error && <span className="ea-error-text">{error}</span>}
    {!error && helper && <span className="ea-helper-text">{helper}</span>}
  </div>
);

// ── Input ──────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { error, success, iconLeft, iconRight, className = "", style, ...rest },
    ref,
  ) => {
    const [showPw, setShowPw] = React.useState(false);
    const isPassword = rest.type === "password";

    const actualType = isPassword ? (showPw ? "text" : "password") : rest.type;

    const inputClass = [
      "ea-input",
      error ? "ea-input-error" : "",
      success ? "ea-input-success" : "",
      iconLeft || "" ? "pl-10" : "",
      iconRight || isPassword ? "pr-10" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (iconLeft || iconRight || isPassword) {
      return (
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          {iconLeft && (
            <span
              style={{
                position: "absolute",
                left: 12,
                color: "var(--color-text-muted)",
                display: "flex",
              }}
            >
              {iconLeft}
            </span>
          )}
          <input
            {...rest}
            ref={ref}
            type={actualType}
            className={inputClass}
            style={{
              paddingLeft: iconLeft ? 38 : undefined,
              paddingRight: iconRight || isPassword ? 38 : undefined,
              ...style,
            }}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute",
                right: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                display: "flex",
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {iconRight && !isPassword && (
            <span
              style={{
                position: "absolute",
                right: 12,
                color: "var(--color-text-muted)",
                display: "flex",
              }}
            >
              {iconRight}
            </span>
          )}
        </div>
      );
    }

    return <input ref={ref} className={inputClass} {...rest} />;
  },
);
Input.displayName = "Input";

// ── TextInput (labelled convenience wrapper) ───────────────
interface TextInputProps extends InputProps {
  label?: string;
  error?: boolean;
  errorMsg?: string;
  helper?: string;
  required?: boolean;
  id: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  id,
  label,
  errorMsg,
  helper,
  required,
  error,
  ...rest
}) => (
  <FormField
    label={label}
    htmlFor={id}
    error={errorMsg}
    helper={helper}
    required={required}
  >
    <Input id={id} error={error} {...rest} />
  </FormField>
);
