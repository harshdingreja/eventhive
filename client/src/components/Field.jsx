import { cloneElement, useId } from 'react';

// Wraps one form control with its label, hint and error message, and wires up the
// accessibility attributes so screen readers announce the error with the field.
//   <Field label="Email" error={errors.email} required><input name="email" ... /></Field>
export default function Field({ label, hint, error, required, children }) {
  const id = useId();
  const messageId = `${id}-message`;

  const control = cloneElement(children, {
    id,
    required,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error || hint ? messageId : undefined,
  });

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id} className={`field__label${required ? ' field__label--required' : ''}`}>
        {label}
      </label>
      {control}
      {(error || hint) && (
        <p id={messageId} className={error ? 'field__error' : 'field__hint'}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
