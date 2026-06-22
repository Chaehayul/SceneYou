import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, Heart, Star, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { ErrorState, LoadingState, SectionHeading } from "../components/UI";
import { api, hasApi } from "../lib/api";
import { imageUrl, movieScore, movieYear, normalizeMovie, tmdb } from "../lib/tmdb";
import {
  getReviews,
  getUser,
  isCollected,
  saveRecentlyViewed,
  saveReviews,
  toggleCollection,
} from "../lib/storage";

export default function MovieDetailPage() {
  const { movieId } = useParams();
  const [movie, setMovie] = useState(null);
  const [providers, setProviders] = useState([]);
  const [director, setDirector] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [reviews, setReviews] = useState(() => getReviews(movieId));
  const [reviewSort, setReviewSort] = useState("newest");
  const [saved, setSaved] = useState(() => isCollected(movieId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      tmdb(`/movie/${movieId}`, {}, controller.signal),
      tmdb(`/movie/${movieId}/watch/providers`, {}, controller.signal),
      tmdb(`/movie/${movieId}/credits`, {}, controller.signal),
      tmdb(`/movie/${movieId}/recommendations`, {}, controller.signal),
    ])
      .then(([movieData, providerData, creditsData, recommendationData]) => {
        setMovie(movieData);
        const kr = providerData.results?.KR;
        const allProviders = [...(kr?.flatrate || []), ...(kr?.rent || [])];
        setProviders(allProviders.filter((item, index) => allProviders.findIndex((value) => value.provider_id === item.provider_id) === index));
        setDirector(creditsData.crew.find((person) => person.job === "Director")?.name || "정보 없음");
        setRecommendations(recommendationData.results.slice(0, 5));
        saveRecentlyViewed(normalizeMovie(movieData));
        setSaved(isCollected(movieData.id));
        document.title = `${movieData.title} | SceneYou`;
        if (hasApi()) {
          api.getReviews(movieData.id).then((remoteReviews) => {
            setReviews(remoteReviews);
            saveReviews(movieData.id, remoteReviews);
          }).catch(() => {});
        }
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [movieId]);

  const sortedReviews = useMemo(() => [...reviews].sort((a, b) => (
    reviewSort === "high" ? b.rating - a.rating : b.createdAt - a.createdAt
  )), [reviews, reviewSort]);

  function submitReview(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = form.get("review").trim();
    const rating = Number(form.get("rating"));
    if (!text || !rating) return;
    const next = [{
      id: crypto.randomUUID(),
      nickname: form.get("nickname").trim() || "익명",
      rating,
      text,
      createdAt: Date.now(),
    }, ...reviews];
    setReviews(next);
    saveReviews(movieId, next);
    if (hasApi()) {
      api.createReview(movieId, {
        user: getUser() || "guest",
        movieTitle: movie.title,
        nickname: form.get("nickname").trim() || "익명",
        rating,
        text,
      }).catch(() => {});
    }
    event.currentTarget.reset();
  }

  function deleteReview(id) {
    const next = reviews.filter((review) => review.id !== id);
    setReviews(next);
    saveReviews(movieId, next);
  }

  if (loading) return <main className="container page-content"><LoadingState label="영화 정보를 불러오는 중" /></main>;
  if (error || !movie) return <main className="container page-content"><ErrorState message={error || "영화 정보가 없습니다."} /></main>;

  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}시간 ${movie.runtime % 60}분` : "상영 시간 미정";

  return (
    <main>
      <section className="detail-hero">
        {movie.backdrop_path && <img className="detail-backdrop" src={imageUrl(movie.backdrop_path, "original")} alt="" />}
        <div className="detail-shade" />
        <div className="container detail-layout">
          <img className="detail-poster" src={imageUrl(movie.poster_path)} alt={`${movie.title} 포스터`} />
          <div className="detail-copy">
            <span className="eyebrow">MOVIE DETAIL</span>
            <h1>{movie.title}</h1>
            {movie.tagline && <p className="tagline">{movie.tagline}</p>}
            <div className="hero-meta">
              <span className="score"><Star size={15} fill="currentColor" /> {movieScore(movie.vote_average)}</span>
              <span>{movieYear(movie.release_date)}</span>
              <span><Clock size={15} /> {runtime}</span>
            </div>
            <div className="tag-row">{movie.genres.map((genre) => <span className="tag" key={genre.id}>{genre.name}</span>)}</div>
            <p className="overview">{movie.overview || "등록된 줄거리가 없습니다."}</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => setSaved(toggleCollection(normalizeMovie(movie)))} type="button">
                <Heart size={17} fill={saved ? "currentColor" : "none"} /> {saved ? "컬렉션에 저장됨" : "컬렉션 저장"}
              </button>
              {movie.homepage && <a className="btn btn-glass" href={movie.homepage} rel="noreferrer" target="_blank">공식 사이트 <ExternalLink size={16} /></a>}
            </div>
          </div>
        </div>
      </section>

      <div className="container page-content detail-body">
        <div className="detail-columns">
          <section className="panel">
            <SectionHeading title="관람 리뷰" description="이 영화를 본 감상을 기록해보세요." />
            <form className="review-form" onSubmit={submitReview}>
              <div className="form-row">
                <label>닉네임<input defaultValue={getUser()} maxLength="20" name="nickname" placeholder="닉네임" /></label>
                <label>평점<select name="rating" required><option value="">별점 선택</option><option value="5">★★★★★ 5점</option><option value="4">★★★★☆ 4점</option><option value="3">★★★☆☆ 3점</option><option value="2">★★☆☆☆ 2점</option><option value="1">★☆☆☆☆ 1점</option></select></label>
              </div>
              <label>리뷰<textarea maxLength="500" name="review" placeholder="어떤 장면이 가장 기억에 남았나요?" required /></label>
              <button className="btn btn-primary" type="submit">리뷰 등록</button>
            </form>

            <div className="review-toolbar">
              <strong>리뷰 {reviews.length}</strong>
              <select onChange={(event) => setReviewSort(event.target.value)} value={reviewSort}><option value="newest">최신순</option><option value="high">평점 높은순</option></select>
            </div>
            <div className="review-list">
              {sortedReviews.length ? sortedReviews.map((review) => (
                <article className="review-item" key={review.id}>
                  <div className="review-head"><div><strong>{review.nickname}</strong><span className="score">{"★".repeat(review.rating)}</span></div><time>{new Date(review.createdAt).toLocaleDateString("ko-KR")}</time></div>
                  <p>{review.text}</p>
                  <button className="text-button" onClick={() => deleteReview(review.id)} type="button"><Trash2 size={14} /> 삭제</button>
                </article>
              )) : <p className="empty-copy">아직 리뷰가 없습니다. 첫 감상을 남겨보세요.</p>}
            </div>
          </section>

          <aside className="panel movie-facts">
            <h2>영화 정보</h2>
            <dl><div><dt>감독</dt><dd>{director}</dd></div><div><dt>원제</dt><dd>{movie.original_title}</dd></div><div><dt>개봉일</dt><dd>{movie.release_date || "미정"}</dd></div><div><dt>제작 국가</dt><dd>{movie.production_countries.map((country) => country.name).join(", ") || "정보 없음"}</dd></div></dl>
            <h3>관람 가능한 곳</h3>
            <div className="provider-list">{providers.length ? providers.map((provider) => <span key={provider.provider_id}>{provider.provider_name}</span>) : "제공처 정보 없음"}</div>
          </aside>
        </div>

        {recommendations.length > 0 && (
          <section className="content-section">
            <SectionHeading eyebrow="NEXT SCENE" title="이 영화와 비슷한 작품" description="다음 장면으로 이어가세요." />
            <div className="movie-grid">{recommendations.map((item) => <MovieCard key={item.id} movie={item} />)}</div>
          </section>
        )}
        <Link className="text-link back-link" to="/movies">영화 탐색으로 돌아가기</Link>
      </div>
    </main>
  );
}
