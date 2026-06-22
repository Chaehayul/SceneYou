import { useEffect, useMemo, useState } from "react";
import { Eye, Heart, MessageCircle, PenLine, Search, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, SectionHeading } from "../components/UI";
import { api, hasApi } from "../lib/api";
import { getCommunityPosts, getUser, saveCommunityPosts } from "../lib/storage";

const categories = [
  ["all", "전체"],
  ["free", "자유"],
  ["movie", "영화"],
  ["recommend", "추천"],
];

const categoryLabels = {
  free: "자유",
  movie: "영화",
  recommend: "추천",
  review: "영화",
  talk: "자유",
};

const legacyMockIds = new Set([
  "hot-hidden-masterpiece",
  "hot-inception-ending",
  "hot-best-movie",
  "latest-michael",
  "seed-michael",
  "seed-soul",
  "seed-talk",
  "seed-1",
  "seed-2",
  "seed-3",
]);

function isBrokenText(value = "") {
  return /[�]|[媛-熙]{2,}|[?]{2,}/.test(String(value));
}

function normalizeType(type) {
  if (type === "review") return "movie";
  if (type === "talk") return "free";
  if (["free", "movie", "recommend"].includes(type)) return type;
  return "free";
}

function normalizePost(post, index = 0) {
  const type = normalizeType(post.type);
  const title = post.title || post.subject || post.movieTitle || "영화 이야기";
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const likes = Number(post.likes || 0);
  const views = Number(post.views || post.viewCount || Math.max(0, likes * 7 + comments.length * 13 + index));

  return {
    ...post,
    id: post.id || crypto.randomUUID(),
    type,
    title: String(title),
    movieTitle: String(post.movieTitle || title),
    nickname: String(post.nickname || "guest"),
    content: String(post.content || post.text || ""),
    rating: Number(post.rating || 0),
    tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
    likes,
    comments,
    views,
    createdAt: Number(post.createdAt || Date.now()),
  };
}

function isValidRealPost(post) {
  if (!post || legacyMockIds.has(post.id)) return false;
  return !(
    isBrokenText(post.title)
    || isBrokenText(post.movieTitle)
    || isBrokenText(post.content)
    || post.tags.some(isBrokenText)
  );
}

function getInitialPosts() {
  const saved = getCommunityPosts().map(normalizePost).filter(isValidRealPost);
  if (saved.length !== getCommunityPosts().length) saveCommunityPosts(saved);
  return saved;
}

