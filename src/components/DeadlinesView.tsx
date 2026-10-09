import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { ConversationRecord, DateResolutionType, DeadlineCategory } from '../types/chat';

interface DeadlinesViewProps {
  conversation: ConversationRecord;
  onConfirmDeadlineDate: (deadlineId: string, confirmedDate: string) => void;
  onInspectMessage: (messageId: string) => void;
  onJumpToTranscript: (messageId: string) => void;
}

export const DeadlinesView: React.FC<DeadlinesViewProps> = ({
  conversation,
  onConfirmDeadlineDate,
  onInspectMessage,
  onJumpToTranscript,
}) => {
  const [resolutionFilter, setResolutionFilter] = useState<'all' | DateResolutionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DeadlineCategory>('all');
  const [customDates, setCustomDates] = useState<Record<string, string>>({});

  const filteredDeadlines = conversation.deadlines.filter((dl) => {
    if (resolutionFilter !== 'all' && dl.resolutionType !== resolutionFilter) return false;
    if (categoryFilter !== 'all' && dl.category !== categoryFilter) return false;
    return true;
  });

  const explicitCount = conversation.deadlines.filter((d) => d.resolutionType === 'explicit').length;
  const relativeCount = conversation.deadlines.filter(
    (d) => d.resolutionType === 'relative_resolved'
  ).length;
  const ambiguousCount = conversation.deadlines.filter(
    (d) => d.resolutionType === 'ambiguous'
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-950">
            Deadlines, Dates & Schedule Changes
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Chronological timeline distinguishing explicitly stated dates from relative expressions (“tomorrow”, “next Friday”). Ambiguous dates prompt for your confirmation rather than guessing.
          </p>
        </div>

        {/* Date Resolution Type Segmented Control */}
        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 border border-neutral-200 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setResolutionFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              resolutionFilter === 'all'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            All ({conversation.deadlines.length})
          </button>
          <button
            type="button"
            onClick={() => setResolutionFilter('explicit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              resolutionFilter === 'explicit'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Explicit ({explicitCount})
          </button>
          <button
            type="button"
            onClick={() => setResolutionFilter('relative_resolved')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              resolutionFilter === 'relative_resolved'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Relative Resolved ({relativeCount})
          </button>
          <button
            type="button"
            onClick={() => setResolutionFilter('ambiguous')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              resolutionFilter === 'ambiguous'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Ambiguous ({ambiguousCount})
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500 mr-1">Event Type:</span>
        {(
          [
            { id: 'all', label: 'All Types' },
            { id: 'exam', label: 'Exams & Assessments' },
            { id: 'assignment', label: 'Assignments' },
            { id: 'project', label: 'Projects & Milestones' },
            { id: 'schedule_change', label: 'Schedule Changes' },
            { id: 'meeting', label: 'Meetings & Syncs' },
            { id: 'registration', label: 'Registration' },
          ] as { id: 'all' | DeadlineCategory; label: string }[]
        ).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              categoryFilter === cat.id
                ? 'border-neutral-950 bg-neutral-950 text-white font-medium'
                : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950 hover:border-neutral-400'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filteredDeadlines.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center space-y-2">
          <p className="text-sm font-medium text-neutral-950">No deadlines or events match the selected filter.</p>
          <p className="text-xs text-neutral-500">
            Reset filters above to inspect all chronological dates extracted from the conversation.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-200">
          {filteredDeadlines.map((dl) => (
            <div key={dl.id} className="p-5 hover:bg-neutral-50 transition-colors space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm tabular-nums text-neutral-950">
                    {dl.userConfirmedDate || dl.displayDate}
                  </span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="capitalize font-medium text-neutral-900">
                    {dl.category.replace('_', ' ')}
                  </span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span
                    className={
                      dl.userConfirmedDate
                        ? 'text-emerald-700 font-medium'
                        : dl.resolutionType === 'explicit'
                        ? 'text-emerald-700 font-medium'
                        : dl.resolutionType === 'relative_resolved'
                        ? 'text-neutral-700 font-medium'
                        : 'text-amber-700 font-semibold'
                    }
                  >
                    {dl.userConfirmedDate
                      ? 'User Confirmed Date'
                      : dl.resolutionType === 'explicit'
                      ? 'Explicitly Stated Date'
                      : dl.resolutionType === 'relative_resolved'
                      ? `Relative Resolved ("${dl.rawDateExpression}")`
                      : `Ambiguous Expression ("${dl.rawDateExpression}")`}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInspectMessage(dl.messageId)}
                    className="font-mono tabular-nums text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
                  >
                    Verify Context (#{dl.messageIndex})
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToTranscript(dl.messageId)}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-950 whitespace-nowrap shrink-0"
                  >
                    <span>Transcript</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-medium text-neutral-950 leading-relaxed">{dl.title}</p>

              {dl.previousScheduleNote && (
                <div className="text-xs font-medium text-neutral-900 bg-neutral-100 border border-neutral-200 rounded px-2.5 py-1">
                  Schedule Revision: {dl.previousScheduleNote}
                </div>
              )}

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1.5">
                <div className="text-neutral-600">
                  <span className="font-semibold text-neutral-900">Date Resolution Logic: </span>
                  <span>{dl.resolutionExplanation}</span>
                </div>
                <div className="text-neutral-600">
                  <span className="font-semibold text-neutral-900">Original Message (#{dl.messageIndex} · {dl.sender} · {dl.timestampRaw}): </span>
                  <span className="italic text-neutral-800">“{dl.originalContent}”</span>
                </div>
              </div>

              {/* Ambiguous Date Confirmation Bar */}
              {dl.resolutionType === 'ambiguous' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>
                      {dl.userConfirmedDate
                        ? `Confirmed as "${dl.userConfirmedDate}". You can update it below:`
                        : 'This date expression is ambiguous. Please confirm the intended date:'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {dl.candidateOptions?.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onConfirmDeadlineDate(dl.id, opt)}
                        className={`rounded-md px-3 py-1 font-mono text-xs transition-colors whitespace-nowrap shrink-0 ${
                          dl.userConfirmedDate === opt
                            ? 'bg-neutral-950 text-white font-semibold'
                            : 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-950 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Custom date (e.g. Oct 23, 4 PM)..."
                        value={customDates[dl.id] || ''}
                        onChange={(e) =>
                          setCustomDates((prev) => ({ ...prev, [dl.id]: e.target.value }))
                        }
                        className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-950 focus:outline-none"
                      />
                      {customDates[dl.id]?.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            onConfirmDeadlineDate(dl.id, customDates[dl.id].trim());
                            setCustomDates((prev) => ({ ...prev, [dl.id]: '' }));
                          }}
                          className="rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
