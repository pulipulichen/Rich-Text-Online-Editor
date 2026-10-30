import 'tinymce/tinymce'
import 'tinymce/models/dom/model'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/skins/ui/oxide/skin.min.css'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/code'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/image'
import 'tinymce/plugins/link'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/table'
import 'tinymce/plugins/wordcount'
import 'tinymce/plugins/visualblocks'
import contentUiCss from 'tinymce/skins/ui/oxide/content.css?inline'
import contentCss from 'tinymce/skins/content/default/content.css?inline'
import DOMPurify from 'dompurify'
import type { Editor as TinyEditor } from 'tinymce'

const documentCss = [
  'body { box-sizing: border-box; width: 100%; font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 16px; line-height: 1.8; margin: 0; padding: 24px clamp(16px, 3vw, 48px) 80px; color: #17212b; }',
  'h1,h2,h3 { font-weight: 750; line-height: 1.35; margin-top: 1.5em; }',
  'h1 { font-size: 2em; } h2 { font-size: 1.55em; } h3 { font-size: 1.22em; }',
  'img { max-width: 100%; height: auto; border-radius: 8px; }',
  'table { border-collapse: collapse; width: 100%; } th,td { border: 1px solid #cbd5e1; padding: 8px 12px; } th { background: #f1f5f9; }',
  'blockquote { padding-left: 16px; border-left: 3px solid #14b8a6; color: #64748b; }',
  'pre,code { background: #f1f5f9; border-radius: 5px; } pre { padding: 12px; }',
  'a { color: #0d9488; }'
].join('\n')

function normalizeTables(source: string): string {
  const template = document.createElement('template')
  template.innerHTML = DOMPurify.sanitize(source)
  template.content.querySelectorAll('table').forEach((table) => {
    table.removeAttribute('style')
    table.removeAttribute('width')
    table.querySelectorAll('colgroup').forEach(el => el.remove())
    let body = table.querySelector(':scope > tbody')
    if (!body) {
      body = document.createElement('tbody')
      table.append(body)
    }
    Array.from(table.children).filter(el => el.tagName === 'TR').forEach(tr => body!.append(tr))
    const head = table.querySelector(':scope > thead') ?? document.createElement('thead')
    if (!head.parentElement) table.insertBefore(head, body)
    if (head.children.length === 0 && body.children.length > 0) head.append(body.children[0])
    head.querySelectorAll('td').forEach(td => {
      const th = document.createElement('th')
      th.innerHTML = td.innerHTML
      td.replaceWith(th)
    })
    table.querySelectorAll('td,th').forEach(cell => {
      cell.removeAttribute('style')
      cell.removeAttribute('width')
      cell.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'))
    })
  })
  return template.innerHTML
}

export const editorInit = {
  license_key: 'gpl',
  menubar: false,
  toolbar_mode: 'sliding',
  toolbar: 'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | bullist numlist | alignleft aligncenter alignright | link image table | blockquote code fullscreen | cleantable',
  plugins: 'advlist autolink charmap code fullscreen image link lists searchreplace table wordcount visualblocks',
  contextmenu: 'link image table',
  branding: false,
  promotion: false,
  resize: false,
  statusbar: false,
  height: '100%',
  min_height: 420,
  skin: false,
  content_css: false,
  content_style: contentUiCss + '\n' + contentCss + '\n' + documentCss,
  paste_data_images: true,
  automatic_uploads: false,
  convert_urls: false,
  images_upload_handler: (blobInfo: { blob: () => Blob; base64: () => string }) =>
    Promise.resolve('data:' + blobInfo.blob().type + ';base64,' + blobInfo.base64()),
  file_picker_types: 'image',
  file_picker_callback: (callback: (url: string, meta?: Record<string, string>) => void) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => callback(String(reader.result), { title: file.name })
      reader.readAsDataURL(file)
    }
    input.click()
  },
  setup: (editor: TinyEditor) => {
    editor.ui.registry.addButton('cleantable', {
      icon: 'table',
      tooltip: '整理表格 / Normalize tables',
      onAction: () => editor.setContent(normalizeTables(editor.getContent()))
    })
    editor.on('paste', (event: ClipboardEvent) => {
      const plain = event.clipboardData?.getData('text/plain')?.trim() || ''
      const rich = event.clipboardData?.getData('text/html') || ''
      if (rich || !/^<(?:div|p|table|h[1-6]|ul|ol|section|article)\b[\s\S]*<\/[a-z][^>]*>$/i.test(plain)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      editor.insertContent(DOMPurify.sanitize(plain))
    })
  }
}
