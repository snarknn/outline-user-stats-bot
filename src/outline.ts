export interface OutlineAccessKey {
  id: string;
  name?: string;
  password?: string;
  dataLimit?: { bytes: number };
}

export interface Logger {
  level: "ERROR" | "INFO" | "DEBUG";
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export class OutlineClient {
  private baseUrl: string;
  private logger?: Logger;

  constructor(baseUrl: string, logger?: Logger) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.logger = logger;
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        parts[0] = "***";
        parsed.pathname = `/${parts.join("/")}`;
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private redactSensitive(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactSensitive(item));
    }
    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (/password|token|secret|accessurl/i.test(key)) {
          result[key] = "***";
        } else {
          result[key] = this.redactSensitive(v);
        }
      }
      return result;
    }
    return value;
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const safeUrl = this.sanitizeUrl(url);
    if (this.logger?.level === "DEBUG") {
      this.logger.debug("Outline request", { method: "GET", url: safeUrl });
    }

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      if (this.logger) {
        const errorObj = err as Error & { code?: string; cause?: unknown };
        const message = err instanceof Error ? err.message : String(err);
        const cause = errorObj.cause instanceof Error ? errorObj.cause.message : errorObj.cause;
        this.logger.error("Outline request failed", {
          url: safeUrl,
          error: message,
          name: errorObj.name,
          code: errorObj.code,
          cause,
          stack: errorObj.stack
        });
      }
      throw err;
    }
    let bodyText: string | undefined;
    if (this.logger?.level === "DEBUG") {
      bodyText = await res.clone().text();
      let safeBody: unknown = bodyText;
      try {
        safeBody = this.redactSensitive(JSON.parse(bodyText));
      } catch {
        safeBody = bodyText;
      }
      this.logger.debug("Outline response", { url: safeUrl, status: res.status, body: safeBody });
    }
    if (!res.ok) {
      if (bodyText === undefined) {
        try {
          bodyText = await res.clone().text();
        } catch {
          bodyText = undefined;
        }
      }
      if (this.logger) {
        let safeBody: unknown = bodyText;
        try {
          safeBody = this.redactSensitive(JSON.parse(bodyText || ""));
        } catch {
          safeBody = bodyText;
        }
        this.logger.error("Outline response error", { url: safeUrl, status: res.status, body: safeBody });
      }
      throw new Error(`Outline API error: ${res.status}`);
    }
    if (bodyText !== undefined) {
      return JSON.parse(bodyText) as T;
    }
    return (await res.json()) as T;
  }

  async listAccessKeys(): Promise<OutlineAccessKey[]> {
    const data = await this.request<{ accessKeys: OutlineAccessKey[] }>("/access-keys");
    return data.accessKeys || [];
  }

  async getAccessKey(accessKeyId: string): Promise<OutlineAccessKey> {
    return this.request<OutlineAccessKey>(`/access-keys/${accessKeyId}`);
  }

  async getUsageBytes(accessKeyId: string): Promise<number> {
    try {
      const data = await this.request<{ bytesTransferredByUserId: Record<string, number> }>("/metrics/transfer");
      const value = data.bytesTransferredByUserId?.[accessKeyId];
      if (typeof value === "number") return value;
    } catch {
      // Fallback to access key if metrics endpoint is unavailable.
    }

    const key = await this.getAccessKey(accessKeyId);
    const anyKey = key as unknown as { dataTransferredBytes?: number };
    return typeof anyKey.dataTransferredBytes === "number" ? anyKey.dataTransferredBytes : 0;
  }

  async resolveAccessKeyIdFromSs(ssUrl: string): Promise<string | null> {
    const parsed = parseSsUrl(ssUrl);
    if (!parsed) return null;

    const keys = await this.listAccessKeys();
    const match = keys.find((k) => k.password && k.password === parsed.password);
    return match ? match.id : null;
  }
}

export interface ParsedSsUrl {
  method: string;
  password: string;
  host: string;
  port: number;
}

function normalizeBase64(input: string): string {
  let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  if (padding) normalized += "=".repeat(4 - padding);
  return normalized;
}

function decodeBase64(input: string): string | null {
  try {
    const buf = Buffer.from(normalizeBase64(input), "base64");
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function parseUserInfo(userInfo: string): { method: string; password: string } | null {
  const parts = userInfo.split(":");
  if (parts.length < 2) return null;
  const method = parts[0];
  const password = parts.slice(1).join(":");
  return { method, password };
}

function parseHostPort(hostPort: string): { host: string; port: number } | null {
  const trimmed = hostPort.split("/")[0].split("?")[0];
  const idx = trimmed.lastIndexOf(":");
  if (idx === -1) return null;
  const host = trimmed.slice(0, idx);
  const port = Number(trimmed.slice(idx + 1));
  if (!host || Number.isNaN(port)) return null;
  return { host, port };
}

export function parseSsUrl(ssUrl: string): ParsedSsUrl | null {
  if (!ssUrl.startsWith("ss://")) return null;

  const noScheme = ssUrl.slice(5);
  const mainPart = noScheme.split("#")[0];

  if (mainPart.includes("@")) {
    const [userInfoRaw, hostPortRaw] = mainPart.split("@");
    const userInfo = userInfoRaw.includes(":") ? userInfoRaw : decodeBase64(userInfoRaw);
    if (!userInfo) return null;

    const userParsed = parseUserInfo(userInfo);
    const hostParsed = parseHostPort(hostPortRaw);
    if (!userParsed || !hostParsed) return null;

    return {
      method: userParsed.method,
      password: userParsed.password,
      host: hostParsed.host,
      port: hostParsed.port
    };
  }

  const decoded = decodeBase64(mainPart);
  if (!decoded) return null;

  const atIdx = decoded.lastIndexOf("@");
  if (atIdx === -1) return null;

  const userInfo = decoded.slice(0, atIdx);
  const hostPort = decoded.slice(atIdx + 1);

  const userParsed = parseUserInfo(userInfo);
  const hostParsed = parseHostPort(hostPort);
  if (!userParsed || !hostParsed) return null;

  return {
    method: userParsed.method,
    password: userParsed.password,
    host: hostParsed.host,
    port: hostParsed.port
  };
}
