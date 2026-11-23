import { useCallback, useEffect, useState } from "react";

import { ApiError, createAsset, getAssets } from "./api.js";
import ProfileMenu from "./ProfileMenu.jsx";

const initialForm = {
  asset_tag: "",
  name: "",
  category: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  status: "Available",
  assigned_employee: "",
};

const assetStatuses = ["Available", "Assigned", "In Repair", "Retired"];

function validateForm(form) {
  const errors = {};
  if (!form.asset_tag.trim()) {
    errors.asset_tag = "Enter an asset tag.";
  }
  if (!form.name.trim()) {
    errors.name = "Enter an asset name.";
  }
  return errors;
}

function displayAssetValue(value) {
  return value || "—";
}

function AssetsPage({ isUserAuthenticated, onLogout }) {
  const [assets, setAssets] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validationErrors = validateForm(form);
  const canSubmit = Object.keys(validationErrors).length === 0;

  const refreshAssets = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setAssets(await getAssets());
      return true;
    } catch (error) {
      setAssets(null);
      setLoadError(error.message || "Unable to load the asset inventory.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFormError("");
    setFormNotice("");
  }

  function fieldError(field) {
    return touched[field] ? validationErrors[field] : "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({ asset_tag: true, name: true });
    setFormError("");
    setFormNotice("");

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...form,
      asset_tag: form.asset_tag.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      manufacturer: form.manufacturer.trim(),
      model: form.model.trim(),
      serial_number: form.serial_number.trim(),
      assigned_employee: form.assigned_employee.trim(),
    };

    try {
      const createdAsset = await createAsset(payload);
      setForm({ ...initialForm });
      setTouched({});
      const refreshed = await refreshAssets();
      setFormNotice(
        refreshed
          ? `Asset ${createdAsset.asset_tag} registered successfully.`
          : `Asset ${createdAsset.asset_tag} was registered, but the inventory could not be refreshed.`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError("That asset tag is already registered. Use a unique tag.");
        setTouched((currentTouched) => ({
          ...currentTouched,
          asset_tag: true,
        }));
      } else if (error instanceof ApiError && error.status === 422) {
        setFormError(error.message);
      } else if (error instanceof ApiError && error.status >= 500) {
        setFormError(
          "The asset service is temporarily unavailable. Please try again.",
        );
      } else {
        setFormError(
          error.message || "Unable to register this asset. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="HelpDesk Central home">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">HelpDesk<span>Central</span></span>
        </a>

        <p className="nav-heading">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          <a className="nav-link" href="/">
            <span className="nav-icon dashboard-icon" aria-hidden="true" />
            Dashboard
          </a>
          <a
            className="nav-link active"
            href="/assets"
            aria-current="page"
          >
            <span className="nav-icon asset-icon" aria-hidden="true" />
            Assets
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" aria-hidden="true" />
          <span>Workspace ready</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <p>IT Service Desk <span>/</span> Assets</p>
          <ProfileMenu
            isUserAuthenticated={isUserAuthenticated}
            onLogout={onLogout}
          />
        </header>

        <div className="dashboard-content">
          <section className="page-heading" aria-labelledby="assets-page-title">
            <div>
              <p className="eyebrow">INVENTORY</p>
              <h1 id="assets-page-title">Asset inventory</h1>
              <p className="page-description">
                View and register the equipment used by your team.
              </p>
            </div>
            <span className="data-notice">
              <span className="status-dot" aria-hidden="true" />
              {isLoading
                ? "Loading assets"
                : loadError
                  ? "Asset data unavailable"
                  : `${assets.length} assets registered`}
            </span>
          </section>

          {loadError && (
            <div className="data-state error-state panel" role="alert">
              <div>
                <h2>Asset inventory could not be loaded</h2>
                <p>{loadError}</p>
              </div>
              <button
                className="button-secondary"
                type="button"
                onClick={refreshAssets}
              >
                Retry
              </button>
            </div>
          )}

          <section className="panel inventory-panel" aria-labelledby="assets-table-title">
            <div className="panel-heading">
              <div>
                <h2 id="assets-table-title">Registered assets</h2>
                <p>Assets are listed by asset tag.</p>
              </div>
              {assets && <span className="asset-count">{assets.length}</span>}
            </div>

            {isLoading && (
              <div className="data-state" role="status" aria-live="polite">
                <span className="loading-spinner" aria-hidden="true" />
                Loading assets…
              </div>
            )}

            {!isLoading && !loadError && assets && (
              <div className="asset-table-scroll">
                <table className="asset-table">
                  <caption>Registered IT assets</caption>
                  <thead>
                    <tr>
                      <th scope="col">Asset tag</th>
                      <th scope="col">Name</th>
                      <th scope="col">Category</th>
                      <th scope="col">Manufacturer</th>
                      <th scope="col">Model</th>
                      <th scope="col">Serial number</th>
                      <th scope="col">Status</th>
                      <th scope="col">Assigned employee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <div className="asset-table-empty" role="status">
                            No assets have been registered yet.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      assets.map((asset) => (
                        <tr key={asset.id}>
                          <td className="asset-tag-cell">{asset.asset_tag}</td>
                          <td>{asset.name}</td>
                          <td>{displayAssetValue(asset.category)}</td>
                          <td>{displayAssetValue(asset.manufacturer)}</td>
                          <td>{displayAssetValue(asset.model)}</td>
                          <td>{displayAssetValue(asset.serial_number)}</td>
                          <td>
                            <span className="asset-status">{asset.status}</span>
                          </td>
                          <td>
                            {displayAssetValue(asset.assigned_employee)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="panel asset-registration-panel"
            aria-labelledby="register-asset-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="register-asset-title">Register an asset</h2>
                <p>Asset tag and name are required.</p>
              </div>
            </div>

            {formError && (
              <p className="inline-message error-message" role="alert">
                {formError}
              </p>
            )}
            {formNotice && (
              <p className="inline-message success-message" role="status">
                {formNotice}
              </p>
            )}

            <form
              className="asset-form"
              noValidate
              onSubmit={handleSubmit}
            >
              <label className="asset-form-field" htmlFor="asset-tag">
                Asset tag
                <input
                  id="asset-tag"
                  name="asset_tag"
                  type="text"
                  maxLength="100"
                  placeholder="e.g. IT-1001"
                  required
                  disabled={isSubmitting}
                  value={form.asset_tag}
                  aria-invalid={Boolean(fieldError("asset_tag"))}
                  aria-describedby={
                    fieldError("asset_tag") ? "asset-tag-error" : undefined
                  }
                  onChange={(event) =>
                    updateField("asset_tag", event.target.value)
                  }
                  onBlur={() =>
                    setTouched((currentTouched) => ({
                      ...currentTouched,
                      asset_tag: true,
                    }))
                  }
                />
                {fieldError("asset_tag") && (
                  <span className="field-error" id="asset-tag-error">
                    {fieldError("asset_tag")}
                  </span>
                )}
              </label>

              <label className="asset-form-field" htmlFor="asset-name">
                Asset name
                <input
                  id="asset-name"
                  name="name"
                  type="text"
                  maxLength="200"
                  placeholder="e.g. Staff laptop"
                  required
                  disabled={isSubmitting}
                  value={form.name}
                  aria-invalid={Boolean(fieldError("name"))}
                  aria-describedby={
                    fieldError("name") ? "asset-name-error" : undefined
                  }
                  onChange={(event) => updateField("name", event.target.value)}
                  onBlur={() =>
                    setTouched((currentTouched) => ({
                      ...currentTouched,
                      name: true,
                    }))
                  }
                />
                {fieldError("name") && (
                  <span className="field-error" id="asset-name-error">
                    {fieldError("name")}
                  </span>
                )}
              </label>

              <label className="asset-form-field" htmlFor="asset-category">
                Category
                <input
                  id="asset-category"
                  name="category"
                  type="text"
                  maxLength="100"
                  placeholder="e.g. Laptop"
                  disabled={isSubmitting}
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                />
              </label>

              <label className="asset-form-field" htmlFor="asset-manufacturer">
                Manufacturer
                <input
                  id="asset-manufacturer"
                  name="manufacturer"
                  type="text"
                  maxLength="200"
                  placeholder="e.g. Lenovo"
                  disabled={isSubmitting}
                  value={form.manufacturer}
                  onChange={(event) =>
                    updateField("manufacturer", event.target.value)
                  }
                />
              </label>

              <label className="asset-form-field" htmlFor="asset-model">
                Model
                <input
                  id="asset-model"
                  name="model"
                  type="text"
                  maxLength="200"
                  placeholder="e.g. ThinkPad T14"
                  disabled={isSubmitting}
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                />
              </label>

              <label className="asset-form-field" htmlFor="asset-serial-number">
                Serial number
                <input
                  id="asset-serial-number"
                  name="serial_number"
                  type="text"
                  maxLength="200"
                  placeholder="Optional"
                  disabled={isSubmitting}
                  value={form.serial_number}
                  onChange={(event) =>
                    updateField("serial_number", event.target.value)
                  }
                />
              </label>

              <label className="asset-form-field" htmlFor="asset-status">
                Status
                <select
                  id="asset-status"
                  name="status"
                  disabled={isSubmitting}
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  {assetStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="asset-form-field" htmlFor="asset-assignee">
                Assigned employee
                <input
                  id="asset-assignee"
                  name="assigned_employee"
                  type="text"
                  maxLength="200"
                  placeholder="Optional"
                  disabled={isSubmitting}
                  value={form.assigned_employee}
                  onChange={(event) =>
                    updateField("assigned_employee", event.target.value)
                  }
                />
              </label>

              <div className="asset-form-actions">
                <button
                  className="button-primary"
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Registering asset…" : "Register asset"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AssetsPage;
