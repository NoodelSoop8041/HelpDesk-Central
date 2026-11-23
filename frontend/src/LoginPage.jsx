import { useState } from "react";

import {
  ApiError,
  loginEmployee,
  storeAccessToken,
} from "./api.js";

const initialForm = { email: "", password: "" };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form) {
  const errors = {};
  const email = form.email.trim();
  const passwordLength = Array.from(form.password).length;

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Enter your password.";
  } else if (!form.password.trim()) {
    errors.password = "Password must not be blank.";
  } else if (passwordLength < 8 || passwordLength > 128) {
    errors.password = "Password must be between 8 and 128 characters.";
  }

  return errors;
}

function LoginPage({ onLoginSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validationErrors = validateForm(form);
  const canSubmit = Object.keys(validationErrors).length === 0;

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setSubmitError("");
  }

  function fieldError(field) {
    return touched[field] ? validationErrors[field] : "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setSubmitError("");

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const tokenResponse = await loginEmployee(form);
      try {
        storeAccessToken(
          tokenResponse.access_token,
          tokenResponse.expires_in,
        );
      } catch {
        setSubmitError(
          "This browser could not save your session. Check its storage settings and try again.",
        );
        return;
      }

      onLoginSuccess();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSubmitError("Invalid email or password.");
      } else if (error instanceof ApiError && error.status === 503) {
        setSubmitError(
          "The login service is not configured. Please contact your administrator.",
        );
      } else if (error instanceof ApiError && error.status >= 500) {
        setSubmitError(
          "The login service is temporarily unavailable. Please try again.",
        );
      } else if (error instanceof ApiError && error.status === 422) {
        setSubmitError("Check your email and password and try again.");
      } else if (
        error instanceof Error &&
        error.message.startsWith("Could not reach the API")
      ) {
        setSubmitError(
          "Could not reach the login service. Check your connection and try again.",
        );
      } else {
        setSubmitError("Unable to log in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="registration-page">
      <div className="registration-shell">
        <a
          className="brand registration-brand"
          href="/"
          aria-label="HelpDesk Central home"
        >
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">HelpDesk<span>Central</span></span>
        </a>

        <section className="registration-card" aria-labelledby="login-title">
          <div className="registration-heading">
            <p className="eyebrow">EMPLOYEE ACCESS</p>
            <h1 id="login-title">Log in to HelpDesk Central</h1>
            <p>Use your employee email and password to continue.</p>
          </div>

          {submitError && (
            <p className="registration-alert" role="alert">
              {submitError}
            </p>
          )}

          <form
            className="registration-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <label className="registration-field" htmlFor="login-email">
              Email address
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength="320"
                placeholder="you@company.com"
                required
                disabled={isSubmitting}
                value={form.email}
                aria-invalid={Boolean(fieldError("email"))}
                aria-describedby={
                  fieldError("email") ? "login-email-error" : undefined
                }
                onChange={(event) => updateField("email", event.target.value)}
                onBlur={() =>
                  setTouched((currentTouched) => ({
                    ...currentTouched,
                    email: true,
                  }))
                }
              />
              {fieldError("email") && (
                <span className="field-error" id="login-email-error">
                  {fieldError("email")}
                </span>
              )}
            </label>

            <div className="registration-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength="128"
                  required
                  disabled={isSubmitting}
                  value={form.password}
                  aria-invalid={Boolean(fieldError("password"))}
                  aria-describedby={
                    fieldError("password") ? "login-password-error" : undefined
                  }
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  onBlur={() =>
                    setTouched((currentTouched) => ({
                      ...currentTouched,
                      password: true,
                    }))
                  }
                />
                <button
                  className="password-visibility-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((isVisible) => !isVisible)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {fieldError("password") && (
                <span className="field-error" id="login-password-error">
                  {fieldError("password")}
                </span>
              )}
            </div>

            <button
              className="button-primary registration-submit"
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Log in"}
            </button>
          </form>

          <p className="registration-footer">
            Need an employee account? <a href="/register">Register</a>
            <br />
            <a href="/">Return to dashboard</a>
          </p>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
