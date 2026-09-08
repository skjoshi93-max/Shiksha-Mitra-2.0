import { AssessmentQuestion, Assessment, DifficultyLevel } from '../types';

export interface DerivedAssessmentMetadata {
  title: string;
  slug: string;
  subject: string;
  description: string;
  classLevel: string;
  board: string;
  topics: string[];
  duration: number;
  passScore: number;
  qualityScore: number;
}

// Canonical URL-safe slug generator
export function generateCanonicalSlug(title: string): string {
  if (!title || !title.trim()) return 'teacher-skill-assessment';
  return title
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// Pedagogical taxonomy and domain dictionary for content analysis
const PEDAGOGICAL_DOMAINS: {
  name: string;
  shortName: string;
  keywords: string[];
}[] = [
  {
    name: 'Classroom Management',
    shortName: 'Classroom Management',
    keywords: [
      'classroom management',
      'discipline',
      'behavior',
      'routines',
      'seating',
      'disruptive',
      'norms',
      'attention',
      'conflict resolution',
      'proactive discipline',
      'student conduct',
    ],
  },
  {
    name: 'Assessment & Evaluation',
    shortName: 'Assessment Strategies',
    keywords: [
      'assessment',
      'evaluation',
      'formative',
      'summative',
      'rubric',
      'diagnostic',
      'cce',
      'quiz',
      'exit ticket',
      'test design',
      'marking scheme',
      'feedback',
      'learning outcomes',
    ],
  },
  {
    name: 'Pedagogical Methodology',
    shortName: 'Pedagogical Strategies',
    keywords: [
      'pedagogy',
      'instructional',
      'lesson planning',
      'teaching method',
      'constructivist',
      'experiential',
      'inquiry',
      'critical thinking',
      'bloom',
      'cognitive',
      'active learning',
      'questioning',
    ],
  },
  {
    name: 'Inclusive Education',
    shortName: 'Inclusive Teaching',
    keywords: [
      'inclusive',
      'special needs',
      'udl',
      'universal design',
      'differentiated',
      'diversity',
      'adhd',
      'disabilities',
      'remedial',
      'accessible',
      'accommodations',
      'iep',
    ],
  },
  {
    name: 'Educational Technology',
    shortName: 'Educational Technology',
    keywords: [
      'technology',
      'ict',
      'digital',
      'smart classroom',
      'lms',
      'ifp',
      'edtech',
      'simulation',
      'gamified',
      'online learning',
      'hybrid',
      'ai in education',
      'multimedia',
    ],
  },
  {
    name: 'Student Engagement & Psychology',
    shortName: 'Student Engagement',
    keywords: [
      'engagement',
      'motivation',
      'psychology',
      'development',
      'child development',
      'piaget',
      'vygotsky',
      'empathy',
      'socio-emotional',
      'collaboration',
      'peer learning',
    ],
  },
  {
    name: 'Teacher Professional Ethics & Leadership',
    shortName: 'Professional Ethics',
    keywords: [
      'ethics',
      'professional conduct',
      'leadership',
      'parent-teacher',
      'communication',
      'nep 2020',
      'school policy',
      'pocso',
      'reflective practice',
      'action research',
      'mentoring',
    ],
  },
];

/**
 * Deterministic Content-Analysis Algorithm
 * Analyzes the complete set of questions to derive dominant themes,
 * professional title, comprehensive description, and canonical slug.
 */
export function deriveDeterministicMetadata(questions: AssessmentQuestion[]): DerivedAssessmentMetadata {
  if (!questions || questions.length === 0) {
    const defaultTitle = 'Teacher Professional Competency Assessment';
    return {
      title: defaultTitle,
      slug: generateCanonicalSlug(defaultTitle),
      subject: 'Pedagogy & Teaching Methodology',
      description: 'Comprehensive assessment evaluating core teacher pedagogical skills, classroom management, and instructional competency.',
      classLevel: 'General Teacher Certification',
      board: 'CBSE',
      topics: ['Classroom Management', 'Assessment Strategies', 'Pedagogical Methodology'],
      duration: 45,
      passScore: 70,
      qualityScore: 95,
    };
  }

  // 1. Domain frequency counter based on question text, topic, subject, explanation
  const domainScores: Record<string, { count: number; domain: (typeof PEDAGOGICAL_DOMAINS)[0] }> = {};
  PEDAGOGICAL_DOMAINS.forEach(d => {
    domainScores[d.name] = { count: 0, domain: d };
  });

  const rawTopics = new Set<string>();
  const rawSubjects = new Set<string>();

  questions.forEach(q => {
    if (q.topic && q.topic.trim()) rawTopics.add(q.topic.trim());
    if (q.subject && q.subject.trim()) rawSubjects.add(q.subject.trim());

    const combinedText = `${q.question || ''} ${q.topic || ''} ${q.subject || ''} ${q.explanation || ''}`.toLowerCase();

    PEDAGOGICAL_DOMAINS.forEach(d => {
      let matched = false;
      for (const kw of d.keywords) {
        if (combinedText.includes(kw)) {
          domainScores[d.name].count += 1;
          matched = true;
          break;
        }
      }
      // Also match domain name itself
      if (!matched && combinedText.includes(d.shortName.toLowerCase())) {
        domainScores[d.name].count += 1;
      }
    });
  });

  // Sort domains by frequency
  const sortedDomains = Object.values(domainScores)
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // Determine dominant themes
  let dominantThemes: string[] = [];
  let dominantSubjects: string[] = [];

  if (sortedDomains.length > 0) {
    // Top 1 to 3 dominant domains
    const topDomains = sortedDomains.slice(0, Math.min(3, sortedDomains.length));
    dominantThemes = topDomains.map(d => d.domain.shortName);
    dominantSubjects = topDomains.map(d => d.domain.name);
  } else if (rawTopics.size > 0) {
    dominantThemes = Array.from(rawTopics).slice(0, 3);
  } else if (rawSubjects.size > 0) {
    dominantThemes = Array.from(rawSubjects).slice(0, 3);
  } else {
    dominantThemes = ['Classroom Management', 'Assessment Strategies', 'Pedagogy'];
  }

  // 2. Build Title from dominant themes
  let derivedTitle = '';
  if (dominantThemes.length === 1) {
    derivedTitle = `${dominantThemes[0]} Competency Assessment`;
  } else if (dominantThemes.length === 2) {
    derivedTitle = `${dominantThemes[0]} and ${dominantThemes[1]} Assessment`;
  } else if (dominantThemes.length === 3) {
    derivedTitle = `${dominantThemes[0]}, ${dominantThemes[1]} and ${dominantThemes[2]} Assessment`;
  } else {
    derivedTitle = 'Teacher Pedagogical and Classroom Competency Assessment';
  }

  // Ensure professional formatting
  if (!derivedTitle.toLowerCase().includes('assessment') && !derivedTitle.toLowerCase().includes('skills') && !derivedTitle.toLowerCase().includes('certification')) {
    derivedTitle = `${derivedTitle} Assessment`;
  }

  // 3. Build Subject
  const primarySubject = dominantSubjects.length > 0
    ? dominantSubjects.slice(0, 2).join(' & ')
    : Array.from(rawSubjects)[0] || 'Pedagogy & Classroom Management';

  // 4. Build Description explaining actual evaluated competencies
  const themeListFormatted = dominantThemes.map(t => t.toLowerCase()).join(', ');
  const derivedDescription = `This assessment evaluates teacher competency across ${themeListFormatted}, instructional planning, and active student learning strategies.`;

  // 5. Build Canonical Slug from final title
  const derivedSlug = generateCanonicalSlug(derivedTitle);

  // 6. Calculate Duration and Pass Score
  const count = questions.length;
  const hardCount = questions.filter(q => q.difficulty === 'Hard').length;
  const medCount = questions.filter(q => q.difficulty === 'Medium').length;
  const easyCount = questions.filter(q => q.difficulty === 'Easy').length;

  const hardPct = (hardCount / count) * 100 || 20;
  const medPct = (medCount / count) * 100 || 50;
  const easyPct = (easyCount / count) * 100 || 30;

  const avgDiffMultiplier = (easyPct * 0.8 + medPct * 1.2 + hardPct * 1.8) / 100;
  const calculatedDuration = Math.max(20, Math.round(count * 1.2 * avgDiffMultiplier));

  let calculatedPassScore = 60;
  if (hardPct > 40) calculatedPassScore = 70;
  if (hardPct > 60) calculatedPassScore = 75;

  const totalQuality = questions.reduce((sum, q) => sum + (q.qualityScore || 93), 0);
  const avgQuality = Math.round(totalQuality / Math.max(1, count));

  return {
    title: derivedTitle,
    slug: derivedSlug,
    subject: primarySubject,
    description: derivedDescription,
    classLevel: 'General Teacher Certification',
    board: 'CBSE',
    topics: Array.from(rawTopics).length > 0 ? Array.from(rawTopics).slice(0, 6) : dominantThemes,
    duration: calculatedDuration,
    passScore: calculatedPassScore,
    qualityScore: Math.max(90, Math.min(99, avgQuality)),
  };
}

/**
 * Complete Pipeline Metadata Derivation
 * Tries server-side Gemini AI derivation first, then seamlessly falls back
 * to deterministic content analysis if AI is unavailable or fails.
 */
export async function deriveAssessmentMetadataFromQuestions(
  questions: AssessmentQuestion[]
): Promise<DerivedAssessmentMetadata> {
  if (!questions || questions.length === 0) {
    return deriveDeterministicMetadata(questions);
  }

  // Attempt server AI derivation if available
  try {
    const sampleQuestions = questions.slice(0, 20).map(q => ({
      question: q.question,
      topic: q.topic,
      subject: q.subject,
      difficulty: q.difficulty,
      explanation: q.explanation,
    }));

    const response = await fetch('/api/derive-assessment-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalQuestions: questions.length,
        questions: sampleQuestions,
      }),
    });

    if (response.ok) {
      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_) {}

      if (data && data.success && data.metadata && data.metadata.title) {
        const meta = data.metadata;
        const finalTitle = meta.title.trim();
        const finalSlug = meta.slug ? generateCanonicalSlug(meta.slug) : generateCanonicalSlug(finalTitle);
        
        // Calculate duration and passScore from actual questions
        const deterministic = deriveDeterministicMetadata(questions);

        return {
          title: finalTitle,
          slug: finalSlug,
          subject: meta.subject || deterministic.subject,
          description: meta.description || deterministic.description,
          classLevel: meta.classLevel || 'General Teacher Certification',
          board: meta.board || 'CBSE',
          topics: Array.isArray(meta.topics) && meta.topics.length > 0 ? meta.topics : deterministic.topics,
          duration: meta.duration || deterministic.duration,
          passScore: meta.passScore || deterministic.passScore,
          qualityScore: deterministic.qualityScore,
        };
      }
    }
  } catch (err) {
    console.warn('AI assessment metadata derivation skipped, using deterministic fallback:', err);
  }

  // Deterministic fallback
  return deriveDeterministicMetadata(questions);
}
