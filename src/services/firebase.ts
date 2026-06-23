import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { Doctor, Vote, SystemConfig } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAk00IEZ3moWmZi0hiDJzyjrLmt_LrYPI8",
  authDomain: "jianan-voting.firebaseapp.com",
  projectId: "jianan-voting",
  storageBucket: "jianan-voting.firebasestorage.app",
  messagingSenderId: "159969110468",
  appId: "1:159969110468:web:00ebc439052c1f0a6cdc91",
  measurementId: "G-XBZPE29021"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection References
const CONFIG_COLLECTION = 'config';
const DOCTORS_COLLECTION = 'doctors';
const VOTES_COLLECTION = 'votes';

// --- Configuration Services ---

export const getSystemConfig = async (): Promise<SystemConfig> => {
  try {
    const querySnapshot = await getDocs(collection(db, CONFIG_COLLECTION));
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data() as SystemConfig;
      // 確保舊資料也有新欄位的預設值
      const today = new Date();
      const rocYear = today.getFullYear() - 1911;
      const defaults = {
        theme: 'blue' as const,
        votingStart: { year: rocYear, month: today.getMonth() + 1, day: 1 },
        votingEnd: { year: rocYear, month: today.getMonth() + 1, day: 31 },
      };
      return {
        ...defaults,
        ...data
      };
    } else {
      // 若無設定，建立預設值
      const today = new Date();
      const rocYear = today.getFullYear() - 1911;
      const defaultConfig: SystemConfig = {
        currentYear: rocYear,
        currentMonth: today.getMonth() + 1,
        adminPassword: '0000',
        theme: 'blue',
        votingStart: { year: rocYear, month: today.getMonth() + 1, day: 1 },
        votingEnd: { year: rocYear, month: today.getMonth() + 1, day: 31 }
      };
      await addDoc(collection(db, CONFIG_COLLECTION), defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error("Error getting config:", error);
    const today = new Date();
    const rocYear = today.getFullYear() - 1911;
    // 網路錯誤時的備用預設值
    return { 
      currentYear: rocYear, 
      currentMonth: today.getMonth() + 1, 
      adminPassword: '0000',
      theme: 'blue',
      votingStart: { year: rocYear, month: today.getMonth() + 1, day: 1 },
      votingEnd: { year: rocYear, month: today.getMonth() + 1, day: 31 }
    };
  }
};

export const updateSystemConfig = async (newConfig: SystemConfig): Promise<void> => {
  const querySnapshot = await getDocs(collection(db, CONFIG_COLLECTION));
  if (!querySnapshot.empty) {
    const docRef = querySnapshot.docs[0].ref;
    await setDoc(docRef, newConfig);
  } else {
    await addDoc(collection(db, CONFIG_COLLECTION), newConfig);
  }
};

// --- Doctor List Services ---

export const getDoctors = async (): Promise<Doctor[]> => {
  const querySnapshot = await getDocs(collection(db, DOCTORS_COLLECTION));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      ...data, 
      id: doc.id,
      password: data.password || '0000'
    } as Doctor;
  });
};

export const addDoctor = async (name: string, role: 'attending' | 'resident'): Promise<void> => {
  await addDoc(collection(db, DOCTORS_COLLECTION), {
    name,
    role,
    isActive: true,
    password: '0000'
  });
};

export const deleteDoctor = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, DOCTORS_COLLECTION, id));
};

export const updateDoctorPassword = async (id: string, newPassword: string): Promise<void> => {
  const docRef = doc(db, DOCTORS_COLLECTION, id);
  await updateDoc(docRef, { password: newPassword });
};

// --- Voting Services ---

export const submitVote = async (vote: Vote): Promise<void> => {
  await addDoc(collection(db, VOTES_COLLECTION), vote);
};

export const getVotesByDate = async (year: number, month: number): Promise<Vote[]> => {
  const q = query(
    collection(db, VOTES_COLLECTION),
    where("year", "==", year),
    where("month", "==", month)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vote));
};

export const deleteVote = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, VOTES_COLLECTION, id));
};

export const hasUserVoted = async (name: string, year: number, month: number): Promise<boolean> => {
  const q = query(
    collection(db, VOTES_COLLECTION),
    where("voterName", "==", name),
    where("year", "==", year),
    where("month", "==", month)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export const resetMonthlyVotes = async (year: number, month: number): Promise<void> => {
  const q = query(
    collection(db, VOTES_COLLECTION),
    where("year", "==", year),
    where("month", "==", month)
  );
  const querySnapshot = await getDocs(q);
  const batch = writeBatch(db);
  querySnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};
