import {
  MASTER_SCHEMAS,
  validateExportHeaders,
  buildInterviewBankCSV,
  buildNcertPDFCSV,
  stripLeadingOptionLabel,
  formatSkillAssessmentOptions,
} from './lib/unifiedQuestionExport';

function runExportSchemaTests() {
  console.log('========================================================');
  console.log('RUNNING STRICT EXCEL EXPORT SCHEMA & CONTENT MAPPING VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       -> ${detail}`);
    } else {
      failed++;
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       -> ${detail}`);
    }
  }

  // TEST 1: Skill Assessment Questions Schema
  const saSchema = MASTER_SCHEMAS.skill_assessment;
  const saExpectedSheet = 'Skill Assessment Questions';
  const saExpectedHeaders = ['question', 'type', 'options', 'answer', 'marks'];

  assert(saSchema.sheetName === saExpectedSheet, 'Skill Assessment Sheet Name', `Got: "${saSchema.sheetName}"`);
  assert(
    saSchema.headers.length === 5 && saSchema.headers.every((h, i) => h === saExpectedHeaders[i]),
    'Skill Assessment 5-Column Exact Headers',
    `Got: [${saSchema.headers.join(', ')}]`
  );

  // TEST 1B: Stripping Leading Option Labels
  assert(stripLeadingOptionLabel('A) Paris') === 'Paris', 'Strips A) label', `Got: "${stripLeadingOptionLabel('A) Paris')}"`);
  assert(stripLeadingOptionLabel('B. London') === 'London', 'Strips B. label', `Got: "${stripLeadingOptionLabel('B. London')}"`);
  assert(stripLeadingOptionLabel('(C) Berlin') === 'Berlin', 'Strips (C) label', `Got: "${stripLeadingOptionLabel('(C) Berlin')}"`);
  assert(stripLeadingOptionLabel('Option D: Madrid') === 'Madrid', 'Strips Option D: label', `Got: "${stripLeadingOptionLabel('Option D: Madrid')}"`);
  assert(stripLeadingOptionLabel('Option A - Rome') === 'Rome', 'Strips Option A - label', `Got: "${stripLeadingOptionLabel('Option A - Rome')}"`);
  assert(stripLeadingOptionLabel('[A] Vienna') === 'Vienna', 'Strips [A] label', `Got: "${stripLeadingOptionLabel('[A] Vienna')}"`);
  assert(stripLeadingOptionLabel('1) Tokyo') === 'Tokyo', 'Strips 1) label', `Got: "${stripLeadingOptionLabel('1) Tokyo')}"`);

  // TEST 1C: Formatting Skill Assessment Options Object / String
  const optObj = { A: 'A) Paris', B: 'B) London', C: 'C) Berlin', D: 'D) Madrid' };
  const formattedObj = formatSkillAssessmentOptions(optObj);
  assert(formattedObj === 'Paris | London | Berlin | Madrid', 'Option Object formatted with pipe separators and stripped labels', `Got: "${formattedObj}"`);

  const optStr = 'Option A: Paris | Option B: London | Option C: Berlin | Option D: Madrid';
  const formattedStr = formatSkillAssessmentOptions(optStr);
  assert(formattedStr === 'Paris | London | Berlin | Madrid', 'Option String formatted with pipe separators and stripped labels', `Got: "${formattedStr}"`);

  // TEST 2: Interview Bank AI Schema
  const ibSchema = MASTER_SCHEMAS.interview_bank;
  const ibExpectedSheet = 'Interview Bank AI';
  const ibExpectedHeaders = [
    'question',
    'category',
    'subject',
    'grade_band',
    'difficulty',
    'time_seconds',
    'max_score',
    'expected_keywords',
  ];

  assert(ibSchema.sheetName === ibExpectedSheet, 'Interview Bank Sheet Name', `Got: "${ibSchema.sheetName}"`);
  assert(
    ibSchema.headers.length === 8 && ibSchema.headers.every((h, i) => h === ibExpectedHeaders[i]),
    'Interview Bank AI 8-Column Exact Headers',
    `Got: [${ibSchema.headers.join(', ')}]`
  );

  // TEST 3: CSV Question Paper Generator Schema
  const ncertSchema = MASTER_SCHEMAS.ncert_pdf;
  const ncertExpectedSheet = 'CSV question paper Generator';
  const ncertExpectedHeaders = [
    'board',
    'grade',
    'subject',
    'publisher',
    'book',
    'chapter',
    'topic',
    'type',
    'difficulty',
    'marks',
    'text',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'answer',
  ];

  assert(ncertSchema.sheetName === ncertExpectedSheet, 'CSV Question Paper Generator Sheet Name', `Got: "${ncertSchema.sheetName}"`);
  assert(
    ncertSchema.headers.length === 16 && ncertSchema.headers.every((h, i) => h === ncertExpectedHeaders[i]),
    'CSV Question Paper Generator 16-Column Exact Headers',
    `Got: [${ncertSchema.headers.join(', ')}]`
  );

  // TEST 4: Validation Engine Test
  const saValid = validateExportHeaders('skill_assessment', [...saExpectedHeaders]);
  assert(saValid.valid, 'Validator approves exact Skill Assessment headers');

  const saInvalid = validateExportHeaders('skill_assessment', ['question', 'type', 'wrong_header']);
  assert(!saInvalid.valid, 'Validator correctly rejects mismatched Skill Assessment headers');

  const ibValid = validateExportHeaders('interview_bank', [...ibExpectedHeaders]);
  assert(ibValid.valid, 'Validator approves exact Interview Bank headers');

  const ncertValid = validateExportHeaders('ncert_pdf', [...ncertExpectedHeaders]);
  assert(ncertValid.valid, 'Validator approves exact NCERT/Question Paper Generator headers');

  console.log('\n--------------------------------------------------------');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log('--------------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runExportSchemaTests();
