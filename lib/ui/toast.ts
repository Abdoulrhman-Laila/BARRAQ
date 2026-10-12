"use client";

import { toast as sonnerToast, type ExternalToast } from "sonner";

type ToastOptions = ExternalToast;

function baseOptions(options?: ToastOptions): ToastOptions {
  return {
    duration: 4200,
    ...options
  };
}

/**
 * Unified toast API for Baraq dashboard.
 * Phase 1 foundation only — do not wire into every API call yet.
 *
 * Auth failures (401) and forbidden (403) should stay on existing
 * session/RBAC flows unless a later phase explicitly maps them.
 */
export const toast = {
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, baseOptions(options));
  },
  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, baseOptions({ duration: 5600, ...options }));
  },
  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, baseOptions(options));
  },
  info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, baseOptions(options));
  },
  loading(message: string, options?: ToastOptions) {
    return sonnerToast.loading(message, baseOptions({ duration: Infinity, ...options }));
  },
  message(message: string, options?: ToastOptions) {
    return sonnerToast.message(message, baseOptions(options));
  },
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: ToastOptions
  ) {
    return sonnerToast.promise(promise, {
      ...baseOptions(options),
      loading: messages.loading,
      success: messages.success,
      error: messages.error
    });
  }
};

export type { ToastOptions };
