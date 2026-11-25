/**
 * A private page opened by a visitor who has not entered the site under construction (server/access.ts): a client with his
 * link (/vip/<token>) or a private 3D link (/view/<token>). The server marks the page (<meta name="bj-private">): the app
 * then shows that page alone, without the menu and the pages of the site (src/App.tsx).
 */
export const PRIVATE_ONLY: boolean = typeof document !== "undefined" && document.querySelector('meta[name="bj-private"]') !== null;
