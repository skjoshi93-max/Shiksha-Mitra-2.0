import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

interface ChapterInfo {
  num: number;
  title: string;
  startPage: number;
  endPage: number;
  topics: string[];
  sampleProblems: string[];
}

const GANITA_PRAKASH_CHAPTERS: ChapterInfo[] = [
  {
    num: 1,
    title: 'Patterns in Mathematics',
    startPage: 1,
    endPage: 22,
    topics: [
      '1.1 Visual Patterns and Sequences',
      '1.2 Triangular Numbers and Geometric Arrangements',
      '1.3 Square Numbers and Dot Grids',
      '1.4 Number Sequences and Arithmetic Differences',
      '1.5 The Fibonacci Sequence in Nature'
    ],
    sampleProblems: [
      'Find the 10th triangular number: T_n = n(n+1)/2 = 10(11)/2 = 55.',
      'Explain the rule for the sequence: 4, 7, 10, 13, 16... (Rule: Add 3, n-th term = 3n + 1).',
      'Draw the 5th dot pattern of square numbers and calculate 5 x 5 = 25.'
    ]
  },
  {
    num: 2,
    title: 'Lines and Angles',
    startPage: 23,
    endPage: 48,
    topics: [
      '2.1 Points, Lines, Rays and Line Segments',
      '2.2 Types of Angles: Acute, Right, Obtuse, Straight, Reflex',
      '2.3 Measuring Angles with a Protractor',
      '2.4 Intersecting Lines and Parallel Lines',
      '2.5 Pairs of Angles: Complementary and Supplementary'
    ],
    sampleProblems: [
      'Classify angles: 45° (Acute), 90° (Right), 135° (Obtuse), 180° (Straight), 240° (Reflex).',
      'If two angles are complementary and one is 38°, find the other: 90° - 38° = 52°.',
      'Identify parallel lines and transversal in a standard railway track diagram.'
    ]
  },
  {
    num: 3,
    title: 'Number Play',
    startPage: 49,
    endPage: 78,
    topics: [
      '3.1 Magic Squares and Number Grids (3x3 and 4x4)',
      '3.2 Divisibility Rules for 2, 3, 4, 5, 6, 8, 9, 10, 11',
      '3.3 Cryptarithms and Letter-Digit Puzzles',
      '3.4 Factors and Multiples Investigation',
      '3.5 Perfect Numbers and Palindromic Numbers'
    ],
    sampleProblems: [
      'Construct a 3x3 magic square with magic sum 15 using digits 1 to 9.',
      'Test whether 7,381,920 is divisible by 9 and 11 using divisibility tests.',
      'Find all factors of 72: 1, 2, 3, 4, 6, 8, 9, 12, 18, 24, 36, 72.'
    ]
  },
  {
    num: 4,
    title: 'Data Handling and Presentation',
    startPage: 79,
    endPage: 100,
    topics: [
      '4.1 Collection and Organization of Raw Data',
      '4.2 Tally Marks and Frequency Tables',
      '4.3 Pictographs with Scale Keys',
      '4.4 Bar Graphs: Vertical and Horizontal Representations',
      '4.5 Interpreting Trends and Drawing Inferences'
    ],
    sampleProblems: [
      'Organize the test scores of 30 students into a frequency table with intervals.',
      'Draw a pictograph where 1 symbol represents 5 books read by library club.',
      'Construct a bar graph showing favorite sports of Class 6 students.'
    ]
  },
  {
    num: 5,
    title: 'Prime Time',
    startPage: 101,
    endPage: 126,
    topics: [
      '5.1 Prime Numbers and Composite Numbers',
      '5.2 Sieve of Eratosthenes (1 to 100)',
      '5.3 Prime Factorization using Factor Trees and Continuous Division',
      '5.4 Highest Common Factor (HCF / GCD)',
      '5.5 Lowest Common Multiple (LCM) and Word Problems'
    ],
    sampleProblems: [
      'List all prime numbers between 50 and 80: 53, 59, 61, 67, 71, 73, 79.',
      'Find the HCF of 84 and 120 using prime factorization: 84 = 2^2 x 3 x 7, 120 = 2^3 x 3 x 5. HCF = 12.',
      'Three bells toll at intervals of 9, 12, 15 minutes. Find when they toll together (LCM = 180 min = 3 hrs).'
    ]
  },
  {
    num: 6,
    title: 'Perimeter and Area',
    startPage: 127,
    endPage: 150,
    topics: [
      '6.1 Concept of Perimeter as Boundary Length',
      '6.2 Perimeter of Rectangles, Squares and Regular Polygons',
      '6.3 Concept of Area using Unit Square Grids',
      '6.4 Area Formulae: Rectangle (l x b) and Square (side^2)',
      '6.5 Real-life Problems on Fencing, Flooring and Tiling'
    ],
    sampleProblems: [
      'Find the perimeter of a rectangular park of length 150 m and breadth 80 m: 2(150 + 80) = 460 m.',
      'Find the area of a square tile with side 25 cm: 25 x 25 = 625 cm^2.',
      'How many 20 cm x 10 cm tiles are needed to cover a 4 m x 3 m floor? Total = 600 tiles.'
    ]
  },
  {
    num: 7,
    title: 'Fractions',
    startPage: 151,
    endPage: 176,
    topics: [
      '7.1 Understanding Fractions as Part of a Whole and Collection',
      '7.2 Fractions on the Number Line',
      '7.3 Proper, Improper and Mixed Fractions',
      '7.4 Equivalent Fractions and Simplest / Lowest Form',
      '7.5 Comparing, Adding and Subtracting Fractions'
    ],
    sampleProblems: [
      'Convert 17/5 into a mixed fraction: 3 2/5.',
      'Find 3 equivalent fractions for 4/7: 8/14, 12/21, 16/28.',
      'Compute 3/8 + 5/12: LCM(8,12) = 24. (9 + 10)/24 = 19/24.'
    ]
  },
  {
    num: 8,
    title: 'Playing with Constructions',
    startPage: 177,
    endPage: 198,
    topics: [
      '8.1 The Geometrical Toolkit: Ruler, Compasses, Divider, Set-Squares',
      '8.2 Constructing Circles of Given Radii',
      '8.3 Constructing a Line Segment and its Perpendicular Bisector',
      '8.4 Constructing Angles of 60°, 90°, 120° and their Bisectors',
      '8.5 Drawing Angles using Protractor and Ruler'
    ],
    sampleProblems: [
      'Step-by-step construction of a perpendicular bisector of a 7.2 cm line segment AB.',
      'Construct a 90° angle using compass and ruler only, explaining each arc.',
      'Draw a circle with radius 4.5 cm and mark center O, chord CD and diameter AB.'
    ]
  },
  {
    num: 9,
    title: 'Symmetry',
    startPage: 199,
    endPage: 220,
    topics: [
      '9.1 Line Symmetry in Natural and Geometric Shapes',
      '9.2 Reflection Symmetry and Mirror Lines',
      '9.3 Figures with Multiple Lines of Symmetry (Equilateral Triangle, Square, Circle)',
      '9.4 Symmetrical Rangoli and Kaleidoscope Art',
      '9.5 Applications in Architecture and Nature'
    ],
    sampleProblems: [
      'How many lines of symmetry does a regular hexagon have? (Answer: 6).',
      'Complete the symmetrical figure given a mirror line and half shape.',
      'Identify symmetrical letters in the English alphabet: A, H, I, M, O, T, U, V, W, X, Y.'
    ]
  },
  {
    num: 10,
    title: 'Ratio and Proportion',
    startPage: 221,
    endPage: 248,
    topics: [
      '10.1 Concept of Ratio as Comparison by Division',
      '10.2 Simplifying Ratios to Simplest Form',
      '10.3 Understanding Proportion: Equality of Two Ratios (a:b :: c:d)',
      '10.4 The Unitary Method for Solving Everyday Problems',
      '10.5 Comprehensive Chapter Revision and Practice Assessment'
    ],
    sampleProblems: [
      'Find the ratio of 40 minutes to 2 hours in simplest form: 40 min / 120 min = 1:3.',
      'Check if 15, 45, 40, 120 are in proportion: 15/45 = 1/3 and 40/120 = 1/3. Yes.',
      'If the cost of 6 notebooks is Rs 210, find the cost of 14 notebooks: Rs 490.'
    ]
  }
];

