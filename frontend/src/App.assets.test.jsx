import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

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
  setPath("/assets");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  setPath("/");
  vi.unstubAllGlobals();
});

describe("App asset routing", () => {
  it("opens the inventory page directly at /assets", async () => {
    fetchMock.mockResolvedValue(apiResponse([]));

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Asset inventory" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await screen.findByText("No assets have been registered yet."),
    ).toBeInTheDocument();
  });

  it("links the dashboard Assets navigation to the inventory route", async () => {
    setPath("/");
    fetchMock.mockImplementation(async (url) => {
      if (url.endsWith("/api/tickets")) {
        return apiResponse([]);
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
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute(
      "href",
      "/assets",
    );
  });
});
