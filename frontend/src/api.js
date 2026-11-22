const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).trim().replace(/\/+$/, "");

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

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the API at ${API_BASE_URL}. Check that the backend is running and VITE_API_URL is correct.`,
      );
    }
    throw error;
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
