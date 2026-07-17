import { env } from "@/config/env";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(input: {
    message: string;
    status: number;
    code: string;
    details?: unknown;
    requestId?: string;
  }) {
    super(input.message);
    this.name = "ApiError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId;
  }
}

type ApiEnvelope<T> = {
  data: T;
  meta?: {
    requestId?: string;
    version?: string;
  };
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  };
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authToken?: string;
};

type HealthState = "checking" | "waking" | "ready" | "failed";

type HealthEventDetail = {
  state: HealthState;
  attempt: number;
};

export class ApiClient {
  private readonly baseUrl: string;
  private lastHealthOkAt = 0;

  constructor(baseUrl = env.VITE_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async ensureServerReady(options: {
    retries?: number;
    retryDelayMs?: number;
    freshForMs?: number;
  } = {}): Promise<void> {
    if (!this.baseUrl) return;

    const retries = options.retries ?? 5;
    const retryDelayMs = options.retryDelayMs ?? 2500;
    const freshForMs = options.freshForMs ?? 60_000;
    if (Date.now() - this.lastHealthOkAt < freshForMs) return;

    for (let attempt = 0; attempt <= retries; attempt++) {
      this.emitHealth(attempt === 0 ? "checking" : "waking", attempt + 1);
      try {
        await this.request<unknown>("/api/v1/health", {
          method: "GET",
        });
        this.lastHealthOkAt = Date.now();
        this.emitHealth("ready", attempt + 1);
        return;
      } catch (error) {
        if (attempt >= retries) {
          this.emitHealth("failed", attempt + 1);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (options.authToken) headers.set("Authorization", `Bearer ${options.authToken}`);

    const response = await fetch(this.url(path), {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (response.status === 204) return undefined as T;

    const payload = await this.parseJson<ApiEnvelope<T> | ApiErrorEnvelope>(response);
    if (!response.ok) {
      const error = "error" in payload ? payload.error : undefined;
      throw new ApiError({
        status: response.status,
        code: error?.code ?? "REQUEST_FAILED",
        message: error?.message ?? `Request failed with status ${response.status}`,
        details: error?.details,
        requestId: error?.requestId,
      });
    }

    if (!("data" in payload)) {
      throw new ApiError({
        status: response.status,
        code: "INVALID_RESPONSE",
        message: "API response did not include a data envelope.",
      });
    }

    return payload.data;
  }

  private url(path: string) {
    if (/^https?:\/\//.test(path)) return path;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private emitHealth(state: HealthState, attempt: number) {
    if (typeof window === "undefined") return;
    const detail: HealthEventDetail = { state, attempt };
    window.dispatchEvent(new CustomEvent("motioncut:api-health", { detail }));
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError({
        status: response.status,
        code: "INVALID_JSON",
        message: "API response was not valid JSON.",
      });
    }
  }
}

export const apiClient = new ApiClient();
