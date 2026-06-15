import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { EmptyState, ErrorState, MovieGridSkeleton, SectionHeading } from "../components/UI";
import { tmdb } from "../lib/tmdb";

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const query = searchParams.get("q") || "";
  const genre = searchParams.get("genre") || "";
  const sort = searchParams.get("sort") || "popularity.desc";
  const page = Number(searchParams.get("page") || 1);

  useEffect(() => {
    const controller = new AbortController();
    tmdb("/genre/movie/list", {}, controller.signal)
      .then((data) => setGenres(data.genres))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const request = query
      ? tmdb("/search/movie", { query, page }, controller.signal)
      : tmdb("/discover/movie", {
          page,
          sort_by: sort,
          with_genres: genre,
          "vote_count.gte": sort === "vote_average.desc" ? 100 : 0,
        }, controller.signal);

    request
      .then((data) => {
        setMovies(data.results);
        setTotalPages(Math.min(data.total_pages, 500));
        setTotalResults(data.total_results);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, genre, sort, page]);

  const pages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index).filter((number) => number > 0);
  }, [page, totalPages]);

  function update(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  function submit(event) {
    event.preventDefault();
    update("q", new FormData(event.currentTarget).get("query").trim());
  }

  return (
    <main className="container page-content">
      <SectionHeading
        eyebrow="EXPLORE"
        title={query ? `‘${query}’ 검색 결과` : "영화 탐색"}
        description={loading ? "좋아할 만한 영화를 찾고 있어요." : `${totalResults.toLocaleString()}편의 영화를 찾았습니다.`}
      />

      <div className="filter-panel">
        <form className="filter-search" onSubmit={submit}>
          <Search size={18} />
          <input defaultValue={query} key={query} name="query" placeholder="영화 제목을 입력하세요" />
          <button className="btn btn-primary" type="submit">검색</button>
        </form>
        <div className="filter-controls">
          <span className="filter-label"><SlidersHorizontal size={16} /> 필터</span>
          <select aria-label="장르" onChange={(event) => update("genre", event.target.value)} value={genre}>
            <option value="">모든 장르</option>
            {genres.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select aria-label="정렬" onChange={(event) => update("sort", event.target.value)} value={sort}>
            <option value="popularity.desc">인기순</option>
            <option value="vote_average.desc">평점순</option>
            <option value="release_date.desc">최신순</option>
            <option value="revenue.desc">흥행순</option>
          </select>
        </div>
      </div>

      {loading ? <MovieGridSkeleton /> : error ? (
        <ErrorState message={error} retry={() => setSearchParams(new URLSearchParams(searchParams))} />
      ) : movies.length ? (
        <>
          <div className="movie-grid">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
          <nav className="pagination" aria-label="페이지">
            <button disabled={page <= 1} onClick={() => update("page", page - 1)} type="button"><ChevronLeft /></button>
            {pages.map((number) => (
              <button className={number === page ? "active" : ""} key={number} onClick={() => update("page", number)} type="button">{number}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => update("page", page + 1)} type="button"><ChevronRight /></button>
          </nav>
        </>
      ) : (
        <EmptyState title="검색 결과가 없어요" description="다른 제목이나 장르로 다시 찾아보세요." />
      )}
    </main>
  );
}
