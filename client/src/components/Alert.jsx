import Icon from './Icon.jsx';

const ICONS = { error: 'alert', success: 'check', info: 'info', warning: 'alert' };

// tone: 'error' | 'success' | 'info' | 'warning'
export default function Alert({ tone = 'info', title, children, onClose }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[tone]} size={20} className="alert__icon" />
      <div className="alert__body">
        {title && <p className="alert__title">{title}</p>}
        {children && <div className="alert__text">{children}</div>}
      </div>
      {onClose && (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Dismiss">
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
