export function authHeaders(): HeadersInit {
  const token = window.localStorage.getItem("xcopilot_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
