const API_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p";

export async function tmdb(path, params = {}, signal) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB API 키가 설정되지 않았습니다.");
  }

  const url = new URL(`${API_URL}${path}`);
  url.search = new URLSearchParams({
    api_key: apiKey,
    language: "ko-KR",
    region: "KR",
    ...params,
  });

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("영화 정보를 불러오지 못했습니다.");
  }
  return response.json();
}

export function imageUrl(path, size = "w500") {
  return path ? `${IMAGE_URL}/${size}${path}` : "";
}

export function movieYear(date) {
  return date?.slice(0, 4) || "개봉 미정";
}

export function movieScore(score) {
  return Number(score || 0).toFixed(1);
}

export function normalizeMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    genre_ids: movie.genre_ids || movie.genres?.map((genre) => genre.id) || [],
  };
}
