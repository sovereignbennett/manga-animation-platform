export interface ErrorReportContext {
  boundary?: string;
  [key: string]: unknown;
}

export function reportLovableError(error: unknown, context: ErrorReportContext = {}) {
  if (import.meta.env.DEV) {
    console.error("[MotionCut]", context, error);
  }
}
