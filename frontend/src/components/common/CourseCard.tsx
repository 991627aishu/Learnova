import { ReactNode } from "react";
import { Star } from "lucide-react";
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
    category?: string;
    subtitle?: string | null;
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
        "bg-[#0f172a] rounded-xl overflow-hidden shadow-md hover:shadow-lg transition flex flex-col h-full border border-border/50 hover:-translate-y-1 group",
        onClick && "cursor-pointer"
      )}
    >
      <div className="h-40 bg-black flex items-center justify-center relative overflow-hidden shrink-0">
        <img
          src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
          alt={course.title}
          className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />
        {topRightOverlay && (
          <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
            {topRightOverlay}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          {headerBadge ? headerBadge : (
             <p className="text-xs font-bold text-primary uppercase tracking-wider">{course.category ?? "Uncategorized"}</p>
          )}

          {stats ? stats : (
            course.reviewCount ? (
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current hidden sm:block" />
                <span className="text-xs font-bold text-foreground hover:underline">
                  {course.rating?.toFixed(1) || "5.0"} ({course.reviewCount})
                </span>
              </div>
            ) : null
          )}
        </div>

        <h3 className="font-bold text-lg text-white mt-1 group-hover:text-primary transition-colors leading-tight line-clamp-2">
          {course.title}
        </h3>
        
        <p className="text-sm text-gray-400 mt-1">
          By {course.instructor || "Unknown Instructor"}
        </p>

        {course.subtitle && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 flex-1">{course.subtitle}</p>
        )}

        <div className="mt-auto pt-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          {course.price !== undefined ? (
            <span className="text-purple-400 font-bold text-lg">${Number(course.price).toFixed(2)}</span>
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
