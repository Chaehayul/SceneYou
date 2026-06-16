import { useMemo, useState } from "react";
import { Heart, MessageCircle, Search, Send, ShieldAlert, Sparkles, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading } from "../components/UI";
import { getCommunityPosts, getUser, saveCommunityPosts } from "../lib/storage";

const seedPosts = [
  {
    id: "seed-1",
    type: "review",
    movieTitle: "마이클",
    nickname: "scene_lover",
    rating: 4.5,
    content: "무대 위 화려함보다 가족과 음악 사이에서 흔들리는 인물의 감정이 더 오래 남았어요.",
    spoiler: false,
    tags: ["음악", "실화", "드라마"],
    likes: 18,
    comments: [{ id: "c1", nickname: "yul", content: "저도 음악 장면이 제일 좋았어요!" }],
    createdAt: Date.now() - 1000 * 60 * 60 * 7,
  },
  {
    id: "seed-2",
    type: "talk",
    movieTitle: "위시",
    nickname: "movie_note",
    rating: 3.5,
    content: "동화적인 분위기는 좋았는데 후반부 갈등 해결은 조금 더 밀도 있었으면 했어요.",
    spoiler: true,
    tags: ["애니메이션", "디즈니", "판타지"],
    likes: 11,
    comments: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 16,
  },
  {
    id: "seed-3",
    type: "recommend",
    movieTitle: "소울",
    nickname: "taste_maker",
    rating: 5,
    content: "삶의 방향을 고민하는 사람에게 추천하고 싶은 영화예요. 가볍게 시작해서 묵직하게 남습니다.",
    spoiler: false,
    tags: ["인생영화", "음악", "힐링"],
    likes: 24,
    comments: [{ id: "c2", nickname: "guest", content: "주말에 봐야겠네요." }],
    createdAt: Date.now() - 1000 * 60 * 60 * 27,
  },
];

const tabs = [
  ["all", "전체"],
  ["review", "리뷰"],
  ["talk", "토론"],
  ["recommend", "추천"],
];

function getInitialPosts() {
  const saved = getCommunityPosts();
  if (saved.length) return saved;
  saveCommunityPosts(seedPosts);
  return seedPosts;
}

