import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { initials } from '../lib/format.js';
import { homeFor } from './RouteGuards.jsx';

const LINKS = {
  student: [
    { to: '/events', label: 'Events', icon: 'calendar' },
    { to: '/passes', label: 'My passes', icon: 'ticket' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
    { to: '/admin/checkin', label: 'Gate check-in', icon: 'camera' },
    { to: '/admin/events/new', label: 'New event', icon: 'plus' },
  ],
};

// Layout for every logged-in page: navbar on top, the current page below (<Outlet />).
export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="navbar">
        <div className="navbar__inner">
          <Link to={homeFor(user)} className="navbar__brand" aria-label="EventHive home">
            <Logo />
          </Link>

          <nav className="navbar__links" aria-label="Main">
            {LINKS[user.role].map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className="navbar__link">
                <Icon name={link.icon} />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="navbar__user">
            <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
            <span className="navbar__name">
              {user.name}
              <small>{user.role === 'admin' ? 'COG admin' : 'Student'}</small>
            </span>
            <button type="button" className="btn btn--ghost btn--icon" onClick={logout} title="Log out">
              <Icon name="logout" />
              <span className="sr-only">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="footer">
        <span>EventHive, the event pass system of the Council of Organizations</span>
        {/* A plain HTML page outside React (Experiment 1). */}
        <a href="/about.html">About COG and EventHive</a>
      </footer>
    </div>
  );
}
