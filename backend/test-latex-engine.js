// Test the full Overleaf-level LaTeX compilation engine
const { compileLatexLocally, createProjectFiles } = require('./dist/services/latexCompileService');
const fs = require('fs');
const path = require('path');

// Test cases
const testCases = [
  {
    name: "Basic Hello World",
    code: `\\documentclass{article}
\\begin{document}
Hello World!
\\end{document}`,
    expected: true
  },
  {
    name: "Math Formula",
    code: `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
The famous equation: $E = mc^2$
\\end{document}`,
    expected: true
  },
  {
    name: "TikZ Diagram",
    code: `\\documentclass{article}
\\usepackage{tikz}
\\begin{document}
\\begin{tikzpicture}
\\draw (0,0) -- (2,2);
\\draw (0,0) -- (2,0);
\\draw (2,0) -- (2,2);
\\end{tikzpicture}
\\end{document}`,
    expected: true
  },
  {
    name: "Bibliography Test",
    code: `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
This is a citation test \\cite{einstein1905}.
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
}`
      }
    ],
    expected: true
  },
  {
    name: "Multi-file Project",
    code: `\\documentclass{article}
\\input{chapter1}
\\input{chapter2}
\\end{document}`,
    projectFiles: [
      {
        filename: "chapter1.tex",
        content: `\\chapter{Introduction}
This is chapter 1.`
      },
      {
        filename: "chapter2.tex", 
        content: `\\chapter{Methods}
This is chapter 2.`
      }
    ],
    expected: true
  },
  {
    name: "Invalid LaTeX",
    code: `\\documentclass{article}
\\begin{document}
\\invalidcommand
\\end{document}`,
    expected: false
  }
];

async function runTests() {
  console.log("🧪 Testing Overleaf-level LaTeX Compilation Engine\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log("=" .repeat(50));
    
    try {
      const options = {
        copyReferencedImages: true,
        enableBibtex: true,
        compilerFallback: true,
        maxPasses: 3
      };
      
      if (testCase.projectFiles) {
        options.projectFiles = createProjectFiles(testCase.projectFiles);
      }
      
      const result = await compileLatexLocally(`test-${Date.now()}`, testCase.code, options);
      
      console.log(`✅ Success: ${result.success}`);
      console.log(`🔧 Compiler: ${result.compilerUsed}`);
      console.log(`🔄 Passes: ${result.passesCompleted}`);
      console.log(`📚 BibTeX: ${result.bibtexRun}`);
      console.log(`⏱️  Time: ${result.compilationTime}ms`);
      
      if (result.success) {
        console.log(`📄 PDF Generated: ${result.pdfPath ? 'Yes' : 'No'}`);
        console.log(`📊 Base64 Size: ${result.base64 ? result.base64.length : 0} chars`);
      } else {
        console.log(`❌ Errors: ${result.errors.length}`);
        result.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. Line ${error.line}: ${error.message}`);
        });
      }
      
      if (result.success === testCase.expected) {
        console.log("✅ Test PASSED");
        passed++;
      } else {
        console.log("❌ Test FAILED - Expected:", testCase.expected, "Got:", result.success);
        failed++;
      }
      
    } catch (error) {
      console.log(`💥 Exception: ${error.message}`);
      if (testCase.expected === false) {
        console.log("✅ Test PASSED (Expected failure)");
        passed++;
      } else {
        console.log("❌ Test FAILED (Unexpected error)");
        failed++;
      }
    }
  }
  
  console.log("\n" + "=".repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log("🎉 All tests passed! The Overleaf-level engine is working perfectly.");
  } else {
    console.log("⚠️  Some tests failed. Check the logs above for details.");
  }
}

// Run the tests
runTests().catch(console.error);
