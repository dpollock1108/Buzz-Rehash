import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PendingReview from "./pages/PendingReview";
import ApprovedList from "./pages/ApprovedList";
import DeniedList from "./pages/DeniedList";
import CelebrityDetail from "./pages/CelebrityDetail";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pending" element={<PendingReview />} />
        <Route path="/approved" element={<ApprovedList />} />
        <Route path="/denied" element={<DeniedList />} />
        <Route path="/celebrities/:id" element={<CelebrityDetail />} />
      </Route>
    </Routes>
  );
}
