/* The Draco decoder of glTF-Transform, without its own types. */
declare module "draco3dgltf" {
  const draco3d: { createDecoderModule(): Promise<unknown>; createEncoderModule(): Promise<unknown> };
  export default draco3d;
}
