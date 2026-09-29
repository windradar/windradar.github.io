import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ConsentProvider } from "@/hooks/useConsent";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CookieBanner } from "@/components/CookieBanner";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { lazy, Suspense } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import Index from "./pages/Index.tsx";

const Auth            = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword   = lazy(() => import("./pages/ResetPassword.tsx"));
const Profile         = lazy(() => import("./pages/Profile.tsx"));
const Sessions        = lazy(() => import("./pages/Sessions.tsx"));
const Materials       = lazy(() => import("./pages/Materials.tsx"));
const StoryCardEditor = lazy(() => import("./pages/StoryCardEditor.tsx"));
const NotFound        = lazy(() => import("./pages/NotFound.tsx"));
const Notice          = lazy(() => import("./pages/legal/Notice.tsx"));
const Privacy         = lazy(() => import("./pages/legal/Privacy.tsx"));
const Cookies         = lazy(() => import("./pages/legal/Cookies.tsx"));
const Terms           = lazy(() => import("./pages/legal/Terms.tsx"));
const Help            = lazy(() => import("./pages/Help.tsx"));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

// Only the reduced feature set (no layout/drag); `strict` rejects a stray full `motion` component
const App = () => (
  <LazyMotion features={domAnimation} strict>
    <TooltipProvider>
      <Toaster />
      <PwaUpdatePrompt />
      <BrowserRouter>
        <ConsentProvider>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
                <Route path="/sessions/card" element={<ProtectedRoute><StoryCardEditor /></ProtectedRoute>} />
                <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
                <Route path="/help" element={<Help />} />
                <Route path="/legal/notice" element={<Notice />} />
                <Route path="/legal/privacy" element={<Privacy />} />
                <Route path="/legal/cookies" element={<Cookies />} />
                <Route path="/legal/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CookieBanner />
          </AuthProvider>
        </ConsentProvider>
      </BrowserRouter>
    </TooltipProvider>
  </LazyMotion>
);

export default App;
