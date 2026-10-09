import React, { useState } from 'react';
import {
  Upload,
  AlertTriangle,
  Bookmark,
  Sparkles,
  ArrowRight,
  Check,
  Shield,
} from 'lucide-react';
import {
  ActiveNavSection,
  ConversationRecord,
  SummaryLength,
  TaskStatus,
  UserProfile,
} from '../types/chat';

interface DashboardViewProps {
  conversation: ConversationRecord;
  userProfile: UserProfile;
  onOpenImport: () => void;
  onNavigate: (section: ActiveNavSection, filterPriority?: 'high' | 'medium' | 'low') => void;
  onInspectMessage: (messageId: string) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onConfirmDeadlineDate: (deadlineId: string, confirmedDate: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  conversation,
  userProfile,
  onOpenImport,
  onNavigate,
  onInspectMessage,
  onUpdateTaskStatus,
  onConfirmDeadlineDate,
}) => {
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('standard');
  const [customDateInputs, setCustomDateInputs] = useState<Record<string, string>>({});

  const summaryItems =
    summaryLength === 'very_short'
      ? conversation.summary.veryShort
      : summaryLength === 'standard'
      ? conversation.summary.standard
      : conversation.summary.detailed;

  const pendingTasksCount = conversation.actionItems.filter((t) => t.status === 'pending').length;
  const ambiguousDeadlinesCount = conversation.deadlines.filter(
    (d) => d.resolutionType === 'ambiguous' && !d.isConfirmed
  ).length;

  // Helper to turn inline "#12" message references in summary lines into clickable source inspection links
  const renderSummaryLineWithLinks = (line: string) => {
    const parts = line.split(/(#\d+)/g);
    return parts.map((part, idx) => {
      const m = part.match(/^#(\d+)$/);
      if (m) {
        const msgNum = parseInt(m[1], 10);
        const target = conversation.messages.find((msg) => msg.index === msgNum);
        if (target) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onInspectMessage(target.id)}
              className="font-mono font-bold text-neutral-950 underline decoration-neutral-400 hover:decoration-neutral-950 mx-0.5"
              title={`Inspect original message #${msgNum}`}
            >
              {part}
            </button>
          );
        }
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-8">
      {/* 1 & 2 & 3: Welcome Hero Header + Prominent Import & Ask AI CTAs */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-neutral-200 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Shield className="h-3.5 w-3.5 text-neutral-900" />
            <span className="font-medium text-neutral-700">100% On-Device Privacy Architecture</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{conversation.stats.detectedFormat}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Analyzed in {conversation.stats.processingTimeMs}ms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
            What Did I Miss?
          </h1>
          <p className="text-sm sm:text-base text-neutral-600">
            Catch up on what matters. Skip the noise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('ask_ai')}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-medium text-neutral-900 hover:border-neutral-950 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-4 w-4 text-neutral-900" />
            <span>Ask Questions About Chat</span>
          </button>
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4" />
            <span>Import Conversation</span>
          </button>
        </div>
      </section>

      {/* Results View Section Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'dashboard', label: 'Summary Overview' },
            {
              id: 'important',
              label: `Important Messages (${
                conversation.stats.highPriorityCount + conversation.stats.mediumPriorityCount
              })`,
            },
            { id: 'actions', label: `Action Items (${conversation.actionItems.length})` },
            { id: 'deadlines', label: `Deadlines & Events (${conversation.deadlines.length})` },
            { id: 'mentions', label: `Personal Mentions (${conversation.personalMentions.length})` },
            { id: 'all_messages', label: `All Messages (${conversation.stats.totalMessages})` },
            { id: 'ask_ai', label: 'Ask AI' },
          ] as { id: ActiveNavSection; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              tab.id === 'dashboard'
                ? 'border-neutral-950 bg-neutral-950 text-white font-semibold'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-950'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5 & 6: Active Conversation Metadata & Priority Count Strip */}
      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-950">{conversation.name}</h2>
            <span aria-hidden="true" className="text-neutral-400">·</span>
            <span className="text-xs text-neutral-600 font-mono tabular-nums">
              {conversation.stats.participants.length} participants
            </span>
            {conversation.stats.dateRange.start && (
              <>
                <span aria-hidden="true" className="text-neutral-400">·</span>
                <span className="text-xs text-neutral-600 font-mono tabular-nums">
                  {conversation.stats.dateRange.start === conversation.stats.dateRange.end
                    ? conversation.stats.dateRange.start
                    : `${conversation.stats.dateRange.start} — ${conversation.stats.dateRange.end}`}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('all_messages')}
            className="text-xs font-semibold text-neutral-950 hover:underline flex items-center gap-1 self-start sm:self-center whitespace-nowrap shrink-0"
          >
            <span>Inspect Full Transcript</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
          {/* Total Detected Messages */}
          <button
            type="button"
            onClick={() => onNavigate('all_messages')}
            className="p-5 text-left hover:bg-neutral-50 transition-colors"
          >
            <div className="text-xs font-medium text-neutral-500">Detected Messages</div>
            <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-neutral-950">
              {conversation.stats.totalMessages}
            </div>
            <div className="mt-1 text-xs text-neutral-500 font-mono tabular-nums">
              {conversation.stats.userMessages} chat · {conversation.stats.duplicateMessages} duplicate · {conversation.stats.systemMessages} system
            </div>
          </button>

          {/* High Priority Count */}
          <button
            type="button"
            onClick={() => onNavigate('important', 'high')}
            className="p-5 text-left hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-neutral-950">
              <span className="font-semibold">High Priority</span>
              <AlertTriangle className="h-3.5 w-3.5 text-neutral-950" />
            </div>
            <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-neutral-950">
              {conversation.stats.highPriorityCount}
            </div>
            <div className="mt-1 text-xs text-neutral-600">
              Urgent announcements, exams & immediate actions
            </div>
          </button>

          {/* Medium Priority Count */}
          <button
            type="button"
            onClick={() => onNavigate('important', 'medium')}
            className="p-5 text-left hover:bg-neutral-50 transition-colors"
          >
            <div className="text-xs font-medium text-neutral-700">Medium Priority</div>
            <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-neutral-900">
              {conversation.stats.mediumPriorityCount}
            </div>
            <div className="mt-1 text-xs text-neutral-600">
              Assignments, project decisions & open questions
            </div>
          </button>

          {/* Low Priority Count */}
          <button
            type="button"
            onClick={() => onNavigate('all_messages', 'low')}
            className="p-5 text-left hover:bg-neutral-50 transition-colors"
          >
            <div className="text-xs font-medium text-neutral-500">Low Priority / Noise</div>
            <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-neutral-500">
              {conversation.stats.lowPriorityCount}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Casual chat, jokes & repeated reminders preserved
            </div>
          </button>
        </div>
      </section>

      {/* 4. AI-Powered Conversation Summary with Selectable Length */}
      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">Conversation Summary</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Synthesized locally from {conversation.stats.userMessages} messages · Click any #message reference to inspect original evidence
            </p>
          </div>

          {/* Interactive Length Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 border border-neutral-200 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setSummaryLength('very_short')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                summaryLength === 'very_short'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Very Short
            </button>
            <button
              type="button"
              onClick={() => setSummaryLength('standard')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                summaryLength === 'standard'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setSummaryLength('detailed')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                summaryLength === 'detailed'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Short Overall Summary */}
          {conversation.summary.overallBrief && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-1">
              <div className="text-xs font-semibold text-neutral-950">
                Short Overall Summary
              </div>
              <p className="text-sm leading-relaxed text-neutral-800">
                {renderSummaryLineWithLinks(conversation.summary.overallBrief)}
              </p>
            </div>
          )}

          {/* Executive Summary Bullets with Clickable #Message Citations */}
          <ul className="space-y-2.5 text-sm leading-relaxed text-neutral-800">
            {summaryItems.map((line, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-neutral-950 mt-1 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}.
                </span>
                <span>{renderSummaryLineWithLinks(line)}</span>
              </li>
            ))}
          </ul>

          {/* Main Topics, Decisions & Unanswered Questions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-neutral-200 pt-6">
            {/* Main Topics Discussed */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-950">
                Main Topics Discussed ({conversation.summary.mainTopics.length})
              </h3>
              <div className="divide-y divide-neutral-200 text-xs">
                {conversation.summary.mainTopics.map((topic) => (
                  <div key={topic.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-sm font-medium text-neutral-950">
                      <span>{topic.topic}</span>
                      <span className="font-mono text-xs tabular-nums text-neutral-500">
                        {topic.messageCount} msg{topic.messageCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-700 line-clamp-2">{topic.summary}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
                      <span>Active: {topic.participants.join(', ')}</span>
                      {topic.keyMessageIds[0] && (
                        <>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => onInspectMessage(topic.keyMessageIds[0])}
                            className="text-neutral-950 font-semibold hover:underline whitespace-nowrap shrink-0"
                          >
                            Source
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Significant Decisions & Revisions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-950">
                Decisions & Plan Changes ({conversation.summary.decisions.length})
              </h3>
              {conversation.summary.decisions.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No formal decisions or explicit agreements detected in this conversation.
                </p>
              ) : (
                <div className="divide-y divide-neutral-200 text-xs">
                  {conversation.summary.decisions.map((dec) => {
                    const isSuperseded = Boolean(dec.supersededByIndex);
                    const supersededMsg = dec.supersededByIndex
                      ? conversation.messages.find((m) => m.index === dec.supersededByIndex)
                      : null;
                    const supersedesMsg = dec.supersedesIndex
                      ? conversation.messages.find((m) => m.index === dec.supersedesIndex)
                      : null;

                    return (
                      <div key={dec.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isSuperseded ? (
                            <span className="text-amber-700 font-semibold">
                              Outdated / Superseded Plan
                            </span>
                          ) : dec.supersedesIndex || dec.changeSummary ? (
                            <span className="text-neutral-950 font-bold">
                              Updated Decision / Revision
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">
                              Explicit Decision
                            </span>
                          )}
                          {dec.supersedesIndex && supersedesMsg && (
                            <button
                              type="button"
                              onClick={() => onInspectMessage(supersedesMsg.id)}
                              className="font-mono text-neutral-700 underline hover:text-neutral-950"
                            >
                              (Supersedes #{dec.supersedesIndex})
                            </button>
                          )}
                          {dec.supersededByIndex && supersededMsg && (
                            <button
                              type="button"
                              onClick={() => onInspectMessage(supersededMsg.id)}
                              className="font-mono text-amber-800 underline hover:text-neutral-950"
                            >
                              (Replaced by #{dec.supersededByIndex})
                            </button>
                          )}
                        </div>

                        {dec.changeSummary && !isSuperseded && (
                          <p className="font-medium text-neutral-900 bg-neutral-100 px-2 py-1 rounded">
                            {dec.changeSummary}
                          </p>
                        )}

                        <p
                          className={`text-sm leading-relaxed ${
                            isSuperseded
                              ? 'line-through text-neutral-400'
                              : 'text-neutral-800'
                          }`}
                        >
                          {dec.text}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <span className="font-medium text-neutral-950">{dec.sender}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{dec.timestampRaw}</span>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => onInspectMessage(dec.messageId)}
                            className="text-neutral-950 font-semibold hover:underline font-mono tabular-nums whitespace-nowrap shrink-0"
                          >
                            Verify #{dec.messageIndex}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unanswered Questions & Messages Requiring Response */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-950">
                Requires Response / Unanswered ({conversation.summary.unansweredQuestions.length})
              </h3>
              {conversation.summary.unansweredQuestions.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  All detected questions appear to have received follow-up responses.
                </p>
              ) : (
                <div className="divide-y divide-neutral-200 text-xs">
                  {conversation.summary.unansweredQuestions.map((uq) => (
                    <div key={uq.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <p className="text-sm text-neutral-800 leading-relaxed">“{uq.question}”</p>
                      <p className="text-xs text-neutral-500">{uq.contextNote}</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="font-medium text-neutral-950">{uq.sender}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{uq.timestampRaw}</span>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => onInspectMessage(uq.messageId)}
                          className="text-neutral-950 font-semibold hover:underline font-mono tabular-nums whitespace-nowrap shrink-0"
                        >
                          Inspect #{uq.messageIndex}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Section: 7. Important Announcements & 10. Personal Mentions ("Important for You") */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 7. Important Announcements */}
        <section className="rounded-xl border border-neutral-200 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">Important Announcements</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  High-urgency updates, exam schedules & critical instructions
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('important')}
                className="text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
              >
                View All ({conversation.summary.announcements.length})
              </button>
            </div>

            {conversation.summary.announcements.length === 0 ? (
              <div className="p-6 text-xs text-neutral-500">
                No urgent announcements detected in this conversation.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {conversation.summary.announcements.slice(0, 4).map((ann) => (
                  <div key={ann.id} className="p-5 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-neutral-500">
                        <span
                          className={
                            ann.priority === 'high'
                              ? 'font-bold text-neutral-950'
                              : 'font-medium text-neutral-700'
                          }
                        >
                          {ann.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-neutral-900">{ann.sender}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{ann.timestampRaw}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onInspectMessage(ann.messageId)}
                        className="font-mono tabular-nums text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
                      >
                        Source #{ann.messageIndex}
                      </button>
                    </div>
                    {ann.changeSummary && (
                      <div className="mt-2 text-xs font-medium text-neutral-900 bg-neutral-100 border border-neutral-200 rounded px-2.5 py-1">
                        Schedule / Plan Change: {ann.changeSummary}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-neutral-900 leading-relaxed whitespace-pre-wrap">
                      {ann.text}
                    </p>
                    <p className="mt-2 text-xs text-neutral-600">
                      <span className="text-neutral-900 font-medium">Why important:</span> {ann.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 10. Personal Mentions ("Important for You") */}
        <section className="rounded-xl border border-neutral-200 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">Important for You</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Tracking mentions for <span className="text-neutral-950 font-semibold">{userProfile.userName || 'Not set'}</span> & {userProfile.followedTopics.length} followed topics
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('mentions')}
                className="text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
              >
                Configure / View All ({conversation.personalMentions.length})
              </button>
            </div>

            {conversation.personalMentions.length === 0 ? (
              <div className="p-6 space-y-3">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  No direct mentions of “{userProfile.userName}” or your followed keywords were found in this conversation.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('mentions')}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:border-neutral-950 transition-colors"
                >
                  Update Your Name & Keywords
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {conversation.personalMentions.slice(0, 4).map((mention) => (
                  <div key={mention.id} className="p-5 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-neutral-500">
                        <span className="font-bold text-neutral-950">
                          {mention.type === 'assigned_task'
                            ? 'Task Assigned to You'
                            : mention.type === 'direct_question'
                            ? 'Question for You'
                            : mention.type === 'requires_response'
                            ? 'Requires Your Response'
                            : mention.type === 'direct_mention'
                            ? 'Direct Mention'
                            : mention.type === 'reply_to_user'
                            ? 'Reply to Your Message'
                            : `Topic: ${mention.matchedTerm}`}
                        </span>
                        {mention.requiresResponse && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-700">Needs Response</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-neutral-900">{mention.sender}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{mention.timestampRaw}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onInspectMessage(mention.messageId)}
                        className="font-mono tabular-nums text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
                      >
                        Source #{mention.messageIndex}
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-neutral-900 leading-relaxed">
                      {mention.content}
                    </p>
                    <p className="mt-1.5 text-xs text-neutral-600">{mention.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 8. Upcoming Deadlines & Events */}
      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">
              Upcoming Deadlines, Dates & Schedule Changes
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Chronological event timeline · Distinguishes explicit dates, resolved relative dates & ambiguous dates{ambiguousDeadlinesCount > 0 ? ` (${ambiguousDeadlinesCount} need confirmation)` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('deadlines')}
            className="text-xs font-semibold text-neutral-950 hover:underline self-start sm:self-center whitespace-nowrap shrink-0"
          >
            Open Deadlines View ({conversation.deadlines.length})
          </button>
        </div>

        {conversation.deadlines.length === 0 ? (
          <div className="p-6 text-xs text-neutral-500">
            No explicit or relative dates, exams, or deadlines were detected in this chat.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {conversation.deadlines.map((dl) => (
              <div key={dl.id} className="p-5 hover:bg-neutral-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold tabular-nums text-neutral-950">
                        {dl.userConfirmedDate || dl.displayDate}
                      </span>
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                      <span className="capitalize text-neutral-900 font-medium">
                        {dl.category.replace('_', ' ')}
                      </span>
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                      <span
                        className={
                          dl.isConfirmed
                            ? 'text-emerald-700 font-medium'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {dl.userConfirmedDate
                          ? 'Confirmed by You'
                          : dl.resolutionType === 'explicit'
                          ? 'Explicitly Stated Date'
                          : dl.resolutionType === 'relative_resolved'
                          ? `Resolved from "${dl.rawDateExpression}"`
                          : 'Ambiguous Date — Confirmation Needed'}
                      </span>
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                      <span className="text-neutral-500">
                        by {dl.sender} ({dl.timestampRaw})
                      </span>
                    </div>

                    <p className="text-sm font-medium text-neutral-900">{dl.title}</p>
                    {dl.previousScheduleNote && (
                      <p className="text-xs font-medium text-neutral-800">
                        Schedule Change: {dl.previousScheduleNote}
                      </p>
                    )}
                    <p className="text-xs text-neutral-600">{dl.resolutionExplanation}</p>

                    {/* Ambiguous Date Confirmation Prompt */}
                    {dl.resolutionType === 'ambiguous' && !dl.isConfirmed && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-semibold text-amber-800">
                          Confirm exact date:
                        </span>
                        {dl.candidateOptions &&
                          dl.candidateOptions.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => onConfirmDeadlineDate(dl.id, opt)}
                              className="rounded-md border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-xs font-mono text-neutral-900 hover:bg-neutral-950 hover:text-white transition-colors whitespace-nowrap shrink-0"
                            >
                              {opt}
                            </button>
                          ))}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Or type exact date..."
                            value={customDateInputs[dl.id] || ''}
                            onChange={(e) =>
                              setCustomDateInputs((prev) => ({
                                ...prev,
                                [dl.id]: e.target.value,
                              }))
                            }
                            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-950 focus:outline-none"
                          />
                          {customDateInputs[dl.id]?.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                onConfirmDeadlineDate(dl.id, customDateInputs[dl.id].trim())
                              }
                              className="rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspectMessage(dl.messageId)}
                    className="self-start lg:self-center font-mono tabular-nums text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
                  >
                    Inspect Message #{dl.messageIndex}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 9. Extracted Action Items */}
      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">Action Items & Missed Tasks</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              <span className="font-mono tabular-nums">{pendingTasksCount}</span> pending ·{' '}
              <span className="font-mono tabular-nums">
                {conversation.actionItems.filter((t) => t.status === 'completed').length}
              </span>{' '}
              completed · Uncertain assignments or deadlines are explicitly labeled
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('actions')}
            className="text-xs font-semibold text-neutral-950 hover:underline self-start sm:self-center whitespace-nowrap shrink-0"
          >
            Manage All Action Items ({conversation.actionItems.length})
          </button>
        </div>

        {conversation.actionItems.length === 0 ? (
          <div className="p-6 text-xs text-neutral-500">
            No actionable tasks or responsibilities were extracted from this conversation.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {conversation.actionItems.map((task) => (
              <div
                key={task.id}
                className={`p-5 transition-colors ${
                  task.status === 'completed'
                    ? 'opacity-60 bg-neutral-50'
                    : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={
                          task.priority === 'high'
                            ? 'font-bold text-neutral-950'
                            : 'font-medium text-neutral-700'
                        }
                      >
                        {task.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                      </span>
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                      <span className="text-neutral-600">
                        Owner:{' '}
                        <strong
                          className={
                            task.assigneeConfidence === 'uncertain'
                              ? 'text-amber-700 font-normal'
                              : 'text-neutral-950 font-semibold'
                          }
                        >
                          {task.assignee}
                        </strong>{' '}
                        <span className="text-neutral-500">
                          ({task.assigneeConfidence === 'explicit'
                            ? 'Explicitly stated'
                            : task.assigneeConfidence === 'inferred_sender'
                            ? 'Self-assigned'
                            : 'Uncertain'})
                        </span>
                      </span>
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                      <span className="font-mono tabular-nums text-neutral-600">
                        Deadline: <span className="text-neutral-950 font-medium">{task.deadline}</span>
                      </span>
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                      <button
                        type="button"
                        onClick={() => onInspectMessage(task.messageId)}
                        className="font-mono tabular-nums font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
                      >
                        #{task.messageIndex} ({task.sender}, {task.timestampRaw})
                      </button>
                    </div>

                    {task.conciseTitle && (
                      <p
                        className={`text-sm font-semibold ${
                          task.status === 'completed'
                            ? 'line-through text-neutral-400'
                            : 'text-neutral-950'
                        }`}
                      >
                        {task.conciseTitle}
                      </p>
                    )}

                    <p
                      className={`text-xs leading-relaxed ${
                        task.status === 'completed'
                          ? 'line-through text-neutral-400'
                          : 'text-neutral-700'
                      }`}
                    >
                      Source quote: “{task.description}”
                    </p>
                  </div>

                  {/* Status Controls: Pending / Completed / Saved for Later */}
                  <div className="flex items-center gap-1.5 shrink-0 self-start lg:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTaskStatus(
                          task.id,
                          task.status === 'completed' ? 'pending' : 'completed'
                        )
                      }
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        task.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-neutral-950 text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{task.status === 'completed' ? 'Completed' : 'Mark Done'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTaskStatus(
                          task.id,
                          task.status === 'saved' ? 'pending' : 'saved'
                        )
                      }
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        task.status === 'saved'
                          ? 'bg-neutral-900 text-white border border-neutral-900'
                          : 'bg-white text-neutral-700 border border-neutral-300 hover:border-neutral-950 hover:text-neutral-950'
                      }`}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>{task.status === 'saved' ? 'Saved' : 'Save for Later'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
