/**
 * Pulls the JWT from localStorage (where AuthContext stores it after Discord login)
 * and returns it as an Authorization header.
 *
 * The backend `authenticate` middleware checks both `Authorization: Bearer <token>`
 * and the `auth_token` cookie. We use the Bearer header because the SPA stores the
 * token in localStorage, not in a cookie.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem('auth_token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
