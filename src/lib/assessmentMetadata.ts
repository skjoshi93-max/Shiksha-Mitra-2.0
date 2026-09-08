export interface AssessmentPreset {
  id: string;
  name: string;
  category: 'ALL' | 'SCHOOL' | 'TEACHER' | 'COMPETITIVE' | 'Core Teaching' | 'Assessment' | 'Inclusive Education' | 'Educational Technology' | 'Policy / Education' | 'Professional Development';
  mainCategory: 'SCHOOL' | 'TEACHER' | 'COMPETITIVE';
  subject: string;
  classLevel: string;
  board: string;
  totalQuestions: number;
  duration: number;
  passScore: number;
  difficultyDistribution: { Easy: number; Medium: number; Hard: number };
  topics: string[];
  language: string;
  questionType: string;
  description: string;
}

export const SCHOOL_ACADEMIC_SUBJECTS = [
  'Mathematics',
  'General Mathematics',
  'Advanced Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Environmental Science / EVS',
  'English',
  'Hindi',
  'Sanskrit',
  'Urdu',
  'Punjabi',
  'Marathi',
  'Gujarati',
  'Bengali',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Odia',
  'Assamese',
  'Social Science',
  'History',
  'Geography',
  'Political Science / Civics',
  'Economics',
  'Sociology',
  'Psychology',
  'Philosophy',
  'Accountancy',
  'Business Studies',
  'Entrepreneurship',
  'Statistics',
  'Computer Science',
  'Artificial Intelligence',
  'Data Science',
  'Informatics Practices',
  'Physical Education',
  'Health & Physical Education',
  'Home Science',
  'Fine Arts',
  'Drawing',
  'Music',
  'Performing Arts',
  'Dance',
  'General Knowledge',
  'Current Affairs',
  'Moral Education',
  'Value Education',
  'Environmental Education',
];

export const TEACHER_PROFESSIONAL_SUBJECTS = [
  'General Teaching',
  'Child Development & Pedagogy',
  'Educational Psychology',
  'Teaching Aptitude',
  'Learning & Pedagogy',
  'Assessment & Evaluation',
  'Classroom Management',
  'Inclusive Education',
  'Educational Technology',
  'ICT in Education',
  'NEP 2020',
  'School Leadership',
  'Educational Administration',
  'Guidance & Counselling',
  'Research Methodology',
  'General Aptitude',
  'Reasoning',
  'Quantitative Aptitude',
  'Verbal Ability',
  'Communication Skills',
  'Computer Awareness',
];

export const VOCATIONAL_SKILLS_SUBJECTS = [
  'IT / ITES',
  'Retail',
  'Healthcare',
  'Agriculture',
  'Automotive',
  'Beauty & Wellness',
  'Tourism & Hospitality',
  'Banking & Financial Services',
  'Electronics',
  'Construction',
  'Apparel / Fashion',
  'Media & Entertainment',
  'Food Processing',
  'Plumbing',
  'Electrical',
  'Handicrafts',
  'Security',
  'Logistics',
  'Telecom',
];

export const TEACHER_SUBJECTS = [
  ...SCHOOL_ACADEMIC_SUBJECTS,
  ...TEACHER_PROFESSIONAL_SUBJECTS,
  ...VOCATIONAL_SKILLS_SUBJECTS,
];

export const CLASS_CATEGORIES = [
  'NUR to UKG',
  '1st to 5th',
  '6th to 8th',
  '9th to 12th',
  'All Classes / General',
] as const;

export type ClassCategory = typeof CLASS_CATEGORIES[number];

export const ASSESSMENT_TARGETS = [
  'NUR to UKG',
  '1st to 5th',
  '6th to 8th',
  '9th to 12th',
  'All Classes / General',
];

export const BOARDS_LIST = [
  'CBSE (India)',
  'NCERT',
  'ICSE',
  'NEP 2020 Framework',
  'State Board',
  'IB / Cambridge',
  'Universal Teacher Standards',
];

