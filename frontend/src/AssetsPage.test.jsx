import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AssetsPage from "./AssetsPage.jsx";

const fetchMock = vi.fn();

function apiResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

function renderAssetsPage() {
  return render(
    <AssetsPage isUserAuthenticated={false} onLogout={vi.fn()} />,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssetsPage", () => {
  it("loads an empty inventory and renders all asset columns", async () => {
    fetchMock.mockResolvedValue(apiResponse([]));
    renderAssetsPage();

    expect(
      await screen.findByText("No assets have been registered yet."),
    ).toBeInTheDocument();
    for (const column of [
      "Asset tag",
      "Name",
      "Category",
      "Manufacturer",
      "Model",
      "Serial number",
      "Status",
      "Assigned employee",
    ]) {
      expect(
        screen.getByRole("columnheader", { name: column }),
      ).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Asset tag")).toBeRequired();
    expect(screen.getByLabelText("Asset name")).toBeRequired();
  });

  it("registers an asset and refreshes the inventory", async () => {
    const user = userEvent.setup();
    const registeredAsset = {
      id: 21,
      asset_tag: "LAP-1001",
      name: "Staff laptop",
      category: "Laptop",
      manufacturer: "Lenovo",
      model: "ThinkPad T14",
      serial_number: "SN-1001",
      status: "Assigned",
      assigned_employee: "Riley Employee",
      created_at: "2026-11-22T20:00:00Z",
    };
    fetchMock.mockImplementation(async (_url, options = {}) => {
      if (options.method === "POST") {
        return apiResponse(registeredAsset, 201);
      }
      return apiResponse(fetchMock.mock.calls.some(([, request]) =>
        request?.method === "POST",
      ) ? [registeredAsset] : []);
    });
    renderAssetsPage();

    fireEvent.change(screen.getByLabelText("Asset tag"), {
      target: { value: "LAP-1001" },
    });
    fireEvent.change(screen.getByLabelText("Asset name"), {
      target: { value: "Staff laptop" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Laptop" },
    });
    fireEvent.change(screen.getByLabelText("Manufacturer"), {
      target: { value: "Lenovo" },
    });
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "ThinkPad T14" },
    });
    fireEvent.change(screen.getByLabelText("Serial number"), {
      target: { value: "SN-1001" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "Assigned" },
    });
    fireEvent.change(screen.getByLabelText("Assigned employee"), {
      target: { value: "Riley Employee" },
    });
    await user.click(screen.getByRole("button", { name: "Register asset" }));

    expect(
      await screen.findByText("Asset LAP-1001 registered successfully."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("cell", { name: "SN-1001" }),
    ).toBeInTheDocument();

    const createRequest = fetchMock.mock.calls.find(
      ([, options]) => options?.method === "POST",
    );
    expect(createRequest[0]).toBe("http://localhost:8000/api/assets");
    expect(JSON.parse(createRequest[1].body)).toEqual({
      asset_tag: "LAP-1001",
      name: "Staff laptop",
      category: "Laptop",
      manufacturer: "Lenovo",
      model: "ThinkPad T14",
      serial_number: "SN-1001",
      status: "Assigned",
      assigned_employee: "Riley Employee",
    });
    expect(screen.getByLabelText("Asset tag")).toHaveValue("");
  });

  it("reports duplicate asset tags and preserves the form entries", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (_url, options = {}) =>
      options.method === "POST"
        ? apiResponse(
            { detail: "An asset with this asset tag already exists." },
            409,
          )
        : apiResponse([]),
    );
    renderAssetsPage();

    await user.type(screen.getByLabelText("Asset tag"), "IT-1001");
    await user.type(screen.getByLabelText("Asset name"), "Laptop");
    await user.click(screen.getByRole("button", { name: "Register asset" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That asset tag is already registered. Use a unique tag.",
    );
    expect(screen.getByLabelText("Asset tag")).toHaveValue("IT-1001");
    expect(screen.getByLabelText("Asset name")).toHaveValue("Laptop");
  });

  it("prevents submission when a required value is blank", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(apiResponse([]));
    renderAssetsPage();

    const submitButton = screen.getByRole("button", { name: "Register asset" });
    expect(submitButton).toBeDisabled();
    await user.type(screen.getByLabelText("Asset tag"), "IT-1001");
    expect(submitButton).toBeDisabled();

    await user.tab();
    await user.tab();
    expect(await screen.findByText("Enter an asset name."))
      .toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) =>
      options?.method === "POST",
    )).toBe(false);
  });

  it("disables registration while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveCreate;
    fetchMock.mockImplementation(async (_url, options = {}) => {
      if (options.method === "POST") {
        return new Promise((resolve) => {
          resolveCreate = resolve;
        });
      }
      return apiResponse([]);
    });
    renderAssetsPage();

    await user.type(screen.getByLabelText("Asset tag"), "IT-1001");
    await user.type(screen.getByLabelText("Asset name"), "Laptop");
    await user.click(screen.getByRole("button", { name: "Register asset" }));

    expect(
      screen.getByRole("button", { name: "Registering asset…" }),
    ).toBeDisabled();
    resolveCreate(
      apiResponse({
        id: 22,
        asset_tag: "IT-1001",
        name: "Laptop",
        category: null,
        manufacturer: null,
        model: null,
        serial_number: null,
        status: "Available",
        assigned_employee: null,
        created_at: "2026-11-22T20:00:00Z",
      }, 201),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Registering asset…" }),
      ).not.toBeInTheDocument();
    });
  });
});
