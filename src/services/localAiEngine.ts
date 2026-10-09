import {
  ActionItem,
  ConversationRecord,
  ConversationStats,
  ConversationSummary,
  DeadlineCategory,
  ExtractedDeadline,
  MessageCategory,
  ParsedMessage,
  PersonalMention,
  PriorityLevel,
  QACitation,
  QATurn,
  SummaryHighlight,
  TopicCluster,
  UnansweredQuestion,
  UserProfile,
} from '../types/chat';
import { parseChatText } from './chatParser';

const JOKE_OR_HYPOTHETICAL_PATTERNS = [
  /\b(jk|just kidding|kidding)\b/i,
  /\b(lmao|lmfao|rofl)\b/i,
  /\bimagine if\b/i,
  /\bhypothetically\b/i,
  /\bapril fools\b/i,
  /\bwhat if we just (skipped|cancelled|dropped|ignored)\b/i,
  /(😂|🤣){2,}/,
  /\bhaha+h?\b.*\b(imagine|kidding|joke)\b/i,
];

const HIGH_URGENCY_PATTERNS = [
  /\b(urgent|urgently|immediately|asap|critical|emergency|mandatory|compulsory)\b/i,
  /\b(important announcement|official announcement|final reminder|last call|attention everyone|attention all|important update)\b/i,
  /\b(rescheduled|postponed|moved to|changed to|new deadline|room change|venue change|time change|cancelled|canceled)\b/i,
  /\b(exam|midterm|final exam|quiz|viva|assessment|test)\b.*\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|\d{1,2}[/:]\d{1,2})\b/i,
  /\b(due today|due tonight|due tomorrow|submit by tonight|submit by tomorrow|deadline is today|deadline is tomorrow)\b/i,
  /\b(production down|outage|blocker|hotfix|rollback|deployment freeze)\b/i,
];

const SCHEDULE_CHANGE_PATTERNS = [
  /\b(rescheduled|postponed|moved from|moved to|shifted to|pushed back|brought forward|changed from|changed to|new time|new date|new room|new venue|instead of)\b/i,
];

const ANNOUNCEMENT_PATTERNS = [
  /\b(announcement|please note|fyi|heads up|notice|reminder|update for everyone|all students|team update|official update|important info)\b/i,
  /\b(prof|professor|dr\.|instructor|ta|admin|coordinator|lead|manager)\b/i,
];

