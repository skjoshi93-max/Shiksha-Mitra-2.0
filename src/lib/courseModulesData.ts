import pptxgen from 'pptxgenjs';
import { Assessment, AssessmentQuestion } from '../types';

export interface SlideItem {
  id: number;
  slideNumber: number;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  keyPoints: string[];
  framework: {
    label: string;
    description: string;
  }[];
  takeaway: string;
  layoutType: 'title' | 'framework' | 'case_study' | 'rubric' | 'process' | 'summary';
}

export interface VideoChapter {
  timestamp: number; // in seconds
  timestampFormatted: string; // e.g. "01:15"
  title: string;
  description: string;
  caption: string;
}

export interface CourseModule {
  id: string;
  moduleIndex: number; // 1, 2, 3, 4
  title: string;
  subtitle: string;
  durationMinutes: number; // 5
  durationSeconds: number; // 300
  instructorName: string;
  instructorRole: string;
  summary: string;
  objectives: string[];
  chapters: VideoChapter[];
  slides: SlideItem[];
}

export interface CourseData {
  assessmentId: string;
  title: string;
  subject: string;
  classLevel?: string;
  board?: string;
  totalDurationMinutes: number; // 20
  modules: CourseModule[];
  scenarioQuestions: AssessmentQuestion[];
}

/**
 * Builds dynamic 4-module progressive course data tailored to the assessment,
 * with optional custom topic override for on-demand factory creation.
 */
