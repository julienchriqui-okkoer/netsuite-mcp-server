import { buildOAuth1Header } from "./utils/oauth1.js";

async function parseNetSuiteError(response: Response, rawText: string | null, json: any, context: string): Promise<never> {
  console.error(`[NetSuiteClient] ERROR Response:`, {
    status: response.status,
    statusText: response.statusText,
    body: json,
    text: rawText?.substring(0, 500),
  });

  let details = "";
  try {
    if (json?.["o:errorDetails"]) {
      details = json["o:errorDetails"]
        .map(
          (e: any) =>
            `[${e.errorCode || e.type || "UNKNOWN"}] ${e.detail || e.message || ""}`.trim()
        )
        .join(" | ");
    } else if (json?.message) {
      details = json.message;
    } else if (json?.error?.message) {
      details = json.error.message;
    } else if (json?.title || json?.detail) {
      details = `${json.title ?? ""} ${json.detail ?? ""}`.trim();
    }
  } catch {
    // ignore parsing errors
  }

  const hint = getHintFor(response.status, context);

  throw new Error(
    `NetSuite ${response.status} on ${context}: ${details || response.statusText}\n` +
      `→ URL: ${response.url}\n` +
      `→ Hint: ${hint}`
  );
}

function getHintFor(status: number, context: string): string {
  const ctx = context.toLowerCase();
  if (status === 400 && ctx.includes("vendor")) {
    return "Check customForm ID, required address, and mandatory custom fields. You can inspect an existing vendor with netsuite_get_vendor_by_id.";
  }
  if (status === 400 && (ctx.includes("payment") || ctx.includes("vendorpayment"))) {
    return "Check bank account ID, currency, subsidiary, and apply structure. Compare with a known working vendor payment in Postman.";
  }
  if (status === 400 && (ctx.includes("vendorbill") || ctx.includes("vendor bill"))) {
    return "Check entity (vendor), subsidiary, expense.items structure, and required fields. Compare with a working vendor bill example.";
  }
  if (status === 401 && (ctx.includes("patch") || ctx.includes("update"))) {
    return "OAuth signature must use the actual HTTP method (PATCH). Ensure query params (e.g. ?replace=expense) are included in the signature.";
  }
  if (status === 403) {
    return "Missing permission. Verify the NetSuite role has the required permissions on this record type and SuiteQL if used.";
  }
  if (status === 404) {
    return "Record not found. Verify the internal ID or externalId exists in this NetSuite account.";
  }
  if (status === 409) {
    return "Duplicate detected. A record with this externalId or unique key already exists.";
  }
  if (status >= 500) {
    return "NetSuite internal error. Retry later and check NetSuite status dashboard.";
  }
  return "Check NetSuite error details above and, if needed, the login/audit trail for more context.";
}

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
    // Oracle spec: SuiteQL URL has no trailing slash (baseUrl only when path empty)
    const url =
      options.base === "suiteql" && (!path || path === "/")
        ? new URL(baseUrl)
        : new URL(baseUrl + cleanPath);
    if (options.queryParams) {
      Object.entries(options.queryParams).forEach(([key, value]) => {
        if (value === undefined) return;
        url.searchParams.set(key, String(value));
      });
    }

    const finalUrl = url.toString();
    const urlForSignature = finalUrl.split("?")[0];

    // OAuth 1.0a: signature must include ALL query params (from options or from path)
    const queryParamsForSignature: QueryParams = { ...options.queryParams };
    url.searchParams.forEach((value, key) => {
      queryParamsForSignature[key] = value;
    });

    console.error(`[NetSuiteClient] ${method} ${finalUrl}`);
    console.error(`[NetSuiteClient] URL for signature: ${urlForSignature}`);
    console.error(`[NetSuiteClient] Query params for signature:`, queryParamsForSignature);

    const authHeader = this.buildAuthHeader(method, urlForSignature, queryParamsForSignature);

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    if (options.preferTransient) {
      headers["Prefer"] = "transient";
    }

    // Log request body for debugging
    if (method !== "GET" && options.body) {
      console.error(`[NetSuiteClient] Request body:`, JSON.stringify(options.body, null, 2));
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
      const context = `${method} ${cleanPath}`;
      return parseNetSuiteError(response, text, json, context);
    }

    // Handle 204 No Content (create/update operations)
    // NetSuite returns the new record ID in the Location header
    if (response.status === 204) {
      const location = response.headers.get("Location") || "";
      const id = location.split("/").pop() || "unknown";
      return {
        success: true,
        id,
        location,
      } as T;
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
    const queryParams: QueryParams = {};
    if (typeof limit === "number") queryParams.limit = limit;
    if (typeof offset === "number") queryParams.offset = offset;
    return this.request<T>("POST", "", {
      body: { q: query },
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      base: "suiteql",
      preferTransient: true,
    });
  }
}

