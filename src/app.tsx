import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import HomePage from "@/pages/HomePage/HomePage";
import AIRecommendPage from "@/pages/AIRecommendPage/AIRecommendPage";
import MenuLibraryPage from "@/pages/MenuLibraryPage/MenuLibraryPage";
import ProjectPage from "@/pages/ProjectPage/ProjectPage";
import PersonalityPage from "@/pages/PersonalityPage/PersonalityPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
           <Route path="ai-recommend" element={<AIRecommendPage />} />
           <Route path="personality" element={<PersonalityPage />} />
          <Route path="menu" element={<MenuLibraryPage />} />
          <Route path="project" element={<ProjectPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  );
}
