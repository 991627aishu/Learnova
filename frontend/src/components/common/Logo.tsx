import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  hideText?: boolean;
}

export function Logo({ className = "w-10 h-10", hideText = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <motion.div
           className="absolute inset-0 rounded-full blur-md opacity-50 bg-gradient-to-tr from-blue-500 via-cyan-400 to-purple-500"
           animate={{
             rotate: 360,
             scale: [1, 1.1, 1],
           }}
           transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <motion.img 
          src="/logo.png" 
          alt="AI Education Logo" 
          animate={{ 
            boxShadow: [
              "0 0 15px rgba(59, 130, 246, 0.5)",
              "0 0 25px rgba(6, 182, 212, 0.6)",
              "0 0 15px rgba(168, 85, 247, 0.5)",
              "0 0 15px rgba(59, 130, 246, 0.5)"
            ]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className={cn("object-contain rounded-full transition-transform duration-300 group-hover:scale-110 relative z-10 bg-background/50", className)}
          style={{ height: '40px', width: 'auto' }}
        />
      </motion.div>
      {!hideText && (
        <span className="font-display font-bold text-xl tracking-wide text-foreground transition-colors group-hover:text-cyan-500 z-10 relative">
          Lear<motion.span 
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 bg-[length:200%_auto] transition-all group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          >nova</motion.span>
        </span>
      )}
    </div>
  );
}