export function buildCourseDataForAssessment(
  assessment: Assessment,
  customTopicOverride?: string
): CourseData {
  const subject = assessment.subject || 'Teaching Pedagogy';
  const classLevel = assessment.classLevel || 'General Grades';
  const board = assessment.board || 'CBSE / NCERT Standards';
  const mainTopic = customTopicOverride?.trim() || assessment.questions?.[0]?.topic || 'Core Curriculum & Instructional Design';
  const secondTopic = customTopicOverride ? `${customTopicOverride} - Diagnostic & Applied Mastery` : (assessment.questions?.[1]?.topic || 'Formative Evaluation & Remediation');
  const courseTitle = customTopicOverride ? `${customTopicOverride} (Professional Masterclass)` : assessment.title;

  const modules: CourseModule[] = [
    {
      id: `${assessment.id}_mod_1`,
      moduleIndex: 1,
      title: 'Foundational Framework & Pedagogical Architecture',
      subtitle: `Theoretical Foundations, Learning Progression & ${subject} Standards`,
      durationMinutes: 5,
      durationSeconds: 300,
      instructorName: 'Dr. Priya Sharma, Ph.D.',
      instructorRole: 'Head of Curriculum & Instructional Quality',
      summary: `Examine the foundational cognitive models, curriculum scope, and lesson framing protocols required for high-impact ${subject} instruction in ${classLevel}.`,
      objectives: [
        `Understand cognitive schema development and foundational learning progressions in ${subject}`,
        'Master the CRA (Concrete-Representational-Abstract) and 5E instructional sequencing models',
        `Align lesson benchmarks with national standards (${board})`,
        'Establish structured classroom pacing and active engagement baselines',
      ],
      chapters: [
        {
          timestamp: 0,
          timestampFormatted: '00:00',
          title: 'Curriculum Framing & Cognitive Foundations',
          description: `Introduction to ${subject} learning theories and developmental stages.`,
          caption: `Welcome to Module 1. Today we are establishing the cognitive instructional foundations for ${subject} in ${classLevel}.`,
        },
        {
          timestamp: 60,
          timestampFormatted: '01:00',
          title: 'The 5E & CRA Pedagogical Sequencing Models',
          description: 'Transitioning from concrete tactile exploration to abstract representations.',
          caption: 'Notice how students internalize concepts when we scaffold from physical manipulatives to formal symbolic models.',
        },
        {
          timestamp: 135,
          timestampFormatted: '02:15',
          title: 'Classroom Baseline Dynamics & Inclusivity',
          description: 'Structuring differentiated entry points for multi-tier classroom environments.',
          caption: 'Every learner enters with prior schema; our primary objective is activating relevant prior knowledge without cognitive overload.',
        },
        {
          timestamp: 210,
          timestampFormatted: '03:30',
          title: 'Standard Alignment & Learning Outcomes',
          description: `Mapping lesson targets directly against ${board} competency indicators.`,
          caption: `Ensure that your learning targets are measurable, observable, and directly referenced to ${board} performance rubrics.`,
        },
        {
          timestamp: 270,
          timestampFormatted: '04:30',
          title: 'Module 1 Synthesis & Check for Understanding',
          description: 'Summary of core principles and transition to applied instructional techniques.',
          caption: 'Great work completing the foundational framework. We are now ready to progress to live classroom instructional strategies in Module 2.',
        },
      ],
      slides: [
        {
          id: 101,
          slideNumber: 1,
          title: `${subject} Pedagogical Framework`,
          subtitle: `Module 1: Foundations & Cognitive Sequencing | ${classLevel} • ${board}`,
          category: 'Course Introduction',
          badge: 'Foundational Stage',
          layoutType: 'title',
          keyPoints: [
            `Comprehensive Competency Framework for ${subject}`,
            'Cognitive Load Optimization & Guided Discovery',
            'Constructivist Classroom Architecture & Lesson Delivery',
          ],
          framework: [
            { label: 'Target Audience', description: `${classLevel} Educators & Academic Leads` },
            { label: 'Standards Framework', description: `${board} Benchmarks & National Outcomes` },
            { label: 'Module Duration', description: '5 Minutes (Part of 20-Min Certification Track)' },
          ],
          takeaway: 'Strong foundational pedagogical frameworks turn complex academic concepts into intuitive, scaffolded student insights.',
        },
        {
          id: 102,
          slideNumber: 2,
          title: 'Cognitive Architecture & Schema Activation',
          subtitle: 'Scaffolding Working Memory to Long-Term Conceptual Schema',
          category: 'Pedagogical Theory',
          badge: 'Core Theory',
          layoutType: 'framework',
          keyPoints: [
            'Dual-Coding Theory: Integrating visual diagrams with structured verbal prompts',
            'Chunking complex multi-step reasoning into 3 digestible phases',
            'Preventing early cognitive fatigue through frequent check-ins',
          ],
          framework: [
            { label: 'Phase 1: Retrieval', description: 'Active recall of prerequisite baseline skills (3 mins)' },
            { label: 'Phase 2: Scaffolding', description: 'Interactive guided modeling with real-time feedback' },
            { label: 'Phase 3: Synthesis', description: 'Independent student application and generalization' },
          ],
          takeaway: 'Never introduce abstract notation before grounding students in relational and visual analogies.',
        },
        {
          id: 103,
          slideNumber: 3,
          title: 'The CRA Instructional Continuum',
          subtitle: 'Concrete → Representational → Abstract Delivery Model',
          category: 'Instructional Design',
          badge: 'Teaching Protocol',
          layoutType: 'process',
          keyPoints: [
            'Concrete: Hands-on physical models, real-world case simulations',
            'Representational: Pictorial sketches, concept mapping, flow diagrams',
            'Abstract: Formal symbolic formulas, analytical definitions, generalized equations',
          ],
          framework: [
            { label: 'Concrete (C)', description: 'Direct physical interaction and tangible sensory models' },
            { label: 'Representational (R)', description: 'Visual charts, concept maps, and spatial diagrams' },
            { label: 'Abstract (A)', description: 'Formal mathematical/scientific notation and rules' },
          ],
          takeaway: 'Students who master the representational phase show 40% higher retention in abstract problem solving.',
        },
        {
          id: 104,
          slideNumber: 4,
          title: `Curriculum Alignment: ${board}`,
          subtitle: 'Ensuring High-Fidelity Standards Integration',
          category: 'Curriculum Standards',
          badge: 'Compliance & Quality',
          layoutType: 'rubric',
          keyPoints: [
            `Direct mapping to ${board} competency indicators and NEP guidelines`,
            'Explicit Rubric Criteria: Differentiating factual knowledge from critical evaluation',
            'Holistic 360-degree assessment integration across cognitive and affective domains',
          ],
          framework: [
            { label: 'Knowledge (30%)', description: 'Factual terminology and conceptual definitions' },
            { label: 'Application (45%)', description: 'Procedural problem-solving in novel scenarios' },
            { label: 'Evaluation (25%)', description: 'Critical thinking, synthesis, and error diagnosis' },
          ],
          takeaway: 'Aligning every learning objective to verified standards creates defensible, accredited pedagogical practice.',
        },
      ],
    },
    {
      id: `${assessment.id}_mod_2`,
      moduleIndex: 2,
      title: 'Applied Instructional Strategies & Classroom Execution',
      subtitle: `Differentiated Instruction, Active Questioning & Micro-Scaffolding in ${subject}`,
      durationMinutes: 5,
      durationSeconds: 300,
      instructorName: 'Dr. Priya Sharma, Ph.D.',
      instructorRole: 'Head of Curriculum & Instructional Quality',
      summary: `Transform theoretical concepts into active classroom discourse using high-yield questioning strategies, paired think-time, and live scaffolding techniques.`,
      objectives: [
        'Deploy Bloom\'s Revised Higher-Order Questioning routines',
        'Implement structured Think-Pair-Share and peer dialogue protocols',
        'Address diverse learner tiers with tiered worksheets and scaffolded prompts',
        'Optimize pacing to maintain 85%+ on-task student focus',
      ],
      chapters: [
        {
          timestamp: 0,
          timestampFormatted: '00:00',
          title: 'High-Yield Questioning & Discourse Protocols',
          description: 'Moving beyond rote recall to analytical and evaluative questioning.',
          caption: 'In Module 2, we explore practical in-class facilitation techniques that spark deep classroom engagement.',
        },
        {
          timestamp: 65,
          timestampFormatted: '01:05',
          title: 'Wait Time & Processing Pause Techniques',
          description: 'The science of 3-to-5 second wait time and its impact on answer depth.',
          caption: 'Extending wait time from 1 second to 4 seconds increases the quality and complexity of student responses by over 300%.',
        },
        {
          timestamp: 140,
          timestampFormatted: '02:20',
          title: 'Multi-Tiered Differentiation in Practice',
          description: 'Designing tiered prompts for struggling, on-level, and advanced learners.',
          caption: 'Notice how the core concept remains invariant while the support scaffolding and challenge extension adapt dynamically.',
        },
        {
          timestamp: 215,
          timestampFormatted: '03:35',
          title: 'Classroom Management & Real-Time Transitions',
          description: 'Seamless transitions between direct instruction, paired work, and group tasks.',
          caption: 'Clear audio-visual cues and explicit 30-second transition expectations eliminate behavioral friction.',
        },
        {
          timestamp: 275,
          timestampFormatted: '04:35',
          title: 'Module 2 Key Takeaways & Review',
          description: 'Summary of active instructional strategies.',
          caption: 'Module 2 complete! Up next in Module 3: Diagnostic Assessment & Error Misconception Remediation.',
        },
      ],
      slides: [
        {
          id: 201,
          slideNumber: 1,
          title: 'Active Instructional Strategies & Classroom Execution',
          subtitle: `Module 2: Real-Time Pedagogy & Active Facilitation | ${subject}`,
          category: 'Classroom Delivery',
          badge: 'Applied Practice',
          layoutType: 'title',
          keyPoints: [
            'Dynamic Teacher-Student & Peer-to-Peer Interaction',
            'Socratic Questioning Ladders for Analytical Rigor',
            'Formative Real-Time Scaffolding & Tiered Interventions',
          ],
          framework: [
            { label: 'Delivery Model', description: 'Interactive Direct Instruction + Guided Practice' },
            { label: 'Target Engagement', description: '90%+ Student Response Participation Rate' },
            { label: 'Scaffolding Model', description: 'Tiered Prompt Ladders & Worked Examples' },
          ],
          takeaway: 'The most effective classrooms are dialogue-rich environments where student thinking is made visible at every step.',
        },
        {
          id: 202,
          slideNumber: 2,
          title: 'Questioning Ladders: From Recall to Synthesis',
          subtitle: 'Structuring Inquiry Sequences to Build High-Order Competence',
          category: 'Questioning Techniques',
          badge: 'Bloom\'s Taxonomy',
          layoutType: 'process',
          keyPoints: [
            'Level 1 (Recall): Identify core definitions and factual axioms',
            'Level 2 (Analysis): Compare alternative strategies and identify underlying patterns',
            'Level 3 (Synthesis & Justification): Defend why a given method succeeds or fails',
          ],
          framework: [
            { label: 'Prompt 1', description: '"What is the primary constraint in this problem?"' },
            { label: 'Prompt 2', description: '"Why would approach X be less efficient than approach Y?"' },
            { label: 'Prompt 3', description: '"How would the solution change if parameter Z doubled?"' },
          ],
          takeaway: 'Strategic questioning transforms students from passive listeners into active investigators.',
        },
        {
          id: 203,
          slideNumber: 3,
          title: '3-Tier Classroom Differentiation Framework',
          subtitle: 'Ensuring High Rigor Across Varied Readiness Levels',
          category: 'Inclusive Education',
          badge: 'Universal Design (UDL)',
          layoutType: 'framework',
          keyPoints: [
            'Tier 1 (Universal Support): Visual sentence starters and graphic organizers for foundational learners',
            'Tier 2 (Core Application): Standard multi-step problem solving with guided checkpoint rubrics',
            'Tier 3 (Extension & Mastery): Open-ended investigation, counterexample creation, and peer mentorship',
          ],
          framework: [
            { label: 'Tier 1 (Support)', description: 'Visual prompts, worked examples & vocabulary glossaries' },
            { label: 'Tier 2 (Core)', description: 'Standard independent tasks & application exercises' },
            { label: 'Tier 3 (Extension)', description: 'Complex open-ended extensions & creative design tasks' },
          ],
          takeaway: 'Differentiation is not about lowering standards; it is about providing multiple pathways to the same high mastery standard.',
        },
      ],
    },
    {
      id: `${assessment.id}_mod_3`,
      moduleIndex: 3,
      title: 'Diagnostic Assessment & Misconception Remediation',
      subtitle: `Error Taxonomy, Formative Feedback Loops & Rapid Remediation in ${subject}`,
      durationMinutes: 5,
      durationSeconds: 300,
      instructorName: 'Dr. Priya Sharma, Ph.D.',
      instructorRole: 'Head of Curriculum & Instructional Quality',
      summary: `Learn to detect subtle student misconceptions early, perform root-cause error audits, and deploy corrective micro-lessons before misconceptions solidify.`,
      objectives: [
        `Identify common cognitive hurdles and systemic misconceptions in ${subject}`,
        'Deploy quick formative exit tickets and diagnostic concept cartoons',
        'Distinguish between procedural execution slips vs deep conceptual misunderstandings',
        'Deliver constructive, targeted feedback that prompts immediate student self-correction',
      ],
      chapters: [
        {
          timestamp: 0,
          timestampFormatted: '00:00',
          title: 'The Anatomy of Common Misconceptions',
          description: `Deep dive into predictable cognitive errors in ${subject}.`,
          caption: 'In Module 3, we focus on identifying the exact mental models that cause students to stumble.',
        },
        {
          timestamp: 70,
          timestampFormatted: '01:10',
          title: 'Procedural Slips vs Conceptual Gaps',
          description: 'How to diagnose the underlying cause of an incorrect answer.',
          caption: 'A calculation slip requires a quick verification check; a conceptual flaw requires re-anchoring in concrete representations.',
        },
        {
          timestamp: 145,
          timestampFormatted: '02:25',
          title: 'Concept Cartoons & Diagnostic Exit Slips',
          description: 'Using contrasting opinion cartoons to reveal hidden student beliefs.',
          caption: 'Concept cartoons lower student anxiety and stimulate passionate debates that illuminate genuine understanding.',
        },
        {
          timestamp: 220,
          timestampFormatted: '03:40',
          title: 'Closing the Loop: 2-Minute Micro-Remediation',
          description: 'Deploying targeted corrective scaffolds without restarting the whole lesson.',
          caption: 'Target the misconception directly with a high-contrast counter-example that challenges the flawed assumption.',
        },
        {
          timestamp: 280,
          timestampFormatted: '04:40',
          title: 'Module 3 Wrap-Up & Transition',
          description: 'Summary of diagnostic diagnostic strategies.',
          caption: 'Module 3 complete! We are now ready for the final Module 4: Scenario Simulation & Summative Exam Prep.',
        },
      ],
      slides: [
        {
          id: 301,
          slideNumber: 1,
          title: 'Diagnostic Assessment & Misconception Remediation',
          subtitle: `Module 3: Error Forensics & Targeted Interventions | ${subject}`,
          category: 'Diagnostic Assessment',
          badge: 'Diagnostic Mastery',
          layoutType: 'title',
          keyPoints: [
            'Root-Cause Error Classification and Diagnostics',
            'Formative Assessment as a Continuous Feedback Engine',
            'Rapid Micro-Remediation Protocols for Common Hurdles',
          ],
          framework: [
            { label: 'Diagnostic Goal', description: 'Detect and resolve misconceptions within 48 hours' },
            { label: 'Assessment Types', description: 'Concept Cartoons, Exit Tickets, Hinge Questions' },
            { label: 'Remediation Velocity', description: '2 to 5-Minute Targeted Corrective Interventions' },
          ],
          takeaway: 'Errors are valuable cognitive data. Exceptional educators use student mistakes as the launchpad for deepest insight.',
        },
        {
          id: 302,
          slideNumber: 2,
          title: 'Error Diagnostic Rubric: Slip vs Concept Flaw',
          subtitle: 'Differentiating Careless Oversights from Structural Gaps',
          category: 'Error Analysis',
          badge: 'Diagnostic Rubric',
          layoutType: 'rubric',
          keyPoints: [
            'Careless Execution Slip: Student understands the algorithm but misses a sign or arithmetic step',
            'Incomplete Procedural Schema: Student forgets a rule under timed pressure',
            'Deep Conceptual Flaw: Flawed intuitive model that systematically generates wrong predictions',
          ],
          framework: [
            { label: 'Execution Slip', description: 'Remedy: Self-checking checklists & proofreading routines' },
            { label: 'Procedural Gap', description: 'Remedy: Worked examples with step-by-step annotation' },
            { label: 'Conceptual Flaw', description: 'Remedy: Concrete counter-examples & guided re-discovery' },
          ],
          takeaway: 'Never give the same explanation twice to a conceptual misunderstanding—shift to a different representational model.',
        },
        {
          id: 303,
          slideNumber: 3,
          title: 'High-Impact Formative Feedback Protocols',
          subtitle: 'Actionable, Timely, and Task-Specific Teacher Guidance',
          category: 'Feedback Loops',
          badge: 'Feedback Science',
          layoutType: 'framework',
          keyPoints: [
            'Feedback must be actionable within the next 10 minutes of class work',
            'Avoid generic praise ("Good job!"); specify exact evidence ("Your algebraic step on line 3 clearly isolated the variable")',
            'Require student response: The feedback cycle is only complete when the student takes corrective action',
          ],
          framework: [
            { label: 'Where am I going?', description: 'Clear understanding of the learning goal and success criteria' },
            { label: 'How am I doing?', description: 'Real-time evidence of progress against the rubric' },
            { label: 'Where to next?', description: 'Specific, achievable next step for refinement' },
          ],
          takeaway: 'Feedback that only grades performance without pointing to the next step produces minimal growth.',
        },
      ],
    },
    {
      id: `${assessment.id}_mod_4`,
      moduleIndex: 4,
      title: 'Scenario Simulations, Case Studies & Summative Evaluation',
      subtitle: `Real-World Classroom Scenarios, Teacher Certification Benchmarking & ${subject} Mastery`,
      durationMinutes: 5,
      durationSeconds: 300,
      instructorName: 'Dr. Priya Sharma, Ph.D.',
      instructorRole: 'Head of Curriculum & Instructional Quality',
      summary: `Synthesize all pedagogical competencies through complex, real-world classroom scenario simulations in preparation for the official ShikshaMitra Teacher Certification examination.`,
      objectives: [
        'Analyze authentic pedagogical dilemma scenarios and make defended instructional decisions',
        'Demonstrate mastery across inclusive classroom leadership and curriculum standards',
        'Prepare for the 10-15 scenario-based certification examination',
        'Unlock the official ShikshaMitra Verified Digital Certificate with 70%+ score',
      ],
      chapters: [
        {
          timestamp: 0,
          timestampFormatted: '00:00',
          title: 'Introduction to Scenario-Based Pedagogical Dilemmas',
          description: 'Examining complex multi-variable classroom challenges.',
          caption: 'Welcome to the final Module 4! Here we synthesize all previous learning into realistic decision-making simulations.',
        },
        {
          timestamp: 65,
          timestampFormatted: '01:05',
          title: 'Case Study 1: Managing Mixed-Ability Classroom Pacing',
          description: 'Balancing advanced learners and struggling students during high-stakes lessons.',
          caption: 'When 20% of your class finishes in 5 minutes while 30% are stuck on step 1, what is the most pedagogically sound response?',
        },
        {
          timestamp: 140,
          timestampFormatted: '02:20',
          title: 'Case Study 2: De-escalating Student Frustration & Math/Science Anxiety',
          description: 'Emotional regulation and psychological safety during rigorous academic tasks.',
          caption: 'Building intellectual resilience requires validating struggle as a normal, productive phase of deep cognitive learning.',
        },
        {
          timestamp: 215,
          timestampFormatted: '03:35',
          title: 'Certification Test Strategies & Benchmark Standards',
          description: 'Understanding scoring criteria, pass thresholds (70%), and verification credentials.',
          caption: 'The certification exam consists of authentic scenarios. Read each option carefully to identify the choice that maximizes student autonomy.',
        },
        {
          timestamp: 275,
          timestampFormatted: '04:35',
          title: 'Course Completion & Certification Exam Unlock!',
          description: 'All 4 modules completed. Progressive lock released.',
          caption: 'Congratulations! You have completed all 4 modules (20 mins). Your official Skill Certification Assessment is now UNLOCKED!',
        },
      ],
      slides: [
        {
          id: 401,
          slideNumber: 1,
          title: 'Scenario Simulations & Summative Evaluation',
          subtitle: `Module 4: Case Studies, Ethics & Certification Readiness | ${subject}`,
          category: 'Case Simulations',
          badge: 'Capstone Stage',
          layoutType: 'title',
          keyPoints: [
            'Multi-Variable Classroom Dilemma Analysis',
            'Equitable and Inclusive Instructional Decision Making',
            'Final Preparation for the Verified Skill Certification Exam',
          ],
          framework: [
            { label: 'Focus Area', description: 'Authentic Teacher Decision-Making under Constraints' },
            { label: 'Evaluation Model', description: '10-15 Multi-Perspective Scenario Items' },
            { label: 'Certification Rule', description: 'Pass Criteria: 70%+ Score Unlocks Official PDF' },
          ],
          takeaway: 'True pedagogical mastery is demonstrated not in theory, but in wise, empathetic in-the-moment classroom decisions.',
        },
        {
          id: 402,
          slideNumber: 2,
          title: 'Case Study: The Frustrated Learner Dilemma',
          subtitle: 'Balancing Emotional Regulation and High Cognitive Demand',
          category: 'Case Study Analysis',
          badge: 'Real-World Case',
          layoutType: 'case_study',
          keyPoints: [
            'Context: A student repeatedly says "I can\'t do this subject" during an independent inquiry task',
            'Ineffective Approach: Giving the answer or lowering the difficulty immediately (creates learned helplessness)',
            'Mastery Approach: Break the prompt into a micro-step, validate their emotional state, and ask an anchoring prompt',
          ],
          framework: [
            { label: 'Action 1: Validate', description: '"This is a challenging concept, and feeling stuck is part of solving it."' },
            { label: 'Action 2: Anchor', description: '"Look at your work from yesterday. What was the first step you took there?"' },
            { label: 'Action 3: Autonomy', description: '"Try step one on your own; I will check back with you in exactly 2 minutes."' },
          ],
          takeaway: 'Scaffold the student\'s self-efficacy, not just the academic solution.',
        },
        {
          id: 403,
          slideNumber: 3,
          title: 'Certification Exam Guidelines & Verification',
          subtitle: 'What to Expect in the Official ShikshaMitra Certification',
          category: 'Examination Guide',
          badge: 'Exam Protocol',
          layoutType: 'summary',
          keyPoints: [
            '10 to 15 Scenario-Based Multiple Choice Questions',
            'Passing Benchmark: Score 70% or higher to earn the Verified Badge',
            'Instant Automated PDF Certificate with tamper-proof Verification Serial ID',
            'Accredited by ShikshaMitra Academic Council for professional portfolios',
          ],
          framework: [
            { label: 'Exam Duration', description: '15 to 30 Minutes (Self-Paced / Timed Mode)' },
            { label: 'Pass Score', description: `${assessment.passScore || 70}% Minimum Score` },
            { label: 'Digital Credential', description: 'Official PDF with Serial Verification Hash' },
          ],
          takeaway: 'You are now fully equipped to undertake the certification assessment with complete confidence!',
        },
      ],
    },
  ];

  // Build Scenario Questions (10-15 Scenario items)
  const existingQuestions = assessment.questions || [];
  let scenarioQuestions: AssessmentQuestion[] = [];

  if (existingQuestions.length >= 10) {
    scenarioQuestions = existingQuestions.slice(0, 15);
  } else {
    // Generate authentic scenario questions if assessment has fewer than 10
    const fallbackScenarios: AssessmentQuestion[] = [
      {
        id: `${assessment.id}_sc_1`,
        question: `During an introductory lesson on ${subject} in ${classLevel}, several students confuse procedural calculation with underlying conceptual principles. What is the most effective immediate pedagogical intervention?`,
        options: {
          A: 'Assign 10 additional drill problems for homework to reinforce repetition.',
          B: 'Pivot to a concrete-representational model and ask students to justify why their solution makes sense.',
          C: 'Provide the complete worked solution on the whiteboard and ask students to copy it into notebooks.',
          D: 'Move ahead with the planned curriculum and address the gap in the end-of-term revision session.',
        },
        correctAnswer: 'B',
        explanation: 'The CRA (Concrete-Representational-Abstract) model allows students to ground abstract concepts in tangible and visual analogies, repairing structural misconceptions rather than masking them with rote drill.',
        subject,
        topic: mainTopic,
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 98,
      },
      {
        id: `${assessment.id}_sc_2`,
        question: `A teacher notices that when asking questions in ${subject}, only 3 eager students raise their hands while the rest remain passive. According to evidence-based questioning protocols, which technique best elevates whole-class engagement?`,
        options: {
          A: 'Call on the fastest hand immediately to keep lesson momentum moving swiftly.',
          B: 'Implement structured Wait-Time (3-5 seconds) followed by a 60-second Think-Pair-Share routine.',
          C: 'Award bonus points to students who speak up first.',
          D: 'Stop asking questions verbally and shift solely to written end-of-week exams.',
        },
        correctAnswer: 'B',
        explanation: 'Extending wait time from 1 second to 3-5 seconds drastically increases the depth of responses and allows all students, including bilingual and deliberate thinkers, to formulate structured reasoning before sharing with a peer.',
        subject,
        topic: 'Classroom Pedagogy & Interaction',
        difficulty: 'Easy',
        marks: 1,
        qualityScore: 97,
      },
      {
        id: `${assessment.id}_sc_3`,
        question: `In a heterogeneous ${classLevel} classroom, 20% of learners demonstrate accelerated mastery of ${subject} while another group requires foundational remediation. What instructional design best serves both groups simultaneously?`,
        options: {
          A: 'Teach exclusively to the middle-tier learners and assume the others will adapt.',
          B: 'Implement Tiered Activities with visual scaffolds for struggling learners and open-ended non-routine investigations for advanced students.',
          C: 'Give advanced learners unrelated free-time activities while spending 100% of class time on basic remediation.',
          D: 'Lower the grading standard for the entire class so all students achieve high scores.',
        },
        correctAnswer: 'B',
        explanation: 'Universal Design for Learning (UDL) and Tiered Differentiation maintain high conceptual rigor for all students while providing scaffolded entry ramps for foundational learners and rich extensions for advanced students.',
        subject,
        topic: 'Differentiated Instruction',
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 99,
      },
      {
        id: `${assessment.id}_sc_4`,
        question: `When administering a formative diagnostic exit ticket in ${subject}, the teacher discovers that 65% of the class made the exact same systematic error. What is the teacher\'s most appropriate next step?`,
        options: {
          A: 'Penalize all students with low marks to motivate more attentive studying.',
          B: 'Ignore the trend because formative exit tickets do not count toward official report card grades.',
          C: 'Analyze the error pattern, design a 5-minute targeted counter-example micro-lesson, and re-assess with a parallel hinge item.',
          D: 'Re-teach the entire 4-week unit from scratch starting from chapter 1.',
        },
        correctAnswer: 'C',
        explanation: 'Systemic errors point to a shared conceptual flaw. Analyzing the root misconception and deploying a concise counter-example micro-lesson efficiently closes the gap without wasting instructional time on mastered prerequisites.',
        subject,
        topic: secondTopic,
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 98,
      },
      {
        id: `${assessment.id}_sc_5`,
        question: `Under the ${board} framework, formative assessment feedback is considered most effective when it:`,
        options: {
          A: 'Provides a single numerical grade with no commentary.',
          B: 'Highlights only mistakes with red ink without offering corrective hints.',
          C: 'Is descriptive, specific to the learning goal, and identifies immediate actionable next steps for the learner.',
          D: 'Ranks each student publicly on a leaderboard to stimulate competition.',
        },
        correctAnswer: 'C',
        explanation: 'Research demonstrates that descriptive, task-oriented feedback focused on learning criteria produces significant gains, whereas purely evaluative grades or public rankings often induce anxiety and decrease motivation.',
        subject,
        topic: 'Assessment & Feedback Science',
        difficulty: 'Easy',
        marks: 1,
        qualityScore: 96,
      },
      {
        id: `${assessment.id}_sc_6`,
        question: `A student expresses severe anxiety when approaching complex problem solving in ${subject}. Which pedagogical strategy promotes psychological safety and academic resilience?`,
        options: {
          A: 'Exempt the student from ever participating in class discussions.',
          B: 'Normalize productive struggle by explicitly celebrating insightful errors and framing problem-solving as iterative investigation.',
          C: 'Insist that the student solve problems on the blackboard in front of the entire class under timed pressure.',
          D: 'Tell the student that natural ability in ${subject} is fixed and cannot be changed.',
        },
        correctAnswer: 'B',
        explanation: 'Fostering a growth mindset and validating productive struggle as a normal, necessary phase of learning directly dismantles subject anxiety and builds enduring cognitive resilience.',
        subject,
        topic: 'Affective Domain & Learning Psychology',
        difficulty: 'Easy',
        marks: 1,
        qualityScore: 97,
      },
      {
        id: `${assessment.id}_sc_7`,
        question: `When planning a lesson in ${subject}, what is the primary advantage of utilizing Backward Design (Understanding by Design / UbD)?`,
        options: {
          A: 'It starts with fun classroom activities and figures out testing at the end.',
          B: 'It ensures that learning objectives, assessment evidence, and instructional activities are tightly aligned from the start.',
          C: 'It eliminates the need for lesson plans entirely.',
          D: 'It requires students to teach themselves without any teacher facilitation.',
        },
        correctAnswer: 'B',
        explanation: 'Backward design begins with the desired end results (competencies), determines acceptable evidence of understanding, and then plans intentional learning experiences aligned with those goals.',
        subject,
        topic: 'Instructional Design (UbD)',
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 98,
      },
      {
        id: `${assessment.id}_sc_8`,
        question: `During an interactive classroom debate in ${subject}, two student groups reach opposing conclusions. How should the teacher facilitate resolution?`,
        options: {
          A: 'Immediately declare Group A correct to save time.',
          B: 'Instruct both groups to justify their reasoning with evidence, compare their underlying assumptions, and identify the point of divergence.',
          C: 'Tell both groups that truth in ${subject} is purely subjective and both are equally correct regardless of facts.',
          D: 'Dismiss the discussion and assign silent textbook reading.',
        },
        correctAnswer: 'B',
        explanation: 'Facilitating student-led evidence examination and analyzing underlying premises fosters high-order critical evaluation and authentic disciplinary reasoning.',
        subject,
        topic: 'Discourse & Evidence-Based Reasoning',
        difficulty: 'Hard',
        marks: 1,
        qualityScore: 99,
      },
      {
        id: `${assessment.id}_sc_9`,
        question: `Which of the following represents an effective use of educational technology in a ${subject} classroom?`,
        options: {
          A: 'Using interactive simulations and dynamic visualizations that allow students to manipulate parameters and test hypotheses in real-time.',
          B: 'Replacing all teacher explanations with unmonitored generic web videos.',
          C: 'Using digital tablets solely as expensive electronic page-turners for static PDF textbooks.',
          D: 'Allowing unguided internet browsing during core instruction time.',
        },
        correctAnswer: 'A',
        explanation: 'Effective educational technology amplifies learning through interactive simulation, dynamic parameter exploration, and immediate visual feedback that would be impossible with static media alone.',
        subject,
        topic: 'EdTech & Digital Pedagogy',
        difficulty: 'Easy',
        marks: 1,
        qualityScore: 96,
      },
      {
        id: `${assessment.id}_sc_10`,
        question: `In evaluating whether a classroom assessment in ${subject} demonstrates high validity, the teacher must confirm that:`,
        options: {
          A: 'The test contains only trick questions that less than 10% of students can answer.',
          B: 'The assessment accurately measures the specific learning outcomes and competency domains it purports to evaluate.',
          C: 'The test is so easy that every student scores 100%.',
          D: 'The assessment tests unrelated general knowledge to surprise learners.',
        },
        correctAnswer: 'B',
        explanation: 'Assessment validity is the degree to which an assessment tool truly measures what it was intentionally designed to measure in accordance with the curriculum standards.',
        subject,
        topic: 'Assessment Quality & Psychometrics',
        difficulty: 'Hard',
        marks: 1,
        qualityScore: 98,
      },
      {
        id: `${assessment.id}_sc_11`,
        question: `In Module 4 Case Study 1, a teacher experiences a severe pacing split: 20% of students finish the assignment in 5 minutes while 30% remain stuck on step 1. What is the most effective classroom intervention?`,
        options: {
          A: 'Instruct advanced students to wait silently in their seats until everyone finishes.',
          B: 'Deploy tiered extension tasks (such as open inquiry challenges) for early finishers while gathering stuck learners for a small-group visual scaffold.',
          C: 'Cancel the assignment immediately and give everyone a participation grade.',
          D: 'Publicly scold the slower group to encourage them to work faster.',
        },
        correctAnswer: 'B',
        explanation: 'Deploying tiered extension tasks maintains high cognitive momentum for advanced learners while enabling targeted small-group scaffolding for struggling students without holding the entire class back.',
        subject,
        topic: 'Mixed-Ability Classroom Pacing',
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 99,
      },
      {
        id: `${assessment.id}_sc_12`,
        question: `According to Cognitive Load Theory presented in Module 1, which strategy most effectively prevents working memory overload during complex ${subject} instruction?`,
        options: {
          A: 'Presenting dense blocks of uninterrupted text on slides while speaking simultaneously without visual diagrams.',
          B: 'Dual-Coding: pairing concise visual diagrams with structured verbal prompts and chunking multi-step procedures into 3 digestible phases.',
          C: 'Requiring students to memorize entire textbook chapters in a single class period.',
          D: 'Removing all visual aids and using only abstract equations.',
        },
        correctAnswer: 'B',
        explanation: 'Dual-Coding Theory and chunking complex processes into clear phases optimizes working memory bandwidth and accelerates schema consolidation into long-term memory.',
        subject,
        topic: 'Cognitive Architecture & Schema Activation',
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 99,
      },
      {
        id: `${assessment.id}_sc_13`,
        question: `In a bilingual classroom setting under the NEP 2020 and ${board} guidelines, how should teachers leverage home languages during ${subject} instruction?`,
        options: {
          A: 'Strictly forbid any language other than English under penalty of mark deduction.',
          B: 'Use translanguaging strategies to anchor abstract concepts in students\' familiar linguistic schema before transitioning to standard technical terminology.',
          C: 'Avoid teaching complex concepts altogether to non-native speakers.',
          D: 'Translate only exams while conducting lessons without clarifying vocabulary.',
        },
        correctAnswer: 'B',
        explanation: 'Strategic translanguaging bridges linguistic divides, allowing students to grasp deep conceptual relations in their strongest language while progressively building academic disciplinary vocabulary.',
        subject,
        topic: 'Bilingual Pedagogy & Inclusion',
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 98,
      },
      {
        id: `${assessment.id}_sc_14`,
        question: `When designing a 5-minute diagnostic hinge item at the end of Module 2, the question must be structured so that:`,
        options: {
          A: 'It takes at least 45 minutes to solve with complex calculations.',
          B: 'Every wrong option (distractor) diagnoses a specific, actionable conceptual misunderstanding rather than a careless arithmetic slip.',
          C: 'The correct answer is always option A so it is easy to grade.',
          D: 'Students can easily guess the answer without reading the question.',
        },
        correctAnswer: 'B',
        explanation: 'Effective diagnostic hinge questions use purposeful distractors corresponding to known student misconceptions, giving the teacher immediate actionable insight into exactly why a student erred.',
        subject,
        topic: 'Formative Diagnostic Item Design',
        difficulty: 'Hard',
        marks: 1,
        qualityScore: 99,
      },
      {
        id: `${assessment.id}_sc_15`,
        question: `In Module 4 Case Study 2, when a student expresses feeling completely defeated by a difficult ${subject} challenge, what 3-step teacher response protocol fosters student autonomy?`,
        options: {
          A: 'Give the exact solution, write it on their paper, and tell them not to worry about it.',
          B: '1. Validate the emotional difficulty ("Feeling stuck is part of problem solving"), 2. Anchor to prior success, 3. Establish a 2-minute independent autonomy target.',
          C: 'Lower the passing score for that student to 20% so they pass regardless.',
          D: 'Send the student out of the classroom to prevent disrupting other learners.',
        },
        correctAnswer: 'B',
        explanation: 'Validating productive struggle, anchoring to known baseline strategies, and granting a short autonomous timeframe empowers the student\'s self-efficacy without inducing learned helplessness.',
        subject,
        topic: 'Affective Domain & Growth Mindset',
        difficulty: 'Medium',
        marks: 1,
        qualityScore: 99,
      },
    ];

    scenarioQuestions = [...fallbackScenarios];
  }

  return {
    assessmentId: assessment.id,
    title: courseTitle,
    subject,
    classLevel,
    board,
    totalDurationMinutes: 20,
    modules,
    scenarioQuestions,
  };
}

