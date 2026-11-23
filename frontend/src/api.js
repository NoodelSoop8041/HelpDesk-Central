const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).trim().replace(/\/+$/, "");
const ACCESS_TOKEN_STORAGE_KEY = "helpdesk.access-token";
export const AUTH_SESSION_INVALID_EVENT = "helpdesk:session-invalid";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function formatApiError(detail) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== "body").join(".")
          : "";
        return [field, item.msg].filter(Boolean).join(": ");
      })
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function readStoredSession() {
  let serializedSession;
  try {
    serializedSession = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!serializedSession) {
    return null;
  }

  let session;
  try {
    session = JSON.parse(serializedSession);
  } catch {
    clearAccessToken();
    return null;
  }

  if (
    !session ||
    typeof session !== "object" ||
    Array.isArray(session) ||
    typeof session.access_token !== "string" ||
    !session.access_token ||
    !Number.isFinite(session.expires_at) ||
    session.expires_at <= Date.now()
  ) {
    clearAccessToken();
    return null;
  }

  return session;
}

export function getAccessToken() {
  return readStoredSession()?.access_token ?? null;
}

export function getAccessTokenExpiration() {
  return readStoredSession()?.expires_at ?? null;
}

export function isAuthenticated() {
  return getAccessToken() !== null;
}

export function storeAccessToken(accessToken, expiresIn) {
  if (
    typeof accessToken !== "string" ||
    !accessToken ||
    !Number.isSafeInteger(expiresIn) ||
    expiresIn < 1 ||
    expiresIn > 24 * 60 * 60
  ) {
    throw new Error("The API returned an invalid access token.");
  }

  sessionStorage.setItem(
    ACCESS_TOKEN_STORAGE_KEY,
    JSON.stringify({
      access_token: accessToken,
      expires_at: Date.now() + expiresIn * 1000,
    }),
  );
}

export function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

async function request(path, options = {}, includeAuth = true) {
  let response;
  let accessToken = null;
  try {
    const headers = { ...options.headers };
    if (includeAuth) {
      accessToken = getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the API at ${API_BASE_URL}. Check that the backend is running and VITE_API_URL is correct.`,
      );
    }
    throw error;
  }

  if (response.status === 401 && accessToken) {
    clearAccessToken();
    window.dispatchEvent(new Event(AUTH_SESSION_INVALID_EVENT));
  }

  const responseText = await response.text();
  let responseData = null;
  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error("The API returned an invalid response.");
      }
    }
  }

  if (!response.ok) {
    const detail = formatApiError(responseData?.detail);
    throw new ApiError(
      detail || `The API request failed (${response.status}).`,
      response.status,
    );
  }

  if (responseData === null) {
    throw new Error("The API returned an empty response.");
  }

  return responseData;
}

export async function getTickets() {
  const tickets = await request("/api/tickets");
  if (!Array.isArray(tickets)) {
    throw new Error("The API returned an unexpected ticket list.");
  }
  return tickets;
}

export async function getTicketStats() {
  const stats = await request("/api/tickets/stats");
  const countFields = [
    "total_tickets",
    "open_tickets",
    "in_progress_tickets",
    "resolved_tickets",
  ];

  if (
    countFields.some(
      (field) => !Number.isSafeInteger(stats?.[field]) || stats[field] < 0,
    )
  ) {
    throw new Error("The API returned unexpected ticket statistics.");
  }

  return stats;
}

export async function getDashboardData() {
  const [tickets, stats] = await Promise.all([getTickets(), getTicketStats()]);
  return { tickets, stats };
}

export async function getAssets() {
  const assets = await request("/api/assets");
  if (!Array.isArray(assets)) {
    throw new Error("The API returned an unexpected asset list.");
  }
  return assets;
}

export function createAsset(asset) {
  return request("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(asset),
  });
}

export function createTicket(ticket) {
  return request("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticket),
  });
}

export function updateTicketStatus(ticketId, status) {
  return request(`/api/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function registerEmployee({ full_name, email, password }) {
  return request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name, email, password }),
  });
}

export async function loginEmployee({ email, password }) {
  const tokenResponse = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    },
    false,
  );

  if (
    typeof tokenResponse?.access_token !== "string" ||
    !tokenResponse.access_token ||
    tokenResponse.token_type !== "bearer" ||
    !Number.isSafeInteger(tokenResponse.expires_in) ||
    tokenResponse.expires_in < 1 ||
    tokenResponse.expires_in > 24 * 60 * 60
  ) {
    throw new Error("The API returned an unexpected login response.");
  }

  return tokenResponse;
}
