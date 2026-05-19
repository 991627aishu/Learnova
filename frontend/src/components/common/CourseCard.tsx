import { ReactNode } from "react";
import { Star, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    instructor?: string;
    thumbnail?: string | null;
    price?: number;
    rating?: number;
    reviewCount?: number;
    category?: string | { name?: string };
    subtitle?: string | null;
    difficulty?: string;
    studentCount?: number;
    isEnrolled?: boolean;
    progress?: number;
  };
  onClick?: () => void;
  actions?: ReactNode;
  topRightOverlay?: ReactNode;
  headerBadge?: ReactNode;
  stats?: ReactNode; // e.g. for student count / progress
}

export function CourseCard({ course, onClick, actions, topRightOverlay, headerBadge, stats }: CourseCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col h-full border border-amber-500/20 hover:border-amber-500/40 hover:-translate-y-1 group",
        onClick && "cursor-pointer"
      )}
    >
      <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-xl overflow-hidden flex items-center justify-center relative shrink-0">
          <img
            src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
            alt={course.title}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-800/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />
          {topRightOverlay && (
            <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
              {topRightOverlay}
            </div>
          )}
        </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          {headerBadge ? headerBadge : (
             <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">{typeof course.category === 'string' ? course.category : course.category?.name || "Uncategorized"}</p>
          )}

          {stats ? stats : (
            <div className="flex items-center gap-2">
              {course.reviewCount ? (
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current hidden sm:block" />
                  <span className="text-xs font-bold text-foreground hover:underline">
                    {course.rating?.toFixed(1) || "5.0"} ({course.reviewCount})
                  </span>
                </div>
              ) : null}
              {course.studentCount && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">{course.studentCount}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <h3 className="font-bold text-lg text-white mt-1 group-hover:text-amber-500 transition-colors leading-tight line-clamp-2">
          {course.title || "Untitled Course"}
        </h3>
        
        <p className="text-sm text-slate-400 mt-1">
          By {course.instructor || "Unknown Instructor"}
        </p>

        {/* Difficulty Badge */}
        {course.difficulty && (
          <div className="mt-2">
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
              course.difficulty === "Beginner" && "bg-green-500/20 text-green-400 border-green-500/30",
              course.difficulty === "Intermediate" && "bg-amber-500/20 text-amber-400 border-amber-500/30",
              course.difficulty === "Advanced" && "bg-red-500/20 text-red-400 border-red-500/30"
            )}>
              <BookOpen className="w-3 h-3 mr-1" />
              {course.difficulty}
            </span>
          </div>
        )}

        {course.subtitle && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 flex-1">{course.subtitle}</p>
        )}

        {/* Progress Bar for Enrolled Courses */}
        {course.isEnrolled && course.progress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{course.progress}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  course.progress === 100 ? "bg-green-500" : "bg-gradient-to-r from-amber-500 to-yellow-500"
                )} 
                style={{ width: `${course.progress}%` }} 
              />
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          {course.price !== undefined ? (
            <span className="text-amber-400 font-bold text-lg">${Number(course.price).toFixed(2)}</span>
          ) : (
            <div className="flex-1" />
          )}
          {actions && (
            <div className="flex gap-2 items-center w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
