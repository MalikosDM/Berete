/*
 * The private access of the site under construction, from the Terminal (deploy/vps.sh: npm run vps -- access …), run in
 * the container of the site:
 *   set      the new password, read from the standard input (never on a command line); the site stays under construction
 *   off      opens the site to everyone          on   puts it back under construction
 *   status   one line: the state of the site
 * The site in service sees the change within a few seconds (server/access-state.ts reads the base again).
 */
import { accessState, loadAccess, MIN_PASSWORD, setConstruction, setPassword } from "./access-state.js";
import { prisma } from "./db.js";

const command = process.argv[2] ?? "status";

async function input(): Promise<string> {
  let text = "";
  for await (const chunk of process.stdin) text += String(chunk);
  return text.split(/\r?\n/)[0] ?? "";
}

let code = 0;
try {
  await loadAccess();
  if (command === "set") {
    const password = await input();
    if (password.trim().length < MIN_PASSWORD) {
      console.log("Le mot de passe doit avoir au moins " + MIN_PASSWORD + " caractères : rien n'a changé.");
      code = 1;
    } else {
      await setPassword(password);
      await setConstruction(true);
      console.log("Mot de passe d'accès privé enregistré (les appareils déjà entrés devront le retaper).");
    }
  } else if (command === "off") {
    await setConstruction(false);
  } else if (command === "on") {
    await setConstruction(true);
  } else if (command !== "status") {
    console.log("access [set | on | off | status]");
    code = 1;
  }
  const s = accessState();
  console.log(!s.construction ? "Site ouvert à tous." : s.hasPassword ? "Site en construction — accès privé actif." : "Site en construction — en attente du mot de passe d'accès privé (admin → Accès au site).");
} finally {
  await prisma.$disconnect();
}
process.exit(code);
