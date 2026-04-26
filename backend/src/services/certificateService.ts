import puppeteer from "puppeteer";

export interface CertificateTemplateData {
  studentName: string;
  courseName: string;
  instructorName: string;
  platformHeadName?: string;
  completionDate: string;
  certificateTitle: string;
  certificateBody: string;
}

export const generateCertificateHtml = (data: CertificateTemplateData) => {
  const platformHead = data.platformHeadName || "Mr. Shoeb Ahmad";
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate of Completion</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;600;700;800&display=swap');
            
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
            }

            body {
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                font-family: 'Montserrat', sans-serif;
                width: 297mm;
                height: 210mm;
            }
            
            .certificate-container {
                width: 297mm;
                height: 210mm;
                background: #ffffff;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                overflow: hidden;
                padding: 25mm 25mm 40mm; /* MASSIVE bottom padding to guarantee footer clears the border completely */
            }
            
            /* Decorative border */
            .certificate-border-outer {
                position: absolute;
                top: 8mm;
                left: 8mm;
                right: 8mm;
                bottom: 8mm;
                border: 1px solid #e2e8f0;
                background: #ffffff;
                z-index: 1;
            }

            .certificate-border-inner {
                position: absolute;
                top: 12mm;
                left: 12mm;
                right: 12mm;
                bottom: 12mm;
                border: 2px solid #1e293b;
                z-index: 2;
            }

            .gold-accents {
                position: absolute;
                top: 10mm;
                left: 10mm;
                right: 10mm;
                bottom: 10mm;
                border: 1px solid #d4af37;
                z-index: 3;
                pointer-events: none;
            }
            
            /* Corner Ornaments */
            .corner {
                position: absolute;
                width: 50px;
                height: 50px;
                background-color: #ffffff;
                z-index: 4;
            }
            .top-left { top: 10mm; left: 10mm; border-top: 4px solid #d4af37; border-left: 4px solid #d4af37; }
            .top-right { top: 10mm; right: 10mm; border-top: 4px solid #d4af37; border-right: 4px solid #d4af37; }
            .bottom-left { bottom: 10mm; left: 10mm; border-bottom: 4px solid #d4af37; border-left: 4px solid #d4af37; }
            .bottom-right { bottom: 10mm; right: 10mm; border-bottom: 4px solid #d4af37; border-right: 4px solid #d4af37; }
            
            .main-content {
                width: 100%;
                text-align: center;
                z-index: 10;
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
                position: relative; /* Guarantee above watermark */
            }
            
            .logo-container {
                margin-bottom: 10px;
            }

            .logo-circle {
                width: 60px;
                height: 60px;
                background: #06b6d4;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                box-shadow: 0 4px 10px rgba(6, 182, 212, 0.2);
            }
            
            .logo-circle span {
                color: white;
                font-weight: 800;
                font-size: 24px;
                font-family: 'Montserrat', sans-serif;
            }
            
            .platform-name {
                font-size: 13px;
                font-weight: 700;
                color: #334155;
                letter-spacing: 4px;
                text-transform: uppercase;
                margin-top: 10px;
            }
            
            .certificate-title {
                font-family: 'Libre Baskerville', serif;
                font-size: 40px;
                font-weight: 700;
                color: #1e293b;
                margin: 20px 0 5px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .title-divider {
                width: 120px;
                height: 2px;
                background: #d4af37;
                margin: 5px 0 25px;
            }
            
            .certify-text {
                font-size: 16px;
                color: #64748b;
                font-weight: 400;
                margin-bottom: 15px;
                letter-spacing: 0.5px;
            }
            
            .student-name {
                font-family: 'Libre Baskerville', serif;
                font-size: 60px;
                font-weight: 700;
                color: #06b6d4;
                margin: 5px 0 15px;
                padding-bottom: 5px;
                border-bottom: 2px solid #f1f5f9;
                display: inline-block;
                min-width: 400px;
            }
            
            .description-text {
                font-size: 16px;
                color: #64748b;
                max-width: 750px;
                line-height: 1.5;
                margin-bottom: 12px;
            }
            
            .course-name {
                font-family: 'Montserrat', sans-serif;
                font-size: 28px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 5px;
            }
            
            .completion-date {
                font-size: 14px;
                color: #94a3b8;
                font-weight: 500;
                margin-bottom: 15px;
            }

            /* PIXEL PERFECT ADJUSTMENT: Footer and Signature Section */
            .footer-container {
                width: 100%;
                z-index: 10;
                display: flex;
                flex-direction: column;
                align-items: center;
                /* Moving the entire bottom section upward to leave safe padding */
                margin-top: auto; 
                padding-bottom: 10px; /* added small padding to prevent perfectly abutting */
            }

            .signature-section {
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: flex-start; 
                padding: 0 40px; /* Safe padding from left/right */
                margin-top: 60px; /* Add spacing above signatures */
            }
            
            .signature-box {
                width: 200px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            
            .signature-line {
                width: 180px; 
                height: 1px;
                background: #cbd5e1;
                margin: auto;
                margin-bottom: 8px; 
            }
            
            .signature-name {
                font-size: 14px;
                font-weight: 700;
                color: #1e293b;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }

            .signature-role {
                font-size: 11px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .footer-copyright-text {
                font-size: 10px;
                color: #94a3b8;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-top: 25px; 
                font-weight: 600;
            }
            
            .watermark-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-20deg);
                font-size: 160px; /* VERY LARGE as requested */
                color: #bae6fd; /* explicit light blue (tailwind sky-200) */
                opacity: 0.3; /* visible but subtle watermark */
                font-weight: 900;
                white-space: nowrap;
                pointer-events: none;
                z-index: 5; /* MUST be > 4 to sit above the white background of certificate-border-outer */
                -webkit-print-color-adjust: exact;
            }
        </style>
    </head>
    <body>
        <div class="certificate-container">
            <div class="watermark-text">GATE HUB</div>
            
            <div class="certificate-border-outer"></div>
            <div class="certificate-border-inner"></div>
            <div class="gold-accents"></div>
            
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
            
            <div class="main-content">
                <div class="logo-container">
                    <div class="logo-circle"><span>GH</span></div>
                    <div class="platform-name">GATE HUB</div>
                </div>
                
                <h1 class="certificate-title">Certificate of Completion</h1>
                <div class="title-divider"></div>
                
                <p class="certify-text">This is to certify that</p>
                
                <div class="student-name">${data.studentName}</div>
                
                <p class="description-text">
                    has successfully demonstrated exceptional proficiency and completed all requirements for the professional certification of
                </p>
                
                <div class="course-name">${data.courseName}</div>
                
                <div class="completion-date">Awarded on ${data.completionDate}</div>
            </div>

            <div class="footer-container">
                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-name">${data.instructorName}</div>
                        <div class="signature-role">Course Instructor</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-name">Mr. Shoeb Ahmad</div>
                        <div class="signature-role">Head of Platform</div>
                    </div>
                </div>

                <div class="footer-copyright-text">
                    Verified Certificate of Achievement &copy; 2026 GATE HUB Learning Platform
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

export async function generatePdf(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  
  const page = await browser.newPage();
  
  // Set content with a fallback timeout and networkidle2 to prevent hanging on Google Fonts
  await page.setContent(htmlContent, { 
    waitUntil: "networkidle2",
    timeout: 60000 
  });
  
  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  
  await browser.close();
  return Buffer.from(pdfBuffer);
}
