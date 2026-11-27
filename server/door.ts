/*
 * The one page a visitor without access sees while the site is under construction (server/access.ts): black, the monogram
 * BRT, BERETE JEWELLERS, « Coming soon », the signature of the house and its Instagram; at the very bottom a discreet
 * « Private access » that opens one password field. In French when the browser is in French, else in English. Nothing of
 * the site (no piece, no text, no link inside): its files are its own (public/soon, npm run soon).
 * Two variants with the same look: the door of the admin (/admin, its password, in French) and of the client space (/vip,
 * sign-in of a client of The Private Atelier: his e-mail and password, his second factor, a sign-in link, or an older access code).
 */
import "./globals.js";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../src/lib/site.js";

export type DoorLang = "en" | "fr";
export type DoorMode = "soon" | "admin" | "vip";

const WORDS = {
  en: {
    title: "Berete Jewellers — Coming soon",
    soon: "Coming soon",
    signature: "Made by us. Inspired by you.",
    privateAccess: "Private access",
    password: "Password",
    enter: "Enter",
    wrong: "Incorrect password.",
    tooMany: "Too many attempts. Please try again in a minute.",
    client: "Client access",
    code: "Access code",
    wrongCode: "This code is not recognised.",
    failed: "Something went wrong. Please try again.",
    email: "E-mail",
    signIn: "Sign in",
    wrongSignIn: "E-mail or password not recognised.",
    paused: "Your access is paused. Please contact BERETE.",
    twoFactor: "Enter the 6-digit code",
    twoFactorEmail: "We sent a code to your e-mail.",
    twoFactorApp: "Open your authenticator app.",
    confirm: "Confirm",
    wrongCodeShort: "This code is not right.",
    expired: "This step has expired. Please sign in again.",
    magic: "E-mail me a sign-in link",
    magicSent: "If this e-mail has an access, a sign-in link is on its way.",
    useCode: "I have an access code",
    usePassword: "Sign in with my e-mail",
  },
  fr: {
    title: "Berete Jewellers — Bientôt disponible",
    soon: "Bientôt disponible",
    signature: "Créé par nous. Inspiré par vous.",
    privateAccess: "Accès privé",
    password: "Mot de passe",
    enter: "Entrer",
    wrong: "Mot de passe incorrect.",
    tooMany: "Trop d'essais. Réessayez dans une minute.",
    client: "Accès client",
    code: "Code d'accès",
    wrongCode: "Ce code n'est pas reconnu.",
    failed: "Une erreur est survenue. Réessayez.",
    email: "E-mail",
    signIn: "Se connecter",
    wrongSignIn: "E-mail ou mot de passe non reconnu.",
    paused: "Votre accès est suspendu. Contactez BERETE.",
    twoFactor: "Saisissez le code à 6 chiffres",
    twoFactorEmail: "Nous avons envoyé un code à votre e-mail.",
    twoFactorApp: "Ouvrez votre application d'authentification.",
    confirm: "Confirmer",
    wrongCodeShort: "Ce code n'est pas le bon.",
    expired: "Cette étape a expiré. Reconnectez-vous.",
    magic: "Recevoir un lien de connexion par e-mail",
    magicSent: "Si cet e-mail a un accès, un lien de connexion vous attend.",
    useCode: "J'ai un code d'accès",
    usePassword: "Me connecter avec mon e-mail",
  },
} as const;

export type DoorMessage = "wrong" | "tooMany";

