import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, ArrowUpRight } from 'lucide-react';
import { ConversationRecord, MessageCategory } from '../types/chat';

interface ImportantMessagesViewProps {
  conversation: ConversationRecord;
  initialPriorityFilter?: 'all_important' | 'high' | 'medium';
  onInspectMessage: (messageId: string) => void;
  onJumpToTranscript: (messageId: string) => void;
}

export const ImportantMessagesView: React.FC<ImportantMessagesViewProps> = ({
  conversation,
  initialPriorityFilter = 'all_important',
  onInspectMessage,
  onJumpToTranscript,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'all_important' | 'high' | 'medium'>(
    initialPriorityFilter
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | MessageCategory>('all');

  useEffect(() => {
    setPriorityFilter(initialPriorityFilter);
  }, [initialPriorityFilter]);

  const filteredMessages = conversation.messages.filter((msg) => {
    if (msg.isSystem || msg.isDuplicate || msg.isMediaOmitted) return false;
    if (priorityFilter === 'high' && msg.priority !== 'high') return false;
    if (priorityFilter === 'medium' && msg.priority !== 'medium') return false;
    if (priorityFilter === 'all_important' && msg.priority === 'low') return false;
    if (categoryFilter !== 'all' && !msg.categories.includes(categoryFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-950">
            Important & Prioritized Messages
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Ranked by contextual urgency, schedule impact, deadlines, and assigned responsibilities. Every message includes a clear explanation of why it was flagged.
          </p>
        </div>

        {/* Interactive Priority Segmented Control */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 border border-neutral-200">
            <button
              type="button"
              onClick={() => setPriorityFilter('all_important')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                priorityFilter === 'all_important'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              All Important ({conversation.stats.highPriorityCount + conversation.stats.mediumPriorityCount})
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter('high')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                priorityFilter === 'high'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              High Priority ({conversation.stats.highPriorityCount})
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter('medium')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                priorityFilter === 'medium'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Medium Priority ({conversation.stats.mediumPriorityCount})
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500 mr-1">Category:</span>
        {(
          [
            { id: 'all', label: 'All Categories' },
            { id: 'announcement', label: 'Announcements' },
            { id: 'schedule_change', label: 'Schedule Changes' },
            { id: 'deadline', label: 'Deadlines' },
            { id: 'action_item', label: 'Tasks' },
            { id: 'decision', label: 'Decisions' },
            { id: 'question', label: 'Questions' },
          ] as { id: 'all' | MessageCategory; label: string }[]
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

      {filteredMessages.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center space-y-2">
          <p className="text-sm font-medium text-neutral-950">No messages match the selected priority and category filters.</p>
          <p className="text-xs text-neutral-500">
            Try selecting “All Important” or “All Categories”, or inspect low-priority messages in the All Messages view.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-200">
          {filteredMessages.map((msg) => (
            <div key={msg.id} className="p-5 hover:bg-neutral-50 transition-colors space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {msg.priority === 'high' ? (
                    <span className="flex items-center gap-1 font-bold text-neutral-950">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      High Priority
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-medium text-neutral-700">
                      <Info className="h-3.5 w-3.5" />
                      Medium Priority
                    </span>
                  )}
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="font-semibold text-neutral-950">{msg.sender}</span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="font-mono tabular-nums text-neutral-500">{msg.timestampRaw}</span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="text-neutral-600 capitalize">
                    {msg.categories.map((c) => c.replace('_', ' ')).join(' / ')}
                  </span>
                  {msg.requiresResponse && (
                    <>
                      <span aria-hidden="true" className="text-neutral-300">·</span>
                      <span className="font-semibold text-amber-700">Requires Response</span>
                    </>
                  )}
                  {msg.supersededByIndex && (
                    <>
                      <span aria-hidden="true" className="text-neutral-300">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          const sup = conversation.messages.find(
                            (m) => m.index === msg.supersededByIndex
                          );
                          if (sup) onInspectMessage(sup.id);
                        }}
                        className="font-semibold text-amber-800 underline"
                      >
                        Superseded by #{msg.supersededByIndex}
                      </button>
                    </>
                  )}
                  {msg.supersedesIndex && (
                    <>
                      <span aria-hidden="true" className="text-neutral-300">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          const old = conversation.messages.find(
                            (m) => m.index === msg.supersedesIndex
                          );
                          if (old) onInspectMessage(old.id);
                        }}
                        className="font-semibold text-neutral-900 underline"
                      >
                        Supersedes #{msg.supersedesIndex}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInspectMessage(msg.id)}
                    className="font-mono tabular-nums text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
                  >
                    Verify Context (#{msg.index})
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToTranscript(msg.id)}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Transcript</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {msg.changeSummary && (
                <div className="text-xs font-medium text-neutral-900 bg-neutral-100 border border-neutral-200 rounded px-2.5 py-1">
                  Revision / Change Summary: {msg.changeSummary}
                </div>
              )}

              <p
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.supersededByIndex ? 'line-through text-neutral-400' : 'text-neutral-900'
                }`}
              >
                {msg.content}
              </p>

              <div className="pt-1 text-xs text-neutral-600">
                <span className="font-semibold text-neutral-900">Why marked {msg.priority} priority: </span>
                <span>{msg.priorityReasons.join(' · ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
