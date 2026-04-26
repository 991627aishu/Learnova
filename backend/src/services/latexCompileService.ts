import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";

export interface LatexCompilationError {
  message: string;
  line: number | null;
  raw: string;
}

export interface LatexCompilationResult {
  success: boolean;
  pdfPath?: string;
  logs: string;
  errors: LatexCompilationError[];
  base64?: string;
  compilationTime: number;
  compilerUsed: 'pdflatex' | 'xelatex' | 'lualatex';
  passesCompleted: number;
  bibtexRun: boolean;
}

interface CompileOptions {
  workspaceSubdir?: string;
  timeoutMs?: number;
  copyReferencedImages?: boolean;
  maxPasses?: number;
  enableBibtex?: boolean;
  compilerFallback?: boolean;
  projectFiles?: ProjectFile[];
}

interface ProjectFile {
  filename: string;
  content: string;
  type: 'tex' | 'bib' | 'sty' | 'cls' | 'image' | 'other';
}

interface CompilationStep {
  name: string;
  command: string;
  args: string[];
  exitCode: number;
  output: string;
  duration: number;
}

interface StoredPdf {
  absolutePath: string;
  publicUrl: string;
}

// REMOVED: Docker constants - using local pdflatex only
const DEFAULT_TIMEOUT_MS = Number(process.env.LATEX_COMPILE_TIMEOUT_MS || 120000);
const MAX_PASSES = 3;
const COMPILER_TIMEOUT = 110000; // Per-pass timeout (2 minutes - buffer)

const UPLOAD_ROOT = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
const LATEX_UPLOAD_ROOT = path.join(UPLOAD_ROOT, "latex");
const LATEX_PDF_UPLOAD_DIR = path.join(LATEX_UPLOAD_ROOT, "pdfs");

function resolveLatexTempRoot(): string {
  if (process.env.LATEX_TEMP_DIR) {
    return path.resolve(process.env.LATEX_TEMP_DIR);
  }

  const parentDir = path.resolve(process.cwd(), "..", "latex-temp");
  if (existsSync(parentDir)) {
    return parentDir;
  }

  return path.resolve(process.cwd(), "latex-temp");
}

const LATEX_TEMP_ROOT = resolveLatexTempRoot();

// REMOVED: ensureLatexDocument function - DO NOT modify LaTeX content

function isSafeWorkspaceSegment(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

// Enhanced LaTeX workspace management
function createIsolatedWorkspace(): string {
  const workspaceId = uuidv4();
  const workspaceDir = path.join(LATEX_TEMP_ROOT, workspaceId);
  fs.mkdirSync(workspaceDir, { recursive: true });
  return workspaceId;
}

function getWorkspaceDir(workspaceId: string, workspaceSubdir?: string): string {
  if (!isSafeWorkspaceSegment(workspaceId)) {
    throw new Error("Invalid workspace id");
  }

  if (!workspaceSubdir) {
    return path.join(LATEX_TEMP_ROOT, workspaceId);
  }

  const segments = workspaceSubdir.split(/[\\/]+/).filter(Boolean);
  if (segments.some((segment) => !isSafeWorkspaceSegment(segment))) {
    throw new Error("Invalid workspace subdirectory");
  }

  return path.join(LATEX_TEMP_ROOT, ...segments, workspaceId);
}

function getRelativeWorkspacePath(workspaceDir: string): string {
  const relative = path.relative(LATEX_TEMP_ROOT, workspaceDir).split(path.sep).join("/");
  if (!relative || relative.startsWith("..")) {
    throw new Error("Invalid LaTeX workspace path");
  }
  return relative;
}

// Enhanced file detection for multi-file projects
function collectProjectFiles(latexCode: string): string[] {
  const files = new Set<string>();
  
  // \input{} and \include{}
  const inputRegex = /\\(?:input|include)\s*\{([^}]+)\}/g;
  let match;
  while ((match = inputRegex.exec(latexCode)) !== null) {
    const filename = match[1].trim();
    if (filename.endsWith('.tex')) {
      files.add(filename);
    } else {
      files.add(filename + '.tex');
    }
  }
  
  // Bibliography files
  const bibRegex = /\\bibliography\s*\{([^}]+)\}/g;
  while ((match = bibRegex.exec(latexCode)) !== null) {
    const bibFiles = match[1].split(',').map(f => f.trim() + '.bib');
    bibFiles.forEach(f => files.add(f));
  }
  
  // \usepackage for custom packages
  const pkgRegex = /\\usepackage(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  while ((match = pkgRegex.exec(latexCode)) !== null) {
    const pkg = match[1].trim();
    if (!pkg.match(/^(amsmath|amsfonts|amssymb|graphicx|geometry|tikz|hyperref)$/i)) {
      files.add(pkg + '.sty');
    }
  }
  
  return [...files];
}

