/**
 * App.tsx
 * CONTROLS: Main application layout shell, global state, top header bar, view container routing, and modal overlays.
 */
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AIGeneratorView } from './components/AIGeneratorView';
import { QuestionBankView } from './components/QuestionBankView';
import { SettingsView } from './components/SettingsView';
import { SkillAssessmentsView } from './components/SkillAssessmentsView';
import { NcertPdfModule } from './components/NcertPdfModule';
import { QuestionModal } from './components/QuestionModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import { Question, SettingsState, GeneratorConfig } from './types';
import { DEFAULT_SETTINGS, DEFAULT_GENERATOR_CONFIG } from './lib/constants';
import {
  getAllQuestions,
  saveQuestionsBatch,
  saveQuestion,
  deleteQuestion,
  deleteQuestionsBatch,
  clearAllQuestions,
  getSettings,
  saveSettings as saveSettingsToDB,
  exportBackupJSON,
  importBackupJSON,
  getAllNcertBooks,
  NcertBook,
  repairMathFormulasInExistingDb,
} from './lib/db';
import { downloadXLSX } from './lib/exportUtils';

function parseTabFromHash(hash: string): NavTab | null {
  const clean = hash.replace(/^#/, '');
  if (clean === 'dashboard') return 'dashboard';
  if (clean === 'generator') return 'generator';
  if (clean === 'csv-generator' || clean === 'ncert-pdf') return 'csv-generator';
  if (clean === 'bank') return 'bank';
  if (clean === 'assessments' || clean === 'certification' || clean === 'skill-certification') return 'assessments';
  if (clean === 'settings') return 'settings';
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const parsed = parseTabFromHash(window.location.hash);
      if (parsed) return parsed;
    }
    return 'dashboard';
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [ncertBooks, setNcertBooks] = useState<NcertBook[]>([]);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>(DEFAULT_GENERATOR_CONFIG);

  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved');
  const [selectedQuestionModal, setSelectedQuestionModal] = useState<Question | null>(null);
  const [presetCount, setPresetCount] = useState<number | undefined>(undefined);
  const [initialBankFilter, setInitialBankFilter] = useState<{ key: string; val: string } | undefined>(undefined);

  // Initialize DB data on startup and listen to sync events
  useEffect(() => {
    async function loadInitialData() {
      // Run math & chemistry formula database sanitization and migration
      await repairMathFormulasInExistingDb();

      const loadedSettings = await getSettings();
      setSettings(loadedSettings);

      const loadedQuestions = await getAllQuestions();
      setQuestions(loadedQuestions);

      const loadedBooks = await getAllNcertBooks();
      setNcertBooks(loadedBooks || []);
    }
    loadInitialData();

    const handleBooksChanged = async () => {
      const reloadedBooks = await getAllNcertBooks();
      setNcertBooks(reloadedBooks || []);
    };

    window.addEventListener('ncert-books-changed', handleBooksChanged);

    const handleHashChange = () => {
      if (window.location.hash) {
        const parsed = parseTabFromHash(window.location.hash);
        if (parsed && parsed !== activeTab) {
          setActiveTab(parsed);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('ncert-books-changed', handleBooksChanged);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [activeTab]);

  // Sync theme with document class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Handle saving question modifications
  const handleUpdateQuestion = async (updated: Question) => {
    setSaveStatus('saving');
    await saveQuestion(updated);
    setQuestions(prev => prev.map(q => (q.id === updated.id ? updated : q)));
    setSaveStatus('saved');
  };

  const handleDeleteQuestion = async (id: string) => {
    setSaveStatus('saving');
    await deleteQuestion(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (selectedQuestionModal?.id === id) {
      setSelectedQuestionModal(null);
    }
    setSaveStatus('saved');
  };

  const handleDeleteBatch = async (ids: string[]) => {
    setSaveStatus('saving');
    await deleteQuestionsBatch(ids);
    const idSet = new Set(ids);
    setQuestions(prev => prev.filter(q => !idSet.has(q.id)));
    setSaveStatus('saved');
  };

  const handleDuplicateQuestion = async (q: Question) => {
    setSaveStatus('saving');
    const duplicate: Question = {
      ...q,
      id: `SM-2026-${String(questions.length + 1).padStart(4, '0')}`,
      question: `${q.question} (Copy)`,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    };
    await saveQuestion(duplicate);
    setQuestions(prev => [duplicate, ...prev]);
    setSaveStatus('saved');
  };

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all questions?')) {
      setSaveStatus('saving');
      await clearAllQuestions();
      setQuestions([]);
      setSaveStatus('saved');
    }
  };

  const handleOpenGeneratorWithPreset = (count: number) => {
    setPresetCount(count);
    setActiveTab('generator');
  };

  const handleNavigateToBankWithFilter = (filterKey: string, filterVal: string) => {
    setInitialBankFilter({ key: filterKey, val: filterVal });
    setActiveTab('bank');
  };

  const handleGenerationComplete = async (newQuestions: Question[]) => {
    setSaveStatus('saving');
    await saveQuestionsBatch(newQuestions);
    setQuestions(prev => [...newQuestions, ...prev]);
    setSaveStatus('saved');
    setActiveTab('bank');
  };

  const handleSaveSettings = async (newSettings: SettingsState) => {
    setSaveStatus('saving');
    await saveSettingsToDB(newSettings);
    setSettings(newSettings);
    setSaveStatus('saved');
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShikshaMitra_Question_Bank_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = async (jsonStr: string) => {
    setSaveStatus('saving');
    const result = await importBackupJSON(jsonStr);
    if (result.success) {
      const reloadedQuestions = await getAllQuestions();
      const reloadedSettings = await getSettings();
      setQuestions(reloadedQuestions);
      setSettings(reloadedSettings);
      setActiveTab('bank');
    }
    setSaveStatus('saved');
  };

  const activeQuestionsCount = questions.filter(q => q.active).length;

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-100/70 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 selection:bg-slate-700 selection:text-white">
      {/* 1. Locked Left Sidebar (Height: 100vh, Static Width) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPresetCount(undefined);
        }}
        questionCount={questions.length}
        bankName={settings.bankName}
      />

      {/* 2. Right Work Area (Firmly Locked Top Header, Independently Scrolling Content) */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950">
        {/* Top Navbar / Dashboard Header locked at the top */}
        <div className="shrink-0 sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <Header
            settings={settings}
            onUpdateSettings={(updated) => handleSaveSettings({ ...settings, ...updated })}
            totalCount={questions.length}
            activeCount={activeQuestionsCount}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (activeTab !== 'bank') setActiveTab('bank');
            }}
            saveStatus={saveStatus}
            onClearAllData={handleClearAllData}
            onOpenGenerator={() => {
              setPresetCount(100);
              setActiveTab('generator');
            }}
          />
        </div>

        {/* Independently Scrolling Main Content Container */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary fallbackTitle="Workspace Safe Mode">
            {activeTab === 'dashboard' && (
              <DashboardView
                questions={questions}
                onOpenGeneratorWithPreset={handleOpenGeneratorWithPreset}
                onNavigateToBankWithFilter={handleNavigateToBankWithFilter}
              />
            )}

            {activeTab === 'generator' && (
              <AIGeneratorView
                initialConfig={generatorConfig}
                existingQuestions={questions}
                onGenerationComplete={handleGenerationComplete}
                presetCount={presetCount}
              />
            )}

            {activeTab === 'bank' && (
              <QuestionBankView
                questions={questions}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onUpdateQuestion={handleUpdateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onDeleteBatch={handleDeleteBatch}
                onDuplicateQuestion={handleDuplicateQuestion}
                onOpenQuestionModal={(q) => setSelectedQuestionModal(q)}
                onExportSelected={(selectedList) => downloadXLSX(selectedList)}
                initialFilter={initialBankFilter}
              />
            )}

            {activeTab === 'assessments' && (
              <SkillAssessmentsView />
            )}

            {activeTab === 'csv-generator' && (
              <NcertPdfModule />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onExportBackup={handleExportBackup}
                onRestoreBackup={handleRestoreBackup}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Modal View */}
      {selectedQuestionModal && (
        <QuestionModal
          question={selectedQuestionModal}
          onClose={() => setSelectedQuestionModal(null)}
          onSave={(updated) => {
            handleUpdateQuestion(updated);
            setSelectedQuestionModal(null);
          }}
          onDelete={(id) => {
            handleDeleteQuestion(id);
            setSelectedQuestionModal(null);
          }}
          onDuplicate={(q) => {
            handleDuplicateQuestion(q);
            setSelectedQuestionModal(null);
          }}
        />
      )}
    </div>
  );
}
