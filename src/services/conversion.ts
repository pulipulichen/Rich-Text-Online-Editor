import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import JSZip from 'jszip'

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: false })

export function sanitizeHtml(value: string): string {
  return DOMPurify.sanitize(value, { USE_PROFILES: { html: true } })
}

export function markdownToHtml(source: string): string {
  return sanitizeHtml(markdown.render(source))
}

export function htmlToMarkdown(source: string): string {
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' })
  turndown.use(gfm)
  return turndown.turndown(sanitizeHtml(source)).trim() + '\n'
}

export function htmlToText(source: string): string {
  const container = document.createElement('div')
  container.innerHTML = sanitizeHtml(source)
  return (container.innerText || container.textContent || '').trim()
}

export function fileSafeName(title: string): string {
  return (title.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 80) || 'Untitled')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export function downloadText(text: string, filename: string, mime = 'text/plain'): void {
  downloadBlob(new Blob([text], { type: mime + ';charset=utf-8' }), filename)
}

export function fullHtmlDocument(title: string, body: string): string {
  return '<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
    '</title></head><body>' + sanitizeHtml(body) + '</body></html>'
}

export function hasImages(sourceHtml: string): boolean {
  const container = document.createElement('div')
  container.innerHTML = sanitizeHtml(sourceHtml)
  return Array.from(container.querySelectorAll('img[src]')).some(img => Boolean(img.getAttribute('src')?.trim()))
}

export class ImageExportError extends Error {
  constructor() {
    super('One or more document images could not be bundled into the ZIP.')
    this.name = 'ImageExportError'
  }
}

const imageExtensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/tiff': 'tif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico'
}

function imageExtension(mimeType: string): string {
  const type = mimeType.toLowerCase().split(';')[0].trim()
  if (imageExtensions[type]) return imageExtensions[type]
  const subtype = type.startsWith('image/') ? type.slice(6).replace(/^x-/, '').replace(/\+xml$/, '') : ''
  return /^[a-z0-9-]+$/.test(subtype) ? subtype : 'img'
}

async function documentZip(title: string, sourceHtml: string, format: 'html' | 'md'): Promise<Blob> {
  const zip = new JSZip()
  const folder = zip.folder('assets')!
  const container = document.createElement('div')
  container.innerHTML = sanitizeHtml(sourceHtml)
  const packed = new Map<string, string>()
  let counter = 0

  for (const img of container.querySelectorAll('img[src]')) {
    const source = img.getAttribute('src')?.trim() || ''
    if (!source) continue

    let filename = packed.get(source)
    if (!filename) {
      let image: Blob
      try {
        // Data URLs (pasted images) and CORS-accessible URLs are both supported.
        const response = await fetch(source)
        if (!response.ok) throw new Error('Image fetch failed')
        image = await response.blob()
      } catch {
        // Never silently create an incomplete archive when a remote image blocks CORS.
        throw new ImageExportError()
      }

      const mimeType = image.type || /^data:(image\/[a-z0-9.+-]+)/i.exec(source)?.[1] || ''
      if (!mimeType.toLowerCase().startsWith('image/')) throw new ImageExportError()
      filename = 'image-' + String(++counter).padStart(3, '0') + '.' + imageExtension(mimeType)
      folder.file(filename, image)
      packed.set(source, filename)
    }
    img.setAttribute('src', 'assets/' + filename)
  }

  const documentName = fileSafeName(title) + (format === 'html' ? '.html' : '.md')
  zip.file(documentName, format === 'html'
    ? fullHtmlDocument(title, container.innerHTML)
    : htmlToMarkdown(container.innerHTML))
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

export async function markdownZip(title: string, sourceHtml: string): Promise<Blob> {
  return documentZip(title, sourceHtml, 'md')
}

export async function htmlZip(title: string, sourceHtml: string): Promise<Blob> {
  return documentZip(title, sourceHtml, 'html')
}
