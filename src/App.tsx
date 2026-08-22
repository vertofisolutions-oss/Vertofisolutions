import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const HomePage = lazy(() => import("@/app/page"));
const AboutPage = lazy(() => import("@/app/about/page"));
const PricingPage = lazy(() => import("@/app/pricing/page"));
const FeaturesPage = lazy(() => import("@/app/features/page"));
const BlogPage = lazy(() => import("@/app/blog/page"));
const ContactPage = lazy(() => import("@/app/contact/page"));
const BhsScorePage = lazy(() => import("@/app/bhs/page"));

const WorkspacePage = lazy(() => import("@/app/workspace/page"));
const DashboardPage = lazy(() => import("@/app/dashboard/page"));

const AssociatesPage = lazy(() => import("@/app/associates/page"));
const AssociatesLoginPage = lazy(() => import("@/app/associates/login/page"));
const AssociatesRegisterPage = lazy(() => import("@/app/associates/register/page"));

const AccountantsPage = lazy(() => import("@/app/accountants/page"));
const AccountantsLoginPage = lazy(() => import("@/app/accountants/login/page"));

const BhsPortalPage = lazy(() => import("@/app/bhs-portal/page"));
const BhsPortalLoginPage = lazy(() => import("@/app/bhs-portal/login/page"));

const LegalPortalPage = lazy(() => import("@/app/legal-portal/page"));
const LegalPortalLoginPage = lazy(() => import("@/app/legal-portal/login/page"));

const TeamsPortalPage = lazy(() => import("@/app/teams-portal/page"));
const TeamsPortalLoginPage = lazy(() => import("@/app/teams-portal/login/page"));

const AdminPage = lazy(() => import("@/app/admin/page"));
const AdminLoginPage = lazy(() => import("@/app/admin/login/page"));

const LoginPage = lazy(() => import("@/app/login/page"));
const RegisterPage = lazy(() => import("@/app/register/page"));
const OnboardingPage = lazy(() => import("@/app/onboarding/page"));
const SubscribePage = lazy(() => import("@/app/subscribe/page"));
const ResetPage = lazy(() => import("@/app/reset/page"));
const ReactivatePage = lazy(() => import("@/app/reactivate/page"));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm tracking-wide">Loading Vertofi...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/bhs" element={<BhsScorePage />} />

          {/* 5 Service Panels */}
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/associates" element={<AssociatesPage />} />
          <Route path="/associates/login" element={<AssociatesLoginPage />} />
          <Route path="/associates/register" element={<AssociatesRegisterPage />} />

          <Route path="/accountants" element={<AccountantsPage />} />
          <Route path="/accountants/login" element={<AccountantsLoginPage />} />

          <Route path="/bhs-portal" element={<BhsPortalPage />} />
          <Route path="/bhs-portal/login" element={<BhsPortalLoginPage />} />

          <Route path="/legal-portal" element={<LegalPortalPage />} />
          <Route path="/legal-portal/login" element={<LegalPortalLoginPage />} />

          <Route path="/teams-portal" element={<TeamsPortalPage />} />
          <Route path="/teams-portal/login" element={<TeamsPortalLoginPage />} />

          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Auth & Onboarding */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="/reactivate" element={<ReactivatePage />} />

          {/* Catch all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
