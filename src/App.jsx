import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import { LoginPage, SignupPage } from "./pages/AuthPages";
import CollectionPage from "./pages/CollectionPage";
import EventsPage from "./pages/EventsPage";
import HomePage from "./pages/HomePage";
import MovieDetailPage from "./pages/MovieDetailPage";
import MoviesPage from "./pages/MoviesPage";
import NotFoundPage from "./pages/NotFoundPage";
import TastePage from "./pages/TastePage";
import CommunityPage from "./pages/CommunityPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/movies", element: <MoviesPage /> },
      { path: "/movies/:movieId", element: <MovieDetailPage /> },
      { path: "/collection", element: <CollectionPage /> },
      { path: "/community", element: <CommunityPage /> },
      { path: "/events", element: <EventsPage /> },
      { path: "/taste", element: <TastePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