export const ASSESSMENT_PRESETS: AssessmentPreset[] = [
  // NUR to UKG (Foundational Stage)
  {
    id: 'tch_ecce_nur_ukg',
    name: 'Foundational Stage ECCE & Early Literacy Educator (NUR to UKG)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Early Childhood Education (ECCE)',
    classLevel: 'NUR to UKG',
    board: 'NEP 2020 Framework',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 },
    topics: [
      'Play-Based & Sensory Learning Pedagogies',
      'Phonemic Awareness & Pre-Reading Strategies',
      'Early Numeracy & Concrete Manipulatives',
      'Fine & Gross Motor Milestone Development',
      'Managing Separation Anxiety & Classroom Routines',
      'Continuous Formative Observation & Anecdotal Records',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates early childhood educators on play-based pedagogy, phonemic awareness, sensory learning, and developmental milestones for NUR to UKG.',
  },
  {
    id: 'tch_early_numeracy_nur_ukg',
    name: 'Early Numeracy & Foundational Math Teaching (NUR to UKG)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Mathematics',
    classLevel: 'NUR to UKG',
    board: 'NCERT',
    totalQuestions: 20,
    duration: 30,
    passScore: 70,
    difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 },
    topics: [
      'Number Sense & One-to-One Correspondence',
      'Concrete-to-Pictorial Transition with Blocks',
      'Spatial Reasoning, Shapes & Pattern Recognition',
      'Diagnosing Early Counting Misconceptions',
      'Math Talk & Rhyme-Integrated Counting',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Assesses foundational numeracy pedagogy, concrete manipulative usage, and counting misconception diagnosis for nursery and kindergarten.',
  },

  // 1st to 5th (Preparatory / Primary Stage)
  {
    id: 'tch_primary_math_1_5',
    name: 'Primary Mathematics Teacher Competency (1st to 5th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Mathematics',
    classLevel: '1st to 5th',
    board: 'CBSE (India)',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 25, Medium: 55, Hard: 20 },
    topics: [
      'CRA (Concrete-Representational-Abstract) Model',
      'Place Value & Regrouping Misconception Diagnosis',
      'Fraction Concept Building via Visual Models',
      'Word Problem Scaffolding & Mathematical Language',
      'Formative Math Diagnostic Assessments & Remediation',
      'FLN (Foundational Literacy & Numeracy) NIPUN Bharat',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates primary teachers on math concept pedagogy, place-value error diagnosis, fraction modeling, and CRA instructional sequencing.',
  },
  {
    id: 'tch_primary_evs_1_5',
    name: 'Primary Environmental Studies (EVS) Pedagogy (1st to 5th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Environmental Studies / EVS',
    classLevel: '1st to 5th',
    board: 'NCERT',
    totalQuestions: 20,
    duration: 30,
    passScore: 70,
    difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 },
    topics: [
      'Inquiry-Based Experiential Learning in EVS',
      'Connecting Classroom Concepts to Local Environment',
      'Scaffolding Observation, Classification & Inference Skills',
      'Addressing Children\'s Ecological & Scientific Misconceptions',
      'Integrated EVS & Language Storytelling Pedagogy',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Assesses primary EVS educators on inquiry-based learning, local ecological integration, and child observation skill development.',
  },
  {
    id: 'tch_primary_english_1_5',
    name: 'Primary English Language & Literacy Teaching (1st to 5th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'English',
    classLevel: '1st to 5th',
    board: 'CBSE (India)',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 25, Medium: 55, Hard: 20 },
    topics: [
      'Phonics, Sight Words & Guided Reading Pedagogy',
      'Bilingual Scaffolding for Second Language Learners',
      'Diagnosing Reading Fluency & Pronunciation Errors',
      'Early Sentence Construction & Graphic Organizers',
      'Interactive Read-Alouds & Vocabulary Acquisition',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates primary English teachers on reading fluency diagnostics, phonics progression, bilingual support, and vocabulary instruction.',
  },

  // 6th to 8th (Middle Stage)
  {
    id: 'tch_middle_science_6_8',
    name: 'Middle School Science Teacher Competency (6th to 8th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Science',
    classLevel: '6th to 8th',
    board: 'CBSE (India)',
    totalQuestions: 25,
    duration: 35,
    passScore: 75,
    difficultyDistribution: { Easy: 20, Medium: 55, Hard: 25 },
    topics: [
      'Inquiry & 5E Instructional Model in Middle Science',
      'Hands-on Lab Safety & Low-Cost Experiment Design',
      'Diagnosing Common Misconceptions (Electricity, Heat, Forces)',
      'Scaffolding the Scientific Method & Hypothesis Testing',
      'Formative Assessment via Concept Cartoons & Exit Tickets',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Assesses middle school science teachers on 5E instructional design, experimental safety, concept cartoon diagnostics, and scientific inquiry.',
  },
  {
    id: 'tch_middle_math_6_8',
    name: 'Middle School Mathematics Teacher Competency (6th to 8th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Mathematics',
    classLevel: '6th to 8th',
    board: 'CBSE (India)',
    totalQuestions: 25,
    duration: 35,
    passScore: 75,
    difficultyDistribution: { Easy: 20, Medium: 55, Hard: 25 },
    topics: [
      'Transition from Arithmetic to Algebraic Thinking',
      'Geometric Proofs & Visual Spatial Representations',
      'Diagnosing Negative Numbers & Rational Arithmetic Errors',
      'Proportional Reasoning & Real-World Application Problems',
      'Differentiating Instruction for Diverse Math Readiness',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Tests middle school math educators on algebraic transition pedagogy, geometric reasoning, and diagnosing rational number misconceptions.',
  },
  {
    id: 'tch_middle_sst_6_8',
    name: 'Middle School Social Science Teacher Competency (6th to 8th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Social Science',
    classLevel: '6th to 8th',
    board: 'NCERT',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 25, Medium: 55, Hard: 20 },
    topics: [
      'Historical Inquiry & Primary Source Analysis',
      'Geographical Map Skills & Spatial Data Pedagogy',
      'Democratic Values, Civics & Active Classroom Debates',
      'Multidisciplinary Projects & Local Heritage Studies',
      'Competency-Based Assessment Shifting Away from Rote Dates',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates middle social science teachers on source-based historical inquiry, map skills instruction, and competency-based assessment design.',
  },

  // 9th to 12th (Secondary & Senior Secondary Stage)
  {
    id: 'tch_secondary_physics_9_12',
    name: 'Secondary & Sr. Secondary Physics Teacher Competency (9th to 12th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Physics',
    classLevel: '9th to 12th',
    board: 'CBSE (India)',
    totalQuestions: 30,
    duration: 40,
    passScore: 75,
    difficultyDistribution: { Easy: 15, Medium: 55, Hard: 30 },
    topics: [
      'Advanced Mechanics, Electromagnetism & Optics Conceptual Depth',
      'Calculus-Based Derivation Pedagogy & Mathematical Rigor',
      'Resolving Deep-Seated Cognitive Misconceptions in Physics',
      'Senior Physics Lab Design, Error Analysis & Vernier/Screw Gauge',
      'Higher-Order Thinking (HOTS) & Competitive Exam Guidance',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates secondary physics educators on calculus-based conceptual clarity, error analysis pedagogy, and resolving cognitive barriers in mechanics.',
  },
  {
    id: 'tch_secondary_chemistry_9_12',
    name: 'Secondary & Sr. Secondary Chemistry Teacher Competency (9th to 12th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Chemistry',
    classLevel: '9th to 12th',
    board: 'CBSE (India)',
    totalQuestions: 30,
    duration: 40,
    passScore: 75,
    difficultyDistribution: { Easy: 15, Medium: 55, Hard: 30 },
    topics: [
      'Reaction Mechanism Pedagogy (Electrophilic, Nucleophilic, Redox)',
      'Thermodynamics, Equilibrium & Electrochemistry Problem Solving',
      'Chemical Bonding, Molecular Orbital & Hybridization Models',
      'Laboratory Safety, Titration Pedagogy & Salt Analysis Diagnostics',
      'Curriculum Alignment for Board Exams & NEET/JEE Foundation',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Tests senior chemistry teachers on reaction mechanism pedagogy, chemical equilibrium modeling, and titration error diagnosis.',
  },
  {
    id: 'tch_secondary_math_9_12',
    name: 'Secondary & Sr. Secondary Mathematics Teacher Competency (9th to 12th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Mathematics',
    classLevel: '9th to 12th',
    board: 'CBSE (India)',
    totalQuestions: 30,
    duration: 40,
    passScore: 75,
    difficultyDistribution: { Easy: 15, Medium: 55, Hard: 30 },
    topics: [
      'Calculus Pedagogy (Limits, Continuity, Differentiation, Integrals)',
      'Vectors, 3D Geometry & Linear Programming Modeling',
      'Probability Distributions & Combinatorial Proof Strategies',
      'Diagnosing Algebraic vs Analytical Cognitive Obstacles',
      'Designing Challenging Non-Routine & Multi-Concept Problems',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates senior math educators on calculus pedagogical progression, 3D visualization instruction, and non-routine problem design.',
  },
  {
    id: 'tch_secondary_biology_9_12',
    name: 'Secondary & Sr. Secondary Biology Teacher Competency (9th to 12th)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Biology',
    classLevel: '9th to 12th',
    board: 'CBSE (India)',
    totalQuestions: 30,
    duration: 40,
    passScore: 75,
    difficultyDistribution: { Easy: 15, Medium: 55, Hard: 30 },
    topics: [
      'Genetics, Molecular Biology & Recombinant DNA Technology',
      'Human Physiology & Plant Physiology Systemic Pedagogy',
      'Evolution, Ecology & Biodiversity Case Study Analysis',
      'Microscopy, Slide Preparation & Dissection Pedagogy',
      'Bioethics, Biotech Controversies & Critical Inquiry in Class',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Assesses senior biology teachers on genetics mechanisms, biotechnology ethics pedagogy, and experimental slide analysis instruction.',
  },

  // All Classes / General (Pedagogy, Policy, Special Needs, Management)
  {
    id: 'tch_universal_pedagogy_all',
    name: 'Universal Pedagogy, NEP 2020 & Learning Theories (All Classes / General)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'General Teaching',
    classLevel: 'All Classes / General',
    board: 'NEP 2020 Framework',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 25, Medium: 55, Hard: 20 },
    topics: [
      'NEP 2020 Pedagogical Shift & 5+3+3+4 Structure',
      'Piaget, Vygotsky & Bruner Constructivist Learning Frameworks',
      'Bloom\'s Revised Taxonomy & Higher-Order Questioning',
      'Formative Assessment for Learning vs Summative Assessment',
      'Differentiated Instruction & Universal Design for Learning (UDL)',
      'Teacher Professional Ethics, Reflection & Continuous CPD',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates foundational pedagogical principles, constructivist theories, Bloom’s taxonomy, and NEP 2020 institutional mandates for all teaching levels.',
  },
  {
    id: 'tch_classroom_management_all',
    name: 'Classroom Management, Behavior & Conflict Resolution (All Classes / General)',
    category: 'Core Teaching',
    mainCategory: 'TEACHER',
    subject: 'Classroom Management',
    classLevel: 'All Classes / General',
    board: 'Universal Teacher Standards',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 },
    topics: [
      'Proactive Classroom Culture & Norm Establishment',
      'Positive Behavioral Interventions & Supports (PBIS)',
      'De-escalation Strategies for Severe Disruptions',
      'Time Management, Pacing & Smooth Activity Transitions',
      'Parent-Teacher Communication in Difficult Scenarios',
      'Student Mental Health & Trauma-Informed Classroom Practices',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Assesses teacher classroom management competency, proactive behavior systems, conflict de-escalation, and restorative communication.',
  },
  {
    id: 'tch_inclusive_special_needs_all',
    name: 'Inclusive Education & Special Educational Needs (All Classes / General)',
    category: 'Inclusive Education',
    mainCategory: 'TEACHER',
    subject: 'Inclusive Education',
    classLevel: 'All Classes / General',
    board: 'Universal Teacher Standards',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 25, Medium: 55, Hard: 20 },
    topics: [
      'RPwD Act 2016 & RTE Legal Mandates for Inclusion',
      'Screening & Accommodating Learning Disabilities (Dyslexia, ADHD, Autism)',
      'Individualized Education Plans (IEP) Formulation & Review',
      'Assistive EdTech Tools & Universal Classroom Accommodations',
      'Sensory-Friendly Environment Design & Peer Sensitization',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Evaluates educator competency in inclusive pedagogy, RPwD Act compliance, IEP design, and accommodations for neurodivergent learners.',
  },
  {
    id: 'tch_assessment_evaluation_all',
    name: 'Assessment FOR Learning, Diagnostic Design & Rubrics (All Classes / General)',
    category: 'Assessment',
    mainCategory: 'TEACHER',
    subject: 'Assessment & Evaluation',
    classLevel: 'All Classes / General',
    board: 'CBSE (India)',
    totalQuestions: 25,
    duration: 35,
    passScore: 70,
    difficultyDistribution: { Easy: 25, Medium: 55, Hard: 20 },
    topics: [
      'Diagnostic Pre-Testing & Learning Gap Analysis',
      'Rubric Construction (Holistic vs Analytic Rubrics)',
      'Item Analysis (Discrimination Index & Difficulty Factor)',
      'Actionable Formative Feedback vs Grade Labeling',
      'Competency-Based Portfolio & Performance Assessments',
    ],
    language: 'English',
    questionType: 'Multiple Choice',
    description: 'Assesses teacher competency in designing diagnostic tests, constructing valid rubrics, analyzing item performance, and providing formative feedback.',
  },
];

export function getCurriculumTopics(subject: string, classLevel: string, board: string, variationIndex: number = 0): string[] {
  const normSub = (subject || '').toLowerCase().trim();
  const normCls = (classLevel || '').toLowerCase().trim();
  const idx = Math.abs(variationIndex || 0);

  // 1. NUR to UKG (Foundational Stage)
  if (normCls.includes('nur') || normCls.includes('ukg') || normCls.includes('foundational')) {
    if (normSub.includes('math') || normSub.includes('numeracy')) {
      return [
        'Number Sense, One-to-One Correspondence & Subitizing',
        'Concrete Manipulatives & Play-Based Math Discovery',
        'Pattern Recognition, Sorting & Spatial Vocabulary',
        'Diagnosing Early Counting & Cardinality Errors',
        'Mathematical Language & Rhyme Integration in Kindergarten',
      ];
    }
    if (normSub.includes('english') || normSub.includes('literacy') || normSub.includes('language')) {
      return [
        'Phonemic Awareness, Rhyming & Sound Discrimination',
        'Print Awareness, Book Handling & Storybook Pedagogy',
        'Oral Language Development & Expressive Vocabulary',
        'Pre-Writing Fine Motor Skills & Sensory Tracing',
        'Multisensory Phonics & Letter-Sound Association',
      ];
    }
    return [
      'Play-Based & Experiential Learning Methodologies',
      'Sensory Exploration & Gross/Fine Motor Milestones',
      'Socio-Emotional Development & Separation Anxiety Support',
      'Daily Classroom Routines & Positive Behavioral Modeling',
      'Anecdotal Observation & Early Portfolio Assessments',
    ];
  }

  // 2. 1st to 5th (Preparatory / Primary Stage)
  if (normCls.includes('1st') || normCls.includes('5th') || normCls.includes('primary')) {
    if (normSub.includes('math')) {
      return [
        'CRA (Concrete-Representational-Abstract) Instructional Framework',
        'Place Value, Regrouping & Multi-Digit Arithmetic Misconceptions',
        'Fraction Concept Building via Fraction Strips & Visual Models',
        'Word Problem Translation & Scaffolding Schema Techniques',
        'Diagnostic Pre-Testing & Remedial Small-Group Interventions',
      ];
    }
    if (normSub.includes('science') || normSub.includes('evs') || normSub.includes('environmental')) {
      return [
        'Inquiry-Based Experiential Pedagogy in Primary EVS',
        'Connecting Textbooks to Local Habitats & Flora/Fauna',
        'Scaffolding Observation, Classification & Scientific Inquiry',
        'Addressing Naive Science Misconceptions (States of Matter, Plants)',
        'Theme-Based Interdisciplinary Storytelling & Activities',
      ];
    }
    if (normSub.includes('english') || normSub.includes('language')) {
      return [
        'Phonics Progression, Sight Words & Guided Reading Strategies',
        'Bilingual Scaffolding for English Language Learners (ELL)',
        'Diagnosing Reading Fluency & Phonic Decoding Deficits',
        'Sentence Building, Graphic Organizers & Early Composition',
        'Formative Vocabulary Games & Interactive Read-Alouds',
      ];
    }
    return [
      'Foundational Literacy & Numeracy (FLN / NIPUN Bharat)',
      'Constructivist Primary Lesson Design & Active Learning',
      'Addressing Early Cognitive Misconceptions Across Subjects',
      'Continuous Classroom Observation & Formative Checkpoints',
      'Inclusive Scaffolding for Diverse Learning Paces',
    ];
  }

  // 3. 6th to 8th (Middle Stage)
  if (normCls.includes('6th') || normCls.includes('8th') || normCls.includes('middle')) {
    if (normSub.includes('math')) {
      return [
        'Transition from Arithmetic to Generalized Algebraic Thinking',
        'Geometric Proofs, Spatial Visualization & Construction Pedagogy',
        'Diagnosing Integers, Negative Numbers & Rational Arithmetic Errors',
        'Proportional Reasoning, Ratios & Percentage Applications',
        'Differentiated Problem-Solving for Mixed-Ability Classrooms',
      ];
    }
    if (normSub.includes('science')) {
      return [
        'Inquiry & 5E Instructional Model in Middle Science',
        'Low-Cost Lab Experimentation & Hands-on Science Safety',
        'Diagnosing Abstract Misconceptions (Forces, Electricity, Heat)',
        'Scientific Method Scaffolding: Hypotheses, Variables & Data',
        'Formative Diagnostics via Concept Cartoons & Exit Checks',
      ];
    }
    if (normSub.includes('social') || normSub.includes('history') || normSub.includes('geography')) {
      return [
        'Primary Source Analysis & Evidence-Based Historical Inquiry',
        'Geographical Map Skills, Spatial Topography & Data Modeling',
        'Active Democratic Deliberation, Civics Debates & Roleplays',
        'Multidisciplinary Projects & Local Cultural Heritage Studies',
        'Competency-Based Assessment Shifting from Rote Memorization',
      ];
    }
    return [
      'Inquiry-Based & Project-Based Middle Stage Pedagogy',
      'Adolescent Cognitive Development & Active Classroom Management',
      'Diagnosing Core Conceptual Misconceptions in Middle Curriculum',
      'Peer Collaboration, Socratic Questioning & Group Dynamics',
      'Formative Rubrics & Competency-Aligned Evaluation',
    ];
  }

  // 4. 9th to 12th (Secondary & Senior Secondary Stage)
  if (normCls.includes('9th') || normCls.includes('12th') || normCls.includes('secondary')) {
    if (normSub.includes('physic')) {
      return [
        'Calculus-Based Derivation Pedagogy & Conceptual Mechanics',
        'Electromagnetism, Optics & Modern Physics Advanced Models',
        'Resolving Deep-Seated Cognitive Misconceptions in Kinematics/Forces',
        'Senior Lab Setup, Error Analysis & Vernier/Oscilloscope Pedagogy',
        'High-Order Thinking Skills (HOTS) & Competitive Exam Scaffolding',
      ];
    }
    if (normSub.includes('chem')) {
      return [
        'Reaction Mechanisms Pedagogy (Electrophilic, Nucleophilic, Redox)',
        'Thermodynamics, Equilibrium & Electrochemistry Derivations',
        'Orbital Hybridization, Molecular Geometry & Coordination Chemistry',
        'Lab Safety, Titration Pedagogy & Qualitative Analysis Diagnostics',
        'Board Examination Rubrics & Conceptual Deepening Strategies',
      ];
    }
    if (normSub.includes('math')) {
      return [
        'Calculus Pedagogical Progression (Limits, Continuity, Integrals)',
        'Vectors, 3D Geometry & Spatial Visualization Techniques',
        'Combinatorics, Probability Distributions & Proof Methodologies',
        'Diagnosing Algebraic vs Analytical Cognitive Obstacles',
        'Designing Non-Routine & Multi-Concept Competitive Problems',
      ];
    }
    if (normSub.includes('bio')) {
      return [
        'Genetics, Molecular Biology & Genetic Engineering Pedagogy',
        'Human & Plant Physiology Systemic Conceptual Frameworks',
        'Ecology, Evolution & Bioethics Critical Inquiry in Class',
        'Microscopy, Biochemical Assays & Slide Preparation Diagnostics',
        'Addressing Misconceptions in Cell Division & Genetic Inheritance',
      ];
    }
    return [
      'Advanced Disciplinary Subject Mastery & Rigorous Pedagogy',
      'Higher-Order Thinking Skills (HOTS) & Analytical Problem Design',
      'Diagnosing Advanced Abstract Misconceptions & Cognitive Barriers',
      'Laboratory Experiment Design, Safety & Research Methodology',
      'Board & Competitive Exam Orientation with Conceptual Integrity',
    ];
  }

  // 5. All Classes / General
  if (normSub.includes('pedagogy') || normSub.includes('teaching') || normSub.includes('general')) {
    return [
      'NEP 2020 Pedagogical Vision & 5+3+3+4 Structural Paradigm',
      'Piaget, Vygotsky & Bruner Constructivist Learning Frameworks',
      'Bloom\'s Revised Taxonomy & Higher-Order Question Design',
      'Formative Assessment for Learning vs Summative Evaluation',
      'Universal Design for Learning (UDL) & Differentiated Instruction',
      'Teacher Professional Ethics, Reflective Practice & Continuous CPD',
    ];
  }

  if (normSub.includes('management')) {
    return [
      'Proactive Classroom Culture & Clear Behavioral Norms',
      'Positive Behavioral Interventions & Supports (PBIS)',
      'Conflict De-escalation & Restorative Classroom Practices',
      'Instructional Pacing, Time Management & Smooth Transitions',
      'Parent-Teacher Communication & Behavior Intervention Plans',
    ];
  }

  if (normSub.includes('inclusive') || normSub.includes('special')) {
    return [
      'RPwD Act 2016 & RTE Mandates for Universal Inclusion',
      'Screening & Accommodations for Learning Disabilities (Dyslexia, ADHD)',
      'Individualized Education Plans (IEP) Formulation & Monitoring',
      'Assistive EdTech Tools & Multisensory Adaptations',
      'Sensory-Friendly Classroom Design & Peer Sensitization',
    ];
  }

  if (normSub.includes('assessment') || normSub.includes('evaluation')) {
    return [
      'Diagnostic Pre-Testing & Targeted Learning Gap Analysis',
      'Rubric Construction (Holistic vs Analytic Scoring Guides)',
      'Item Analysis: Discrimination Index & Difficulty Coefficients',
      'Constructive Formative Feedback Strategies vs Grade Labelling',
      'Competency-Based Portfolio & Performance Evaluation Systems',
    ];
  }

  const dynamicSubjectTitle = subject.trim() || 'Discipline';
  return [
    `Foundations & Conceptual Depth of ${dynamicSubjectTitle}`,
    `Pedagogical Content Knowledge & Instructional Strategies`,
    `Diagnosing Student Misconceptions in ${dynamicSubjectTitle}`,
    `Competency-Based Assessment & Higher-Order Problem Design`,
    `Classroom Scenarios, Differentiated Instruction & NEP 2020 Alignment`,
  ];
}

export function suggestAssessmentTitle(subject: string, classLevel: string, board: string): string {
  const sub = subject.trim() || 'General Pedagogy';
  const cls = classLevel.trim() && classLevel !== 'All Classes / General' ? ` (${classLevel})` : '';
  const brd = board.trim() && board !== 'General' && board !== 'Universal Teacher Standards' ? ` [${board}]` : '';

  return `${sub} Teacher Competency & Eligibility Assessment${cls}${brd}`;
}

export function regenerateAlternativeTitles(subject: string, classLevel: string, board: string): string[] {
  const sub = subject.trim() || 'Subject';
  const cls = classLevel.trim() ? ` — ${classLevel}` : '';

  return [
    `${sub} Teacher Competency & Eligibility Assessment${cls}`,
    `${sub} Pedagogical Mastery & Subject Knowledge Evaluation${cls}`,
    `Professional Educator Certification: ${sub}${cls}`,
    `${sub} Classroom Decision-Making & Diagnostic Assessment${cls}`,
    `${sub} Teaching Eligibility Benchmark${cls}`,
  ];
}

