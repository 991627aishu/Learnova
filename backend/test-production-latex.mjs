// PRODUCTION-GRADE LaTeX Compilation Engine Test Suite
// Tests all strict requirements for Overleaf-level platform
import { compileLatexLocally, createProjectFiles } from './dist/services/latexCompileService.js';

// STRICT PRODUCTION TEST SUITE - ALL MUST PASS
const productionTests = [
  {
    name: "1. Hello World - Basic Compilation",
    code: `\\documentclass{article}
\\begin{document}
Hello World!
\\end{document}`,
    requirements: ["basic_compilation", "exact_content"],
    expected: true
  },
  {
    name: "2. Math Equation - Advanced Features",
    code: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\begin{document}
The famous equation: $E = mc^2$

Complex math:
\\begin{equation}
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
\\end{equation}
\\end{document}`,
    requirements: ["math_packages", "equations"],
    expected: true
  },
  {
    name: "3. TikZ Diagram - Graphics Support",
    code: `\\documentclass{article}
\\usepackage{tikz}
\\begin{document}
\\begin{tikzpicture}
\\draw[thick,->] (0,0) -- (4,0) node[anchor=north west] {x};
\\draw[thick,->] (0,0) -- (0,4) node[anchor=south east] {y};
\\draw[blue,thick] (0,0) -- (3,2);
\\draw[red,thick] (0,0) -- (2,3);
\\fill[green] (1,1) circle (2pt);
\\end{tikzpicture}
\\end{document}`,
    requirements: ["tikz", "graphics"],
    expected: true
  },
  {
    name: "4. Multi-Section Document - Large Project",
    code: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\title{Advanced LaTeX Document}
\\author{Production Test}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
This is a comprehensive test document with multiple sections.
It includes math: $\\alpha + \\beta = \\gamma$.

\\section{Mathematics}
\\subsection{Equations}
\\begin{equation}
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
\\end{equation}

\\subsection{Theorems}
\\begin{theorem}
For any positive integer n, $n^2 \\geq n$.
\\end{theorem}

\\section{Conclusion}
This document tests all major LaTeX features.
\\end{document}`,
    requirements: ["large_document", "sections", "math"],
    expected: true
  },
  {
    name: "5. Bibliography - Citations and References",
    code: `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
This is a citation test \\cite{einstein1905}.
Another citation \\cite{bohr1913}.

Multiple citations \\cite{einstein1905,bohr1913}.

\\bibliography{references}
\\bibliographystyle{plain}
\\end{document}`,
    projectFiles: [
      {
        filename: "references.bib",
        content: `@article{einstein1905,
  title={On the electrodynamics of moving bodies},
  author={Einstein, Albert},
  journal={Annalen der physik},
  volume={17},
  number={10},
  pages={891--921},
  year={1905}
}

@article{bohr1913,
  title={On the constitution of atoms and molecules},
  author={Bohr, Niels},
  journal={Philosophical Magazine},
  volume={26},
  number={151},
  pages={1--25},
  year={1913}
}`
      }
    ],
    requirements: ["bibtex", "citations", "multi_file"],
    expected: true
  }
];

// PRODUCTION VALIDATION CHECKS
function validateProductionRequirements(result, test) {
  const issues = [];
  
  // 1. STRICT MULTI-PASS: Must always run 3 passes
  if (result.passesCompleted !== 3) {
    issues.push(`PASS REQUIREMENT: Expected 3 passes, got ${result.passesCompleted}`);
  }
  
  // 2. COMPILER FALLBACK: Must use valid compiler
  const validCompilers = ['pdflatex', 'xelatex', 'lualatex'];
  if (!validCompilers.includes(result.compilerUsed)) {
    issues.push(`COMPILER REQUIREMENT: Invalid compiler ${result.compilerUsed}`);
  }
  
  // 3. REAL ERRORS: No fake error messages
  if (!result.success && result.errors.length === 0) {
    issues.push("ERROR REQUIREMENT: Failed compilation but no real errors provided");
  }
  
  // 4. COMPILATION TIME: Must be reasonable (under 30 seconds)
  if (result.compilationTime > 30000) {
    issues.push(`TIME REQUIREMENT: Compilation took ${result.compilationTime}ms (too long)`);
  }
  
  // 5. BIBTEX DETECTION: Should work for bibliography tests
  if (test.requirements.includes('bibtex') && !result.bibtexRun) {
    issues.push("BIBTEX REQUIREMENT: Bibliography test but BibTeX was not run");
  }
  
  // 6. EXACT CONTENT: Success should mean PDF was generated
  if (result.success && !result.pdfPath && !result.base64) {
    issues.push("OUTPUT REQUIREMENT: Success reported but no PDF generated");
  }
  
  return issues;
}

