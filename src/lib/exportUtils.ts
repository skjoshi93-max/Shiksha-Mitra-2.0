import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, BorderStyle } from 'docx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Question, ShikshaMitraTemplate } from '../types';
import { getLockedExportFilename } from './exportFilenameRegistry';

// Helper to trigger browser file download from Blob or string
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import { exportInterviewBankToXLSX } from './unifiedQuestionExport';

// 1. EXCEL (.xlsx) EXPORT
export function downloadXLSX(questions: Question[], filename = getLockedExportFilename('interview_bank', 'xlsx')) {
  exportInterviewBankToXLSX(questions, filename);
}

// 2. CSV EXPORT (UNIFIED EXPORT ENGINE - GENERATES XLSX)
export function downloadCSV(questions: Question[], filename = getLockedExportFilename('interview_bank', 'xlsx')) {
  exportInterviewBankToXLSX(questions, filename);
}

// 3. WORD (.docx) EXPORT
export async function downloadDOCX(
  questions: Question[],
  bankTitle = 'Shiksha Mitra Teacher Interview Question Bank',
  filename = getLockedExportFilename('interview_bank', 'docx')
) {
  const categoryCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};

  questions.forEach(q => {
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
    difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
  });

  const children: any[] = [
    new Paragraph({
      text: bankTitle,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Generated Date: ', bold: true }),
        new TextRun(new Date().toLocaleDateString('en-US', { dateStyle: 'full' })),
        new TextRun({ text: '  |  Total Questions: ', bold: true }),
        new TextRun(`${questions.length}`),
      ],
      spacing: { after: 300 },
    }),

    new Paragraph({
      text: 'Summary & Category Breakdown',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 150 },
    }),
  ];

  // Summary Table
  const catRows = Object.entries(categoryCounts).map(
    ([cat, count]) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(cat)], width: { size: 60, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph(`${count}`)], width: { size: 40, type: WidthType.PERCENTAGE } }),
        ],
      })
  );

  children.push(
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Count', bold: true })] })] }),
          ],
        }),
        ...catRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '', spacing: { after: 300 } })
  );

  children.push(
    new Paragraph({
      text: 'Question Items',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
    })
  );

  // Add each question
  questions.forEach((q, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. [${q.id}] `, bold: true, size: 24, color: '1E3A8A' }),
          new TextRun({ text: q.question, bold: true, size: 24 }),
        ],
        spacing: { before: 240, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Category: ', bold: true }),
          new TextRun(`${q.category}  |  `),
          new TextRun({ text: 'Difficulty: ', bold: true }),
          new TextRun(`${q.difficulty}  |  `),
          new TextRun({ text: 'Subject: ', bold: true }),
          new TextRun(`${q.subject}  |  `),
          new TextRun({ text: 'Type: ', bold: true }),
          new TextRun(`${q.questionType}`),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Time Limit: ', bold: true }),
          new TextRun(`${q.timeLimit}s  |  `),
          new TextRun({ text: 'Max Score: ', bold: true }),
          new TextRun(`${q.maxScore} pts  |  `),
          new TextRun({ text: 'Quality Score: ', bold: true }),
          new TextRun(`${q.qualityScore}/100`),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Tags: ', bold: true }),
          new TextRun(Array.isArray(q.tags) ? q.tags.join(', ') : q.tags),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Evaluation Hint: ', bold: true, italics: true }),
          new TextRun({ text: q.hint, italics: true }),
        ],
        spacing: { after: 200 },
      })
    );
  });

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename);
}

// 4. PDF EXPORT
export function downloadPDF(
  questions: Question[],
  bankTitle = 'Shiksha Mitra Teacher Interview Question Bank',
  filename = getLockedExportFilename('interview_bank', 'pdf')
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title & Metadata
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // Dark blue
  doc.text(bankTitle, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Total Questions: ${questions.length}`, 14, 22);

  const tableColumn = [
    'ID',
    'Question Text',
    'Category',
    'Diff',
    'Subject',
    'Time',
    'Score',
    'Tags & Hint',
  ];

  const tableRows = questions.map(q => [
    q.id,
    q.question,
    q.category,
    q.difficulty,
    q.subject,
    `${q.timeLimit}s`,
    `${q.maxScore}pt`,
    `Tags: ${Array.isArray(q.tags) ? q.tags.join(', ') : q.tags}\nHint: ${q.hint}`,
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 95 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16 },
      4: { cellWidth: 28 },
      5: { cellWidth: 15 },
      6: { cellWidth: 14 },
      7: { cellWidth: 48 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 25, bottom: 15, left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.internal.pages.length - 1}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    },
  });

  doc.save(filename);
}

