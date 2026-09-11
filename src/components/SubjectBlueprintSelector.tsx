import React from 'react';
import {
  Sparkles,
  Check,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  BookOpen,
  FlaskConical,
  Calculator,
  Languages as LanguagesIcon,
  Globe2,
  Binary,
  Layers,
  Info,
} from 'lucide-react';
import { LOCKED_ALLOWED_QUESTION_TYPES } from '../lib/constants';
import {
  detectSubjectCategory,
  getBlueprintQuestionTypesForSubject,
  ALL_CBSE_BLUEPRINTS,
  CbseSubjectCategoryKey,
  CbseSubjectBlueprint,
} from '../lib/subjectBlueprintMapping';

interface SubjectBlueprintSelectorProps {
  selectedSubject: string;
  bookTitle?: string;
  selectedTypes: string[];
  onChangeTypes: (types: string[]) => void;
  title?: string;
  subtitle?: string;
  showPresets?: boolean;
  className?: string;
}

const CATEGORY_ICONS: Record<CbseSubjectCategoryKey, React.ElementType> = {
  SCIENCE: FlaskConical,
  MATHEMATICS: Calculator,
  LANGUAGES: LanguagesIcon,
  SOCIAL_SCIENCE: Globe2,
  COMMERCE_CS: Binary,
  GENERAL: Layers,
};

// Helpful standard marks mapping for Indian CBSE exam question types
const QUESTION_TYPE_EXAM_HINTS: Record<string, { marks: string; format: string }> = {
  'Multiple Choice (MCQ)': { marks: '1 Mark', format: 'Objective 4-Option' },
  'Short Answer Questions (SAQ)': { marks: '2-3 Marks', format: '30-50 Words' },
  'Long Answer Questions (LAQ)': { marks: '5 Marks', format: '80-120 Words' },
  'Fill in the Blanks': { marks: '1 Mark', format: 'Single / Dual Blank' },
  'True / False': { marks: '1 Mark', format: 'Binary Verification' },
  'One Word / Very Short Answer': { marks: '1 Mark', format: 'Direct Recall' },
  'Match the Following': { marks: '2-4 Marks', format: 'Column A to B' },
  'Solve the Following (Math/Numerical special)': { marks: '3-5 Marks', format: 'Step-by-step Solution' },
  'Assertion & Reason': { marks: '1 Mark', format: 'Conceptual Logic' },
  'Case-Based / Passage-Based Questions': { marks: '4-5 Marks', format: 'Passage + Sub-questions' },
  'Diagram / Graphical-Based Questions': { marks: '3-5 Marks', format: 'Visual / Graph Analysis' },
  'Grammar & Comprehension': { marks: '2-5 Marks', format: 'Syntax & Passage Analysis' },
};

