import puppeteer from 'puppeteer-core';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

console.log("🔥 NEW CERTIFICATE SYSTEM ACTIVE");

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  completionDate: Date;
  certificateId: string;
}

export class PremiumCertificateService {
  private generateCertificateId(): string {
    return `GH-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
  }

  async generateCertificate(data: Omit<CertificateData, 'certificateId'>): Promise<Buffer> {
    const certificateData: CertificateData = {
      ...data,
      certificateId: this.generateCertificateId()
    };

    console.log("🔥 GENERATING PREMIUM HTML CERTIFICATE:", certificateData.certificateId);

    try {
      console.log("🔥 NEW PREMIUM CERTIFICATE RUNNING");
      console.log("Student:", certificateData.studentName);
      
      // Read HTML template
      const templatePath = path.join(process.cwd(), 'src', 'templates', 'certificateTemplate.html');
      let htmlTemplate = await fs.readFile(templatePath, 'utf-8');

      // Read logo image and convert to base64 for embedding
      const logoPath = path.join(process.cwd(), 'assets', 'images', 'gatehub-logo.png');
      const logoBuffer = await fs.readFile(logoPath);
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

      // Replace logo placeholder with base64 data
      htmlTemplate = htmlTemplate.replace(
        /src="file:\/\/\/.*?gatehub-logo\.png"/,
        `src="${logoBase64}"`
      );

      // Format date
      const formattedDate = certificateData.completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Replace placeholders for new template
      htmlTemplate = htmlTemplate
        .replace(/{{studentName}}/g, certificateData.studentName)
        .replace(/{{courseName}}/g, certificateData.courseTitle)
        .replace(/{{instructorName}}/g, certificateData.instructorName)
        .replace(/{{date}}/g, formattedDate);

      console.log("🔥 PUPPETEER STARTING...");
      
      // Launch Puppeteer with proper Chrome executable
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      console.log("🔥 PUPPETEER STARTED SUCCESSFULLY");
      
      const page = await browser.newPage();
      
      console.log("🔥 SETTING PAGE CONTENT...");
      
      // Set content and wait for it to load
      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
      
      console.log("🔥 PAGE CONTENT SET, GENERATING PDF...");
      
      // Generate PDF
      const pdfUint8Array = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      });

      await browser.close();

      console.log("🔥 PDF GENERATED SUCCESSFULLY");

      // Convert Uint8Array to Buffer
      const pdfBuffer = Buffer.from(pdfUint8Array);

      console.log("🔥 PREMIUM HTML CERTIFICATE GENERATED");
      
      return pdfBuffer;

    } catch (error) {
      console.error('🔥 CERTIFICATE GENERATION ERROR:', error);
      throw error;
    }
  }
}
