/**
 * Line drawings in the same holographic language as the explainer: thin strokes,
 * currentColor, no fills. Decorative; each has aria-hidden.
 */

export function TruckGlyph({ equipment, className = "" }: { equipment: string; className?: string }) {
  const kind = equipment.toLowerCase();
  const flat = kind.includes("flat");
  const reefer = kind.includes("reefer");
  return (
    <svg aria-hidden viewBox="0 0 120 48" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
      {flat ? (
        <>
          <path d="M6 30h70" />
          <path d="M6 30v4h70v-4" />
          <circle cx="24" cy="24" r="5.5" />
          <circle cx="42" cy="24" r="5.5" />
          <circle cx="60" cy="24" r="5.5" />
        </>
      ) : (
        <>
          <rect x="6" y="8" width="70" height="26" rx="1.5" />
          <path d="M24 8v26M42 8v26M60 8v26" opacity="0.35" />
          {reefer && <rect x="70" y="11" width="8" height="12" rx="1" />}
        </>
      )}
      <path d="M80 34V16h18l10 10v8H80z" />
      <path d="M98 16v10h10" opacity="0.6" />
      <circle cx="20" cy="38" r="5" />
      <circle cx="34" cy="38" r="5" />
      <circle cx="88" cy="38" r="5" />
      <circle cx="104" cy="38" r="5" />
    </svg>
  );
}

export function RouteGlyph({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 40" fill="none" className={className}>
      <path d="M10 30 C 40 2, 80 2, 110 30" stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 4" className="route-dash" />
      <circle cx="10" cy="30" r="3.5" fill="currentColor" />
      <circle cx="110" cy="30" r="3.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function Check({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

export function Cross({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
