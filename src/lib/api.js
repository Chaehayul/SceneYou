const API_URL = import.meta.env.VITE_API_URL || "";

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
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "API 요청에 실패했습니다.");
  }
  if (response.status === 204) return null;
  return response.json();
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
  getCollection: (user) => request(`/api/collection?user=${encodeURIComponent(user || "guest")}`),
  saveCollection: (user, movie) => request("/api/collection", {
    method: "POST",
    body: JSON.stringify({ user, movie }),
  }),
  deleteCollection: (user, tmdbId) => request(`/api/collection/${tmdbId}?user=${encodeURIComponent(user || "guest")}`, {
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
  likeCommunityPost: (postId, user) => request(`/api/community/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({ user }),
  }),
  createCommunityComment: (postId, payload) => request(`/api/community/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};
