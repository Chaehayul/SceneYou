import { Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { imageUrl, movieScore, movieYear, normalizeMovie } from "../lib/tmdb";
import { isCollected, toggleCollection } from "../lib/storage";

export default function MovieCard({ movie, rank }) {
  const [saved, setSaved] = useState(() => isCollected(movie.id));

  function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    setSaved(toggleCollection(normalizeMovie(movie)));
  }

  return (
    <article className="movie-card">
      <Link to={`/movies/${movie.id}`} aria-label={`${movie.title} 상세 보기`}>
        <div className="poster-wrap">
          {movie.poster_path ? (
            <img src={imageUrl(movie.poster_path)} alt={`${movie.title} 포스터`} loading="lazy" />
          ) : (
            <div className="poster-placeholder"><span>SCENEYOU</span><b>{movie.title}</b></div>
          )}
          {rank && <span className="rank">{rank}</span>}
          <button
            className={`save-button ${saved ? "saved" : ""}`}
            type="button"
            aria-label={saved ? "컬렉션에서 삭제" : "컬렉션에 저장"}
            onClick={toggle}
          >
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
          </button>
          <div className="poster-gradient" />
        </div>
        <div className="movie-copy">
          <h3>{movie.title}</h3>
          <div className="movie-meta">
            <span>{movieYear(movie.release_date)}</span>
            <span className="score"><Star size={13} fill="currentColor" /> {movieScore(movie.vote_average)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
