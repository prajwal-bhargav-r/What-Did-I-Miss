import React from 'react';
import { Upload, Trash2, Check, Download, MessageSquare } from 'lucide-react';
import { ConversationRecord } from '../types/chat';

interface ConversationsViewProps {
  conversations: ConversationRecord[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenImport: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onOpenImport,
}) => {
  const handleExportMarkdown = (conv: ConversationRecord) => {
    const lines: string[] = [
      `# What Did I Miss? — Catch-Up Report: ${conv.name}`,
      `Generated Locally: ${new Date().toLocaleString()}`,
      `Detected Format: ${conv.stats.detectedFormat} | Total Messages: ${conv.stats.totalMessages}`,
      '',
      '## Executive Summary',
      ...conv.summary.standard.map((s) => `- ${s}`),
      '',
      '## Upcoming Deadlines & Schedule Updates',
      ...(conv.deadlines.length === 0
        ? ['_None detected._']
        : conv.deadlines.map(
            (d) =>
              `- **${d.userConfirmedDate || d.displayDate}** [${d.category.toUpperCase()}]: ${d.title} _(Source: #${d.messageIndex} by ${d.sender}, ${d.timestampRaw})_`
          )),
      '',
      '## Action Items & Tasks',
      ...(conv.actionItems.length === 0
        ? ['_None detected._']
        : conv.actionItems.map(
            (t) =>
              `- [${t.status === 'completed' ? 'x' : ' '}] **${t.assignee}** (Due: ${t.deadline}): ${t.description} _(Source: #${t.messageIndex})_`
          )),
      '',
      '## Unanswered Questions',
      ...(conv.summary.unansweredQuestions.length === 0
        ? ['_None detected._']
        : conv.summary.unansweredQuestions.map(
            (q) => `- **${q.sender}** (#${q.messageIndex}, ${q.timestampRaw}): "${q.question}"`
          )),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-catchup-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-950">Imported Conversations</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Each group or conversation is parsed and stored separately on your device. Switch between groups or remove saved data anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenImport}
          className="flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors self-start sm:self-center whitespace-nowrap shrink-0"
        >
          <Upload className="h-4 w-4" />
          <span>Import Another Conversation</span>
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center space-y-3">
          <MessageSquare className="mx-auto h-8 w-8 text-neutral-900" />
          <h2 className="text-base font-semibold text-neutral-950">No Conversations Loaded</h2>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Import a WhatsApp or text chat export, paste copied messages, or load a representative sample conversation to get started.
          </p>
          <button
            type="button"
            onClick={onOpenImport}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Import Conversation
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-200">
          {conversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                className={`p-5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50/70'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {isSelected && (
                      <>
                        <span className="font-bold text-neutral-950">Active Workspace</span>
                        <span aria-hidden="true" className="text-neutral-300">·</span>
                      </>
                    )}
                    <span className="capitalize text-neutral-600">{conv.sourceType} source</span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="font-mono tabular-nums text-neutral-500">
                      {conv.stats.detectedFormat}
                    </span>
                    {conv.stats.dateRange.start && (
                      <>
                        <span aria-hidden="true" className="text-neutral-300">·</span>
                        <span className="font-mono tabular-nums text-neutral-500">
                          {conv.stats.dateRange.start}
                        </span>
                      </>
                    )}
                  </div>

                  <h2 className="text-base font-semibold text-neutral-950">{conv.name}</h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-neutral-600 pt-0.5">
                    <span>
                      <strong className="text-neutral-950">{conv.stats.totalMessages}</strong> total msgs
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-950">
                      <strong>{conv.stats.highPriorityCount}</strong> high priority
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-700">
                      <strong>{conv.stats.mediumPriorityCount}</strong> medium
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <strong>{conv.actionItems.length}</strong> tasks
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <strong>{conv.deadlines.length}</strong> deadlines
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!isSelected ? (
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.id)}
                      className="rounded-lg bg-neutral-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      Switch to Conversation
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-950 whitespace-nowrap shrink-0">
                      <Check className="h-3.5 w-3.5" />
                      Selected
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleExportMarkdown(conv)}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-950 hover:border-neutral-950 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export .md</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteConversation(conv.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
