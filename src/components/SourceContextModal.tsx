import React from 'react';
import { X, ArrowUpRight, AlertTriangle, Info } from 'lucide-react';
import { ParsedMessage } from '../types/chat';

interface SourceContextModalProps {
  targetMessageId: string | null;
  messages: ParsedMessage[];
  onClose: () => void;
  onJumpToTranscript: (messageId: string) => void;
}

export const SourceContextModal: React.FC<SourceContextModalProps> = ({
  targetMessageId,
  messages,
  onClose,
  onJumpToTranscript,
}) => {
  if (!targetMessageId) return null;

  const targetIndex = messages.findIndex((m) => m.id === targetMessageId);
  if (targetIndex === -1) return null;

  const targetMsg = messages[targetIndex];
  const startIdx = Math.max(0, targetIndex - 2);
  const endIdx = Math.min(messages.length - 1, targetIndex + 2);
  const windowMessages = messages.slice(startIdx, endIdx + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-context-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 id="source-context-title" className="text-base font-semibold text-neutral-950">
              Original Message Verification · <span className="font-mono font-bold text-neutral-950">#{targetMsg.index}</span>
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Showing surrounding chronological conversation context (#{windowMessages[0].index} to #{windowMessages[windowMessages.length - 1].index})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 transition-colors"
            aria-label="Close verification modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
          {windowMessages.map((msg) => {
            const isTarget = msg.id === targetMsg.id;
            return (
              <div
                key={msg.id}
                className={`rounded-lg border p-3.5 transition-colors ${
                  isTarget
                    ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950'
                    : 'border-neutral-200 bg-white opacity-75'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-neutral-500">#{msg.index}</span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="font-semibold text-neutral-950">{msg.sender}</span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="font-mono tabular-nums text-neutral-500">{msg.timestampRaw}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
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

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">
                  {msg.content}
                </p>

                {isTarget && msg.priorityReasons.length > 0 && (
                  <div className="mt-3 border-t border-neutral-200 pt-2.5 text-xs text-neutral-700">
                    <span className="font-semibold text-neutral-950">Why it was categorized ({msg.priority.toUpperCase()}): </span>
                    <span>{msg.priorityReasons.join(' · ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3.5 bg-neutral-50 rounded-b-xl">
          <span className="text-xs text-neutral-500">
            AI-generated summaries can miss subtle nuance — always verify critical dates against the source.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onJumpToTranscript(targetMsg.id);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Locate in Full Transcript</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
