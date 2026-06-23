/**
 * Storage abstraction layer.
 *
 * Uses Firestore for task persistence when Firebase is configured;
 * otherwise falls back to localStorage so the app works fully offline.
 *
 * Settings and chat history always use localStorage (user-specific prefs).
 */

import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLECTION_NAME = 'tasks';
const LS_TASKS_KEY = 'leo-tasks';
const LS_SETTINGS_KEY = 'leo-settings';
const LS_CHAT_KEY = 'leo-chat-history';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Whether Firestore is available. */
export function isFirestoreAvailable() {
  return db !== null;
}

/**
 * Safely read & parse a localStorage key, returning `fallback` on failure.
 */
function readLS(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Safely write a value to localStorage as JSON. */
function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently fail.
  }
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/**
 * Fetch all tasks.
 * @returns {Promise<Array>}
 */
export async function getTasks() {
  if (isFirestoreAvailable()) {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return readLS(LS_TASKS_KEY, []);
}

/**
 * Add a new task.
 * @param {object} task - Task object (without id when using Firestore).
 * @returns {Promise<object>} The saved task including its id.
 */
export async function addTask(task) {
  if (isFirestoreAvailable()) {
    const { id, ...data } = task; // Firestore generates its own id
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
    return { id: docRef.id, ...data };
  }

  const tasks = readLS(LS_TASKS_KEY, []);
  tasks.unshift(task); // newest first
  writeLS(LS_TASKS_KEY, tasks);
  return task;
}

/**
 * Update an existing task by id.
 * @param {string} id
 * @param {object} updates - Partial fields to merge.
 * @returns {Promise<void>}
 */
export async function updateTask(id, updates) {
  if (isFirestoreAvailable()) {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
    return;
  }

  const tasks = readLS(LS_TASKS_KEY, []);
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates };
    writeLS(LS_TASKS_KEY, tasks);
  }
}

/**
 * Delete a task by id.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteTask(id) {
  if (isFirestoreAvailable()) {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return;
  }

  const tasks = readLS(LS_TASKS_KEY, []);
  writeLS(
    LS_TASKS_KEY,
    tasks.filter((t) => t.id !== id),
  );
}

/**
 * Subscribe to real-time task changes.
 *
 * When Firestore is available an `onSnapshot` listener is attached and
 * the returned function can be called to unsubscribe.
 *
 * With localStorage the callback is invoked immediately with the current
 * tasks and a no-op unsubscribe function is returned.
 *
 * @param {(tasks: Array) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onTasksChange(callback) {
  if (isFirestoreAvailable()) {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(tasks);
    });
    return unsubscribe;
  }

  // localStorage: invoke immediately with current data.
  callback(readLS(LS_TASKS_KEY, []));
  return () => {}; // no-op unsubscribe
}

// ---------------------------------------------------------------------------
// Settings (localStorage only)
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  theme: 'system',
  notifications: true,
  aiFeatures: true,
  defaultCategory: 'personal',
  defaultPriority: 'medium',
};

/**
 * Get user settings, merged with defaults.
 * @returns {object}
 */
export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readLS(LS_SETTINGS_KEY, {}) };
}

/**
 * Persist user settings.
 * @param {object} settings
 */
export function saveSettings(settings) {
  writeLS(LS_SETTINGS_KEY, settings);
}

// ---------------------------------------------------------------------------
// Chat history (localStorage only)
// ---------------------------------------------------------------------------

/**
 * Get the saved chat history array.
 * @returns {Array}
 */
export function getChatHistory() {
  return readLS(LS_CHAT_KEY, []);
}

/**
 * Save the chat history array.
 * @param {Array} messages
 */
export function saveChatHistory(messages) {
  writeLS(LS_CHAT_KEY, messages);
}
