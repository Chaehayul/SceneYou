import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { EmptyState, SectionHeading } from "../components/UI";
import { clearCollection, getCollection } from "../lib/storage";

export default function CollectionPage() {
  const [collection, setCollection] = useState(getCollection);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("saved");

  useEffect(() => {
    const sync = () => setCollection(getCollection());
    window.addEventListener("sceneyou:collection", sync);
    return () => window.removeEventListener("sceneyou:collection", sync);
  }, []);

  const filtered = useMemo(() => {
    const result = collection.filter((movie) => movie.title?.toLowerCase().includes(query.toLowerCase()));
    return result.sort((a, b) => {
      if (sort === "rating") return (b.vote_average || 0) - (a.vote_average || 0);
      if (sort === "release") return String(b.release_date || "").localeCompare(a.release_date || "");
      if (sort === "title") return String(a.title).localeCompare(String(b.title), "ko");
      return (b.savedAt || 0) - (a.savedAt || 0);
    });
  }, [collection, query, sort]);

  function clearAll() {
    if (!window.confirm("컬렉션에 저장한 영화를 모두 삭제할까요?")) return;
    clearCollection();
    setCollection([]);
  }

  return (
    <main className="container page-content">
      <SectionHeading
        eyebrow="MY COLLECTION"
        title="나만의 영화 서랍"
        description={`${collection.length}편의 영화를 저장했어요.`}
        action={collection.length > 0 && <button className="btn btn-danger" onClick={clearAll} type="button"><Trash2 size={16} /> 전체 비우기</button>}
      />
      {collection.length > 0 && (
        <div className="filter-panel collection-filter">
          <label className="filter-search"><Search size={18} /><input onChange={(event) => setQuery(event.target.value)} placeholder="저장한 영화 검색" value={query} /></label>
          <select onChange={(event) => setSort(event.target.value)} value={sort}><option value="saved">최근 저장순</option><option value="rating">평점순</option><option value="release">최신 개봉순</option><option value="title">가나다순</option></select>
        </div>
      )}
      {filtered.length ? (
        <div className="movie-grid">{filtered.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
      ) : (
        <EmptyState
          title={query ? "검색 결과가 없어요" : "아직 저장한 영화가 없어요"}
          description={query ? "다른 영화 제목으로 찾아보세요." : "마음에 드는 영화를 발견하면 컬렉션에 담아보세요."}
          action={!query && <Link className="btn btn-primary" to="/movies">영화 둘러보기</Link>}
        />
      )}
    </main>
  );
}
