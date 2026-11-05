import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import Alert from '../components/Alert.jsx';
import { homeFor } from '../components/RouteGuards.jsx';
import { hasErrors, validateLogin } from '../lib/validators.js';

// Demo accounts created by `npm run seed`. Only shown while developing (npm run dev),
// never in a production build.
const DEMO_ACCOUNTS = [
  { label: 'Student demo', email: 'harsh@eventhive.test', password: 'Student@123' },
  { label: 'Admin demo', email: 'admin@eventhive.test', password: 'Admin@123' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      const { [name]: _fixed, ...rest } = errors; // the field changed, so drop its old error
      setErrors(rest);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser's default full-page form submission
    const found = validateLogin(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    setServerError('');
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(location.state?.from || homeFor(user), { replace: true });
    } catch (err) {
      setServerError(err.message);
      if (err.details) setErrors(err.details);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Use the email you registered with."
      footer={
        <>
          New to EventHive? <Link to="/signup">Create a student account</Link>
        </>
      }
    >
      {serverError && <Alert tone="error">{serverError}</Alert>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field label="Email" error={errors.email} required>
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} placeholder="you@college.edu" />
        </Field>
        <Field label="Password" error={errors.password} required>
          <input name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} />
        </Field>
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <div className="demo-accounts">
          <span>Fill in a demo account:</span>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              className="link-button"
              onClick={() => {
                setForm({ email: account.email, password: account.password });
                setErrors({});
              }}
            >
              {account.label}
            </button>
          ))}
        </div>
      )}
    </AuthLayout>
  );
}
