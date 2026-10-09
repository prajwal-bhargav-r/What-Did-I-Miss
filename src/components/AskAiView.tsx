import React, { useState } from 'react';
import { Send, Sparkles, ArrowUpRight, Trash2, HelpCircle } from 'lucide-react';
import { ConversationRecord, QATurn, UserProfile } from '../types/chat';
import { answerConversationQuestion } from '../services/localAiEngine';

interface AskAiViewProps {
  conversation: ConversationRecord;
  userProfile: UserProfile;
  onAppendQATurn: (turn: QATurn) => void;
  onClearQAHistory: () => void;
  onInspectMessage: (messageId: string) => void;
  onJumpToTranscript: (messageId: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'What important announcements did I miss?',
  'When is the next exam?',
  'What assignments are due this week?',
  'Did anyone change the meeting time?',
  'What tasks were assigned to me?',
  'What decisions were made?',
  'Show all messages about the project submission.',
  'Are there any unanswered questions?',
];

export const AskAiView: React.FC<AskAiViewProps> = ({
  conversation,
  userProfile,
  onAppendQATurn,
  onClearQAHistory,
  onInspectMessage,
  onJumpToTranscript,
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAsk = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean || isProcessing) return;

    setIsProcessing(true);
    setQuestionInput('');

    try {
      const turn = await answerConversationQuestion(clean, conversation, userProfile);
      onAppendQATurn(turn);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(questionInput);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-950">
            Ask AI · Grounded Conversation Q&A
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Ask questions about <strong className="text-neutral-950">{conversation.name}</strong>. Answers are computed 100% locally using the imported messages as the strict source of truth, complete with source citations.
          </p>
        </div>

        {conversation.qaHistory.length > 0 && (
          <button
            type="button"
            onClick={onClearQAHistory}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-950 hover:border-neutral-950 transition-colors self-start sm:self-center whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Q&A History</span>
          </button>
        )}
      </div>

      {/* Quick Starter Questions */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="font-semibold text-neutral-900">Suggested Questions</span>
          <span>Click any prompt to query the imported chat immediately</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleAsk(q)}
              disabled={isProcessing}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white transition-colors text-left"
            >
              “{q}”
            </button>
          ))}
        </div>
      </section>

      {/* Question Input Bar */}
      <form
        onSubmit={handleFormSubmit}
        className="flex items-center gap-3 rounded-xl border border-neutral-300 bg-white p-3 focus-within:border-neutral-950 transition-colors"
      >
        <Sparkles className="h-4 w-4 text-neutral-950 ml-2 shrink-0" />
        <input
          type="text"
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          placeholder="Ask anything about deadlines, exams, tasks, decisions, or specific topics in this chat..."
          className="w-full bg-transparent text-sm text-neutral-950 placeholder-neutral-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!questionInput.trim() || isProcessing}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isProcessing ? 'Analyzing...' : 'Ask'}</span>
        </button>
      </form>

      {/* Q&A Transcript */}
      {conversation.qaHistory.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center space-y-2">
          <HelpCircle className="mx-auto h-7 w-7 text-neutral-900" />
          <h2 className="text-sm font-semibold text-neutral-950">
            Ask a Question About Your Imported Messages
          </h2>
          <p className="text-xs text-neutral-500 max-w-lg mx-auto leading-relaxed">
            Every response cites the exact original message, sender, and timestamp. If a piece of information is not present in the imported conversation, the assistant will clearly tell you it could not be found rather than fabricating an answer.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversation.qaHistory.map((turn) => (
            <div
              key={turn.id}
              className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-200"
            >
              {/* User Question */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50 rounded-t-xl">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-neutral-950">Question:</span>
                  <span className="text-sm font-semibold text-neutral-950">{turn.question}</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-neutral-500">
                  {turn.engineUsed}
                </span>
              </div>

              {/* Grounded Answer */}
              <div className="p-5 space-y-4">
                <div className="text-sm leading-relaxed text-neutral-900 whitespace-pre-wrap">
                  {turn.answer}
                </div>

                {/* Supporting Original Message Citations */}
                {turn.citations.length > 0 && (
                  <div className="space-y-2 border-t border-neutral-200 pt-3.5">
                    <div className="text-xs font-semibold text-neutral-700">
                      Supporting Original Messages ({turn.citations.length}):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {turn.citations.map((cit) => (
                        <div
                          key={cit.messageId}
                          className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-neutral-600">
                              <span className="font-mono font-bold text-neutral-950">
                                #{cit.messageIndex}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-neutral-950">{cit.sender}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">{cit.timestampRaw}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => onInspectMessage(cit.messageId)}
                                className="font-semibold text-neutral-950 hover:underline whitespace-nowrap"
                              >
                                Context
                              </button>
                              <button
                                type="button"
                                onClick={() => onJumpToTranscript(cit.messageId)}
                                className="text-neutral-500 hover:text-neutral-950 flex items-center gap-0.5 whitespace-nowrap"
                              >
                                <span>Chat</span>
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-neutral-700 line-clamp-2 italic">“{cit.snippet}”</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
