import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// Configurações do Firebase extraídas do .env ou fallback seguro
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuildAndDev1234567890",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "operacao-aniversario.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "operacao-aniversario",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "operacao-aniversario.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef1234567890"
};

// Inicializa a aplicação Firebase
export const app = initializeApp(firebaseConfig);

// Inicializa o serviço de Autenticação
export const auth = getAuth(app);

// Inicializa o banco de dados Cloud Firestore
export const db = getFirestore(app);

// Habilita Persistência Offline Nativa em IndexedDB para 0ms de leitura e otimização de cota
try {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase Firestore] Múltiplas abas abertas, persistência habilitada na aba primária.');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase Firestore] O navegador atual não suporta suporte offline em IndexedDB.');
    }
  });
} catch (e) {
  console.warn('[Firebase Firestore] Erro ao inicializar persistência offline:', e);
}
