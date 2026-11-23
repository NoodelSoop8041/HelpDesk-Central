import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App.jsx";

const fetchMock = vi.fn();

function apiResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

function setPath(path) {
  window.history.replaceState(null, "", path);
}

beforeEach(() => {
  fetchMock.mockReset();
  sessionStorage.clear();
  setPath("/login");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  setPath("/");
  vi.unstubAllGlobals();
});

describe("App authentication navigation", () => {
  it("supports direct login, dashboard redirect, and logout", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url) => {
      if (url.endsWith("/api/auth/login")) {
        return apiResponse({
          access_token: "test.jwt.token",
          token_type: "bearer",
          expires_in: 1800,
        });
      }
      if (url.endsWith("/api/tickets/stats")) {
        return apiResponse({
          total_tickets: 0,
          open_tickets: 0,
          in_progress_tickets: 0,
          resolved_tickets: 0,
        });
      }
      if (url.endsWith("/api/tickets")) {
        return apiResponse([]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Log in to HelpDesk Central" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Email address"),
      "taylor@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const ticketRequest = fetchMock.mock.calls.find(([url]) =>
        url.endsWith("/api/tickets"),
      );
      expect(ticketRequest[1].headers.Authorization).toBe(
        "Bearer test.jwt.token",
      );
    });

    await user.click(screen.getByText("Help Desk"));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("heading", { name: "Log in to HelpDesk Central" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("helpdesk.access-token")).toBeNull();
    expect(window.location.pathname).toBe("/login");
  });

  it("returns to login when the API rejects a saved token", async () => {
    sessionStorage.setItem(
      "helpdesk.access-token",
      JSON.stringify({
        access_token: "expired.jwt.token",
        expires_at: Date.now() + 60_000,
      }),
    );
    setPath("/");
    fetchMock.mockImplementation(async (url) => {
      if (url.endsWith("/api/tickets")) {
        return apiResponse({ detail: "Not authenticated." }, 401);
      }
      if (url.endsWith("/api/tickets/stats")) {
        return apiResponse({
          total_tickets: 0,
          open_tickets: 0,
          in_progress_tickets: 0,
          resolved_tickets: 0,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Log in to HelpDesk Central" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("helpdesk.access-token")).toBeNull();
  });

  it("clears an already expired token before showing the login page", () => {
    sessionStorage.setItem(
      "helpdesk.access-token",
      JSON.stringify({
        access_token: "expired.jwt.token",
        expires_at: Date.now() - 1,
      }),
    );

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Log in to HelpDesk Central" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("helpdesk.access-token")).toBeNull();
  });
});
