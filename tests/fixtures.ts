// Every check runs silent: nothing reaches the speakers of the computer, while the page keeps its sound as it is
// (a video muted or not, the volume it asked for). Chromium: --mute-audio (playwright.config.ts); WebKit (the iPhones),
// which has no such switch: the real volume of every video held at 0, the page reading back the volume it set.
// The specs import `test` and `expect` from here instead of "@playwright/test".
import { test as base, type BrowserContext } from "@playwright/test";

export * from "@playwright/test";

function silent() {
  const proto = HTMLMediaElement.prototype;
  const native = Object.getOwnPropertyDescriptor(proto, "volume");
  if (!native?.get || !native.set) return;
  const { get, set } = native;
  const asked = new WeakMap<HTMLMediaElement, number>();
  const hush = (el: HTMLMediaElement) => {
    if (get.call(el) !== 0) set.call(el, 0);
  };
  Object.defineProperty(proto, "volume", {
    configurable: true,
    enumerable: native.enumerable,
    get(this: HTMLMediaElement) {
      return asked.get(this) ?? 1;
    },
    set(this: HTMLMediaElement, v: number) {
      set.call(this, v); // throws as the browser does for a volume out of 0–1
      asked.set(this, v);
      hush(this);
    },
  });
  const play = proto.play;
  proto.play = function (this: HTMLMediaElement) {
    hush(this);
    return play.call(this);
  };
  // The videos that start by themselves (autoplay) never call play(): held at 0 as soon as they load.
  for (const type of ["loadstart", "play"]) {
    document.addEventListener(type, (e) => (e.target instanceof HTMLMediaElement ? hush(e.target) : undefined), true);
  }
}

/** Silences a context made by hand (browser.newContext()). */
export const silence = (context: BrowserContext) => context.addInitScript(silent);

export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    await silence(context);
    // The site under construction (server/access.ts): ACCESS_PASSWORD (given in the Terminal, never written anywhere)
    // enters it as a visitor who typed the private password (the cookie is shared with the pages of this context).
    if (process.env.ACCESS_PASSWORD && baseURL) {
      await context.request.post(new URL("/api/access", baseURL).href, { form: { password: process.env.ACCESS_PASSWORD, next: "/" }, maxRedirects: 0 });
    }
    await use(context);
  },
});
