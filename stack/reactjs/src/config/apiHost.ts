export function resolveApiBaseURL(): string {
    const fallback = process.env.REACT_APP_API_HOST || "";
    if (typeof window === "undefined" || !window.location) return fallback;

    const { protocol, hostname } = window.location;
    const isHttps = protocol === "https:";
    const scheme = isHttps ? "https" : "http";

    const hostNoPort = hostname.split(":")[0].toLowerCase();
    const labels = hostNoPort.split(".");

    // Require at least <sub>.<domain>.<tld>
    if (labels.length < 3) return fallback;

    const tld = labels.slice(-2).join(".");
    const tenantLabel = labels[0];
    const domainRemainder = labels.slice(1).join(".");

    const isStrongMSP = tld === "strongmindstrongperformance.com";
    const isLocalTenant = tenantLabel === "localhost" || tenantLabel.startsWith("local");

    const perTenant = (process.env.REACT_APP_API_PER_TENANT || "false").toLowerCase() === "true";

    // Shared API mode (default): map to central API per environment
    if (!perTenant) {
        if (isStrongMSP) {
            if (isLocalTenant) {
                // Local dev shared API host (supports port)
                const localShared = process.env.REACT_APP_LOCAL_SHARED_API_HOST || "localapi.strongmindstrongperformance.com:8088";
                return `${scheme}://${localShared}`;
            }
            // Prod shared API host
            const prodShared = process.env.REACT_APP_PROD_SHARED_API_HOST || "api.strongmindstrongperformance.com";
            return `${scheme}://${prodShared}`;
        }
        return fallback;
    }

    // Per-tenant API mode: api.<tenant>.<domain>
    if (isStrongMSP) {
        const apiHost = `api.${tenantLabel}.${domainRemainder}`;
        return `${scheme}://${apiHost}`;
    }

    return fallback;
}


