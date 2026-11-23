import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RegistrationPage from "./RegistrationPage.jsx";

const password = "Strong-test-password-23";
const fetchMock = vi.fn();

function apiResponse(data, status = 201) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

async function fillValidForm(user, email = "taylor@example.com") {
  await user.type(screen.getByLabelText("Full name"), "Taylor Employee");
  await user.type(screen.getByLabelText("Email address"), email);
  await user.type(screen.getByLabelText(/^Password/), password);
  await user.type(screen.getByLabelText("Confirm password"), password);
}

function renderRegistrationPage() {
  return render(<RegistrationPage />);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RegistrationPage", () => {
  it("renders required fields and disables submission until the form is valid", () => {
    renderRegistrationPage();

    expect(screen.getByLabelText("Full name")).toBeRequired();
    expect(screen.getByLabelText("Email address")).toBeRequired();
    expect(screen.getByLabelText(/^Password/)).toBeRequired();
    expect(screen.getByLabelText("Confirm password")).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Create Account" }),
    ).toBeDisabled();
  });

  it("rejects invalid email addresses and mismatched passwords", async () => {
    const user = userEvent.setup();
    renderRegistrationPage();

    await user.type(screen.getByLabelText("Full name"), "Taylor Employee");
    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.tab();
    expect(await screen.findByText("Enter a valid email address."))
      .toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: /^Email address/ }));
    await user.type(
      screen.getByRole("textbox", { name: /^Email address/ }),
      "taylor@example.com",
    );
    await user.type(screen.getByLabelText(/^Password/), password);
    await user.type(
      screen.getByLabelText("Confirm password"),
      "different-password",
    );
    expect(
      screen.getByRole("button", { name: "Create Account" }),
    ).toBeDisabled();
    await user.tab();
    expect(await screen.findByText("Passwords do not match."))
      .toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits only the backend fields and displays success", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      apiResponse({
        id: 12,
        full_name: "Taylor Employee",
        email: "taylor@example.com",
        role: "employee",
        created_at: "2026-11-22T20:00:00Z",
      }),
    );
    renderRegistrationPage();

    await fillValidForm(user, "TAYLOR@example.com");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByRole("heading", { name: "Account created" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/auth/register");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      full_name: "Taylor Employee",
      email: "taylor@example.com",
      password,
    });
    expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to dashboard" }),
    ).toBeInTheDocument();
  });

  it("shows a duplicate-email message and keeps non-password entries", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      apiResponse(
        { detail: "An account with this email already exists." },
        409,
      ),
    );
    renderRegistrationPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Taylor Employee");
    expect(
      screen.getByRole("textbox", { name: /^Email address/ }),
    ).toHaveValue(
      "taylor@example.com",
    );
  });

  it("shows a generic message for server errors", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      apiResponse({ detail: "private server details" }, 500),
    );
    renderRegistrationPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "The registration service is temporarily unavailable. Please try again.",
    );
    expect(screen.queryByText("private server details")).not.toBeInTheDocument();
  });

  it("reports network failures without clearing the form", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    renderRegistrationPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Could not reach the registration service. Check your connection and try again.",
    );
    expect(screen.getByLabelText("Full name")).toHaveValue("Taylor Employee");
  });

  it("disables submission while the registration request is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderRegistrationPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      screen.getByRole("button", { name: "Creating account…" }),
    ).toBeDisabled();

    resolveRequest(
      apiResponse({
        id: 13,
        full_name: "Taylor Employee",
        email: "taylor@example.com",
        role: "employee",
        created_at: "2026-11-22T20:00:00Z",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Account created" }),
    ).toBeInTheDocument();
  });
});
