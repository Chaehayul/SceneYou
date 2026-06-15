import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, CheckCircle2, Radio, RefreshCw } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, SectionHeading } from "../components/UI";
import { eventDDay, fetchEvents } from "../lib/events";

const categories = [
  ["all", "전체"],
  ["preview", "시사회 · 무대인사"],
  ["discount", "할인"],
  ["benefit", "혜택"],
  ["membership", "멤버십"],
];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchEvents();
      setEvents(result.events);
      setSource(result.source);
      setUpdatedAt(result.updatedAt);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => category === "all" ? events : events.filter((event) => event.category === category), [category, events]);
  const featured = events.filter((event) => event.featured).slice(0, 2);

  return (
    <main className="container page-content">
      <SectionHeading
        eyebrow="EVENT & BENEFIT"
        title="영화를 더 즐겁게"
        description="진행 중인 시사회와 할인 혜택을 한곳에서 확인하세요."
        action={<button className="btn btn-ghost" onClick={load} type="button"><RefreshCw size={16} /> 새로고침</button>}
      />

      <div className="live-status">
        <span className="live-dot"><Radio size={15} /></span>
        <div><strong>진행 중인 이벤트만 표시 중</strong><p>{source === "remote" ? "외부 이벤트 API와 연결되었습니다." : "제출용 이벤트 데이터로 표시 중입니다."}</p></div>
        {updatedAt && <time>업데이트 {new Date(updatedAt).toLocaleDateString("ko-KR")}</time>}
      </div>

      {loading ? <LoadingState label="진행 중인 이벤트를 확인하는 중" /> : error ? <ErrorState message={error} retry={load} /> : (
        <>
          {featured.length > 0 && (
            <section className="featured-events">
              {featured.map((event) => (
                <a className="featured-event" href={event.url} key={event.id} rel="noreferrer" target="_blank">
                  <img src={event.image} alt="" />
                  <div className="event-overlay" />
                  <div className="featured-copy"><span>{event.brand} · {eventDDay(event.endDate)}</span><h2>{event.title}</h2><p>{event.summary}</p><b>이벤트 보기 <ArrowUpRight size={16} /></b></div>
                </a>
              ))}
            </section>
          )}

          <div className="category-tabs" role="tablist" aria-label="이벤트 카테고리">
            {categories.map(([value, label]) => <button className={category === value ? "active" : ""} key={value} onClick={() => setCategory(value)} type="button">{label}</button>)}
          </div>

          {filtered.length ? (
            <section className="event-grid">
              {filtered.map((event) => (
                <a className="event-card" href={event.url} key={event.id} rel="noreferrer" target="_blank">
                  <div className="event-image"><img src={event.image} alt="" /><span className="d-day">{eventDDay(event.endDate)}</span></div>
                  <div className="event-copy"><span className="event-brand">{event.brand}</span><h3>{event.title}</h3><p>{event.summary}</p><div className="event-period"><CalendarDays size={15} /> {event.startDate} ~ {event.endDate}</div></div>
                  <span className="event-arrow"><ArrowUpRight /></span>
                </a>
              ))}
            </section>
          ) : <EmptyState title="해당 카테고리의 이벤트가 없어요" description="다른 카테고리를 선택해보세요." />}

          <section className="event-guide">
            <CheckCircle2 />
            <div><strong>실제 이벤트 연동 준비가 되어 있어요</strong><p><code>VITE_EVENTS_API_URL</code>에 Google Apps Script 주소를 넣으면 배포 후에도 시트에서 이벤트를 관리할 수 있습니다.</p></div>
          </section>
        </>
      )}
    </main>
  );
}
