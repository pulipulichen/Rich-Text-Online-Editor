import { openDB } from 'idb'

export interface SavedDocument {
  title: string
  html: string
  updatedAt: number
}

const database = openDB('rich-text-online-editor', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents')
  }
})

export async function loadDraft(): Promise<SavedDocument | undefined> {
  return (await database).get('documents', 'current')
}

export async function saveDraft(draft: SavedDocument): Promise<void> {
  await (await database).put('documents', draft, 'current')
}
