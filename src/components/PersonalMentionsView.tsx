import React, { useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { ConversationRecord, PersonalMention, UserProfile } from '../types/chat';

interface PersonalMentionsViewProps {
  conversation: ConversationRecord;
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onInspectMessage: (messageId: string) => void;
  onJumpToTranscript: (messageId: string) => void;
}

export const PersonalMentionsView: React.FC<PersonalMentionsViewProps> = ({
  conversation,
  userProfile,
  onUpdateProfile,
  onInspectMessage,
  onJumpToTranscript,
}) => {
  const [nameInput, setNameInput] = useState(userProfile.userName);
  const [aliasInput, setAliasInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PersonalMention['type']>('all');

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...userProfile,
      userName: nameInput.trim(),
    });
  };

  const handleAddAlias = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = aliasInput.trim();
    if (!clean || userProfile.aliases.includes(clean)) return;
    onUpdateProfile({
      ...userProfile,
      aliases: [...userProfile.aliases, clean],
    });
    setAliasInput('');
  };

  const handleRemoveAlias = (alias: string) => {
    onUpdateProfile({
      ...userProfile,
      aliases: userProfile.aliases.filter((a) => a !== alias),
    });
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = topicInput.trim().toLowerCase();
    if (!clean || userProfile.followedTopics.includes(clean)) return;
    onUpdateProfile({
      ...userProfile,
      followedTopics: [...userProfile.followedTopics, clean],
    });
    setTopicInput('');
  };

  const handleRemoveTopic = (topic: string) => {
    onUpdateProfile({
      ...userProfile,
      followedTopics: userProfile.followedTopics.filter((t) => t !== topic),
    });
  };

  const filteredMentions = conversation.personalMentions.filter((m) =>
    typeFilter === 'all' ? true : m.type === typeFilter
  );

  const participantSuggestions = conversation.stats.participants.map((p) => p.name);

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-xl font-bold text-neutral-950">Important for You · Personal Mentions</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Highlights direct mentions of your name, tasks assigned to you, questions directed at you, replies to your messages, and topics you follow. The app never assumes a participant in the chat is you unless configured below.
        </p>
      </div>

      {/* Personal Relevance Configuration Panel */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Primary Display Name */}
          <form onSubmit={handleSaveName} className="space-y-2">
            <label className="block text-xs font-medium text-neutral-700">
              Your Name in Group Chats
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g., Alex, Maya Lin, Kabir..."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-neutral-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
              >
                Apply
              </button>
            </div>
            {participantSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-neutral-500">
                <span>Quick select participant:</span>
                {participantSuggestions.slice(0, 5).map((pName) => (
                  <button
                    key={pName}
                    type="button"
                    onClick={() => {
                      setNameInput(pName);
                      onUpdateProfile({ ...userProfile, userName: pName });
                    }}
                    className={`underline hover:text-neutral-950 transition-colors ${
                      userProfile.userName.toLowerCase() === pName.toLowerCase()
                        ? 'text-neutral-950 font-bold'
                        : 'text-neutral-600'
                    }`}
                  >
                    {pName}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* 2. Handles / Aliases */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-700">
              Nicknames or @Handles
            </label>
            <form onSubmit={handleAddAlias} className="flex items-center gap-2">
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="Add @handle or nickname..."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:border-neutral-950 transition-colors whitespace-nowrap shrink-0"
              >
                Add
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {userProfile.aliases.length === 0 ? (
                <span className="text-xs text-neutral-400">No aliases configured</span>
              ) : (
                userProfile.aliases.map((alias) => (
                  <button
                    key={alias}
                    type="button"
                    onClick={() => handleRemoveAlias(alias)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 hover:border-red-400 hover:text-red-700 transition-colors"
                    title="Click to remove alias"
                  >
                    <span>{alias}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 3. Followed Topics & Keywords */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-700">
              Followed Keywords & Topics
            </label>
            <form onSubmit={handleAddTopic} className="flex items-center gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Add topic (e.g., exam, raft, grpc)..."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-950 placeholder-neutral-400 focus:border-neutral-950 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:border-neutral-950 transition-colors whitespace-nowrap shrink-0"
              >
                Follow
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {userProfile.followedTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleRemoveTopic(topic)}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 hover:border-red-400 hover:text-red-700 transition-colors"
                  title="Click to unfollow keyword"
                >
                  <span>{topic}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: `All Relevant (${conversation.personalMentions.length})` },
            { id: 'assigned_task', label: 'Tasks Assigned to You' },
            { id: 'direct_question', label: 'Questions Directed at You' },
            { id: 'direct_mention', label: 'Direct Mentions' },
            { id: 'reply_to_user', label: 'Replies to Your Messages' },
            { id: 'followed_topic', label: 'Followed Topics' },
          ] as { id: 'all' | PersonalMention['type']; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTypeFilter(item.id)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              typeFilter === item.id
                ? 'border-neutral-950 bg-neutral-950 text-white font-semibold'
                : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950 hover:border-neutral-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Results List */}
      {filteredMentions.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center space-y-2">
          <p className="text-sm font-medium text-neutral-950">
            No personal mentions or topic matches found for the current filter.
          </p>
          <p className="text-xs text-neutral-500">
            Try selecting another participant name above or adding keywords relevant to this conversation.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-200">
          {filteredMentions.map((m) => (
            <div key={m.id} className="p-5 hover:bg-neutral-50 transition-colors space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-neutral-950">
                    {m.type === 'assigned_task'
                      ? 'Task Assigned to You'
                      : m.type === 'direct_question'
                      ? 'Question Directed at You'
                      : m.type === 'requires_response'
                      ? 'Requires Your Response'
                      : m.type === 'direct_mention'
                      ? 'Direct Name Mention'
                      : m.type === 'reply_to_user'
                      ? 'Reply to Your Message'
                      : `Followed Topic: "${m.matchedTerm}"`}
                  </span>
                  {m.requiresResponse && (
                    <>
                      <span aria-hidden="true" className="text-neutral-300">·</span>
                      <span className="font-semibold text-amber-700">Requires Response</span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="font-semibold text-neutral-900">{m.sender}</span>
                  <span aria-hidden="true" className="text-neutral-300">·</span>
                  <span className="font-mono tabular-nums text-neutral-500">{m.timestampRaw}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInspectMessage(m.messageId)}
                    className="font-mono tabular-nums text-xs font-semibold text-neutral-950 hover:underline whitespace-nowrap shrink-0"
                  >
                    Verify Context (#{m.messageIndex})
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToTranscript(m.messageId)}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-950 whitespace-nowrap shrink-0"
                  >
                    <span>Transcript</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-neutral-900 leading-relaxed whitespace-pre-wrap">
                {m.content}
              </p>

              <p className="text-xs text-neutral-600">
                <span className="font-semibold text-neutral-900">Relevance: </span>
                {m.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
