// Simple test to verify LaTeX compilation
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test LaTeX document
const testLatex = `\\documentclass[12pt]{article}
\\usepackage{amsmath}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{Test Document}
\\author{Test}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
This is a test document to verify LaTeX compilation.

\\section{Math Test}
Test equation:
\\begin{equation}
E = mc^2
\\end{equation}

\\end{document}`;

async function testDockerLatex() {
  console.log("Testing Docker LaTeX compilation...");
  
  try {
    // Check if Docker is running
    const dockerCheck = spawn('docker', ['ps'], { stdio: 'pipe' });
    dockerCheck.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Docker is not running');
        return;
      }
      
      console.log('✅ Docker is running');
      
      // Check if latex_engine container exists
      const containerCheck = spawn('docker', ['ps', '-a', '--filter', 'name=latex_engine'], { stdio: 'pipe' });
      let containerOutput = '';
      
      containerCheck.stdout.on('data', (data) => {
        containerOutput += data.toString();
      });
      
      containerCheck.on('close', (code) => {
        if (containerOutput.includes('latex_engine')) {
          console.log('✅ LaTeX container exists');
          
          // Test compilation
          testCompilation();
        } else {
          console.log('❌ LaTeX container not found');
          console.log('Creating LaTeX container...');
          createLatexContainer();
        }
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function createLatexContainer() {
  console.log('Creating LaTeX Docker container...');
  
  const createCmd = spawn('docker', [
    'run', '-d', '--name', 'latex_engine',
    '-v', `${process.cwd()}/latex-temp:/data`,
    'texlive/texlive:latest',
    'tail', '-f', '/dev/null'
  ]);
  
  createCmd.on('close', (code) => {
    if (code === 0) {
      console.log('✅ LaTeX container created successfully');
      setTimeout(testCompilation, 2000); // Wait for container to be ready
    } else {
      console.error('❌ Failed to create LaTeX container');
    }
  });
}

async function testCompilation() {
  console.log('Testing LaTeX compilation...');
  
  // Create test directory
  const testDir = path.join(process.cwd(), 'latex-temp', 'test');
  fs.mkdirSync(testDir, { recursive: true });
  
  // Write test file
  const testFile = path.join(testDir, 'main.tex');
  fs.writeFileSync(testFile, testLatex, 'utf8');
  console.log('✅ Test LaTeX file written');
  
  // Run pdflatex with volume mount and working directory
  const compileCmd = spawn('docker', [
    'run', '--rm',
    '-v', `${testDir}:/workspace`,
    '-w', '/workspace',
    'texlive/texlive:latest',
    'pdflatex', '-interaction=nonstopmode', 'main.tex'
  ], {
    stdio: 'pipe'
  });
  
  let output = '';
  
  compileCmd.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  compileCmd.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  compileCmd.on('close', (code) => {
    console.log('Compilation output:', output);
    
    if (code === 0) {
      console.log('✅ LaTeX compilation successful!');
      
      // Check if PDF was created
      const pdfPath = path.join(testDir, 'main.pdf');
      if (fs.existsSync(pdfPath)) {
        console.log('✅ PDF generated successfully');
        console.log(`📄 PDF location: ${pdfPath}`);
      } else {
        console.log('❌ PDF not generated');
      }
    } else {
      console.log('❌ LaTeX compilation failed');
      console.log('Exit code:', code);
    }
  });
}

testDockerLatex();
