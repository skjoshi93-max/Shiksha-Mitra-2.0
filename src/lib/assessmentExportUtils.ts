import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, HeadingLevel, AlignmentType } from 'docx';
import { Assessment, AssessmentQuestion } from '../types';
import { getLockedExportFilename } from './exportFilenameRegistry';
import { exportAssessmentQuestionsToCSV, exportCourseAssessmentDataBankToXLSX } from './unifiedQuestionExport';

// ==========================================
// 1. EXCEL (.xlsx) EXPORT (16-Column Master Schema)
// ==========================================
export function exportAssessmentToXLSX(assessment: Assessment, customFilename?: string) {
  exportCourseAssessmentDataBankToXLSX(assessment, customFilename);
}

// ==========================================
// 2. CSV EXPORT (UNIFIED EXPORT ENGINE)
// ==========================================
export function exportAssessmentToCSV(assessment: Assessment, customFilename?: string) {
  exportAssessmentQuestionsToCSV(assessment, customFilename);
}

// ==========================================
// 3. WORD (.docx) EXPORT
// ==========================================
export async function exportAssessmentToWord(assessment: Assessment, customFilename?: string) {
  const children: any[] = [
    new Paragraph({
      text: assessment.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Subject: ${assessment.subject}  |  `, bold: true }),
        new TextRun({ text: `Duration: ${assessment.duration} Mins  |  ` }),
        new TextRun({ text: `Pass Score: ${assessment.passScore}%  |  ` }),
        new TextRun({ text: `Total Questions: ${assessment.totalQuestions}  |  ` }),
        new TextRun({ text: `Total Marks: ${assessment.totalMarks}` }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: assessment.description, italics: true })],
      spacing: { after: 300 },
    }),
    new Paragraph({
      text: 'Skill Assessment Questions',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
    }),
  ];

  assessment.questions.forEach((q, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: q.question, bold: true }),
          new TextRun({ text: `  [Topic: ${q.topic} | Diff: ${q.difficulty} | Marks: ${q.marks}]`, italics: true }),
        ],
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({ text: `   A. ${q.options.A}`, spacing: { after: 50 } }),
      new Paragraph({ text: `   B. ${q.options.B}`, spacing: { after: 50 } }),
      new Paragraph({ text: `   C. ${q.options.C}`, spacing: { after: 50 } }),
      new Paragraph({ text: `   D. ${q.options.D}`, spacing: { after: 100 } }),
      new Paragraph({
        children: [
          new TextRun({ text: `   Correct Answer: `, bold: true }),
          new TextRun({ text: `${q.correctAnswer} (${q.options[q.correctAnswer as keyof typeof q.options]})`, color: '166534', bold: true }),
        ],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `   Explanation: `, bold: true }),
          new TextRun({ text: q.explanation, italics: true }),
        ],
        spacing: { after: 200 },
      })
    );
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getLockedExportFilename('skill_assessment', 'docx', customFilename || assessment.slug);
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================
// 4. PDF EXPORT (Test Paper & Answer Key Modes)
// ==========================================
export function exportAssessmentToPDF(assessment: Assessment, mode: 'test_paper' | 'answer_key', customFilename?: string) {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(assessment.title, 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const subText = mode === 'test_paper'
    ? `Teacher Skill Assessment  |  Subject: ${assessment.subject}  |  Time: ${assessment.duration} Mins  |  Pass: ${assessment.passScore}%`
    : `OFFICIAL ANSWER KEY & EXPLANATIONS  |  Subject: ${assessment.subject}  |  Pass: ${assessment.passScore}%`;
  doc.text(subText, 14, 22);

  let startY = 38;

  if (mode === 'test_paper') {
    // Instructions block
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.text(`Instructions: Answer all ${assessment.totalQuestions} questions. Each question carries equal marks unless specified. Select only ONE option per question.`, 14, startY);
    startY += 10;

    assessment.questions.forEach((q, idx) => {
      if (startY > 260) {
        doc.addPage();
        startY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const qText = `Q${idx + 1}. ${q.question} (${q.marks} Mark${q.marks > 1 ? 's' : ''})`;
      const splitQ = doc.splitTextToSize(qText, 180);
      doc.text(splitQ, 14, startY);
      startY += splitQ.length * 5 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);

      doc.text(`[  ] A. ${q.options.A}`, 20, startY);
      doc.text(`[  ] B. ${q.options.B}`, 110, startY);
      startY += 6;
      doc.text(`[  ] C. ${q.options.C}`, 20, startY);
      doc.text(`[  ] D. ${q.options.D}`, 110, startY);
      startY += 10;
    });
  } else {
    // Answer Key Mode with Table
    const tableData = assessment.questions.map((q, idx) => [
      `Q${idx + 1}`,
      q.question,
      q.correctAnswer,
      q.options[q.correctAnswer as keyof typeof q.options],
      q.explanation,
      q.topic,
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['#', 'Question', 'Key', 'Correct Option Text', 'Detailed Explanation', 'Topic']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 12, fontStyle: 'bold', textColor: [22, 101, 52] },
        3: { cellWidth: 35 },
        4: { cellWidth: 50 },
        5: { cellWidth: 23 },
      },
    });
  }

  const filename = getLockedExportFilename('skill_assessment', 'pdf', customFilename || assessment.slug);
  doc.save(filename);
}

// ==========================================
// 5. JSON EXPORT (Matching Spec 31)
// ==========================================
export function exportAssessmentToJSON(assessment: Assessment, customFilename?: string) {
  const jsonObject = {
    assessment: {
      title: assessment.title,
      slug: assessment.slug,
      subject: assessment.subject,
      description: assessment.description,
      durationMinutes: assessment.duration,
      passScore: assessment.passScore,
      active: assessment.active,
      totalQuestions: assessment.totalQuestions,
      totalMarks: assessment.totalMarks,
      createdDate: assessment.createdDate,
      questions: assessment.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: {
          A: q.options.A,
          B: q.options.B,
          C: q.options.C,
          D: q.options.D,
        },
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
        marks: q.marks,
      })),
    },
  };

  const jsonStr = JSON.stringify(jsonObject, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getLockedExportFilename('skill_assessment', 'json', customFilename || assessment.slug);
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================
// 6. TXT EXPORT
// ==========================================
export function exportAssessmentToTXT(assessment: Assessment, customFilename?: string) {
  const lines: string[] = [
    `==================================================`,
    `SKILL ASSESSMENT: ${assessment.title.toUpperCase()}`,
    `==================================================`,
    `Slug: ${assessment.slug}`,
    `Subject: ${assessment.subject}`,
    `Duration: ${assessment.duration} Minutes`,
    `Pass Score: ${assessment.passScore}%`,
    `Total Questions: ${assessment.totalQuestions}`,
    `Description: ${assessment.description}`,
    `==================================================\n`,
  ];

  assessment.questions.forEach((q, idx) => {
    lines.push(`Q${idx + 1}. [${q.topic} - ${q.difficulty}] ${q.question}`);
    lines.push(`   A. ${q.options.A}`);
    lines.push(`   B. ${q.options.B}`);
    lines.push(`   C. ${q.options.C}`);
    lines.push(`   D. ${q.options.D}`);
    lines.push(`   Correct Answer: ${q.correctAnswer}`);
    lines.push(`   Explanation: ${q.explanation}`);
    lines.push(`--------------------------------------------------\n`);
  });

  const txtContent = lines.join('\n');
  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getLockedExportFilename('skill_assessment', 'txt', customFilename || assessment.slug);
  a.click();
  URL.revokeObjectURL(url);
}
