import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getCSRFToken } from "../allauth/lib/django";
import { resolveApiBaseURL } from "./apiHost";

export interface HttpResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: string;
  errors?: { [key: string]: any };
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: resolveApiBaseURL(),
      withCredentials: true
    });

    this.setupInterceptors();
  }

  public async stream<T>(endpoint: string, data: any,
    onMessage: (chunk: T) => void,
    onError?: (error: string) => void,
    onDone?: () => void) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes

    try {
      const url = this.normalizeUrl(`${resolveApiBaseURL()}${endpoint}`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken() || ""
        },
        body: JSON.stringify(data),
        credentials: "include",
        signal: controller.signal // Attach timeout controller
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        chunk.split("||JSON_END||").forEach((line) => {
          if (line.trim()) {
            try {
              const parsed: T = JSON.parse(line);
              onMessage(parsed);
            } catch (err) {
              console.error("Error parsing JSON chunk:", err);
            }
          }
        });
      }
    } catch (error: any) {
      if (onError) onError(error.message || "An unexpected error occurred");
    } finally {
      clearTimeout(timeout); // Clear timeout when done
      if (onDone) onDone();
    }
  }

  // Public API methods
  public async get<T>(url: string): Promise<HttpResponse<T>> {
    return this.request<T>("get", url);
  }

  // Demo claim endpoint with graceful fallback when backend is unavailable
  public async claimTeamAccount(data: {
    teamCode: string;
    firstName: string;
    lastName: string;
    dob: string; // YYYY-MM-DD
  }): Promise<{ authenticated: boolean; next?: string; demo?: boolean }> {
    try {
      const res = await this.post<any>("/api/auth/claim-team", data, {
        "Content-Type": "application/json"
      });
      if (res.success) {
        // Assume backend returns authenticated + next
        const out: any = res.data || {};
        if (typeof out === "object" && out != null && (out.authenticated || out.token)) {
          return { authenticated: true, next: out.next || "/onboarding" };
        }
      }
      // If API responded but not in expected shape, fall back to demo success
      return { authenticated: true, next: "/onboarding", demo: true };
    } catch (e) {
      // Network/404/501 → demo success to showcase flow
      return { authenticated: true, next: "/onboarding", demo: true };
    }
  }

  public async post<T>(url: string, data: any, headers?: any): Promise<HttpResponse<T>> {
    return this.request<T>("post", url, data, headers);
  }

  public async put<T>(url: string, data: any, headers?: any): Promise<HttpResponse<T>> {
    return this.request<T>("put", url, data, headers);
  }

  public async patch<T>(url: string, data: any, headers?: any): Promise<HttpResponse<T>> {
    return this.request<T>("patch", url, data, headers);
  }

  public async delete<T>(url: string): Promise<HttpResponse<T>> {
    return this.request<T>("delete", url);
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => this.requestInterceptor(config),
      (error) => Promise.reject(error)
    );
  }

  private requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    // Add CSRF token
    const csrfToken = getCSRFToken();
    const allheaders = config.headers;
    if (csrfToken) {
      allheaders["X-CSRFToken"] = csrfToken;
    }

    // Add mobile app headers if available
    const appOS = localStorage.getItem("appOS");
    const token = localStorage.getItem("strongmsp_token");
    if (appOS && token) {
      allheaders["X-App-Client"] = appOS;
      allheaders["Authorization"] = `Bearer ${token}`;
    }

    config.headers = allheaders;

    // Clean up URL trailing slashes
    if (config.url) {
      config.url = this.normalizeUrl(config.url);
    }

    return config;
  }

  private normalizeUrl(url: string): string {
    const [path, query] = url.split("?");
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    return query ? `${cleanPath}?${query}` : cleanPath;
  }

  private async request<T>(
    method: "get" | "post" | "put" | "patch" | "delete",
    url: string,
    data?: any,
    headers: any = {}
  ): Promise<HttpResponse<T>> {
    try {
      const config: AxiosRequestConfig = { headers };
      const response: AxiosResponse<T> = await (method === "get" || method === "delete"
        ? this.client[method]<T>(url, config)
        : this.client[method]<T>(url, data, config));

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): HttpResponse<any> {
    if (!error) {
      return { success: false, error: "Unknown error occurred" };
    }

    let errorData = error;
    if (axios.isAxiosError(error)) {
      errorData = error.response?.data ?? error.message;
    }

    const errorMessage = this.extractErrorMessage(errorData);
    const errorResponse: HttpResponse<any> = {
      success: false,
      error: errorMessage
    };

    if (typeof errorData === "object") {
      errorResponse.errors = errorData;
    }

    return errorResponse;
  }

  private extractErrorMessage(error: any): string {
    if (typeof error === "string") return error;

    // Handle enhanced permission error responses
    if (error.message) {
      return error.message
    } else if (error.permission_context) {
      const context = error.permission_context;
      const userRoles = context.user_roles?.join(", ") || "anonymous";
      const objectType = context.context?.[0] || "resource";
      const verb = context.verb || "access";
      const ownership = context.ownership || "others";

      // Create an error message similar to what canDo returns in access.ts
      let errMsg = `You have ${userRoles}, but must `;

      const requiredRoles = context.required_roles?.[ownership] || [];
      if (requiredRoles.length === 1) {
        errMsg += ` be ${requiredRoles[0]}`;
      } else if (requiredRoles.length > 1) {
        errMsg += ` have one of these roles - ${requiredRoles.join(", ")} - `;
      } else {
        errMsg += " have appropriate permissions";
      }

      errMsg += ` to ${verb} ${ownership === "own" ? "your own" : "someone else's"} ${objectType}`;

      return errMsg;
    }

    // Standard error handling
    const errorSource = error.error || error.detail || error;
    if (typeof errorSource === "object") {
      return Object.entries(errorSource)
        .map(([key, err]) => {
          const errorValue = Array.isArray(err) ? err.join(", ") : err;
          return `${key}: ${errorValue}`;
        })
        .join("\n\r ");
    }

    return String(errorSource);
  }
}

export default new ApiClient();
