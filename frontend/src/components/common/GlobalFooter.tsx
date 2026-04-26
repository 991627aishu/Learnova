import { Logo } from "@/components/common/Logo";

export function GlobalFooter() {
  return (
    <footer className="w-full py-8 mt-auto border-t bg-background">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <div className="font-medium text-foreground/80 mb-4 md:mb-0 flex items-center gap-2">
          © {new Date().getFullYear()} <Logo className="w-5 h-5" hideText /> Learnova
        </div>
        <div className="flex items-center gap-2 font-medium bg-secondary/50 px-4 py-2 rounded-full border border-border/50 text-foreground transition-all duration-300 hover:shadow-sm hover:border-primary/30">
          <span>Made with ❤️ by</span>
          <span className="text-primary font-bold">Shoeb Ahmad</span>
        </div>
      </div>
    </footer>
  );
}
