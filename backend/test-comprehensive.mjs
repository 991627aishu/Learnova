// Test the comprehensive LaTeX document provided by user
import { compileLatexLocally } from './dist/services/latexCompileService.js';

const userLatexCode = `\\documentclass[12pt]{article}

\\usepackage{amsmath, amssymb}
\\usepackage{graphicx}
\\usepackage{tikz}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{booktabs}

\\geometry{margin=1in}

\\title{Full LaTeX System Test}
\\author{Aishwarya}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents
\\newpage

\\section{Introduction}
This document tests a full LaTeX engine including math, tables, diagrams, and references.

\\section{Mathematics}
Einstein's famous equation:

\\[
E = mc^2
\\]

Quadratic formula:

\\[
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\]

\\section{Lists}
\\subsection{Itemize}
\\begin{itemize}
\\item First item
\\item Second item
\\item Third item
\\end{itemize}

\\subsection{Enumerate}
\\begin{enumerate}
\\item Step one
\\item Step two
\\item Step three
\\end{enumerate}

\\section{Table Example}

\\begin{center}
\\begin{tabular}{lcc}
\\toprule
Name & Age & Score \\
\\midrule
Alice & 20 & 90 \\
Bob & 22 & 85 \\
Charlie & 19 & 88 \\
\\bottomrule
\\end{tabular}
\\end{center}

\\section{Image Example}

\\begin{figure}[h]
\\centering
\\includegraphics[width=0.4\\textwidth]{example-image}
\\caption{Sample Image}
\\end{figure}

\\section{TikZ Diagram}

\\begin{center}
\\begin{tikzpicture}
\\draw[thick] (0,0) circle (1);
\\draw[->] (0,0) -- (1,1);
\\node at (0,-1.5) {Circle with diagonal line};
\\end{tikzpicture}
\\end{center}

\\section{Cross References}

See Section~\\ref{sec:conclusion} for conclusion.

\\section{Hyperlinks}

Visit \\href{https://www.latex-project.org}{LaTeX Official Website}.

\\section{Conclusion}
\\label{sec:conclusion}

If this document compiles successfully, your LaTeX engine is fully functional and production-ready.

\\end{document}`;

async function testUserDocument() {
  console.log("🧪 COMPILING USER'S COMPREHENSIVE LATEX DOCUMENT");
  console.log("=" .repeat(60));
  console.log("Testing full LaTeX engine with math, tables, TikZ, references\n");
  
  try {
    const result = await compileLatexLocally(`user-test-${Date.now()}`, userLatexCode, {
      copyReferencedImages: true,
      enableBibtex: false, // No bibliography in this document
      compilerFallback: true,
      maxPasses: 3
    });
    
    console.log(`📊 RESULT: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🔧 Compiler Used: ${result.compilerUsed}`);
    console.log(`🔄 Passes Completed: ${result.passesCompleted}/3`);
    console.log(`📚 BibTeX Run: ${result.bibtexRun}`);
    console.log(`⏱️  Compilation Time: ${result.compilationTime}ms`);
    
    if (result.success) {
      console.log(`📄 PDF Generated: ${result.pdfPath ? 'File created' : 'Base64 available'}`);
      console.log(`📊 PDF Size: ${result.base64 ? `${result.base64.length} characters` : 'N/A'}`);
      console.log("\n✅ COMPILATION SUCCESSFUL!");
      console.log("🎉 Your LaTeX engine is fully functional and production-ready!");
      console.log("📋 Features validated:");
      console.log("   ✅ Math equations (E=mc², quadratic formula)");
      console.log("   ✅ Tables with booktabs");
      console.log("   ✅ TikZ diagrams");
      console.log("   ✅ Cross-references");
      console.log("   ✅ Hyperlinks");
      console.log("   ✅ Table of contents");
      console.log("   ✅ Lists and formatting");
    } else {
      console.log(`❌ COMPILATION FAILED`);
      console.log(`📋 Errors Found: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log("\n🔍 DETAILED ERRORS:");
        result.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. Line ${error.line || '??'}: ${error.message}`);
        });
      }
      
      console.log("\n📄 FULL LOGS:");
      console.log(result.logs.substring(0, 1000) + "...");
      
      // Check for common issues
      const logs = result.logs.toLowerCase();
      if (logs.includes('example-image')) {
        console.log("\n⚠️  NOTE: The 'example-image' might not be available.");
        console.log("   This is a standard LaTeX image that should be included with most distributions.");
      }
      
      if (logs.includes('miktex update')) {
        console.log("\n⚠️  MIKTEC UPDATE ISSUE:");
        console.log("   MiKTeX is asking for updates. This is not a compilation error.");
      }
    }
    
    // Production validation
    console.log("\n🔍 PRODUCTION VALIDATION:");
    console.log(`${result.passesCompleted === 3 ? '✅' : '❌'} Strict 3-pass compilation`);
    console.log(`${['pdflatex', 'xelatex', 'lualatex'].includes(result.compilerUsed) ? '✅' : '❌'} Valid compiler`);
    console.log(`${result.compilationTime < 30000 ? '✅' : '❌'} Timeout control`);
    console.log(`${result.success ? '✅' : '❌'} PDF generation`);
    
  } catch (error) {
    console.log(`💥 EXCEPTION: ${error.message}`);
    console.log("❌ Unexpected error during compilation");
  }
}

testUserDocument().catch(console.error);
