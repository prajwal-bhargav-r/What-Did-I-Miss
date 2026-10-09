export interface SampleChatPreset {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  rawText: string;
}

export const SAMPLE_CONVERSATIONS: SampleChatPreset[] = [
  {
    id: 'sample-cs402-study-group',
    name: 'CS-402 Distributed Systems — Study & Course Group',
    subtitle: 'WhatsApp export · Exam reschedule, Assignment 3 relative deadline, ambiguous review date, jokes, duplicates & @Alex mentions',
    badge: 'Academic Group',
    rawText: `10/12/2026, 8:55 AM - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
10/12/2026, 9:02 AM - Prof. Arvind created group "CS-402 Distributed Systems"
10/12/2026, 9:05 AM - Maya Lin: Good morning everyone! Hope everyone had a good weekend
10/12/2026, 9:06 AM - Kabir Mehta: Morning! Anyone in the coffee line at the student union?
10/12/2026, 9:07 AM - Rohan Verma: <Media omitted>
10/12/2026, 9:09 AM - Kabir Mehta: Haha imagine if the midterm exam was tomorrow at 6am lol jk 😂😂
10/12/2026, 9:12 AM - Maya Lin: Don't even joke about that Kabir!
10/12/2026, 9:30 AM - TA Priya Nair: IMPORTANT ANNOUNCEMENT: Prof. Arvind asked me to share an official schedule update. The CS-402 Midterm Exam has been rescheduled from Oct 14 to Oct 16, 2026 at 2:00 PM.
Venue has also changed to Auditorium B (West Wing) instead of Room 204.
Syllabus coverage: Lectures 1 through 11 (Lamport Clocks, Raft Consensus, and Two-Phase Commit).
10/12/2026, 9:32 AM - Alex: Thanks for the heads up Priya! I will update our shared study calendar right away.
10/12/2026, 9:34 AM - TA Priya Nair: @Alex Thanks! Also @Alex can you please upload the Raft benchmark comparison slides to the shared drive by Oct 15, 2026 at 5:00 PM so the whole class can review them?
10/12/2026, 9:36 AM - Rohan Verma: Quick question — are we allowed to bring a double-sided handwritten reference sheet into the Midterm Exam on Oct 16, or is it strictly single-sided?
10/12/2026, 9:40 AM - TA Priya Nair: Also reminder for everyone: Assignment 3 (Raft Leader Election lab) is due tomorrow by 11:59 PM on the Gradescope portal. Late submissions will incur a 10% penalty per day.
10/12/2026, 9:41 AM - TA Priya Nair: Also reminder for everyone: Assignment 3 (Raft Leader Election lab) is due tomorrow by 11:59 PM on the Gradescope portal. Late submissions will incur a 10% penalty per day.
10/12/2026, 9:45 AM - Kabir Mehta: Noted, thanks!
10/12/2026, 9:46 AM - Maya Lin: Sounds good
10/12/2026, 10:15 AM - Maya Lin: For our Team 4 capstone project, we need to finalize the RPC transport layer today.
10/12/2026, 10:18 AM - Kabir Mehta: I benchmarked both options last night. gRPC with Protobuf cut tail latency by 38% compared to JSON over REST.
10/12/2026, 10:21 AM - Maya Lin: Agreed! Decision: We decided to use gRPC with Protobuf for all inter-node communication in the Milestone 2 prototype.
10/12/2026, 10:24 AM - Maya Lin: Kabir, can you please refactor the heartbeat service to use the new Protobuf schema by Oct 18, 2026?
10/12/2026, 10:26 AM - Kabir Mehta: I'll handle the heartbeat service refactoring and push the PR before Friday evening.
10/12/2026, 11:05 AM - TA Priya Nair: One more update: We will hold the optional midterm paper review and grading walkthrough next Friday at 4:00 PM in Lab 302.
10/12/2026, 11:12 AM - Neha Gupta: Hey @Alex, did the docker-compose cluster config work on ARM64 machines for your test run?`,
  },
  {
    id: 'sample-q4-product-launch',
    name: 'Core Platform v2.4 — Engineering & Release Sync',
    subtitle: 'Bracketed logs · API migration deadlines, deployment freeze decision, ambiguous sync date & multi-owner tasks',
    badge: 'Engineering Team',
    rawText: `[10/13/2026, 09:00:12 AM] Elena Rostova: Good morning team. Starting our async triage for the Core Platform v2.4 release.
[10/13/2026, 09:02:45 AM] Marcus Vance: Morning! Coffee is brewing.
[10/13/2026, 09:05:10 AM] Elena Rostova: URGENT: Security audit flagged token rotation in the legacy OAuth gateway. All services must complete the v2 API migration by Oct 17, 2026 at 6:00 PM.
[10/13/2026, 09:08:30 AM] Devon Brooks: Wait, does that include the internal billing webhook worker too?
[10/13/2026, 09:10:04 AM] Elena Rostova: Yes. Decision: We agreed to enforce a production deployment freeze starting Oct 19, 2026 at 12:00 PM until the post-launch verification is complete.
[10/13/2026, 09:14:22 AM] Elena Rostova: @Alex please review and sign off on the database rollback runbook tomorrow by 3:00 PM.
[10/13/2026, 09:17:50 AM] Marcus Vance: I will prepare the staging load-test report and share metrics with everyone by tonight.
[10/13/2026, 09:22:15 AM] Elena Rostova: Let's schedule our final go/no-go architecture review meeting on Monday or Tuesday at 11:00 AM depending on QA sign-off.
[10/13/2026, 09:25:40 AM] Sophia Chen: Quick question: Has anyone received the updated TLS certificate bundle from DevOps for the EU-Central staging cluster yet?`,
  },
  {
    id: 'sample-campus-hackathon',
    name: 'InnovateX Hackathon 2026 — Organizers & Logistics',
    subtitle: 'Mixed format with missing timestamps · Venue change, registration cutoff, sponsor deck tasks & volunteer assignments',
    badge: 'Event Operations',
    rawText: `10/14/2026, 2:10 PM - Zara Khan: Hey organizers! Sharing the latest logistics updates for InnovateX 2026.
10/14/2026, 2:12 PM - Liam O'Connor: Ready!
10/14/2026, 2:15 PM - Zara Khan: IMPORTANT UPDATE: Due to HVAC maintenance in Hall 1, the opening ceremony on Oct 24, 2026 at 9:30 AM has been moved to the Main Innovation Center Auditorium.
10/14/2026, 2:18 PM - Zara Khan: Participant registration deadline is strictly Oct 20, 2026 at 11:59 PM. Everyone must share the registration link across department channels today.
Liam O'Connor: I'll update the website banner and send the venue change email to registered teams.
Zara Khan: @Alex can you please confirm the hardware lab power strip inventory and AV projector setup by Oct 21, 2026?
Maya Lin: Also, we need someone to pick up the printed judge rubrics and sponsor badges before the rehearsal.
Liam O'Connor: Who has the master contact number for the overnight catering vendor if they arrive at the North Gate?`,
  },
];
