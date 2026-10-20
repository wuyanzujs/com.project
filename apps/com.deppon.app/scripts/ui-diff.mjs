/**
 * ui-diff —— UI 对齐双截图差异检测工具（零依赖，纯 Node 实现 PNG 编解码与图像分析）。
 *
 * 目的：把「参考截图 A」与「App 实机截图 B」的 UI 对齐工作从人工圈区域、逐行像素扫描
 * 升级为自动化流水线：全局配准 → 差异掩码 → 形态学去噪 → 差异组件 → 组件局部配准量化。
 *
 * 用法：
 *   node scripts/ui-diff.mjs <参考截图A> <实机截图B> [选项]
 *
 * 选项：
 *   --out <file>       输出 JSON 报告（含全部差异组件与量化位移）
 *   --overlay-dir <d>  叠加图输出目录（默认与参考截图同目录）
 *   --threshold <n>    通道差阈值，默认 30（越大越宽松，可滤抗锯齿噪点）
 *   --min-area <n>     组件最小差异像素数，默认 120
 *   --top <n>          控制台/叠加图列出的最大组件数，默认 30
 *   --max-shift <n>    全局配准搜索半径（px），默认 240
 *   --local-shift <n>  组件局部配准搜索半径（px），默认 12
 *   --no-overlay       不输出叠加图
 *
 * 判定说明：
 *   位移     —— 组件整体错位，局部配准后差异大幅下降，报告 move = B 需整体移动的 (dx,dy)
 *   疑似位移 —— 局部移动可缓解但残差较高，常为位移叠加尺寸/内容微差
 *   内容差异 —— 移动无法解释，多为数据不同、字形/图形不同
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { deflateSync, inflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// ---------------------------------------------------------------------------
// PNG 编解码（仅支持 8 位、非隔行、灰度/RGB/RGBA，实机截图均为此格式）
// ---------------------------------------------------------------------------

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft
  const pa = Math.abs(p - left)
  const pb = Math.abs(p - up)
  const pc = Math.abs(p - upLeft)
  if (pa <= pb && pa <= pc) return left
  if (pb <= pc) return up
  return upLeft
}

function unfilterPng(raw, width, height, channels) {
  const stride = width * channels
  const out = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const rowIn = y * (stride + 1) + 1
    const rowOut = y * stride
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[rowOut + x - channels] : 0
      const up = y > 0 ? out[rowOut - stride + x] : 0
      const upLeft = y > 0 && x >= channels ? out[rowOut - stride + x - channels] : 0
      let value = raw[rowIn + x]
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) value += paethPredictor(left, up, upLeft)
      out[rowOut + x] = value & 0xff
    }
  }
  return out
}

function decodePng(filePath) {
  const buf = readFileSync(filePath)
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== PNG_SIGNATURE[i]) throw new Error(`${filePath} 不是 PNG 文件`)
  }
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idatParts = []
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    if (type === 'IHDR') {
      width = buf.readUInt32BE(dataStart)
      height = buf.readUInt32BE(dataStart + 4)
      bitDepth = buf[dataStart + 8]
      colorType = buf[dataStart + 9]
      interlace = buf[dataStart + 12]
    } else if (type === 'IDAT') {
      idatParts.push(buf.subarray(dataStart, dataStart + length))
    } else if (type === 'IEND') {
      break
    }
    offset = dataStart + length + 4
  }
  if (!width || !height) throw new Error(`${filePath} 缺少 IHDR，文件可能损坏`)
  if (bitDepth !== 8) throw new Error(`${filePath} 位深为 ${bitDepth}，仅支持 8 位 PNG`)
  if (interlace !== 0) throw new Error(`${filePath} 使用了隔行扫描，不支持`)
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0
  if (!channels) throw new Error(`${filePath} 颜色类型 ${colorType} 不支持（仅支持灰度/RGB/RGBA）`)
  if (!idatParts.length) throw new Error(`${filePath} 缺少 IDAT 图像数据`)
  const packed = unfilterPng(inflateSync(Buffer.concat(idatParts)), width, height, channels)
  const rgba = new Uint8Array(width * height * 4)
  const pixelCount = width * height
  if (channels === 1) {
    for (let i = 0; i < pixelCount; i++) {
      const value = packed[i]
      rgba[i * 4] = value
      rgba[i * 4 + 1] = value
      rgba[i * 4 + 2] = value
      rgba[i * 4 + 3] = 255
    }
  } else {
    for (let i = 0; i < pixelCount; i++) {
      const s = i * channels
      const t = i * 4
      rgba[t] = packed[s]
      rgba[t + 1] = packed[s + 1]
      rgba[t + 2] = packed[s + 2]
      rgba[t + 3] = channels === 4 ? packed[s + 3] : 255
    }
  }
  return { width, height, rgba }
}

const crcTable = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function pngChunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw, { level: 6 })), pngChunk('IEND', Buffer.alloc(0))])
}

// ---------------------------------------------------------------------------
// 图像分析：配准 / 差异掩码 / 形态学 / 连通域 / 组件局部配准
// ---------------------------------------------------------------------------

function toLuma(width, height, rgba) {
  const luma = new Uint8Array(width * height)
  for (let i = 0, j = 0; i < luma.length; i++, j += 4) {
    luma[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8
  }
  return luma
}

// 估计 B 相对 A 的整体位移：返回 move = (dx,dy)，表示把 B 整体移动 (dx,dy) 后与 A 最一致。
// 同设备同分辨率截图只需平移配准，无需 SIFT/透视；搜索采用粗(步长2/采样步长8)到细(步长1/采样步长2)。
function estimateGlobalMove(refLuma, refW, refH, actLuma, actW, actH, maxShift) {
  const margin = maxShift + 4
  const winW = Math.min(refW, actW) - margin * 2
  const winH = Math.min(refH, actH) - margin * 2
  if (winW <= 0 || winH <= 0) throw new Error('两张截图尺寸差异过大，无法配准，请确认截图来自同一设备分辨率')
  const x0 = margin
  const y0 = margin
  const sad = (dy, dx, step) => {
    let sum = 0
    let count = 0
    for (let y = y0; y < y0 + winH; y += step) {
      const yb = y - dy
      if (yb < 0 || yb >= actH) continue
      const ra = y * refW
      const rb = yb * actW
      for (let x = x0; x < x0 + winW; x += step) {
        const xb = x - dx
        if (xb < 0 || xb >= actW) continue
        const diff = refLuma[ra + x] - actLuma[rb + xb]
        sum += diff < 0 ? -diff : diff
        count++
      }
    }
    return count ? sum / count : Number.POSITIVE_INFINITY
  }
  let bestDy = 0
  let bestDx = 0
  let bestSad = Number.POSITIVE_INFINITY
  for (let dy = -maxShift; dy <= maxShift; dy += 2) {
    const value = sad(dy, 0, 8)
    if (value < bestSad) {
      bestSad = value
      bestDy = dy
    }
  }
  for (let dx = -40; dx <= 40; dx += 2) {
    const value = sad(bestDy, dx, 8)
    if (value < bestSad) {
      bestSad = value
      bestDx = dx
    }
  }
  for (let dy = bestDy - 3; dy <= bestDy + 3; dy++) {
    const value = sad(dy, bestDx, 2)
    if (value < bestSad) {
      bestSad = value
      bestDy = dy
    }
  }
  for (let dx = bestDx - 3; dx <= bestDx + 3; dx++) {
    const value = sad(bestDy, dx, 2)
    if (value < bestSad) {
      bestSad = value
      bestDx = dx
    }
  }
  return { dx: bestDx, dy: bestDy }
}

// 逐像素差异掩码：任一 RGB 通道差超过阈值即记为差异。对比范围限制在 B 配准后的有效重叠区。
function buildDiffMask(ref, act, move, threshold) {
  const mask = new Uint8Array(ref.width * ref.height)
  const yStart = Math.max(0, move.dy)
  const yEnd = Math.min(ref.height, act.height + move.dy)
  const xStart = Math.max(0, move.dx)
  const xEnd = Math.min(ref.width, act.width + move.dx)
  let diffPixels = 0
  let total = 0
  for (let y = yStart; y < yEnd; y++) {
    const ra = y * ref.width
    const rb = (y - move.dy) * act.width
    for (let x = xStart; x < xEnd; x++) {
      const ta = (ra + x) * 4
      const tb = (rb + x - move.dx) * 4
      const dr = ref.rgba[ta] - act.rgba[tb]
      const dg = ref.rgba[ta + 1] - act.rgba[tb + 1]
      const db = ref.rgba[ta + 2] - act.rgba[tb + 2]
      const ad = dr < 0 ? -dr : dr
      const ag = dg < 0 ? -dg : dg
      const ab = db < 0 ? -db : db
      total++
      if (ad > threshold || ag > threshold || ab > threshold) {
        mask[ra + x] = 1
        diffPixels++
      }
    }
  }
  return { mask, diffPixels, total, xStart, yStart, xEnd, yEnd }
}

// 开运算去 1px 噪点，闭运算把邻近差异连成完整组件（对应抗锯齿/压缩噪点与贴片断裂）。
function denoiseMask(mask, width, height) {
  const erodeOnce = src => {
    const out = new Uint8Array(src.length)
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 0; x < width; x++) {
        const i = row + x
        if (!src[i]) continue
        if (x > 0 && !src[i - 1]) continue
        if (x < width - 1 && !src[i + 1]) continue
        if (y > 0 && !src[i - width]) continue
        if (y < height - 1 && !src[i + width]) continue
        out[i] = 1
      }
    }
    return out
  }
  const dilateOnce = src => {
    const out = new Uint8Array(src.length)
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 0; x < width; x++) {
        const i = row + x
        if (src[i] || (x > 0 && src[i - 1]) || (x < width - 1 && src[i + 1]) || (y > 0 && src[i - width]) || (y < height - 1 && src[i + width])) out[i] = 1
      }
    }
    return out
  }
  return erodeOnce(erodeOnce(dilateOnce(dilateOnce(dilateOnce(dilateOnce(erodeOnce(mask)))))))
}

// 连通域：4 倍降采样上 8 邻接标记，再回全分辨率精修 bbox 与差异像素数。
function findComponents(mask, width, height, minArea) {
  const scale = 4
  const sw = Math.floor(width / scale)
  const sh = Math.floor(height / scale)
  const small = new Uint8Array(sw * sh)
  for (let y = 0; y < sh; y++) {
    const row = y * scale * width
    for (let x = 0; x < sw; x++) {
      if (mask[row + x * scale]) small[y * sw + x] = 1
    }
  }
  const labels = new Int32Array(sw * sh)
  const stack = []
  const rawComponents = []
  for (let start = 0; start < small.length; start++) {
    if (!small[start] || labels[start]) continue
    const id = rawComponents.length + 1
    labels[start] = id
    stack.push(start)
    const comp = { cells: 0, x0: sw, x1: -1, y0: sh, y1: -1 }
    while (stack.length) {
      const idx = stack.pop()
      const cy = Math.floor(idx / sw)
      const cx = idx - cy * sw
      comp.cells++
      if (cx < comp.x0) comp.x0 = cx
      if (cx > comp.x1) comp.x1 = cx
      if (cy < comp.y0) comp.y0 = cy
      if (cy > comp.y1) comp.y1 = cy
      for (let ny = cy - 1; ny <= cy + 1; ny++) {
        for (let nx = cx - 1; nx <= cx + 1; nx++) {
          if (ny < 0 || ny >= sh || nx < 0 || nx >= sw) continue
          const nIdx = ny * sw + nx
          if (small[nIdx] && !labels[nIdx]) {
            labels[nIdx] = id
            stack.push(nIdx)
          }
        }
      }
    }
    rawComponents.push(comp)
  }
  const components = []
  for (const comp of rawComponents) {
    const px0 = Math.max(0, comp.x0 * scale - 8)
    const px1 = Math.min(width, (comp.x1 + 1) * scale + 8)
    const py0 = Math.max(0, comp.y0 * scale - 8)
    const py1 = Math.min(height, (comp.y1 + 1) * scale + 8)
    let bx0 = -1
    let bx1 = -1
    let by0 = -1
    let by1 = -1
    let diffPx = 0
    for (let y = py0; y < py1; y++) {
      const row = y * width
      for (let x = px0; x < px1; x++) {
        if (mask[row + x]) {
          diffPx++
          if (bx0 < 0 || x < bx0) bx0 = x
          if (x > bx1) bx1 = x
          if (by0 < 0) by0 = y
          by1 = y
        }
      }
    }
    if (diffPx >= minArea) components.push({ x0: bx0, y0: by0, x1: bx1 + 1, y1: by1 + 1, diffPx })
  }
  components.sort((a, b) => b.diffPx - a.diffPx)
  return components
}

// 组件局部配准：先应用全局位移，再在组件邻域内搜索 B 需要额外移动的 (mx,my)；
// 并以残差比判定是「整体位移」还是「内容差异」。
function alignComponent(refLuma, refW, actLuma, actW, actH, comp, overlap, globalMove, radius) {
  const x0 = Math.max(overlap.xStart, comp.x0 - 8)
  const x1 = Math.min(overlap.xEnd, comp.x1 + 8)
  const y0 = Math.max(overlap.yStart, comp.y0 - 8)
  const y1 = Math.min(overlap.yEnd, comp.y1 + 8)
  if (x1 - x0 < 24 || y1 - y0 < 24) return null
  const step = Math.max(2, Math.ceil(Math.sqrt(((x1 - x0) * (y1 - y0)) / 20000)))
  const sad = (my, mx) => {
    let sum = 0
    let count = 0
    for (let y = y0; y < y1; y += step) {
      const yb = y - globalMove.dy - my
      if (yb < 0 || yb >= actH) continue
      const ra = y * refW
      const rb = yb * actW
      for (let x = x0; x < x1; x += step) {
        const xb = x - globalMove.dx - mx
        if (xb < 0 || xb >= actW) continue
        const diff = refLuma[ra + x] - actLuma[rb + xb]
        sum += diff < 0 ? -diff : diff
        count++
      }
    }
    return count ? sum / count : Number.POSITIVE_INFINITY
  }
  const baseSad = sad(0, 0)
  let bestMx = 0
  let bestMy = 0
  let bestSad = baseSad
  for (let my = -radius; my <= radius; my++) {
    for (let mx = -radius; mx <= radius; mx++) {
      if (!mx && !my) continue
      const value = sad(my, mx)
      if (value < bestSad) {
        bestSad = value
        bestMx = mx
        bestMy = my
      }
    }
  }
  const ratio = baseSad > 0 ? bestSad / baseSad : 1
  let kind = '内容差异'
  if (bestMx || bestMy) {
    if (ratio <= 0.35) kind = '位移'
    else if (ratio <= 0.7) kind = '疑似位移'
  }
  return { move: { dx: bestMx, dy: bestMy }, matchRatio: Number(ratio.toFixed(2)), kind }
}

// ---------------------------------------------------------------------------
// 叠加图输出
// ---------------------------------------------------------------------------

function setPixel(rgba, width, x, y, color) {
  const i = (y * width + x) * 4
  rgba[i] = color[0]
  rgba[i + 1] = color[1]
  rgba[i + 2] = color[2]
  rgba[i + 3] = 255
}

function drawRects(width, height, rgba, components, color, thickness = 2) {
  const out = rgba.slice()
  for (const comp of components) {
    const left = Math.max(0, comp.x0 - thickness)
    const right = Math.min(width - 1, comp.x1 - 1 + thickness)
    const top = Math.max(0, comp.y0 - thickness)
    const bottom = Math.min(height - 1, comp.y1 - 1 + thickness)
    for (let t = 0; t < thickness; t++) {
      const xa = comp.x0 - 1 - t
      const xb = comp.x1 - 1 + t
      const ya = comp.y0 - 1 - t
      const yb = comp.y1 - 1 + t
      for (let x = left; x <= right; x++) {
        if (ya >= 0) setPixel(out, width, x, ya, color)
        if (yb < height) setPixel(out, width, x, yb, color)
      }
      for (let y = top; y <= bottom; y++) {
        if (xa >= 0) setPixel(out, width, xa, y, color)
        if (xb < width) setPixel(out, width, xb, y, color)
      }
    }
  }
  return out
}

// 把 B 按全局位移贴到 A 的画布上，未覆盖区域填中灰，便于直观看出配准后的差异组件位置。
function buildAlignedActual(act, refW, refH, move) {
  const rgba = new Uint8Array(refW * refH * 4).fill(128)
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
  for (let y = 0; y < act.height; y++) {
    const ty = y + move.dy
    if (ty < 0 || ty >= refH) continue
    const srcRow = y * act.width
    const dstRow = ty * refW
    for (let x = 0; x < act.width; x++) {
      const tx = x + move.dx
      if (tx < 0 || tx >= refW) continue
      const s = (srcRow + x) * 4
      const t = (dstRow + tx) * 4
      rgba[t] = act.rgba[s]
      rgba[t + 1] = act.rgba[s + 1]
      rgba[t + 2] = act.rgba[s + 2]
      rgba[t + 3] = 255
    }
  }
  return rgba
}

function buildMaskImage(width, height, mask) {
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < mask.length; i++) {
    const value = mask[i] ? 255 : 0
    rgba[i * 4] = value
    rgba[i * 4 + 1] = value
    rgba[i * 4 + 2] = value
    rgba[i * 4 + 3] = 255
  }
  return rgba
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  console.log('用法: node scripts/ui-diff.mjs <参考截图A> <实机截图B> [--out report.json] [--overlay-dir <dir>]')
  console.log('      [--threshold 30] [--min-area 120] [--top 30] [--max-shift 240] [--local-shift 12] [--no-overlay]')
}

function parseArgs(argv) {
  const options = { out: '', overlayDir: '', threshold: 30, minArea: 120, top: 30, maxShift: 240, localShift: 12, overlay: true }
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = argv[i + 1]
    if (arg === '--out') {
      options.out = value
      i++
    } else if (arg === '--overlay-dir') {
      options.overlayDir = value
      i++
    } else if (arg === '--threshold') {
      options.threshold = Number(value)
      i++
    } else if (arg === '--min-area') {
      options.minArea = Number(value)
      i++
    } else if (arg === '--top') {
      options.top = Number(value)
      i++
    } else if (arg === '--max-shift') {
      options.maxShift = Number(value)
      i++
    } else if (arg === '--local-shift') {
      options.localShift = Number(value)
      i++
    } else if (arg === '--no-overlay') {
      options.overlay = false
    } else if (arg.startsWith('--')) {
      throw new Error(`未知选项 ${arg}`)
    } else {
      positional.push(arg)
    }
  }
  if (positional.length !== 2) throw new Error('需要恰好两个截图路径：参考截图 A 与实机截图 B')
  for (const key of ['threshold', 'minArea', 'top', 'maxShift', 'localShift']) {
    if (!Number.isFinite(options[key]) || options[key] < 0) throw new Error(`选项 ${key} 需要非负数字`)
  }
  return { ...options, referencePath: positional[0], actualPath: positional[1] }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const ref = decodePng(options.referencePath)
  const act = decodePng(options.actualPath)
  const refLuma = toLuma(ref.width, ref.height, ref.rgba)
  const actLuma = toLuma(act.width, act.height, act.rgba)

  const move = estimateGlobalMove(refLuma, ref.width, ref.height, actLuma, act.width, act.height, options.maxShift)
  console.log(`[配准] B 整体移动 (dx=${move.dx}, dy=${move.dy}) 后与 A 对齐`)

  const diff = buildDiffMask(ref, act, move, options.threshold)
  const mask = denoiseMask(diff.mask, ref.width, ref.height)
  const components = findComponents(mask, ref.width, ref.height, options.minArea)
  const ratio = diff.total ? diff.diffPixels / diff.total : 0
  console.log(
    `[差异] 阈值 ${options.threshold}，对比区 ${diff.total}px，差异 ${diff.diffPixels}px (${(ratio * 100).toFixed(2)}%)，去噪后组件 ${components.length} 个`
  )

  const listed = components.slice(0, options.top)
  for (const comp of listed) {
    const result = alignComponent(refLuma, ref.width, actLuma, act.width, act.height, comp, diff, move, options.localShift)
    if (result) {
      comp.move = result.move
      comp.matchRatio = result.matchRatio
      comp.kind = result.kind
    } else {
      comp.move = { dx: 0, dy: 0 }
      comp.matchRatio = 1
      comp.kind = '内容差异'
    }
  }

  console.log(`[组件] 列出差异像素前 ${listed.length} 个（move = 全局对齐后该组件区域 B 需额外移动的量）：`)
  for (let i = 0; i < listed.length; i++) {
    const comp = listed[i]
    const size = `${comp.x1 - comp.x0}x${comp.y1 - comp.y0}`
    console.log(
      `${String(i + 1).padStart(3)}. bbox=(${String(comp.x0).padStart(4)},${String(comp.y0).padStart(4)})-(${String(comp.x1).padStart(4)},${String(comp.y1).padStart(4)}) ` +
        `size=${size.padStart(9)} diffPx=${String(comp.diffPx).padStart(6)} move=(${comp.move.dx},${comp.move.dy}) 残差=${comp.matchRatio} ${comp.kind}`
    )
  }

  const outputs = []
  if (options.overlay) {
    const overlayDir = options.overlayDir || path.dirname(options.referencePath)
    const refName = path.basename(options.referencePath, path.extname(options.referencePath))
    const actName = path.basename(options.actualPath, path.extname(options.actualPath))
    const refOverlayPath = path.join(overlayDir, `ui-diff-${refName}-overlay.png`)
    const actOverlayPath = path.join(overlayDir, `ui-diff-${actName}-overlay.png`)
    const maskPath = path.join(overlayDir, 'ui-diff-mask.png')
    const alignedActual = buildAlignedActual(act, ref.width, ref.height, move)
    const refOverlay = encodePng(ref.width, ref.height, drawRects(ref.width, ref.height, ref.rgba, listed, [255, 0, 0]))
    const actOverlay = encodePng(ref.width, ref.height, drawRects(ref.width, ref.height, alignedActual, listed, [255, 0, 0]))
    writeFileSync(refOverlayPath, refOverlay)
    writeFileSync(actOverlayPath, actOverlay)
    writeFileSync(maskPath, encodePng(ref.width, ref.height, buildMaskImage(ref.width, ref.height, mask)))
    outputs.push(refOverlayPath, actOverlayPath, maskPath)
    console.log(`[输出] 叠加图与掩码已写入 ${overlayDir}`)
  }

  if (options.out) {
    const report = {
      reference: options.referencePath,
      actual: options.actualPath,
      globalMove: move,
      threshold: options.threshold,
      comparePixels: diff.total,
      diffPixels: diff.diffPixels,
      diffRatio: Number(ratio.toFixed(4)),
      componentCount: components.length,
      components: components.map((comp, index) => ({
        id: index + 1,
        bbox: [comp.x0, comp.y0, comp.x1, comp.y1],
        size: [comp.x1 - comp.x0, comp.y1 - comp.y0],
        diffPx: comp.diffPx,
        move: comp.move ?? { dx: 0, dy: 0 },
        matchRatio: comp.matchRatio ?? 1,
        kind: comp.kind ?? '未量化'
      })),
      outputs
    }
    writeFileSync(options.out, JSON.stringify(report, null, 2))
    console.log(`[输出] JSON 报告已写入 ${options.out}`)
  }
}

try {
  main()
} catch (error) {
  console.error(`ui-diff 执行失败：${error.message}`)
  console.error('')
  usage()
  process.exit(2)
}
