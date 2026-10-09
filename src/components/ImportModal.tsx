import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, X, AlertCircle, ShieldCheck, Eye } from 'lucide-react';
import { SAMPLE_CONVERSATIONS, SampleChatPreset } from '../data/sampleConversations';
import { parseChatText } from '../services/chatParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportText: (
    name: string,
    rawText: string,
    sourceType: 'file' | 'paste' | 'sample',
    fileName?: string
  ) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportText,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'samples'>('paste');
  const [chatName, setChatName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; content: string; size: number }[]
  >([]);
  const [selectedPreviewFileIdx, setSelectedPreviewFileIdx] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pastePreview = useMemo(() => {
    if (!pastedText.trim()) return null;
    return parseChatText(pastedText);
  }, [pastedText]);

  const uploadPreview = useMemo(() => {
    const file = uploadedFiles[selectedPreviewFileIdx] || uploadedFiles[0];
    if (!file) return null;
    return parseChatText(file.content);
  }, [uploadedFiles, selectedPreviewFileIdx]);

  if (!isOpen) return null;

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = pastedText.trim();
    if (!trimmed) {
      setErrorMessage('Please paste at least one chat message before analyzing.');
      return;
    }

    const finalName =
      chatName.trim() ||
      `Imported Chat (${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })})`;

    onImportText(finalName, trimmed, 'paste');
    setChatName('');
    setPastedText('');
    onClose();
  };

  const processSelectedFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validFiles: { name: string; content: string; size: number }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isTextFile =
        file.name.endsWith('.txt') ||
        file.name.endsWith('.log') ||
        file.name.endsWith('.md') ||
        file.type === 'text/plain';

      if (!isTextFile) {
        setErrorMessage(
          `Unsupported file "${file.name}". Please upload exported plain-text chat files (.txt, .log, or .md). Binary attachments or zip archives should be extracted first.`
        );
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds the 10 MB local browser memory threshold.`);
        continue;
      }

      try {
        const text = await file.text();
        if (!text.trim()) {
          setErrorMessage(`File "${file.name}" is empty.`);
          continue;
        }
        validFiles.push({
          name: file.name,
          content: text,
          size: file.size,
        });
      } catch {
        setErrorMessage(`Could not read "${file.name}". Ensure it is a valid UTF-8 text file.`);
      }
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleImportUploadedFiles = () => {
    if (uploadedFiles.length === 0) {
      setErrorMessage('Please select at least one .txt chat export file to import.');
      return;
    }

    uploadedFiles.forEach((f) => {
      const cleanTitle = f.name
        .replace(/\.(txt|log|md)$/i, '')
        .replace(/^WhatsApp Chat with\s+/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      onImportText(cleanTitle || f.name, f.content, 'file', f.name);
    });

    setUploadedFiles([]);
    setSelectedPreviewFileIdx(0);
    onClose();
  };

  const handleLoadSample = (preset: SampleChatPreset) => {
    onImportText(preset.name, preset.rawText, 'sample');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 shrink-0">
          <div>
            <h2 id="import-modal-title" className="text-lg font-semibold text-neutral-950">
              Import Chat Conversation
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Processed 100% locally in your browser · No external uploads or WhatsApp cloud connection
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="border-b border-neutral-200 px-6 pt-3 shrink-0">
          <div className="flex items-center gap-2 pb-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('paste');
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'paste'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Paste Copied Messages
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'upload'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Upload .txt Export Files
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('samples');
                setErrorMessage(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'samples'
                  ? 'bg-neutral-950 text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Representative Sample Chats
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Conversation or Group Name
                </label>
                <input
                  type="text"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  placeholder="e.g., CS-402 Study Group, Q4 Product Launch, Dorm Floor 3"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-700">
                    Chat Messages
                  </label>
                  <span className="text-xs text-neutral-500 font-mono tabular-nums">
                    {pastedText.trim() ? pastedText.trim().split('\n').length : 0} raw lines
                    {pastePreview ? ` · ${pastePreview.messages.length} parsed messages` : ''}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Paste exported WhatsApp, Telegram, Slack, or plain chat messages here...\n\nExamples supported:\n10/12/2026, 9:30 AM - TA Priya: The Midterm Exam is moved to Oct 16 at 2:00 PM in Auditorium B.\n[10/12/2026, 09:34:10 AM] @Alex: Please upload the benchmark slides by tomorrow 5 PM.\nMaya Lin: Agreed, we will use gRPC for Milestone 2.`}
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3.5 font-mono text-xs leading-relaxed text-neutral-900 placeholder-neutral-400 focus:border-neutral-950 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Live Parsed Message Preview */}
              {pastePreview && pastePreview.messages.length > 0 && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-neutral-950">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Live Parsed Message Preview ({pastePreview.messages.length} detected)</span>
                    </div>
                    <span className="font-mono text-neutral-500 tabular-nums">
                      Format: {pastePreview.detectedFormat}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-neutral-200 rounded border border-neutral-200 bg-white text-xs">
                    {pastePreview.messages.slice(0, 8).map((m) => (
                      <div key={m.id} className="px-3 py-2 flex items-start gap-2">
                        <span className="font-mono text-neutral-400 tabular-nums shrink-0">
                          #{m.index}
                        </span>
                        <span className="font-mono text-neutral-500 tabular-nums shrink-0">
                          [{m.timestampRaw}]
                        </span>
                        <span className="font-semibold text-neutral-950 shrink-0">
                          {m.sender}:
                        </span>
                        <span className="text-neutral-700 line-clamp-1">{m.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <ShieldCheck className="h-4 w-4 text-neutral-900 shrink-0" />
                  <span>Handles missing timestamps, multiline messages, emojis & system notices</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Analyze Conversation
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  processSelectedFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border border-dashed p-7 text-center transition-colors ${
                  isDragging
                    ? 'border-neutral-950 bg-neutral-100'
                    : 'border-neutral-300 bg-neutral-50 hover:border-neutral-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.log,.md,text/plain"
                  multiple
                  onChange={(e) => processSelectedFiles(e.target.files)}
                  className="hidden"
                />
                <Upload className="mx-auto h-7 w-7 text-neutral-900" />
                <p className="mt-2.5 text-sm font-medium text-neutral-950">
                  Click to select or drag and drop exported <span className="font-mono font-semibold text-neutral-950">.txt</span> chat files
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Supports uploading multiple group exports at once — each file is parsed into its own separate conversation
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 divide-y divide-neutral-200">
                    {uploadedFiles.map((file, idx) => {
                      const fileParsed = parseChatText(file.content);
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedPreviewFileIdx(idx)}
                          className={`cursor-pointer flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                            selectedPreviewFileIdx === idx ? 'bg-neutral-100' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-4 w-4 text-neutral-900 shrink-0" />
                            <span className="truncate font-semibold text-neutral-950">
                              {file.name}
                            </span>
                            <span className="text-neutral-500 font-mono tabular-nums shrink-0">
                              · {(file.size / 1024).toFixed(1)} KB · {fileParsed.messages.length} msgs ({fileParsed.detectedFormat})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
                              setSelectedPreviewFileIdx(0);
                            }}
                            className="text-neutral-500 hover:text-red-600 transition-colors ml-2 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live Parsed Message Preview for Selected File */}
                  {uploadPreview && uploadPreview.messages.length > 0 && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-neutral-950">
                          <Eye className="h-3.5 w-3.5" />
                          <span>
                            Parsed Preview: {(uploadedFiles[selectedPreviewFileIdx] || uploadedFiles[0])?.name} ({uploadPreview.messages.length} messages)
                          </span>
                        </div>
                        <span className="font-mono text-neutral-500 tabular-nums">
                          {uploadPreview.detectedFormat}
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-neutral-200 rounded border border-neutral-200 bg-white text-xs">
                        {uploadPreview.messages.slice(0, 10).map((m) => (
                          <div key={m.id} className="px-3 py-2 flex items-start gap-2">
                            <span className="font-mono text-neutral-400 tabular-nums shrink-0">
                              #{m.index}
                            </span>
                            <span className="font-mono text-neutral-500 tabular-nums shrink-0">
                              [{m.timestampRaw}]
                            </span>
                            <span className="font-semibold text-neutral-950 shrink-0">
                              {m.sender}:
                            </span>
                            <span className="text-neutral-700 line-clamp-1">{m.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral-500">
                  In WhatsApp: Open Group → More → Export Chat → Without Media (.txt)
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportUploadedFiles}
                    disabled={uploadedFiles.length === 0}
                    className="rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                  >
                    Analyze {uploadedFiles.length > 0 ? `(${uploadedFiles.length})` : ''} File{uploadedFiles.length === 1 ? '' : 's'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-600">
                Select a representative multi-participant group chat below to test exam schedule changes, relative and ambiguous dates, joke filtering, duplicate detection, and personal mentions:
              </p>
              <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50">
                {SAMPLE_CONVERSATIONS.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-white transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                        <span>{preset.badge}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-neutral-500">
                          {preset.rawText.split('\n').length} lines
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-950">{preset.name}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">{preset.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadSample(preset)}
                      className="rounded-lg bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                    >
                      Load Conversation
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
