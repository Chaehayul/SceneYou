import { Link } from "react-router-dom";
import { EmptyState } from "../components/UI";

export default function NotFoundPage() {
  return <main className="container page-content"><EmptyState title="이 장면은 찾을 수 없어요" description="주소가 변경되었거나 존재하지 않는 페이지입니다." action={<Link className="btn btn-primary" to="/">홈으로 돌아가기</Link>} /></main>;
}
