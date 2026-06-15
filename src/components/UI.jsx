import { AlertCircle, Clapperboard, LoaderCircle } from "lucide-react";

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function MovieGridSkeleton({ count = 10 }) {
  return (
    <div className="movie-grid" aria-label="영화 목록을 불러오는 중">
      {Array.from({ length: count }, (_, index) => <div className="skeleton" key={index} />)}
    </div>
  );
}

export function LoadingState({ label = "불러오는 중입니다" }) {
  return <div className="state-box"><LoaderCircle className="spin" /><strong>{label}</strong></div>;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="state-box">
      <span className="state-icon"><Clapperboard /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }) {
  return (
    <div className="state-box">
      <span className="state-icon error"><AlertCircle /></span>
      <strong>화면을 불러오지 못했어요</strong>
      <p>{message}</p>
      {retry && <button className="btn btn-primary" onClick={retry} type="button">다시 시도</button>}
    </div>
  );
}
