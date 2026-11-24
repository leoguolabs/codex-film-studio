import CoreGraphics
import Foundation
import ImageIO
import Metal
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(1)
}

var args = CommandLine.arguments
var samples = 1
if let option = args.last, option.hasPrefix("--samples=") {
  guard let value = Int(option.dropFirst("--samples=".count)), (1...2).contains(value) else {
    fail("Select --samples=1 or --samples=2")
  }
  samples = value
  args.removeLast()
}
guard (7...11).contains(args.count) else {
  fail("draw shader scene.bin background-or-dash width height output-directory [bench-texture] [printed-prop-atlas] [clay-relief-map] [workshop-end-panels] [--samples=1|2]")
}
guard let gpu = MTLCreateSystemDefaultDevice(), let queue = gpu.makeCommandQueue() else {
  fail("Metal device unavailable")
}
let library = try gpu.makeLibrary(
  source: String(contentsOfFile: args[1], encoding: .utf8), options: nil)
let render = try gpu.makeComputePipelineState(function: library.makeFunction(name: "expose")!)
let lens = try gpu.makeComputePipelineState(function: library.makeFunction(name: "develop")!)
let width = Int(args[4])!
let height = Int(args[5])!
let output = URL(fileURLWithPath: args[6], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let rgb = CGColorSpace(name: CGColorSpace.sRGB)!
let info = CGImageAlphaInfo.noneSkipLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
func texture(_ format: MTLPixelFormat, _ w: Int, _ h: Int) -> MTLTexture {
  let d = MTLTextureDescriptor.texture2DDescriptor(
    pixelFormat: format, width: w, height: h, mipmapped: false)
  d.usage = [.shaderRead, .shaderWrite]
  d.storageMode = .shared
  return gpu.makeTexture(descriptor: d)!
}
let negative = texture(.rgba16Float, width * samples, height * samples)
let resolved = samples == 1 ? negative : texture(.rgba16Float, width, height)
let contactPrint = samples == 2
  ? try gpu.makeComputePipelineState(function: library.makeFunction(name: "contactPrint")!) : nil
let film = texture(.rgba8Unorm, width, height)
func loadPhoto(_ path: String, mips: Bool = false) -> MTLTexture {
  if path == "-" { return texture(.rgba8Unorm, 1, 1) }
  guard let provider = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
    let im = CGImageSourceCreateImageAtIndex(provider, 0, nil)
  else { fail("Unreadable set photograph") }
  let w = im.width
  let h = im.height
  let ctx = CGContext(
    data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: rgb,
    bitmapInfo: info)!
  ctx.draw(im, in: CGRect(x: 0, y: 0, width: w, height: h))
  let desc = MTLTextureDescriptor.texture2DDescriptor(
    pixelFormat: .rgba8Unorm, width: w, height: h, mipmapped: mips)
  desc.usage = .shaderRead
  let tex = gpu.makeTexture(descriptor: desc)!
  tex.replace(
    region: MTLRegionMake2D(0, 0, w, h), mipmapLevel: 0, withBytes: ctx.data!, bytesPerRow: w * 4)
  if mips {
    let cmd = queue.makeCommandBuffer()!
    let blit = cmd.makeBlitCommandEncoder()!
    blit.generateMipmaps(for: tex)
    blit.endEncoding()
    cmd.commit()
    cmd.waitUntilCompleted()
  }
  return tex
}
let plate = loadPhoto(args[3])
let wood = loadPhoto(args.count >= 8 ? args[7] : "-", mips: true)
let printed = loadPhoto(args.count >= 9 ? args[8] : "-", mips: true)
let relief = loadPhoto(args.count >= 10 ? args[9] : "-", mips: true)
let panels = loadPhoto(args.count >= 11 ? args[10] : "-", mips: true)
let handle = try FileHandle(forReadingFrom: URL(fileURLWithPath: args[2]))
let ts = MTLSize(width: 8, height: 8, depth: 1)
let grid = MTLSize(width: width, height: height, depth: 1)
var pixels = [UInt8](repeating: 0, count: width * height * 4)
while let header = try handle.read(upToCount: 8), !header.isEmpty {
  guard header.count == 8 else { fail("Truncated frame header") }
  let words = header.withUnsafeBytes { Array($0.bindMemory(to: UInt32.self)) }
  let size = Int(words[1])
  let idx = Int(words[0])
  guard let packet = try handle.read(upToCount: size), packet.count == size else {
    fail("Truncated frame")
  }
  autoreleasepool {
    let url = output.appendingPathComponent(String(format: "%05d.jpg", idx))
    let buffer = packet.withUnsafeBytes {
      gpu.makeBuffer(bytes: $0.baseAddress!, length: size, options: .storageModeShared)!
    }
    let cmd = queue.makeCommandBuffer()!
    let en = cmd.makeComputeCommandEncoder()!
    en.setComputePipelineState(render)
    en.setBuffer(buffer, offset: 0, index: 0)
    en.setTexture(negative, index: 0)
    en.setTexture(plate, index: 1)
    en.setTexture(wood, index: 2)
    en.setTexture(printed, index: 3)
    en.setTexture(relief, index: 4)
    en.setTexture(panels, index: 5)
    let rays = MTLSize(width: width * samples, height: height * samples, depth: 1)
    en.dispatchThreads(rays, threadsPerThreadgroup: ts)
    en.endEncoding()
    if let contactPrint {
      let contact = cmd.makeComputeCommandEncoder()!
      contact.setComputePipelineState(contactPrint)
      contact.setTexture(negative, index: 0)
      contact.setTexture(resolved, index: 1)
      contact.dispatchThreads(grid, threadsPerThreadgroup: ts)
      contact.endEncoding()
    }
    let fx = cmd.makeComputeCommandEncoder()!
    fx.setComputePipelineState(lens)
    fx.setTexture(resolved, index: 0)
    fx.setTexture(film, index: 1)
    fx.setBuffer(buffer, offset: 0, index: 0)
    fx.dispatchThreads(grid, threadsPerThreadgroup: ts)
    fx.endEncoding()
    cmd.commit()
    cmd.waitUntilCompleted()
    if let problem = cmd.error { fail(problem.localizedDescription) }
    film.getBytes(
      &pixels, bytesPerRow: width * 4, from: MTLRegionMake2D(0, 0, width, height), mipmapLevel: 0)
    let data = Data(pixels) as CFData
    let im = CGImage(
      width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4,
      space: rgb, bitmapInfo: CGBitmapInfo(rawValue: info), provider: CGDataProvider(data: data)!,
      decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
    guard
      let dst = CGImageDestinationCreateWithURL(
        url as CFURL, UTType.jpeg.identifier as CFString, 1, nil)
    else { fail("Cannot write frame") }
    CGImageDestinationAddImage(
      dst, im, [kCGImageDestinationLossyCompressionQuality: 0.94] as CFDictionary)
    guard CGImageDestinationFinalize(dst) else { fail("JPEG write failed") }
  }
  if idx % 200 == 0 {
    print("Exposed pose \(idx)")
    fflush(stdout)
  }
}
