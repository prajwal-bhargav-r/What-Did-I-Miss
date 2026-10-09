import { ParsedMessage } from '../types/chat';

interface RawExtractedMessage {
  timestampRaw: string;
  datePart: string | null;
  timePart: string | null;
  sender: string;
  content: string;
  isSystemHint: boolean;
}

const SYSTEM_MESSAGE_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /created group/i,
  /changed the subject/i,
  /changed the group description/i,
  /changed this group's icon/i,
  /\badded\b.+\bto the group\b/i,
  /\badded\s+[A-Z][a-z]+/i,
  /\bleft\b$/i,
  /\bjoined using this group's invite link/i,
  /\bpinned a message/i,
  /\bchanged their phone number/i,
  /\bsecurity code with .+ changed/i,
  /^you were added$/i,
];

const MEDIA_OMITTED_PATTERNS = [
  /^<media omitted>$/i,
  /^image omitted$/i,
  /^video omitted$/i,
  /^audio omitted$/i,
  /^document omitted$/i,
  /^sticker omitted$/i,
  /^gif omitted$/i,
  /^<attached:\s*.+>$/i,
  /\(file attached\)$/i,
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const RESERVED_LABELS = new Set([
  'http', 'https', 'mailto', 'note', 'notes', 'deadline', 'date', 'time', 'location',
  'venue', 'room', 'link', 'topic', 'agenda', 'summary', 'task', 'tasks', 'todo',
  'action', 'important', 'urgent', 'reminder', 'update', 'ps', 're', 'fwd',
  'syllabus', 'syllabus coverage', 'coverage', 'decision', 'status', 'details',
  'example', 'examples', 'option', 'options', 'step', 'question', 'answer',
  'reason', 'impact', 'fix', 'url', 'zoom', 'password', 'passcode', 'meeting id',
  'where', 'when', 'who', 'what', 'why', 'warning', 'error', 'info', 'tl;dr',
]);

function normalizeUnicodeSpaces(input: string): string {
  return input
    .replace(/[\u202F\u00A0\u2009\u2007]/g, ' ')
    .replace(/[\u200E\u200F\uFEFF]/g, '')
    .replace(/\b([AaPp])\.([Mm])\./g, '$1$2'); // Normalize "a.m." / "p.m." -> "am" / "pm"
}

export function detectDateOrder(dateStrings: string[]): 'MDY' | 'DMY' | 'YMD' {
  for (const ds of dateStrings) {
    const clean = ds.trim();
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(clean)) {
      return 'YMD';
    }
    const parts = clean.split(/[-/.]/).map((n) => parseInt(n, 10));
    if (parts.length === 3) {
      const [first, second] = parts;
      if (first > 12 && second <= 12) return 'DMY';
      if (second > 12 && first <= 12) return 'MDY';
    }
  }
  return 'MDY';
}

export function parseDateTimeToISO(
  datePart: string | null,
  timePart: string | null,
  dateOrder: 'MDY' | 'DMY' | 'YMD'
): { iso: string | null; hasDate: boolean; hasTime: boolean } {
  let year = 2026;
  let day = 1;
  let month = 0;
  let hasDate = false;

  if (datePart) {
    const cleanDate = datePart.trim();
    const namedMonthFirst = cleanDate.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:,?\s*(\d{2,4}))?$/);
    const namedDayFirst = cleanDate.match(/^(\d{1,2})\s+([A-Za-z]+)\.?(?:,?\s*(\d{2,4}))?$/);

    if (namedMonthFirst) {
      const mKey = namedMonthFirst[1].toLowerCase();
      if (MONTH_MAP[mKey] !== undefined) {
        month = MONTH_MAP[mKey];
        day = parseInt(namedMonthFirst[2], 10);
        if (namedMonthFirst[3]) {
          year = parseInt(namedMonthFirst[3], 10);
          if (year < 100) year += 2000;
        }
        hasDate = true;
      }
    } else if (namedDayFirst) {
      const mKey = namedDayFirst[2].toLowerCase();
      if (MONTH_MAP[mKey] !== undefined) {
        day = parseInt(namedDayFirst[1], 10);
        month = MONTH_MAP[mKey];
        if (namedDayFirst[3]) {
          year = parseInt(namedDayFirst[3], 10);
          if (year < 100) year += 2000;
        }
        hasDate = true;
      }
    } else {
      const parts = cleanDate.split(/[-/.]/).map((p) => parseInt(p, 10));
      if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
        if (dateOrder === 'YMD' || parts[0] > 1900) {
          year = parts[0];
          month = parts[1] - 1;
          day = parts[2];
        } else if (dateOrder === 'DMY') {
          day = parts[0];
          month = parts[1] - 1;
          year = parts[2];
        } else {
          month = parts[0] - 1;
          day = parts[1];
          year = parts[2];
        }
        if (year < 100) year += 2000;
        if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
          hasDate = true;
        }
      }
    }
  }

  let hours = 9;
  let minutes = 0;
  let seconds = 0;
  let hasTime = false;

  if (timePart) {
    const cleanTime = timePart.trim();
    const m = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?$/);
    if (m) {
      hours = parseInt(m[1], 10);
      minutes = parseInt(m[2], 10);
      seconds = m[3] ? parseInt(m[3], 10) : 0;
      const meridiem = m[4]?.toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      hasTime = true;
    }
  }

  if (!hasDate) {
    return { iso: null, hasDate: false, hasTime };
  }

  const dt = new Date(year, month, day, hours, minutes, seconds);
  if (isNaN(dt.getTime())) {
    return { iso: null, hasDate: false, hasTime };
  }
  return { iso: dt.toISOString(), hasDate: true, hasTime };
}

