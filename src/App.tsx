import { Fragment, lazy, Suspense, type ReactNode } from "react";
import { Route, Routes, useParams } from "react-router";
import Layout from "@/components/Layout";
import { DEFAULT_LOCALE, LOCALES, Navigate } from "@/i18n";
import About from "@/pages/About";
import Atelier, { Boxes } from "@/pages/Atelier";
import Contact from "@/pages/Contact";
import { CreationsParam } from "@/pages/Collection";
import Creations from "@/pages/Creations";
import Home from "@/pages/Home";
import Legal, { Privacy } from "@/pages/Legal";
import NotFound from "@/pages/NotFound";
import PiecePage from "@/pages/PiecePage";
import Players, { PlayerPage } from "@/pages/Players";
import Process from "@/pages/Process";

// The back-office and the private 3D links are loaded only when they are opened.
const Admin = lazy(() => import("@/pages/Admin"));
const ViewLink = lazy(() => import("@/pages/ViewLink"));
const Vip = lazy(() => import("@/pages/Vip"));

/**
 * A page of one piece, person or collection starts afresh when its address
 * changes: the scroll animations (pins, split titles) of the previous one are
 * removed with it instead of being updated in place.
 */
function OnePerAddress({ children }: { children: ReactNode }) {
  const { slug = "" } = useParams();
  return <Fragment key={slug}>{children}</Fragment>;
}

/** The pages of the site, the same in every language: at the root in English, under /fr, /es and /ar. */
function pages(prefix: string) {
  return (
    <>
      <Route index element={<Home />} />
      <Route path="creations" element={<Creations />} />
      <Route path="creations/:slug" element={<OnePerAddress><CreationsParam /></OnePerAddress>} />
      <Route path="pieces" element={<Navigate to="/creations" replace />} />
      <Route path="pieces/:slug" element={<OnePerAddress><PiecePage /></OnePerAddress>} />
      <Route path="capsules/*" element={<Navigate to="/creations" replace />} />
      <Route path="players" element={<Players />} />
      <Route path="players/:slug" element={<OnePerAddress><PlayerPage /></OnePerAddress>} />
      <Route path="atelier" element={<Atelier />} />
      <Route path="boxes" element={<Boxes />} />
      <Route path="process" element={<Process />} />
      <Route path="about" element={<About />} />
      <Route path="contact" element={<Contact />} />
      <Route path="legal" element={<Legal />} />
      <Route path="privacy" element={<Privacy />} />
      {/* The private space of the clients: their pieces in 3D. */}
      <Route path="vip" element={<Suspense fallback={null}><Vip /></Suspense>} />
      <Route path="vip/:token" element={<Suspense fallback={null}><Vip /></Suspense>} />
      <Route path="*" element={<NotFound />} key={prefix + "*"} />
    </>
  );
}

export default function App() {
  const viewLink = <Suspense fallback={null}><ViewLink /></Suspense>;
  return (
    <Routes>
      {/* A private 3D link sent to a client: its own sober page, without the menu of the site. */}
      <Route path="view/:token" element={viewLink} />
      {LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => (
        <Route key={"view-" + l} path={l + "/view/:token"} element={viewLink} />
      ))}
      <Route element={<Layout />}>
        {pages("")}
        {LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => (
          <Route key={l} path={l}>
            {pages(l)}
          </Route>
        ))}
      </Route>
      {/* The back-office, in French for the owner: one address only, its own sober page without the menu of the site. */}
      <Route path="admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
    </Routes>
  );
}