function timeAgo(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState(getInitialPosts);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("hot");
  const [commentDrafts, setCommentDrafts] = useState({});

  const filteredPosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return posts
      .filter((post) => tab === "all" || post.type === tab)
      .filter((post) => !keyword || post.movieTitle.toLowerCase().includes(keyword) || post.content.toLowerCase().includes(keyword))
      .sort((a, b) => sort === "new" ? b.createdAt - a.createdAt : (b.likes + b.comments.length * 2) - (a.likes + a.comments.length * 2));
  }, [posts, query, sort, tab]);

  const tags = useMemo(() => {
    const counts = {};
    posts.flatMap((post) => post.tags).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [posts]);

  function sync(next) {
    setPosts(next);
    saveCommunityPosts(next);
  }

  function submitPost(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = form.get("content").trim();
    const movieTitle = form.get("movieTitle").trim();
    if (!content || !movieTitle) return;
    const nextPost = {
      id: crypto.randomUUID(),
      type: form.get("type"),
      movieTitle,
      nickname: form.get("nickname").trim() || getUser() || "익명",
      rating: Number(form.get("rating")),
      content,
      spoiler: form.get("spoiler") === "on",
      tags: form.get("tags").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 4),
      likes: 0,
      comments: [],
      createdAt: Date.now(),
    };
    sync([nextPost, ...posts]);
    event.currentTarget.reset();
  }

  function likePost(id) {
    sync(posts.map((post) => post.id === id ? { ...post, likes: post.likes + 1 } : post));
  }

  function submitComment(postId) {
    const content = commentDrafts[postId]?.trim();
    if (!content) return;
    sync(posts.map((post) => post.id === postId ? {
      ...post,
      comments: [...post.comments, { id: crypto.randomUUID(), nickname: getUser() || "guest", content }],
    } : post));
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
  }

  return (
    <main className="container page-content community-page">
      <SectionHeading
        eyebrow="COMMUNITY"
        title="영화 취향을 나누는 공간"
        description="왓챠피디아처럼 별점, 감상평, 추천과 토론을 한곳에서 공유해보세요."
      />

      <section className="community-hero">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> SCENE TALK</span>
          <h1>좋아하는 장면과<br />취향을 기록하고 공유해요.</h1>
          <p>스포일러 표시, 별점 리뷰, 댓글과 좋아요로 영화 이야기를 이어갈 수 있습니다.</p>
        </div>
        <div className="community-stat-card">
          <TrendingUp />
          <strong>{posts.length}</strong>
          <span>등록된 이야기</span>
        </div>
      </section>

      <div className="community-layout">
        <section className="panel community-compose">
          <h2>새 감상 남기기</h2>
          <form onSubmit={submitPost}>
            <div className="form-row">
              <label>닉네임<input name="nickname" placeholder="익명" defaultValue={getUser()} /></label>
              <label>분류<select name="type" defaultValue="review"><option value="review">리뷰</option><option value="talk">토론</option><option value="recommend">추천</option></select></label>
            </div>
            <div className="form-row">
              <label>영화 제목<input name="movieTitle" placeholder="예: 마이클" required /></label>
              <label>별점<select name="rating" defaultValue="4"><option value="5">★★★★★ 5.0</option><option value="4.5">★★★★☆ 4.5</option><option value="4">★★★★ 4.0</option><option value="3.5">★★★☆ 3.5</option><option value="3">★★★ 3.0</option><option value="2">★★ 2.0</option><option value="1">★ 1.0</option></select></label>
            </div>
            <label>감상평<textarea name="content" placeholder="인상 깊었던 장면이나 추천 이유를 적어주세요." required /></label>
            <label>태그<input name="tags" placeholder="음악, 실화, 힐링" /></label>
            <div className="compose-bottom">
              <label className="spoiler-check"><input name="spoiler" type="checkbox" /> 스포일러 포함</label>
              <button className="btn btn-primary" type="submit"><Send size={16} /> 등록</button>
            </div>
          </form>
        </section>

        <aside className="panel community-sidebar">
          <h2>인기 태그</h2>
          <div className="community-tags">
            {tags.map(([tag, count]) => <button key={tag} onClick={() => setQuery(tag)} type="button">#{tag}<span>{count}</span></button>)}
          </div>
          <div className="community-guide">
            <ShieldAlert />
            <p>스포일러가 포함된 글은 표시를 켜고 작성해주세요.</p>
          </div>
        </aside>
      </div>

      <section className="community-feed">
        <div className="feed-toolbar">
          <div className="category-tabs">
            {tabs.map(([value, label]) => <button className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)} type="button">{label}</button>)}
          </div>
          <label className="feed-search"><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder="영화나 키워드 검색" value={query} /></label>
          <select onChange={(event) => setSort(event.target.value)} value={sort}><option value="hot">인기순</option><option value="new">최신순</option></select>
        </div>

        <div className="post-list">
          {filteredPosts.map((post) => (
            <article className="post-card" key={post.id}>
              <div className="post-head">
                <div><strong>{post.nickname}</strong><time>{timeAgo(post.createdAt)}</time></div>
                <span className={`post-type ${post.type}`}>{post.type === "review" ? "리뷰" : post.type === "talk" ? "토론" : "추천"}</span>
              </div>
              <Link className="post-movie" to={`/movies?q=${encodeURIComponent(post.movieTitle)}`}>{post.movieTitle}</Link>
              <div className="post-rating"><Star size={15} fill="currentColor" /> {post.rating.toFixed(1)}</div>
              {post.spoiler && <div className="spoiler-alert">스포일러가 포함된 감상입니다.</div>}
              <p>{post.content}</p>
              <div className="post-tags">{post.tags.map((tag) => <button key={tag} onClick={() => setQuery(tag)} type="button">#{tag}</button>)}</div>
              <div className="post-actions">
                <button onClick={() => likePost(post.id)} type="button"><Heart size={16} /> {post.likes}</button>
                <span><MessageCircle size={16} /> {post.comments.length}</span>
              </div>
              <div className="comment-list">
                {post.comments.map((comment) => <p key={comment.id}><strong>{comment.nickname}</strong>{comment.content}</p>)}
              </div>
              <div className="comment-form">
                <input
                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === "Enter") submitComment(post.id); }}
                  placeholder="댓글을 입력하세요"
                  value={commentDrafts[post.id] || ""}
                />
                <button onClick={() => submitComment(post.id)} type="button">등록</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
