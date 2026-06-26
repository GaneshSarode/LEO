import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { calculatePriorityScore, autoAssignPriority } from '@/lib/taskEngine';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length && firebaseConfig.projectId ? initializeApp(firebaseConfig) : (getApps().length ? getApp() : null);
export const db = app ? getFirestore(app) : null;

// Session ID logic (localStorage)
export const getSessionId = () => {
  if (typeof window === 'undefined') return 'server-session';
  let sessionId = localStorage.getItem('leo_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('leo_session_id', sessionId);
  }
  return sessionId;
};

// CRUD Functions
const COLLECTION_NAME = 'tasks';

export const getTasks = async () => {
  if (!db) return [];
  const sessionId = getSessionId();
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tasks: ", error);
    return [];
  }
};

export const addTask = async (taskData) => {
  if (!db) return null;
  const sessionId = getSessionId();
  try {
    // Auto-compute priority from taskEngine
    const priorityScore = calculatePriorityScore(taskData);
    const priority = autoAssignPriority(taskData);
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...taskData,
      priority,
      priorityScore,
      sessionId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding task: ", error);
    throw error;
  }
};

export const updateTask = async (taskId, updates) => {
  if (!db) return;
  try {
    // Recompute priority if task data changes
    if (updates.deadline || updates.completed !== undefined || updates.subtasks) {
      const priorityScore = calculatePriorityScore(updates);
      const priority = autoAssignPriority(updates);
      updates = { ...updates, priority, priorityScore };
    }
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(taskRef, updates);
  } catch (error) {
    console.error("Error updating task: ", error);
    throw error;
  }
};

export const deleteTask = async (taskId) => {
  if (!db) return;
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error("Error deleting task: ", error);
    throw error;
  }
};

export const toggleSubtask = async (taskId, subtaskArray, subtaskId) => {
  if (!db) return;
  try {
    const updatedSubtasks = subtaskArray.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await updateTask(taskId, { subtasks: updatedSubtasks });
  } catch (error) {
    console.error("Error toggling subtask: ", error);
    throw error;
  }
};
