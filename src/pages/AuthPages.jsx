import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Film, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, hasApi } from "../lib/api";
import { getUser, setCurrentUser, signIn, signUp } from "../lib/storage";

const DEMO_ACCOUNT = { id: "demo", password: "demo123" };
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function getPasswordLevel(password) {
  return [
    password.length >= 6,
    /[a-zA-Z]/.test(password),
    /[0-9]/.test(password),
  ].filter(Boolean).length;
}

function AuthShell({ type }) {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const login = type === "login";
  const passwordLevel = useMemo(() => getPasswordLevel(password), [password]);

  if (getUser()) return <Navigate replace to="/" />;

  function fillDemoAccount() {
    if (!formRef.current) return;
    formRef.current.elements.id.value = DEMO_ACCOUNT.id;
    formRef.current.elements.password.value = DEMO_ACCOUNT.password;
    setPassword(DEMO_ACCOUNT.password);
    setSuccess(false);
    setMessage("체험 계정이 입력됐어요. 로그인 버튼을 눌러주세요.");
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const id = String(form.get("id") || "").trim();
    const currentPassword = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirm") || "");

    setSuccess(false);
    setMessage("");

    if (!USERNAME_PATTERN.test(id)) {
      setMessage("아이디는 영문, 숫자, 밑줄(_) 조합으로 3~20자까지 입력해 주세요.");
      return;
    }
    if (currentPassword.length < 6) {
      setMessage("비밀번호는 6자 이상 입력해 주세요.");
      return;
    }
    if (!login && currentPassword !== confirmPassword) {
      setMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      if (hasApi()) {
        await (login ? api.signIn(id, currentPassword) : api.signUp(id, currentPassword));
        if (login) setCurrentUser(id);
      } else {
        const result = login ? signIn(id, currentPassword) : signUp(id, currentPassword);
        if (!result.ok) throw new Error(result.message);
      }

      setSuccess(true);
      setMessage(login ? "로그인되었습니다." : "회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.");
      setTimeout(() => navigate(login ? "/" : "/login"), 750);
    } catch (error) {
      setMessage(error.message || "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-orbit"><Film /></div>
        <div className="auth-visual-copy">
          <span className="eyebrow"><Sparkles size={14} /> {login ? "WELCOME BACK" : "START YOUR SCENE"}</span>
          <h1>{login ? <>다시 만나는<br />나의 영화 기록.</> : <>좋아하는 영화가<br />취향이 되는 곳.</>}</h1>
          <p>{login ? "저장한 영화와 리뷰, 커뮤니티 활동을 이어서 확인해보세요." : "컬렉션, 리뷰, 커뮤니티 활동을 SceneYou 계정으로 관리해보세요."}</p>
        </div>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit} ref={formRef}>
          <span className="auth-symbol"><LockKeyhole /></span>
          <span className="eyebrow">{login ? "SIGN IN" : "CREATE ACCOUNT"}</span>
          <h2>{login ? "로그인" : "회원가입"}</h2>
          <p>{login ? "SceneYou 계정으로 나의 영화 취향을 이어가세요." : "간단한 정보로 계정을 만들고 영화 취향을 기록하세요."}</p>

          {login && (
            <div className="demo-account-box">
              <div>
                <strong>빠른 체험용 계정</strong>
                <p>ID: {DEMO_ACCOUNT.id} · PW: {DEMO_ACCOUNT.password}</p>
              </div>
              <button onClick={fillDemoAccount} type="button">체험 계정 입력</button>
            </div>
          )}

          <label>
            아이디
            <input
              autoComplete="username"
              maxLength="20"
              minLength="3"
              name="id"
              placeholder="영문, 숫자 3자 이상"
              required
            />
          </label>

          <label>
            비밀번호
            <span className="password-field">
              <input
                autoComplete={login ? "current-password" : "new-password"}
                minLength="6"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6자 이상 입력"
                required
                type={showPassword ? "text" : "password"}
              />
              <button onClick={() => setShowPassword((current) => !current)} type="button" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {!login && (
            <>
              <div className={`password-strength level-${passwordLevel}`}>
                <span />
                <span />
                <span />
              </div>
              <div className="auth-checklist">
                <span className={password.length >= 6 ? "active" : ""}><CheckCircle2 size={14} /> 6자 이상</span>
                <span className={/[a-zA-Z]/.test(password) ? "active" : ""}><CheckCircle2 size={14} /> 영문 포함</span>
                <span className={/[0-9]/.test(password) ? "active" : ""}><CheckCircle2 size={14} /> 숫자 포함</span>
              </div>
              <label>
                비밀번호 확인
                <input
                  autoComplete="new-password"
                  minLength="6"
                  name="confirm"
                  placeholder="한 번 더 입력"
                  required
                  type={showPassword ? "text" : "password"}
                />
              </label>
            </>
          )}

          <div className={`form-message ${success ? "success" : ""}`} role="alert">{message}</div>
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading && <LoaderCircle className="spin" size={17} />}
            {login ? "로그인" : "회원가입"}
          </button>
          <p className="auth-switch">
            {login ? "아직 계정이 없나요?" : "이미 계정이 있나요?"}{" "}
            <Link to={login ? "/signup" : "/login"}>{login ? "회원가입" : "로그인"}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export function LoginPage() {
  return <AuthShell type="login" />;
}

export function SignupPage() {
  return <AuthShell type="signup" />;
}