// 5. JSON EXPORT
export function downloadJSON(questions: Question[], bankTitle = 'Teacher Interview Question Bank', filename = getLockedExportFilename('interview_bank', 'json')) {
  const exportObject = {
    questionBank: {
      name: bankTitle,
      version: '2.0',
      generatedAt: new Date().toISOString(),
      totalQuestions: questions.length,
      questions,
    },
  };

  const jsonStr = JSON.stringify(exportObject, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerDownload(blob, filename);
}

// 6. TXT EXPORT
export function downloadTXT(questions: Question[], bankTitle = 'Teacher Interview Question Bank', filename = getLockedExportFilename('interview_bank', 'txt')) {
  let content = `========================================================\n`;
  content += `${bankTitle.toUpperCase()}\n`;
  content += `Generated Date: ${new Date().toLocaleString()}\n`;
  content += `Total Questions: ${questions.length}\n`;
  content += `========================================================\n\n`;

  questions.forEach((q, i) => {
    content += `QUESTION #${i + 1} [ID: ${q.id}]\n`;
    content += `Q: ${q.question}\n`;
    content += `Category   : ${q.category}\n`;
    content += `Difficulty : ${q.difficulty}\n`;
    content += `Subject    : ${q.subject}\n`;
    content += `Type       : ${q.questionType}\n`;
    content += `Time Limit : ${q.timeLimit} seconds\n`;
    content += `Max Score  : ${q.maxScore}\n`;
    content += `Tags       : ${Array.isArray(q.tags) ? q.tags.join(', ') : q.tags}\n`;
    content += `Hint       : ${q.hint}\n`;
    content += `--------------------------------------------------------\n\n`;
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// 7. SHIKSHAMITRA CUSTOM TEMPLATE EXPORT (XLSX)
export function downloadShikshaMitraExport(
  questions: Question[],
  template: ShikshaMitraTemplate,
  filename = getLockedExportFilename('interview_bank', 'xlsx')
) {
  // Sort fields by order
  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

  const headers = sortedFields.map(f => f.targetColumnName);

  const transformValue = (val: any, field: any) => {
    if (val === undefined || val === null || val === '') {
      return field.defaultValue || '';
    }

    if (Array.isArray(val)) {
      val = val.join(', ');
    }

    let str = String(val);

    if (field.transform === 'lowercase') str = str.toLowerCase();
    if (field.transform === 'uppercase') str = str.toUpperCase();
    if (field.transform === 'boolean_yes_no') str = val ? 'Yes' : 'No';
    if (field.transform === 'boolean_1_0') str = val ? '1' : '0';

    return str;
  };

  const rows = questions.map(q => {
    return sortedFields.map(field => {
      let rawVal: any;
      if (field.sourceKey === 'custom_constant') {
        rawVal = field.defaultValue || '';
      } else {
        rawVal = q[field.sourceKey as keyof Question];

        // Apply category / difficulty mapping if defined
        if (field.sourceKey === 'category' && template.categoryMappings[rawVal]) {
          rawVal = template.categoryMappings[rawVal];
        }
        if (field.sourceKey === 'difficulty' && template.difficultyMappings[rawVal]) {
          rawVal = template.difficultyMappings[rawVal];
        }
      }

      return transformValue(rawVal, field);
    });
  });

  const cleanFilename = filename.toLowerCase().endsWith('.csv')
    ? filename.replace(/\.csv$/i, '.xlsx')
    : filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename}.xlsx`;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'ShikshaMitra Export');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, cleanFilename);
}
