const ticketStats = [
  { label: "Open tickets", value: "0", detail: "Waiting for support", tone: "blue" },
  { label: "In progress", value: "0", detail: "Being worked on", tone: "amber" },
  { label: "Resolved", value: "0", detail: "Completed this month", tone: "green" },
  { label: "Assets tracked", value: "0", detail: "In your inventory", tone: "purple" },
];

const ticketStatuses = [
  { label: "Open", value: 0, tone: "blue" },
  { label: "In progress", value: 0, tone: "amber" },
  { label: "Resolved", value: 0, tone: "green" },
];

function App() {
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
            <span className="nav-count">0</span>
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
              Ready for your first ticket
            </span>
          </section>

          <section className="stats-grid" aria-label="Help desk statistics">
            {ticketStats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <div className="stat-card-heading">
                  <span>{stat.label}</span>
                  <span className={`stat-icon ${stat.tone}`} aria-hidden="true" />
                </div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-detail">{stat.detail}</p>
              </article>
            ))}
          </section>

          <div className="dashboard-grid">
            <section className="panel ticket-panel" id="recent-tickets" aria-labelledby="recent-title">
              <div className="panel-heading">
                <div>
                  <h2 id="recent-title">Recent tickets</h2>
                  <p>Your latest support requests</p>
                </div>
                <span className="panel-count">0 total</span>
              </div>

              <div className="empty-state">
                <span className="empty-icon ticket-empty-icon" aria-hidden="true" />
                <h3>No tickets yet</h3>
                <p>New support requests will show up here.</p>
              </div>
            </section>

            <section className="panel status-panel" aria-labelledby="status-title">
              <div className="panel-heading">
                <div>
                  <h2 id="status-title">Ticket status</h2>
                  <p>Current workload</p>
                </div>
                <span className="period-label">All time</span>
              </div>

              <div className="status-total">
                <strong>0</strong>
                <span>Total tickets</span>
              </div>
              <div className="status-list">
                {ticketStatuses.map((status) => (
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

            <section className="panel asset-panel" id="asset-inventory" aria-labelledby="assets-title">
              <div className="panel-heading">
                <div>
                  <h2 id="assets-title">Asset inventory</h2>
                  <p>Keep track of your IT equipment</p>
                </div>
                <span className="asset-icon panel-asset-icon" aria-hidden="true" />
              </div>
              <div className="asset-empty">
                <span className="asset-count">0</span>
                <div>
                  <strong>No assets registered</strong>
                  <p>Your registered equipment will appear here.</p>
                </div>
              </div>
            </section>
          </div>

          <p className="data-footnote">
            Dashboard totals will update when ticket and asset data are connected.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
