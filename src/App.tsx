import { Navigate, Route, Routes } from "react-router";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Creations, { Capsule } from "@/pages/Creations";
import Players, { PlayerPage } from "@/pages/Players";
import Atelier, { Boxes } from "@/pages/Atelier";
import Process from "@/pages/Process";
import CapsulePage from "@/pages/CapsulePage";
import JewelPage from "@/pages/JewelPage";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Legal, { Privacy } from "@/pages/Legal";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/creations" element={<Creations />} />
        <Route path="/creations/:slug" element={<Capsule />} />
        <Route path="/capsules/:slug" element={<CapsulePage />} />
        <Route path="/pieces" element={<Navigate to="/creations" replace />} />
        <Route path="/pieces/:slug" element={<JewelPage />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:slug" element={<PlayerPage />} />
        <Route path="/atelier" element={<Atelier />} />
        <Route path="/boxes" element={<Boxes />} />
        <Route path="/process" element={<Process />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

