import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testFirestoreConnection, sanitizeFirestoreData } from '../lib/firebase';
import {
  SchoolSetting,
  AcademicYear,
  Semester,
  ClassRoom,
  Subject,
  Teacher,
  TeachingAssignment,
  Student,
  GradeEntry,
  AcademicSummary,
  AuditLog,
  GradeStatus,
} from '../types';
import {
  defaultSchoolSetting,
  defaultAcademicYears,
  defaultSemesters,
  defaultClasses,
  defaultSubjects,
  defaultTeachers,
  defaultTeachingAssignments,
  defaultStudents,
  initialGradeEntries,
  defaultSummaries,
} from '../lib/seedData';
import { assignCompetitionRanks, sortStudentsAlphabetically, isSubjectApplicableToClass, sortSubjects } from '../lib/utils';
import { useAuth } from './AuthContext';

interface AcademicContextType {
  schoolSettings: SchoolSetting;
  academicYears: AcademicYear[];
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  semesters: Semester[];
  selectedSemesterId: string;
  setSelectedSemesterId: (id: string) => void;
  currentSemester: Semester | undefined;
  classes: ClassRoom[];
  subjects: Subject[];
  teachers: Teacher[];
  teachingAssignments: TeachingAssignment[];
  students: Student[];
  gradeEntries: GradeEntry[];
  academicSummaries: AcademicSummary[];
  auditLogs: AuditLog[];
  isSyncing: boolean;
  lastSyncTime: Date | null;
  networkOnline: boolean;

  // Grade Operations
  saveGradeEntries: (entries: Partial<GradeEntry>[], status: GradeStatus) => Promise<void>;
  verifyAssignmentGrades: (assignmentId: string, approve: boolean, revisionNote?: string) => Promise<void>;
  finalizeAssignmentGrades: (assignmentId: string) => Promise<void>;
  publishSemesterGrades: (semesterId: string) => Promise<void>;
  recalculateAveragesAndRanks: (semesterId: string) => Promise<void>;
  saveManualRanks: (updates: {
    studentId: string;
    semesterId: string;
    classRank?: number | null;
    parallelRank?: number | null;
    eligibleRank?: number | null;
  }[]) => Promise<void>;

  // Management CRUD
  updateSchoolSettings: (settings: Partial<SchoolSetting>) => Promise<void>;
  saveStudent: (student: Student) => Promise<void>;
  saveStudentsBatch: (studentsToSave: Student[]) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  saveClass: (cls: ClassRoom) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  saveSubject: (subj: Subject) => Promise<void>;
  saveSubjectsOrder: (orderedSubjects: Subject[]) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  saveTeacher: (teacher: Teacher) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  saveTeachingAssignment: (assignment: TeachingAssignment) => Promise<void>;
  deleteTeachingAssignment: (assignmentId: string) => Promise<void>;
  saveSemester: (semester: Semester) => Promise<void>;
  saveAcademicYear: (year: AcademicYear) => Promise<void>;

