const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "sceneyou_auth_token";

export function hasApi() {
  return Boolean(API_URL);
}

function withParams(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

async function request(path, options = {}) {
  if (!API_URL) throw new Error("API URL is not configured.");
  const token = localStorage.getItem(TOKEN_KEY);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error("API 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "API 요청에 실패했습니다.");
  }
  if (response.status === 204) return null;
  return response.json();
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export const api = {
  health: () => request("/api/health"),
  signUp: (username, password) => request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  }),
  signIn: (username, password) => request("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  }),
  me: () => request("/api/auth/me"),
  getCollection: () => request("/api/collection"),
  saveCollection: (_user, movie) => request("/api/collection", {
    method: "POST",
    body: JSON.stringify({ movie }),
  }),
  deleteCollection: (_user, tmdbId) => request(`/api/collection/${tmdbId}`, {
    method: "DELETE",
  }),
  getReviews: (tmdbId) => request(`/api/reviews/${tmdbId}`),
  createReview: (tmdbId, payload) => request(`/api/reviews/${tmdbId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  getCommunityPosts: (params) => request(withParams("/api/community/posts", params)),
  createCommunityPost: (payload) => request("/api/community/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  likeCommunityPost: (postId) => request(`/api/community/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({}),
  }),
  createCommunityComment: (postId, payload) => request(`/api/community/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};
