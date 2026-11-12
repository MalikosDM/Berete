import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  console.log(file.split("/").slice(-2).join("/"));
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = mesh.listPrimitives()[0].getMaterial()?.getName();
    const inst = node.getExtension("EXT_mesh_gpu_instancing");
    const nodeNeg = node.getScale().filter((v) => v < 0).length % 2 === 1;
    if (!inst) { if (nodeNeg) console.log("   node mirrored", m); continue; }
    const s = inst.getAttribute("SCALE");
    let neg = 0;
    const n = inst.getAttribute("TRANSLATION").getCount();
    if (s) for (let i = 0; i < n; i++) { const v = s.getElement(i, []); if (v.filter((x) => x < 0).length % 2 === 1) neg++; }
    if (neg || nodeNeg) console.log("  ", m, "copies", n, "mirrored copies", neg, nodeNeg ? "(node mirrored)" : "");
    else console.log("  ", m, "copies", n, "mirrored 0");
  }
}
