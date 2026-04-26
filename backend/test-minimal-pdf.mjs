// Test with minimal LaTeX to isolate PDF generation issue
import { compileLatexLocally } from './dist/services/latexCompileService.js';

const minimalDocument = `\\documentclass{article}
\\begin{document}
Hello World!
\\end{document}`;

async function testMinimalPdf() {
  console.log("🔍 TESTING MINIMAL PDF GENERATION");
  console.log("=" .repeat(50));
  console.log("Using simplest possible LaTeX document\n");
  
  try {
    const result = await compileLatexLocally(`minimal-test-${Date.now()}`, minimalDocument, {
      copyReferencedImages: false,
      enableBibtex: false,
      compilerFallback: false,
      maxPasses: 3
    });
    
    console.log("📊 RESULT:");
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Compiler: ${result.compilerUsed}`);
    console.log(`Time: ${result.compilationTime}ms`);
    
    if (result.success) {
      console.log(`PDF Size: ${result.base64 ? `${result.base64.length} chars` : 'N/A'}`);
      console.log("🎉 PDF GENERATION WORKING!");
      
      // Save PDF
      if (result.base64) {
        const fs = await import('fs');
        const pdfBuffer = Buffer.from(result.base64, 'base64');
        fs.writeFileSync('minimal-test.pdf', pdfBuffer);
        console.log("📄 PDF saved: minimal-test.pdf");
      }
    } else {
      console.log("❌ PDF generation failed");
      console.log("\n🔍 DETAILED LOGS:");
      console.log(result.logs.substring(0, 2000) + "...");
      
      // Check for specific issues
      const logs = result.logs.toLowerCase();
      if (logs.includes('miktex update')) {
        console.log("\n⚠️  MIKTEC UPDATE ISSUE:");
        console.log("MiKTeX is refusing to generate PDF due to update warnings.");
        console.log("This is a MiKTeX configuration issue, not a LaTeX engine problem.");
      }
      
      if (logs.includes('error') || logs.includes('fatal')) {
        console.log("\n❌ REAL LATEX ERRORS DETECTED:");
        console.log("These are actual LaTeX compilation errors.");
      }
    }
    
  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
  }
}

testMinimalPdf().catch(console.error);
