// The mask of the jewel in a photo, by the subject lifting of macOS (Vision, VNGenerateForegroundInstanceMaskRequest:
// the "lift subject" of Photos), entirely on this Mac. Used by scripts/cutouts.mjs, refined by scripts/cutouts.py.
//
//   swiftc -O scripts/cutout-mask.swift -o .local/bin/cutout-mask
//   .local/bin/cutout-mask <photo> <mask.png>
//
// Writes a grayscale PNG the size of the photo (255: the jewel, soft edges), every subject found; exit 2 when none.
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: cutout-mask <photo> <mask.png>\n".data(using: .utf8)!)
  exit(1)
}
let handler = VNImageRequestHandler(url: URL(fileURLWithPath: args[1]))
let request = VNGenerateForegroundInstanceMaskRequest()
do {
  try handler.perform([request])
  guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
    FileHandle.standardError.write("no subject: \(args[1])\n".data(using: .utf8)!)
    exit(2)
  }
  let buffer = try observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
  let image = CIImage(cvPixelBuffer: buffer)
  try CIContext().writePNGRepresentation(of: image, to: URL(fileURLWithPath: args[2]), format: .L8, colorSpace: CGColorSpace(name: CGColorSpace.linearGray)!)
  print("\(observation.allInstances.count) subject(s)")
} catch {
  FileHandle.standardError.write("\(error)\n".data(using: .utf8)!)
  exit(1)
}
