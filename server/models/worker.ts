/*
 * Runs the 3D pipeline in its own process (started by jobs.ts), so that the
 * site keeps answering while a file of several hundred MB is processed.
 *   argv: <original file> <kind: stl|glb|3dm> <output folder>
 * Messages to the parent: { type: "progress", percent, step }, { type: "done", result }, { type: "error", message }.
 */
import { runPipeline, type SourceKind } from "./pipeline/index.js";

const [input, kind, out] = process.argv.slice(2);

function send(message: object): Promise<void> {
  return new Promise((resolve) => (process.send ? process.send(message, () => resolve()) : resolve()));
}

let last = -1;
try {
  const result = await runPipeline(input!, kind as SourceKind, out!, (percent, step) => {
    if (percent === last) return;
    last = percent;
    void send({ type: "progress", percent, step });
  });
  await send({ type: "done", result });
  process.exit(0);
} catch (error) {
  await send({ type: "error", message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
}