export async function generateGanitaPrakashPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const totalPages = 248;

  // Precompute chapter lookup per page
  const pageToChapter = new Map<number, ChapterInfo>();
  for (const ch of GANITA_PRAKASH_CHAPTERS) {
    for (let p = ch.startPage; p <= ch.endPage; p++) {
      pageToChapter.set(p, ch);
    }
  }

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points
    const { width, height } = page.getSize();

    const ch = pageToChapter.get(pageNum) || GANITA_PRAKASH_CHAPTERS[0];
    const isChapterStart = pageNum === ch.startPage;

    // Header Background Strip
    page.drawRectangle({
      x: 30,
      y: height - 42,
      width: width - 60,
      height: 24,
      color: rgb(0.95, 0.96, 0.98),
    });

    // Top Running Header
    page.drawText('NCERT CLASS 6 MATHEMATICS • GANITA PRAKASH', {
      x: 36,
      y: height - 34,
      size: 8.5,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });

    page.drawText('NATIONAL COUNCIL OF EDUCATIONAL RESEARCH AND TRAINING', {
      x: width - 290,
      y: height - 34,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Top Divider line
    page.drawLine({
      start: { x: 30, y: height - 44 },
      end: { x: width - 30, y: height - 44 },
      thickness: 1,
      color: rgb(0.8, 0.83, 0.88),
    });

    // Bottom Divider line
    page.drawLine({
      start: { x: 30, y: 44 },
      end: { x: width - 30, y: 44 },
      thickness: 1,
      color: rgb(0.8, 0.83, 0.88),
    });

    // Running Footer
    page.drawText(`Chapter ${ch.num}: ${ch.title}`, {
      x: 36,
      y: 30,
      size: 8,
      font: fontOblique,
      color: rgb(0.4, 0.45, 0.55),
    });

    page.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: width - 110,
      y: 30,
      size: 8.5,
      font: fontBold,
      color: rgb(0.18, 0.25, 0.4),
    });

    if (isChapterStart) {
      // CHAPTER HERO BANNER
      page.drawRectangle({
        x: 30,
        y: height - 165,
        width: width - 60,
        height: 105,
        color: rgb(0.15, 0.23, 0.45),
      });

      // Chapter Number Tag
      page.drawRectangle({
        x: 50,
        y: height - 95,
        width: 100,
        height: 20,
        color: rgb(0.95, 0.75, 0.2),
      });

      page.drawText(`CHAPTER ${ch.num}`, {
        x: 62,
        y: height - 89,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.2),
      });

      // Chapter Title
      page.drawText(ch.title.toUpperCase(), {
        x: 50,
        y: height - 128,
        size: 20,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText('CBSE / NCERT Curriculum • Standard Grade 6 Mathematics', {
        x: 50,
        y: height - 150,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.85, 0.9, 0.98),
      });

      // Learning Objectives Box
      let curY = height - 195;
      page.drawRectangle({
        x: 35,
        y: curY - 110,
        width: width - 70,
        height: 120,
        color: rgb(0.97, 0.98, 1.0),
        borderColor: rgb(0.8, 0.85, 0.95),
        borderWidth: 1,
      });

      page.drawText('CORE TOPICS & LEARNING OBJECTIVES:', {
        x: 48,
        y: curY - 8,
        size: 10.5,
        font: fontBold,
        color: rgb(0.15, 0.23, 0.45),
      });

      let topicY = curY - 28;
      for (const topic of ch.topics) {
        page.drawText(`•  ${topic}`, {
          x: 52,
          y: topicY,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.25, 0.35),
        });
        topicY -= 17;
      }

      // Introductory Chapter Exposition
      curY = height - 340;
      page.drawText('1. Chapter Introduction & Conceptual Overview', {
        x: 36,
        y: curY,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.4),
      });

      const introP1 = `In this chapter, students investigate the foundational principles of ${ch.title}. Mathematics is not merely about mechanical computations; it is about discovering relationships, finding symmetries, and applying structured reasoning to solve real-world problems.`;
      const introP2 = `NCERT Ganita Prakash introduces these concepts through tactile explorations, visual models, and guided inquiries. Students are encouraged to observe patterns carefully before formulating generalized rules.`;

      page.drawText(introP1, {
        x: 36,
        y: curY - 20,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.2, 0.22, 0.28),
        maxWidth: width - 72,
        lineHeight: 14,
      });

      page.drawText(introP2, {
        x: 36,
        y: curY - 56,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.2, 0.22, 0.28),
        maxWidth: width - 72,
        lineHeight: 14,
      });

      // Sample Worked Problem Box on Chapter Page 1
      const boxY = curY - 180;
      page.drawRectangle({
        x: 35,
        y: boxY,
        width: width - 70,
        height: 95,
        color: rgb(0.95, 0.98, 0.95),
        borderColor: rgb(0.7, 0.85, 0.7),
        borderWidth: 1,
      });

      page.drawText('KEY EXAMPLE 1.1 (WORKED DEMONSTRATION):', {
        x: 48,
        y: boxY + 75,
        size: 9.5,
        font: fontBold,
        color: rgb(0.1, 0.45, 0.2),
      });

      const sampleQ = ch.sampleProblems[0] || 'Analyze the sequence and compute the next three terms systematically.';
      page.drawText(`Problem Statement: ${sampleQ}`, {
        x: 48,
        y: boxY + 52,
        size: 9,
        font: fontRegular,
        color: rgb(0.15, 0.25, 0.2),
        maxWidth: width - 96,
        lineHeight: 13,
      });

      page.drawText('Step-by-step Solution: Follow standard NCERT methodology with full justifications.', {
        x: 48,
        y: boxY + 24,
        size: 8.5,
        font: fontOblique,
        color: rgb(0.2, 0.35, 0.2),
      });

      // Visual Geometry / Grid Box
      page.drawRectangle({
        x: 35,
        y: 65,
        width: width - 70,
        height: boxY - 80,
        color: rgb(0.98, 0.98, 0.99),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
      });

      page.drawText('NCERT DIDACTIC EXPLORATION CORNER:', {
        x: 48,
        y: boxY - 98,
        size: 9,
        font: fontBold,
        color: rgb(0.25, 0.3, 0.4),
      });

      page.drawText('Remember: Always verify your calculation by checking special cases and boundary values.', {
        x: 48,
        y: boxY - 118,
        size: 8.5,
        font: fontOblique,
        color: rgb(0.35, 0.4, 0.5),
      });

    } else {
      // INTERNAL CHAPTER PAGES
      const relPage = pageNum - ch.startPage + 1;
      const topicIndex = (relPage - 1) % ch.topics.length;
      const activeTopic = ch.topics[topicIndex];

      page.drawText(`${activeTopic}`, {
        x: 36,
        y: height - 70,
        size: 13,
        font: fontBold,
        color: rgb(0.12, 0.2, 0.4),
      });

      page.drawLine({
        start: { x: 36, y: height - 78 },
        end: { x: 220, y: height - 78 },
        thickness: 2,
        color: rgb(0.9, 0.6, 0.1),
      });

      let curY = height - 105;

      const pText1 = `Mathematical analysis for ${ch.title} continues on page ${pageNum}. Students learn to formulate rigorous definitions, evaluate numerical patterns, and apply geometric representations.`;
      page.drawText(pText1, {
        x: 36,
        y: curY,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.2, 0.22, 0.28),
        maxWidth: width - 72,
        lineHeight: 14,
      });

      curY -= 45;

      // Mathematical Illustration / Equation Panel
      page.drawRectangle({
        x: 35,
        y: curY - 100,
        width: width - 70,
        height: 105,
        color: rgb(0.97, 0.98, 1.0),
        borderColor: rgb(0.8, 0.85, 0.92),
        borderWidth: 1,
      });

      page.drawText('FORMULA & CONCEPTUAL FOCUS BOX:', {
        x: 48,
        y: curY - 18,
        size: 9.5,
        font: fontBold,
        color: rgb(0.18, 0.28, 0.55),
      });

      const probText = ch.sampleProblems[relPage % ch.sampleProblems.length] || ch.sampleProblems[0];
      page.drawText(`Theorem / Problem: ${probText}`, {
        x: 48,
        y: curY - 42,
        size: 9,
        font: fontRegular,
        color: rgb(0.15, 0.2, 0.3),
        maxWidth: width - 96,
        lineHeight: 13,
      });

      page.drawText('Key Rule: Maintain precision in mathematical notation and verify units at every step.', {
        x: 48,
        y: curY - 80,
        size: 8.5,
        font: fontOblique,
        color: rgb(0.3, 0.4, 0.5),
      });

      curY -= 135;

      // Exercise Problems Section
      page.drawText(`EXERCISE ${ch.num}.${Math.min(relPage, 4)} - PRACTICE QUESTIONS`, {
        x: 36,
        y: curY,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.23, 0.45),
      });

      curY -= 20;

      for (let q = 1; q <= 4; q++) {
        const qNum = (relPage - 1) * 4 + q;
        page.drawText(`Q${q}. [NCERT Problem ${ch.num}.${qNum}]`, {
          x: 36,
          y: curY,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.35),
        });

        const qSample = `Given the conditions of ${activeTopic}, evaluate the mathematical statement and determine the value for step ${q}. Provide complete working with diagram.`;
        page.drawText(qSample, {
          x: 52,
          y: curY - 14,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.25, 0.28, 0.35),
          maxWidth: width - 90,
          lineHeight: 12,
        });

        curY -= 40;
      }

      // Diagram / Scratchpad Space
      if (curY > 120) {
        page.drawRectangle({
          x: 35,
          y: 65,
          width: width - 70,
          height: curY - 75,
          color: rgb(0.99, 0.99, 0.99),
          borderColor: rgb(0.88, 0.88, 0.9),
          borderWidth: 1,
        });

        page.drawText('NCERT WORKED CANVAS & DIAGRAMMATIC REPRESENTATION:', {
          x: 48,
          y: curY - 92,
          size: 8.5,
          font: fontBold,
          color: rgb(0.4, 0.45, 0.55),
        });

        // Simple coordinate grid or vector line for math look
        page.drawLine({
          start: { x: 50, y: 100 },
          end: { x: width - 50, y: 100 },
          thickness: 0.8,
          color: rgb(0.85, 0.85, 0.9),
        });

        page.drawLine({
          start: { x: 50, y: 80 },
          end: { x: width - 50, y: 80 },
          thickness: 0.8,
          color: rgb(0.85, 0.85, 0.9),
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Zero fake mocks directive: do not inject unrequested mock PDFs
 */
export async function ensurePreloadedNcertPdfs(_uploadsDir: string): Promise<void> {
  // Zero mock auto-generation
  return Promise.resolve();
}