function collectImageReferences(latexCode: string): string[] {
  const matches = new Set<string>();
  const regex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;

  let match: RegExpExecArray | null = regex.exec(latexCode);
  while (match) {
    const rawRef = match[1].trim();
    if (rawRef) {
      matches.add(rawRef);
    }
    match = regex.exec(latexCode);
  }

  return [...matches];
}

function isSafeAssetReference(reference: string): boolean {
  if (!reference) return false;
  if (reference.includes("..")) return false;
  if (reference.startsWith("/") || reference.startsWith("\\")) return false;
  if (reference.includes(":")) return false;
  return /^[a-zA-Z0-9_\-./]+$/.test(reference);
}

// Enhanced error parsing with better context
function extractErrorLine(candidate: string): number | null {
  const directMatch = candidate.match(/:(\d+):/);
  if (directMatch) return Number(directMatch[1]);

  const latexMatch = candidate.match(/l\.(\d+)/);
  if (latexMatch) return Number(latexMatch[1]);

  const lineMatch = candidate.match(/line\s+(\d+)/i);
  if (lineMatch) return Number(lineMatch[1]);

  return null;
}

function extractErrorMessage(candidate: string): string {
  if (candidate.startsWith('!')) {
    return candidate.replace(/^!\s*/, '').trim();
  }
  
  const errorMatch = candidate.match(/error:\s*(.+)/i);
  if (errorMatch) return errorMatch[1].trim();
  
  const fatalMatch = candidate.match(/fatal\s+error:\s*(.+)/i);
  if (fatalMatch) return fatalMatch[1].trim();
  
  return candidate.trim();
}

export function parseLatexErrors(logs: string): LatexCompilationError[] {
  const lines = logs.split(/\r?\n/);
  const errors: LatexCompilationError[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith('!') || /error|fatal/i.test(line)) {
      const message = extractErrorMessage(line) || "Unknown LaTeX error";
      let lineNumber: number | null = extractErrorLine(line);

      // Look for line number in following lines
      for (let i = index + 1; i < Math.min(index + 6, lines.length) && lineNumber === null; i += 1) {
        lineNumber = extractErrorLine(lines[i]);
      }

      errors.push({
        message,
        line: lineNumber,
        raw: line,
      });
    }
  });

  return errors;
}