  // Audit, Backup, Cloud Sync & Promotion
  logAuditAction: (action: string, target: string, details: string) => Promise<void>;
  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => Promise<{ success: boolean; message: string }>;
  seedInitialDataToFirestore: (forceReset?: boolean) => Promise<void>;
  syncToCloudNow: () => Promise<{ success: boolean; message: string }>;
  pullDataFromCloudNow: () => Promise<{ success: boolean; message: string; count?: { students: number; grades: number } }>;
  testCloudConnection: () => Promise<{ connected: boolean; latencyMs: number; message: string }>;
  promoteStudentsBatch: (
    studentIds: string[],
    targetClassId: string,
    targetClassName: string,
    targetAcademicYearId: string,
    targetSemesterId: string
  ) => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSetting>(() => {
    try {
      const saved = localStorage.getItem('sirna_school_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSchoolSetting;
  });
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_academic_years');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultAcademicYears;
  });
  const [selectedYearId, setSelectedYearId] = useState<string>('ay_2026_2027');
  const [semesters, setSemesters] = useState<Semester[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_semesters');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSemesters;
  });
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('sem_2026_1');
  const [classes, setClasses] = useState<ClassRoom[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_classes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultClasses;
  });
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_subjects');
      if (saved) return sortSubjects(JSON.parse(saved));
    } catch {}
    return sortSubjects(defaultSubjects);
  });
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_teachers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultTeachers;
  });
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_assignments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultTeachingAssignments;
  });
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_students');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultStudents;
  });
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_grades');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialGradeEntries;
  });
  const [academicSummaries, setAcademicSummaries] = useState<AcademicSummary[]>(() => {
    try {
      const saved = localStorage.getItem('sirna_summaries');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSummaries;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [networkOnline, setNetworkOnline] = useState<boolean>(true);

  // Initialize and attach Firestore realtime listeners
  useEffect(() => {
    let isSubscribed = true;

    async function initFirestore() {
      setIsSyncing(true);
      try {
        const isConnected = await testFirestoreConnection();
        setNetworkOnline(isConnected);

        if (isConnected) {
          // Fetch School Settings
          const settingsSnap = await getDocs(collection(db, 'schoolSettings'));
          if (settingsSnap.empty) {
            console.log('Seeding initial school dataset to Firestore...');
            await seedInitialDataToFirestore(false);
          } else {
            const currentDoc = settingsSnap.docs.find(d => d.id === 'current') || settingsSnap.docs[0];
            if (currentDoc) {
              const data = currentDoc.data() as SchoolSetting;
              setSchoolSettings(data);
              try {
                localStorage.setItem('sirna_school_settings', JSON.stringify(data));
              } catch {}
            }

            // Parallel fetch all data collections to ensure state matches Cloud database
            const [yearsSnap, semsSnap, classesSnap, subjsSnap, teachersSnap, assignsSnap, studentsSnap, gradesSnap, sumsSnap] = await Promise.all([
              getDocs(collection(db, 'academicYears')).catch(() => null),
              getDocs(collection(db, 'semesters')).catch(() => null),
              getDocs(collection(db, 'classes')).catch(() => null),
              getDocs(collection(db, 'subjects')).catch(() => null),
              getDocs(collection(db, 'teachers')).catch(() => null),
              getDocs(collection(db, 'teachingAssignments')).catch(() => null),
              getDocs(collection(db, 'students')).catch(() => null),
              getDocs(collection(db, 'gradeEntries')).catch(() => null),
              getDocs(collection(db, 'academicSummaries')).catch(() => null),
            ]);

            if (yearsSnap && !yearsSnap.empty) {
              const items = yearsSnap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicYear));
              setAcademicYears(items);
              try { localStorage.setItem('sirna_academic_years', JSON.stringify(items)); } catch {}
            }
            if (semsSnap && !semsSnap.empty) {
              const items = semsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Semester));
              setSemesters(items);
              try { localStorage.setItem('sirna_semesters', JSON.stringify(items)); } catch {}
            }
            if (classesSnap && !classesSnap.empty) {
              const items = classesSnap.docs.map(d => ({ ...d.data(), id: d.id } as ClassRoom));
              setClasses(items);
              try { localStorage.setItem('sirna_classes', JSON.stringify(items)); } catch {}
            }
            if (subjsSnap && !subjsSnap.empty) {
              const items = sortSubjects(subjsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Subject)));
              setSubjects(items);
              try { localStorage.setItem('sirna_subjects', JSON.stringify(items)); } catch {}
            }
            if (teachersSnap && !teachersSnap.empty) {
              const items = teachersSnap.docs.map(d => ({ ...d.data(), id: d.id } as Teacher));
              setTeachers(items);
              try { localStorage.setItem('sirna_teachers', JSON.stringify(items)); } catch {}
            }
            if (assignsSnap && !assignsSnap.empty) {
              const items = assignsSnap.docs.map(d => ({ ...d.data(), id: d.id } as TeachingAssignment));
              setTeachingAssignments(items);
              try { localStorage.setItem('sirna_assignments', JSON.stringify(items)); } catch {}
            }
            if (studentsSnap && !studentsSnap.empty) {
              const items = studentsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Student));
              setStudents(items);
              try { localStorage.setItem('sirna_students', JSON.stringify(items)); } catch {}
            }
            if (gradesSnap && !gradesSnap.empty) {
              const items = gradesSnap.docs.map(d => ({ ...d.data(), id: d.id } as GradeEntry));
              setGradeEntries(items);
              try { localStorage.setItem('sirna_grades', JSON.stringify(items)); } catch {}
            }
            if (sumsSnap && !sumsSnap.empty) {
              const items = sumsSnap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicSummary));
              setAcademicSummaries(items);
              try { localStorage.setItem('sirna_summaries', JSON.stringify(items)); } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('Initial Firestore sync warning, using local state:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date());
      }
    }

    initFirestore();

    const handleSnapshotErr = (colName: string) => (err: any) => {
      console.warn(`Snapshot listener update for ${colName}:`, err?.message || err);
      setNetworkOnline(false);
    };

    // Setup onSnapshot listeners for collections with safe error handling
    const unsubSettings = onSnapshot(collection(db, 'schoolSettings'), (snap) => {
      if (!snap.empty) {
        const currentDoc = snap.docs.find(d => d.id === 'current') || snap.docs[0];
        const docData = currentDoc.data() as SchoolSetting;
        setSchoolSettings(docData);
        try {
          localStorage.setItem('sirna_school_settings', JSON.stringify(docData));
        } catch {}
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('schoolSettings'));

    const unsubYears = onSnapshot(collection(db, 'academicYears'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicYear));
        setAcademicYears(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('academicYears'));

    const unsubSemesters = onSnapshot(collection(db, 'semesters'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as Semester));
        setSemesters(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('semesters'));

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as ClassRoom));
        setClasses(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('classes'));

    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      if (!snap.empty) {
        const items = sortSubjects(snap.docs.map(d => ({ ...d.data(), id: d.id } as Subject)));
        setSubjects(items);
        try { localStorage.setItem('sirna_subjects', JSON.stringify(items)); } catch {}
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('subjects'));

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as Teacher));
        setTeachers(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('teachers'));

    const unsubAssignments = onSnapshot(collection(db, 'teachingAssignments'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as TeachingAssignment));
        setTeachingAssignments(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('teachingAssignments'));

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as Student));
        setStudents(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('students'));

    const unsubGrades = onSnapshot(collection(db, 'gradeEntries'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as GradeEntry));
        setGradeEntries(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('gradeEntries'));

    const unsubSummaries = onSnapshot(collection(db, 'academicSummaries'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicSummary));
        setAcademicSummaries(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('academicSummaries'));

    const unsubAudit = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog));
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(items);
        setNetworkOnline(true);
      }
    }, handleSnapshotErr('auditLogs'));

    return () => {
      isSubscribed = false;
      unsubSettings();
      unsubYears();
      unsubSemesters();
      unsubClasses();
      unsubSubjects();
      unsubTeachers();
      unsubAssignments();
      unsubStudents();
      unsubGrades();
      unsubSummaries();
      unsubAudit();
    };
  }, []);

  const currentSemester = semesters.find(s => s.id === selectedSemesterId);

  // Helper to log audit actions
  const logAuditAction = async (action: string, target: string, details: string) => {
    try {
      const logEntry: AuditLog = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        userId: profile?.id || 'system',
        userName: profile?.name || 'Administrator',
        userRole: profile?.role || 'admin',
        action,
        target,
        details,
      };

      setAuditLogs(prev => [logEntry, ...prev]);
      await setDoc(doc(db, 'auditLogs', logEntry.id), logEntry);
    } catch (err) {
      console.warn('Gagal mencatat audit log:', err);
    }
  };

  // Function to seed comprehensive dataset into Firestore
  const seedInitialDataToFirestore = async (forceReset = false) => {
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);

      // School Settings: preserve custom school settings if already present
      const settingToSave = (!forceReset && schoolSettings.schoolName && schoolSettings.schoolName !== 'SMA NEGERI 1 NUSANTARA')
        ? schoolSettings
        : defaultSchoolSetting;
      batch.set(doc(db, 'schoolSettings', 'current'), settingToSave);

      // Academic Years
      defaultAcademicYears.forEach(y => batch.set(doc(db, 'academicYears', y.id), y));

      // Semesters
      defaultSemesters.forEach(s => batch.set(doc(db, 'semesters', s.id), s));

      // Teachers
      defaultTeachers.forEach(t => batch.set(doc(db, 'teachers', t.id), t));

      // Classes
      defaultClasses.forEach(c => batch.set(doc(db, 'classes', c.id), c));

      // Subjects
      defaultSubjects.forEach(s => batch.set(doc(db, 'subjects', s.id), s));

      // Assignments
      defaultTeachingAssignments.forEach(a => batch.set(doc(db, 'teachingAssignments', a.id), a));

      // Students
      defaultStudents.forEach(st => batch.set(doc(db, 'students', st.id), st));

      // Grade Entries
      initialGradeEntries.forEach(g => batch.set(doc(db, 'gradeEntries', g.id), g));

      // Academic Summaries
      defaultSummaries.forEach(s => batch.set(doc(db, 'academicSummaries', s.id), s));

      await batch.commit();

      setSchoolSettings(settingToSave);
      try {
        localStorage.setItem('sirna_school_settings', JSON.stringify(settingToSave));
      } catch {}
      setAcademicYears(defaultAcademicYears);
      setSemesters(defaultSemesters);
      setTeachers(defaultTeachers);
      setClasses(defaultClasses);
      setSubjects(defaultSubjects);
      setTeachingAssignments(defaultTeachingAssignments);
      setStudents(defaultStudents);
      setGradeEntries(initialGradeEntries);
      setAcademicSummaries(defaultSummaries);
      setLastSyncTime(new Date());

      await logAuditAction('SEED_INITIAL_DATA', 'Database', 'Inisialisasi data awal sekolah dan sampel nilai');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch_seed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Grade Entry saving (draft / submitted / final)
  const saveGradeEntries = async (entries: Partial<GradeEntry>[], status: GradeStatus) => {
    setIsSyncing(true);
    const now = new Date().toISOString();
    try {
      const batch = writeBatch(db);
      const updatedEntries: GradeEntry[] = [];

      for (const entry of entries) {
        if (!entry.studentId || !entry.classId || !entry.subjectId || !entry.semesterId) continue;
        const entryId = entry.id || `${entry.semesterId}_${entry.classId}_${entry.subjectId}_${entry.studentId}`;

        // Find existing to preserve history and timestamps
        const existing = gradeEntries.find(g => g.id === entryId);

        let correctionHistory = existing?.correctionHistory || [];
        if (existing && existing.finalScore !== entry.finalScore && existing.status !== 'draft') {
          correctionHistory = [
            ...correctionHistory,
            {
              previousScore: existing.finalScore,
              newScore: entry.finalScore ?? 0,
              reason: 'Pembaruan nilai oleh guru',
              changedBy: profile?.name || 'Guru',
              changedAt: now,
            },
          ];
        }

        const submittedTimestamp =
          status === 'submitted' || status === 'final' || status === 'published'
            ? existing?.submittedAt || now
            : existing?.submittedAt;

        const finalizedTimestamp =
          status === 'final' || status === 'published'
            ? existing?.finalizedAt || now
            : existing?.finalizedAt;

        const publishedTimestamp =
          status === 'published'
            ? existing?.publishedAt || now
            : existing?.publishedAt;

        const fullEntry: GradeEntry = sanitizeFirestoreData({
          id: entryId,
          studentId: entry.studentId,
          studentNis: entry.studentNis || existing?.studentNis || '',
          studentNisn: entry.studentNisn || existing?.studentNisn || '',
          studentName: entry.studentName || existing?.studentName || '',
          classId: entry.classId,
          className: entry.className || existing?.className || '',
          subjectId: entry.subjectId,
          subjectName: entry.subjectName || existing?.subjectName || '',
          teacherId: entry.teacherId || existing?.teacherId || '',
          teacherName: entry.teacherName || existing?.teacherName || '',
          academicYearId: entry.academicYearId || existing?.academicYearId || selectedYearId,
          semesterId: entry.semesterId,
          finalScore: entry.finalScore ?? 0,
          status,
          revisionNote: entry.revisionNote || existing?.revisionNote || '',
          correctionHistory,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
          ...(submittedTimestamp ? { submittedAt: submittedTimestamp } : {}),
          ...(finalizedTimestamp ? { finalizedAt: finalizedTimestamp } : {}),
          ...(publishedTimestamp ? { publishedAt: publishedTimestamp } : {}),
        });

        updatedEntries.push(fullEntry);
      }

      // Commit in chunks of 400 to respect Firestore 500-op batch limit
      const chunkSize = 400;
      for (let i = 0; i < updatedEntries.length; i += chunkSize) {
        const chunk = updatedEntries.slice(i, i + chunkSize);
        const chunkBatch = writeBatch(db);
        chunk.forEach(item => {
          chunkBatch.set(doc(db, 'gradeEntries', item.id), sanitizeFirestoreData(item));
        });
        await chunkBatch.commit();
      }

      const mergedGradesMap = new Map(gradeEntries.map(item => [item.id, item]));
      updatedEntries.forEach(item => mergedGradesMap.set(item.id, item));
      const mergedGradesList = Array.from(mergedGradesMap.values());

      setGradeEntries(mergedGradesList);
      try {
        localStorage.setItem('sirna_grades', JSON.stringify(mergedGradesList));
      } catch {}

      // Recalculate semester averages if grades were submitted, finalized, or published
      if (status !== 'draft' && entries[0]?.semesterId) {
        await recalculateAveragesAndRanks(entries[0].semesterId, mergedGradesList);
      }

      await logAuditAction(
        status === 'draft' ? 'SAVE_GRADE_DRAFT' : 'SUBMIT_GRADES',
        `${entries[0]?.className || 'Multi-Kelas'} - ${entries.length > 35 ? 'Semua Mapel' : (entries[0]?.subjectName || 'Mapel')}`,
        `Penyimpanan ${updatedEntries.length} entri nilai dengan status: ${status}`
      );
      setLastSyncTime(new Date());
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'gradeEntries');
    } finally {
      setIsSyncing(false);
    }
  };

  // Verification process (by Admin / Kurikulum)
  const verifyAssignmentGrades = async (assignmentId: string, approve: boolean, revisionNote = '') => {
    setIsSyncing(true);
    const assignment = teachingAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    try {
      const targetGrades = gradeEntries.filter(
        g => g.classId === assignment.classId &&
             g.subjectId === assignment.subjectId &&
             g.semesterId === assignment.semesterId
      );

      const batch = writeBatch(db);
      const newStatus: GradeStatus = approve ? 'final' : 'revision_requested';
      const now = new Date().toISOString();

      const updated = targetGrades.map(g => {
        const nextEntry: GradeEntry = {
          ...g,
          status: newStatus,
          revisionNote: approve ? '' : revisionNote,
          updatedAt: now,
          ...(approve ? { finalizedAt: now } : {}),
        };
        if (!approve) {
          delete nextEntry.finalizedAt;
        }
        return sanitizeFirestoreData(nextEntry);
      });

      updated.forEach(g => batch.set(doc(db, 'gradeEntries', g.id), sanitizeFirestoreData(g)));
      await batch.commit();

      const mergedMap = new Map(gradeEntries.map(i => [i.id, i]));
      updated.forEach(u => mergedMap.set(u.id, u));
      const mergedList = Array.from(mergedMap.values());

      setGradeEntries(mergedList);

      if (approve) {
        await recalculateAveragesAndRanks(assignment.semesterId, mergedList);
      }

      await logAuditAction(
        approve ? 'VERIFY_APPROVE_GRADES' : 'VERIFY_REQUEST_REVISION',
        `${assignment.className} - ${assignment.subjectName}`,
        approve
          ? `Verifikasi nilai disetujui untuk ${updated.length} siswa`
          : `Permintaan revisi: ${revisionNote}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'gradeEntries_verify');
    } finally {
      setIsSyncing(false);
    }
  };

  const finalizeAssignmentGrades = async (assignmentId: string) => {
    await verifyAssignmentGrades(assignmentId, true);
  };

  // Recalculates averages and competition ranks (Bagian 8 & 9)
  const recalculateAveragesAndRanks = async (
    semesterId: string,
    customGrades?: GradeEntry[],
    customSubjects?: Subject[]
  ) => {
    const activeSubjectsList = (customSubjects || subjects).filter(s => s.isActive);
    const mandatorySubjects = activeSubjectsList.filter(s => s.isMandatory);

    const sourceGrades = customGrades || gradeEntries;

    // 2. Ambil seluruh nilai sah untuk semester ini (status: 'final' atau 'published' atau 'submitted')
    const semGrades = sourceGrades.filter(
      g => g.semesterId === semesterId && (g.status === 'final' || g.status === 'published' || g.status === 'submitted')
    );

    // Grouping by student
    const studentGradesMap = new Map<string, GradeEntry[]>();
    semGrades.forEach(g => {
      const list = studentGradesMap.get(g.studentId) || [];
      list.push(g);
      studentGradesMap.set(g.studentId, list);
    });

    const summariesToRank: AcademicSummary[] = [];

    // Process every active student in the school
    for (const student of students) {
      if (student.status !== 'aktif') continue;

      const studentClass = classes.find(c => c.id === student.currentClassId);
      const rawStudentGrades = studentGradesMap.get(student.id) || [];

      // Filter mata pelajaran yang memang dipelajari di kelas siswa tersebut
      const classApplicableSubjectIds = new Set(
        activeSubjectsList
          .filter(s => isSubjectApplicableToClass(s, studentClass))
          .map(s => s.id)
      );

      // Hanya perhitungkan nilai mata pelajaran yang berlaku pada kelas siswa tersebut
      const studentGrades = rawStudentGrades.filter(g => classApplicableSubjectIds.has(g.subjectId));

      // Perhitungan Rata-rata semester otomatis (Bagian 8):
      // Rata-rata = jumlah nilai akhir mata pelajaran yang diperhitungkan / jumlah mata pelajaran yang diperhitungkan
      // Nilai kosong TIDAK dihitung sebagai 0!
      const validCompletedScores = studentGrades
        .filter(g => g.finalScore !== null && g.finalScore !== undefined && !isNaN(g.finalScore))
        .map(g => g.finalScore);

      const totalScore = validCompletedScores.reduce((sum, val) => sum + val, 0);
      const completedCount = validCompletedScores.length;
      const averageScore = completedCount > 0 ? Math.round((totalScore / completedCount) * 100) / 100 : 0;

      // Cek kelengkapan mata pelajaran wajib yang memang dipelajari di kelas siswa tersebut
      const classMandatorySubjects = mandatorySubjects.filter(s => isSubjectApplicableToClass(s, studentClass));
      const classMandatoryIds = new Set(classMandatorySubjects.map(s => s.id));
      const completedMandatoryIds = new Set(
        studentGrades.filter(g => classMandatoryIds.has(g.subjectId)).map(g => g.subjectId)
      );
      const isComplete = classMandatoryIds.size > 0 && completedMandatoryIds.size >= classMandatoryIds.size;

      const summaryId = `${semesterId}_${student.id}`;
      const existingSummary = academicSummaries.find(s => s.id === summaryId);

      const summary: AcademicSummary = {
        id: summaryId,
        studentId: student.id,
        studentNis: student.nis,
        studentNisn: student.nisn,
        studentName: student.name,
        classId: student.currentClassId,
        className: studentClass?.name || student.currentClassName || 'Kelas',
        gradeLevel: studentClass?.gradeLevel || '10',
        academicYearId: selectedYearId,
        semesterId,
        averageScore,
        totalScore,
        subjectCount: classMandatoryIds.size,
        completedCount,
        mandatoryCount: classMandatoryIds.size,
        isComplete,
        // Manual input ranks (Directive 1e: Diinput manual oleh Admin, tidak otomatis hitung)
        classRank: existingSummary?.classRank ?? null,
        parallelRank: existingSummary?.parallelRank ?? null,
        eligibleRank: existingSummary?.eligibleRank ?? (student.eligibleRank ?? null),
        status: isComplete ? 'final' : 'incomplete',
        updatedAt: new Date().toISOString(),
      };

      summariesToRank.push(summary);
    }

    // 3. Simpan summary ke Firestore (tanpa timpa peringkat manual)
    try {
      const batch = writeBatch(db);
      summariesToRank.forEach(sum => {
        batch.set(doc(db, 'academicSummaries', sum.id), sum);
      });
      await batch.commit();

      setAcademicSummaries(prev => {
        const map = new Map(prev.map(i => [i.id, i]));
        summariesToRank.forEach(u => map.set(u.id, u));
        return Array.from(map.values());
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'academicSummaries');
    }
  };

  // Manual input ranking handler for Admin (Directive 1e)
  const saveManualRanks = async (
    updates: {
      studentId: string;
      semesterId: string;
      classRank?: number | null;
      parallelRank?: number | null;
      eligibleRank?: number | null;
    }[]
  ) => {
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      const updatedSummaries: AcademicSummary[] = [];
      const updatedStudents: Student[] = [];

      for (const up of updates) {
        const summaryId = `${up.semesterId}_${up.studentId}`;
        const existing = academicSummaries.find(s => s.id === summaryId);
        const student = students.find(s => s.id === up.studentId);
        const studentClass = classes.find(c => c.id === student?.currentClassId);

        const newSummary: AcademicSummary = existing
          ? {
              ...existing,
              classRank: up.classRank !== undefined ? up.classRank : existing.classRank,
              parallelRank: up.parallelRank !== undefined ? up.parallelRank : existing.parallelRank,
              eligibleRank: up.eligibleRank !== undefined ? up.eligibleRank : (existing.eligibleRank ?? null),
              updatedAt: new Date().toISOString(),
            }
          : {
              id: summaryId,
              studentId: up.studentId,
              studentNis: student?.nis || '',
              studentNisn: student?.nisn || '',
              studentName: student?.name || '',
              classId: student?.currentClassId || '',
              className: studentClass?.name || student?.currentClassName || '',
              gradeLevel: studentClass?.gradeLevel || '10',
              academicYearId: selectedYearId,
              semesterId: up.semesterId,
              averageScore: 0,
              totalScore: 0,
              subjectCount: 0,
              completedCount: 0,
              mandatoryCount: 0,
              isComplete: true,
              classRank: up.classRank ?? null,
              parallelRank: up.parallelRank ?? null,
              eligibleRank: up.eligibleRank ?? null,
              status: 'final',
              updatedAt: new Date().toISOString(),
            };

        updatedSummaries.push(newSummary);
        batch.set(doc(db, 'academicSummaries', summaryId), newSummary);

        if (up.eligibleRank !== undefined && student) {
          const updatedSt: Student = {
            ...student,
            eligibleRank: up.eligibleRank,
          };
          updatedStudents.push(updatedSt);
          batch.set(doc(db, 'students', student.id), updatedSt);
        }
      }

      await batch.commit();

      setAcademicSummaries(prev => {
        const map = new Map(prev.map(i => [i.id, i]));
        updatedSummaries.forEach(u => map.set(u.id, u));
        const arr = Array.from(map.values());
        try { localStorage.setItem('sirna_summaries', JSON.stringify(arr)); } catch {}
        return arr;
      });

      if (updatedStudents.length > 0) {
        setStudents(prev => {
          const map = new Map(prev.map(i => [i.id, i]));
          updatedStudents.forEach(u => map.set(u.id, u));
          const arr = Array.from(map.values());
          try { localStorage.setItem('sirna_students', JSON.stringify(arr)); } catch {}
          return arr;
        });
      }

      await logAuditAction(
        'MANUAL_RANKS_UPDATE',
        `Pembaruan Peringkat Manual (${updates.length} Siswa)`,
        `Input manual peringkat kelas, paralel, dan eligible oleh Admin`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'saveManualRanks');
    } finally {
      setIsSyncing(false);
    }
  };

  // Publish semester grades to student portal
  const publishSemesterGrades = async (semesterId: string) => {
    setIsSyncing(true);
    const now = new Date().toISOString();
    try {
      // 1. Update semester status
      const semRef = doc(db, 'semesters', semesterId);
      await updateDoc(semRef, {
        status: 'published',
        publicationDate: now.split('T')[0],
      });

      // 2. Update grades to published
      const batch = writeBatch(db);
      const updatedGrades = gradeEntries
        .filter(g => g.semesterId === semesterId && (g.status === 'final' || g.status === 'submitted'))
        .map(g => ({
          ...g,
          status: 'published' as GradeStatus,
          publishedAt: now,
          updatedAt: now,
        }));

      updatedGrades.forEach(g => batch.set(doc(db, 'gradeEntries', g.id), g));

      // 3. Update summaries
      const updatedSummaries = academicSummaries
        .filter(s => s.semesterId === semesterId)
        .map(s => ({
          ...s,
          status: 'published' as const,
          updatedAt: now,
        }));

      updatedSummaries.forEach(s => batch.set(doc(db, 'academicSummaries', s.id), s));

      await batch.commit();

      setSemesters(prev => prev.map(s => s.id === semesterId ? { ...s, status: 'published', publicationDate: now.split('T')[0] } : s));
      setGradeEntries(prev => {
        const map = new Map(prev.map(i => [i.id, i]));
        updatedGrades.forEach(u => map.set(u.id, u));
        return Array.from(map.values());
      });
      setAcademicSummaries(prev => {
        const map = new Map(prev.map(i => [i.id, i]));
        updatedSummaries.forEach(u => map.set(u.id, u));
        return Array.from(map.values());
      });

      await logAuditAction('PUBLISH_SEMESTER_GRADES', `Semester ${semesterId}`, 'Nilai semester resmi dipublikasikan ke Portal Siswa.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'publish_semester');
    } finally {
      setIsSyncing(false);
    }
  };

  // CRUD for School Settings
  const updateSchoolSettings = async (settings: Partial<SchoolSetting>) => {
    const updated = { ...schoolSettings, ...settings, updatedAt: new Date().toISOString() };
    setSchoolSettings(updated);
    try {
      localStorage.setItem('sirna_school_settings', JSON.stringify(updated));
    } catch {}
    await setDoc(doc(db, 'schoolSettings', 'current'), updated);
    await logAuditAction('UPDATE_SCHOOL_SETTINGS', 'Pengaturan Sekolah', `Pembaruan identitas sekolah: ${updated.schoolName}`);
  };

  // CRUD for Student
  const saveStudent = async (student: Student) => {
    const isNew = !students.some(s => s.id === student.id);
    const updated = isNew ? [...students, student] : students.map(s => s.id === student.id ? student : s);
    setStudents(updated);
    try { localStorage.setItem('sirna_students', JSON.stringify(updated)); } catch {}
    await setDoc(doc(db, 'students', student.id), student);
    await logAuditAction(isNew ? 'CREATE_STUDENT' : 'UPDATE_STUDENT', student.name, `NIS: ${student.nis}, NISN: ${student.nisn}`);
  };

  const saveStudentsBatch = async (studentsToSave: Student[]) => {
    if (studentsToSave.length === 0) return;
    setIsSyncing(true);
    try {
      const mergedMap = new Map<string, Student>(students.map(s => [s.id, s]));
      studentsToSave.forEach(st => mergedMap.set(st.id, st));
      const mergedList = Array.from(mergedMap.values());

      setStudents(mergedList);
      try { localStorage.setItem('sirna_students', JSON.stringify(mergedList)); } catch {}

      const chunkSize = 400;
      for (let i = 0; i < studentsToSave.length; i += chunkSize) {
        const chunk = studentsToSave.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(st => {
          batch.set(doc(db, 'students', st.id), st);
        });
        await batch.commit();
      }

      setLastSyncTime(new Date());
      await logAuditAction(
        'IMPORT_STUDENTS_EXCEL',
        `Unggah Excel Peserta Didik`,
        `Berhasil menyimpan/memperbarui ${studentsToSave.length} data peserta didik via Excel`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'students_batch_import');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteStudent = async (studentId: string) => {
    const target = students.find(s => s.id === studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
    await deleteDoc(doc(db, 'students', studentId));
    await logAuditAction('DELETE_STUDENT', target?.name || studentId, 'Penghapusan data peserta didik');
  };

  // CRUD for Class
  const saveClass = async (cls: ClassRoom) => {
    const isNew = !classes.some(c => c.id === cls.id);
    const updated = isNew ? [...classes, cls] : classes.map(c => c.id === cls.id ? cls : c);
    setClasses(updated);
    await setDoc(doc(db, 'classes', cls.id), cls);
    await logAuditAction(isNew ? 'CREATE_CLASS' : 'UPDATE_CLASS', cls.name, `Kode: ${cls.code}`);
  };

  const deleteClass = async (classId: string) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
    await deleteDoc(doc(db, 'classes', classId));
    await logAuditAction('DELETE_CLASS', classId, 'Penghapusan data kelas');
  };

  // CRUD for Subject
  const saveSubject = async (subj: Subject) => {
    const isNew = !subjects.some(s => s.id === subj.id);
    const cleanSubj = sanitizeFirestoreData({
      ...subj,
      targetClassIds: Array.isArray(subj.targetClassIds) ? subj.targetClassIds : [],
      sortOrder:
        typeof subj.sortOrder === 'number' && !isNaN(subj.sortOrder)
          ? subj.sortOrder
          : isNew
          ? subjects.length + 1
          : subj.sortOrder,
    });
    const updated = sortSubjects(
      isNew ? [...subjects, cleanSubj] : subjects.map(s => (s.id === cleanSubj.id ? cleanSubj : s))
    );
    setSubjects(updated);
    try {
      localStorage.setItem('sirna_subjects', JSON.stringify(updated));
    } catch {}
    await setDoc(doc(db, 'subjects', cleanSubj.id), cleanSubj);
    if (selectedSemesterId) {
      await recalculateAveragesAndRanks(selectedSemesterId, gradeEntries, updated);
    }
    await logAuditAction(isNew ? 'CREATE_SUBJECT' : 'UPDATE_SUBJECT', cleanSubj.name, `Kode: ${cleanSubj.code}, Urutan: #${cleanSubj.sortOrder ?? '-'}`);
  };

  const saveSubjectsOrder = async (orderedSubjects: Subject[]) => {
    if (orderedSubjects.length === 0) return;
    setIsSyncing(true);
    try {
      const normalized = orderedSubjects.map((s, idx) =>
        sanitizeFirestoreData({
          ...s,
          sortOrder: idx + 1,
        })
      );
      const sorted = sortSubjects(normalized);
      setSubjects(sorted);
      try {
        localStorage.setItem('sirna_subjects', JSON.stringify(sorted));
      } catch {}

      const batch = writeBatch(db);
      sorted.forEach(subj => {
        batch.set(doc(db, 'subjects', subj.id), sanitizeFirestoreData(subj));
      });
      await batch.commit();

      setLastSyncTime(new Date());
      await logAuditAction(
        'REORDER_SUBJECTS',
        'Urutan Kolom Mata Pelajaran',
        `Berhasil memperbarui urutan kolom ${sorted.length} mata pelajaran pada rekap nilai`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'subjects_reorder');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteSubject = async (subjectId: string) => {
    const nextList = subjects.filter(s => s.id !== subjectId);
    setSubjects(nextList);
    try {
      localStorage.setItem('sirna_subjects', JSON.stringify(nextList));
    } catch {}
    await deleteDoc(doc(db, 'subjects', subjectId));
    if (selectedSemesterId) {
      await recalculateAveragesAndRanks(selectedSemesterId, gradeEntries, nextList);
    }
    await logAuditAction('DELETE_SUBJECT', subjectId, 'Penghapusan mata pelajaran');
  };

  // CRUD for Teacher
  const saveTeacher = async (teacher: Teacher) => {
    const isNew = !teachers.some(t => t.id === teacher.id);
    const updated = isNew ? [...teachers, teacher] : teachers.map(t => t.id === teacher.id ? teacher : t);
    setTeachers(updated);
    await setDoc(doc(db, 'teachers', teacher.id), teacher);
    await logAuditAction(isNew ? 'CREATE_TEACHER' : 'UPDATE_TEACHER', teacher.name, `NIP: ${teacher.nip}`);
  };

  const deleteTeacher = async (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    await deleteDoc(doc(db, 'teachers', teacherId));
    await logAuditAction('DELETE_TEACHER', teacherId, 'Penghapusan guru');
  };

  // CRUD for Assignment
  const saveTeachingAssignment = async (assignment: TeachingAssignment) => {
    const isNew = !teachingAssignments.some(a => a.id === assignment.id);
    const updated = isNew ? [...teachingAssignments, assignment] : teachingAssignments.map(a => a.id === assignment.id ? assignment : a);
    setTeachingAssignments(updated);
    await setDoc(doc(db, 'teachingAssignments', assignment.id), assignment);
    await logAuditAction(isNew ? 'CREATE_ASSIGNMENT' : 'UPDATE_ASSIGNMENT', `${assignment.teacherName} - ${assignment.subjectName}`, assignment.className);
  };

  const deleteTeachingAssignment = async (assignmentId: string) => {
    setTeachingAssignments(prev => prev.filter(a => a.id !== assignmentId));
    await deleteDoc(doc(db, 'teachingAssignments', assignmentId));
    await logAuditAction('DELETE_ASSIGNMENT', assignmentId, 'Penghapusan penugasan guru');
  };

  // CRUD for Semester
  const saveSemester = async (semester: Semester) => {
    const isNew = !semesters.some(s => s.id === semester.id);
    const updated = isNew ? [...semesters, semester] : semesters.map(s => s.id === semester.id ? semester : s);
    setSemesters(updated);
    await setDoc(doc(db, 'semesters', semester.id), semester);
    await logAuditAction('UPDATE_SEMESTER', semester.name, `Status: ${semester.status}`);
  };

  // CRUD for Academic Year
  const saveAcademicYear = async (year: AcademicYear) => {
    const isNew = !academicYears.some(y => y.id === year.id);
    const updated = isNew ? [...academicYears, year] : academicYears.map(y => y.id === year.id ? year : y);
    setAcademicYears(updated);
    await setDoc(doc(db, 'academicYears', year.id), year);
    await logAuditAction('UPDATE_ACADEMIC_YEAR', year.name, `Aktif: ${year.isActive}`);
  };

  // Backup & Restore (JSON)
  const exportBackupJson = () => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schoolSettings,
      academicYears,
      semesters,
      teachers,
      classes,
      subjects,
      teachingAssignments,
      students,
      gradeEntries,
      academicSummaries,
    };
    return JSON.stringify(backupData, null, 2);
  };

  const importBackupJson = async (jsonStr: string): Promise<{ success: boolean; message: string }> => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.schoolSettings || !data.academicYears || !data.semesters) {
        return { success: false, message: 'Format data backup tidak valid atau tidak lengkap.' };
      }

      setIsSyncing(true);
      const batch = writeBatch(db);

      // School Settings
      batch.set(doc(db, 'schoolSettings', 'current'), data.schoolSettings);

      // Academic Years
      data.academicYears.forEach((y: AcademicYear) => batch.set(doc(db, 'academicYears', y.id), y));

      // Semesters
      data.semesters.forEach((s: Semester) => batch.set(doc(db, 'semesters', s.id), s));

      // Teachers
      data.teachers?.forEach((t: Teacher) => batch.set(doc(db, 'teachers', t.id), t));

      // Classes
      data.classes?.forEach((c: ClassRoom) => batch.set(doc(db, 'classes', c.id), c));

      // Subjects
      data.subjects?.forEach((s: Subject) => batch.set(doc(db, 'subjects', s.id), s));

      // Assignments
      data.teachingAssignments?.forEach((a: TeachingAssignment) => batch.set(doc(db, 'teachingAssignments', a.id), a));

      // Students
      data.students?.forEach((st: Student) => batch.set(doc(db, 'students', st.id), st));

      // Grades
      data.gradeEntries?.forEach((g: GradeEntry) => batch.set(doc(db, 'gradeEntries', g.id), g));

      // Summaries
      data.academicSummaries?.forEach((sum: AcademicSummary) => batch.set(doc(db, 'academicSummaries', sum.id), sum));

      await batch.commit();

      setSchoolSettings(data.schoolSettings);
      setAcademicYears(data.academicYears);
      setSemesters(data.semesters);
      setTeachers(data.teachers || []);
      setClasses(data.classes || []);
      setSubjects(data.subjects || []);
      setTeachingAssignments(data.teachingAssignments || []);
      setStudents(data.students || []);
      setGradeEntries(data.gradeEntries || []);
      setAcademicSummaries(data.academicSummaries || []);

      await logAuditAction('RESTORE_BACKUP', 'Database', `Pemulihan data cadangan berhasil: ${data.students?.length || 0} siswa`);
      return { success: true, message: 'Data cadangan berhasil dipulihkan secara penuh!' };
    } catch (err: any) {
      console.error('Gagal memulihkan backup:', err);
      return { success: false, message: 'Gagal memproses berkas JSON: ' + (err.message || 'Kesalahan sintaks') };
    } finally {
      setIsSyncing(false);
    }
  };

  // Explicit Cloud Sync with LocalStorage Cache (Directive 4)
  const syncToCloudNow = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    try {
      const isConnected = await testFirestoreConnection();
      setNetworkOnline(isConnected);

      // Save local cache snapshot immediately
      const cacheObj = {
        schoolSettings,
        academicYears,
        semesters,
        teachers,
        classes,
        subjects,
        teachingAssignments,
        students,
        gradeEntries,
        academicSummaries,
        cachedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem('sirna_academic_cache', JSON.stringify(cacheObj));
      } catch (e) {
        console.warn('LocalStorage cache notice:', e);
      }

      if (!isConnected) {
        return {
          success: false,
          message: 'Koneksi Cloud sedang offline. Data telah dicadangkan ke penyimpanan lokal perangkat (LocalStorage).',
        };
      }

      const batch = writeBatch(db);
      batch.set(doc(db, 'schoolSettings', 'current'), schoolSettings);
      academicYears.forEach(y => batch.set(doc(db, 'academicYears', y.id), y));
      semesters.forEach(s => batch.set(doc(db, 'semesters', s.id), s));
      teachers.forEach(t => batch.set(doc(db, 'teachers', t.id), t));
      classes.forEach(c => batch.set(doc(db, 'classes', c.id), c));
      subjects.forEach(s => batch.set(doc(db, 'subjects', s.id), s));
      teachingAssignments.forEach(a => batch.set(doc(db, 'teachingAssignments', a.id), a));
      students.forEach(st => batch.set(doc(db, 'students', st.id), st));
      gradeEntries.forEach(g => batch.set(doc(db, 'gradeEntries', g.id), g));
      academicSummaries.forEach(sm => batch.set(doc(db, 'academicSummaries', sm.id), sm));

      await batch.commit();

      setLastSyncTime(new Date());
      await logAuditAction('CLOUD_SYNC', 'Database', 'Sinkronisasi manual ke Cloud Firestore berhasil dieksekusi');
      return { success: true, message: 'Data berhasil disinkronkan ke Cloud Firestore secara real-time!' };
    } catch (err: any) {
      console.error('Gagal sinkronisasi ke cloud:', err);
      return { success: false, message: 'Gagal sinkronisasi ke Cloud: ' + (err.message || 'Kesalahan jaringan') };
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull latest data from Cloud Firestore (useful when switching to another computer)
  const pullDataFromCloudNow = async (): Promise<{ success: boolean; message: string; count?: { students: number; grades: number } }> => {
    setIsSyncing(true);
    try {
      const isConnected = await testFirestoreConnection();
      setNetworkOnline(isConnected);
      if (!isConnected) {
        return { success: false, message: 'Gagal: Perangkat sedang offline dari Cloud Firestore.' };
      }

      const [settingsSnap, yearsSnap, semsSnap, classesSnap, subjsSnap, teachersSnap, assignsSnap, studentsSnap, gradesSnap, sumsSnap] = await Promise.all([
        getDocs(collection(db, 'schoolSettings')),
        getDocs(collection(db, 'academicYears')),
        getDocs(collection(db, 'semesters')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'subjects')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'teachingAssignments')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'gradeEntries')),
        getDocs(collection(db, 'academicSummaries')),
      ]);

      if (!settingsSnap.empty) {
        const found = settingsSnap.docs.find(d => d.id === 'current') || settingsSnap.docs[0];
        setSchoolSettings(found.data() as SchoolSetting);
      }
      if (!yearsSnap.empty) setAcademicYears(yearsSnap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicYear)));
      if (!semsSnap.empty) setSemesters(semsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Semester)));
      if (!classesSnap.empty) setClasses(classesSnap.docs.map(d => ({ ...d.data(), id: d.id } as ClassRoom)));
      if (!subjsSnap.empty) setSubjects(subjsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Subject)));
      if (!teachersSnap.empty) setTeachers(teachersSnap.docs.map(d => ({ ...d.data(), id: d.id } as Teacher)));
      if (!assignsSnap.empty) setTeachingAssignments(assignsSnap.docs.map(d => ({ ...d.data(), id: d.id } as TeachingAssignment)));
      if (!studentsSnap.empty) setStudents(studentsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Student)));
      if (!gradesSnap.empty) setGradeEntries(gradesSnap.docs.map(d => ({ ...d.data(), id: d.id } as GradeEntry)));
      if (!sumsSnap.empty) setAcademicSummaries(sumsSnap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicSummary)));

      setLastSyncTime(new Date());
      await logAuditAction('CLOUD_PULL', 'Database', `Tarik data dari cloud berhasil: ${studentsSnap.size} siswa, ${gradesSnap.size} nilai`);
      return {
        success: true,
        message: `Sinkronisasi berhasil! Memuat ${studentsSnap.size} siswa dan ${gradesSnap.size} entri nilai dari Cloud.`,
        count: { students: studentsSnap.size, grades: gradesSnap.size }
      };
    } catch (err: any) {
      console.error('Gagal menarik data dari cloud:', err);
      return { success: false, message: 'Gagal mengambil data dari Cloud: ' + (err.message || 'Kesalahan jaringan') };
    } finally {
      setIsSyncing(false);
    }
  };

  // Test active cloud connection and measure latency
  const testCloudConnection = async (): Promise<{ connected: boolean; latencyMs: number; message: string }> => {
    const start = performance.now();
    try {
      const ok = await testFirestoreConnection();
      const latencyMs = Math.round(performance.now() - start);
      if (ok) {
        setNetworkOnline(true);
        return {
          connected: true,
          latencyMs,
          message: `Koneksi Cloud Firestore Stabil (Latensi: ${latencyMs} ms). Database online siap sinkronisasi.`
        };
      } else {
        setNetworkOnline(false);
        return {
          connected: false,
          latencyMs,
          message: 'Koneksi Cloud terputus atau offline. Cek sambungan internet perangkat Anda.'
        };
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setNetworkOnline(false);
      return {
        connected: false,
        latencyMs,
        message: 'Gagal menguji koneksi: ' + (err.message || 'Kesalahan jaringan')
      };
    }
  };

  // Student Promotion & Cohort Intact Protection (Directive 8)
  const promoteStudentsBatch = async (
    studentIds: string[],
    targetClassId: string,
    targetClassName: string,
    targetAcademicYearId: string,
    targetSemesterId: string
  ) => {
    setIsSyncing(true);
    try {
      const updatedStudents = students.map(s => {
        if (studentIds.includes(s.id)) {
          const history = s.classHistory || [];
          const isAlreadyRecorded = history.some(h => h.classId === s.currentClassId && h.semesterId === targetSemesterId);
          const newHistory = isAlreadyRecorded
            ? history
            : [
                ...history,
                {
                  academicYearId: targetAcademicYearId,
                  semesterId: targetSemesterId,
                  classId: s.currentClassId,
                  className: s.currentClassName,
                },
              ];

          return {
            ...s,
            currentClassId: targetClassId,
            currentClassName: targetClassName,
            classHistory: newHistory,
          };
        }
        return s;
      });

      setStudents(updatedStudents);

      const batch = writeBatch(db);
      updatedStudents
        .filter(s => studentIds.includes(s.id))
        .forEach(s => {
          batch.set(doc(db, 'students', s.id), s);
        });

      await batch.commit();

      await logAuditAction(
        'STUDENT_PROMOTION',
        targetClassName,
        `Kenaikan kelas untuk ${studentIds.length} peserta didik ke rombel ${targetClassName}`
      );
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'students');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AcademicContext.Provider
      value={{
        schoolSettings,
        academicYears,
        selectedYearId,
        setSelectedYearId,
        semesters,
        selectedSemesterId,
        setSelectedSemesterId,
        currentSemester,
        classes,
        subjects,
        teachers,
        teachingAssignments,
        students,
        gradeEntries,
        academicSummaries,
        auditLogs,
        isSyncing,
        lastSyncTime,
        networkOnline,

        saveGradeEntries,
        verifyAssignmentGrades,
        finalizeAssignmentGrades,
        publishSemesterGrades,
        recalculateAveragesAndRanks,
        saveManualRanks,

        updateSchoolSettings,
        saveStudent,
        saveStudentsBatch,
        deleteStudent,
        saveClass,
        deleteClass,
        saveSubject,
        saveSubjectsOrder,
        deleteSubject,
        saveTeacher,
        deleteTeacher,
        saveTeachingAssignment,
        deleteTeachingAssignment,
        saveSemester,
        saveAcademicYear,

        logAuditAction,
        exportBackupJson,
        importBackupJson,
        seedInitialDataToFirestore,
        syncToCloudNow,
        pullDataFromCloudNow,
        testCloudConnection,
        promoteStudentsBatch,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
};
