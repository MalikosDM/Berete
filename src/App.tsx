import { Fragment, Suspense, useEffect, type ReactNode } from "react";
import { Route, Routes, useParams } from "react-router";
import Layout from "@/components/Layout";
import Logo from "@/components/Logo";
import { lazyPart } from "@/lib/lazy";
import { PRIVATE_ONLY } from "@/lib/private";
import { DEFAULT_LOCALE, LOCALES, Navigate } from "@/i18n";
import About from "@/pages/About";
import Atelier, { Boxes } from "@/pages/Atelier";
import Contact from "@/pages/Contact";
import { CreationsParam, CreationsSubParam } from "@/pages/Collection";
import Creations from "@/pages/Creations";
import Home from "@/pages/Home";
import Legal, { Privacy } from "@/pages/Legal";
import NotFound from "@/pages/NotFound";
import PiecePage from "@/pages/PiecePage";
import Press from "@/pages/Press";
import Players, { PlayerPage } from "@/pages/Players";
import Process from "@/pages/Process";

// The back-office and the private 3D links are loaded only when they are opened.
const Admin = lazyPart(() => import("@/pages/Admin"));
const ViewLink = lazyPart(() => import("@/pages/ViewLink"));
// The embed code of a 3D link (/embed/<token>): the viewer alone, in a frame of another site.
const Embed3D = lazyPart(() => import("@/pages/Embed3D"));
// A share link sealed on the admin's device (/s/<token>): decrypted in the browser of the client.
const SealedView = lazyPart(() => import("@/pages/SealedView"));
const Vip = lazyPart(() => import("@/pages/Vip"));
// The 3D lab (pictures of the editor, comparisons of the diamonds): on the Mac only, never in the built site.
const Lab3D = import.meta.env.DEV ? lazyPart(() => import("@/pages/Lab3D")) : null;

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
      <Route path="creations/:slug/:sub" element={<OnePerAddress><CreationsSubParam /></OnePerAddress>} />
      <Route path="pieces" element={<Navigate to="/creations" replace />} />
      <Route path="pieces/:slug" element={<OnePerAddress><PiecePage /></OnePerAddress>} />
      <Route path="capsules/*" element={<Navigate to="/creations" replace />} />
      <Route path="players" element={<Players />} />
      <Route path="players/:slug" element={<OnePerAddress><PlayerPage /></OnePerAddress>} />
      <Route path="atelier" element={<Atelier />} />
      <Route path="boxes" element={<Boxes />} />
      {/* The boxes have no page of their own: an old address (a box removed by Yoni) leads to the page of the trunks. */}
      <Route path="boxes/:slug" element={<Navigate to="/boxes" replace />} />
      <Route path="process" element={<Process />} />
      <Route path="about" element={<About />} />
      <Route path="press" element={<Press />} />
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

/** Any other address, from a private page opened alone: the server decides (« Coming soon » for this visitor). */
function Elsewhere() {
  useEffect(() => {
    window.location.reload();
  }, []);
  return null;
}

/**
 * A private page opened alone, while the site is under construction (src/lib/private.ts): the 3D link (or its embed code)
 * or the client space, with the logo of the house only; no menu, no other page of the site.
 */
function PrivateApp() {
  const viewLink = <Suspense fallback={null}><ViewLink /></Suspense>;
  const sealed = <Suspense fallback={null}><SealedView /></Suspense>;
  const embed = <Suspense fallback={null}><Embed3D /></Suspense>;
  const vip = (
    <div className="min-h-svh bg-ink" data-private-page>
      <header className="flex justify-center px-5 pt-8">
        <Logo variant="full" position="center" className="h-12 w-48 sm:h-14 sm:w-56" />
      </header>
      <Suspense fallback={null}>
        <Vip />
      </Suspense>
    </div>
  );
  return (
    <Routes>
      {["", ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => l + "/")].map((prefix) => (
        <Fragment key={"private-" + prefix}>
          <Route path={prefix + "view/:token"} element={viewLink} />
          <Route path={prefix + "embed/:token"} element={embed} />
          <Route path={prefix + "s/:token"} element={sealed} />
          <Route path={prefix + "vip"} element={vip} />
          <Route path={prefix + "vip/:token"} element={vip} />
        </Fragment>
      ))}
      <Route path="*" element={<Elsewhere />} />
    </Routes>
  );
}

export default function App() {
  if (PRIVATE_ONLY) return <PrivateApp />;
  const viewLink = <Suspense fallback={null}><ViewLink /></Suspense>;
  const sealed = <Suspense fallback={null}><SealedView /></Suspense>;
  const embed = <Suspense fallback={null}><Embed3D /></Suspense>;
  return (
    <Routes>
      {/* A private 3D link sent to a client: its own sober page, without the menu of the site. */}
      <Route path="view/:token" element={viewLink} />
      {LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => (
        <Route key={"view-" + l} path={l + "/view/:token"} element={viewLink} />
      ))}
      {/* The embed code of a 3D link: the viewer alone, as large as the frame of the other site. */}
      <Route path="embed/:token" element={embed} />
      {LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => (
        <Route key={"embed-" + l} path={l + "/embed/:token"} element={embed} />
      ))}
      {/* A share link sealed on the admin's device: its own sober page too (it speaks the language of the browser). */}
      <Route path="s/:token" element={sealed} />
      {LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => (
        <Route key={"s-" + l} path={l + "/s/:token"} element={sealed} />
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
      {Lab3D ? <Route path="lab3d" element={<Suspense fallback={null}><Lab3D /></Suspense>} /> : null}
    </Routes>
  );
}
