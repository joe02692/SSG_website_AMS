/** Icons for the contact links. Decorative: always aria-hidden. */
export function PhoneIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
    </svg>
  );
}

export function InstagramIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.3 4.3c-2.3 0-3.8 1.4-3.8 3.97v2.23H8v3h2.5V21z" />
    </svg>
  );
}

export function LinkedInIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zM9.5 9.75h3.8v1.5h.06c.53-1 1.83-1.75 3.44-1.75 3.68 0 4.2 2.2 4.2 5.06v6.19h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.12 1.43-2.12 2.9v5.6h-4z" />
    </svg>
  );
}

/** SoundCloud's cloud with the waveform bars in front of it. */
export function SoundCloudIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11 8.2a6 6 0 0 1 11 3.3 3.3 3.3 0 0 1-.4 6.5H11z" />
      <rect x="8.6" y="9.5" width="1.3" height="8.5" rx=".65" />
      <rect x="6.2" y="10.8" width="1.3" height="7.2" rx=".65" />
      <rect x="3.8" y="11.8" width="1.3" height="6.2" rx=".65" />
      <rect x="1.4" y="13.4" width="1.3" height="4.6" rx=".65" />
    </svg>
  );
}
