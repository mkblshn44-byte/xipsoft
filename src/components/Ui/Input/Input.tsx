"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      id,
      disabled,
      required,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const baseStyles = cn(
      "w-full rounded-btn border transition-all duration-fast",
      "bg-white text-brand-text-primary placeholder-brand-text-muted",
      "disabled:bg-brand-neutral-bgAlt disabled:cursor-not-allowed",
      "focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary",
      "text-body-md",
      fullWidth && "w-full",
    );

    const stateStyles = error
      ? "border-brand-error focus:ring-brand-error/30 focus:border-brand-error"
      : "border-brand-neutral-border hover:border-brand-secondary/50";

    const iconStyles = "absolute inset-y-0 flex items-center pointer-events-none text-brand-text-tertiary";

    return (
      <div className={cn("w-full", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-body-sm font-medium text-brand-text-secondary mb-1.5"
          >
            {label}
            {required && <span className="text-brand-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className={cn(iconStyles, "left-3")} aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseStyles,
              stateStyles,
              leftIcon ? "pl-10" : "pl-4",
              rightIcon ? "pr-10" : "pr-4",
              "py-2.5",
              className,
            )}
            disabled={disabled}
            required={required}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={cn(errorId, helperId)}
            {...props}
          />
          {rightIcon && (
            <div className={cn(iconStyles, "right-3")} aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-body-sm text-brand-error flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-body-sm text-brand-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, helperText, fullWidth = true, id, disabled, required, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className={cn("w-full", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-body-sm font-medium text-brand-text-secondary mb-1.5"
          >
            {label}
            {required && <span className="text-brand-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-card border transition-all duration-fast",
            "bg-white text-brand-text-primary placeholder-brand-text-muted",
            "disabled:bg-brand-neutral-bgAlt disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary",
            "text-body-md p-4 resize-y min-h-[100px]",
            error
              ? "border-brand-error focus:ring-brand-error/30 focus:border-brand-error"
              : "border-brand-neutral-border hover:border-brand-secondary/50",
            fullWidth && "w-full",
            className,
          )}
          disabled={disabled}
          required={required}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={cn(errorId, helperId)}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-body-sm text-brand-error flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-body-sm text-brand-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, helperText, options, placeholder, fullWidth = true, id, disabled, required, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className={cn("w-full", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-body-sm font-medium text-brand-text-secondary mb-1.5"
          >
            {label}
            {required && <span className="text-brand-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-btn border appearance-none transition-all duration-fast",
              "bg-white text-brand-text-primary",
              "disabled:bg-brand-neutral-bgAlt disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary",
              "text-body-md pr-10 pl-4 py-2.5",
              error
                ? "border-brand-error focus:ring-brand-error/30 focus:border-brand-error"
                : "border-brand-neutral-border hover:border-brand-secondary/50",
              fullWidth && "w-full",
              className,
            )}
            disabled={disabled}
            required={required}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={cn(errorId, helperId)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-tertiary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-body-sm text-brand-error flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-body-sm text-brand-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Input;