// The EventHive mark: a honeycomb cell (amber outline) holding a purple cell.
export function LogoMark({ size = 28 }) {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <path
        d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25z"
        fill="none"
        stroke="var(--amber)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M16 9.5 21.6 12.75v6.5L16 22.5l-5.6-3.25v-6.5z" fill="var(--purple)" />
    </svg>
  );
}

export default function Logo({ size = 28 }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">EventHive</span>
    </span>
  );
}
