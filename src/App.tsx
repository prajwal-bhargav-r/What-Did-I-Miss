import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  AlertTriangle,
  CheckSquare,
  Calendar,
  UserCheck,
  ListFilter,
  Sparkles,
  ShieldCheck,
  Upload,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  ActiveNavSection,
  ConversationRecord,
  PriorityLevel,
  QATurn,
  TaskStatus,
  UserProfile,
} from './types/chat';
import { SAMPLE_CONVERSATIONS } from './data/sampleConversations';
import {
  analyzeConversationLocal,
  generateGroqConversationSummary,
} from './services/localAiEngine';
import {
  deleteLocalConversation,
  loadAllLocalConversations,
  loadUserProfile,
  saveConversationLocally,
  saveUserProfile,
  wipeAllLocalData,
} from './services/storageService';
import { ImportModal } from './components/ImportModal';
import { SourceContextModal } from './components/SourceContextModal';
import { DashboardView } from './components/DashboardView';
import { ConversationsView } from './components/ConversationsView';
import { ImportantMessagesView } from './components/ImportantMessagesView';
import { ActionItemsView } from './components/ActionItemsView';
import { DeadlinesView } from './components/DeadlinesView';
import { PersonalMentionsView } from './components/PersonalMentionsView';
import { AllMessagesView } from './components/AllMessagesView';
import { AskAiView } from './components/AskAiView';
import { PrivacySettingsView } from './components/PrivacySettingsView';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<ActiveNavSection>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [inspectMessageId, setInspectMessageId] = useState<string | null>(null);
  const [highlightedTranscriptMsgId, setHighlightedTranscriptMsgId] = useState<string | null>(
    null
  );
  const [importantPriorityFilter, setImportantPriorityFilter] = useState<
    'all_important' | 'high' | 'medium'
  >('all_important');
  const [allMsgsPriorityFilter, setAllMsgsPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isSynthesizingGroq, setIsSynthesizingGroq] = useState<boolean>(false);

  // Initialize from IndexedDB or load representative sample conversations
  useEffect(() => {
    let mounted = true;
    async function init() {
      setIsLoading(true);
      const profile = loadUserProfile();
      const stored = await loadAllLocalConversations();

      if (!mounted) return;

      if (stored.length > 0) {
        const upgraded = stored.map((conv) => {
          const fresh = analyzeConversationLocal(
            conv.rawText,
            conv.name,
            conv.sourceType,
            profile,
            conv.fileName,
            conv.id
          );
          const taskStatusMap = new Map((conv.actionItems || []).map((t) => [t.id, t.status]));
          fresh.actionItems = fresh.actionItems.map((t) => ({
            ...t,
            status: taskStatusMap.get(t.id) || t.status,
          }));
          const confirmedDateMap = new Map(
            (conv.deadlines || [])
              .filter((d) => d.userConfirmedDate)
              .map((d) => [d.id, d.userConfirmedDate!])
          );
          fresh.deadlines = fresh.deadlines.map((d) =>
            confirmedDateMap.has(d.id)
              ? {
                  ...d,
                  userConfirmedDate: confirmedDateMap.get(d.id)!,
                  isConfirmed: true,
                }
              : d
          );
          fresh.qaHistory = conv.qaHistory || [];
          fresh.createdAt = conv.createdAt || fresh.createdAt;
          return fresh;
        });
        setConversations(upgraded);
        setActiveConversationId(upgraded[0].id);
        if (profile.persistLocally) {
          for (const rec of upgraded) {
            await saveConversationLocally(rec);
          }
        }
      } else {
        const seeded = SAMPLE_CONVERSATIONS.map((preset) =>
          analyzeConversationLocal(
            preset.rawText,
            preset.name,
            'sample',
            profile,
            undefined,
            preset.id
          )
        );
        setConversations(seeded);
        setActiveConversationId(seeded[0].id);

        if (profile.persistLocally) {
          for (const rec of seeded) {
            await saveConversationLocally(rec);
          }
        }
      }
      setIsLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;

  const persistIfEnabled = useCallback(
    async (record: ConversationRecord, profile: UserProfile) => {
      if (profile.persistLocally) {
        await saveConversationLocally(record);
      }
    },
    []
  );

  // Synthesize or refresh summary using Groq Cloud LLM
  const handleSynthesizeWithGroq = useCallback(
    async (targetConv?: ConversationRecord, profileOverride?: UserProfile) => {
      const conv = targetConv || activeConversation;
      const prof = profileOverride || userProfile;
      if (!conv || isSynthesizingGroq) return;

      setIsSynthesizingGroq(true);
      try {
        const groqResult = await generateGroqConversationSummary(conv, prof);
        const updatedConv: ConversationRecord = {
          ...conv,
          updatedAt: new Date().toISOString(),
          summary: {
            ...conv.summary,
            overallBrief: groqResult.overallBrief,
            veryShort: groqResult.veryShort,
            standard: groqResult.standard,
            detailed: groqResult.detailed,
            summaryEngineUsed: groqResult.engineUsed,
          },
        };
        setConversations((prev) =>
          prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
        );
        await persistIfEnabled(updatedConv, prof);
      } catch {
        // Keep local summary if Groq API is unavailable
      } finally {
        setIsSynthesizingGroq(false);
      }
    },
    [activeConversation, isSynthesizingGroq, persistIfEnabled, userProfile]
  );

  // Import a new chat conversation
  const handleImportConversation = async (
    name: string,
    rawText: string,
    sourceType: 'file' | 'paste' | 'sample',
    fileName?: string
  ) => {
    const analyzed = analyzeConversationLocal(
      rawText,
      name,
      sourceType,
      userProfile,
      fileName
    );
    setConversations((prev) => [analyzed, ...prev]);
    setActiveConversationId(analyzed.id);
    setActiveSection('dashboard');
    await persistIfEnabled(analyzed, userProfile);

    if (userProfile.useGroqAI !== false) {
      void handleSynthesizeWithGroq(analyzed, userProfile);
    }
  };

  // Update User Profile (Name, Aliases, Followed Keywords, Persistence Settings)
  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    saveUserProfile(updatedProfile);

    const reanalyzed = conversations.map((conv) => {
      const fresh = analyzeConversationLocal(
        conv.rawText,
        conv.name,
        conv.sourceType,
        updatedProfile,
        conv.fileName,
        conv.id
      );

      const taskStatusMap = new Map(conv.actionItems.map((t) => [t.id, t.status]));
      fresh.actionItems = fresh.actionItems.map((t) => ({
        ...t,
        status: taskStatusMap.get(t.id) || t.status,
      }));

      const confirmedDateMap = new Map(
        conv.deadlines
          .filter((d) => d.userConfirmedDate)
          .map((d) => [d.id, d.userConfirmedDate!])
      );
      fresh.deadlines = fresh.deadlines.map((d) =>
        confirmedDateMap.has(d.id)
          ? {
              ...d,
              userConfirmedDate: confirmedDateMap.get(d.id)!,
              isConfirmed: true,
            }
          : d
      );

      fresh.qaHistory = conv.qaHistory;
      return fresh;
    });

    setConversations(reanalyzed);

    if (updatedProfile.persistLocally) {
      for (const rec of reanalyzed) {
        await saveConversationLocally(rec);
      }
    }
  };

  // Update Action Item Status (Pending / Completed / Saved for Later)
  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!activeConversation) return;
    const updatedConv: ConversationRecord = {
      ...activeConversation,
      updatedAt: new Date().toISOString(),
      actionItems: activeConversation.actionItems.map((t) =>
        t.id === taskId ? { ...t, status } : t
      ),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    await persistIfEnabled(updatedConv, userProfile);
  };

  // Confirm Ambiguous Deadline Date
  const handleConfirmDeadlineDate = async (deadlineId: string, confirmedDate: string) => {
    if (!activeConversation) return;
    const updatedConv: ConversationRecord = {
      ...activeConversation,
      updatedAt: new Date().toISOString(),
      deadlines: activeConversation.deadlines.map((d) =>
        d.id === deadlineId
          ? {
              ...d,
              userConfirmedDate: confirmedDate,
              isConfirmed: true,
            }
          : d
      ),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    await persistIfEnabled(updatedConv, userProfile);
  };

  // Append Ask AI Q&A turn
  const handleAppendQATurn = async (turn: QATurn) => {
    if (!activeConversation) return;
    const updatedConv: ConversationRecord = {
      ...activeConversation,
      updatedAt: new Date().toISOString(),
      qaHistory: [turn, ...activeConversation.qaHistory],
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    await persistIfEnabled(updatedConv, userProfile);
  };

  // Clear Q&A History
  const handleClearQAHistory = async () => {
    if (!activeConversation) return;
    const updatedConv: ConversationRecord = {
      ...activeConversation,
      updatedAt: new Date().toISOString(),
      qaHistory: [],
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    await persistIfEnabled(updatedConv, userProfile);
  };

  // Delete a single conversation
  const handleDeleteConversation = async (id: string) => {
    await deleteLocalConversation(id);
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeConversationId === id) {
      setActiveConversationId(remaining[0]?.id || '');
    }
  };

  // Wipe all local data
  const handleWipeAllData = async () => {
    await wipeAllLocalData();
    setConversations([]);
    setActiveConversationId('');
  };

  // Navigation helper with optional priority filter
  const handleNavigate = (
    section: ActiveNavSection,
    filterPriority?: 'high' | 'medium' | 'low'
  ) => {
    if (section === 'important') {
      if (filterPriority === 'high' || filterPriority === 'medium') {
        setImportantPriorityFilter(filterPriority);
      } else {
        setImportantPriorityFilter('all_important');
      }
    }
    if (section === 'all_messages') {
      if (filterPriority) {
        setAllMsgsPriorityFilter(filterPriority);
      } else {
        setAllMsgsPriorityFilter('all');
      }
    }
    setActiveSection(section);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Jump directly to a message inside the full transcript
  const handleJumpToTranscript = (messageId: string) => {
    setHighlightedTranscriptMsgId(messageId);
    setAllMsgsPriorityFilter('all');
    setActiveSection('all_messages');
  };

  const navItems: {
    id: ActiveNavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
    highlight?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'conversations',
      label: 'Conversations',
      icon: MessageSquare,
      count: conversations.length,
    },
    {
      id: 'important',
      label: 'Important Messages',
      icon: AlertTriangle,
      count: activeConversation
        ? activeConversation.stats.highPriorityCount +
          activeConversation.stats.mediumPriorityCount
        : 0,
      highlight: Boolean(
        activeConversation && activeConversation.stats.highPriorityCount > 0
      ),
    },
    {
      id: 'actions',
      label: 'Action Items',
      icon: CheckSquare,
      count: activeConversation
        ? activeConversation.actionItems.filter((t) => t.status === 'pending').length
        : 0,
    },
    {
      id: 'deadlines',
      label: 'Deadlines & Events',
      icon: Calendar,
      count: activeConversation ? activeConversation.deadlines.length : 0,
    },
    {
      id: 'mentions',
      label: 'Important for You',
      icon: UserCheck,
      count: activeConversation ? activeConversation.personalMentions.length : 0,
    },
    {
      id: 'all_messages',
      label: 'All Messages',
      icon: ListFilter,
      count: activeConversation ? activeConversation.stats.totalMessages : 0,
    },
    {
      id: 'ask_ai',
      label: 'Ask AI',
      icon: Sparkles,
    },
    {
      id: 'privacy',
      label: 'Privacy & Settings',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-neutral-200 bg-white/95 px-6 py-3.5 backdrop-blur-xs">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate('dashboard');
          }}
          className="font-display text-lg font-bold tracking-tight text-neutral-950 whitespace-nowrap shrink-0"
        >
          What Did I Miss?
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-500">
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('dashboard');
            }}
            className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'dashboard'
                ? 'text-neutral-950 font-semibold underline underline-offset-8 decoration-neutral-950 decoration-2'
                : ''
            }`}
          >
            Dashboard
          </a>
          <a
            href="#important"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('important');
            }}
            className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'important'
                ? 'text-neutral-950 font-semibold underline underline-offset-8 decoration-neutral-950 decoration-2'
                : ''
            }`}
          >
            Important
          </a>
          <a
            href="#actions"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('actions');
            }}
            className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'actions'
                ? 'text-neutral-950 font-semibold underline underline-offset-8 decoration-neutral-950 decoration-2'
                : ''
            }`}
          >
            Action Items
          </a>
          <a
            href="#deadlines"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('deadlines');
            }}
            className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'deadlines'
                ? 'text-neutral-950 font-semibold underline underline-offset-8 decoration-neutral-950 decoration-2'
                : ''
            }`}
          >
            Deadlines
          </a>
          <a
            href="#ask-ai"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('ask_ai');
            }}
            className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'ask_ai'
                ? 'text-neutral-950 font-semibold underline underline-offset-8 decoration-neutral-950 decoration-2'
                : ''
            }`}
          >
            Ask AI
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
          >
            Import Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:text-neutral-950"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      isActive ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Workspace Layout: Sidebar + Content Viewport */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar Navigation (272px) */}
        <aside className="hidden md:flex w-68 shrink-0 flex-col justify-between border-r border-neutral-200 bg-white p-4">
          <div className="space-y-6">
            {/* Active Conversation Switcher */}
            {conversations.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-xs text-neutral-500">
                  <span className="font-medium">Active Conversation</span>
                  <button
                    type="button"
                    onClick={() => handleNavigate('conversations')}
                    className="text-neutral-950 font-medium hover:underline"
                  >
                    Switch ({conversations.length})
                  </button>
                </div>
                <select
                  value={activeConversation?.id || ''}
                  onChange={(e) => setActiveConversationId(e.target.value)}
                  aria-label="Select active conversation"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-900 focus:border-neutral-950 focus:outline-none truncate"
                >
                  {conversations.map((conv) => (
                    <option key={conv.id} value={conv.id}>
                      {conv.name} ({conv.stats.totalMessages})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Primary Sidebar Links */}
            <nav className="space-y-1" aria-label="Workspace sections">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-neutral-950 text-white font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? 'text-white'
                            : item.highlight
                            ? 'text-neutral-950'
                            : 'text-neutral-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.count !== undefined && (
                      <span
                        className={`font-mono tabular-nums text-xs ml-2 ${
                          isActive
                            ? 'text-neutral-300'
                            : item.highlight
                            ? 'text-neutral-950 font-semibold'
                            : 'text-neutral-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Privacy Guarantee Footer inside Sidebar */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-neutral-950">
              <ShieldCheck className="h-4 w-4 text-neutral-900 shrink-0" />
              <span>Local-First Guarantee</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              Chats are parsed and summarized strictly inside your browser. Zero messages leave your device.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('privacy')}
              className="text-neutral-950 hover:underline font-semibold inline-flex items-center gap-1 pt-0.5"
            >
              <span>Inspect Storage</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-6 lg:p-8">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-20 rounded-xl bg-white border border-neutral-200 animate-pulse" />
              <div className="h-64 rounded-xl bg-white border border-neutral-200 animate-pulse" />
            </div>
          ) : !activeConversation && activeSection !== 'privacy' ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center space-y-4 max-w-xl mx-auto my-8">
              <h1 className="text-2xl font-bold text-neutral-950">What Did I Miss?</h1>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Import a WhatsApp or text group chat export, paste copied messages, or load one of the sample conversations to extract announcements, tasks, and deadlines 100% locally on your device.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-neutral-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import or Load Sample Chat</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeSection === 'dashboard' && activeConversation && (
                <DashboardView
                  conversation={activeConversation}
                  userProfile={userProfile}
                  isSynthesizingGroq={isSynthesizingGroq}
                  onSynthesizeWithGroq={() => void handleSynthesizeWithGroq()}
                  onOpenImport={() => setIsImportModalOpen(true)}
                  onNavigate={handleNavigate}
                  onInspectMessage={(msgId) => setInspectMessageId(msgId)}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onConfirmDeadlineDate={handleConfirmDeadlineDate}
                />
              )}

              {activeSection === 'conversations' && (
                <ConversationsView
                  conversations={conversations}
                  activeConversationId={activeConversation?.id || ''}
                  onSelectConversation={(id) => {
                    setActiveConversationId(id);
                    setActiveSection('dashboard');
                  }}
                  onDeleteConversation={handleDeleteConversation}
                  onOpenImport={() => setIsImportModalOpen(true)}
                />
              )}

              {activeSection === 'important' && activeConversation && (
                <ImportantMessagesView
                  conversation={activeConversation}
                  initialPriorityFilter={importantPriorityFilter}
                  onInspectMessage={(msgId) => setInspectMessageId(msgId)}
                  onJumpToTranscript={handleJumpToTranscript}
                />
              )}

              {activeSection === 'actions' && activeConversation && (
                <ActionItemsView
                  conversation={activeConversation}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onInspectMessage={(msgId) => setInspectMessageId(msgId)}
                  onJumpToTranscript={handleJumpToTranscript}
                />
              )}

              {activeSection === 'deadlines' && activeConversation && (
                <DeadlinesView
                  conversation={activeConversation}
                  onConfirmDeadlineDate={handleConfirmDeadlineDate}
                  onInspectMessage={(msgId) => setInspectMessageId(msgId)}
                  onJumpToTranscript={handleJumpToTranscript}
                />
              )}

              {activeSection === 'mentions' && activeConversation && (
                <PersonalMentionsView
                  conversation={activeConversation}
                  userProfile={userProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onInspectMessage={(msgId) => setInspectMessageId(msgId)}
                  onJumpToTranscript={handleJumpToTranscript}
                />
              )}

              {activeSection === 'all_messages' && activeConversation && (
                <AllMessagesView
                  conversation={activeConversation}
                  highlightedMessageId={highlightedTranscriptMsgId}
                  initialPriorityFilter={allMsgsPriorityFilter}
                  onClearHighlight={() => setHighlightedTranscriptMsgId(null)}
                  onInspectMessage={(msgId) => setInspectMessageId(msgId)}
                />
              )}

              {activeSection === 'ask_ai' && activeConversation && (
                <AskAiView
                  conversation={activeConversation}
                  userProfile={userProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onAppendQATurn={handleAppendQATurn}
                  onClearQAHistory={handleClearQAHistory}
                  onInspectMessage={(msgId) => setInspectMessageId(msgId)}
                  onJumpToTranscript={handleJumpToTranscript}
                />
              )}

              {activeSection === 'privacy' && (
                <PrivacySettingsView
                  conversations={conversations}
                  userProfile={userProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onWipeAllData={handleWipeAllData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportText={handleImportConversation}
      />

      {activeConversation && (
        <SourceContextModal
          targetMessageId={inspectMessageId}
          messages={activeConversation.messages}
          onClose={() => setInspectMessageId(null)}
          onJumpToTranscript={handleJumpToTranscript}
        />
      )}
    </div>
  );
}
