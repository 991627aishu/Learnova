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
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Premium glow aura */}
        <motion.div
           className="absolute inset-0 rounded-full blur-xl opacity-50 bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600"
           animate={{
             rotate: 360,
             scale: [1, 1.2, 1],
             opacity: [0.4, 0.7, 0.4],
           }}
           transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        {/* Shine sweep effect */}
        <motion.div
           className="absolute inset-0 rounded-full overflow-hidden"
           initial={false}
           whileHover={{ scale: 1.05 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut",
            }}
          />
        </motion.div>
        <motion.img 
          src="/logo.png" 
          alt="THE GATE HUB Logo" 
          animate={{ 
            boxShadow: [
              "0 0 20px rgba(251, 191, 36, 0.5)",
              "0 0 35px rgba(234, 179, 8, 0.8)",
              "0 0 25px rgba(217, 119, 6, 0.6)",
              "0 0 20px rgba(251, 191, 36, 0.5)"
            ],
            rotate: [0, 1, -1, 0],
          }}
          transition={{ 
            boxShadow: { duration: 4, repeat: Infinity, ease: "linear" },
            rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }}
          whileHover={{ 
            scale: 1.1,
            boxShadow: "0 0 40px rgba(251, 191, 36, 0.9)"
          }}
          className={cn("object-contain rounded-full transition-transform duration-500 relative z-10 bg-background/50", className)}
          style={{ height: '40px', width: 'auto' }}
        />
      </motion.div>
      {!hideText && (
        <motion.span 
          className="font-display font-bold text-xl tracking-wide text-foreground transition-colors z-10 relative"
          animate={{
            textShadow: [
              "0 0 0px rgba(251, 191, 36, 0)",
              "0 0 10px rgba(251, 191, 36, 0.3)",
              "0 0 0px rgba(251, 191, 36, 0)",
            ]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          whileHover={{ 
            color: "rgb(251, 191, 36)",
            textShadow: "0 0 20px rgba(251, 191, 36, 0.6)"
          }}
        >
          THE GATE HUB
        </motion.span>
      )}
    </div>
  );
}
