import { lazy, Suspense } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
const AIRecommendPage = lazy(() => import("@/pages/AIRecommendPage/AIRecommendPage"));
const MenuLibraryPage = lazy(() => import("@/pages/MenuLibraryPage/MenuLibraryPage"));
const BrandPage = lazy(() => import("@/pages/BrandPage/BrandPage"));
const ProjectPage = lazy(() => import("@/pages/ProjectPage/ProjectPage"));
const PersonalityPage = lazy(() => import("@/pages/PersonalityPage/PersonalityPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage/AdminPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage/OrdersPage"));
const MePage = lazy(() => import("@/pages/MePage/MePage"));

function OrdersRoute() {
  const { hash } = useLocation();
  return hash === '#memory' ? <Navigate to="/me#memory" replace /> : <OrdersPage />;
}

export default function App() {
  return (
    <>
      <Suspense fallback={<div role="status" className="min-h-[60vh] grid place-items-center text-muted-foreground">正在打开茶饮空间…</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<MenuLibraryPage />} />
            <Route path="menu" element={<MenuLibraryPage />} />
            <Route path="ai-recommend" element={<AIRecommendPage />} />
            <Route path="me" element={<MePage />} />
            <Route path="brand" element={<BrandPage />} />
            <Route path="orders" element={<OrdersRoute />} />
            <Route path="personality" element={<PersonalityPage />} />
            <Route path="project" element={<ProjectPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" />
    </>
  );
}