const DECISION_PATTERNS = [
  /\b(we decided|it's decided|agreed|finalized|locked in|confirmed that|we'll go with|we will go with|let's stick with|consensus is|decision:|approved)\b/i,
];

const TASK_PATTERNS = [
  /\b(please submit|please complete|please send|please upload|please review|please prepare|please update|please check|please bring|please fill|please confirm|please share)\b/i,
  /\b(need to submit|needs to submit|need to finish|need to prepare|need someone to|have to submit|must submit|must complete|must share|make sure to|don't forget to|remember to)\b/i,
  /\b(can you|could you|will handle|is responsible for|assigned to|take care of|working on|i'll handle|i will handle|i'll submit|i will submit|i'll prepare|i will prepare|i'll update|i will update|action item|todo|to-do)\b/i,
];

const CASUAL_NOISE_PATTERNS = [
  /^(ok|okay|k|kk|yep|yup|yes|no|nope|sure|thanks|thank you|thx|ty|cool|nice|great|awesome|got it|noted|sounds good|perfect|ready|lol|haha|hehe|👍|🙏|🔥|❤️|👏|\+1)+[!.\s]*$/i,
  /^(good morning|good afternoon|good evening|good night|gm|gn|hey everyone|hi all|hello)[!.\s]*$/i,
];

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_INDEX: Record<string, number> = {
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

function formatHumanDate(date: Date): string {
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  const monthName = MONTH_NAMES_SHORT[date.getMonth()];
  return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
}

function extractTimeInText(text: string): string | null {
  const m12 = text.match(/\b(?:at|by|before|around|from)?\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\b/);
  if (m12) return m12[1].toUpperCase();
  const m24 = text.match(/\b(?:at|by|before)\s*([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (m24) return `${m24[1]}:${m24[2]}`;
  if (/\bby midnight\b|\b11:59\s*pm\b/i.test(text)) return '11:59 PM';
  if (/\bby noon\b|\b12:00\s*pm\b/i.test(text)) return '12:00 PM';
  if (/\bby eod\b|\bend of day\b/i.test(text)) return '5:00 PM (EOD)';
  return null;
}

function classifyDeadlineCategory(text: string): DeadlineCategory {
  if (SCHEDULE_CHANGE_PATTERNS.some((p) => p.test(text))) return 'schedule_change';
  if (/\b(exam|midterm|final|quiz|viva|test|assessment)\b/i.test(text)) return 'exam';
  if (/\b(assignment|homework|hw|problem set|lab report|worksheet|essay)\b/i.test(text)) return 'assignment';
  if (/\b(register|registration|sign up|signup|enroll|rsvp|form)\b/i.test(text)) return 'registration';
  if (/\b(project|milestone|prototype|deliverable|demo|release|deployment|migration|submission|slides|deck)\b/i.test(text)) return 'project';
  if (/\b(meeting|sync|standup|call|session|workshop|rehearsal|lecture|class|review)\b/i.test(text)) return 'meeting';
  return 'event';
}

function summarizeDeadlineTitle(text: string, threadContext: string | null, category: DeadlineCategory): string {
  const clean = text
    .replace(/^(hey everyone|hi all|quick update|heads up|reminder|urgent|important|fyi|also|note)[:,\s-]*/i, '')
    .trim();

  const firstSentence = clean.split(/(?<=[.!?])\s+|\n/)[0].trim();
  if (firstSentence.length >= 10 && firstSentence.length <= 95) {
    return firstSentence;
  }
  if (firstSentence.length > 95) {
    return firstSentence.slice(0, 92).trim() + '...';
  }
  if (threadContext && firstSentence.length < 22) {
    return `${threadContext.slice(0, 55)}: ${firstSentence}`;
  }
  const catLabel = category.replace('_', ' ');
  return firstSentence || `Scheduled ${catLabel}`;
}

export function extractDeadlinesForMessage(
  msg: ParsedMessage,
  conversationId: string
): ExtractedDeadline[] {
  if (msg.isSystem || msg.isMediaOmitted || msg.isDuplicate || msg.isJokeOrHypothetical) {
    return [];
  }

  const text = msg.content;
  const hasEventSignal =
    /\b(due|deadline|submit|submission|exam|midterm|quiz|test|assignment|project|meeting|sync|call|demo|launch|register|registration|rescheduled|moved|postponed|scheduled|session|presentation|viva|lab|workshop|review|ceremony|freeze|sign off|confirm)\b/i.test(
      text
    ) ||
    (msg.threadContext &&
      /\b(due|deadline|submit|exam|midterm|assignment|project|meeting|demo|rescheduled)\b/i.test(
        msg.threadContext
      ));

  if (!hasEventSignal) {
    return [];
  }

  const results: ExtractedDeadline[] = [];
  const timeString = extractTimeInText(text);
  const category = classifyDeadlineCategory(
    msg.threadContext ? `${text} ${msg.threadContext}` : text
  );
  const title = summarizeDeadlineTitle(text, msg.threadContext, category);
  const baseDate = msg.hasExplicitDate && msg.timestampISO ? new Date(msg.timestampISO) : null;
  const baseYear = baseDate ? baseDate.getFullYear() : 2026;

  // 1. Check Explicit Named Month Dates: e.g. "Oct 16", "October 16th, 2026", "16 Oct"
  const reMonthDay =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/gi;
  const reDayMonth =
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?(?:,?\s*(\d{4}))?\b/gi;

  // Also check explicit numeric dates inside message text: e.g., "2026-10-25" or "10/25/2026"
  const reNumericDate = /\b(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{2,4}))\b/g;

  const matchedRawExpressions = new Set<string>();

  let m: RegExpExecArray | null;
  while ((m = reMonthDay.exec(text)) !== null) {
    const rawExpr = m[0];
    if (matchedRawExpressions.has(rawExpr.toLowerCase())) continue;
    matchedRawExpressions.add(rawExpr.toLowerCase());

    const mIdx = MONTH_INDEX[m[1].toLowerCase().replace('.', '')];
    const day = parseInt(m[2], 10);
    const year = m[3] ? parseInt(m[3], 10) : baseYear;

    if (mIdx !== undefined && day >= 1 && day <= 31) {
      const checkBefore = text.slice(Math.max(0, m.index - 18), m.index).toLowerCase();
      if (/\b(moved from|changed from|instead of|was on)\s*$/i.test(checkBefore)) {
        continue;
      }

      const dt = new Date(year, mIdx, day, 12, 0, 0);
      results.push({
        id: `dl-${msg.id}-${results.length + 1}`,
        conversationId,
        messageId: msg.id,
        messageIndex: msg.index,
        title,
        category,
        rawDateExpression: timeString ? `${rawExpr} (${timeString})` : rawExpr,
        resolvedDateISO: dt.toISOString(),
        displayDate: timeString ? `${formatHumanDate(dt)} · ${timeString}` : formatHumanDate(dt),
        timeString,
        resolutionType: 'explicit',
        resolutionExplanation: `Explicit calendar date ("${rawExpr}") stated directly in message #${msg.index}.`,
        userConfirmedDate: null,
        isConfirmed: true,
        priority: category === 'exam' || category === 'schedule_change' ? 'high' : 'medium',
        sender: msg.sender,
        timestampRaw: msg.timestampRaw,
        originalContent: msg.content,
      });
    }
  }

  while ((m = reDayMonth.exec(text)) !== null) {
    const rawExpr = m[0];
    if (matchedRawExpressions.has(rawExpr.toLowerCase())) continue;
    matchedRawExpressions.add(rawExpr.toLowerCase());

    const day = parseInt(m[1], 10);
    const mIdx = MONTH_INDEX[m[2].toLowerCase().replace('.', '')];
    const year = m[3] ? parseInt(m[3], 10) : baseYear;

    if (mIdx !== undefined && day >= 1 && day <= 31) {
      const checkBefore = text.slice(Math.max(0, m.index - 18), m.index).toLowerCase();
      if (/\b(moved from|changed from|instead of|was on)\s*$/i.test(checkBefore)) {
        continue;
      }

      const dt = new Date(year, mIdx, day, 12, 0, 0);
      results.push({
        id: `dl-${msg.id}-${results.length + 1}`,
        conversationId,
        messageId: msg.id,
        messageIndex: msg.index,
        title,
        category,
        rawDateExpression: timeString ? `${rawExpr} (${timeString})` : rawExpr,
        resolvedDateISO: dt.toISOString(),
        displayDate: timeString ? `${formatHumanDate(dt)} · ${timeString}` : formatHumanDate(dt),
        timeString,
        resolutionType: 'explicit',
        resolutionExplanation: `Explicit calendar date ("${rawExpr}") stated directly in message #${msg.index}.`,
        userConfirmedDate: null,
        isConfirmed: true,
        priority: category === 'exam' || category === 'schedule_change' ? 'high' : 'medium',
        sender: msg.sender,
        timestampRaw: msg.timestampRaw,
        originalContent: msg.content,
      });
    }
  }

  while ((m = reNumericDate.exec(text)) !== null) {
    const rawExpr = m[0];
    if (matchedRawExpressions.has(rawExpr.toLowerCase())) continue;
    matchedRawExpressions.add(rawExpr.toLowerCase());

    let year = baseYear;
    let month = 0;
    let day = 1;
    if (m[1]) {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10) - 1;
      day = parseInt(m[3], 10);
    } else if (m[4]) {
      const p1 = parseInt(m[4], 10);
      const p2 = parseInt(m[5], 10);
      year = parseInt(m[6], 10);
      if (year < 100) year += 2000;
      if (p1 > 12) {
        day = p1;
        month = p2 - 1;
      } else {
        month = p1 - 1;
        day = p2;
      }
    }

    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day, 12, 0, 0);
      results.push({
        id: `dl-${msg.id}-${results.length + 1}`,
        conversationId,
        messageId: msg.id,
        messageIndex: msg.index,
        title,
        category,
        rawDateExpression: timeString ? `${rawExpr} (${timeString})` : rawExpr,
        resolvedDateISO: dt.toISOString(),
        displayDate: timeString ? `${formatHumanDate(dt)} · ${timeString}` : formatHumanDate(dt),
        timeString,
        resolutionType: 'explicit',
        resolutionExplanation: `Explicit calendar date ("${rawExpr}") stated directly in message #${msg.index}.`,
        userConfirmedDate: null,
        isConfirmed: true,
        priority: category === 'exam' || category === 'schedule_change' ? 'high' : 'medium',
        sender: msg.sender,
        timestampRaw: msg.timestampRaw,
        originalContent: msg.content,
      });
    }
  }

  // 2. Check Relative Date Expressions if no explicit date was already extracted from this message
  if (results.length === 0) {
    // Check ambiguous multi-day expressions first: e.g. "Monday or Tuesday", "sometime next week"
    const reEitherDay =
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+or\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const mEither = text.match(reEitherDay);

    if (mEither) {
      const rawExpr = mEither[0];
      const day1 = mEither[1].toLowerCase();
      const day2 = mEither[2].toLowerCase();
      const options: string[] = [];

      if (baseDate) {
        [day1, day2].forEach((dName) => {
          const targetDow = DAY_NAMES.indexOf(dName);
          const diff = (targetDow - baseDate.getDay() + 7) % 7 || 7;
          const candidate = new Date(baseDate);
          candidate.setDate(baseDate.getDate() + diff);
          options.push(
            timeString
              ? `${formatHumanDate(candidate)} · ${timeString}`
              : formatHumanDate(candidate)
          );
        });
      } else {
        options.push(
          `${mEither[1]}${timeString ? ` · ${timeString}` : ''}`,
          `${mEither[2]}${timeString ? ` · ${timeString}` : ''}`
        );
      }

      results.push({
        id: `dl-${msg.id}-rel`,
        conversationId,
        messageId: msg.id,
        messageIndex: msg.index,
        title,
        category,
        rawDateExpression: rawExpr,
        resolvedDateISO: null,
        displayDate: `Ambiguous: "${rawExpr}"`,
        timeString,
        resolutionType: 'ambiguous',
        resolutionExplanation: `Message mentions "${rawExpr}" without locking in a single day. Please confirm the exact date.`,
        candidateOptions: options,
        userConfirmedDate: null,
        isConfirmed: false,
        priority: 'medium',
        sender: msg.sender,
        timestampRaw: msg.timestampRaw,
        originalContent: msg.content,
      });
      return results;
    }

    // Check "next [DayOfWeek]" - inherently ambiguous in natural conversation!
    const reNextDow = /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const mNextDow = text.match(reNextDow);
    if (mNextDow) {
      const rawExpr = mNextDow[0];
      const targetDow = DAY_NAMES.indexOf(mNextDow[1].toLowerCase());

      if (baseDate && targetDow !== -1) {
        const daysToClosest = (targetDow - baseDate.getDay() + 7) % 7 || 7;
        const closestDate = new Date(baseDate);
        closestDate.setDate(baseDate.getDate() + daysToClosest);

        const followingWeekDate = new Date(closestDate);
        followingWeekDate.setDate(closestDate.getDate() + 7);

        const opt1 = timeString
          ? `${formatHumanDate(closestDate)} · ${timeString}`
          : formatHumanDate(closestDate);
        const opt2 = timeString
          ? `${formatHumanDate(followingWeekDate)} · ${timeString}`
          : formatHumanDate(followingWeekDate);

        results.push({
          id: `dl-${msg.id}-nextdow`,
          conversationId,
          messageId: msg.id,
          messageIndex: msg.index,
          title,
          category,
          rawDateExpression: timeString ? `${rawExpr} (${timeString})` : rawExpr,
          resolvedDateISO: closestDate.toISOString(),
          displayDate: `${opt1} (or ${formatHumanDate(followingWeekDate)})`,
          timeString,
          resolutionType: 'ambiguous',
          resolutionExplanation: `"${rawExpr}" sent on ${formatHumanDate(baseDate)} can mean either the upcoming ${mNextDow[1]} (${formatHumanDate(closestDate)}) or the following week's ${mNextDow[1]} (${formatHumanDate(followingWeekDate)}). Confirm below.`,
          candidateOptions: [opt1, opt2],
          userConfirmedDate: null,
          isConfirmed: false,
          priority: category === 'exam' || category === 'schedule_change' ? 'high' : 'medium',
          sender: msg.sender,
          timestampRaw: msg.timestampRaw,
          originalContent: msg.content,
        });
      } else {
        results.push({
          id: `dl-${msg.id}-nextdow`,
          conversationId,
          messageId: msg.id,
          messageIndex: msg.index,
          title,
          category,
          rawDateExpression: rawExpr,
          resolvedDateISO: null,
          displayDate: `Unresolved: "${rawExpr}"`,
          timeString,
          resolutionType: 'ambiguous',
          resolutionExplanation: `Cannot automatically resolve "${rawExpr}" because message #${msg.index} does not have a full calendar timestamp.`,
          candidateOptions: [],
          userConfirmedDate: null,
          isConfirmed: false,
          priority: 'medium',
          sender: msg.sender,
          timestampRaw: msg.timestampRaw,
          originalContent: msg.content,
        });
      }
      return results;
    }

    // Check "tomorrow", "today", "tonight", "this [DayOfWeek]", "by/before/on [DayOfWeek]", "in N days"
    const reRelativeSimple =
      /\b(day after tomorrow|tomorrow|tonight|today|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:by|before|on|for)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+(\d{1,2})\s+days?)\b/i;
    const mRel = text.match(reRelativeSimple);

    if (mRel) {
      const rawExpr = mRel[0];
      const lowerExpr = rawExpr.toLowerCase();

      if (!baseDate) {
        results.push({
          id: `dl-${msg.id}-unres`,
          conversationId,
          messageId: msg.id,
          messageIndex: msg.index,
          title,
          category,
          rawDateExpression: timeString ? `${rawExpr} (${timeString})` : rawExpr,
          resolvedDateISO: null,
          displayDate: `Needs Date Confirmation ("${rawExpr}")`,
          timeString,
          resolutionType: 'ambiguous',
          resolutionExplanation: `Message mentions relative date "${rawExpr}", but message #${msg.index} lacks a calendar date timestamp to anchor the calculation.`,
          candidateOptions: [],
          userConfirmedDate: null,
          isConfirmed: false,
          priority: 'high',
          sender: msg.sender,
          timestampRaw: msg.timestampRaw,
          originalContent: msg.content,
        });
      } else {
        const resolved = new Date(baseDate);
        if (lowerExpr === 'tomorrow') {
          resolved.setDate(baseDate.getDate() + 1);
        } else if (lowerExpr === 'day after tomorrow') {
          resolved.setDate(baseDate.getDate() + 2);
        } else if (lowerExpr === 'today' || lowerExpr === 'tonight') {
          // same calendar date as baseDate
        } else if (mRel[2]) {
          resolved.setDate(baseDate.getDate() + parseInt(mRel[2], 10));
        } else {
          const foundDow = DAY_NAMES.findIndex((d) => lowerExpr.includes(d));
          if (foundDow !== -1) {
            const diff = (foundDow - baseDate.getDay() + 7) % 7 || 7;
            resolved.setDate(baseDate.getDate() + diff);
          }
        }

        const formatted = timeString
          ? `${formatHumanDate(resolved)} · ${timeString}`
          : formatHumanDate(resolved);

        results.push({
          id: `dl-${msg.id}-rel`,
          conversationId,
          messageId: msg.id,
          messageIndex: msg.index,
          title,
          category,
          rawDateExpression: timeString ? `${rawExpr} (${timeString})` : rawExpr,
          resolvedDateISO: resolved.toISOString(),
          displayDate: formatted,
          timeString,
          resolutionType: 'relative_resolved',
          resolutionExplanation: `Resolved "${rawExpr}" relative to message timestamp (${formatHumanDate(baseDate)}) → ${formatHumanDate(resolved)}.`,
          userConfirmedDate: null,
          isConfirmed: true,
          priority:
            lowerExpr.includes('tomorrow') ||
            lowerExpr.includes('today') ||
            lowerExpr.includes('tonight') ||
            category === 'exam' ||
            category === 'schedule_change'
              ? 'high'
              : 'medium',
          sender: msg.sender,
          timestampRaw: msg.timestampRaw,
          originalContent: msg.content,
        });
      }
    }
  }

  return results;
}

function detectAssignee(
  msg: ParsedMessage,
  knownParticipants: string[]
): { assignee: string; confidence: 'explicit' | 'inferred_sender' | 'uncertain' } {
  const text = msg.content;

  // 1. Check @Mention in message text
  const atMatch = text.match(/@([A-Za-z][A-Za-z0-9_.\s-]{1,24})/);
  if (atMatch) {
    const rawMention = atMatch[1].trim().split(/\s+/)[0];
    const matchedParticipant = knownParticipants.find((p) =>
      p.toLowerCase().includes(rawMention.toLowerCase())
    );
    return {
      assignee: matchedParticipant || rawMention,
      confidence: 'explicit',
    };
  }

  // 2. Check if any known participant's name is explicitly addressed with a task
  for (const participant of knownParticipants) {
    if (participant === 'System' || participant === 'Unknown Sender') continue;
    const firstName = participant.split(/\s+/)[0];
    if (firstName.length < 2) continue;

    const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const directAssignRe = new RegExp(
      `(?:^|\\b)${escaped}(?:[,:\\s]+(?:can you|could you|please|will|needs? to|should|is handling|to handle)|\\s+will\\s+(?:handle|prepare|submit|take|lead|upload|send))`,
      'i'
    );
    if (directAssignRe.test(text)) {
      return {
        assignee: participant,
        confidence: 'explicit',
      };
    }
  }

  // 3. Check if sender is self-assigning ("I'll handle...", "I will submit...", "I'm taking care of...")
  if (
    /\b(i'll|i will|i am going to|i can)\s+(handle|submit|upload|prepare|send|finish|write|take care of|create|set up|book|update)\b/i.test(
      text
    )
  ) {
    return {
      assignee: `${msg.sender} (Self-assigned)`,
      confidence: 'inferred_sender',
    };
  }

  // 4. Check if addressed to everyone / all students / whole team / all services
  if (
    /\b(everyone|all students|all services|each group|each team member|everybody|all of you|class)\b.*\b(must|should|need to|please|submit|complete|bring|register|fill|share)\b/i.test(
      text
    )
  ) {
    return {
      assignee: 'Everyone / All Members',
      confidence: 'explicit',
    };
  }

  return {
    assignee: 'Uncertain / Not specified',
    confidence: 'uncertain',
  };
}

export function analyzeConversationLocal(
  rawText: string,
  conversationName: string,
  sourceType: 'file' | 'paste' | 'sample',
  userProfile: UserProfile,
  fileName?: string,
  existingId?: string
): ConversationRecord {
  const startTime = performance.now();
  const conversationId =
    existingId || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { messages, detectedFormat } = parseChatText(rawText);

  const participantMap = new Map<string, number>();
  for (const m of messages) {
    if (!m.isSystem && m.sender !== 'System') {
      participantMap.set(m.sender, (participantMap.get(m.sender) || 0) + 1);
    }
  }
  const participants = Array.from(participantMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const participantNames = participants.map((p) => p.name);

  // Step 1: Build thread context across consecutive / proximate messages
  let activeTopicContext: string | null = null;
  let activeTopicIndex = -10;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.isSystem || msg.isMediaOmitted) continue;

    const topicIntroMatch = msg.content.match(
      /\b(midterm|final exam|quiz|assignment\s*\d*|project\s*\w*|milestone|api migration|database|deployment|presentation|hackathon|venue|registration|meeting|lecture|lab\s*\d*)\b/i
    );
    if (topicIntroMatch && msg.content.length > 25) {
      activeTopicContext = topicIntroMatch[0];
      activeTopicIndex = i;
    } else if (i - activeTopicIndex <= 3 && activeTopicContext) {
      msg.threadContext = activeTopicContext;
    }
  }

  // Step 2: Score messages, detect jokes/hypotheticals, extract deadlines & action items
  const allDeadlines: ExtractedDeadline[] = [];
  const allActionItems: ActionItem[] = [];
  const allMentions: PersonalMention[] = [];

  const userNamesLower = [
    userProfile.userName.trim(),
    ...userProfile.aliases.map((a) => a.trim().replace(/^@/, '')),
  ]
    .filter(Boolean)
    .map((n) => n.toLowerCase());

  const followedTopicsLower = userProfile.followedTopics
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const userMessageIndices = new Set<number>();
  messages.forEach((m, idx) => {
    if (
      userNamesLower.length > 0 &&
      userNamesLower.some((un) => m.sender.toLowerCase().includes(un))
    ) {
      userMessageIndices.add(idx);
    }
  });

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.isSystem) {
      msg.priority = 'low';
      msg.priorityScore = 5;
      msg.priorityReasons = ['System notification or group metadata event'];
      msg.categories = ['general'];
      continue;
    }

    if (msg.isMediaOmitted) {
      msg.priority = 'low';
      msg.priorityScore = 5;
      msg.priorityReasons = ['Omitted media placeholder without text payload'];
      msg.categories = ['general'];
      continue;
    }

    if (msg.isDuplicate) {
      msg.priority = 'low';
      msg.priorityScore = 10;
      msg.priorityReasons = [
        `Duplicate of earlier message (${msg.duplicateOfId?.replace('msg-', '#')}) — preserved in history but deduplicated from primary summary`,
      ];
      msg.categories = ['general'];
      continue;
    }

    if (JOKE_OR_HYPOTHETICAL_PATTERNS.some((re) => re.test(msg.content))) {
      msg.isJokeOrHypothetical = true;
      msg.priority = 'low';
      msg.priorityScore = 15;
      msg.priorityReasons = [
        'Detected humor, sarcasm, or hypothetical phrasing — not treated as a confirmed deadline or task',
      ];
      msg.categories = ['general'];
      continue;
    }

    if (CASUAL_NOISE_PATTERNS.some((re) => re.test(msg.content.trim()))) {
      msg.priority = 'low';
      msg.priorityScore = 10;
      msg.priorityReasons = ['Brief conversational acknowledgement or greeting'];
      msg.categories = ['general'];
      continue;
    }

    let score = 20;
    const reasons: string[] = [];
    const categories = new Set<MessageCategory>();

    const msgDeadlines = extractDeadlinesForMessage(msg, conversationId);
    if (msgDeadlines.length > 0) {
      allDeadlines.push(...msgDeadlines);
      categories.add('deadline');
      const hasHighDl = msgDeadlines.some((d) => d.priority === 'high');
      score += hasHighDl ? 45 : 30;
      reasons.push(
        `Contains time-sensitive date/deadline (${msgDeadlines.map((d) => d.rawDateExpression).join(', ')})`
      );
    }

    if (SCHEDULE_CHANGE_PATTERNS.some((re) => re.test(msg.content))) {
      categories.add('schedule_change');
      categories.add('announcement');
      score += 40;
      reasons.push('Announces a schedule, room, or deadline change affecting plans');
    }

    if (HIGH_URGENCY_PATTERNS.some((re) => re.test(msg.content))) {
      categories.add('announcement');
      score += 35;
      if (!reasons.some((r) => r.includes('schedule'))) {
        reasons.push('Contains high-urgency announcement or imminent deadline instructions');
      }
    } else if (
      ANNOUNCEMENT_PATTERNS.some((re) => re.test(msg.content)) ||
      ANNOUNCEMENT_PATTERNS.some((re) => re.test(msg.sender))
    ) {
      if (msg.content.length > 35) {
        categories.add('announcement');
        score += 22;
        reasons.push(`Key announcement or update shared by ${msg.sender}`);
      }
    }

    if (DECISION_PATTERNS.some((re) => re.test(msg.content))) {
      categories.add('decision');
      score += 28;
      reasons.push('Records an explicit group decision or agreed course of action');
    }

    const isTaskCandidate =
      TASK_PATTERNS.some((re) => re.test(msg.content)) &&
      !msg.content.trim().endsWith('?');

    const isDirectiveQuestion =
      /\b(can you|could you|would you)\s+(please\s+)?(submit|send|upload|prepare|review|update|finish|check|bring|share|confirm|refactor)\b/i.test(
        msg.content
      );

    if (isTaskCandidate || isDirectiveQuestion) {
      categories.add('action_item');
      const { assignee, confidence } = detectAssignee(msg, participantNames);
      const linkedDeadline = msgDeadlines[0];

      let deadlineStr = 'Not specified';
      let deadlineConf: ActionItem['deadlineConfidence'] = 'not_specified';
      if (linkedDeadline) {
        deadlineStr = linkedDeadline.displayDate;
        deadlineConf = linkedDeadline.resolutionType;
      } else {
        const inlineTime = extractTimeInText(msg.content);
        if (inlineTime) {
          deadlineStr = inlineTime;
          deadlineConf = 'explicit';
        }
      }

      const taskPriority: PriorityLevel =
        score >= 65 || HIGH_URGENCY_PATTERNS.some((re) => re.test(msg.content))
          ? 'high'
          : 'medium';

      score += 25;
      reasons.push(
        confidence === 'explicit'
          ? `Actionable task assigned to ${assignee}`
          : 'Contains actionable task or responsibility'
      );

      allActionItems.push({
        id: `task-${msg.id}`,
        conversationId,
        messageId: msg.id,
        messageIndex: msg.index,
        description: msg.content.replace(/^@[A-Za-z0-9_.\s-]+[,:\s]*/, '').trim(),
        assignee,
        assigneeConfidence: confidence,
        deadline: deadlineStr,
        deadlineConfidence: deadlineConf,
        priority: taskPriority,
        status: 'pending',
        sender: msg.sender,
        timestampRaw: msg.timestampRaw,
        originalContent: msg.content,
        explanation:
          confidence === 'explicit'
            ? `Explicitly assigned to ${assignee} in message #${msg.index}.`
            : confidence === 'inferred_sender'
            ? `${msg.sender} volunteered to take this action in message #${msg.index}.`
            : `Task mentioned in message #${msg.index}; exact individual assignee was not explicitly specified.`,
      });
    }

    if (msg.content.includes('?') && msg.content.length > 15) {
      categories.add('question');
      if (score < 40) {
        score += 15;
        reasons.push('Contains a question directed to the group');
      }
    }

    const contentLower = msg.content.toLowerCase();
    const isSentByUser = userMessageIndices.has(i);

    if (!isSentByUser) {
      const matchedName = userNamesLower.find((un) => {
        const escaped = un.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?:^|@|\\b)${escaped}\\b`, 'i').test(contentLower);
      });

      if (matchedName) {
        categories.add('mention');
        score += 40;
        const isQuestionToUser =
          msg.content.includes('?') && !isDirectiveQuestion;
        const isTaskToUser = categories.has('action_item');
        const mentionType: PersonalMention['type'] = isTaskToUser
          ? 'assigned_task'
          : isQuestionToUser
          ? 'direct_question'
          : 'direct_mention';

        const reasonText = isTaskToUser
          ? `Directly assigns a task to you ("${matchedName}")`
          : isQuestionToUser
          ? `Direct question addressed to you ("${matchedName}")`
          : `Directly mentions your name/alias ("${matchedName}")`;

        reasons.push(reasonText);
        allMentions.push({
          id: `mention-${msg.id}`,
          conversationId,
          messageId: msg.id,
          messageIndex: msg.index,
          type: mentionType,
          matchedTerm: matchedName,
          reason: reasonText,
          priority: 'high',
          sender: msg.sender,
          timestampRaw: msg.timestampRaw,
          content: msg.content,
        });
      } else if (i > 0 && userMessageIndices.has(i - 1)) {
        categories.add('mention');
        score += 25;
        const reasonText = `Direct reply following your message (#${messages[i - 1].index})`;
        reasons.push(reasonText);
        allMentions.push({
          id: `mention-reply-${msg.id}`,
          conversationId,
          messageId: msg.id,
          messageIndex: msg.index,
          type: 'reply_to_user',
          matchedTerm: 'Reply to your message',
          reason: reasonText,
          priority: 'medium',
          sender: msg.sender,
          timestampRaw: msg.timestampRaw,
          content: msg.content,
        });
      }

      const matchedTopic = followedTopicsLower.find((topic) => contentLower.includes(topic));
      if (matchedTopic && !matchedName) {
        categories.add('mention');
        score += 20;
        const reasonText = `Matches your followed topic/keyword "${matchedTopic}"`;
        reasons.push(reasonText);
        allMentions.push({
          id: `mention-topic-${msg.id}`,
          conversationId,
          messageId: msg.id,
          messageIndex: msg.index,
          type: 'followed_topic',
          matchedTerm: matchedTopic,
          reason: reasonText,
          priority: score >= 65 ? 'high' : 'medium',
          sender: msg.sender,
          timestampRaw: msg.timestampRaw,
          content: msg.content,
        });
      }
    }

    if (categories.size === 0) {
      categories.add('general');
    }

    let priority: PriorityLevel = 'low';
    if (score >= 60) {
      priority = 'high';
    } else if (score >= 38) {
      priority = 'medium';
    } else {
      priority = 'low';
      if (reasons.length === 0) {
        reasons.push('General conversational message without urgent deadlines or tasks');
      }
    }

    msg.priority = priority;
    msg.priorityScore = Math.min(100, score);
    msg.priorityReasons = reasons;
    msg.categories = Array.from(categories);
  }

  allDeadlines.sort((a, b) => {
    if (a.resolvedDateISO && b.resolvedDateISO) {
      return new Date(a.resolvedDateISO).getTime() - new Date(b.resolvedDateISO).getTime();
    }
    if (a.resolvedDateISO && !b.resolvedDateISO) return -1;
    if (!a.resolvedDateISO && b.resolvedDateISO) return 1;
    return a.messageIndex - b.messageIndex;
  });

  const summary = buildGroundedSummary(messages, allDeadlines, allActionItems);

  const validDates = messages
    .filter((m) => m.hasExplicitDate && m.timestampISO)
    .map((m) => new Date(m.timestampISO!));

  const dateRange = {
    start: validDates.length > 0 ? formatHumanDate(validDates[0]) : null,
    end: validDates.length > 0 ? formatHumanDate(validDates[validDates.length - 1]) : null,
  };

  const stats: ConversationStats = {
    totalMessages: messages.length,
    userMessages: messages.filter((m) => !m.isSystem).length,
    systemMessages: messages.filter((m) => m.isSystem).length,
    duplicateMessages: messages.filter((m) => m.isDuplicate).length,
    highPriorityCount: messages.filter((m) => m.priority === 'high').length,
    mediumPriorityCount: messages.filter((m) => m.priority === 'medium').length,
    lowPriorityCount: messages.filter((m) => m.priority === 'low').length,
    participants,
    dateRange,
    detectedFormat,
    processingTimeMs: Math.max(1, Math.round(performance.now() - startTime)),
  };

  const nowISO = new Date().toISOString();

  return {
    id: conversationId,
    name: conversationName,
    createdAt: nowISO,
    updatedAt: nowISO,
    sourceType,
    fileName,
    rawText,
    messages,
    stats,
    summary,
    actionItems: allActionItems,
    deadlines: allDeadlines,
    personalMentions: allMentions,
    qaHistory: [],
  };
}

