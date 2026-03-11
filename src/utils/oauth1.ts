import crypto from "crypto";

type OAuth1HeaderParams = {
  method: string;
  url: string;
  queryParams?: Record<string, string | number | undefined>;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  realm: string;
};

function rfc3986Encode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function buildTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const port =
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443") ||
    url.port === ""
      ? ""
      : `:${url.port}`;
  return `${url.protocol}//${url.hostname}${port}${url.pathname}`;
}

function collectParameters(
  oauthParams: Record<string, string>,
  queryParams?: Record<string, string | number | undefined>
): string {
  const params: [string, string][] = [];

  Object.entries(oauthParams).forEach(([key, value]) => {
    params.push([rfc3986Encode(key), rfc3986Encode(value)]);
  });

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, rawValue]) => {
      if (rawValue === undefined) return;
      const value = String(rawValue);
      params.push([rfc3986Encode(key), rfc3986Encode(value)]);
    });
  }

  params.sort((a, b) => {
    if (a[0] === b[0]) {
      return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
    }
    return a[0] < b[0] ? -1 : 1;
  });

  return params.map(([k, v]) => `${k}=${v}`).join("&");
}

function buildSignatureBaseString(
  method: string,
  url: string,
  normalizedParams: string
): string {
  return [
    rfc3986Encode(method.toUpperCase()),
    rfc3986Encode(normalizeUrl(url)),
    rfc3986Encode(normalizedParams),
  ].join("&");
}

function buildSigningKey(consumerSecret: string, tokenSecret: string): string {
  return `${rfc3986Encode(consumerSecret)}&${rfc3986Encode(tokenSecret)}`;
}

function sign(baseString: string, key: string): string {
  return crypto.createHmac("sha256", key).update(baseString).digest("base64");
}

export function buildOAuth1Header(params: OAuth1HeaderParams): string {
  const nonce = buildNonce();
  const timestamp = buildTimestamp();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_token: params.tokenId,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
  };

  const normalizedParams = collectParameters(oauthParams, params.queryParams);
  const baseString = buildSignatureBaseString(
    params.method,
    params.url,
    normalizedParams
  );
  const signingKey = buildSigningKey(
    params.consumerSecret,
    params.tokenSecret
  );
  const signature = sign(baseString, signingKey);

  const headerParams: Record<string, string> = {
    realm: params.realm,
    ...oauthParams,
    oauth_signature: signature,
  };

  const headerString = Object.entries(headerParams)
    .map(([key, value]) => `${rfc3986Encode(key)}="${rfc3986Encode(value)}"`)
    .join(", ");

  return `OAuth ${headerString}`;
}
