import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsPDF } from 'jspdf'
import { createUsageCsv } from '../../src/render/exportCsv'
import { canvasToBlob } from '../../src/render/canvasUtils'
import { renderBeadPreview } from '../../src/render/renderBeadPreview'
import { renderCodeChart } from '../../src/render/renderCodeChart'
import { createPatternPdf, type PdfProgress } from '../../src/render/exportPdf'
import { getPalette } from '../../src/data/palettes'
import type { GenerationResult } from '../../src/types'

const PNG_BYTES = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
const ONE_PIXEL_JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k='

class FakeContext {
  texts: Array<{ text: string; x: number; y: number }> = []
  drawnCanvases: FakeCanvas[] = []
  fillStyle = ''
  strokeStyle = ''
  font = ''
  lineWidth = 1
  textAlign = 'left'
  textBaseline = 'alphabetic'
  globalCompositeOperation = 'source-over'
  imageSmoothingEnabled = true
  imageSmoothingQuality = 'low'
  fillRect() {}
  clearRect() {}
  beginPath() {}
  arc() {}
  fill() {}
  stroke() {}
  save() {}
  restore() {}
  moveTo() {}
  lineTo() {}
  fillText(text: string, x: number, y: number) { this.texts.push({ text, x, y }) }
  strokeRect() {}
  drawImage(source: FakeCanvas) { this.drawnCanvases.push(source) }
}

let canvases: FakeCanvas[] = []
let encodedPages: FakeCanvas[] = []
let failEncodingAt = 0

class FakeCanvas {
  width = 300
  height = 150
  context = new FakeContext()
  constructor() { canvases.push(this) }
  getContext() { return this.context }
  toDataURL(type = 'image/png') {
    if (type === 'image/jpeg') {
      encodedPages.push(this)
      if (encodedPages.length === failEncodingAt) throw new Error('JPEG encoding failed')
      return `data:image/jpeg;base64,${ONE_PIXEL_JPEG}`
    }
    return `data:image/png;base64,${Buffer.from(PNG_BYTES).toString('base64')}`
  }
  toBlob(callback: (blob: Blob) => void) { callback(new Blob([PNG_BYTES], { type: 'image/png' })) }
}

const result: GenerationResult = {
  width: 2,
  height: 2,
  codes: ['F5', 'C8', null, 'F5'],
  mode: 'closest',
  paletteId: '221',
  metrics: { mean: 1, p95: 2 },
  fullPaletteMetrics: { mean: 1, p95: 2 },
  colorCount: 2,
  beadCount: 3,
  selectedCodes: ['C8', 'F5'],
  deterministicHash: '12345678',
}

let originalDocument: typeof document | undefined

beforeEach(() => {
  canvases = []
  encodedPages = []
  failEncodingAt = 0
  originalDocument = globalThis.document
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: (tag: string) => tag === 'canvas' ? new FakeCanvas() : {} },
  })
})

function expectReleasedCanvases() {
  expect(canvases.length).toBeGreaterThan(0)
  for (const canvas of canvases) {
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  }
}

function makeResult(width: number, height: number, colorCount = 2): GenerationResult {
  const selectedCodes = getPalette('221').slice(0, colorCount).map((color) => color.code)
  return {
    ...result,
    width,
    height,
    codes: Array.from({ length: width * height }, (_, index) => selectedCodes[index % selectedCodes.length]),
    selectedCodes,
    colorCount,
    beadCount: width * height,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
})

