import { ConversationRecord, UserProfile } from '../types/chat';

const DB_NAME = 'WhatDidIMissLocalDB';
const DB_VERSION = 1;
const STORE_CONVERSATIONS = 'conversations';
const PROFILE_STORAGE_KEY = 'wdim_user_profile_v1';

const DEFAULT_PROFILE: UserProfile = {
  userName: 'Alex',
  aliases: ['@alex', 'alex_c'],
  followedTopics: ['exam', 'midterm', 'submission', 'api', 'deadline', 'slides'],
  persistLocally: true,
  useBrowserNativeAI: false,
  useGroqAI: true,
  groqModel: 'qwen/qwen3.8-27b',
};

function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open local IndexedDB database.'));
    };
  });
}

export async function saveConversationLocally(record: ConversationRecord): Promise<void> {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    store.put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadAllLocalConversations(): Promise<ConversationRecord[]> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const items = (req.result as ConversationRecord[]) || [];
        items.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        resolve(items);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export async function deleteLocalConversation(id: string): Promise<void> {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function wipeAllLocalData(): Promise<void> {
  try {
    const db = await openLocalDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      store.clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Ignore if DB was not initialized
  }
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Ignore localStorage restrictions
  }
}

export function loadUserProfile(): UserProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      userName: typeof parsed.userName === 'string' ? parsed.userName : DEFAULT_PROFILE.userName,
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases : DEFAULT_PROFILE.aliases,
      followedTopics: Array.isArray(parsed.followedTopics)
        ? parsed.followedTopics
        : DEFAULT_PROFILE.followedTopics,
      persistLocally:
        typeof parsed.persistLocally === 'boolean'
          ? parsed.persistLocally
          : DEFAULT_PROFILE.persistLocally,
      useBrowserNativeAI:
        typeof parsed.useBrowserNativeAI === 'boolean'
          ? parsed.useBrowserNativeAI
          : DEFAULT_PROFILE.useBrowserNativeAI,
      useGroqAI:
        typeof parsed.useGroqAI === 'boolean'
          ? parsed.useGroqAI
          : DEFAULT_PROFILE.useGroqAI,
      groqModel:
        typeof parsed.groqModel === 'string' && parsed.groqModel.trim()
          ? parsed.groqModel
          : DEFAULT_PROFILE.groqModel,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function estimateStorageFootprintBytes(conversations: ConversationRecord[]): number {
  try {
    const json = JSON.stringify(conversations);
    return new Blob([json]).size;
  } catch {
    return 0;
  }
}
