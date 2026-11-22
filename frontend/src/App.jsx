import { useCallback, useEffect, useState } from "react";

import {
  createTicket,
  getDashboardData,
  updateTicketStatus,
} from "./api.js";

const initialForm = {
  title: "",
  description: "",
  requester: "",
  priority: "Medium",
};

const statuses = ["Open", "In Progress", "Resolved"];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function App() {
  const [tickets, setTickets] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [ticketForm, setTicketForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [updatingTicketId, setUpdatingTicketId] = useState(null);

  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const dashboard = await getDashboardData();
      setTickets(dashboard.tickets);
      setStats(dashboard.stats);
      return true;
    } catch (error) {
      setTickets(null);
      setStats(null);
      setLoadError(error.message || "Unable to load dashboard data.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  async function handleCreateTicket(event) {
    event.preventDefault();
    setFormError("");
    setFormNotice("");

    const payload = {
      ...ticketForm,
      title: ticketForm.title.trim(),
      description: ticketForm.description.trim(),
      requester: ticketForm.requester.trim(),
    };

    if (!payload.title || !payload.description || !payload.requester) {
      setFormError("Title, description, and requester must not be blank.");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdTicket = await createTicket(payload);
      setTicketForm({ ...initialForm });
      const refreshed = await refreshDashboard();
      setFormNotice(
        refreshed
          ? `Ticket #${createdTicket.id} created successfully.`
          : `Ticket #${createdTicket.id} was created, but the dashboard could not refresh. Retry to load the latest data.`,
      );
    } catch (error) {
      setFormError(error.message || "Unable to create the ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(ticketId, nextStatus) {
    setActionError("");
    setActionNotice("");
    setUpdatingTicketId(ticketId);

    try {
      await updateTicketStatus(ticketId, nextStatus);
      const refreshed = await refreshDashboard();
      setActionNotice(
        refreshed
          ? `Ticket #${ticketId} status updated to ${nextStatus}.`
          : `Ticket #${ticketId} was updated, but the dashboard could not refresh. Retry to load the latest data.`,
      );
    } catch (error) {
      setActionError(error.message || "Unable to update ticket status.");
    } finally {
      setUpdatingTicketId(null);
    }
  }

  const dashboardReady = !isLoading && !loadError && tickets !== null && stats;
  const navTicketCount = stats ? stats.total_tickets : isLoading ? "…" : "—";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="HelpDesk Central home">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">HelpDesk<span>Central</span></span>
        </a>

        <p className="nav-heading">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#dashboard" aria-current="page">
            <span className="nav-icon dashboard-icon" aria-hidden="true" />
            Dashboard
          </a>
          <a className="nav-link" href="#recent-tickets">
            <span className="nav-icon ticket-icon" aria-hidden="true" />
            Tickets
            <span className="nav-count">{navTicketCount}</span>
          </a>
          <a className="nav-link" href="#asset-inventory">
            <span className="nav-icon asset-icon" aria-hidden="true" />
            Assets
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" aria-hidden="true" />
          <span>Workspace ready</span>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <p>IT Service Desk <span>/</span> Dashboard</p>
          <div className="profile" aria-label="Help desk workspace">
            <span className="profile-avatar" aria-hidden="true">HD</span>
            <span>Help Desk</span>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="page-heading" aria-labelledby="page-title">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1 id="page-title">Dashboard</h1>
              <p className="page-description">
                A quick look at your support desk and IT inventory.
              </p>
            </div>
            <span className="data-notice">
              <span className="status-dot" aria-hidden="true" />
              {isLoading
                ? "Loading ticket data"
                : loadError
                  ? "Ticket data unavailable"
                  : `${stats.total_tickets} tickets tracked`}
            </span>
            <a className="button-primary heading-button" href="#create-ticket">
              New ticket
            </a>
          </section>

          {actionError && (
            <p className="inline-message error-message" role="alert">
              {actionError}
            </p>
          )}
          {actionNotice && (
            <p className="inline-message success-message" role="status">
              {actionNotice}
            </p>
          )}

          {isLoading && (
            <div className="data-state panel" role="status" aria-live="polite">
              <span className="loading-spinner" aria-hidden="true" />
              Loading dashboard data…
            </div>
          )}

          {loadError && (
            <div className="data-state error-state panel" role="alert">
              <div>
                <h2>Dashboard data could not be loaded</h2>
                <p>{loadError}</p>
              </div>
              <button
                className="button-secondary"
                type="button"
                onClick={refreshDashboard}
              >
                Retry
              </button>
            </div>
          )}

          {dashboardReady && (
            <>
              <section className="stats-grid" aria-label="Ticket statistics">
                {[
                  {
                    label: "Total tickets",
                    value: stats.total_tickets,
                    detail: "All support requests",
                    tone: "purple",
                  },
                  {
                    label: "Open tickets",
                    value: stats.open_tickets,
                    detail: "Waiting for support",
                    tone: "blue",
                  },
                  {
                    label: "In progress",
                    value: stats.in_progress_tickets,
                    detail: "Being worked on",
                    tone: "amber",
                  },
                  {
                    label: "Resolved",
                    value: stats.resolved_tickets,
                    detail: "Completed tickets",
                    tone: "green",
                  },
                ].map((stat) => (
                  <article className="stat-card" key={stat.label}>
                    <div className="stat-card-heading">
                      <span>{stat.label}</span>
                      <span
                        className={`stat-icon ${stat.tone}`}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="stat-value">{stat.value}</p>
                    <p className="stat-detail">{stat.detail}</p>
                  </article>
                ))}
              </section>

              <div className="dashboard-grid">
                <section
                  className="panel ticket-panel"
                  id="recent-tickets"
                  aria-labelledby="recent-title"
                >
                  <div className="panel-heading">
                    <div>
                      <h2 id="recent-title">Recent tickets</h2>
                      <p>Your latest support requests</p>
                    </div>
                    <span className="panel-count">{stats.total_tickets} total</span>
                  </div>

                  {tickets.length === 0 ? (
                    <div className="empty-state">
                      <span
                        className="empty-icon ticket-empty-icon"
                        aria-hidden="true"
                      />
                      <h3>No tickets yet</h3>
                      <p>Create a ticket to see it in this list.</p>
                    </div>
                  ) : (
                    <div className="ticket-table-scroll">
                      <table className="ticket-table">
                        <caption className="visually-hidden">
                          Recent support tickets and their current status
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Ticket</th>
                            <th scope="col">Requester</th>
                            <th scope="col">Priority</th>
                            <th scope="col">Created</th>
                            <th scope="col">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.slice(0, 5).map((ticket) => (
                            <tr key={ticket.id}>
                              <td className="ticket-title-cell">
                                <strong>#{ticket.id} · {ticket.title}</strong>
                                <span>{ticket.description}</span>
                              </td>
                              <td>{ticket.requester}</td>
                              <td>
                                <span
                                  className={`priority-badge priority-${statusClass(ticket.priority)}`}
                                >
                                  {ticket.priority}
                                </span>
                              </td>
                              <td className="date-cell">
                                {formatDate(ticket.created_at)}
                              </td>
                              <td>
                                <label
                                  className="visually-hidden"
                                  htmlFor={`ticket-status-${ticket.id}`}
                                >
                                  Status for ticket {ticket.id}: {ticket.title}
                                </label>
                                <select
                                  id={`ticket-status-${ticket.id}`}
                                  className={`status-select status-${statusClass(ticket.status)}`}
                                  value={ticket.status}
                                  disabled={updatingTicketId !== null}
                                  onChange={(event) =>
                                    handleStatusChange(
                                      ticket.id,
                                      event.target.value,
                                    )
                                  }
                                >
                                  {statuses.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section
                  className="panel status-panel"
                  aria-labelledby="status-title"
                >
                  <div className="panel-heading">
                    <div>
                      <h2 id="status-title">Ticket status</h2>
                      <p>Current workload</p>
                    </div>
                    <span className="period-label">All time</span>
                  </div>

                  <div className="status-total">
                    <strong>{stats.total_tickets}</strong>
                    <span>Total tickets</span>
                  </div>
                  <div className="status-list">
                    {[
                      {
                        label: "Open",
                        value: stats.open_tickets,
                        tone: "blue",
                      },
                      {
                        label: "In Progress",
                        value: stats.in_progress_tickets,
                        tone: "amber",
                      },
                      {
                        label: "Resolved",
                        value: stats.resolved_tickets,
                        tone: "green",
                      },
                    ].map((status) => (
                      <div className="status-row" key={status.label}>
                        <span className={`status-label ${status.tone}`}>
                          <span className="status-dot" aria-hidden="true" />
                          {status.label}
                        </span>
                        <strong>{status.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className="panel asset-panel"
                  id="asset-inventory"
                  aria-labelledby="assets-title"
                >
                  <div className="panel-heading">
                    <div>
                      <h2 id="assets-title">Asset inventory</h2>
                      <p>Keep track of your IT equipment</p>
                    </div>
                    <span className="asset-icon panel-asset-icon" aria-hidden="true" />
                  </div>
                  <div className="asset-empty">
                    <span className="asset-count asset-coming-soon">Soon</span>
                    <div>
                      <strong>Asset tracking coming soon</strong>
                      <p>Asset data is not part of this ticket API.</p>
                    </div>
                  </div>
                </section>
              </div>
              <p className="data-footnote">
                Ticket totals and requests are loaded from the HelpDesk API.
              </p>
            </>
          )}

          <section
            className="panel create-ticket-panel"
            id="create-ticket"
            aria-labelledby="create-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="create-title">Create a ticket</h2>
                <p>Describe the issue and who needs help.</p>
              </div>
            </div>

            {formError && (
              <p className="form-message error-message" role="alert">
                {formError}
              </p>
            )}
            {formNotice && (
              <p className="form-message success-message" role="status">
                {formNotice}
              </p>
            )}

            <form className="ticket-form" onSubmit={handleCreateTicket}>
              <label className="form-field" htmlFor="ticket-title">
                Title
                <input
                  id="ticket-title"
                  name="title"
                  type="text"
                  maxLength="200"
                  required
                  disabled={isSubmitting}
                  value={ticketForm.title}
                  onChange={(event) =>
                    setTicketForm({ ...ticketForm, title: event.target.value })
                  }
                />
              </label>
              <label className="form-field" htmlFor="ticket-requester">
                Requester
                <input
                  id="ticket-requester"
                  name="requester"
                  type="text"
                  maxLength="200"
                  required
                  disabled={isSubmitting}
                  value={ticketForm.requester}
                  onChange={(event) =>
                    setTicketForm({
                      ...ticketForm,
                      requester: event.target.value,
                    })
                  }
                />
              </label>
              <label className="form-field form-field-wide" htmlFor="ticket-description">
                Description
                <textarea
                  id="ticket-description"
                  name="description"
                  rows="3"
                  required
                  disabled={isSubmitting}
                  value={ticketForm.description}
                  onChange={(event) =>
                    setTicketForm({
                      ...ticketForm,
                      description: event.target.value,
                    })
                  }
                />
              </label>
              <label className="form-field" htmlFor="ticket-priority">
                Priority
                <select
                  id="ticket-priority"
                  name="priority"
                  disabled={isSubmitting}
                  value={ticketForm.priority}
                  onChange={(event) =>
                    setTicketForm({
                      ...ticketForm,
                      priority: event.target.value,
                    })
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
              <div className="form-actions">
                <button
                  className="button-primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting…" : "Submit ticket"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