/** The language of the browser: French when French comes first among its languages, else English. */
export function doorLang(header: string | undefined): DoorLang {
  const first = (header ?? "")
    .split(",")
    .map((part, i) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((l) => l.tag !== "" && l.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)[0];
  return first?.tag.startsWith("fr") ? "fr" : "en";
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const STYLE = `
@font-face{font-family:"Cormorant Garamond";font-style:normal;font-weight:300;font-display:swap;src:url(/soon/cormorant-garamond-300.woff2) format("woff2")}
@font-face{font-family:"Cormorant Garamond";font-style:italic;font-weight:300;font-display:swap;src:url(/soon/cormorant-garamond-300-italic.woff2) format("woff2")}
@font-face{font-family:Manrope;font-style:normal;font-weight:400;font-display:swap;src:url(/soon/manrope-400.woff2) format("woff2")}
@font-face{font-family:Manrope;font-style:normal;font-weight:500;font-display:swap;src:url(/soon/manrope-500.woff2) format("woff2")}
:root{color-scheme:dark;--ink:#0A0A0A;--bone:#F4F2EF;--mist:#D6D2CC;--rose:#E8B4A0;--display:"Cormorant Garamond","Times New Roman",Georgia,serif;--sans:Manrope,ui-sans-serif,system-ui,-apple-system,sans-serif}
*{box-sizing:border-box}
html{background:var(--ink)}
body{margin:0;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;background:var(--ink) radial-gradient(ellipse 60% 45% at 50% 42%,rgb(183 110 121 / .07),transparent 70%) no-repeat;color:var(--bone);font-family:var(--sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:max(56px,env(safe-area-inset-top)) 24px 32px;animation:in 1.8s ease both}
.mono{display:block;width:clamp(124px,15vw,176px);height:auto}
h1{margin:44px 0 0;padding-left:.34em;font-family:var(--display);font-weight:300;font-size:clamp(1.375rem,2.4vw,2.125rem);line-height:1.1;letter-spacing:.34em;text-transform:uppercase;color:#fff}
.rule{width:44px;height:1px;margin:30px auto 0;background:linear-gradient(90deg,#9C5B4F,#E8B4A0,#B76E79)}
.soon{margin:26px 0 0;padding-left:.26em;font-size:1rem;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose)}
.sig{margin:30px 0 0;font-family:var(--display);font-style:italic;font-weight:300;font-size:clamp(1.1875rem,1.5vw,1.5rem);color:var(--mist)}
.ig{display:inline-flex;align-items:center;min-height:48px;margin-top:22px;color:var(--bone);font-size:1rem;letter-spacing:.06em;text-decoration:none}
.ig span{border-bottom:1px solid rgb(232 180 160 / .5);padding-bottom:3px;transition:border-color .6s ease,color .6s ease}
.ig:hover span,.ig:focus-visible span{color:var(--rose);border-color:var(--rose)}
footer{padding:0 24px max(24px,env(safe-area-inset-bottom));text-align:center;animation:in 2.4s ease both}
summary{display:inline-flex;align-items:center;min-height:48px;list-style:none;cursor:pointer;color:rgb(244 242 239 / .58);font-size:1rem;letter-spacing:.16em;text-transform:uppercase;transition:color .6s ease}
summary::-webkit-details-marker{display:none}
summary:hover,details[open] summary{color:var(--rose)}
form{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;gap:14px 16px;margin:10px auto 8px;max-width:420px}
label{flex:1 1 220px;text-align:left}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
input{width:100%;min-height:48px;padding:0 4px;border:0;border-bottom:1px solid rgb(244 242 239 / .35);border-radius:0;background:transparent;color:#fff;font:400 1rem var(--sans);letter-spacing:.08em;text-align:center;transition:border-color .6s ease}
input::placeholder{color:rgb(244 242 239 / .5)}
input:focus{outline:none;border-color:var(--rose)}
button{min-height:48px;padding:0 26px;border:1px solid rgb(232 180 160 / .55);background:transparent;color:#fff;font:400 1rem var(--sans);letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:border-color .6s ease,color .6s ease}
button:hover,button:focus-visible{border-color:var(--rose);color:var(--rose);outline:none}
button[disabled]{opacity:.6;cursor:default}
.msg{min-height:24px;margin:6px 0 0;color:var(--rose);font-size:1rem}
.panel{width:100%;max-width:420px;margin-top:40px}
#signin,#code,#door{flex-direction:column;align-items:stretch}#signin label,#code label,#door label{flex:0 0 auto}
.note{margin:0;color:var(--mist);font-size:1rem}
.links{display:flex;flex-direction:column;align-items:center;gap:2px;margin:18px 0 0}
button.link{min-height:44px;padding:0 6px;border:0;color:rgb(244 242 239 / .62);font-size:.9375rem;letter-spacing:.04em;text-transform:none}
button.link:hover,button.link:focus-visible{color:var(--rose)}
[hidden]{display:none!important}
.panel .eyebrow{margin:0 0 6px;font-size:1rem;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--rose)}
:focus-visible{outline:1px solid var(--rose);outline-offset:4px}
@media (min-width:1024px){.soon,.panel .eyebrow{font-size:.75rem;letter-spacing:.3em}summary{font-size:.75rem;letter-spacing:.24em}.ig,input,.msg{font-size:.9375rem}button{min-height:44px;font-size:.75rem;letter-spacing:.2em}}
@keyframes in{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){main,footer{animation:none}}
`;

/** The script of the doors of the admin and of the client space: their own API, then the page again (now open). */
function script(mode: "admin" | "vip", w: (typeof WORDS)[DoorLang]): string {
  const call =
    mode === "admin"
      ? `fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:f.password.value})}).then(function(r){return r.json().then(function(j){if(r.ok&&j.token){try{sessionStorage.setItem("bj-admin-token",j.token)}catch(e){}location.reload();return}fail(j.error||${JSON.stringify(w.wrong)})})})`
      : `fetch("/api/vip/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:f.code.value})}).then(function(r){return r.json().then(function(j){if(j.state==="ok"){location.reload();return}fail(${JSON.stringify(w.wrongCode)})})})`;
  return `<script>(function(){var f=document.getElementById("door"),m=document.getElementById("msg"),b=f.querySelector("button");function fail(t){m.textContent=t;b.disabled=false}f.addEventListener("submit",function(e){e.preventDefault();m.textContent="";b.disabled=true;${call}.catch(function(){fail(${JSON.stringify(w.failed)})})})})();</script>`;
}

/** The script of the client door: sign in, second factor, sign-in link, older access code; then the page again (now open). */
function clientScript(w: (typeof WORDS)[DoorLang]): string {
  const J = (v: string) => JSON.stringify(v);
  return `<script>(function(){var $=function(i){return document.getElementById(i)},s=$("signin"),c=$("code"),d=$("door"),m=$("msg"),ch="";
function post(u,b){return fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){return r.json()})}
function busy(f,on){var b=f.querySelector("button");if(b)b.disabled=on}
function fail(f,t){m.textContent=t;busy(f,false)}
s.addEventListener("submit",function(e){e.preventDefault();m.textContent="";busy(s,true);post("/api/vip/atelier/signin",{email:s.email.value,password:s.password.value}).then(function(j){
if(j.state==="ok"){location.reload();return}
if(j.state==="code"){ch=j.challenge;s.hidden=true;c.hidden=false;$("codenote").textContent=j.via==="totp"?${J(w.twoFactorApp)}:${J(w.twoFactorEmail)};c.code.focus();busy(s,false);return}
fail(s,j.state==="paused"?${J(w.paused)}:j.state==="wait"?${J(w.tooMany)}:${J(w.wrongSignIn)})}).catch(function(){fail(s,${J(w.failed)})})});
c.addEventListener("submit",function(e){e.preventDefault();m.textContent="";busy(c,true);post("/api/vip/atelier/signin/code",{challenge:ch,code:c.code.value}).then(function(j){
if(j.state==="ok"){location.reload();return}
if(j.state==="expired"){c.hidden=true;s.hidden=false;fail(c,${J(w.expired)});return}
fail(c,j.state==="wait"?${J(w.tooMany)}:${J(w.wrongCodeShort)})}).catch(function(){fail(c,${J(w.failed)})})});
d.addEventListener("submit",function(e){e.preventDefault();m.textContent="";busy(d,true);post("/api/vip/login",{code:d.code.value}).then(function(j){if(j.state==="ok"){location.reload();return}fail(d,${J(w.wrongCode)})}).catch(function(){fail(d,${J(w.failed)})})});
$("magic").addEventListener("click",function(){if(!s.email.value){s.email.focus();return}m.textContent="";post("/api/vip/atelier/magic",{email:s.email.value}).then(function(j){m.textContent=j.state==="wait"?${J(w.tooMany)}:${J(w.magicSent)}}).catch(function(){m.textContent=${J(w.failed)}})});
$("legacy").addEventListener("click",function(){var l=d.hidden;d.hidden=!l;s.hidden=l;c.hidden=true;this.textContent=l?${J(w.usePassword)}:${J(w.useCode)};m.textContent=""});
})();</script>`;
}

export function doorPage(opts: { lang: DoorLang; mode: DoorMode; next?: string; message?: DoorMessage; origin: string }): string {
  const lang: DoorLang = opts.mode === "admin" ? "fr" : opts.lang;
  const w = WORDS[lang];
  const message = opts.message ? w[opts.message] : "";
  const brand = `<img class="mono" src="/soon/monogram.svg" width="176" height="130" alt="Berete Jewellers"><h1>Berete Jewellers</h1><div class="rule" aria-hidden="true"></div>`;
  let body: string;
  if (opts.mode === "soon") {
    body =
      `<main>${brand}<p class="soon">${w.soon}</p><p class="sig">${w.signature}</p>` +
      `<a class="ig" href="${escape(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer"><span>@${escape(INSTAGRAM_HANDLE)}</span></a></main>` +
      `<footer><details${message ? " open" : ""}><summary>${w.privateAccess}</summary>` +
      `<form method="post" action="/api/access" id="door"><input type="hidden" name="next" value="${escape(opts.next ?? "/")}">` +
      `<label><span class="sr">${w.password}</span><input type="password" name="password" autocomplete="current-password" placeholder="${w.password}" required${message ? " autofocus" : ""}></label>` +
      `<button type="submit">${w.enter}</button></form>` +
      `<p class="msg" id="msg" role="alert">${message}</p></details></footer>`;
  } else if (opts.mode === "vip") {
    // The Private Atelier (27/11/2026): his e-mail and password, then his second factor if he chose one; a sign-in link by
    // e-mail; the access code of the older client spaces.
    body =
      `<main>${brand}<div class="panel"><p class="eyebrow">${w.client}</p>` +
      `<form id="signin"><label><span class="sr">${w.email}</span><input type="email" name="email" autocomplete="username" placeholder="${w.email}" required autofocus></label>` +
      `<label><span class="sr">${w.password}</span><input type="password" name="password" autocomplete="current-password" placeholder="${w.password}" required></label>` +
      `<button type="submit">${w.signIn}</button></form>` +
      `<form id="code" hidden><p class="note" id="codenote"></p><label><span class="sr">${w.twoFactor}</span><input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="${w.twoFactor}" required></label>` +
      `<button type="submit">${w.confirm}</button></form>` +
      `<form id="door" hidden><label><span class="sr">${w.code}</span><input type="text" name="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="${w.code}" required></label>` +
      `<button type="submit">${w.enter}</button></form>` +
      `<p class="msg" id="msg" role="alert"></p>` +
      `<p class="links"><button type="button" class="link" id="magic">${w.magic}</button><button type="button" class="link" id="legacy">${w.useCode}</button></p></div></main>` +
      clientScript(w);
  } else {
    const admin = opts.mode === "admin";
    const field = admin
      ? `<input type="password" name="password" autocomplete="current-password" placeholder="Mot de passe" required autofocus>`
      : `<input type="text" name="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="${w.code}" required autofocus>`;
    body =
      `<main>${brand}<div class="panel"><p class="eyebrow">${admin ? "Administration" : w.client}</p>` +
      `<form id="door"><label><span class="sr">${admin ? "Mot de passe" : w.code}</span>${field}</label>` +
      `<button type="submit">${admin ? "Se connecter" : w.enter}</button></form><p class="msg" id="msg" role="alert"></p></div></main>` +
      script(admin ? "admin" : "vip", w);
  }
  const title = opts.mode === "admin" ? "Berete Jewellers — Administration" : opts.mode === "vip" ? "Berete Jewellers — " + w.client : w.title;
  return (
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#0A0A0A">` +
    `<meta name="robots" content="noindex, nofollow"><title>${title}</title>` +
    // The previews of a link (WhatsApp, iMessage): only « Berete Jewellers — Coming soon » and the monogram.
    `<meta property="og:title" content="Berete Jewellers — Coming soon"><meta property="og:site_name" content="Berete Jewellers"><meta property="og:type" content="website">` +
    `<meta property="og:image" content="${escape(opts.origin)}/soon/preview.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` +
    `<meta property="og:image:alt" content="Berete Jewellers"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Berete Jewellers — Coming soon">` +
    `<link rel="icon" type="image/svg+xml" href="/soon/favicon.svg">` +
    `<link rel="preload" href="/soon/cormorant-garamond-300.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/soon/manrope-400.woff2" as="font" type="font/woff2" crossorigin>` +
    `<style>${STYLE}</style></head><body data-door="${opts.mode}">${body}</body></html>`
  );
}
