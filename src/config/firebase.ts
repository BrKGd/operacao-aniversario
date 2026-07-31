import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

// Configurações do Firebase do projeto operacao-aniversario
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCioYNQt9sn5G-NHryE3UuEvVTppwAv5wI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "operacao-aniversario.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "operacao-aniversario",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "operacao-aniversario.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "896043485741",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:896043485741:web:050c1a9156288e8b7f46a4"
};

// Inicializa a aplicação Firebase
export const app = initializeApp(firebaseConfig);

// Inicializa o serviço de Autenticação
export const auth = getAuth(app);

// Inicializa o banco de dados Cloud Firestore com persistência offline moderna e detecção de proxy/firewall corporativo
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true
});
