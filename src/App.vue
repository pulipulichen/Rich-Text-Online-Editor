<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Editor from '@tinymce/tinymce-vue'
import {
  BookOpenText, Check, ChevronDown, CloudDownload, Code2, Copy, Download,
  FilePlus2, FileText, FileUp, Github, Laptop,
  Languages, Moon, MoreHorizontal, Sun, X
} from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import { editorInit } from '@/editor/tinymce'
import {
  downloadBlob, downloadText, fileSafeName, fullHtmlDocument,
  htmlToMarkdown, htmlToText, markdownToHtml, markdownZip, sanitizeHtml
} from '@/services/conversion'
import { loadDraft, saveDraft } from '@/services/storage'

type Locale = 'zh-TW' | 'en'
type Theme = 'system' | 'light' | 'dark'
type InstallPrompt = Event & { prompt: () => Promise<void> }

const locales = {
  'zh-TW': {
    subtitle: '所見即所得 · Markdown / HTML',
    untitled: '未命名文件',
    placeholder: '輸入文件名稱…',
    tip: '直接編輯、貼上圖片，不需要撰寫 Markdown 語法',
    open: '開啟檔案',
    new: '新增文件',
    copy: '複製',
    export: '匯出',
    copyHtml: '複製 HTML',
    copyMd: '複製 Markdown',
    copyText: '複製純文字',
    exportHtml: '下載 HTML',
    exportMd: '下載 Markdown',
    exportZip: '下載 Markdown 與圖片 ZIP',
    saved: '已自動儲存',
    saving: '正在儲存…',
    unsaved: '尚未儲存',
    words: '字元',
    copyDone: '已複製到剪貼簿',
    importDone: '檔案已匯入',
    exportDone: '匯出完成',
    storageError: '瀏覽器儲存失敗，請先下載文件備份',
    failed: '操作失敗，請檢查檔案或瀏覽器權限',
    newTitle: '開始新文件？',
    newBody: '這會清除目前的草稿。請先複製或匯出需要保留的內容。',
    cancel: '取消',
    confirm: '建立新文件',
    install: '安裝 App',
    installHint: '若瀏覽器未提供安裝提示，可透過瀏覽器選單安裝此網站。需要網路才能開啟。',
    close: '關閉',
    theme: '切換主題',
    language: '切換語言',
    noOffline: '需要網路 · 無離線快取'
  },
  en: {
    subtitle: 'WYSIWYG · Markdown / HTML',
    untitled: 'Untitled document',
    placeholder: 'Name your document…',
    tip: 'Edit visually and paste images, without writing Markdown syntax',
    open: 'Open file',
    new: 'New document',
    copy: 'Copy',
    export: 'Export',
    copyHtml: 'Copy HTML',
    copyMd: 'Copy Markdown',
    copyText: 'Copy plain text',
    exportHtml: 'Download HTML',
    exportMd: 'Download Markdown',
    exportZip: 'Download Markdown + images ZIP',
    saved: 'Autosaved',
    saving: 'Saving…',
    unsaved: 'Not yet saved',
    words: 'characters',
    copyDone: 'Copied to clipboard',
    importDone: 'File imported',
    exportDone: 'Export complete',
    storageError: 'Browser storage failed. Download a backup.',
    failed: 'Operation failed. Check file and browser permissions.',
    newTitle: 'Start a new document?',
    newBody: 'This replaces the current draft. Copy or export anything you need to keep first.',
    cancel: 'Cancel',
    confirm: 'Create new document',
    install: 'Install app',
    installHint: 'If no install prompt is available, use your browser menu to install this website. Network is required to open it.',
    close: 'Close',
    theme: 'Change theme',
    language: 'Change language',
    noOffline: 'Network required · no offline cache'
  }
} as const

const locale = ref<Locale>(localStorage.getItem('rtoe-locale') === 'en' ? 'en' : 'zh-TW')
const t = computed(() => locales[locale.value])
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
const chosenTheme = localStorage.getItem('rtoe-theme')
const theme = ref<Theme>(chosenTheme === 'dark' || chosenTheme === 'light' ? chosenTheme : 'system')
const dark = ref(false)
const html = ref('<h1>Welcome 👋</h1><p>Start writing here. Paste images, create tables, or import a Markdown file.</p>')
const title = ref('')
const ready = ref(false)
const saving = ref(false)
const savedAt = ref<number | null>(null)
const storageFailed = ref(false)
const busy = ref(false)
const feedback = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const openMenu = ref<'file' | 'copy' | 'export' | null>(null)
const modal = ref<'new' | 'install' | null>(null)
const installEvent = ref<InstallPrompt | null>(null)
const charCount = computed(() => htmlToText(html.value).length)
const displayName = computed(() => title.value.trim() || t.value.untitled)
const editorOptions = editorInit as any
let saveTimer: ReturnType<typeof setTimeout> | undefined
let feedbackTimer: ReturnType<typeof setTimeout> | undefined

