const COLLECTION_KEY = "sceneyou_collection";
const RECENT_KEY = "sceneyou_recent";
const USER_KEY = "sceneyou_user";
const LEGACY_COLLECTION_KEY = "myCollection";
const LEGACY_USER_KEY = "loggedInUser";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getCollection() {
  const current = read(COLLECTION_KEY, null);
  if (current) return current;
  const legacy = read(LEGACY_COLLECTION_KEY, []);
  if (legacy.length) localStorage.setItem(COLLECTION_KEY, JSON.stringify(legacy));
  return legacy;
}

export function toggleCollection(movie) {
  const collection = getCollection();
  const exists = collection.some((item) => Number(item.id) === Number(movie.id));
  const next = exists
    ? collection.filter((item) => Number(item.id) !== Number(movie.id))
    : [{ ...movie, savedAt: Date.now() }, ...collection];
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sceneyou:collection"));
  return !exists;
}

export function isCollected(id) {
  return getCollection().some((item) => Number(item.id) === Number(id));
}

export function clearCollection() {
  localStorage.removeItem(COLLECTION_KEY);
  localStorage.removeItem(LEGACY_COLLECTION_KEY);
  window.dispatchEvent(new CustomEvent("sceneyou:collection"));
}

export function getRecentlyViewed() {
  return read(RECENT_KEY, []);
}

export function saveRecentlyViewed(movie) {
  const next = [movie, ...getRecentlyViewed().filter((item) => item.id !== movie.id)].slice(0, 10);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function getUser() {
  return localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY) || "";
}

export function signIn(id, password) {
  const stored = localStorage.getItem(`sceneyou_account_${id}`) ?? localStorage.getItem(id);
  if (stored === null) return { ok: false, message: "등록되지 않은 아이디입니다." };
  if (stored !== password) return { ok: false, message: "비밀번호가 일치하지 않습니다." };
  localStorage.setItem(USER_KEY, id);
  return { ok: true };
}

export function signUp(id, password) {
  if (localStorage.getItem(`sceneyou_account_${id}`) !== null || localStorage.getItem(id) !== null) {
    return { ok: false, message: "이미 사용 중인 아이디입니다." };
  }
  localStorage.setItem(`sceneyou_account_${id}`, password);
  return { ok: true };
}

export function signOut() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function getReviews(movieId) {
  return read(`sceneyou_reviews_${movieId}`, []);
}

export function saveReviews(movieId, reviews) {
  localStorage.setItem(`sceneyou_reviews_${movieId}`, JSON.stringify(reviews));
}
