import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Heart,
  MessageCircle,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, SectionHeading } from "../components/UI";
import { api, hasApi } from "../lib/api";
import { getCommunityPosts, getUser, saveCommunityPosts } from "../lib/storage";

const seedPosts = [
  {
    id: "seed-1",
    type: "review",
    movieTitle: "마이클",
    nickname: "scene_lover",
    rating: 4.5,
    content: "무대 위 장면이 압도적이었어요. 음악과 가족 서사가 함께 쌓이면서 인물의 고민이 선명하게 남았습니다.",
    spoiler: false,
    tags: ["음악", "실화", "드라마"],
    likes: 18,
    comments: [{ id: "c1", nickname: "yul", content: "저도 공연 장면이 제일 좋았어요!" }],
    createdAt: Date.now() - 1000 * 60 * 60 * 7,
  },
  {
    id: "seed-2",
    type: "talk",
    movieTitle: "어비스",
    nickname: "movie_note",
    rating: 3.5,
    content: "영상미는 좋았는데 후반부 갈등 해결이 조금 더 밀도 있었으면 좋았을 것 같아요.",
    spoiler: true,
    tags: ["SF", "영상미", "토론"],
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
    tags: ["인생영화", "음악", "가족"],
    likes: 24,
    comments: [{ id: "c2", nickname: "guest", content: "주말에 바로 봐야겠네요." }],
    createdAt: Date.now() - 1000 * 60 * 60 * 27,
  },
];

const tabs = [
  ["all", "전체"],
  ["review", "리뷰"],
  ["talk", "토론"],
  ["recommend", "추천"],
];

const typeLabels = {
  review: "리뷰",
  talk: "토론",
  recommend: "추천",
};

function getInitialPosts() {
  const saved = getCommunityPosts();
  if (saved.length) return saved;
  saveCommunityPosts(seedPosts);
  return seedPosts;
}

