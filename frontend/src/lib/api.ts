const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("lms_token");
}

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

function sanitizePayload(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;

  if (Array.isArray(value)) {
    const sanitizedArray = value
      .map((item) => sanitizePayload(item))
      .filter((item) => item !== undefined);
    return sanitizedArray;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const sanitizedObject: Record<string, unknown> = {};

    entries.forEach(([key, rawValue]) => {
      const sanitized = sanitizePayload(rawValue);
      if (sanitized !== undefined) {
        sanitizedObject[key] = sanitized;
      }
    });

    return sanitizedObject;
  }

  return value;
}

export async function api<T>(
  path: string,
  options: ApiOptions = {}
): Promise<{ data?: T; error?: string }> {
  const { body, ...init } = options;
  const sanitizedBody = body !== undefined ? sanitizePayload(body) : undefined;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      body: sanitizedBody !== undefined ? JSON.stringify(sanitizedBody) : undefined,
    });
    
    let json: any = {};
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch (e) {
      // Cannot parse JSON; could be a 404/500 HTML page
    }

    if (!res.ok) {
      let errorMessage = json.error || json.message;
      if (!errorMessage) {
        if (res.status === 404) errorMessage = "Resource not found.";
        else if (res.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
          // Clear invalid token and redirect to login
          localStorage.removeItem("lms_token");
          window.location.href = "/login";
        }
        else if (res.status === 403) errorMessage = "You do not have permission to perform this action.";
        else if (res.status >= 500) errorMessage = "An internal server error occurred. Please try again later.";
        else errorMessage = res.statusText || "Request failed. Please try again.";
      }
      return { error: errorMessage };
    }
    return { data: json as T };
  } catch (err: any) {
    console.error("API Call failed:", err);
    if (err.message === "Failed to fetch") {
      return { error: "Backend server is unreachable. Please ensure the backend is running on port 5000." };
    }
    return { error: err.message || "Network error occurred. Please check your connection." };
  }
}

export async function apiFormData<T>(path: string, formData: FormData): Promise<{ data?: T; error?: string }> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: formData });
  let json: any = {};
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch (e) {
    // Cannot parse JSON
  }

  if (!res.ok) {
    let errorMessage = json.error || json.message;
    if (!errorMessage) {
      if (res.status === 404) errorMessage = "Resource not found.";
      else if (res.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
        // Clear invalid token and redirect to login
        localStorage.removeItem("lms_token");
        window.location.href = "/login";
      }
      else if (res.status === 403) errorMessage = "You do not have permission to perform this action.";
      else if (res.status >= 500) errorMessage = "An internal server error occurred. Please try again later.";
      else errorMessage = res.statusText || "Upload failed. Please try again.";
    }
    return { error: errorMessage };
  }
  return { data: json as T };
}
