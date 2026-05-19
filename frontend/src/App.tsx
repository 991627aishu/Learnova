import { Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "@/store/userStore";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

import { StudentLayout } from "@/layouts/StudentLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { EditorLayout } from "@/layouts/EditorLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { StudentDashboard } from "@/pages/student/StudentDashboard";
import { BrowseCourses } from "@/pages/student/BrowseCourses";
import { MyCourses } from "@/pages/student/MyCourses";
import { WishlistPage } from "@/pages/student/WishlistPage";
import { CertificatesPage } from "@/pages/student/CertificatesPage";
import { QuizResultsPage } from "@/pages/student/QuizResultsPage";
import { CoursePlayerPage } from "@/pages/student/CoursePlayerPage";
import { CleanProfilePage } from "@/pages/shared/CleanProfilePage";
import { SettingsPage } from "@/pages/shared/SettingsPage";

import { InstructorDashboard } from "@/pages/instructor/InstructorDashboard";
import { MyCoursesInstructor } from "@/pages/instructor/MyCoursesInstructor";
import { CreateCoursePage } from "@/pages/instructor/CreateCoursePage";
import { CurriculumBuilderPage } from "@/pages/instructor/CurriculumBuilderPage";
import { NotesEditorPage } from "@/pages/instructor/NotesEditorPage";
import { TeacherLatexEditorPage } from "@/pages/instructor/TeacherLatexEditorPage";
import { QuizBuilderPage } from "@/pages/instructor/QuizBuilderPage";
import { InstructorStudents } from "@/pages/instructor/InstructorStudents";
import { InstructorReviews } from "@/pages/instructor/InstructorReviews";
import { InstructorAnalytics } from "@/pages/instructor/InstructorAnalytics";
import { InstructorEarnings } from "@/pages/instructor/InstructorEarnings";

import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminCourses } from "@/pages/admin/AdminCourses";
import { AdminCategories } from "@/pages/admin/AdminCategories";
import { AdminReports } from "@/pages/admin/AdminReports";
import { AdminReviews } from "@/pages/admin/AdminReviews";
import { AdminPayments } from "@/pages/admin/AdminPayments";
import { AdminAnalytics } from "@/pages/admin/AdminAnalytics";
import { AdminSettings } from "@/pages/admin/AdminSettings";
import { LandingPage } from "@/pages/public/LandingPage";
import { CourseDetailPage } from "@/pages/public/CourseDetailPage";
import { TestLandingPage } from "@/pages/public/TestLandingPage";
import ResourcesPage from "@/pages/ResourcesPage";
// import { InstructorEditor, StudentView, InstructorDashboard as ResourceInstructorDashboard } from "@/modules/learningIDE";

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user, isLoading } = useUserStore();
  
  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) return <Navigate to="/login" replace />;
  
  // Check role permissions
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore();
  if (user) {
    const home = user.role === "admin" ? "/admin" : user.role === "instructor" ? "/instructor" : "/student";
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { theme } = useThemeStore();
  const { user, isLoading, fetchUser } = useUserStore();

  useEffect(() => {
    // Fetch user data on app load
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Decorative blurry gradients background (Global) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>
      <Routes>
        {/* Public routes with PublicLayout */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="course/:courseId" element={<CourseDetailPage />} />
        </Route>

        {/* Public standalone routes */}
        <Route path="/resources" element={<ResourcesPage />} />
        
        {/* Learning Platform Routes - Temporarily disabled */}
        {/* <Route path="/resources/course/:courseId" element={<StudentView />} /> */}
        
        {/* Learning Platform Instructor Routes - Temporarily disabled */}
        {/* <Route 
          path="/resources/instructor" 
          element={
            <ProtectedRoute roles={["instructor", "admin"]}>
              <ResourceInstructorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/resources/instructor/:courseId/edit" 
          element={
            <ProtectedRoute roles={["instructor", "admin"]}>
              <InstructorEditor />
            </ProtectedRoute>
          } 
        /> */}

        {/* Auth routes without layout */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        {/* Student routes with DashboardLayout */}
        <Route path="/student" element={<ProtectedRoute roles={["student"]}><DashboardLayout role="student" /></ProtectedRoute>} >
          <Route index element={<StudentDashboard />} />
          <Route path="browse" element={<BrowseCourses />} />
          <Route path="my-courses" element={<MyCourses />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="quiz-results" element={<QuizResultsPage />} />
          <Route path="course/:courseId/learn" element={<CoursePlayerPage />} />
          <Route path="profile" element={<CleanProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Instructor routes with DashboardLayout */}
        <Route path="/instructor" element={<ProtectedRoute roles={["instructor"]}><DashboardLayout role="instructor" /></ProtectedRoute>} >
          <Route index element={<InstructorDashboard />} />
          <Route path="courses" element={<MyCoursesInstructor />} />
          <Route path="courses/new" element={<CreateCoursePage />} />
          <Route path="course/:courseId/edit" element={<CurriculumBuilderPage />} />
          <Route path="course/:courseId/lectures/:lectureId/quiz" element={<QuizBuilderPage />} />
          <Route path="students" element={<InstructorStudents />} />
          <Route path="reviews" element={<InstructorReviews />} />
          <Route path="analytics" element={<InstructorAnalytics />} />
          <Route path="earnings" element={<InstructorEarnings />} />
          <Route path="profile" element={<CleanProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Admin routes with DashboardLayout */}
        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><DashboardLayout role="admin" /></ProtectedRoute>} >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Standalone Full-Screen Overleaf Editor Route with EditorLayout */}
        <Route 
          element={
            <ProtectedRoute roles={["instructor", "admin"]}>
              <EditorLayout />
            </ProtectedRoute>
          }
        >
          <Route 
            path="/instructor/course/:courseId/lectures/:lectureId/notes" 
            element={<NotesEditorPage />} 
          />
          <Route path="/teacher/latex-editor" element={<TeacherLatexEditorPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}