function timeAgo(timestamp) {
  const minutes = Math.floor((Date.now() - Number(timestamp)) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function normalizePost(post) {
  return {
    ...post,
    tags: Array.isArray(post.tags) ? post.tags : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
    likes: Number(post.likes || 0),
    rating: Number(post.rating || 0),
    createdAt: Number(post.createdAt || Date.now()),
  };
}

export default function CommunityPage() {
  const [posts, setPosts] = useState(() => getInitialPosts().map(normalizePost));
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("hot");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const [apiState, setApiState] = useState(hasApi() ? "checking" : "local");
  const [formMessage, setFormMessage] = useState("");
  const username = getUser() || "";

  useEffect(() => {
    if (!hasApi()) return;
    setApiState("checking");
    api.getCommunityPosts({ type: tab, q: query, sort })
      .then((remotePosts) => {
        const normalized = remotePosts.map(normalizePost);
        if (normalized.length) {
          setPosts(normalized);
          saveCommunityPosts(normalized);
        }
        setApiState("online");
      })
      .catch(() => setApiState("offline"));
  }, [query, sort, tab]);

  const filteredPosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return posts
      .filter((post) => tab === "all" || post.type === tab)
      .filter((post) => {
        if (!keyword) return true;
        return [post.movieTitle, post.content, post.nickname, ...(post.tags || [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        if (sort === "new") return b.createdAt - a.createdAt;
        if (sort === "comment") return b.comments.length - a.comments.length;
        return b.likes + b.comments.length * 2 - (a.likes + a.comments.length * 2);
      });
  }, [posts, query, sort, tab]);

  const tags = useMemo(() => {
    const counts = {};
    posts.flatMap((post) => post.tags || []).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [posts]);

  const stats = useMemo(() => {
    const comments = posts.reduce((sum, post) => sum + post.comments.length, 0);
    const likes = posts.reduce((sum, post) => sum + post.likes, 0);
    const averageRating = posts.length
      ? posts.reduce((sum, post) => sum + post.rating, 0) / posts.length
      : 0;
    return { comments, likes, averageRating };
  }, [posts]);

  function sync(next) {
    const normalized = next.map(normalizePost);
    setPosts(normalized);
    saveCommunityPosts(normalized);
  }

  function submitPost(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = String(form.get("content") || "").trim();
    const movieTitle = String(form.get("movieTitle") || "").trim();
    if (content.length < 10 || !movieTitle) {
      setFormMessage("영화 제목과 10자 이상의 감상 내용을 입력해 주세요.");
      return;
    }

    const nextPost = normalizePost({
      id: crypto.randomUUID(),
      type: form.get("type"),
      movieTitle,
      nickname: String(form.get("nickname") || "").trim() || username || "guest",
      rating: Number(form.get("rating")),
      content,
      spoiler: form.get("spoiler") === "on",
      tags: String(form.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 4),
      likes: 0,
      comments: [],
      createdAt: Date.now(),
    });

    sync([nextPost, ...posts]);
    setFormMessage("감상이 등록됐어요.");

    if (hasApi()) {
      api.createCommunityPost({ ...nextPost, user: username || nextPost.nickname })
        .then((savedPost) => sync([normalizePost(savedPost), ...posts.filter((post) => post.id !== nextPost.id)]))
        .catch(() => setApiState("offline"));
    }
    event.currentTarget.reset();
  }

  function likePost(id) {
    sync(posts.map((post) => post.id === id ? { ...post, likes: post.likes + 1 } : post));
    if (hasApi()) {
      api.likeCommunityPost(id, username || "guest")
        .then(({ likes }) => sync(posts.map((post) => post.id === id ? { ...post, likes } : post)))
        .catch(() => setApiState("offline"));
    }
  }

  function submitComment(postId) {
    const content = commentDrafts[postId]?.trim();
    if (!content) return;
    const draftComment = {
      id: crypto.randomUUID(),
      nickname: username || "guest",
      content,
      createdAt: Date.now(),
    };

    sync(posts.map((post) => post.id === postId ? {
      ...post,
      comments: [...post.comments, draftComment],
    } : post));

    if (hasApi()) {
      api.createCommunityComment(postId, {
        user: username || "guest",
        nickname: username || "guest",
        content,
      }).catch(() => setApiState("offline"));
    }
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
  }

  return (
    <main className="container page-content community-page">
      <SectionHeading
        eyebrow="COMMUNITY"
        title="영화 취향을 나누는 커뮤니티"
        description="리뷰, 추천, 토론을 남기고 다른 사용자의 감상에 댓글로 참여할 수 있어요."
      />

      <section className="community-hero">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> SCENE TALK</span>
          <h1>보고 난 장면을 기록하고, 같은 취향의 사람들과 이어져요.</h1>
          <p>스포일러 표기, 별점 리뷰, 태그 검색, 댓글과 좋아요를 통해 영화 감상이 자연스럽게 쌓이는 공간입니다.</p>
        </div>
        <div className="community-stat-card">
          <TrendingUp />
          <strong>{posts.length}</strong>
          <span>등록된 이야기</span>
        </div>
      </section>

      <section className="community-metrics">
        <div><strong>{stats.likes}</strong><span>좋아요</span></div>
        <div><strong>{stats.comments}</strong><span>댓글</span></div>
        <div><strong>{stats.averageRating.toFixed(1)}</strong><span>평균 별점</span></div>
        <div className={`api-chip ${apiState}`}>
          {apiState === "online" ? <Wifi size={17} /> : <WifiOff size={17} />}
          <span>{apiState === "online" ? "PostgreSQL 연결됨" : apiState === "checking" ? "서버 확인 중" : "로컬 저장 모드"}</span>
        </div>
      </section>

      <div className="community-layout">
        <section className="panel community-compose">
          <h2>감상 남기기</h2>
          <form onSubmit={submitPost}>
            <div className="form-row">
              <label>닉네임<input name="nickname" placeholder="guest" defaultValue={username} /></label>
              <label>분류<select name="type" defaultValue="review"><option value="review">리뷰</option><option value="talk">토론</option><option value="recommend">추천</option></select></label>
            </div>
            <div className="form-row">
              <label>영화 제목<input name="movieTitle" placeholder="예: 마이클" required /></label>
              <label>별점<select name="rating" defaultValue="4"><option value="5">★★★★★ 5.0</option><option value="4.5">★★★★☆ 4.5</option><option value="4">★★★★ 4.0</option><option value="3.5">★★★☆ 3.5</option><option value="3">★★★ 3.0</option><option value="2">★★ 2.0</option><option value="1">★ 1.0</option></select></label>
            </div>
            <label>감상<textarea name="content" placeholder="인상 깊었던 장면이나 추천 이유를 적어주세요." required /></label>
            <label>태그<input name="tags" placeholder="음악, 실화, 인생영화" /></label>
            <div className="compose-bottom">
              <label className="spoiler-check"><input name="spoiler" type="checkbox" /> 스포일러 포함</label>
              <button className="btn btn-primary" type="submit"><Send size={16} /> 등록</button>
            </div>
            {formMessage && <p className="compose-message">{formMessage}</p>}
          </form>
        </section>

        <aside className="panel community-sidebar">
          <h2>인기 태그</h2>
          <div className="community-tags">
            {tags.map(([tag, count]) => <button key={tag} onClick={() => setQuery(tag)} type="button">#{tag}<span>{count}</span></button>)}
          </div>
          <div className="community-guide">
            <ShieldAlert />
            <p>스포일러가 포함된 글은 반드시 체크해 주세요. 다른 사용자가 직접 열람할 수 있게 표시됩니다.</p>
          </div>
        </aside>
      </div>

      <section className="community-feed">
        <div className="feed-toolbar">
          <div className="category-tabs">
            {tabs.map(([value, label]) => <button className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)} type="button">{label}</button>)}
          </div>
          <label className="feed-search"><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder="영화, 태그, 내용 검색" value={query} /></label>
          <select onChange={(event) => setSort(event.target.value)} value={sort}><option value="hot">인기순</option><option value="new">최신순</option><option value="comment">댓글순</option></select>
        </div>

        {filteredPosts.length === 0 ? (
          <EmptyState
            title="조건에 맞는 이야기가 없어요"
            description="검색어를 바꾸거나 첫 감상을 직접 남겨보세요."
          />
        ) : (
          <div className="post-list">
            {filteredPosts.map((post) => {
              const isSpoilerHidden = post.spoiler && !revealedSpoilers[post.id];
              return (
                <article className="post-card" key={post.id}>
                  <div className="post-head">
                    <div><strong>{post.nickname}</strong><time>{timeAgo(post.createdAt)}</time></div>
                    <span className={`post-type ${post.type}`}>{typeLabels[post.type] || "리뷰"}</span>
                  </div>
                  <Link className="post-movie" to={`/movies?q=${encodeURIComponent(post.movieTitle)}`}>{post.movieTitle}</Link>
                  <div className="post-rating"><Star size={15} fill="currentColor" /> {post.rating.toFixed(1)}</div>
                  {isSpoilerHidden ? (
                    <button className="spoiler-alert spoiler-button" onClick={() => setRevealedSpoilers((current) => ({ ...current, [post.id]: true }))} type="button">
                      <Eye size={15} /> 스포일러가 포함된 감상입니다. 클릭해서 보기
                    </button>
                  ) : (
                    <p>{post.content}</p>
                  )}
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
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
