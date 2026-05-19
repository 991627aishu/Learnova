import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface QuizCardProps {
  quiz: {
    id: string;
    title: string;
    courseName?: string;
    score?: number;
    totalMarks?: number;
    createdAt?: string;
  };
  action?: ReactNode;
}

export function QuizCard({ quiz, action }: QuizCardProps) {
  const hasMarks = quiz.score !== undefined && quiz.totalMarks !== undefined;
  const percentage = hasMarks && quiz.totalMarks ? Math.round((quiz.score! / quiz.totalMarks) * 100) : 0;
  const isPass = percentage >= 70;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col border border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className="text-white font-semibold truncate text-lg group-hover:text-amber-500 transition-colors">{quiz.title}</h3>
          {(quiz.courseName || quiz.createdAt) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-400 mt-1">
              {quiz.courseName && <span>{quiz.courseName}</span>}
              {quiz.courseName && quiz.createdAt && <span className="hidden sm:inline-block border-l border-amber-500/30 h-3" />}
              {quiz.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(quiz.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          {hasMarks && (
            <div className="text-right flex flex-col items-end">
              <div className={cn(
                "text-2xl font-black tabular-nums leading-none",
                isPass ? "text-green-500" : percentage >= 40 ? "text-amber-500" : "text-red-500"
              )}>
                {percentage}%
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mt-1">
                {quiz.score} / {quiz.totalMarks} Marks
              </div>
            </div>
          )}
          {action}
        </div>
      </div>
      
      {hasMarks && (
        <div className="h-1.5 w-full bg-slate-700/50 mt-4 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isPass ? "bg-gradient-to-r from-green-500 to-emerald-500" : percentage >= 40 ? "bg-gradient-to-r from-amber-500 to-yellow-500" : "bg-gradient-to-r from-red-500 to-rose-500"
            )} 
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