describe('export functions', () => {
  it('creates UTF-8 BOM CSV with the required columns and correct count sum', async () => {
    const blob = createUsageCsv(result, getPalette('221'), 1000)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder().decode(bytes.slice(3))
    expect(text).toContain('mard_code,display_name,hex,count,percentage,estimated_packs')
    expect(text).toContain('F5')
  })

  it('creates non-empty PNG blobs for bead and code chart canvases', async () => {
    const palette = getPalette('221')
    const previewBlob = await canvasToBlob(renderBeadPreview(result, palette))
    const chartBlob = await canvasToBlob(renderCodeChart(result, palette))
    expect([...new Uint8Array(await previewBlob.arrayBuffer()).slice(0, 8)]).toEqual([...PNG_BYTES.slice(0, 8)])
    expect(chartBlob.size).toBeGreaterThan(8)
  })

  it('creates a non-empty PDF file', async () => {
    const blob = await createPatternPdf(result, getPalette('221'), { beadSizeMm: 5, packSize: 1000 })
    const header = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 4))
    expect(header).toBe('%PDF')
    expect(blob.size).toBeGreaterThan(500)
    expectReleasedCanvases()
  })

  it('preserves 200 by 200 chart coordinates, cell codes, usage and page order', async () => {
    const large = makeResult(200, 200, 43)
    const unchanged = structuredClone(large)
    const progress: PdfProgress[] = []
    const blob = await createPatternPdf(large, getPalette('221'), {
      beadSizeMm: 5, packSize: 1000, onProgress: (value) => progress.push({ ...value }),
    })
    const pdfText = new TextDecoder().decode(await blob.arrayBuffer())
    expect(pdfText.match(/\/Type \/Page\b/g)).toHaveLength(99)
    expect(encodedPages).toHaveLength(99)
    expect(encodedPages[0].context.texts.map((entry) => entry.text)).toEqual(expect.arrayContaining([
      'MARD 拼豆图纸', '200 × 200 颗', '40,000 颗', '43 色', '100.0 × 100.0 cm', '1.00', '2.00',
    ]))
    const expectedRanges: string[] = []
    for (let row = 0; row < 200; row += 25) {
      for (let column = 0; column < 200; column += 18) {
        expectedRanges.push(`列 ${column + 1}–${Math.min(200, column + 18)} · 行 ${row + 1}–${Math.min(200, row + 25)}`)
      }
    }
    const chartCodes: string[] = []
    for (let index = 0; index < 96; index += 1) {
      const page = encodedPages[index + 1]
      expect(page.context.texts.map((entry) => entry.text)).toEqual(expect.arrayContaining([
        `铺豆图 ${index + 1} / 96`, expectedRanges[index], `第 ${index + 2} 页`,
      ]))
      const chart = page.context.drawnCanvases[0]
      const codesOnPage = chart.context.texts.filter((entry) => large.selectedCodes.includes(entry.text)).map((entry) => entry.text)
      const tileRow = Math.floor(index / 12) * 25
      const tileColumn = (index % 12) * 18
      const expectedCodes: string[] = []
      for (let row = tileRow; row < tileRow + 25; row += 1) {
        for (let column = tileColumn; column < Math.min(200, tileColumn + 18); column += 1) {
          expectedCodes.push(large.codes[row * 200 + column]!)
        }
      }
      expect(codesOnPage).toEqual(expectedCodes)
      chartCodes.push(...codesOnPage)
    }
    expect(chartCodes).toHaveLength(40_000)
    const usagePages = encodedPages.slice(97)
    expect(usagePages.map((page) => page.context.texts.find((entry) => entry.text.startsWith('用量页'))?.text)).toEqual([
      '用量页 1 / 2', '用量页 2 / 2',
    ])
    const usageCodes = usagePages.map((page) => page.context.texts.filter((entry) => entry.x === 180 && entry.y >= 248))
    expect(usageCodes.map((rows) => rows.length)).toEqual([42, 1])
    for (const page of usagePages) {
      for (const { text: code, y } of page.context.texts.filter((entry) => entry.x === 180 && entry.y >= 248)) {
        const count = large.codes.filter((value) => value === code).length
        expect(chartCodes.filter((value) => value === code)).toHaveLength(count)
        expect(page.context.texts).toContainEqual({ text: count.toLocaleString('zh-CN'), x: 850, y })
        expect(page.context.texts).toContainEqual({ text: String(Math.ceil(count / 1000)), x: 1020, y })
      }
    }
    expect(progress[0]).toMatchObject({ completedPages: 0, totalPages: 99 })
    expect(progress.at(-1)).toEqual({ completedPages: 99, totalPages: 99, stage: 'finalizing' })
    for (let index = 1; index < progress.length; index += 1) {
      expect(progress[index].completedPages).toBeGreaterThanOrEqual(progress[index - 1].completedPages)
      expect(progress[index].completedPages).toBeLessThanOrEqual(99)
      expect(progress[index].totalPages).toBe(99)
    }
    expect(large).toEqual(unchanged)
    expectReleasedCanvases()
  })

  it('rejects an already cancelled export before allocating canvases', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(createPatternPdf(result, getPalette('221'), {
      beadSizeMm: 5, packSize: 1000, signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' })
    expect(canvases).toHaveLength(0)
    expect(encodedPages).toHaveLength(0)
  })

  it('stops drawing after a progress callback cancels and allows a complete retry', async () => {
    const current = makeResult(40, 30)
    const unchanged = structuredClone(current)
    const controller = new AbortController()
    let pagesAtCancellation = 0
    await expect(createPatternPdf(current, getPalette('221'), {
      beadSizeMm: 5, packSize: 1000, signal: controller.signal,
      onProgress: ({ completedPages }) => {
        if (completedPages === 2) {
          pagesAtCancellation = encodedPages.length
          controller.abort()
        }
      },
    })).rejects.toMatchObject({ name: 'AbortError' })
    expect(encodedPages).toHaveLength(pagesAtCancellation)
    expectReleasedCanvases()
    expect(current).toEqual(unchanged)
    encodedPages = []
    await expect(createPatternPdf(current, getPalette('221'), { beadSizeMm: 5, packSize: 1000 })).resolves.toBeInstanceOf(Blob)
    expect(encodedPages).toHaveLength(8)
    expectReleasedCanvases()
    expect(current).toEqual(unchanged)
  })

  it('lets a queued user cancellation run between page batches', async () => {
    const controller = new AbortController()
    let queued = false
    let cancellationRan = false
    let pagesAtCancellation = 0
    await expect(createPatternPdf(makeResult(200, 200), getPalette('221'), {
      beadSizeMm: 5, packSize: 1000, signal: controller.signal,
      onProgress: ({ completedPages }) => {
        if (completedPages > 0 && !queued) {
          queued = true
          setTimeout(() => {
            cancellationRan = true
            pagesAtCancellation = encodedPages.length
            controller.abort()
          }, 0)
        }
      },
    })).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancellationRan).toBe(true)
    expect(encodedPages).toHaveLength(pagesAtCancellation)
    expect(encodedPages.length).toBeLessThan(98)
    expectReleasedCanvases()
  })

  it('honors cancellation after every page is rendered but before serialization', async () => {
    const controller = new AbortController()
    await expect(createPatternPdf(result, getPalette('221'), {
      beadSizeMm: 5, packSize: 1000, signal: controller.signal,
      onProgress: ({ stage, completedPages, totalPages }) => {
        if (stage === 'finalizing') {
          expect(completedPages).toBe(totalPages)
          controller.abort()
        }
      },
    })).rejects.toMatchObject({ name: 'AbortError' })
    expect(encodedPages).toHaveLength(3)
    expectReleasedCanvases()
  })

  it.each(['encoding', 'embedding'] as const)('releases temporary canvases if JPEG %s fails', async (failure) => {
    if (failure === 'encoding') failEncodingAt = 2
    else vi.spyOn(jsPDF.API, 'addImage').mockImplementation(() => { throw new Error('PDF embedding failed') })
    await expect(createPatternPdf(result, getPalette('221'), { beadSizeMm: 5, packSize: 1000 })).rejects.toThrow()
    expect(encodedPages).toHaveLength(failure === 'encoding' ? 2 : 1)
    expectReleasedCanvases()
  })
})
