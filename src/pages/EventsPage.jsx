import { BellRing, CalendarDays, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function EventsPage() {
  return (
    <main className="container page-content">
      <section className="event-coming-soon">
        <div className="coming-soon-glow" />
        <span className="coming-soon-icon"><CalendarDays /></span>
        <span className="eyebrow"><Sparkles size={14} /> EVENT & BENEFIT</span>
        <h1>새로운 영화 이벤트를<br />준비하고 있어요</h1>
        <p>
          시사회, 무대인사, 영화관 할인 혜택을<br className="desktop-break" />
          한곳에서 확인할 수 있도록 준비 중입니다.
        </p>
        <span className="coming-soon-badge"><BellRing size={16} /> COMING SOON</span>
        <Link className="btn btn-primary" to="/movies">영화 먼저 둘러보기</Link>
      </section>
    </main>
  );
}
