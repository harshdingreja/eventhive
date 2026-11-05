import Icon from './Icon.jsx';

// Shown when a list has nothing in it. It always says what to do next.
export default function EmptyState({ icon = 'calendar', title, children, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__text">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