export interface ChatParseOutput {
  messages: ParsedMessage[];
  detectedFormat: string;
}

export function parseChatText(rawText: string): ChatParseOutput {
  const cleanedText = normalizeUnicodeSpaces(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanedText.split('\n');

  const rawMessages: RawExtractedMessage[] = [];
  const knownSenders = new Set<string>();
  const formatCounts = {
    whatsappBracket: 0,
    whatsappDash: 0,
    timeOnlyBracket: 0,
    senderColon: 0,
  };

  // 1. WhatsApp iOS / Bracketed: [10/12/2026, 9:15:00 AM] Sender: Message OR [2026-10-12 09:15] Sender: Message
  const reBracketDateTime =
    /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:,\s*\d{2,4})?)[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s*(?:([^:]+?):\s*(.*)|(.*))$/;

  // 2. WhatsApp Android / Dash separated: 10/12/26, 9:15 AM - Sender: Message OR 12/10/2026, 14:20 - System message
  const reDashDateTime =
    /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:,\s*\d{2,4})?)[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*[-–—]\s*(?:([^:]+?):\s*(.*)|(.*))$/;

  // 3. Time-only bracketed or parenthesized: [9:15 AM] Sender: Message OR (14:20) Sender: Message
  const reTimeOnly =
    /^[[(](\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)[\])]\s*([^:]{1,40}):\s*(.*)$/;

  // 4. Sender with timestamp in parens/brackets: Alex Chen [10/12/2026 9:15 AM]: Message OR Alex Chen (9:15 AM): Message
  const reSenderThenTime =
    /^([A-Za-z0-9_.\s@'-]{1,36}?)\s*[[(](?:(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|[A-Za-z]{3,9}\.?\s+\d{1,2})[,\s]+)?(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)[\])]:?\s*(.*)$/;

  // 5. Simple Sender: Message (e.g., "Liam O'Connor: I'll update the website banner...")
  const reSimpleSender = /^([A-Z][A-Za-z0-9_.\s'-]{1,30}):\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      if (rawMessages.length > 0 && rawMessages[rawMessages.length - 1].content.length > 0) {
        rawMessages[rawMessages.length - 1].content += '\n';
      }
      continue;
    }

    let matched = false;

    const mBracket = trimmed.match(reBracketDateTime);
    if (mBracket) {
      formatCounts.whatsappBracket++;
      const datePart = mBracket[1];
      const timePart = mBracket[2];
      const sender = mBracket[3] ? mBracket[3].trim() : 'System';
      const content = (mBracket[4] ?? mBracket[5] ?? '').trim();
      const isSystemHint = !mBracket[3];
      if (!isSystemHint) knownSenders.add(sender.toLowerCase());
      rawMessages.push({
        timestampRaw: `${datePart}, ${timePart}`,
        datePart,
        timePart,
        sender,
        content,
        isSystemHint,
      });
      matched = true;
    }

    if (!matched) {
      const mDash = trimmed.match(reDashDateTime);
      if (mDash) {
        formatCounts.whatsappDash++;
        const datePart = mDash[1];
        const timePart = mDash[2];
        const sender = mDash[3] ? mDash[3].trim() : 'System';
        const content = (mDash[4] ?? mDash[5] ?? '').trim();
        const isSystemHint = !mDash[3];
        if (!isSystemHint) knownSenders.add(sender.toLowerCase());
        rawMessages.push({
          timestampRaw: `${datePart}, ${timePart}`,
          datePart,
          timePart,
          sender,
          content,
          isSystemHint,
        });
        matched = true;
      }
    }

    if (!matched) {
      const mTimeOnly = trimmed.match(reTimeOnly);
      if (mTimeOnly) {
        formatCounts.timeOnlyBracket++;
        const timePart = mTimeOnly[1];
        const sender = mTimeOnly[2].trim();
        const content = mTimeOnly[3].trim();
        knownSenders.add(sender.toLowerCase());
        rawMessages.push({
          timestampRaw: timePart,
          datePart: null,
          timePart,
          sender,
          content,
          isSystemHint: false,
        });
        matched = true;
      }
    }

    if (!matched) {
      const mSenderTime = trimmed.match(reSenderThenTime);
      if (mSenderTime) {
        formatCounts.timeOnlyBracket++;
        const sender = mSenderTime[1].trim();
        const datePart = mSenderTime[2] || null;
        const timePart = mSenderTime[3];
        const content = mSenderTime[4].trim();
        knownSenders.add(sender.toLowerCase());
        rawMessages.push({
          timestampRaw: datePart ? `${datePart}, ${timePart}` : timePart,
          datePart,
          timePart,
          sender,
          content,
          isSystemHint: false,
        });
        matched = true;
      }
    }

    if (!matched) {
      const mSimple = trimmed.match(reSimpleSender);
      if (mSimple) {
        const candidateSender = mSimple[1].trim();
        const candidateLower = candidateSender.toLowerCase();
        const firstWord = candidateLower.split(/\s+/)[0];
        const isReserved =
          RESERVED_LABELS.has(firstWord) || RESERVED_LABELS.has(candidateLower);

        // Check if candidateSender is an already known sender OR looks like a person's name (e.g., "Maya Lin", "Prof. Sharma", "Alex")
        const isKnownSender = knownSenders.has(candidateLower);
        const words = candidateSender.split(/\s+/);
        const looksLikePersonName =
          words.length <= 3 &&
          words.every((w) => /^[A-Z@]/.test(w)) &&
          !isReserved;

        if (!isReserved && (isKnownSender || looksLikePersonName)) {
          formatCounts.senderColon++;
          knownSenders.add(candidateLower);
          rawMessages.push({
            timestampRaw: 'No timestamp',
            datePart: null,
            timePart: null,
            sender: candidateSender,
            content: mSimple[2].trim(),
            isSystemHint: false,
          });
          matched = true;
        }
      }
    }

    if (!matched) {
      if (rawMessages.length > 0) {
        const prev = rawMessages[rawMessages.length - 1];
        prev.content = prev.content
          ? `${prev.content.replace(/\n+$/, '')}\n${trimmed}`
          : trimmed;
      } else {
        rawMessages.push({
          timestampRaw: 'No timestamp',
          datePart: null,
          timePart: null,
          sender: 'Unknown Sender',
          content: trimmed,
          isSystemHint: false,
        });
      }
    }
  }

  // Determine dominant date format across all extracted date parts
  const allDateParts = rawMessages
    .map((m) => m.datePart)
    .filter((d): d is string => Boolean(d));
  const dateOrder = detectDateOrder(allDateParts);

  let lastKnownDatePart: string | null = null;
  const seenContentMap = new Map<string, string>();

  const parsedMessages: ParsedMessage[] = rawMessages.map((raw, idx) => {
    const id = `msg-${idx + 1}`;
    // Only inherit datePart if the message has a timePart (e.g., [9:15 AM] following a dated message)
    // If a message has 'No timestamp' at all, do NOT fabricate a datePart!
    const effectiveDatePart = raw.datePart || (raw.timePart ? lastKnownDatePart : null);
    if (raw.datePart) {
      lastKnownDatePart = raw.datePart;
    }

    const { iso, hasDate, hasTime } = parseDateTimeToISO(
      effectiveDatePart,
      raw.timePart,
      dateOrder
    );

    const contentClean = raw.content.trim();
    const isMediaOmitted = MEDIA_OMITTED_PATTERNS.some((re) => re.test(contentClean));
    const isSystem =
      raw.isSystemHint ||
      raw.sender.toLowerCase() === 'system' ||
      SYSTEM_MESSAGE_PATTERNS.some((re) => re.test(contentClean));

    const normalizedForDup = contentClean
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');

    let isDuplicate = false;
    let duplicateOfId: string | null = null;

    if (!isSystem && !isMediaOmitted && normalizedForDup.length >= 18) {
      const existingId = seenContentMap.get(normalizedForDup);
      if (existingId) {
        isDuplicate = true;
        duplicateOfId = existingId;
      } else {
        seenContentMap.set(normalizedForDup, id);
      }
    }

    return {
      id,
      index: idx + 1,
      timestampRaw: raw.timestampRaw,
      timestampISO: iso,
      hasExplicitDate: Boolean(effectiveDatePart && hasDate),
      hasExplicitTime: hasTime,
      sender: raw.sender,
      content: contentClean,
      isSystem,
      isMediaOmitted,
      isDuplicate,
      duplicateOfId,
      isJokeOrHypothetical: false,
      priority: 'low',
      priorityScore: 0,
      priorityReasons: [],
      categories: [],
      threadContext: null,
    };
  });

  let detectedFormat = 'Plain / Unstructured Text';
  if (
    formatCounts.whatsappBracket > 0 &&
    formatCounts.whatsappBracket >= formatCounts.whatsappDash
  ) {
    detectedFormat =
      formatCounts.senderColon > 0
        ? `Mixed Bracketed & Un-timestamped (${dateOrder})`
        : `Bracketed Timestamp Chat (${dateOrder})`;
  } else if (formatCounts.whatsappDash > 0) {
    detectedFormat =
      formatCounts.senderColon > 0
        ? `WhatsApp Export + Un-timestamped Lines (${dateOrder})`
        : `WhatsApp Export Format (${dateOrder})`;
  } else if (formatCounts.timeOnlyBracket > 0) {
    detectedFormat = 'Time-Only Chat Log';
  } else if (formatCounts.senderColon > 0) {
    detectedFormat = 'Sender-Prefixed Transcript';
  }

  return {
    messages: parsedMessages,
    detectedFormat,
  };
}
