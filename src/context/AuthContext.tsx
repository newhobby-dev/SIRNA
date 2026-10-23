import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole, SystemAccount } from '../types';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  systemAccounts: SystemAccount[];
  loginWithCredentials: (username: string, pass: string, rememberMe: boolean) => Promise<{ success: boolean; message: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: UserRole, targetId?: string) => void;
  saveAccount: (account: SystemAccount) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  isDemoMode: boolean;
}

const BOOTSTRAP_ADMIN_EMAIL = 'panitiapemilihanwakasek@gmail.com';

export const defaultSystemAccounts: SystemAccount[] = [
  {
    id: 'acc_admin',
    username: 'admin',
    password: 'AdminGanteng93',
    name: 'Administrator Utama',
    role: 'admin',
    email: 'admin@sman1nusantara.sch.id',
    teacherId: 't_aris',
    isActive: true,
    createdAt: '2026-07-01T00:00:00Z',
  },
  {
    id: 'acc_bk',
    username: 'gurubk',
    password: 'BKSelaras26',
    name: 'Dra. Sri Wahyuni, M.Pd. (Guru BK)',
    role: 'bk',
    email: 'gurubk@sman1nusantara.sch.id',
    teacherId: 't_sri',
    isActive: true,
    createdAt: '2026-07-01T00:00:00Z',
  },
  {
    id: 'acc_teacher',
    username: 'gurumapel',
    password: 'GuruJuara26',
    name: 'Aris Wicaksono, S.Pd.',
    role: 'teacher',
    email: 'panitiapemilihanwakasek@gmail.com',
    teacherId: 't_aris',
    isActive: true,
    createdAt: '2026-07-01T00:00:00Z',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('admin');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [systemAccounts, setSystemAccounts] = useState<SystemAccount[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_accounts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSystemAccounts;
  });

  // Check persisted session on boot
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('sirna_session');
      if (savedSession) {
        const sessionProfile = JSON.parse(savedSession) as UserProfile;
        setProfile(sessionProfile);
        setRole(sessionProfile.role);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.warn('Failed reading session from localStorage:', e);
    }
  }, []);

  // Sync accounts with Firestore
  useEffect(() => {
    let unsub = () => {};
    async function loadAccounts() {
      try {
        const snap = await getDocs(collection(db, 'systemAccounts'));
        if (snap.empty) {
          // Seed default accounts to Firestore
          defaultSystemAccounts.forEach(acc => {
            setDoc(doc(db, 'systemAccounts', acc.id), acc).catch(() => {});
          });
        }
      } catch (err) {
        console.warn('Could not read systemAccounts from Firestore, using local accounts.');
      }

      unsub = onSnapshot(collection(db, 'systemAccounts'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as SystemAccount));
          setSystemAccounts(list);
          localStorage.setItem('sirna_accounts', JSON.stringify(list));
        }
      }, () => {});
    }

    loadAccounts();
    return () => unsub();
  }, []);

  // Firebase auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          const isBootstrapped = user.email === BOOTSTRAP_ADMIN_EMAIL;
          const assignedRole: UserRole = isBootstrapped ? 'admin' : 'teacher';

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            setRole(data.role);
            setIsAuthenticated(true);
          } else {
            const newProfile: UserProfile = {
              id: user.uid,
              username: user.email?.split('@')[0] || 'pengguna',
              email: user.email || '',
              name: user.displayName || (isBootstrapped ? 'Aris Wicaksono, S.Pd. (Admin)' : 'Pengguna Baru'),
              role: assignedRole,
              teacherId: isBootstrapped ? 't_aris' : undefined,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
            setRole(assignedRole);
            setIsAuthenticated(true);
          }
        } catch (err) {
          console.warn('Error reading/writing user profile:', err);
          setRole(user.email === BOOTSTRAP_ADMIN_EMAIL ? 'admin' : 'teacher');
          setProfile({
            id: user.uid,
            username: 'admin',
            email: user.email || '',
            name: user.displayName || 'Aris Wicaksono, S.Pd.',
            role: user.email === BOOTSTRAP_ADMIN_EMAIL ? 'admin' : 'teacher',
            teacherId: 't_aris',
            createdAt: new Date().toISOString(),
          });
          setIsAuthenticated(true);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Username & Password Login
  const loginWithCredentials = async (
    usernameInput: string,
    passInput: string,
    rememberMe: boolean
  ): Promise<{ success: boolean; message: string }> => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passInput.trim();

    const matched = systemAccounts.find(
      a => a.username.toLowerCase() === cleanUser && a.isActive
    );

    if (!matched) {
      return { success: false, message: 'Username tidak ditemukan atau akun sedang dinonaktifkan.' };
    }

    if (matched.password !== cleanPass) {
      return { success: false, message: 'Kata sandi yang Anda masukkan salah.' };
    }

    const userProfile: UserProfile = {
      id: matched.id,
      username: matched.username,
      name: matched.name,
      email: matched.email,
      role: matched.role,
      teacherId: matched.teacherId,
      createdAt: matched.createdAt,
    };

    setProfile(userProfile);
    setRole(matched.role);
    setIsAuthenticated(true);
    setIsDemoMode(false);

    if (rememberMe) {
      localStorage.setItem('sirna_session', JSON.stringify(userProfile));
    } else {
      sessionStorage.setItem('sirna_session', JSON.stringify(userProfile));
    }

    return { success: true, message: 'Berhasil masuk ke dalam sistem.' };
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('Gagal melakukan masuk dengan Google: ' + (err.message || 'Terjadi kesalahan'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await fbSignOut(auth);
      localStorage.removeItem('sirna_session');
      sessionStorage.removeItem('sirna_session');
      setIsAuthenticated(false);
      setProfile(null);
      setRole('admin');
      setIsDemoMode(false);
    } catch (err) {
      console.error('Sign Out Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = (newRole: UserRole, targetId?: string) => {
    setIsDemoMode(true);
    setRole(newRole);
    setIsAuthenticated(true);

    if (newRole === 'admin') {
      const p: UserProfile = {
        id: 'admin_demo',
        username: 'admin',
        email: BOOTSTRAP_ADMIN_EMAIL,
        name: 'Aris Wicaksono, S.Pd.',
        role: 'admin',
        teacherId: 't_aris',
        createdAt: new Date().toISOString(),
      };
      setProfile(p);
    } else if (newRole === 'bk') {
      const p: UserProfile = {
        id: 'bk_demo',
        username: 'gurubk',
        email: 'sri.wahyuni@sman1nusantara.sch.id',
        name: 'Dra. Sri Wahyuni, M.Pd. (Guru BK)',
        role: 'bk',
        teacherId: 't_sri',
        assignedClassIds: ['cls_10_a'],
        createdAt: new Date().toISOString(),
      };
      setProfile(p);
    } else if (newRole === 'teacher') {
      const p: UserProfile = {
        id: 'teacher_demo',
        username: 'gurumapel',
        email: 't_aris@sman1nusantara.sch.id',
        name: 'Aris Wicaksono, S.Pd.',
        role: 'teacher',
        teacherId: targetId || 't_aris',
        createdAt: new Date().toISOString(),
      };
      setProfile(p);
    } else if (newRole === 'student') {
      const p: UserProfile = {
        id: 'student_demo',
        username: 'aditya',
        email: 'siswa@sman1nusantara.sch.id',
        name: 'Aditya Pratama Putra',
        role: 'student',
        studentId: targetId || 'std_10a_01',
        createdAt: new Date().toISOString(),
      };
      setProfile(p);
    }
  };

  const saveAccount = async (account: SystemAccount) => {
    const updated = systemAccounts.some(a => a.id === account.id)
      ? systemAccounts.map(a => a.id === account.id ? account : a)
      : [...systemAccounts, account];

    setSystemAccounts(updated);
    localStorage.setItem('sirna_accounts', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'systemAccounts', account.id), account);
    } catch (e) {
      console.warn('Failed saving account to Firestore (offline cache used):', e);
    }
  };

  const deleteAccount = async (accountId: string) => {
    const updated = systemAccounts.filter(a => a.id !== accountId);
    setSystemAccounts(updated);
    localStorage.setItem('sirna_accounts', JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, 'systemAccounts', accountId));
    } catch (e) {
      console.warn('Failed deleting account from Firestore:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role,
        isAuthenticated,
        isLoading,
        systemAccounts,
        loginWithCredentials,
        signInWithGoogle,
        signOut,
        switchDemoRole,
        saveAccount,
        deleteAccount,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
