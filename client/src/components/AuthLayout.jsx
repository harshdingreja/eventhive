import Logo from './Logo.jsx';

// Shared frame for the login and signup screens.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <Logo size={34} />
        <div className="auth__pitch">
          <p className="auth__headline">Every COG event. One pass in your pocket.</p>
          <p className="auth__lead">
            Register for hackathons, fests and workshops in a click, then walk in with a QR code instead of a queue at
            the registration desk.
          </p>
        </div>
        <a href="/about.html" className="auth__about">
          About COG and EventHive
        </a>
      </aside>

      <section className="auth__panel">
        <div className="auth__card">
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
          {footer && <p className="auth__footer">{footer}</p>}
        </div>
      </section>
    </div>
  );
}
