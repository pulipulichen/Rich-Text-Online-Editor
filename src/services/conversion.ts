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

export async function markdownZip(title: string, sourceHtml: string): Promise<Blob> {
  const zip = new JSZip()
  const folder = zip.folder('assets')!
  const container = document.createElement('div')
  container.innerHTML = sanitizeHtml(sourceHtml)
  let counter = 0
  for (const img of container.querySelectorAll('img')) {
    const source = img.getAttribute('src') || ''
    const match = /^data:(image\/(?:png|jpeg|gif|webp|svg\+xml));base64,([a-z0-9+/=]+)$/i.exec(source)
    if (!match) continue
    const ext: Record<string, string> = {
      'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
      'image/webp': 'webp', 'image/svg+xml': 'svg'
    }
    const filename = 'image-' + String(++counter).padStart(3, '0') + '.' + ext[match[1].toLowerCase()]
    folder.file(filename, match[2], { base64: true })
    img.setAttribute('src', 'assets/' + filename)
  }
  zip.file(fileSafeName(title) + '.md', htmlToMarkdown(container.innerHTML))
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}
