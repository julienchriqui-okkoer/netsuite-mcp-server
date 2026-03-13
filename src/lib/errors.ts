export function parseNetSuiteError(error: any): string {
  try {
    const body = (error as any)?.response?.data ?? (error as any)?.body;
    if (!body) {
      return (error as any)?.message ?? "Unknown NetSuite error";
    }

    if (body["o:errorDetails"] && Array.isArray(body["o:errorDetails"]) && body["o:errorDetails"].length > 0) {
      return body["o:errorDetails"]
        .map(
          (e: any) =>
            `[${e.errorCode ?? e.type ?? "ERR"}] ${e.detail ?? e.message ?? ""}`.trim()
        )
        .join(" | ");
    }

    if (body.message) return body.message;
    if (body.error?.message) return body.error.message;
    if (typeof body === "string") return body;
    return JSON.stringify(body);
  } catch {
    return (error as any)?.message ?? "Unknown NetSuite error";
  }
}