function buildGroundedSummary(
  messages: ParsedMessage[],
  deadlines: ExtractedDeadline[],
  actionItems: ActionItem[]
): ConversationSummary {
  const activeMessages = messages.filter(
    (m) => !m.isSystem && !m.isMediaOmitted && !m.isDuplicate && !m.isJokeOrHypothetical
  );

  // 1. Extract top announcements
  const announcements: SummaryHighlight[] = activeMessages
    .filter(
      (m) =>
        m.categories.includes('announcement') ||
        m.categories.includes('schedule_change') ||
        m.priority === 'high'
    )
    .slice(0, 8)
    .map((m) => ({
      id: `ann-${m.id}`,
      text: m.content,
      sender: m.sender,
      timestampRaw: m.timestampRaw,
      messageId: m.id,
      messageIndex: m.index,
      priority: m.priority,
      reason: m.priorityReasons[0] || 'Important update',
    }));

  // 2. Extract decisions
  const decisions: SummaryHighlight[] = activeMessages
    .filter((m) => m.categories.includes('decision'))
    .map((m) => ({
      id: `dec-${m.id}`,
      text: m.content,
      sender: m.sender,
      timestampRaw: m.timestampRaw,
      messageId: m.id,
      messageIndex: m.index,
      priority: m.priority,
      reason: 'Group consensus or explicit decision',
    }));

  // 3. Detect Unanswered Questions
  const unansweredQuestions: UnansweredQuestion[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (
      m.isSystem ||
      m.isMediaOmitted ||
      m.isDuplicate ||
      m.isJokeOrHypothetical ||
      !m.content.includes('?')
    ) {
      continue;
    }

    if (
      /\b(can you|could you)\s+(please\s+)?(submit|upload|send|make sure|confirm|refactor)\b/i.test(
        m.content
      )
    ) {
      continue;
    }

    const STOPWORDS = new Set([
      'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
      'does', 'did', 'will', 'would', 'could', 'should', 'have', 'has', 'had',
      'this', 'that', 'these', 'those', 'there', 'their', 'about', 'from',
      'with', 'anyone', 'somebody', 'know', 'guys', 'everyone', 'please', 'still',
    ]);
    const qWords = m.content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

    let answered = false;
    for (let j = i + 1; j <= Math.min(messages.length - 1, i + 5); j++) {
      const reply = messages[j];
      if (reply.isSystem || reply.sender === m.sender) continue;
      const replyLower = reply.content.toLowerCase();

      const sharedKeyword = qWords.some((kw) => replyLower.includes(kw));
      const directYesNo =
        j === i + 1 &&
        /\b(yes|no|yeah|nope|it is|it's|we are|you can|check the|in room|on friday|on monday|at \d)\b/i.test(
          replyLower
        );

      if ((sharedKeyword && !reply.content.trim().endsWith('?')) || directYesNo) {
        answered = true;
        break;
      }
    }

    if (!answered) {
      unansweredQuestions.push({
        id: `uq-${m.id}`,
        question: m.content,
        sender: m.sender,
        timestampRaw: m.timestampRaw,
        messageId: m.id,
        messageIndex: m.index,
        contextNote:
          i === messages.length - 1
            ? 'Asked at the end of the conversation with no subsequent messages.'
            : 'No direct answer or resolution detected in the following messages.',
      });
    }
  }

  // 4. Cluster main topics discussed (Domain patterns + Dynamic TF-IDF keyword clustering for any custom chat)
  const TOPIC_DEFINITIONS: { id: string; label: string; regex: RegExp }[] = [
    {
      id: 'exams',
      label: 'Exams, Quizzes & Assessments',
      regex: /\b(exam|midterm|final|quiz|viva|test|syllabus|grading|marks|room\s*\d+)\b/i,
    },
    {
      id: 'assignments',
      label: 'Assignments & Submissions',
      regex: /\b(assignment|homework|submission|submit|portal|canvas|moodle|gradescope|pdf|report|rubric)\b/i,
    },
    {
      id: 'projects',
      label: 'Project Milestones & Engineering',
      regex: /\b(project|prototype|milestone|api|backend|frontend|database|migration|deploy|deployment|bug|pr|pull request|slides|deck|demo|grpc|protobuf|docker)\b/i,
    },
    {
      id: 'meetings',
      label: 'Meetings, Schedule & Venue Changes',
      regex: /\b(meeting|sync|standup|call|zoom|meet|rescheduled|postponed|venue|auditorium|hall|schedule|timing)\b/i,
    },
    {
      id: 'logistics',
      label: 'Registration, Logistics & Operations',
      regex: /\b(register|registration|form|volunteer|catering|budget|sponsor|badge|check-in|attendance|inventory)\b/i,
    },
  ];

  const mainTopics: TopicCluster[] = [];
  for (const def of TOPIC_DEFINITIONS) {
    const matchingMsgs = activeMessages.filter((m) => def.regex.test(m.content));
    if (matchingMsgs.length > 0) {
      const senders = Array.from(new Set(matchingMsgs.map((m) => m.sender))).slice(0, 4);
      const topMsg = matchingMsgs.reduce((prev, curr) =>
        curr.priorityScore >= prev.priorityScore ? curr : prev
      );
      mainTopics.push({
        id: `topic-${def.id}`,
        topic: def.label,
        messageCount: matchingMsgs.length,
        summary:
          topMsg.content.length > 140
            ? topMsg.content.slice(0, 137) + '...'
            : topMsg.content,
        participants: senders,
        keyMessageIds: matchingMsgs.slice(0, 4).map((m) => m.id),
      });
    }
  }

  // Dynamic Topic Discovery if custom conversation has few/no domain matches
  if (mainTopics.length < 2 && activeMessages.length > 0) {
    const STOP = new Set([
      'that', 'this', 'with', 'from', 'your', 'have', 'will', 'just', 'like',
      'what', 'when', 'where', 'there', 'they', 'them', 'then', 'than', 'some',
      'more', 'very', 'also', 'please', 'thanks', 'thank', 'good', 'morning',
      'everyone', 'need', 'make', 'sure', 'know', 'about', 'into', 'only',
    ]);
    const wordFreq = new Map<string, ParsedMessage[]>();
    for (const m of activeMessages) {
      const uniqueWords = new Set(
        m.content
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 5 && !STOP.has(w) && isNaN(Number(w)))
      );
      uniqueWords.forEach((w) => {
        const list = wordFreq.get(w) || [];
        list.push(m);
        wordFreq.set(w, list);
      });
    }

    const sortedDynamic = Array.from(wordFreq.entries())
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);

    for (const [word, msgList] of sortedDynamic) {
      const capWord = word.charAt(0).toUpperCase() + word.slice(1);
      if (!mainTopics.some((t) => t.topic.toLowerCase().includes(word))) {
        const topM = msgList.reduce((p, c) => (c.priorityScore >= p.priorityScore ? c : p));
        mainTopics.push({
          id: `topic-dyn-${word}`,
          topic: `Discussion on ${capWord}`,
          messageCount: msgList.length,
          summary: topM.content.slice(0, 140),
          participants: Array.from(new Set(msgList.map((m) => m.sender))).slice(0, 4),
          keyMessageIds: msgList.slice(0, 4).map((m) => m.id),
        });
      }
    }

    if (mainTopics.length === 0) {
      const senders = Array.from(new Set(activeMessages.map((m) => m.sender))).slice(0, 4);
      mainTopics.push({
        id: 'topic-general',
        topic: 'General Group Discussion',
        messageCount: activeMessages.length,
        summary: activeMessages[0].content.slice(0, 140),
        participants: senders,
        keyMessageIds: activeMessages.slice(0, 3).map((m) => m.id),
      });
    }
  }

  // 5. Generate Very Short, Standard, and Detailed summaries with explicit (#index) references
  const highMsgs = activeMessages.filter((m) => m.priority === 'high');
  const veryShort: string[] = [];

  if (highMsgs.length > 0) {
    veryShort.push(
      `Critical Updates (${highMsgs.length}): ${highMsgs
        .slice(0, 2)
        .map(
          (m) =>
            `${m.sender} reported "${m.content.slice(0, 95)}${
              m.content.length > 95 ? '...' : ''
            }" (#${m.index})`
        )
        .join(' · ')}`
    );
  }
  if (deadlines.length > 0) {
    veryShort.push(
      `Upcoming Deadlines (${deadlines.length}): ${deadlines
        .slice(0, 2)
        .map((d) => `${d.title} — ${d.displayDate} (#${d.messageIndex})`)
        .join('; ')}`
    );
  }
  if (actionItems.length > 0) {
    veryShort.push(
      `Action Items (${actionItems.length}): ${actionItems
        .slice(0, 2)
        .map(
          (a) =>
            `${a.assignee}: ${a.description.slice(0, 75)}${
              a.description.length > 75 ? '...' : ''
            } (#${a.messageIndex})`
        )
        .join('; ')}`
    );
  }
  if (veryShort.length === 0) {
    const firstActive = activeMessages[0];
    veryShort.push(
      `Analyzed ${messages.length} messages across ${mainTopics.length} topic area(s). No urgent deadlines or critical alerts were detected${
        firstActive ? ` (#${firstActive.index})` : ''
      }.`
    );
  }

  // Standard summary
  const standard: string[] = [...veryShort];
  if (decisions.length > 0) {
    standard.push(
      `Key Decisions (${decisions.length}): ${decisions
        .slice(0, 2)
        .map(
          (d) =>
            `${d.sender} confirmed "${d.text.slice(0, 90)}${
              d.text.length > 90 ? '...' : ''
            }" (#${d.messageIndex})`
        )
        .join('; ')}`
    );
  }
  if (unansweredQuestions.length > 0) {
    standard.push(
      `Open Unanswered Questions (${unansweredQuestions.length}): ${unansweredQuestions
        .slice(0, 2)
        .map((q) => `${q.sender} asked "${q.question.slice(0, 85)}" (#${q.messageIndex})`)
        .join('; ')}`
    );
  }

  // Detailed summary
  const detailed: string[] = [
    `Conversation Overview: Processed ${messages.length} total messages (${activeMessages.length} substantive messages, ${messages.filter((m) => m.isDuplicate).length} duplicate(s) filtered, ${messages.filter((m) => m.isSystem).length} system event(s)).`,
    ...announcements.map(
      (a) => `[Announcement · #${a.messageIndex}] ${a.sender} (${a.timestampRaw}): ${a.text}`
    ),
    ...decisions.map(
      (d) => `[Decision · #${d.messageIndex}] ${d.sender} (${d.timestampRaw}): ${d.text}`
    ),
    ...deadlines.map(
      (dl) =>
        `[Deadline/Event · #${dl.messageIndex}] ${dl.displayDate} (${dl.resolutionType.replace('_', ' ')}): ${dl.title}`
    ),
    ...actionItems.map(
      (task) =>
        `[Action Item · #${task.messageIndex}] Assigned to ${task.assignee} (Due: ${task.deadline}): ${task.description}`
    ),
    ...unansweredQuestions.map(
      (uq) => `[Unanswered Question · #${uq.messageIndex}] ${uq.sender}: "${uq.question}"`
    ),
  ];

  return {
    veryShort,
    standard,
    detailed,
    mainTopics,
    announcements,
    decisions,
    unansweredQuestions,
  };
}

