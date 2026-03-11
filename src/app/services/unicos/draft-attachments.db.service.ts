import { Injectable } from '@angular/core';

export type DraftAttachment = {
  id: string;              // uuid
  draftKey: string;        // ex: 'novo-chamado-draft-v1'
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;              // conteúdo real
};

@Injectable({ providedIn: 'root' })
export class DraftAttachmentsDbService {
  private readonly DB_NAME = 'chamados-draft-db';
  private readonly DB_VER = 1;
  private readonly STORE = 'attachments';

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          const store = db.createObjectStore(this.STORE, { keyPath: 'id' });
          store.createIndex('draftKey', 'draftKey', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async put(att: DraftAttachment): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).put(att);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async listByDraftKey(draftKey: string): Promise<DraftAttachment[]> {
    const db = await this.open();
    const out = await new Promise<DraftAttachment[]>((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const idx = tx.objectStore(this.STORE).index('draftKey');
      const req = idx.getAll(draftKey);
      req.onsuccess = () => resolve(req.result as DraftAttachment[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return out;
  }

  async deleteById(id: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async clearDraft(draftKey: string): Promise<void> {
    const items = await this.listByDraftKey(draftKey);
    for (const it of items) await this.deleteById(it.id);
  }

  async getById(id: string): Promise<DraftAttachment | null> {
    const db = await this.open();
    const out = await new Promise<DraftAttachment | null>((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).get(id);
      req.onsuccess = () => resolve((req.result as DraftAttachment) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return out;
  }

  async getSizeById(id: string): Promise<number | null> {
    const item = await this.getById(id);
    return item?.blob?.size ?? null;
  }
}
