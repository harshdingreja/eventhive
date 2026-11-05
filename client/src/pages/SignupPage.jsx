import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import Alert from '../components/Alert.jsx';
import { hasErrors, validateSignup } from '../lib/validators.js';

const EMPTY = { name: '', email: '', password: '', confirmPassword: '' };

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    const next = { ...form, [name]: value };
    setForm(next);
    // After a field has been visited once, re-check it on every keystroke.
    if (touched[name]) setErrors(validateSignup(next));
  }

  function handleBlur(e) {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validateSignup(form));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateSignup(form);
    setErrors(found);
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (hasErrors(found)) return;

    setSubmitting(true);
    setServerError('');
    try {
      await signup({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate('/events', { replace: true });
    } catch (err) {
      setServerError(err.message);
      if (err.details) setErrors(err.details);
    } finally {
      setSubmitting(false);
    }
  }

  const show = (name) => (touched[name] ? errors[name] : undefined);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Student accounts can register for any COG event."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      {serverError && <Alert tone="error">{serverError}</Alert>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field label="Full name" error={show('name')} required>
          <input name="name" autoComplete="name" value={form.name} onChange={handleChange} onBlur={handleBlur} />
        </Field>
        <Field label="College email" error={show('email')} required>
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} onBlur={handleBlur} placeholder="you@college.edu" />
        </Field>
        <Field label="Password" hint="At least 8 characters, with a letter and a number" error={show('password')} required>
          <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} onBlur={handleBlur} />
        </Field>
        <Field label="Confirm password" error={show('confirmPassword')} required>
          <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
        </Field>
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