async function runProductionTests() {
  console.log("🏭 PRODUCTION-GRADE LaTeX Compilation Engine Test Suite");
  console.log("=" .repeat(70));
  console.log("Testing ALL strict Overleaf-level requirements\n");
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (const test of productionTests) {
    console.log(`📋 ${test.name}`);
    console.log(`   Requirements: ${test.requirements.join(', ')}`);
    console.log("-".repeat(50));
    
    try {
      const options = {
        copyReferencedImages: true,
        enableBibtex: true,
        compilerFallback: true,
        maxPasses: 3  // Strict 3-pass compilation
      };
      
      if (test.projectFiles) {
        options.projectFiles = createProjectFiles(test.projectFiles);
      }
      
      const startTime = Date.now();
      const result = await compileLatexLocally(`prod-test-${Date.now()}`, test.code, options);
      const duration = Date.now() - startTime;
      
      // Validate strict production requirements
      const issues = validateProductionRequirements(result, test);
      
      // Display results
      console.log(`✅ Success: ${result.success}`);
      console.log(`🔧 Compiler: ${result.compilerUsed}`);
      console.log(`🔄 Passes: ${result.passesCompleted} (STRICT: ${result.passesCompleted === 3 ? '✅' : '❌'})`);
      console.log(`📚 BibTeX: ${result.bibtexRun}`);
      console.log(`⏱️  Time: ${result.compilationTime}ms`);
      
      if (result.success) {
        console.log(`📄 PDF: ${result.pdfPath ? 'Generated' : 'Base64 provided'}`);
        console.log(`📊 PDF Size: ${result.base64 ? `${result.base64.length} chars` : 'N/A'}`);
      } else {
        console.log(`❌ Errors: ${result.errors.length}`);
        result.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. Line ${error.line}: ${error.message}`);
        });
      }
      
      // Check production issues
      if (issues.length > 0) {
        console.log("⚠️  PRODUCTION ISSUES:");
        issues.forEach(issue => console.log(`   ❌ ${issue}`));
      }
      
      // Overall test result
      const testPassed = result.success === test.expected && issues.length === 0;
      
      if (testPassed) {
        console.log("🎯 TEST PASSED - All production requirements met");
        passed++;
      } else {
        console.log("💥 TEST FAILED - Production requirements not met");
        failed++;
      }
      
      results.push({
        name: test.name,
        success: testPassed,
        result,
        issues
      });
      
    } catch (error) {
      console.log(`💥 EXCEPTION: ${error.message}`);
      console.log("❌ TEST FAILED - Unexpected error");
      failed++;
      results.push({
        name: test.name,
        success: false,
        error: error.message,
        issues: [`Exception: ${error.message}`]
      });
    }
    
    console.log("");
  }
  
  // Final Report
  console.log("=" .repeat(70));
  console.log("🏭 PRODUCTION TEST RESULTS");
  console.log("=" .repeat(70));
  console.log(`✅ Passed: ${passed}/${productionTests.length}`);
  console.log(`❌ Failed: ${failed}/${productionTests.length}`);
  console.log(`🎯 Success Rate: ${Math.round((passed / productionTests.length) * 100)}%`);
  
  // Detailed breakdown
  console.log("\n📊 DETAILED BREAKDOWN:");
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.issues && result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`    ⚠️  ${issue}`));
    }
  });
  
  // Production readiness assessment
  if (failed === 0) {
    console.log("\n🎉 PRODUCTION READY!");
    console.log("✅ All strict Overleaf-level requirements met");
    console.log("✅ Ready for production deployment");
  } else {
    console.log(`\n⚠️  PRODUCTION ISSUES DETECTED: ${failed} tests failed`);
    console.log("❌ Not ready for production - fix issues above");
  }
  
  return { passed, failed, results };
}

// Run the production test suite
runProductionTests().catch(console.error);
