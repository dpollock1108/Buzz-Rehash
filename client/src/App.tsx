import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import AdminGuard from "./components/AdminGuard";
import Dashboard from "./pages/Dashboard";
import Influencers from "./pages/Influencers";
import CelebrityDetail from "./pages/CelebrityDetail";
import Feed from "./pages/Feed";
import Events from "./pages/Events";
import Relationships from "./pages/Relationships";
import PublicFeed from "./pages/PublicFeed";
import PublicCelebrity from "./pages/PublicCelebrity";

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicFeed />} />
        <Route path="/celebrity/:id" element={<PublicCelebrity />} />
      </Route>

      {/* Admin console */}
      <Route path="/admin" element={<AdminGuard />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="influencers" element={<Influencers />} />
          <Route path="celebrities/:id" element={<CelebrityDetail />} />
          <Route path="feed" element={<Feed />} />
          <Route path="events" element={<Events />} />
          <Route path="relationships" element={<Relationships />} />
        </Route>
      </Route>
    </Routes>
  );
}
