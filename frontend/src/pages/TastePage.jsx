import { useEffect, useMemo, useState } from "react";
import { BarChart3, Film, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { EmptyState, SectionHeading } from "../components/UI";
import { getCollection } from "../lib/storage";
import { tmdb } from "../lib/tmdb";

export default function TastePage() {
  const collection = getCollection();
  const [genreNames, setGenreNames] = useState({});

  useEffect(() => {
    tmdb("/genre/movie/list")
      .then((data) => setGenreNames(Object.fromEntries(data.genres.map((genre) => [genre.id, genre.name]))))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const counts = {};
    collection.forEach((movie) => movie.genre_ids?.forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
    const ranking = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const average = collection.length
      ? collection.reduce((sum, movie) => sum + Number(movie.vote_average || 0), 0) / collection.length
      : 0;
    return { ranking, average };
  }, [collection]);

  if (!collection.length) {
    return (
      <main className="container page-content">
        <SectionHeading eyebrow="TASTE PROFILE" title="내 영화 취향 리포트" description="컬렉션에 저장한 영화를 바탕으로 분석합니다." />
        <EmptyState title="분석할 영화가 아직 없어요" description="영화를 3편 이상 저장하면 취향이 더 선명해집니다." action={<Link className="btn btn-primary" to="/movies">영화 저장하러 가기</Link>} />
      </main>
    );
  }

  const topGenre = genreNames[stats.ranking[0]?.[0]] || "다양한 장르";

  return (
    <main className="container page-content">
      <SectionHeading eyebrow="TASTE PROFILE" title="내 영화 취향 리포트" description="컬렉션에 저장한 영화를 바탕으로 분석합니다." />
      <div className="stats-grid">
        <article className="stat-card"><span><Film /></span><p>저장한 영화</p><strong>{collection.length}<small>편</small></strong></article>
        <article className="stat-card"><span><Sparkles /></span><p>선호 장르</p><strong>{topGenre}</strong></article>
        <article className="stat-card"><span><Star /></span><p>평균 평점</p><strong>{stats.average.toFixed(1)}<small>/ 10</small></strong></article>
      </div>
      <section className="panel taste-chart">
        <SectionHeading title="선호 장르 TOP 5" description="저장한 영화에 많이 포함된 장르입니다." />
        <div className="bars">
          {stats.ranking.map(([id, count], index) => (
            <div className="bar-row" key={id}>
              <span>{index + 1}</span><strong>{genreNames[id] || "기타"}</strong>
              <div className="bar-track"><i style={{ width: `${(count / stats.ranking[0][1]) * 100}%` }} /></div>
              <b>{count}편</b>
            </div>
          ))}
        </div>
      </section>
      <section className="taste-summary">
        <BarChart3 />
        <div><span className="eyebrow">YOUR MOVIE DNA</span><h2>당신은 <em>{topGenre}</em>의 감성을<br />가장 자주 선택했어요.</h2><p>컬렉션을 더 채우면 분석 결과도 계속 달라집니다.</p></div>
      </section>
      <section className="content-section">
        <SectionHeading title="내 취향을 만든 영화" />
        <div className="movie-grid">{collection.slice(0, 10).map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
      </section>
    </main>
  );
}
