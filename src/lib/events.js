import { fallbackEvents } from "../data/events";

function normalizeEvent(item, index) {
  return {
    id: String(item.id || `event-${index}`),
    title: String(item.title || "제목 없는 이벤트"),
    summary: String(item.summary || ""),
    brand: String(item.brand || "SCENEYOU").toUpperCase(),
    category: String(item.category || "etc"),
    image: String(item.image || "/event-images/discount.jpg"),
    startDate: String(item.startDate || ""),
    endDate: String(item.endDate || ""),
    url: String(item.url || "#"),
    featured: item.featured === true || String(item.featured).toLowerCase() === "true",
  };
}

function isActive(event, today = new Date()) {
  const start = event.startDate ? new Date(`${event.startDate}T00:00:00`) : null;
  const end = event.endDate ? new Date(`${event.endDate}T23:59:59`) : null;
  return (!start || today >= start) && (!end || today <= end);
}

export async function fetchEvents(signal) {
  const endpoint = import.meta.env.VITE_EVENTS_API_URL || "/events.json";
  try {
    const response = await fetch(endpoint, { signal });
    if (!response.ok) throw new Error("이벤트 API 응답 오류");
    const payload = await response.json();
    const source = Array.isArray(payload) ? payload : payload.events;
    if (!Array.isArray(source)) throw new Error("이벤트 데이터 형식 오류");
    return {
      events: source.map(normalizeEvent).filter((event) => isActive(event)),
      source: endpoint === "/events.json" ? "local" : "remote",
      updatedAt: payload.updatedAt || null,
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return {
      events: fallbackEvents.map(normalizeEvent).filter((event) => isActive(event)),
      source: "fallback",
      updatedAt: null,
    };
  }
}

export function eventDDay(endDate) {
  if (!endDate) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.ceil((end - today) / 86400000);
  if (days < 0) return "종료";
  if (days === 0) return "D-DAY";
  return `D-${days}`;
}
