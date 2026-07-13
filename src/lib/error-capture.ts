let lastCapturedError: unknown;

function capture(error: unknown) {
  lastCapturedError = error;
}

if (typeof process !== "undefined") {
  process.on?.("uncaughtException", capture);
  process.on?.("unhandledRejection", capture);
}

export function consumeLastCapturedError() {
  const error = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