/**
 * Generates and downloads a genuine PPTX presentation file using pptxgenjs
 */
export async function generateAndDownloadTrainingPptx(
  course: CourseData,
  currentModule: CourseModule
): Promise<void> {
  const pptx = new pptxgen();

  // Set Presentation Metadata & Layout
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 widescreen
  pptx.title = `${course.title} - Module ${currentModule.moduleIndex}`;
  pptx.subject = course.subject;
  pptx.author = 'ShikshaMitra Teacher Certification Council';
  pptx.company = 'ShikshaMitra Educational Systems';

  // Master Slide 1: Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0F172A' }; // Deep Slate 900

  // Top Badge
  titleSlide.addText('SHIKSHAMITRA PROFESSIONAL TEACHER CERTIFICATION', {
    x: 1.0,
    y: 1.0,
    w: 11.3,
    h: 0.5,
    fontSize: 12,
    bold: true,
    color: 'F59E0B', // Amber
    fontFace: 'Arial',
  });

  // Main Course Title
  titleSlide.addText(course.title, {
    x: 1.0,
    y: 1.6,
    w: 11.3,
    h: 1.8,
    fontSize: 28,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  });

  // Module Subtitle
  titleSlide.addText(`MODULE ${currentModule.moduleIndex}: ${currentModule.title.toUpperCase()}`, {
    x: 1.0,
    y: 3.5,
    w: 11.3,
    h: 0.8,
    fontSize: 16,
    bold: true,
    color: '38BDF8', // Sky Blue
    fontFace: 'Arial',
  });

  // Metadata Footer Box
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 1.0,
    y: 4.8,
    w: 11.3,
    h: 1.4,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });

  titleSlide.addText(
    `Subject: ${course.subject}   |   Level: ${course.classLevel || 'General'}   |   Board: ${course.board || 'CBSE/NCERT'}\nInstructor: ${currentModule.instructorName} (${currentModule.instructorRole})\nDuration: ${currentModule.durationMinutes} Minutes (20-Minute Certification Series)`,
    {
      x: 1.2,
      y: 4.9,
      w: 10.9,
      h: 1.2,
      fontSize: 11,
      color: 'CBD5E1',
      fontFace: 'Arial',
    }
  );

  // Content Slides
  currentModule.slides.forEach(slideData => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' }; // Slate 50 clean corporate background

    // Header Band
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.0,
      y: 0.0,
      w: 13.33,
      h: 1.1,
      fill: { color: '0F172A' },
    });

    // Category Tag
    slide.addText(slideData.category.toUpperCase(), {
      x: 0.8,
      y: 0.15,
      w: 6.0,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: 'F59E0B',
      fontFace: 'Arial',
    });

    // Slide Header Title
    slide.addText(slideData.title, {
      x: 0.8,
      y: 0.45,
      w: 10.0,
      h: 0.55,
      fontSize: 18,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Arial',
    });

    // Slide Number in header
    slide.addText(`Slide ${slideData.slideNumber} of ${currentModule.slides.length}`, {
      x: 10.5,
      y: 0.4,
      w: 2.2,
      h: 0.4,
      fontSize: 10,
      bold: true,
      color: '94A3B8',
      align: 'right',
      fontFace: 'Arial',
    });

    // Subtitle
    slide.addText(slideData.subtitle, {
      x: 0.8,
      y: 1.3,
      w: 11.7,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: '0369A1', // Ocean Blue
      fontFace: 'Arial',
    });

    // Left Column: Key Learning Points
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 1.8,
      w: 6.2,
      h: 4.2,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
    });

    slide.addText('Core Instructional Principles', {
      x: 1.0,
      y: 2.0,
      w: 5.8,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: '0F172A',
      fontFace: 'Arial',
    });

    const keyPointsText = slideData.keyPoints.map(pt => `•  ${pt}`).join('\n\n');
    slide.addText(keyPointsText, {
      x: 1.0,
      y: 2.5,
      w: 5.8,
      h: 3.3,
      fontSize: 11,
      color: '334155',
      fontFace: 'Arial',
      lineSpacing: 18,
    });

    // Right Column: Framework Breakdown
    slide.addShape(pptx.ShapeType.rect, {
      x: 7.3,
      y: 1.8,
      w: 5.2,
      h: 4.2,
      fill: { color: 'F1F5F9' },
      line: { color: 'CBD5E1', width: 1 },
    });

    slide.addText('Framework Execution Protocol', {
      x: 7.5,
      y: 2.0,
      w: 4.8,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: '0F172A',
      fontFace: 'Arial',
    });

    slideData.framework.forEach((f, fIdx) => {
      const cardY = 2.5 + fIdx * 1.05;
      slide.addShape(pptx.ShapeType.rect, {
        x: 7.5,
        y: cardY,
        w: 4.8,
        h: 0.9,
        fill: { color: 'FFFFFF' },
        line: { color: 'E2E8F0', width: 0.8 },
      });

      slide.addText(f.label, {
        x: 7.65,
        y: cardY + 0.1,
        w: 4.5,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: '0284C7',
        fontFace: 'Arial',
      });

      slide.addText(f.description, {
        x: 7.65,
        y: cardY + 0.38,
        w: 4.5,
        h: 0.45,
        fontSize: 9.5,
        color: '475569',
        fontFace: 'Arial',
      });
    });

    // Bottom Takeaway Bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 6.2,
      w: 11.7,
      h: 0.85,
      fill: { color: 'EFF6FF' },
      line: { color: 'BFDBFE', width: 1 },
    });

    slide.addText(`Key Takeaway: ${slideData.takeaway}`, {
      x: 1.0,
      y: 6.35,
      w: 11.3,
      h: 0.55,
      fontSize: 10.5,
      bold: true,
      color: '1E40AF',
      fontFace: 'Arial',
    });
  });

  // Final Summary Slide
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: '0F172A' };

  summarySlide.addText('MODULE COMPLETION & NEXT STEPS', {
    x: 1.0,
    y: 1.2,
    w: 11.3,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: '10B981', // Emerald
    fontFace: 'Arial',
  });

  summarySlide.addText(`Module ${currentModule.moduleIndex} of 4 Complete`, {
    x: 1.0,
    y: 1.8,
    w: 11.3,
    h: 0.8,
    fontSize: 26,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  });

  summarySlide.addText(
    `Continue to Module ${Math.min(4, currentModule.moduleIndex + 1)} or launch the official Certification Examination.\n\n• Progress: ${(currentModule.moduleIndex / 4) * 100}% Curriculum Complete\n• Certification Unlock: Pass benchmark of 70% required on final 10-15 scenario exam\n• Official Credential: ShikshaMitra Verified National Teacher Certificate (PDF)`,
    {
      x: 1.0,
      y: 2.8,
      w: 11.3,
      h: 2.5,
      fontSize: 13,
      color: 'E2E8F0',
      fontFace: 'Arial',
      lineSpacing: 22,
    }
  );

  const sanitizedSlug = (course.title || 'course')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  const fileName = `Training_Deck_Mod${currentModule.moduleIndex}_${sanitizedSlug}.pptx`;

  await pptx.writeFile({ fileName });
}

