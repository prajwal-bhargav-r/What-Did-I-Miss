import React, { useState } from 'react';
import { Check, Bookmark, RotateCcw, ArrowUpRight, Search, X } from 'lucide-react';
import { ConversationRecord, PriorityLevel, TaskStatus } from '../types/chat';

interface ActionItemsViewProps {
  conversation: ConversationRecord;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onInspectMessage: (messageId: string) => void;
  onJumpToTranscript: (messageId: string) => void;
}

export const ActionItemsView: React.FC<ActionItemsViewProps> = ({
  conversation,
  onUpdateTaskStatus,
  onInspectMessage,
  onJumpToTranscript,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const uniqueAssignees = Array.from(
    new Set(conversation.actionItems.map((t) => t.assignee))
  );

  const filteredTasks = conversation.actionItems.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all' && task.assignee !== assigneeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        task.description.toLowerCase().includes(q) ||
        task.assignee.toLowerCase().includes(q) ||
        task.deadline.toLowerCase().includes(q) ||
        task.sender.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const pendingCount = conversation.actionItems.filter((t) => t.status === 'pending').length;
  const savedCount = conversation.actionItems.filter((t) => t.status === 'saved').length;
  const completedCount = conversation.actionItems.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-950">Action Items & Extracted Tasks</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Tasks and responsibilities extracted from the conversation. Uncertain assignees or unstated deadlines are explicitly labeled rather than guessed.
          </p>
        </div>

        {/* Status Segmented Filter */}
        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 border border-neutral-200 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'all'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            All ({conversation.actionItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'pending'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('saved')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'saved'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Saved for Later ({savedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'completed'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Search, Priority & Assignee Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by keyword, assignee, or deadline..."
            className="w-full rounded-lg border border-neutral-300 bg-white pl-8 pr-8 py-1.5 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-950"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 border border-neutral-200">
            {(
              [
                { id: 'all', label: 'All Priorities' },
                { id: 'high', label: 'High Priority' },
                { id: 'medium', label: 'Medium Priority' },
              ] as { id: 'all' | PriorityLevel; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriorityFilter(p.id)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  priorityFilter === p.id
                    ? 'bg-neutral-950 text-white font-semibold'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {uniqueAssignees.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500 mr-1">Assignee:</span>
          <button
            type="button"
            onClick={() => setAssigneeFilter('all')}
            className={`px-3 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              assigneeFilter === 'all'
                ? 'border-neutral-950 bg-neutral-950 text-white font-medium'
                : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950 hover:border-neutral-400'
            }`}
          >
            All Assignees
          </button>
          {uniqueAssignees.map((assignee) => (
            <button
              key={assignee}
              type="button"
              onClick={() => setAssigneeFilter(assignee)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                assigneeFilter === assignee
                  ? 'border-neutral-950 bg-neutral-950 text-white font-medium'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950 hover:border-neutral-400'
              }`}
            >
              {assignee}
            </button>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center space-y-2">
          <p className="text-sm font-medium text-neutral-950">No action items match your current filter.</p>
          <p className="text-xs text-neutral-500">
            Switch back to “All” or clear the search input to view all extracted tasks across the conversation.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-200">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-5 transition-colors space-y-3 ${
                task.status === 'completed'
                  ? 'opacity-65 bg-neutral-50'
                  : 'hover:bg-neutral-50'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Metadata Line */}
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
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="text-neutral-600">
                      Assigned Person:{' '}
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
                          ? 'Explicitly Stated'
                          : task.assigneeConfidence === 'inferred_sender'
                          ? 'Self-Assigned'
                          : 'Uncertain'})
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="font-mono tabular-nums text-neutral-600">
                      Deadline:{' '}
                      <span
                        className={
                          task.deadlineConfidence === 'not_specified'
                            ? 'text-neutral-500'
                            : task.deadlineConfidence === 'ambiguous'
                            ? 'text-amber-700 font-medium'
                            : 'text-neutral-950 font-semibold'
                        }
                      >
                        {task.deadline}
                      </span>{' '}
                      <span className="text-neutral-500">
                        ({task.deadlineConfidence === 'explicit'
                          ? 'Explicit'
                          : task.deadlineConfidence === 'relative_resolved'
                          ? 'Relative Resolved'
                          : task.deadlineConfidence === 'ambiguous'
                          ? 'Ambiguous'
                          : 'Not Specified'})
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="capitalize text-neutral-600">
                      Status: <strong className="text-neutral-950">{task.status}</strong>
                    </span>
                  </div>

                  {/* Task Concise Headline & Description */}
                  {task.conciseTitle && (
                    <p
                      className={`text-sm font-semibold leading-relaxed ${
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
                    {task.description}
                  </p>

                  {/* Supporting Evidence & Explanation */}
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-neutral-600">
                      <span>
                        Original Message <span className="font-mono font-semibold text-neutral-950">#{task.messageIndex}</span> by{' '}
                        <strong className="text-neutral-950">{task.sender}</strong> ({task.timestampRaw})
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onInspectMessage(task.messageId)}
                          className="text-neutral-950 hover:underline font-semibold whitespace-nowrap shrink-0"
                        >
                          Verify Surrounding Messages
                        </button>
                        <button
                          type="button"
                          onClick={() => onJumpToTranscript(task.messageId)}
                          className="flex items-center gap-1 text-neutral-500 hover:text-neutral-950 whitespace-nowrap shrink-0"
                        >
                          <span>Full Chat</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-neutral-800 italic">“{task.originalContent}”</p>
                    <p className="text-neutral-500 pt-0.5">{task.explanation}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTaskStatus(
                        task.id,
                        task.status === 'completed' ? 'pending' : 'completed'
                      )
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      task.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-neutral-950 text-white font-semibold hover:bg-neutral-800'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{task.status === 'completed' ? 'Completed' : 'Mark Completed'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTaskStatus(
                        task.id,
                        task.status === 'saved' ? 'pending' : 'saved'
                      )
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      task.status === 'saved'
                        ? 'bg-neutral-900 text-white border border-neutral-900'
                        : 'bg-white text-neutral-700 border border-neutral-300 hover:border-neutral-950 hover:text-neutral-950'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{task.status === 'saved' ? 'Saved for Later' : 'Save for Later'}</span>
                  </button>

                  {task.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => onUpdateTaskStatus(task.id, 'pending')}
                      className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs text-neutral-600 hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0"
                      title="Reset to Pending"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Pending</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
