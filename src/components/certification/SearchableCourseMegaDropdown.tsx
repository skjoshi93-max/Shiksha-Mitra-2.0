import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  BookOpen,
  Sparkles,
  Check,
  Tag,
  Clock,
  Layers,
  GraduationCap,
  ShieldCheck,
  Award,
  Filter,
  X,
} from 'lucide-react';

export interface CourseCatalogItem {
  title: string;
  description: string;
  level: string;
  duration: string;
  tags: string[];
}

export interface CourseCategoryGroup {
  domain: string;
  badge: string;
  iconName?: string;
  description: string;
  courses: CourseCatalogItem[];
}

export const IGOT_KARMAYOGI_COURSE_CATALOG: CourseCategoryGroup[] = [
  {
    domain: 'Foundational Education & Literacy (FLN)',
    badge: 'NIPUN Bharat & FLN',
    description: 'Core early learning frameworks, phonics progressions, and numeracy diagnostics',
    courses: [
      {
        title: 'Foundational Literacy: Phonological Awareness',
        description: 'Evidence-based phonemic segmentation, oral language fluency, and decoding pedagogy',
        level: 'Primary Educators (Class 1-3)',
        duration: '20 Min Certification',
        tags: ['FLN', 'NIPUN Bharat', 'Decoding', 'Oral Fluency'],
      },
      {
        title: 'Numeracy: Early Math Concepts & Data',
        description: 'CRA sequencing, number sense development, and intuitive spatial reasoning',
        level: 'Primary Educators (Class 1-5)',
        duration: '20 Min Certification',
        tags: ['Numeracy', 'Number Sense', 'CRA Model', 'Manipulatives'],
      },
      {
        title: 'Remediation Strategies for Early Childhood Learners',
        description: 'Multi-tiered systems of support (MTSS) and targeted diagnostic interventions',
        level: 'Foundational Teachers & Special Educators',
        duration: '20 Min Certification',
        tags: ['Remediation', 'MTSS', 'Diagnostic', 'Early Interventions'],
      },
      {
        title: 'Activity-Based Learning for Foundational Stages',
        description: 'Gamified routines, tactile learning corners, and experiential circle time',
        level: 'Pre-Primary & Primary Educators',
        duration: '20 Min Certification',
        tags: ['Activity-Based', 'Circle Time', 'Tactile Learning', 'Jadui Pitara'],
      },
    ],
  },
  {
    domain: 'NEP 2020 & Professional Pedagogy',
    badge: 'NEP 2020 Standards',
    description: 'Transformative pedagogical approaches, competency assessments, and inclusive classrooms',
    courses: [
      {
        title: 'Experiential Learning & Toy-Based Pedagogy',
        description: 'Indigenous toy integration, constructivist simulations, and active inquiry cycles',
        level: 'K-12 Educators & Activity Leads',
        duration: '20 Min Certification',
        tags: ['NEP 2020', 'Toy Pedagogy', 'Experiential', '5E Cycle'],
      },
      {
        title: 'Competency-Based Formative Assessment & Rubrics',
        description: 'Holistic 360-degree assessment cards (HPC), PARAKH standards, and rubric design',
        level: 'Secondary & Senior Secondary Educators',
        duration: '20 Min Certification',
        tags: ['PARAKH', 'Rubrics', 'HPC', 'Formative Assessment'],
      },
      {
        title: 'Inclusive Classroom Differentiation & Equity',
        description: 'Universal Design for Learning (UDL), neurodiversity support, and gender-sensitive pedagogy',
        level: 'All Cadres & School Leaders',
        duration: '20 Min Certification',
        tags: ['Inclusion', 'UDL', 'Differentiation', 'Equity'],
      },
      {
        title: 'Art-Integrated & Project-Based Learning Layouts',
        description: 'Cross-curricular artistic synthesis, heritage craft integration, and authentic exhibition portfolios',
        level: 'Middle & Secondary Educators',
        duration: '20 Min Certification',
        tags: ['Art Integration', 'PBL', 'Cross-Curricular', 'Exhibitions'],
      },
    ],
  },
  {
    domain: 'Digital Technology & Innovation',
    badge: 'Digital India & ICT',
    description: 'Modern educational technology, digital labs, and generative AI classroom engineering',
    courses: [
      {
        title: 'Digital STEM Labs & Virtual Experimentation',
        description: 'PhET simulations, virtual laboratory protocols, and computational data exploration',
        level: 'STEM Faculty & Lab Instructors',
        duration: '20 Min Certification',
        tags: ['STEM', 'Virtual Labs', 'PhET', 'Inquiry Science'],
      },
      {
        title: 'ICT Tools Integration in Secondary Classrooms',
        description: 'Interactive smartboards, digital storytelling, DIKSHA repository mapping, and LMS orchestration',
        level: 'Secondary Faculty & ICT Coordinators',
        duration: '20 Min Certification',
        tags: ['ICT', 'DIKSHA', 'Smart Classroom', 'EdTech'],
      },
      {
        title: 'AI Tools and Prompt Engineering for Modern Educators',
        description: 'Structured prompt design, generative AI lesson planning, rubric generation, and ethical guardrails',
        level: 'All Educators & Curriculum Developers',
        duration: '20 Min Certification',
        tags: ['AI in Education', 'Prompt Engineering', 'Gemini AI', 'Ethics'],
      },
    ],
  },
  {
    domain: 'School Leadership & Administration',
    badge: 'Institutional Governance',
    description: 'School development plans, CPD tracking, and administrative compliance protocols',
    courses: [
      {
        title: 'NEP 2020 Institutional Implementation Roadmaps',
        description: 'School Development Plans (SDP), cluster governance, and institutional transition milestones',
        level: 'Principals, Vice-Principals & Headmasters',
        duration: '20 Min Certification',
        tags: ['Leadership', 'SDP', 'Governance', 'NEP Roadmap'],
      },
      {
        title: 'Continuous Professional Development (CPD) Frameworks',
        description: '50-hour annual CPD logging, peer lesson observations, and teacher portfolio mentoring',
        level: 'School Leaders & Master Trainers',
        duration: '20 Min Certification',
        tags: ['CPD', 'Teacher Portfolios', 'Mentorship', 'DoPT Guidelines'],
      },
    ],
  },
  {
    domain: 'Governance, Ethics & Public Administration',
    badge: 'Karmayogi Bharat',
    description: 'Statutory compliance, public financial management, and administrative transparency',
    courses: [
      {
        title: 'Public Financial Management & Statutory Audit (GFR 2017)',
        description: 'General Financial Rules 2017, budget appropriation, voucher verification, and C&AG audit compliance',
        level: 'Administrative Officers & DDOs',
        duration: '20 Min Certification',
        tags: ['GFR 2017', 'Audit', 'Finance', 'PFMS'],
      },
      {
        title: 'Public Procurement & GeM Portal Standards',
        description: 'Government e-Marketplace (GeM) procurement rules, reverse auctions, and contract management',
        level: 'Procurement Leads & Store Officers',
        duration: '20 Min Certification',
        tags: ['GeM', 'Procurement', 'Bidding', 'Contracts'],
      },
      {
        title: 'Administrative Law, RTI & Ethics in Governance',
        description: 'Right to Information Act compliance, appellate protocols, vigilance principles, and civil service code',
        level: 'Public Information Officers & All Cadres',
        duration: '20 Min Certification',
        tags: ['RTI Act', 'Ethics', 'Vigilance', 'Code of Conduct'],
      },
      {
        title: 'Cyber Security & Information Security Protocols (CERT-In)',
        description: 'Critical information infrastructure protection, password hygiene, phishing countermeasures, and data privacy',
        level: 'IT Officers & All Staff',
        duration: '20 Min Certification',
        tags: ['Cyber Security', 'CERT-In', 'Data Privacy', 'InfoSec'],
      },
    ],
  },
];