// Detect if BibTeX is needed
function needsBibtex(latexCode: string, auxContent?: string): boolean {
  // Check for citations in main file
  const hasCitations = /\\cite(?:\[[^\]]*\])?\s*\{/.test(latexCode);
  if (!hasCitations) return false;
  
  // Check for bibliography commands
  const hasBibliography = /\\bibliography|\\bibliographystyle/.test(latexCode);
  if (!hasBibliography) return false;
  
  // If we have aux content, check for undefined citations
  if (auxContent) {
    const hasUndefinedCitations = /\\citation\{|Warning: Citation.*undefined/.test(auxContent);
    return hasUndefinedCitations;
  }
  
  return true;
}

// Check if another pass is needed
function needsAnotherPass(output: string, passNumber: number): boolean {
  if (passNumber >= MAX_PASSES) return false;
  
  const rerunPatterns = [
    /rerun\s+to\s+get/i,
    /label\(s\)\s+may\s+have\s+changed/i,
    /citation\s+.*undefined/i,
    /undefined\s+citations/i,
    /references\s+changed/i,
    /rerun/i
  ];
  
  return rerunPatterns.some(pattern => pattern.test(output));
}

async function runCommand(command: string, args: string[], timeoutMs: number, options?: { cwd?: string }): Promise<{ exitCode: number; output: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = spawn(command, args, { 
      stdio: ["ignore", "pipe", "pipe"],
      cwd: options?.cwd 
    });

    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      resolve({ exitCode: exitCode ?? 1, output, duration });
    });
  });
}

