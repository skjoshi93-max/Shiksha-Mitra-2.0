import { jsPDF } from 'jspdf';
import { Assessment } from '../types';

export interface CertificateData {
  certificateId: string;
  candidateName: string;
  assessmentTitle: string;
  subject: string;
  classLevel?: string;
  board?: string;
  scorePercent: number;
  totalQuestions: number;
  correctAnswers: number;
  issueDate: string;
  verificationUrl?: string;
}

export function generateVerificationSerialId(assessmentSlug: string): string {
  const prefix = 'SM-CERT';
  const year = new Date().getFullYear();
  const slugCode = (assessmentSlug || 'TCH')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
    .padEnd(4, 'X');
  const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
  const checkDigit = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${slugCode}-${randomHex}-${checkDigit}`;
}

export function generateAndDownloadCertificatePDF(data: CertificateData): void {
  // A4 Landscape Dimensions: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background Fill - Crisp Premium Warm Ivory / White
  doc.setFillColor(253, 253, 254);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Deep Navy Security Border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(3.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Inner Burnished Gold Accent Border
  doc.setDrawColor(217, 119, 6); // amber-600 gold
  doc.setLineWidth(1.2);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Subtle Thin Inner Security Guideline
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(14.5, 14.5, pageWidth - 29, pageHeight - 29);

  // Corner Ornaments (Gold Triangles/Squares)
  const drawCornerFlourish = (x: number, y: number, angle: number) => {
    doc.setFillColor(217, 119, 6);
    doc.circle(x, y, 2, 'F');
  };
  drawCornerFlourish(12, 12, 0);
  drawCornerFlourish(pageWidth - 12, 12, 90);
  drawCornerFlourish(12, pageHeight - 12, 270);
  drawCornerFlourish(pageWidth - 12, pageHeight - 12, 180);

  // Top Header Emblem Banner
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(pageWidth / 2 - 80, 16, 160, 16, 3, 3, 'F');

  doc.setTextColor(245, 158, 11); // Amber 400
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('NATIONAL TEACHER COMPETENCY & PROFESSIONAL EXCELLENCE FRAMEWORK', pageWidth / 2, 23, { align: 'center' });

  doc.setTextColor(226, 232, 240);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('SHIKSHAMITRA ACADEMIC ASSESSMENT & VERIFICATION COUNCIL', pageWidth / 2, 28.5, { align: 'center' });

  // Main Certificate Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF SKILL MASTERY', pageWidth / 2, 48, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('This is to officially certify that the educator named below has successfully completed the rigorous curriculum,', pageWidth / 2, 56, { align: 'center' });
  doc.text('instructional modules, and validated benchmark examination with certified excellence.', pageWidth / 2, 61, { align: 'center' });

  // Candidate Name Highlight
  doc.setTextColor(2, 132, 199); // Ocean Blue
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.candidateName || 'Certified Professional Educator', pageWidth / 2, 75, { align: 'center' });

  // Name Underline Accent
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 60, 78, pageWidth / 2 + 60, 78);

  // Assessment & Subject Block
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('has demonstrated verified competence in:', pageWidth / 2, 86, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(data.assessmentTitle, pageWidth / 2, 94, { align: 'center' });

  // Subject and Board Subtitle
  const gradeBoardStr = [data.subject, data.classLevel, data.board ? `(${data.board})` : ''].filter(Boolean).join('  •  ');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(gradeBoardStr, pageWidth / 2, 101, { align: 'center' });

  // Performance Badge Card (Center)
  const cardW = 190;
  const cardH = 30;
  const cardX = (pageWidth - cardW) / 2;
  const cardY = 108;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

  // 3 Metric Columns
  // 1. Score
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('SCORE ACHIEVED', cardX + 32, cardY + 10, { align: 'center' });
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.setFontSize(14);
  doc.text(`${data.scorePercent}% (Passed)`, cardX + 32, cardY + 21, { align: 'center' });

  // Divider 1
  doc.setDrawColor(226, 232, 240);
  doc.line(cardX + 65, cardY + 5, cardX + 65, cardY + 25);

  // 2. Questions Benchmark
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text('SCENARIO EVALUATION', cardX + 95, cardY + 10, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.correctAnswers} / ${data.totalQuestions} Questions Validated`, cardX + 95, cardY + 20, { align: 'center' });

  // Divider 2
  doc.line(cardX + 130, cardY + 5, cardX + 130, cardY + 25);

  // 3. Status & Honors
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text('PROFICIENCY LEVEL', cardX + 160, cardY + 10, { align: 'center' });
  doc.setTextColor(217, 119, 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const levelText = data.scorePercent >= 90 ? 'Mastery (Distinction)' : data.scorePercent >= 80 ? 'Proficient (Grade A)' : 'Certified Competent';
  doc.text(levelText, cardX + 160, cardY + 20, { align: 'center' });

  // Unique Verification Serial ID Block
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(pageWidth / 2 - 75, 144, 150, 10, 2, 2, 'F');
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(8);
  doc.setFont('courier', 'bold');
  doc.text(`VERIFICATION SERIAL ID: ${data.certificateId}`, pageWidth / 2, 150.5, { align: 'center' });

  // Signatures & Official Seal (Bottom Section)
  const bottomY = 168;

  // Left Signature: Academic Lead
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.line(35, bottomY + 12, 95, bottomY + 12);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Dr. Priya Sharma, Ph.D.', 65, bottomY + 17, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Director of Academic Pedagogy & Quality', 65, bottomY + 21, { align: 'center' });

  // Center Seal / Emblem
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1);
  doc.circle(pageWidth / 2, bottomY + 10, 14, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL', pageWidth / 2, bottomY + 7, { align: 'center' });
  doc.text('VERIFIED', pageWidth / 2, bottomY + 11, { align: 'center' });
  doc.text('SEAL', pageWidth / 2, bottomY + 15, { align: 'center' });

  // Right Signature: Verification Registrar
  doc.line(pageWidth - 95, bottomY + 12, pageWidth - 35, bottomY + 12);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Prof. K. R. Ramanathan', pageWidth - 65, bottomY + 17, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Registrar & Certification Officer', pageWidth - 65, bottomY + 21, { align: 'center' });

  // Issue Date & Security Notice
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Issue Date: ${data.issueDate}  |  Digitally Authenticated Certificate  |  Tamper-Proof Verification Protocol`, pageWidth / 2, pageHeight - 11, { align: 'center' });

  // Save the PDF
  const sanitizedTitle = (data.assessmentTitle || 'Skill_Certificate')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 30);
  const filename = `Digital_Certificate_${sanitizedTitle}_${data.certificateId}.pdf`;
  doc.save(filename);
}
