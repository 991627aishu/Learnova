import { Link } from "react-router-dom";
import { Users, Star, Eye, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstructorCourseCardProps {
  course: {
    id: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    thumbnail?: string | null;
    averageRating: number;
    reviewCount: number;
    _count: { enrollments: number; sections: number; reviews: number };
    status: string;
  };
}

export function InstructorCourseCard({ course }: InstructorCourseCardProps) {
  const description = course.description || course.subtitle || "No description available";
  const truncatedDescription = description.length > 120 ? description.substring(0, 120) + "..." : description;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 border border-amber-500/20 hover:border-amber-500/40 group h-full flex flex-col">
      {/* Thumbnail Section */}
      <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-xl overflow-hidden flex items-center justify-center relative flex-shrink-0">
        <img
          src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
          alt={course.title}
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-800/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-sm",
            course.status === "published" 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
          )}>
            {course.status === "published" ? "Published" : "Draft"}
          </span>
        </div>

        {/* Student Count Badge */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1 bg-slate-900/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-amber-500/30">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-white">
              {course._count.enrollments} {course._count.enrollments === 1 ? 'Student' : 'Students'}
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-4 flex-1 flex flex-col">
        {/* Rating */}
        {course.reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-bold text-amber-400">
                {course.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({course.reviewCount} {course.reviewCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-xl text-foreground group-hover:text-amber-500 transition-colors leading-tight line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
          {truncatedDescription}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{course._count.enrollments}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">{course.status}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Link
            to={`/instructor/students#course-${course.id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-lg font-medium text-sm border border-amber-400/30 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Eye className="w-4 h-4" />
            View Students
          </Link>
          <Link
            to={`/instructor/course/${course.id}/edit`}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm border border-slate-600 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