function timeAgo(timestamp) {
  const minutes = Math.floor((Date.now() - Number(timestamp)) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function getScore(post) {
  return post.likes * 3 + post.comments.length * 5 + Math.floor(post.views / 10);
}

function SidebarEmpty({ children }) {
  return <p className="sidebar-empty">{children}</p>;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState(getInitialPosts);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("new");
  const [query, setQuery] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const [notice, setNotice] = useState("");
  const username = getUser() || "";

  useEffect(() => {
    if (!hasApi()) return;
    api.getCommunityPosts({ type: category, q: query, sort })
      .then((remotePosts) => {
        const normalized = remotePosts.map(normalizePost).filter(isValidRealPost);
        setPosts(normalized);
        saveCommunityPosts(normalized);
      })
      .catch(() => {});
  }, [category, query, sort]);

  const filteredPosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return posts
      .filter((post) => category === "all" || post.type === category)
      .filter((post) => {
        if (!keyword) return true;
        return [post.title, post.movieTitle, post.content, post.nickname, ...post.tags]
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        if (sort === "hot") return getScore(b) - getScore(a);
        if (sort === "comment") return b.comments.length - a.comments.length;
        if (sort === "view") return b.views - a.views;
        return b.createdAt - a.createdAt;
      });
  }, [category, posts, query, sort]);

  const hotPosts = useMemo(() => [...posts].sort((a, b) => getScore(b) - getScore(a)).slice(0, 5), [posts]);
  const keywords = useMemo(() => {
    const counts = {};
    posts.flatMap((post) => post.tags).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [posts]);
  const weeklyContents = useMemo(() => [...posts].sort((a, b) => b.views - a.views).slice(0, 5), [posts]);
  const popularReviews = useMemo(() => [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3), [posts]);

  function sync(next) {
    const normalized = next.map(normalizePost).filter(isValidRealPost);
    setPosts(normalized);
    saveCommunityPosts(normalized);
  }

  function submitPost(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const movieTitle = String(form.get("movieTitle") || "").trim();
    const content = String(form.get("content") || "").trim();

    if (!title || !content) {
      setNotice("제목과 내용을 입력해 주세요.");
      return;
    }

    const nextPost = normalizePost({
      id: crypto.randomUUID(),
      type: form.get("type"),
      title,
      movieTitle: movieTitle || title,
      nickname: String(form.get("nickname") || "").trim() || username || "guest",
      content,
      rating: Number(form.get("rating") || 0),
      spoiler: form.get("spoiler") === "on",
      tags: String(form.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 4),
      likes: 0,
      comments: [],
      views: 1,
      createdAt: Date.now(),
    });

    sync([nextPost, ...posts]);
    setNotice("게시글이 등록됐어요.");
    event.currentTarget.reset();

    if (hasApi()) {
      api.createCommunityPost({ ...nextPost, user: username || nextPost.nickname })
        .then((savedPost) => sync([normalizePost(savedPost), ...posts.filter((post) => post.id !== nextPost.id)]))
        .catch(() => {});
    }
  }

  function likePost(id) {
    sync(posts.map((post) => post.id === id ? { ...post, likes: post.likes + 1 } : post));
    if (hasApi()) {
      api.likeCommunityPost(id, username || "guest")
        .then(({ likes }) => sync(posts.map((post) => post.id === id ? { ...post, likes } : post)))
        .catch(() => {});
    }
  }

  function submitComment(postId) {
    const content = commentDrafts[postId]?.trim();
    if (!content) return;
    const nextComment = {
      id: crypto.randomUUID(),
      nickname: username || "guest",
      content,
      createdAt: Date.now(),
    };

    sync(posts.map((post) => post.id === postId ? {
      ...post,
      comments: [...post.comments, nextComment],
    } : post));
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));

    if (hasApi()) {
      api.createCommunityComment(postId, {
        user: username || "guest",
        nickname: username || "guest",
        content,
      }).catch(() => {});
    }
  }

  return (
    <main className="container page-content community-board-page">
      <SectionHeading
        eyebrow="COMMUNITY"
        title="커뮤니티"
        description="영화와 드라마를 보고 난 뒤의 감상, 해석, 추천을 함께 나누는 공간입니다."
        action={<a className="btn btn-primary" href="#write-post"><PenLine size={16} /> 글쓰기</a>}
      />

      <section className="community-board-toolbar">
        <label className="board-search">
          <Search size={18} />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="영화, 드라마, 게시글 검색" value={query} />
        </label>
        <div className="category-tabs board-tabs">
          {categories.map(([value, label]) => (
            <button className={category === value ? "active" : ""} key={value} onClick={() => setCategory(value)} type="button">
              {label}
            </button>
          ))}
        </div>
        <select aria-label="정렬" onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="new">최신순</option>
          <option value="hot">인기순</option>
          <option value="comment">댓글순</option>
          <option value="view">조회순</option>
        </select>
      </section>

      <section className="hot-board-section">
        <div className="board-section-title">
          <span><TrendingUp size={17} /> HOT 인기글</span>
          <p>좋아요, 댓글, 조회수를 기준으로 많이 반응한 글이에요.</p>
        </div>
        {hotPosts.length === 0 ? (
          <EmptyState title="아직 인기글이 없어요" description="게시글이 쌓이면 이곳에 HOT 인기글이 표시됩니다." />
        ) : (
          <div className="hot-post-grid">
            {hotPosts.map((post, index) => (
              <article className="hot-post-card" key={post.id}>
                <div className="hot-post-top">
                  <span className="hot-badge">HOT</span>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                </div>
                <span className="post-category">{categoryLabels[post.type] || "자유"}</span>
                <h3>{post.title}</h3>
                <p>{post.content}</p>
                <div className="board-meta">
                  <span><Heart size={14} /> {post.likes}</span>
                  <span><MessageCircle size={14} /> {post.comments.length}</span>
                  <span><Eye size={14} /> {post.views}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="community-board-layout">
        <section className="latest-board-section">
          <div className="board-section-title">
            <span>최신 게시글</span>
            <p>{filteredPosts.length}개의 이야기가 있어요.</p>
          </div>

          {filteredPosts.length === 0 ? (
            <EmptyState title="게시글이 없어요" description="검색어를 바꾸거나 첫 글을 작성해 보세요." />
          ) : (
            <div className="board-post-list">
              {filteredPosts.map((post) => {
                const isSpoilerHidden = post.spoiler && !revealedSpoilers[post.id];
                return (
                  <article className="board-post-card" key={post.id}>
                    <div className="board-post-main">
                      <div className="board-post-head">
                        <span className="post-category">{categoryLabels[post.type] || "자유"}</span>
                        <span>{post.nickname}</span>
                        <time>{timeAgo(post.createdAt)}</time>
                      </div>
                      <Link className="board-post-title" to={`/movies?q=${encodeURIComponent(post.movieTitle)}`}>{post.title}</Link>
                      <div className="board-post-sub">
                        <span>{post.movieTitle}</span>
                        {post.rating > 0 && <span className="post-rating"><Star size={14} fill="currentColor" /> {post.rating.toFixed(1)}</span>}
                      </div>
                      {isSpoilerHidden ? (
                        <button className="spoiler-alert spoiler-button" onClick={() => setRevealedSpoilers((current) => ({ ...current, [post.id]: true }))} type="button">
                          스포일러가 포함된 글입니다. 클릭해서 보기
                        </button>
                      ) : (
                        <p>{post.content}</p>
                      )}
                      <div className="post-tags">{post.tags.map((tag) => <button key={tag} onClick={() => setQuery(tag)} type="button">#{tag}</button>)}</div>
                    </div>
                    <div className="board-post-stats">
                      <button onClick={() => likePost(post.id)} type="button"><Heart size={15} /> {post.likes}</button>
                      <span><MessageCircle size={15} /> {post.comments.length}</span>
                      <span><Eye size={15} /> {post.views}</span>
                    </div>
                    <div className="comment-form board-comment-form">
                      <input
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === "Enter") submitComment(post.id); }}
                        placeholder="댓글을 입력하세요"
                        value={commentDrafts[post.id] || ""}
                      />
                      <button onClick={() => submitComment(post.id)} type="button">등록</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="community-board-sidebar">
          <section className="panel sidebar-card">
            <h3>실시간 인기 키워드</h3>
            {keywords.length === 0 ? (
              <SidebarEmpty>게시글 태그가 쌓이면 키워드가 표시됩니다.</SidebarEmpty>
            ) : (
              <div className="sidebar-keywords">
                {keywords.map(([tag, count], index) => (
                  <button key={tag} onClick={() => setQuery(tag)} type="button">
                    <b>{index + 1}</b>
                    <span>#{tag}</span>
                    <small>{count}</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel sidebar-card">
            <h3>이번 주 인기 영화/드라마</h3>
            {weeklyContents.length === 0 ? (
              <SidebarEmpty>조회 데이터가 생기면 인기 콘텐츠가 표시됩니다.</SidebarEmpty>
            ) : (
              <div className="sidebar-rank-list">
                {weeklyContents.map((post, index) => (
                  <Link key={`${post.id}-weekly`} to={`/movies?q=${encodeURIComponent(post.movieTitle)}`}>
                    <b>{index + 1}</b>
                    <span>{post.movieTitle}</span>
                    <small>{post.views} views</small>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel sidebar-card">
            <h3>인기 리뷰</h3>
            {popularReviews.length === 0 ? (
              <SidebarEmpty>좋아요를 받은 글이 이곳에 표시됩니다.</SidebarEmpty>
            ) : (
              <div className="sidebar-review-list">
                {popularReviews.map((post) => (
                  <article key={`${post.id}-review`}>
                    <strong>{post.title}</strong>
                    <p>{post.content}</p>
                    <span><Heart size={13} /> {post.likes}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel sidebar-card write-card" id="write-post">
            <h3>글쓰기</h3>
            <form onSubmit={submitPost}>
              <label>작성자<input name="nickname" placeholder="guest" defaultValue={username} /></label>
              <label>제목<input name="title" placeholder="예: 숨은 명작 추천" required /></label>
              <label>작품명<input name="movieTitle" placeholder="예: 인셉션" /></label>
              <div className="form-row">
                <label>카테고리<select name="type" defaultValue="free"><option value="free">자유</option><option value="movie">영화</option><option value="recommend">추천</option></select></label>
                <label>별점<select name="rating" defaultValue="4"><option value="5">5.0</option><option value="4.5">4.5</option><option value="4">4.0</option><option value="3">3.0</option><option value="0">없음</option></select></label>
              </div>
              <label>내용<textarea name="content" placeholder="감상, 추천 이유, 해석하고 싶은 장면을 적어주세요." required /></label>
              <label>태그<input name="tags" placeholder="예: 명작, 해석, 추천" /></label>
              <label className="spoiler-check"><input name="spoiler" type="checkbox" /> 스포일러 포함</label>
              <button className="btn btn-primary" type="submit">글쓰기</button>
              {notice && <p className="compose-message">{notice}</p>}
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
