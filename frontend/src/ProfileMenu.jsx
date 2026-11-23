function ProfileMenu({ isUserAuthenticated, onLogout }) {
  return (
    <div className="profile" aria-label="Help desk workspace">
      {!isUserAuthenticated && (
        <a className="register-nav-link" href="/login">
          Log in
        </a>
      )}
      <a className="register-nav-link" href="/register">
        Register
      </a>
      {isUserAuthenticated ? (
        <details className="profile-dropdown">
          <summary className="profile-trigger" aria-label="Profile menu">
            <span className="profile-avatar" aria-hidden="true">HD</span>
            <span className="profile-label">Help Desk</span>
            <span className="profile-chevron" aria-hidden="true" />
          </summary>
          <div className="profile-menu">
            <button type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        </details>
      ) : (
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">HD</span>
          <span className="profile-label">Help Desk</span>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
