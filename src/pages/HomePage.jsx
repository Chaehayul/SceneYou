import { useEffect, useState } from "react";
import { ArrowRight, Heart, Play, Search, Sparkles, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { ErrorState, MovieGridSkeleton, SectionHeading } from "../components/UI";
import { imageUrl, movieScore, movieYear, normalizeMovie, tmdb } from "../lib/tmdb";
import { getCollection, getRecentlyViewed, isCollected, toggleCollection } from "../lib/storage";

export default function HomePage() {
  const [popular, setPopular] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [error, setError] = useState("");
  const [heroSaved, setHeroSaved] = useState(false);
  const recent = getRecentlyViewed();

  async function load() {
    setError("");
    try {
      const [trendingData, upcomingData] = await Promise.all([
        tmdb("/trending/movie/week"),
        tmdb("/movie/upcoming", { page: 1 }),
      ]);
      const trending = trendingData.results.slice(0, 10);
      setPopular(trending);
      setUpcoming(upcomingData.results.slice(0, 5));
      setFeatured(trending[0]);
      setHeroSaved(isCollected(trending[0]?.id));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main>
      {featured ? (
        <section className="hero">
          <img className="hero-bg" src={imageUrl(featured.backdrop_path, "original")} alt="" />
          <div className="hero-shade" />
          <div className="container">
            <div className="hero-content">
              <span className="eyebrow">SCENE OF THE WEEK</span>
              <h1>{featured.title}</h1>
              <div className="hero-meta">
                <span className="score">★ {movieScore(featured.vote_average)}</span>
                <span>{movieYear(featured.release_date)}</span>
                <span>이번 주 인기 1위</span>
              </div>
              <p>{featured.overview || "지금 가장 주목받는 영화의 새로운 장면을 만나보세요."}</p>
              <div className="hero-actions">
                <Link className="btn btn-primary" to={`/movies/${featured.id}`}>
                  <Play size={17} fill="currentColor" /> 상세 정보
                </Link>
                <button
                  className="btn btn-glass"
                  onClick={() => setHeroSaved(toggleCollection(normalizeMovie(featured)))}
                  type="button"
                >
                  <Heart size={17} fill={heroSaved ? "currentColor" : "none"} />
                  {heroSaved ? "저장됨" : "컬렉션 저장"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero hero-placeholder">
          <div className="container">
            <div className="hero-content">
              <span className="eyebrow">SCENE OF THE WEEK</span>
              <h1>오늘의 장면을<br />발견하세요.</h1>
              <p>영화 취향을 기록할수록 더 선명한 나만의 큐레이션이 완성됩니다.</p>
            </div>
          </div>
        </section>
      )}

      <div className="container page-content">
        <section className="quick-grid" aria-label="빠른 메뉴">
          <Link className="quick-card" to="/movies">
            <span className="quick-icon coral"><Search /></span>
            <div><strong>영화 탐색</strong><p>장르와 평점으로 빠르게 찾아보세요.</p></div>
            <ArrowRight />
          </Link>
          <Link className="quick-card" to="/collection">
            <span className="quick-icon violet"><Heart /></span>
            <div><strong>내 컬렉션</strong><p>{getCollection().length}편의 영화를 저장했어요.</p></div>
            <ArrowRight />
          </Link>
          <Link className="quick-card" to="/events">
            <span className="quick-icon blue"><Ticket /></span>
            <div><strong>진행 중인 이벤트</strong><p>놓치기 아까운 영화 혜택을 확인하세요.</p></div>
            <ArrowRight />
          </Link>
        </section>

        {error ? (
          <ErrorState message={error} retry={load} />
        ) : (
          <>
            <section className="content-section">
              <SectionHeading
                eyebrow="TRENDING NOW"
                title="지금 가장 많이 보는 영화"
                description="이번 주 관객의 선택을 순위로 확인하세요."
                action={<Link className="text-link" to="/movies">전체 보기 <ArrowRight size={16} /></Link>}
              />
              {popular.length ? (
                <div className="movie-grid">{popular.map((movie, index) => <MovieCard key={movie.id} movie={movie} rank={index + 1} />)}</div>
              ) : <MovieGridSkeleton />}
            </section>

            <section className="content-section">
              <SectionHeading
                eyebrow="COMING SOON"
                title="곧 만나요"
                description="극장에서 기다리고 있는 개봉 예정작입니다."
                action={<Link className="text-link" to="/movies?sort=release_date.desc">더 보기 <ArrowRight size={16} /></Link>}
              />
              {upcoming.length ? (
                <div className="movie-grid">{upcoming.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
              ) : <MovieGridSkeleton count={5} />}
            </section>
          </>
        )}

        {recent.length > 0 && (
          <section className="content-section">
            <SectionHeading eyebrow="CONTINUE" title="최근 본 영화" description="감상하던 흐름을 이어가세요." />
            <div className="movie-grid">{recent.slice(0, 5).map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
          </section>
        )}

        <section className="taste-banner">
          <div>
            <span className="eyebrow"><Sparkles size={14} /> TASTE PROFILE</span>
            <h2>내가 좋아하는 영화에는<br />어떤 공통점이 있을까요?</h2>
            <p>컬렉션을 기반으로 선호 장르와 평점 취향을 분석해드려요.</p>
          </div>
          <Link className="btn btn-light" to="/taste">취향 분석 보기 <ArrowRight size={17} /></Link>
        </section>
      </div>
    </main>
  );
}
