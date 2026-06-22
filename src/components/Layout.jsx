import { useEffect, useState } from "react";
import { Film, Heart, Menu, MessageCircle, Search, Sparkles, Ticket, X } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getCollection, getUser, signOut } from "../lib/storage";

const links = [
  { to: "/", label: "홈", end: true },
  { to: "/movies", label: "영화 탐색" },
  { to: "/community", label: "커뮤니티" },
  { to: "/events", label: "이벤트" },
  { to: "/taste", label: "취향 분석" },
];

export default function Layout() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [collectionCount, setCollectionCount] = useState(getCollection().length);
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    const syncCollection = () => setCollectionCount(getCollection().length);
    const syncUser = () => setUser(getUser());
    window.addEventListener("sceneyou:collection", syncCollection);
    window.addEventListener("sceneyou:user", syncUser);
    return () => {
      window.removeEventListener("sceneyou:collection", syncCollection);
      window.removeEventListener("sceneyou:user", syncUser);
    };
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/movies?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
    setMenuOpen(false);
  }

  function logout() {
    signOut();
    setUser("");
    navigate("/");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label="SceneYou 홈">
            <span className="brand-mark"><Film size={18} /></span>
            <span>SCENEYOU</span>
          </Link>

          <nav className="desktop-nav" aria-label="주요 메뉴">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <form className="header-search" onSubmit={submitSearch}>
              <input
                aria-label="영화 검색"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="영화를 검색해보세요"
                value={query}
              />
              <button type="submit" aria-label="검색"><Search size={17} /></button>
            </form>

            <Link className="collection-shortcut" to="/collection" aria-label={`내 컬렉션 ${collectionCount}개`}>
              <Heart size={18} />
              <span>{collectionCount}</span>
            </Link>
            <Link className="community-shortcut" to="/community" aria-label="커뮤니티">
              <MessageCircle size={18} />
            </Link>

            {user ? (
              <button className="btn btn-ghost auth-button" onClick={logout} type="button">
                {user} · 로그아웃
              </button>
            ) : (
              <Link className="btn btn-ghost auth-button" to="/login">로그인</Link>
            )}

            <button
              className="menu-button"
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
              aria-expanded={menuOpen}
              aria-label="메뉴"
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-panel">
            <form className="mobile-search" onSubmit={submitSearch}>
              <Search size={18} />
              <input
                aria-label="영화 검색"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="영화 제목 검색"
                value={query}
              />
            </form>
            <nav>
              {links.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
              <NavLink to="/collection" onClick={() => setMenuOpen(false)}>내 컬렉션</NavLink>
            </nav>
          </div>
        )}
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Link className="brand" to="/"><span className="brand-mark"><Film size={18} /></span>SCENEYOU</Link>
            <p>오늘의 장면을 발견하고 나만의 영화 취향을 기록하세요.</p>
          </div>
          <div className="footer-features">
            <span><Sparkles size={15} /> 취향 기반 큐레이션</span>
            <span><MessageCircle size={15} /> 영화 커뮤니티</span>
            <span><Ticket size={15} /> 영화 이벤트 준비 중</span>
          </div>
        </div>
        <div className="container footer-note">
          영화 정보는 TMDB API를 활용하며, SceneYou는 TMDB의 공식 인증 서비스가 아닙니다.
        </div>
      </footer>
    </div>
  );
}
