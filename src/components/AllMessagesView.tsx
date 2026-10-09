import React, { useState, useEffect, useRef } from 'react';
import { Search, AlertTriangle, Info, X, RotateCcw } from 'lucide-react';
import { ConversationRecord, PriorityLevel } from '../types/chat';

interface AllMessagesViewProps {
  conversation: ConversationRecord;
  highlightedMessageId: string | null;
  initialPriorityFilter?: 'all' | PriorityLevel;
  onClearHighlight: () => void;
  onInspectMessage: (messageId: string) => void;
}

export const AllMessagesView: React.FC<AllMessagesViewProps> = ({
  conversation,
  highlightedMessageId,
  initialPriorityFilter = 'all',
  onClearHighlight,
  onInspectMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>(initialPriorityFilter);
  const [senderFilter, setSenderFilter] = useState<string>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [onlyDeadlinesOrTasks, setOnlyDeadlinesOrTasks] = useState<boolean>(false);
  const [showSystemAndDuplicates, setShowSystemAndDuplicates] = useState<boolean>(true);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setPriorityFilter(initialPriorityFilter);
  }, [initialPriorityFilter]);

  useEffect(() => {
    if (highlightedMessageId) {
      setPriorityFilter('all');
      setSenderFilter('all');
      setOnlyDeadlinesOrTasks(false);
      setShowSystemAndDuplicates(true);

      setTimeout(() => {
        const el = rowRefs.current[highlightedMessageId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    }
  }, [highlightedMessageId]);

  const filteredMessages = conversation.messages.filter((msg) => {
    if (!showSystemAndDuplicates && (msg.isSystem || msg.isDuplicate)) {
      return false;
    }

    if (priorityFilter !== 'all' && msg.priority !== priorityFilter) {
      return false;
    }

    if (senderFilter !== 'all' && msg.sender !== senderFilter) {
      return false;
    }

    if (onlyDeadlinesOrTasks) {
      const hasDlOrTask =
        msg.categories.includes('deadline') ||
        msg.categories.includes('action_item') ||
        msg.categories.includes('schedule_change');
      if (!hasDlOrTask) return false;
    }

    if (dateStart && msg.timestampISO) {
      const msgDate = msg.timestampISO.slice(0, 10);
      if (msgDate < dateStart) return false;
    }

    if (dateEnd && msg.timestampISO) {
      const msgDate = msg.timestampISO.slice(0, 10);
      if (msgDate > dateEnd) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchContent = msg.content.toLowerCase().includes(q);
      const matchSender = msg.sender.toLowerCase().includes(q);
      const matchTimestamp = msg.timestampRaw.toLowerCase().includes(q);
      if (!matchContent && !matchSender && !matchTimestamp) return false;
    }

    return true;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setSenderFilter('all');
    setDateStart('');
    setDateEnd('');
    setOnlyDeadlinesOrTasks(false);
    setShowSystemAndDuplicates(true);
    onClearHighlight();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-950">
            All Conversation Messages ({conversation.stats.totalMessages})
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Complete chronological transcript. No messages are ever discarded — inspect low-priority banter, jokes, system notices, and duplicates anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetFilters}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-950 hover:border-neutral-950 transition-colors self-start sm:self-center whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Comprehensive Search & Filter Controls */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Keyword Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, topics, room numbers, or sender names..."
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 pl-9 pr-8 py-1.5 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-950"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sender Filter */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Participant / Sender
            </label>
            <select
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-950 focus:border-neutral-950 focus:bg-white focus:outline-none"
            >
              <option value="all">All Participants ({conversation.stats.participants.length})</option>
              {conversation.stats.participants.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.count})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-950 font-mono focus:border-neutral-950 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-950 font-mono focus:border-neutral-950 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bottom Filter Row: Priority Segmented Control + Quick Checkboxes */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-4">
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 border border-neutral-200">
            {(
              [
                { id: 'all', label: `All (${conversation.stats.totalMessages})` },
                { id: 'high', label: `High (${conversation.stats.highPriorityCount})` },
                { id: 'medium', label: `Medium (${conversation.stats.mediumPriorityCount})` },
                { id: 'low', label: `Low (${conversation.stats.lowPriorityCount})` },
              ] as { id: 'all' | PriorityLevel; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriorityFilter(p.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  priorityFilter === p.id
                    ? 'bg-neutral-950 text-white font-semibold'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
              <input
                type="checkbox"
                checked={onlyDeadlinesOrTasks}
                onChange={(e) => setOnlyDeadlinesOrTasks(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-950 focus:ring-0"
              />
              <span>Only messages with deadlines or action items</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
              <input
                type="checkbox"
                checked={showSystemAndDuplicates}
                onChange={(e) => setShowSystemAndDuplicates(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-950 focus:ring-0"
              />
              <span>Include system notices & duplicate messages</span>
            </label>
          </div>
        </div>
      </section>

      {/* Active Highlight Banner */}
      {highlightedMessageId && (
        <div className="flex items-center justify-between rounded-lg border border-neutral-950 bg-neutral-100 px-4 py-2.5 text-xs text-neutral-950">
          <span>
            Jumped to source message{' '}
            <strong className="font-mono font-bold text-neutral-950">
              #{conversation.messages.find((m) => m.id === highlightedMessageId)?.index}
            </strong>{' '}
            in chronological context.
          </span>
          <button
            type="button"
            onClick={onClearHighlight}
            className="text-neutral-950 hover:underline font-semibold"
          >
            Clear Highlight
          </button>
        </div>
      )}

      {/* Messages List */}
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-3 text-xs text-neutral-500 flex items-center justify-between">
          <span>
            Showing <strong className="font-mono tabular-nums text-neutral-950">{filteredMessages.length}</strong> of{' '}
            <span className="font-mono tabular-nums">{conversation.stats.totalMessages}</span> messages
          </span>
          <span>Click any message number to view surrounding context</span>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-neutral-950">No messages match your search or filters.</p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-neutral-950 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {filteredMessages.map((msg) => {
              const isHighlighted = msg.id === highlightedMessageId;
              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    rowRefs.current[msg.id] = el;
                  }}
                  className={`p-4 transition-colors ${
                    isHighlighted
                      ? 'bg-neutral-100 ring-1 ring-inset ring-neutral-950'
                      : msg.isSystem || msg.isDuplicate
                      ? 'bg-neutral-50/70 opacity-75'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectMessage(msg.id)}
                        className="font-mono tabular-nums font-bold text-neutral-950 hover:underline"
                      >
                        #{msg.index}
                      </button>
                      <span aria-hidden="true" className="text-neutral-300">·</span>
                      <span className="font-semibold text-neutral-950">{msg.sender}</span>
                      <span aria-hidden="true" className="text-neutral-300">·</span>
                      <span className="font-mono tabular-nums text-neutral-500">
                        {msg.timestampRaw}
                      </span>
                      {msg.isDuplicate && (
                        <>
                          <span aria-hidden="true" className="text-neutral-300">·</span>
                          <span className="text-amber-700 font-medium">
                            Duplicate of {msg.duplicateOfId?.replace('msg-', '#')}
                          </span>
                        </>
                      )}
                      {msg.isJokeOrHypothetical && (
                        <>
                          <span aria-hidden="true" className="text-neutral-300">·</span>
                          <span className="text-neutral-500">Humor / Hypothetical</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {msg.priority === 'high' && (
                        <span className="flex items-center gap-1 font-bold text-neutral-950">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          High Priority
                        </span>
                      )}
                      {msg.priority === 'medium' && (
                        <span className="flex items-center gap-1 font-medium text-neutral-700">
                          <Info className="h-3.5 w-3.5" />
                          Medium Priority
                        </span>
                      )}
                      {msg.priority === 'low' && (
                        <span className="text-neutral-500">Low Priority</span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-900 whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  {msg.priorityReasons.length > 0 && (
                    <p className="mt-1.5 text-xs text-neutral-500">
                      Analysis: {msg.priorityReasons.join(' · ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
