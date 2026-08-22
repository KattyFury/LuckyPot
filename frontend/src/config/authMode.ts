// Chosen once, at module load — never changes during the app's lifetime, so
// components can safely pick which child (and therefore which hooks) to
// render based on it without violating the rules of hooks.
export const USE_PRIVY = Boolean(import.meta.env.VITE_PRIVY_APP_ID);