export const SubjectBlueprintSelector: React.FC<SubjectBlueprintSelectorProps> = ({
  selectedSubject,
  bookTitle = '',
  selectedTypes,
  onChangeTypes,
  title = 'Subject-Aware Smart Auto-Select (CBSE Class 6-12 Blueprint)',
  subtitle = 'Auto-selects all standard exam question types for the chosen subject while keeping manual overrides fully unlocked.',
  showPresets = true,
  className = '',
}) => {
  const activeBlueprint = detectSubjectCategory(selectedSubject, bookTitle);
  const IconComponent = CATEGORY_ICONS[activeBlueprint.key] || Layers;

  // Auto-apply blueprint for the current subject
  const handleApplyCurrentBlueprint = () => {
    const types = getBlueprintQuestionTypesForSubject(selectedSubject, bookTitle);
    onChangeTypes(types);
  };

  // Apply a specific blueprint preset directly
  const handleApplyPresetBlueprint = (bp: CbseSubjectBlueprint) => {
    onChangeTypes([...bp.questionTypes]);
  };

  // Toggle individual question type (Manual Override)
  const handleToggleType = (qType: string) => {
    const alreadySelected = selectedTypes.includes(qType);
    let updated: string[];
    if (alreadySelected) {
      updated = selectedTypes.filter(t => t !== qType);
      // Fallback: don't allow 0 types to prevent invalid generation payload
      if (updated.length === 0) {
        updated = [qType];
      }
    } else {
      updated = [...selectedTypes, qType];
    }
    onChangeTypes(updated);
  };

  // Select all 12 types
  const handleSelectAll = () => {
    onChangeTypes([...LOCKED_ALLOWED_QUESTION_TYPES]);
  };

  // Count blueprint matches
  const standardTypesInBlueprint = activeBlueprint.questionTypes;
  const standardSelectedCount = selectedTypes.filter(t => standardTypesInBlueprint.includes(t)).length;
  const nonStandardSelectedCount = selectedTypes.filter(t => !standardTypesInBlueprint.includes(t)).length;

  return (
    <div className={`space-y-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-xs transition-all ${className}`}>
      {/* Header & Detected Blueprint Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              {title}
            </span>
            {/* Active Subject Blueprint Badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${activeBlueprint.badgeColor.bg} ${activeBlueprint.badgeColor.text} ${activeBlueprint.badgeColor.border} ${activeBlueprint.badgeColor.darkBg} ${activeBlueprint.badgeColor.darkText} ${activeBlueprint.badgeColor.darkBorder}`}>
              <IconComponent className="h-3 w-3 shrink-0" />
              {activeBlueprint.categoryTitle}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleApplyCurrentBlueprint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-black cursor-pointer transition-all border border-indigo-200 dark:border-indigo-800 shadow-2xs"
            title={`Auto-select all ${activeBlueprint.questionTypes.length} standard question types for ${selectedSubject || 'this subject'}`}
          >
            <RotateCcw className="h-3 w-3" />
            Smart Auto-Select ({activeBlueprint.questionTypes.length})
          </button>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer transition-all border border-slate-200 dark:border-slate-700"
          >
            All 12
          </button>
        </div>
      </div>

      {/* Blueprint Info Box */}
      <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${activeBlueprint.badgeColor.bg} ${activeBlueprint.badgeColor.border} ${activeBlueprint.badgeColor.darkBg} ${activeBlueprint.badgeColor.darkBorder}`}>
        <Info className={`h-4 w-4 shrink-0 mt-0.5 ${activeBlueprint.badgeColor.text} ${activeBlueprint.badgeColor.darkText}`} />
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-black ${activeBlueprint.badgeColor.text} ${activeBlueprint.badgeColor.darkText}`}>
              {activeBlueprint.subTitle}
            </span>
            <span className="text-[10px] opacity-75 font-semibold">
              ({standardSelectedCount}/{standardTypesInBlueprint.length} standard types active
              {nonStandardSelectedCount > 0 ? ` + ${nonStandardSelectedCount} custom overrides` : ''})
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeBlueprint.description} <span className="font-semibold">{activeBlueprint.examContext}</span>
          </p>
        </div>
      </div>

      {/* CBSE Blueprint Preset Switchers */}
      {showPresets && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold flex items-center gap-1">
              <Layers className="h-3 w-3" />
              CBSE Class 6-12 Blueprint Presets:
            </span>
            <span className="text-[10px]">Click any preset to pre-fill standard types</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ALL_CBSE_BLUEPRINTS.map(bp => {
              const BpIcon = CATEGORY_ICONS[bp.key] || Layers;
              const isCurrent = activeBlueprint.key === bp.key;
              return (
                <button
                  key={bp.key}
                  type="button"
                  onClick={() => handleApplyPresetBlueprint(bp)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                    isCurrent
                      ? `${bp.badgeColor.bg} ${bp.badgeColor.border} ring-1 ring-indigo-500/50 dark:ring-indigo-400/50 shadow-2xs`
                      : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-black truncate">
                      <BpIcon className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      {bp.label.split(' ')[0]}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-900 text-[10px] font-black border border-slate-200 dark:border-slate-700">
                      {bp.questionTypes.length}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">
                    {bp.sampleSubjects.slice(0, 2).join(', ')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Types Grid with Fully Unlocked Checkboxes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>Target Question Types ({selectedTypes.length}/12 Selected)</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
              • All checkboxes fully unlocked for manual override
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {LOCKED_ALLOWED_QUESTION_TYPES.map((qType) => {
            const isSelected = selectedTypes.includes(qType);
            const isStandardForSubject = standardTypesInBlueprint.includes(qType);
            const hint = QUESTION_TYPE_EXAM_HINTS[qType] || { marks: '1-5 Marks', format: 'Standard' };

            return (
              <button
                key={qType}
                type="button"
                onClick={() => handleToggleType(qType)}
                className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 cursor-pointer select-none relative group ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                    {qType}
                  </span>
                  <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                    isSelected ? 'bg-white text-indigo-600 border-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9.5px] pt-1 border-t border-black/5 dark:border-white/5">
                  <span className={`font-semibold ${isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-400'}`}>
                    {hint.marks}
                  </span>
                  {isStandardForSubject ? (
                    <span className={`px-1.5 py-0.2 rounded font-black tracking-wide ${
                      isSelected ? 'bg-indigo-700/80 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      CBSE Standard
                    </span>
                  ) : (
                    <span className={`px-1.5 py-0.2 rounded font-medium ${
                      isSelected ? 'bg-indigo-700/50 text-indigo-100' : 'text-slate-400'
                    }`}>
                      Manual Extra
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
