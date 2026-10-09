import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import HomePage from "@/pages/HomePage/HomePage";
const AIRecommendPage = lazy(() => import("@/pages/AIRecommendPage/AIRecommendPage"));
const MenuLibraryPage = lazy(() => import("@/pages/MenuLibraryPage/MenuLibraryPage"));
const ProjectPage = lazy(() => import("@/pages/ProjectPage/ProjectPage"));
const PersonalityPage = lazy(() => import("@/pages/PersonalityPage/PersonalityPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage/AdminPage"));
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <>
      <Suspense fallback={<div role="status" className="min-h-[60vh] grid place-items-center text-muted-foreground">正在打开茶饮空间…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
           <Route path="ai-recommend" element={<AIRecommendPage />} />
           <Route path="personality" element={<PersonalityPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="menu" element={<MenuLibraryPage />} />
          <Route path="project" element={<ProjectPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      <Toaster position="top-center" />
    </>
  );
}
