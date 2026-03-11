import { buildOAuth1Header } from "./utils/oauth1.js";

type NetSuiteClientConfig = {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
};

type QueryParams = Record<string, string | number | undefined>;

function toHostFromAccountId(accountId: string): string {
  // Example: TSTDRV1234567 -> tstdrv1234567.suitetalk.api.netsuite.com
  //          5762887_SB1   -> 5762887-sb1.suitetalk.api.netsuite.com
  const normalized = accountId.toLowerCase().replace("_", "-");
  return `${normalized}.suitetalk.api.netsuite.com`;
}

export class NetSuiteClient {
  private readonly config: NetSuiteClientConfig;
  private readonly recordBaseUrl: string;
  private readonly suiteqlBaseUrl: string;

  constructor(config: NetSuiteClientConfig) {
    this.config = config;
    const host = toHostFromAccountId(config.accountId);
    this.recordBaseUrl = `https://${host}/services/rest/record/v1`;
    this.suiteqlBaseUrl = `https://${host}/services/rest/query/v1/suiteql`;
  }

  private buildAuthHeader(
    method: string,
    url: string,
    queryParams?: QueryParams
  ): string {
    return buildOAuth1Header({
      method,
      url,
      queryParams,
      consumerKey: this.config.consumerKey,
      consumerSecret: this.config.consumerSecret,
      tokenId: this.config.tokenId,
      tokenSecret: this.config.tokenSecret,
      realm: this.config.accountId,
    });
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    options: {
      queryParams?: QueryParams;
      body?: unknown;
      base?: "record" | "suiteql";
      preferTransient?: boolean;
    } = {}
  ): Promise<T> {
    const baseUrl = options.base === "suiteql" ? this.suiteqlBaseUrl : this.recordBaseUrl;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    const url = new URL(baseUrl + cleanPath);
    if (options.queryParams) {
      Object.entries(options.queryParams).forEach(([key, value]) => {
        if (value === undefined) return;
        url.searchParams.set(key, String(value));
      });
    }

    const finalUrl = url.toString();
    const urlForSignature = finalUrl.split("?")[0];
    
    console.error(`[NetSuiteClient] ${method} ${finalUrl}`);
    console.error(`[NetSuiteClient] URL for signature: ${urlForSignature}`);
    console.error(`[NetSuiteClient] Query params:`, options.queryParams);

    const authHeader = this.buildAuthHeader(method, urlForSignature, options.queryParams);

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    if (options.preferTransient) {
      headers["Prefer"] = "transient";
    }

    const response = await fetch(finalUrl, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(options.body ?? {}),
    });

    const text = await response.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    if (!response.ok) {
      const message =
        json?.title ||
        json?.detail ||
        json?.error?.message ||
        `HTTP ${response.status} ${response.statusText}`;
      throw new Error(
        `NetSuite ${response.status}: ${message}`
      );
    }

    return json as T;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, {
      queryParams: params,
      base: "record",
    });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, {
      body,
      base: "record",
      preferTransient: true,
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, {
      body,
      base: "record",
      preferTransient: true,
    });
  }

  async suiteql<T>(query: string, limit?: number, offset?: number): Promise<T> {
    const body: any = { q: query };
    if (typeof limit === "number") {
      body.limit = limit;
    }
    if (typeof offset === "number") {
      body.offset = offset;
    }

    return this.request<T>("POST", "", {
      body,
      base: "suiteql",
      preferTransient: true,
    });
  }
}