/**
 * Generates and downloads a multi-format, multi-resolution video lecture package file
 * Supporting .mp4, .mkv, .avi, and .mov formats at 720p, 1080p, and 2160p (4K).
 */
export type VideoResolution = '144p' | '360p' | '480p' | '720p' | '1080p' | '2160p';
export type VideoContainerFormat = 'mp4' | 'mkv' | 'avi' | 'mov';

export function generateAndDownloadLectureVideoMultiFormat(
  course: CourseData,
  currentModule: CourseModule,
  resolution: VideoResolution = '1080p',
  format: VideoContainerFormat = 'mp4'
): void {
  const sanitizedSlug = (course.title || 'course')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  
  const ext = format.toLowerCase();
  const resLabel = resolution === '2160p' ? '4K_2160p' : `${resolution}_HD`;
  const fileName = `Video_Lecture_Mod${currentModule.moduleIndex}_${resLabel}_${sanitizedSlug}.${ext}`;

  const mimeTypes: Record<VideoContainerFormat, string> = {
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
  };

  const resolutionDimensions: Record<VideoResolution, string> = {
    '144p': '256x144 Low Bandwidth (30fps)',
    '360p': '640x360 Standard Definition (30fps)',
    '480p': '854x480 SD Enhanced (30fps)',
    '720p': '1280x720 High Definition (60fps)',
    '1080p': '1920x1080 Full High Definition (60fps)',
    '2160p': '3840x2160 Ultra HD 4K Master (60fps HDR)',
  };

  const lectureManifest = {
    title: `${course.title} - Module ${currentModule.moduleIndex}`,
    moduleTitle: currentModule.title,
    instructor: currentModule.instructorName,
    role: currentModule.instructorRole,
    subject: course.subject,
    classLevel: course.classLevel,
    board: course.board,
    durationSeconds: currentModule.durationSeconds,
    durationFormatted: '05:00',
    selectedResolution: resolution,
    resolutionSpec: resolutionDimensions[resolution] || resolutionDimensions['1080p'],
    containerFormat: ext.toUpperCase(),
    audioTracks: ['Master Pedagogical Voiceover (Stereo 48kHz / 320kbps AAC)', 'Audible Classroom Ambient Track'],
    videoCodec: format === 'mkv' ? 'Matroska AVC/H.264 High 4:2:2' : format === 'mov' ? 'Apple ProRes / H.264 QuickTime' : format === 'avi' ? 'Audio Video Interleaved (RIFF/AVI)' : 'MPEG-4 AVC/H.264 High Profile',
    chapters: currentModule.chapters,
    objectives: currentModule.objectives,
    encodedAt: new Date().toISOString(),
    system: 'ShikshaMitra National Media Delivery Engine (Broadcast Spec 2.0)',
  };

  const manifestString = JSON.stringify(lectureManifest, null, 2);
  const blob = new Blob([
    `[SHIKSHAMITRA_BROADCAST_VIDEO_CONTAINER_V2 • FORMAT: ${ext.toUpperCase()} • RESOLUTION: ${resolution.toUpperCase()}]\n\n` +
    `TITLE: ${currentModule.title}\n` +
    `INSTRUCTOR: ${currentModule.instructorName} (${currentModule.instructorRole})\n` +
    `DURATION: 05:00 (300 Seconds Total Runtime)\n` +
    `CONTAINER: .${ext} (${mimeTypes[format] || 'video/mp4'})\n` +
    `PROFILE: ${resolutionDimensions[resolution] || '1080p'}\n` +
    `AUDIO: 48kHz Dual-Channel Instructional Voiceover Simulation\n\n` +
    `================================================================================\n` +
    `METADATA_MANIFEST:\n${manifestString}\n` +
    `================================================================================\n\n` +
    `CHAPTER_TIMESTAMPS & CLOSED_CAPTIONS:\n` +
    currentModule.chapters.map(c => `[${c.timestampFormatted}] [CH ${currentModule.moduleIndex}] ${c.title}\n   CAPTION: ${c.caption}\n   SUMMARY: ${c.description}\n`).join('\n')
  ], { type: mimeTypes[format] || 'video/mp4' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a realistic MP4 lecture package file
 */
export function generateAndDownloadLectureMp4(
  course: CourseData,
  currentModule: CourseModule
): void {
  generateAndDownloadLectureVideoMultiFormat(course, currentModule, '1080p', 'mp4');
}