function updateTheme(): void {
  dark.value = theme.value === 'system' ? systemTheme.matches : theme.value === 'dark'
  document.documentElement.classList.toggle('dark', dark.value)
}
function rotateTheme(): void {
  theme.value = theme.value === 'system' ? 'dark' : theme.value === 'dark' ? 'light' : 'system'
}
function onEditorInput(value: string): void { html.value = value }
function toggleLocale(): void { locale.value = locale.value === 'zh-TW' ? 'en' : 'zh-TW' }
function notify(message: string): void {
  feedback.value = message
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => { feedback.value = '' }, 2800)
}
function closeMenus(): void { openMenu.value = null }
function toggleMenu(which: 'file' | 'copy' | 'export'): void {
  openMenu.value = openMenu.value === which ? null : which
}
async function persist(): Promise<void> {
  if (!ready.value) return
  saving.value = true
  try {
    await saveDraft({ title: title.value, html: html.value, updatedAt: Date.now() })
    savedAt.value = Date.now()
    storageFailed.value = false
  } catch (error) {
    console.error('Draft save failed', error)
    storageFailed.value = true
  } finally {
    saving.value = false
  }
}
function scheduleSave(): void {
  if (!ready.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saving.value = true
  saveTimer = setTimeout(() => { void persist() }, 600)
}
watch([title, html], scheduleSave)
watch(locale, value => {
  document.documentElement.lang = value
  localStorage.setItem('rtoe-locale', value)
})
watch(theme, value => {
  localStorage.setItem('rtoe-theme', value)
  updateTheme()
})
watch(displayName, value => { document.title = value + ' · Rich Text Online Editor' })
function systemThemeChanged(): void { if (theme.value === 'system') updateTheme() }
function visibilityChanged(): void {
  if (document.visibilityState === 'hidden' && ready.value) {
    if (saveTimer) clearTimeout(saveTimer)
    void persist()
  }
}
function installAvailable(event: Event): void {
  event.preventDefault()
  installEvent.value = event as InstallPrompt
}
function openFilePicker(): void {
  closeMenus()
  fileInput.value?.click()
}
async function openFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    if (!/\.(md|markdown|html?|txt)$/i.test(file.name)) throw new Error('Unsupported file')
    const content = await file.text()
    title.value = file.name.replace(/\.(md|markdown|html?|txt)$/i, '')
    html.value = /\.html?$/i.test(file.name) ? sanitizeHtml(content) : markdownToHtml(content)
    await persist()
    notify(t.value.importDone)
  } catch (error) { console.error(error); notify(t.value.failed) }
}
async function copyAs(kind: 'html' | 'md' | 'text'): Promise<void> {
  closeMenus()
  try {
    const value = kind === 'html' ? html.value : kind === 'md' ? htmlToMarkdown(html.value) : htmlToText(html.value)
    await navigator.clipboard.writeText(value)
    notify(t.value.copyDone)
  } catch (error) { console.error(error); notify(t.value.failed) }
}
async function exportAs(kind: 'html' | 'md' | 'zip'): Promise<void> {
  closeMenus()
  busy.value = true
  try {
    const name = fileSafeName(displayName.value)
    if (kind === 'html') downloadText(fullHtmlDocument(displayName.value, html.value), name + '.html', 'text/html')
    else if (kind === 'md') downloadText(htmlToMarkdown(html.value), name + '.md', 'text/markdown')
    else downloadBlob(await markdownZip(name, html.value), name + '.zip')
    notify(t.value.exportDone)
  } catch (error) { console.error(error); notify(t.value.failed) }
  finally { busy.value = false }
}
async function newDocument(): Promise<void> {
  title.value = ''
  html.value = '<p></p>'
  modal.value = null
  await persist()
}
async function installApp(): Promise<void> {
  closeMenus()
  if (installEvent.value) {
    try { await installEvent.value.prompt() } catch (error) { console.error(error) }
    installEvent.value = null
  } else modal.value = 'install'
}
function windowOpenRepo(): void { window.open("https://github.com/pulipulichen/Rich-Text-Online-Editor", "_blank", "noopener,noreferrer") }
function outsideClick(event: MouseEvent): void {
  if (!(event.target as HTMLElement).closest('.dropdown')) closeMenus()
}
onMounted(async () => {
  updateTheme()
  document.documentElement.lang = locale.value
  systemTheme.addEventListener('change', systemThemeChanged)
  document.addEventListener('visibilitychange', visibilityChanged)
  document.addEventListener('click', outsideClick)
  window.addEventListener('beforeinstallprompt', installAvailable)
  try {
    const draft = await loadDraft()
    if (draft) {
      title.value = draft.title
      html.value = draft.html
      savedAt.value = draft.updatedAt
    }
  } catch (error) { console.error('Draft load failed', error); storageFailed.value = true }
  ready.value = true
})
onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (feedbackTimer) clearTimeout(feedbackTimer)
  systemTheme.removeEventListener('change', systemThemeChanged)
  document.removeEventListener('visibilitychange', visibilityChanged)
  document.removeEventListener('click', outsideClick)
  window.removeEventListener('beforeinstallprompt', installAvailable)
})
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="brand">
        <div class="brand-mark"><BookOpenText :size="23" /></div>
        <div class="brand-copy">
          <div class="brand-name">Rich Text Online Editor</div>
          <div class="brand-subtitle">{{ t.subtitle }}</div>
        </div>
      </div>
      <div class="header-actions">
        <Button size="icon" variant="ghost" :title="t.language" :aria-label="t.language" @click="toggleLocale">
          <Languages :size="18" />
        </Button>
        <Button size="icon" variant="ghost" :title="t.theme" :aria-label="t.theme" @click="rotateTheme">
          <Moon v-if="dark" :size="18" /><Sun v-else :size="18" />
        </Button>
        <Button size="icon" variant="ghost" title="GitHub" aria-label="GitHub" @click="windowOpenRepo">
          <Github :size="19" />
        </Button>
        <div class="dropdown">
          <Button size="icon" variant="ghost" aria-label="Menu" @click.stop="toggleMenu('file')"><MoreHorizontal :size="21" /></Button>
          <div v-if="openMenu === 'file'" class="dropdown-menu">
            <button class="menu-item" @click="openFilePicker"><FileUp />{{ t.open }}</button>
            <button class="menu-item" @click="modal = 'new'; closeMenus()"><FilePlus2 />{{ t.new }}</button>
            <div class="menu-divider"></div>
            <button class="menu-item" @click="installApp"><Laptop />{{ t.install }}</button>
          </div>
        </div>
      </div>
    </header>

    <main class="workspace">
      <section class="document-card" aria-label="Document">
        <div class="doc-header">
          <div class="min-w-0 flex-1">
            <input v-model="title" class="doc-title" :aria-label="t.placeholder" :placeholder="t.placeholder" maxlength="120" />
            <p class="doc-caption">{{ t.tip }}</p>
          </div>
          <Button size="sm" variant="outline" @click="openFilePicker"><FileUp :size="16" /> <span class="hidden sm:inline">{{ t.open }}</span></Button>
        </div>

        <div v-if="storageFailed" class="load-error" role="alert">{{ t.storageError }}</div>
        <div class="doc-content">
          <Editor
            v-if="ready"
            :model-value="html"
            :init="editorOptions"
            license-key="gpl"
            @update:model-value="onEditorInput"
          />
          <div v-else class="flex flex-1 items-center justify-center text-slate-400">Loading editor…</div>
        </div>

        <div class="toolbar-row">
          <div class="doc-status" role="status" aria-live="polite">
            <span v-if="storageFailed">{{ t.unsaved }}</span>
            <span v-else-if="saving">{{ t.saving }}</span>
            <span v-else-if="savedAt"><Check :size="13" class="inline-block mr-1" />{{ t.saved }}</span>
            <span v-else>{{ t.unsaved }}</span>
            <span class="mx-2">·</span>{{ charCount }} {{ t.words }}
            <span v-if="feedback" class="ml-2 text-teal-600">{{ feedback }}</span>
          </div>
          <div class="action-group">
            <div class="dropdown">
              <Button variant="outline" @click.stop="toggleMenu('copy')"><Copy :size="16" />{{ t.copy }} <ChevronDown :size="14" /></Button>
              <div v-if="openMenu === 'copy'" class="dropdown-menu">
                <button class="menu-item" @click="copyAs('html')"><Code2 />{{ t.copyHtml }}</button>
                <button class="menu-item" @click="copyAs('md')"><FileText />{{ t.copyMd }}</button>
                <button class="menu-item" @click="copyAs('text')"><Copy />{{ t.copyText }}</button>
              </div>
            </div>
            <div class="dropdown">
              <Button :disabled="busy" @click.stop="toggleMenu('export')"><Download :size="16" />{{ t.export }} <ChevronDown :size="14" /></Button>
              <div v-if="openMenu === 'export'" class="dropdown-menu">
                <button class="menu-item" @click="exportAs('html')"><Code2 />{{ t.exportHtml }}</button>
                <button class="menu-item" @click="exportAs('md')"><FileText />{{ t.exportMd }}</button>
                <button class="menu-item" @click="exportAs('zip')"><CloudDownload />{{ t.exportZip }}</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">Rich Text Online Editor · GPL-3.0 · {{ t.noOffline }}</footer>
    <input ref="fileInput" type="file" accept=".html,.htm,.md,.markdown,.txt" class="hidden" @change="openFile" />
    <div v-if="modal" class="modal-cover" @click.self="modal = null">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="flex items-center justify-between">
          <h2>{{ modal === 'new' ? t.newTitle : t.install }}</h2>
          <Button size="icon" variant="ghost" :aria-label="t.close" @click="modal = null"><X :size="20" /></Button>
        </div>
        <p>{{ modal === 'new' ? t.newBody : t.installHint }}</p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="modal = null">{{ t.cancel }}</Button>
          <Button v-if="modal === 'new'" @click="newDocument">{{ t.confirm }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>
