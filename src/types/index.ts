export type UserRole = 'admin' | 'bk' | 'teacher' | 'student';

export type SemesterType = '1' | '2';

export type SemesterStatus = 'preparation' | 'input' | 'verification' | 'finalized' | 'published' | 'closed';

export type GradeStatus = 'draft' | 'submitted' | 'revision_requested' | 'final' | 'published';

export type StudentStatus = 'aktif' | 'alumni' | 'mutasi' | 'keluar';

export interface GradePredicate {
  min: number;
  max: number;
  predicate: string; // e.g. "A", "B", "C", "D"
  description: string; // e.g. "Sangat Baik", "Baik", "Cukup", "Perlu Bimbingan"
}

export interface SchoolSetting {
  id?: string;
  schoolName: string;
  npsn: string;
  level: 'SMP' | 'SMA' | 'SMK' | 'MA';
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  dinasLogoUrl?: string;
  principalName: string;
  principalNip: string;
  letterheadHeader: string;
  letterheadLineStyle?: 'double' | 'single' | 'thick';
  minScore: number;
  maxScore: number;
  passingScore: number;
  predicates: GradePredicate[];
  rankingPolicy: 'competition' | 'standard';
  allowStudentPortal: boolean;
  portalShowRank: boolean;
  requireVerification: boolean;
  updatedAt: string;
}

export interface SystemAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email: string;
  teacherId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string; // uid
  username?: string;
  email: string;
  name: string;
  role: UserRole;
  teacherId?: string;
  studentId?: string;
  assignedClassIds?: string[];
  createdAt: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  cohort: string;
  status: StudentStatus;
  currentClassId: string;
  currentClassName: string;
  portalPin: string; // PIN akses portal siswa
  classHistory: {
    academicYearId: string;
    semesterId: string;
    classId: string;
    className: string;
  }[];
  createdAt?: string;
}

export interface ClassRoom {
  id: string;
  code: string; // e.g. "X-A", "XI-MIPA-1"
  name: string;
  gradeLevel: string; // "10", "11", "12" or "7", "8", "9"
  major: string; // "Umum", "IPA", "IPS", etc.
  academicYearId: string;
  homeroomTeacherId: string;
  homeroomTeacherName: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  category: 'Kelompok A (Umum)' | 'Kelompok B (Umum)' | 'Kelompok C (Peminatan)' | 'Muatan Lokal';
  gradeLevel: string; // "Semua", "10", "11", "12"
  isMandatory: boolean;
  weight: number; // default 1
  isActive: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string;
  nuptk: string;
  email: string;
  phone: string;
  userId?: string;
  isActive: boolean;
}

export interface TeachingAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  academicYearId: string;
  semesterId: string;
  isActive: boolean;
}

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2026/2027"
  isActive: boolean;
  createdAt: string;
}

export interface Semester {
  id: string;
  academicYearId: string;
  semesterType: SemesterType; // "1" = Ganjil, "2" = Genap
  name: string; // e.g. "Semester Ganjil 2026/2027"
  startDate: string;
  gradeSubmissionDeadline: string;
  verificationDate: string;
  finalizationDate: string;
  publicationDate: string;
  status: SemesterStatus;
  isActive: boolean;
}

export interface GradeCorrection {
  previousScore: number;
  newScore: number;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface GradeEntry {
  id: string; // `${semesterId}_${classId}_${subjectId}_${studentId}`
  studentId: string;
  studentNis: string;
  studentNisn: string;
  studentName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  academicYearId: string;
  semesterId: string;
  finalScore: number; // Nilai akhir murni
  status: GradeStatus;
  revisionNote?: string;
  correctionHistory?: GradeCorrection[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  finalizedAt?: string;
  publishedAt?: string;
}

export interface AcademicSummary {
  id: string; // `${semesterId}_${studentId}`
  studentId: string;
  studentNis: string;
  studentNisn: string;
  studentName: string;
  classId: string;
  className: string;
  gradeLevel: string;
  academicYearId: string;
  semesterId: string;
  averageScore: number;
  totalScore: number;
  subjectCount: number;
  completedCount: number;
  mandatoryCount: number;
  isComplete: boolean;
  classRank: number | null;
  parallelRank: number | null;
  status: 'incomplete' | 'provisional' | 'final' | 'published';
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  details: string;
}
