import { useState } from "react";
import { Film, LockKeyhole, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, hasApi } from "../lib/api";
import { getUser, signIn, signUp } from "../lib/storage";

function AuthShell({ type }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const login = type === "login";

  if (getUser()) return <Navigate replace to="/" />;

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = form.get("id").trim();
    const password = form.get("password");
    if (id.length < 3) return setMessage("아이디는 3자 이상 입력해주세요.");
    if (password.length < 6) return setMessage("비밀번호는 6자 이상 입력해주세요.");
    if (!login && password !== form.get("confirm")) return setMessage("비밀번호가 서로 일치하지 않습니다.");
    let result = login ? signIn(id, password) : signUp(id, password);
    if (hasApi()) {
      try {
        await (login ? api.signIn(id, password) : api.signUp(id, password));
        result = { ok: true };
      } catch (error) {
        result = { ok: false, message: error.message };
      }
    }
    if (!result.ok) return setMessage(result.message);
    setSuccess(true);
    setMessage(login ? "로그인되었습니다." : "회원가입이 완료되었습니다.");
    setTimeout(() => navigate(login ? "/" : "/login"), 700);
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-orbit"><Film /></div>
        <div className="auth-visual-copy"><span className="eyebrow"><Sparkles size={14} /> {login ? "WELCOME BACK" : "START YOUR SCENE"}</span><h1>{login ? <>당신의 다음<br />장면으로.</> : <>좋아하는 영화가<br />취향이 되는 곳.</>}</h1><p>{login ? "저장한 영화와 남긴 리뷰를 이어서 만나보세요." : "발견하고, 저장하고, 나만의 감상을 기록하세요."}</p></div>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <span className="auth-symbol"><LockKeyhole /></span>
          <span className="eyebrow">{login ? "SIGN IN" : "CREATE ACCOUNT"}</span>
          <h2>{login ? "다시 만나 반가워요" : "SceneYou 시작하기"}</h2>
          <p>{login ? "SceneYou 계정으로 로그인하세요." : "간단한 정보로 계정을 만들어보세요."}</p>
          <label>아이디<input autoComplete="username" maxLength="20" minLength="3" name="id" placeholder="3자 이상 입력하세요" required /></label>
          <label>비밀번호<input autoComplete={login ? "current-password" : "new-password"} minLength="6" name="password" placeholder="6자 이상 입력하세요" required type="password" /></label>
          {!login && <label>비밀번호 확인<input autoComplete="new-password" minLength="6" name="confirm" placeholder="한 번 더 입력하세요" required type="password" /></label>}
          <div className={`form-message ${success ? "success" : ""}`} role="alert">{message}</div>
          <button className="btn btn-primary" type="submit">{login ? "로그인" : "회원가입"}</button>
          <p className="auth-switch">{login ? "아직 계정이 없나요?" : "이미 계정이 있나요?"} <Link to={login ? "/signup" : "/login"}>{login ? "회원가입" : "로그인"}</Link></p>
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