interface SearchableCourseMegaDropdownProps {
  selectedCourseTitle: string;
  onSelectCourse: (course: CourseCatalogItem, domain: string) => void;
  disabled?: boolean;
}

export const SearchableCourseMegaDropdown: React.FC<SearchableCourseMegaDropdownProps> = ({
  selectedCourseTitle,
  onSelectCourse,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Find currently active course item
  const currentSelectedItem = useMemo(() => {
    for (const group of IGOT_KARMAYOGI_COURSE_CATALOG) {
      const found = group.courses.find(c => c.title === selectedCourseTitle);
      if (found) return { item: found, domain: group.domain, badge: group.badge };
    }
    // Fallback default
    return {
      item: IGOT_KARMAYOGI_COURSE_CATALOG[0].courses[0],
      domain: IGOT_KARMAYOGI_COURSE_CATALOG[0].domain,
      badge: IGOT_KARMAYOGI_COURSE_CATALOG[0].badge,
    };
  }, [selectedCourseTitle]);

  // Filter groups and courses based on search & domain
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return IGOT_KARMAYOGI_COURSE_CATALOG.map(group => {
      if (selectedDomainFilter !== 'All' && group.domain !== selectedDomainFilter) {
        return null;
      }
      const matchingCourses = group.courses.filter(course => {
        if (!q) return true;
        return (
          course.title.toLowerCase().includes(q) ||
          course.description.toLowerCase().includes(q) ||
          course.level.toLowerCase().includes(q) ||
          group.domain.toLowerCase().includes(q) ||
          course.tags.some(t => t.toLowerCase().includes(q))
        );
      });

      if (matchingCourses.length === 0) return null;

      return {
        ...group,
        courses: matchingCourses,
      };
    }).filter(Boolean) as CourseCategoryGroup[];
  }, [searchQuery, selectedDomainFilter]);

  const totalMatchingCourses = useMemo(() => {
    return filteredCatalog.reduce((acc, g) => acc + g.courses.length, 0);
  }, [filteredCatalog]);

  const allDomains = useMemo(() => {
    return ['All', ...IGOT_KARMAYOGI_COURSE_CATALOG.map(g => g.domain)];
  }, []);

  return (
    <div 
      ref={dropdownRef} 
      className="relative flex-1 min-w-0 overflow-visible z-[9999]" 
      id="igot-course-mega-dropdown-container"
      style={{ overflow: 'visible' }}
    >
      {/* Primary Trigger Button */}
      <button
        type="button"
        id="igot-course-select-trigger"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer select-none ${
          isOpen
            ? 'border-blue-700 bg-white ring-2 ring-blue-700/20 shadow-lg dark:border-blue-500 dark:bg-slate-900'
            : 'border-slate-300 bg-slate-50/90 hover:bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-800 shadow-xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="h-5 w-5 text-sky-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                {currentSelectedItem.badge}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {currentSelectedItem.domain}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">
              {currentSelectedItem.item.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pl-2">
          <span className="hidden sm:inline-block rounded-lg bg-slate-200/80 dark:bg-slate-700 px-2 py-1 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
            20 Mins
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-700 dark:text-blue-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Expandable Searchable Mega Menu Flyout */}
      {isOpen && (
        <div
          id="igot-course-mega-dropdown-menu"
          className="absolute left-0 right-0 top-full mt-2 z-[9999] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-[540px] flex flex-col"
          style={{ 
            minWidth: '100%', 
            maxWidth: '840px',
            position: 'absolute',
            zIndex: 9999
          }}
        >
          {/* Header & Live Search Bar */}
          <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-800 dark:text-blue-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  iGOT Karmayogi National Competency Catalog
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {totalMatchingCourses} accredited courses available
              </span>
            </div>

            {/* Search Input Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                id="igot-course-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by course title, pedagogical domain, keyword, or standard..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-10 pr-9 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {allDomains.map(domain => {
                const isActive = selectedDomainFilter === domain;
                const shortLabel = domain === 'All'
                  ? 'All Domains'
                  : domain.replace('Education & Literacy', 'FLN').replace('Professional Pedagogy', 'Pedagogy').replace('School Leadership & Administration', 'Leadership');
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setSelectedDomainFilter(domain)}
                    className={`rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-blue-900 text-white shadow-xs dark:bg-blue-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Course Items Area */}
          <div className="flex-1 overflow-y-auto min-h-0 pt-3 space-y-4 pr-1">
            {filteredCatalog.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <BookOpen className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No professional courses matched "{searchQuery}"
                </p>
                <p className="text-[11px] text-slate-400">
                  Try searching for 'FLN', 'NEP', 'Assessment', 'STEM', or 'Leadership'.
                </p>
              </div>
            ) : (
              filteredCatalog.map(group => (
                <div key={group.domain} className="space-y-2">
                  {/* Domain Header Card */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-100/90 dark:bg-slate-800/80 px-3 py-1.5 border border-slate-200/60 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-blue-800 dark:text-blue-400" />
                      <span className="text-[11px] font-black tracking-tight text-slate-800 dark:text-slate-200">
                        {group.domain}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {group.courses.length} courses
                    </span>
                  </div>

                  {/* Course Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.courses.map(course => {
                      const isSelected = course.title === selectedCourseTitle;
                      return (
                        <button
                          key={course.title}
                          type="button"
                          onClick={() => {
                            onSelectCourse(course, group.domain);
                            setIsOpen(false);
                          }}
                          className={`group p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-700 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40 ring-1 ring-blue-700/30 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`text-xs font-black line-clamp-1 transition-colors ${
                                  isSelected
                                    ? 'text-blue-900 dark:text-blue-300'
                                    : 'text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400'
                                }`}
                              >
                                {course.title}
                              </h4>
                              {isSelected && (
                                <span className="h-4 w-4 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0">
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                              {course.description}
                            </p>
                          </div>

                          {/* Footer Tags & Level */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                              {course.level}
                            </span>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                              {course.duration}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
