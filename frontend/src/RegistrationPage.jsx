import { useState } from "react";

import { ApiError, registerEmployee } from "./api.js";

const initialForm = {
  full_name: "",
  email: "",
  password: "",
  confirm_password: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form) {
  const errors = {};

  if (!form.full_name.trim()) {
    errors.full_name = "Enter your full name.";
  } else if (form.full_name.trim().length > 200) {
    errors.full_name = "Full name must be 200 characters or fewer.";
  }

  const email = form.email.trim();
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const passwordLength = Array.from(form.password).length;
  if (!form.password) {
    errors.password = "Enter a password.";
  } else if (!form.password.trim()) {
    errors.password = "Password must not be blank.";
  } else if (passwordLength < 8 || passwordLength > 128) {
    errors.password = "Password must be between 8 and 128 characters.";
  }

  if (!form.confirm_password) {
    errors.confirm_password = "Confirm your password.";
  } else if (form.confirm_password !== form.password) {
    errors.confirm_password = "Passwords do not match.";
  }

  return errors;
}

function RegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [emailServerError, setEmailServerError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);
  const validationErrors = validateForm(form);
  const canSubmit = Object.keys(validationErrors).length === 0;

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setSubmitError("");
    if (field === "email") {
      setEmailServerError("");
    }
  }

  function fieldError(field) {
    if (field === "email" && emailServerError) {
      return emailServerError;
    }
    return touched[field] ? validationErrors[field] : "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({
      full_name: true,
      email: true,
      password: true,
      confirm_password: true,
    });
    setSubmitError("");
    setEmailServerError("");

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const account = await registerEmployee({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setForm((currentForm) => ({
        ...currentForm,
        password: "",
        confirm_password: "",
      }));
      setCreatedAccount(account);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setEmailServerError("An account with this email already exists.");
        setTouched((currentTouched) => ({ ...currentTouched, email: true }));
      } else if (
        error instanceof ApiError &&
        (error.status === 400 || error.status === 422)
      ) {
        setSubmitError(error.message);
      } else if (error instanceof ApiError && error.status >= 500) {
        setSubmitError(
          "The registration service is temporarily unavailable. Please try again.",
        );
      } else {
        setSubmitError(
          "Could not reach the registration service. Check your connection and try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="registration-page">
      <div className="registration-shell">
        <a className="brand registration-brand" href="/" aria-label="HelpDesk Central home">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">HelpDesk<span>Central</span></span>
        </a>

        <section className="registration-card" aria-labelledby="registration-title">
          {createdAccount ? (
            <div className="registration-success" role="status">
              <span className="registration-success-mark" aria-hidden="true">✓</span>
              <p className="eyebrow">REGISTRATION COMPLETE</p>
              <h1 id="registration-title">Account created</h1>
              <p>
                Employee account created for{" "}
                <strong>{createdAccount.full_name}</strong> (
                {createdAccount.email}).
              </p>
              <p className="registration-login-note">
                Your account has not been automatically signed in. Log in to
                start using HelpDesk Central.
              </p>
              <a className="button-primary registration-submit" href="/login">
                Log in
              </a>
            </div>
          ) : (
            <>
              <div className="registration-heading">
                <p className="eyebrow">EMPLOYEE ACCESS</p>
                <h1 id="registration-title">Create your account</h1>
                <p>
                  Register an employee account for HelpDesk Central.
                </p>
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
                <label className="registration-field" htmlFor="full-name">
                  Full name
                  <input
                    id="full-name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    maxLength="200"
                    placeholder="Your full name"
                    required
                    disabled={isSubmitting}
                    value={form.full_name}
                    aria-invalid={Boolean(fieldError("full_name"))}
                    aria-describedby={
                      fieldError("full_name") ? "full-name-error" : undefined
                    }
                    onChange={(event) =>
                      updateField("full_name", event.target.value)
                    }
                    onBlur={() =>
                      setTouched((currentTouched) => ({
                        ...currentTouched,
                        full_name: true,
                      }))
                    }
                  />
                  {fieldError("full_name") && (
                    <span className="field-error" id="full-name-error">
                      {fieldError("full_name")}
                    </span>
                  )}
                </label>

                <label className="registration-field" htmlFor="email">
                  Email address
                  <input
                    id="email"
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
                      fieldError("email") ? "email-error" : undefined
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
                    <span className="field-error" id="email-error">
                      {fieldError("email")}
                    </span>
                  )}
                </label>

                <label className="registration-field" htmlFor="password">
                  Password
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    maxLength="128"
                    placeholder="At least 8 characters"
                    required
                    disabled={isSubmitting}
                    value={form.password}
                    aria-invalid={Boolean(fieldError("password"))}
                    aria-describedby={
                      fieldError("password")
                        ? "password-error"
                        : "password-help"
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
                  {fieldError("password") ? (
                    <span className="field-error" id="password-error">
                      {fieldError("password")}
                    </span>
                  ) : (
                    <span className="field-help" id="password-help">
                      Use 8–128 characters.
                    </span>
                  )}
                </label>

                <label
                  className="registration-field"
                  htmlFor="confirm-password"
                >
                  Confirm password
                  <input
                    id="confirm-password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    maxLength="128"
                    placeholder="Enter your password again"
                    required
                    disabled={isSubmitting}
                    value={form.confirm_password}
                    aria-invalid={Boolean(fieldError("confirm_password"))}
                    aria-describedby={
                      fieldError("confirm_password")
                        ? "confirm-password-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateField("confirm_password", event.target.value)
                    }
                    onBlur={() =>
                      setTouched((currentTouched) => ({
                        ...currentTouched,
                        confirm_password: true,
                      }))
                    }
                  />
                  {fieldError("confirm_password") && (
                    <span
                      className="field-error"
                      id="confirm-password-error"
                    >
                      {fieldError("confirm_password")}
                    </span>
                  )}
                </label>

                <button
                  className="button-primary registration-submit"
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Creating account…" : "Create Account"}
                </button>
              </form>

              <p className="registration-footer">
                Already have an account? <a href="/login">Log in</a>
                <br />
                <a href="/">Return to dashboard</a>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default RegistrationPage;
