import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import Layout from "@/components/Layout";
import About from "@/pages/About";
import Atelier, { Boxes } from "@/pages/Atelier";
import Contact from "@/pages/Contact";
import Creations, { CreationRedirect } from "@/pages/Creations";
import Home from "@/pages/Home";
import Legal, { Privacy } from "@/pages/Legal";
import NotFound from "@/pages/NotFound";
import PiecePage from "@/pages/PiecePage";
import Players, { PlayerPage } from "@/pages/Players";
import Process from "@/pages/Process";

// The back-office is loaded only when it is opened.
const Admin = lazy(() => import("@/pages/Admin"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/creations" element={<Creations />} />
        <Route path="/creations/:slug" element={<CreationRedirect />} />
        <Route path="/pieces" element={<Navigate to="/creations" replace />} />
        <Route path="/pieces/:slug" element={<PiecePage />} />
        <Route path="/capsules/*" element={<Navigate to="/creations" replace />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:slug" element={<PlayerPage />} />
        <Route path="/atelier" element={<Atelier />} />
        <Route path="/boxes" element={<Boxes />} />
        <Route path="/process" element={<Process />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
