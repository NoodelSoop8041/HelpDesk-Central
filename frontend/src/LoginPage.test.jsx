import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginPage from "./LoginPage.jsx";

const fetchMock = vi.fn();
const password = "Strong-test-password-23";

function apiResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

async function fillValidForm(user, email = "taylor@example.com") {
  await user.type(screen.getByLabelText("Email address"), email);
  await user.type(screen.getByLabelText("Password"), password);
}

function renderLoginPage(onLoginSuccess = vi.fn()) {
  return {
    onLoginSuccess,
    ...render(<LoginPage onLoginSuccess={onLoginSuccess} />),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  sessionStorage.clear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("renders the login fields and blocks invalid form submission", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    expect(screen.getByLabelText("Email address")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
    expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.tab();
    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows and hides the password", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText("Password");
    await user.type(passwordInput, password);
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(passwordInput).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("submits normalized credentials, stores the token, and reports success", async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    fetchMock.mockResolvedValue(
      apiResponse({
        access_token: "test.jwt.token",
        token_type: "bearer",
        expires_in: 1800,
      }),
    );
    renderLoginPage(onLoginSuccess);

    await fillValidForm(user, "TAYLOR@example.com");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(onLoginSuccess).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/auth/login");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      email: "taylor@example.com",
      password,
    });
    expect(options.headers.Authorization).toBeUndefined();
    const storedSession = JSON.parse(
      sessionStorage.getItem("helpdesk.access-token"),
    );
    expect(storedSession.access_token).toBe("test.jwt.token");
    expect(storedSession.expires_at).toBeGreaterThan(Date.now());
  });

  it("shows a generic message for invalid credentials", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      apiResponse({ detail: "Invalid email or password." }, 401),
    );
    renderLoginPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password.",
    );
  });

  it("handles missing JWT configuration without exposing backend details", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      apiResponse({ detail: "JWT_SECRET_KEY has not been configured." }, 503),
    );
    renderLoginPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The login service is not configured. Please contact your administrator.",
    );
    expect(
      screen.queryByText("JWT_SECRET_KEY has not been configured."),
    ).not.toBeInTheDocument();
  });

  it("handles network failures and preserves the email address", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    renderLoginPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the login service. Check your connection and try again.",
    );
    expect(screen.getByLabelText("Email address")).toHaveValue(
      "taylor@example.com",
    );
  });

  it("disables fields and submission while the login request is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderLoginPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(screen.getByLabelText("Password")).toBeDisabled();

    resolveRequest(
      apiResponse({
        access_token: "test.jwt.token",
        token_type: "bearer",
        expires_in: 1800,
      }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Signing in…" }))
        .not.toBeInTheDocument();
    });
  });

  it("shows a clear message when the login service fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      apiResponse({ detail: "private server details" }, 500),
    );
    renderLoginPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The login service is temporarily unavailable. Please try again.",
    );
    expect(screen.queryByText("private server details")).not.toBeInTheDocument();
  });

  it("reports when the browser cannot store a session token", async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    fetchMock.mockResolvedValue(
      apiResponse({
        access_token: "test.jwt.token",
        token_type: "bearer",
        expires_in: 1800,
      }),
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable.", "SecurityError");
    });
    renderLoginPage(onLoginSuccess);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This browser could not save your session. Check its storage settings and try again.",
    );
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