// Find available LaTeX compilers
function findCompiler(compiler: 'pdflatex' | 'xelatex' | 'lualatex'): string | null {
  const possiblePaths = {
    pdflatex: [
      "C:\\Users\\texta\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
      "C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
      "pdflatex"
    ],
    xelatex: [
      "C:\\Users\\texta\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe",
      "C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe",
      "xelatex"
    ],
    lualatex: [
      "C:\\Users\\texta\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\lualatex.exe",
      "C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\lualatex.exe",
      "lualatex"
    ]
  };
  
  for (const path of possiblePaths[compiler]) {
    if (path === compiler || fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

// CRITICAL: Fix working directory - pdflatex must run INSIDE workspaceDir
async function runLatexPass(
  workspaceDir: string, 
  compiler: 'pdflatex' | 'xelatex' | 'lualatex',
  timeoutMs: number
): Promise<{ exitCode: number; output: string; duration: number }> {
  const compilerPath = findCompiler(compiler);
  if (!compilerPath) {
    throw new Error(`${compiler} not found. Please ensure MiKTeX is installed.`);
  }
  
  // CRITICAL: Sanitize path - remove newlines and trim
  workspaceDir = workspaceDir.trim();
  
  // CRITICAL: Verify main.tex exists before running
  const mainTexPath = path.join(workspaceDir, "main.tex");
  if (!fs.existsSync(mainTexPath)) {
    throw new Error(`main.tex not found in workspace: ${mainTexPath}`);
  }
  
  // CRITICAL: Debug logging for CWD and files
  console.log("CWD:", workspaceDir);
  console.log("OUTPUT DIR:", JSON.stringify(workspaceDir));
  console.log("FILES:", fs.readdirSync(workspaceDir));
  console.log("main.tex EXISTS:", fs.existsSync(mainTexPath));
  
  // CRITICAL: Use minimal safe command - remove problematic flags
  const args = [
    "-interaction=nonstopmode",
    "-file-line-error",
    `-output-directory=${workspaceDir}`, // CRITICAL: Proper arg format
    "main.tex" // Relative to CWD
  ];
  
  // CRITICAL: Log exact command to verify one-line format
  console.log("FINAL CMD:", args.join(" "));
  console.log(`Running ${compiler} from INSIDE workspace directory:`);
  console.log(`Working Directory: ${workspaceDir}`);
  
  // CRITICAL: Set working directory explicitly to workspaceDir
  return await runCommand(compilerPath, args, timeoutMs, { 
    cwd: workspaceDir
  });
}

// Run BibTeX if needed
async function runBibtexPass(workspaceDir: string, timeoutMs: number): Promise<{ exitCode: number; output: string; duration: number }> {
  const bibtexPath = findCompiler('pdflatex')?.replace('pdflatex.exe', 'bibtex.exe') || 'bibtex';
  
  const args = ["main"];
  
  console.log(`Running BibTeX in directory:`, workspaceDir);
  
  return await runCommand(bibtexPath, args, timeoutMs, { cwd: workspaceDir });
}

// Check for missing packages and retry with auto-install
function hasMissingPackageError(output: string): boolean {
  const missingPatterns = [
    /package.*not found/i,
    /undefined control sequence/i,
    /file.*not found/i,
    /missing.*package/i,
    /emergency stop/i,
    /fatal error/i
  ];
  return missingPatterns.some(pattern => pattern.test(output));
}

// Check if compilation actually failed vs just warnings
function isRealCompilationError(output: string): boolean {
  const fatalErrorPatterns = [
    /emergency stop/i,
    /fatal error/i,
    /missing.*\\end/i,
    /syntax error/i,
    /undefined control sequence.*\\[a-zA-Z]+/,
    /missing.*file/i,
    /cannot find/i
  ];
  
  // Ignore MiKTeX warnings and update messages
  const warningPatterns = [
    /major issue.*miktex updates/i,
    /package.*infwarerr/i,
    /so far.*not checked.*miktex/i,
    /miktex.*did not succeed/i,
    /file:line:error style messages enabled/i
  ];
  
  // If it's a warning, it's not a real error
  if (warningPatterns.some(pattern => pattern.test(output))) {
    return false;
  }
  
  // Check for actual fatal errors
  return fatalErrorPatterns.some(pattern => pattern.test(output));
}

// Check if compilation succeeded (PDF exists = success, even with warnings)
function isCompilationSuccessful(workspaceDir: string, output: string): boolean {
  const pdfPath = path.join(workspaceDir, "main.pdf");
  
  // Primary success condition: PDF exists
  if (fs.existsSync(pdfPath)) {
    console.log("✅ PDF file detected - compilation successful");
    return true; // Success even with warnings
  }
  
  // If no PDF, check if there was a fatal error
  const hasFatalError = isRealCompilationError(output);
  if (hasFatalError) {
    console.log("❌ Fatal LaTeX error detected");
    return false;
  }
  
  // No PDF and no fatal error - likely MiKTeX warnings
  console.log("⚠️  No PDF but no fatal errors - likely MiKTeX warnings");
  return false;
}


async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Enhanced artifact cleanup
async function clearPreviousArtifacts(workspaceDir: string): Promise<void> {
  const artifacts = [
    "main.aux", "main.log", "main.out", "main.pdf", "main.toc", 
    "main.bbl", "main.bcf", "main.blg", "main.fdb_latexmk",
    "main.fls", "main.idx", "main.ind", "main.ilg", "main.synctex.gz"
  ];
  await Promise.all(
    artifacts.map(async (artifact) => {
      const fullPath = path.join(workspaceDir, artifact);
      try {
        await fsPromises.unlink(fullPath);
      } catch {
        // no-op
      }
    })
  );
}

// Enhanced image copying with better error handling
async function copyReferencedImages(latexCode: string, workspaceDir: string): Promise<void> {
  const references = collectImageReferences(latexCode);
  if (!references.length) return;

  const sourceDirs = [LATEX_UPLOAD_ROOT];
  const copied = new Set<string>();

  console.log("Copying referenced images:", references);

  for (const reference of references) {
    if (!isSafeAssetReference(reference)) continue;

    const normalized = reference.replace(/\\/g, "/");
    const targetFileName = path.basename(normalized);
    if (!targetFileName || copied.has(targetFileName)) continue;

    console.log("Looking for image:", targetFileName);

    for (const sourceDir of sourceDirs) {
      const sourcePath = path.join(sourceDir, targetFileName);
      console.log("Checking source path:", sourcePath);
      
      if (!(await fileExists(sourcePath))) {
        console.log("Image not found at:", sourcePath);
        continue;
      }

      console.log("Found image, copying to workspace");
      const destinationPath = path.join(workspaceDir, targetFileName);
      await fsPromises.copyFile(sourcePath, destinationPath);
      copied.add(targetFileName);
      break;
    }

    if (!copied.has(targetFileName)) {
      console.error("Could not find referenced image:", targetFileName);
    }
  }
}

// Enhanced log reading with fallback
async function readLogs(logPath: string, fallback: string): Promise<string> {
  if (await fileExists(logPath)) {
    return await fsPromises.readFile(logPath, "utf-8") as string;
  }
  return fallback;
}

// Simplified pdflatex-only multi-pass compilation
async function runPdflatexCompilation(
  workspaceDir: string, 
  code: string,
  enableBibtex: boolean
): Promise<{ success: boolean; steps: CompilationStep[]; error?: string }> {
  const steps: CompilationStep[] = [];
  
  try {
    // PASS 1: First pdflatex pass
    console.log(`Running pdflatex - PASS 1`);
    const pass1 = await runLatexPass(workspaceDir, 'pdflatex', COMPILER_TIMEOUT);
    steps.push({
      name: 'pdflatex (pass 1)',
      command: 'pdflatex',
      args: [],
      exitCode: pass1.exitCode,
      output: pass1.output,
      duration: pass1.duration
    });
    
    // Check for BibTeX after first pass
    let bibtexRun = false;
    if (enableBibtex) {
      let auxContent = "";
      try {
        auxContent = fs.readFileSync(path.join(workspaceDir, "main.aux"), "utf8");
      } catch (e) {
        // aux file might not exist yet
      }
      
      if (needsBibtex(code, auxContent)) {
        console.log("Running BibTeX...");
        const bibtexResult = await runBibtexPass(workspaceDir, COMPILER_TIMEOUT);
        bibtexRun = true;
        steps.push({
          name: 'bibtex',
          command: 'bibtex',
          args: [],
          exitCode: bibtexResult.exitCode,
          output: bibtexResult.output,
          duration: bibtexResult.duration
        });
      }
    }
    
    // PASS 2: Second pdflatex pass
    console.log(`Running pdflatex - PASS 2`);
    const pass2 = await runLatexPass(workspaceDir, 'pdflatex', COMPILER_TIMEOUT);
    steps.push({
      name: 'pdflatex (pass 2)',
      command: 'pdflatex',
      args: [],
      exitCode: pass2.exitCode,
      output: pass2.output,
      duration: pass2.duration
    });
    
    // PASS 3: Third pdflatex pass (for cross-references)
    console.log(`Running pdflatex - PASS 3`);
    const pass3 = await runLatexPass(workspaceDir, 'pdflatex', COMPILER_TIMEOUT);
    steps.push({
      name: 'pdflatex (pass 3)',
      command: 'pdflatex',
      args: [],
      exitCode: pass3.exitCode,
      output: pass3.output,
      duration: pass3.duration
    });
    
    // CRITICAL: Check PDF after each pass - Overleaf behavior
    let pdfGenerated = false;
    const pdfPath = path.resolve(workspaceDir, "main.pdf"); // ABSOLUTE PATH ONLY
    const finalOutput = pass3.output; // Get final output for logging
    
    // CRITICAL: Wait for file write (500-1000ms)
    await new Promise(resolve => setTimeout(resolve, 750));
    
    // CRITICAL: Verify output files after run
    console.log("FILES AFTER COMPILATION:", fs.readdirSync(workspaceDir));
    
    const mainLogExists = fs.existsSync(path.join(workspaceDir, "main.log"));
    const mainAuxExists = fs.existsSync(path.join(workspaceDir, "main.aux"));
    const mainPdfExists = fs.existsSync(pdfPath);
    
    console.log(`main.log EXISTS: ${mainLogExists}`);
    console.log(`main.aux EXISTS: ${mainAuxExists}`);
    console.log(`main.pdf EXISTS: ${mainPdfExists}`);
    
    // CRITICAL: Do NOT rely on exit code - check PDF anyway
    console.log(`Pass 3 exit code: ${pass3.exitCode}`);
    console.log("PDF PATH:", pdfPath);
    console.log("PDF EXISTS:", mainPdfExists);
    
    // CRITICAL: If PDF still not generated, print full stderr
    if (!mainPdfExists) {
      console.log("=== FULL STDERR (PDF NOT GENERATED) ===");
      console.log(finalOutput);
      console.log("=== END STDERR ===");
    }
    
    // CRITICAL: Hard assert for PDF generation
    if (mainLogExists && mainAuxExists && !mainPdfExists) {
      throw new Error("PDF GENERATION FAILED (pdflatex did not output PDF)");
    }
    
    // CRITICAL: Safe file check - Overleaf behavior
    if (mainPdfExists) {
      pdfGenerated = true;
      console.log("✅ PDF generated successfully (minimal safe command)");
    } else {
      console.log("❌ PDF not found after compilation");
    }
    
    // CRITICAL: Success condition - PDF exists = SUCCESS
    if (pdfGenerated) {
      console.log("🎯 SUCCESS: PDF exists - compilation successful");
      return { success: true, steps };
    }
    
    // If no PDF, check for fatal LaTeX errors (not warnings)
    const hasFatalError = isRealCompilationError(finalOutput);
    if (hasFatalError) {
      console.log("❌ FATAL ERROR: Real LaTeX error detected");
      return { 
        success: false, 
        steps, 
        error: `Compilation failed: Fatal LaTeX error occurred` 
      };
    }
    
    // No PDF and no fatal errors - likely MiKTeX issues or warnings
    console.log("⚠️  NO PDF: Likely MiKTeX configuration issues (not LaTeX errors)");
    return { 
      success: false, 
      steps, 
      error: `PDF not generated - compilation continued but no PDF produced` 
    };
    
  } catch (error: any) {
    return { 
      success: false, 
      steps, 
      error: error.message || `Unknown error during pdflatex compilation` 
    };
  }
}

// Full Overleaf-level compilation engine
export async function compileLatexLocally(
  workspaceId: string,
  code: string,
  options: CompileOptions = {}
): Promise<LatexCompilationResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxPasses = options.maxPasses ?? MAX_PASSES;
  const enableBibtex = options.enableBibtex ?? true;
  const compilerFallback = options.compilerFallback ?? true;
  
  const workspaceDir = getWorkspaceDir(workspaceId, options.workspaceSubdir);
  const compilers: Array<'pdflatex' | 'xelatex' | 'lualatex'> = ['pdflatex', 'xelatex', 'lualatex'];
  
  console.log("LaTeX compilation started:", { workspaceId, workspaceDir, maxPasses, enableBibtex });

  await fsPromises.mkdir(workspaceDir, { recursive: true });
  await fsPromises.mkdir(LATEX_PDF_UPLOAD_DIR, { recursive: true });
  await clearPreviousArtifacts(workspaceDir);

  // Copy referenced images if needed
  if (options.copyReferencedImages) {
    await copyReferencedImages(code, workspaceDir);
  }

  // Write project files if provided
  if (options.projectFiles) {
    for (const file of options.projectFiles) {
      const filePath = path.join(workspaceDir, file.filename);
      await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, { encoding: "utf8" });
    }
  }

  const texPath = path.join(workspaceDir, "main.tex");
  const logPath = path.join(workspaceDir, "main.log");
  const pdfPath = path.join(workspaceDir, "main.pdf");
  const auxPath = path.join(workspaceDir, "main.aux");

  // CRITICAL: Write EXACT content without ANY modification
  console.log("LATEX INPUT:", code);
  fs.writeFileSync(texPath, code, { encoding: "utf8" });
  
  // Verify written content matches exactly
  const writtenContent = fs.readFileSync(texPath, "utf8");
  console.log("FILE CONTENT:", writtenContent);
  console.log("CONTENT MATCHES:", writtenContent === code);
  
  const relativeWorkspacePath = getRelativeWorkspacePath(workspaceDir);
  console.log("LaTeX files written:", { texPath, relativeWorkspacePath });

  let finalResult: LatexCompilationResult | null = null;
  let compilationSteps: CompilationStep[] = [];
  let bibtexRun = false;
  let passesCompleted = 0;
  let usedCompiler: 'pdflatex' | 'xelatex' | 'lualatex' = 'pdflatex';

  // Use ONLY pdflatex by default (no aggressive fallback)
  console.log("Attempting compilation with pdflatex only");
  usedCompiler = 'pdflatex';
  
  try {
    // Use simplified pdflatex-only compilation
    const compilationResult = await runPdflatexCompilation(
      workspaceDir, 
      code, 
      enableBibtex
    );
    
    compilationSteps = compilationResult.steps;
    passesCompleted = 3; // Always 3 passes in pdflatex mode
    bibtexRun = compilationResult.steps.some((step: CompilationStep) => step.name === 'bibtex');
    
    if (!compilationResult.success) {
      throw new Error(compilationResult.error || `pdflatex compilation failed`);
    }
    
    // Success!
    const pdfPath = path.resolve(workspaceDir, "main.pdf"); // ABSOLUTE PATH ONLY
    console.log("PDF PATH:", pdfPath);
    console.log("PDF EXISTS:", fs.existsSync(pdfPath));
    
    const pdfBuffer = await fsPromises.readFile(pdfPath);
    const compilationTime = Date.now() - startTime;
    
    console.log(`Compilation successful with pdflatex!`);
    console.log(`3-pass compilation, BibTeX: ${bibtexRun}, Time: ${compilationTime}ms`);
    
    finalResult = {
      success: true,
      pdfPath,
      logs: compilationSteps.map(step => `${step.name}:\n${step.output}`).join('\n\n'),
      errors: [], // No errors on success
      base64: Buffer.from(pdfBuffer).toString("base64"),
      compilationTime,
      compilerUsed: usedCompiler,
      passesCompleted,
      bibtexRun
    };
    
  } catch (error: any) {
    console.error(`pdflatex failed:`, error.message);
    
    const logs = compilationSteps.map(step => `${step.name}:\n${step.output}`).join('\n\n');
    const finalLogs = await readLogs(logPath, logs);
    
    // Return error with REAL LaTeX messages only (no fake errors)
    finalResult = {
      success: false,
      logs: finalLogs,
      errors: parseLatexErrors(finalLogs), // Real errors only
      compilationTime: Date.now() - startTime,
      compilerUsed: usedCompiler,
      passesCompleted,
      bibtexRun
    };
  }
  
  if (!finalResult) {
    throw new Error("All compilers failed");
  }
  
  return finalResult;
}

export async function storeCompiledPdf(
  workspaceId: string,
  fileName: string,
  options: CompileOptions = {}
): Promise<StoredPdf> {
  const workspaceDir = getWorkspaceDir(workspaceId, options.workspaceSubdir);
  const sourcePath = path.join(workspaceDir, "main.pdf");

  if (!(await fileExists(sourcePath))) {
    throw new Error("Compiled PDF not found");
  }

  await fsPromises.mkdir(LATEX_PDF_UPLOAD_DIR, { recursive: true });

  const safeFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const outputFileName = `${safeFileName}.pdf`;
  const targetPath = path.join(LATEX_PDF_UPLOAD_DIR, outputFileName);

  await fsPromises.copyFile(sourcePath, targetPath);

  return {
    absolutePath: targetPath,
    publicUrl: `/uploads/latex/pdfs/${outputFileName}`,
  };
}

// Helper function to create project files from frontend input
export function createProjectFiles(files: Array<{filename: string, content: string}>): ProjectFile[] {
  return files.map(file => {
    const ext = path.extname(file.filename).toLowerCase();
    let type: ProjectFile['type'] = 'other';
    
    if (ext === '.tex') type = 'tex';
    else if (ext === '.bib') type = 'bib';
    else if (ext === '.sty') type = 'sty';
    else if (ext === '.cls') type = 'cls';
    else if (['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.svg'].includes(ext)) type = 'image';
    
    return {
      filename: file.filename,
      content: file.content,
      type
    };
  });
}
