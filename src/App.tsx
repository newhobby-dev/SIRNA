import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AcademicProvider, useAcademic } from './context/AcademicContext';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';

// Admin Views
import { AdminDashboard } from './views/admin/AdminDashboard';
import { StudentManagement } from './views/admin/StudentManagement';
import { ClassManagement } from './views/admin/ClassManagement';
import { SubjectManagement } from './views/admin/SubjectManagement';
import { TeacherManagement } from './views/admin/TeacherManagement';
import { AssignmentManagement } from './views/admin/AssignmentManagement';
import { PeriodManagement } from './views/admin/PeriodManagement';
import { VerificationFinalization } from './views/admin/VerificationFinalization';
import { PublishManagement } from './views/admin/PublishManagement';
import { SchoolRecapView } from './views/admin/SchoolRecapView';
import { RankingsView } from './views/admin/RankingsView';
import { AnalyticsView } from './views/admin/AnalyticsView';
import { CompletenessMonitor } from './views/admin/CompletenessMonitor';
import { AuditLogsView } from './views/admin/AuditLogsView';
import { SchoolSettingsView } from './views/admin/SchoolSettingsView';
import { CloudConnectionView } from './views/admin/CloudConnectionView';
import { BackupRestoreView } from './views/admin/BackupRestoreView';
import { UserManagement } from './views/admin/UserManagement';
import { LoginPage } from './views/auth/LoginPage';

// Teacher Views
import { TeacherDashboard } from './views/teacher/TeacherDashboard';
import { ManualGradeInput } from './views/teacher/ManualGradeInput';
import { ExcelGradeImport } from './views/teacher/ExcelGradeImport';
import { TeacherSubjectRecap } from './views/teacher/TeacherSubjectRecap';

// Homeroom Views
import { HomeroomDashboard } from './views/homeroom/HomeroomDashboard';
import { HomeroomMonitoring } from './views/homeroom/HomeroomMonitoring';

// Student Views
import { StudentPortal } from './views/student/StudentPortal';

const MainContent: React.FC = () => {
  const { role, isAuthenticated, signOut, switchDemoRole } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('admin_dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPublicPortal, setIsPublicPortal] = useState(false);

  // Sync activeTab when user switches roles
  useEffect(() => {
    switch (role) {
      case 'admin':
        setActiveTab('admin_dashboard');
        break;
      case 'bk':
        setActiveTab('homeroom_dashboard');
        break;
      case 'teacher':
        setActiveTab('teacher_dashboard');
        break;
      case 'student':
        setActiveTab('student_portal');
        break;
    }
  }, [role]);

  // Direct login gate (Directive 1 & 2)
  if (!isAuthenticated && !isPublicPortal) {
    return (
      <LoginPage
        onOpenStudentPortal={() => {
          setIsPublicPortal(true);
          switchDemoRole('student');
        }}
      />
    );
  }

  const renderView = () => {
    switch (activeTab) {
      // Admin
      case 'admin_dashboard':
        return <AdminDashboard onNavigate={setActiveTab} />;
      case 'admin_students':
        return <StudentManagement />;
      case 'admin_classes':
        return <ClassManagement />;
      case 'admin_subjects':
        return <SubjectManagement />;
      case 'admin_teachers':
        return <TeacherManagement />;
      case 'admin_assignments':
        return <AssignmentManagement />;
      case 'admin_periods':
        return <PeriodManagement />;
      case 'admin_verification':
        return <VerificationFinalization />;
      case 'admin_publish':
        return <PublishManagement onNavigate={setActiveTab} />;
      case 'admin_school_recap':
        return <SchoolRecapView />;
      case 'admin_rankings':
        return <RankingsView />;
      case 'admin_analytics':
        return <AnalyticsView />;
      case 'admin_completeness':
        return <CompletenessMonitor />;
      case 'admin_audit':
        return <AuditLogsView />;
      case 'admin_settings':
        return <SchoolSettingsView />;
      case 'admin_cloud':
        return <CloudConnectionView />;
      case 'admin_backup':
        return <BackupRestoreView />;
      case 'admin_users':
        return <UserManagement />;

      // Teacher
      case 'teacher_dashboard':
        return <TeacherDashboard onNavigate={setActiveTab} />;
      case 'teacher_input_manual':
        return <ManualGradeInput />;
      case 'teacher_input_excel':
        return <ExcelGradeImport />;
      case 'teacher_recap':
        return <TeacherSubjectRecap />;
      case 'teacher_completeness':
        return <CompletenessMonitor />;

      // Homeroom
      case 'homeroom_dashboard':
        return <HomeroomDashboard onNavigate={setActiveTab} />;
      case 'homeroom_leger':
        return <SchoolRecapView />;
      case 'homeroom_rankings':
        return <RankingsView />;
      case 'homeroom_monitoring':
        return <HomeroomMonitoring />;

      // Student Portal
      case 'student_portal':
      case 'student_history':
        return <StudentPortal />;

      default:
        return <AdminDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        onNavigate={setActiveTab}
        onExitStudentPortal={async () => {
          setIsPublicPortal(false);
          await signOut();
        }}
      />

      <div className="flex-1 flex">
        {role !== 'student' && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all ${role === 'student' ? 'max-w-5xl' : ''}`}>
          {renderView()}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AcademicProvider>
        <MainContent />
      </AcademicProvider>
    </AuthProvider>
  );
}