/**
 * Local Grounded Question Answering ("Ask AI")
 * Answers questions strictly using the imported conversation as the source of truth,
 * citing supporting original messages with sender and timestamp.
 */
export async function answerConversationQuestion(
  question: string,
  conversation: ConversationRecord,
  userProfile: UserProfile
): Promise<QATurn> {
  const qClean = question.trim();
  const qLower = qClean.toLowerCase();
  const citations: QACitation[] = [];
  let answerLines: string[] = [];
  let confidence: QATurn['confidence'] = 'grounded';
  let engineUsed = 'Local Grounded Semantic Engine (On-Device)';

  const addCitation = (msg: ParsedMessage) => {
    if (!citations.some((c) => c.messageId === msg.id)) {
      citations.push({
        messageId: msg.id,
        messageIndex: msg.index,
        sender: msg.sender,
        timestampRaw: msg.timestampRaw,
        snippet: msg.content.length > 140 ? msg.content.slice(0, 137) + '...' : msg.content,
      });
    }
  };

  // Intent 1: Important announcements missed
  if (
    /\b(important|urgent|announcement|announcements|what did i miss|catch me up|summary|updates)\b/i.test(
      qLower
    ) &&
    !/\b(exam|assignment|task|assigned to me|decision)\b/i.test(qLower)
  ) {
    const highAndAnnouncements = conversation.messages.filter(
      (m) =>
        !m.isDuplicate &&
        !m.isSystem &&
        (m.priority === 'high' ||
          m.categories.includes('announcement') ||
          m.categories.includes('schedule_change'))
    );

    if (highAndAnnouncements.length === 0) {
      answerLines.push(
        'No high-priority announcements or urgent alerts were found in this conversation.'
      );
      confidence = 'not_found';
    } else {
      answerLines.push(
        `Found ${highAndAnnouncements.length} important announcement(s) and high-priority update(s) in "${conversation.name}":`
      );
      highAndAnnouncements.slice(0, 6).forEach((m) => {
        answerLines.push(`• [#${m.index}] ${m.sender} (${m.timestampRaw}): ${m.content}`);
        addCitation(m);
      });
    }
  }
  // Intent 2: Exam schedule / "When is the next exam?"
  else if (/\b(exam|midterm|final|quiz|test|viva|assessment)\b/i.test(qLower)) {
    const examDeadlines = conversation.deadlines.filter(
      (d) =>
        d.category === 'exam' ||
        /\b(exam|midterm|final|quiz|test|viva)\b/i.test(d.originalContent)
    );
    const examMessages = conversation.messages.filter(
      (m) =>
        !m.isDuplicate &&
        !m.isSystem &&
        !m.isJokeOrHypothetical &&
        /\b(exam|midterm|final|quiz|test|viva|syllabus)\b/i.test(m.content)
    );

    if (examDeadlines.length === 0 && examMessages.length === 0) {
      answerLines.push(
        'No exam, quiz, or assessment schedules were mentioned in the imported conversation.'
      );
      confidence = 'not_found';
    } else {
      if (examDeadlines.length > 0) {
        answerLines.push(`Detected ${examDeadlines.length} exam/assessment date(s):`);
        examDeadlines.forEach((d) => {
          const confirmedText = d.userConfirmedDate
            ? `${d.userConfirmedDate} (User confirmed)`
            : `${d.displayDate} (${d.resolutionType.replace('_', ' ')})`;
          answerLines.push(
            `• ${confirmedText} — reported by ${d.sender} (${d.timestampRaw}, #${d.messageIndex}): "${d.originalContent}"`
          );
          const msg = conversation.messages.find((m) => m.id === d.messageId);
          if (msg) addCitation(msg);
        });
      }
      examMessages.forEach((m) => {
        if (!citations.some((c) => c.messageId === m.id)) {
          answerLines.push(
            `• Additional context [#${m.index}] ${m.sender} (${m.timestampRaw}): "${m.content}"`
          );
          addCitation(m);
        }
      });
    }
  }
  // Intent 3: Assignments due / deadlines
  else if (
    /\b(assignment|assignments|homework|due|deadline|deadlines|submit|submission)\b/i.test(qLower)
  ) {
    const matchingDeadlines = conversation.deadlines.filter((d) =>
      qLower.includes('assignment')
        ? d.category === 'assignment' ||
          d.category === 'project' ||
          /\b(assignment|submit|submission|due)\b/i.test(d.originalContent)
        : true
    );
    const submissionMsgs = conversation.messages.filter(
      (m) =>
        !m.isDuplicate &&
        !m.isSystem &&
        !m.isJokeOrHypothetical &&
        /\b(assignment|submit|submission|due|deadline|portal|upload|project)\b/i.test(m.content)
    );

    if (matchingDeadlines.length === 0 && submissionMsgs.length === 0) {
      answerLines.push(
        'Could not find any assignment submission dates or deadlines in the imported messages.'
      );
      confidence = 'not_found';
    } else {
      if (matchingDeadlines.length > 0) {
        answerLines.push(
          `Here are the extracted deadlines and submission dates (${matchingDeadlines.length}):`
        );
        matchingDeadlines.forEach((d) => {
          const dateLabel = d.userConfirmedDate || d.displayDate;
          answerLines.push(
            `• ${dateLabel} [${d.category.toUpperCase()}] — ${d.title} (Source: ${d.sender}, ${d.timestampRaw}, #${d.messageIndex})`
          );
          const msg = conversation.messages.find((m) => m.id === d.messageId);
          if (msg) addCitation(msg);
        });
      }
      submissionMsgs.slice(0, 5).forEach((m) => {
        if (!citations.some((c) => c.messageId === m.id)) {
          answerLines.push(`• [#${m.index}] ${m.sender} (${m.timestampRaw}): "${m.content}"`);
          addCitation(m);
        }
      });
    }
  }
  // Intent 4: Meeting / schedule changes
  else if (
    /\b(change|changed|reschedule|rescheduled|moved|postponed|meeting|time|venue|room)\b/i.test(
      qLower
    )
  ) {
    const changeMsgs = conversation.messages.filter(
      (m) =>
        !m.isDuplicate &&
        !m.isSystem &&
        !m.isJokeOrHypothetical &&
        (m.categories.includes('schedule_change') ||
          /\b(meeting|sync|call|rescheduled|moved|postponed|changed|room|venue|auditorium|time)\b/i.test(
            m.content
          ))
    );

    if (changeMsgs.length === 0) {
      answerLines.push(
        'No meeting arrangements or schedule/time changes were found in the imported conversation.'
      );
      confidence = 'not_found';
    } else {
      answerLines.push(
        `Found ${changeMsgs.length} message(s) regarding meetings or schedule/venue changes:`
      );
      changeMsgs.slice(0, 6).forEach((m) => {
        answerLines.push(`• [#${m.index}] ${m.sender} (${m.timestampRaw}): "${m.content}"`);
        addCitation(m);
      });
    }
  }
  // Intent 5: Tasks assigned to me / Action items
  else if (
    /\b(task|tasks|action item|assigned|todo|to-do|my tasks|what do i need to do)\b/i.test(qLower)
  ) {
    const askingAboutMe = /\b(me|my|i need|assigned to me)\b/i.test(qLower);
    const userTerms = [
      userProfile.userName,
      ...userProfile.aliases.map((a) => a.replace(/^@/, '')),
    ]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (askingAboutMe && userTerms.length > 0) {
      const myTasks = conversation.actionItems.filter((t) =>
        userTerms.some(
          (ut) =>
            t.assignee.toLowerCase().includes(ut) ||
            t.originalContent.toLowerCase().includes(ut) ||
            t.assignee.toLowerCase().includes('everyone')
        )
      );

      if (myTasks.length === 0) {
        answerLines.push(
          `No tasks were explicitly assigned to "${userProfile.userName}" in this conversation. (${conversation.actionItems.length} total task(s) were assigned to other participants or the broader group.)`
        );
        confidence = 'partial';
      } else {
        answerLines.push(
          `Found ${myTasks.length} task(s) assigned to you (${userProfile.userName}) or the entire group:`
        );
        myTasks.forEach((t) => {
          answerLines.push(
            `• [${t.assignee} · Due: ${t.deadline}] ${t.description} (Source: ${t.sender}, ${t.timestampRaw}, #${t.messageIndex})`
          );
          const msg = conversation.messages.find((m) => m.id === t.messageId);
          if (msg) addCitation(msg);
        });
      }
    } else {
      if (conversation.actionItems.length === 0) {
        answerLines.push('No action items or tasks were detected in this conversation.');
        confidence = 'not_found';
      } else {
        answerLines.push(
          `Extracted ${conversation.actionItems.length} action item(s) from the conversation:`
        );
        conversation.actionItems.forEach((t) => {
          answerLines.push(
            `• Assignee: ${t.assignee} | Due: ${t.deadline} — "${t.description}" (#${t.messageIndex} by ${t.sender})`
          );
          const msg = conversation.messages.find((m) => m.id === t.messageId);
          if (msg) addCitation(msg);
        });
      }
    }
  }
  // Intent 6: Decisions made
  else if (/\b(decision|decisions|decided|agreed|consensus|finalized)\b/i.test(qLower)) {
    const decisions = conversation.summary.decisions;
    if (decisions.length === 0) {
      answerLines.push(
        'No explicit decisions or formal agreements were detected in the imported chat.'
      );
      confidence = 'not_found';
    } else {
      answerLines.push(`Found ${decisions.length} explicit decision(s) in the conversation:`);
      decisions.forEach((d) => {
        answerLines.push(`• [#${d.messageIndex}] ${d.sender} (${d.timestampRaw}): "${d.text}"`);
        const msg = conversation.messages.find((m) => m.id === d.messageId);
        if (msg) addCitation(msg);
      });
    }
  }
  // Intent 7: Unanswered questions
  else if (/\b(unanswered|open question|questions)\b/i.test(qLower)) {
    const uqs = conversation.summary.unansweredQuestions;
    if (uqs.length === 0) {
      answerLines.push('All detected questions in this conversation appear to have been addressed.');
    } else {
      answerLines.push(`Found ${uqs.length} question(s) that remain unanswered in the chat:`);
      uqs.forEach((q) => {
        answerLines.push(`• [#${q.messageIndex}] ${q.sender} (${q.timestampRaw}): "${q.question}"`);
        const msg = conversation.messages.find((m) => m.id === q.messageId);
        if (msg) addCitation(msg);
      });
    }
  }

  // Fallback / General Keyword & Semantic Search across all messages
  if (answerLines.length === 0) {
    const STOP = new Set([
      'what', 'when', 'where', 'which', 'who', 'why', 'how', 'show', 'tell', 'find',
      'all', 'messages', 'message', 'about', 'the', 'and', 'for', 'with', 'from',
      'that', 'this', 'were', 'was', 'are', 'is', 'did', 'does', 'any', 'anyone',
      'there', 'have', 'has', 'been', 'chat', 'conversation', 'group',
    ]);

    const queryTokens = qLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP.has(t));

    const scored = conversation.messages
      .filter((m) => !m.isSystem && !m.isMediaOmitted && !m.isDuplicate)
      .map((m) => {
        const textLower = `${m.sender} ${m.content} ${m.threadContext || ''}`.toLowerCase();
        let matchCount = 0;
        for (const token of queryTokens) {
          if (textLower.includes(token)) {
            matchCount += 1;
          }
        }
        return {
          msg: m,
          score: matchCount * 25 + (m.priority === 'high' ? 10 : m.priority === 'medium' ? 5 : 0),
          matchCount,
        };
      })
      .filter((item) => item.matchCount > 0)
      .sort((a, b) => b.score - a.score || a.msg.index - b.msg.index);

    if (scored.length === 0) {
      answerLines.push(
        `Could not find any messages matching "${qClean}" in the imported conversation. Remember that answers are strictly grounded in the imported chat text and never fabricated.`
      );
      confidence = 'not_found';
    } else {
      answerLines.push(
        `Found ${scored.length} message(s) in the conversation matching your query (${queryTokens.join(', ')}):`
      );
      scored.slice(0, 6).forEach(({ msg }) => {
        answerLines.push(`• [#${msg.index}] ${msg.sender} (${msg.timestampRaw}): "${msg.content}"`);
        addCitation(msg);
      });
    }
  }

  // Optional Browser-Native Local AI (`window.ai`) synthesis if enabled by user and supported in browser
  if (userProfile.useBrowserNativeAI && citations.length > 0) {
    try {
      const win = window as unknown as {
        ai?: {
          languageModel?: {
            create: (opts?: { systemPrompt?: string }) => Promise<{
              prompt: (input: string) => Promise<string>;
            }>;
          };
        };
      };
      if (win.ai?.languageModel) {
        const session = await win.ai.languageModel.create({
          systemPrompt:
            'You are a local privacy-first assistant. Answer the user question strictly using the provided chat messages. Cite message numbers (#N), sender names, and timestamps. Never invent information.',
        });
        const contextBlock = citations
          .map((c) => `[#${c.messageIndex}] (${c.timestampRaw}) ${c.sender}: ${c.snippet}`)
          .join('\n');
        const refined = await session.prompt(
          `Question: ${qClean}\n\nGrounded Chat Evidence:\n${contextBlock}\n\nProvide a concise, accurate answer grounded only in the evidence above:`
        );
        if (refined && refined.trim()) {
          answerLines = [refined.trim()];
          engineUsed = 'Chrome Built-in Gemini Nano (window.ai On-Device)';
        }
      }
    } catch {
      // Fallback gracefully to the deterministic grounded answer
    }
  }

  return {
    id: `qa-${Date.now()}`,
    question: qClean,
    answer: answerLines.join('\n'),
    citations,
    confidence,
    createdAt: new Date().toISOString(),
    engineUsed,
  };
}
