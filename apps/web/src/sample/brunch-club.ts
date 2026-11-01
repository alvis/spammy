/**
 * fictional "Brunch Club" demo data from the design (docs/design/README.md); no real people or chats.
 * used for UI work before the API is ready, and as the demo fallback.
 */

export type SamplePersonId = 'dani' | 'marco' | 'priya' | 'tomas' | 'jules' | 'bea';

export interface SamplePerson {
  id: SamplePersonId;
  /** name as it appears in the export */
  raw: string;
  name: string;
  /** oklch hue for the initials avatar */
  hue: number;
  /** name colour in the receipts drawer */
  color: string;
  messages: number;
}

/** [personId, stat line, quote] */
export type SampleNominee = [SamplePersonId, string, string];

export interface SampleAward {
  id: string;
  title: string;
  howJudged: string;
  intro: string;
  winnerId: SamplePersonId;
  winnerLine: string;
  nominees: SampleNominee[];
  /** receipts drawer: date, index of the evidence line, lines as `who|hh:mm|text` (`sys||text` for system pills) */
  context: { date: string; evidence: number; lines: string[] };
}

export interface SampleShowGroup {
  name: string;
  sub: string;
  intro: string;
  awardIds: string[];
}

export const BRUNCH_CLUB_PEOPLE: SamplePerson[] = [
  { id: 'dani', raw: 'Dani', name: 'Dani', hue: 25, color: '#b4532a', messages: 6812 },
  { id: 'marco', raw: 'Marco (old number)', name: 'Marco', hue: 230, color: '#2f6aa8', messages: 3204 },
  { id: 'priya', raw: 'Priya L', name: 'Priya', hue: 345, color: '#b02a5c', messages: 9940 },
  { id: 'tomas', raw: '+44 7700 900412', name: 'Tomás', hue: 150, color: '#2c7a55', messages: 1118 },
  { id: 'jules', raw: 'Jules', name: 'Jules', hue: 290, color: '#6a45b0', messages: 2467 },
  { id: 'bea', raw: 'Beatriz', name: 'Bea', hue: 85, color: '#8a6a12', messages: 5530 },
];

/** messages per month, Jan–Oct 2026 */
export const BRUNCH_CLUB_MONTHS: [string, number][] = [
  ['Jan', 2104], ['Feb', 3388], ['Mar', 2650], ['Apr', 2210], ['May', 2995],
  ['Jun', 3120], ['Jul', 3870], ['Aug', 3015], ['Sep', 2449], ['Oct', 3270],
];

export const BRUNCH_CLUB_AWARDS: SampleAward[] = [
  {
    id: 'mono', title: 'Best Monologue in a Voice Note',
    howJudged: 'Total voice-note minutes, weighted by replies of “can you just text it”.',
    intro: 'Some people text. Some people record a podcast and send it to five friends at 8am.',
    winnerId: 'marco', winnerLine: 'Marco, your acceptance speech is limited to thirty seconds. We know that will be hard.',
    nominees: [
      ['marco', '412 voice notes · longest 11:42', 'sorry that was long. basically tl;dr I’m fine'],
      ['priya', '97 voice notes · avg 3:10', 'ok voice note incoming, don’t judge'],
      ['bea', '22 voice notes re-recorded', 'ignore the last one I said it wrong'],
    ],
    context: { date: 'Mar 3', evidence: 1, lines: ['priya|08:10|morning! anyone up', 'marco|08:12|[voice note · 11:42]', 'bea|08:14|it’s 8am marco', 'dani|08:19|I listened at 2x and it was still 6 minutes', 'marco|08:25|sorry that was long. basically tl;dr I’m fine', 'jules|08:26|can you just text it'] },
  },
  {
    id: 'twist', title: 'Best Plot Twist',
    howJudged: 'Messages that got 20+ replies in five minutes.',
    intro: 'Nothing unites a group chat like a 2am message that starts with “ok so”.',
    winnerId: 'priya', winnerLine: 'Unemployment, Lisbon and “goodnight”, all in one message. Priya, the chat still hasn’t slept.',
    nominees: [
      ['priya', '31 replies in 4 minutes', 'ok so I quit my job. also I’m moving to Lisbon. goodnight'],
      ['tomas', 'Silent 63 days, then three words', 'got engaged btw'],
      ['jules', 'Switched sides after 140 messages', 'actually wait I was wrong the whole time'],
    ],
    context: { date: 'Feb 11', evidence: 1, lines: ['dani|02:02|why is everyone awake', 'priya|02:14|ok so I quit my job. also I’m moving to Lisbon. goodnight', 'bea|02:15|WHAT', 'marco|02:15|WHAT', 'dani|02:15|you can’t say goodnight after that', 'sys||28 more replies'] },
  },
  {
    id: 'read', title: 'Lifetime Achievement in Leaving on Read',
    howJudged: 'Messages seen and never answered, plus median reply time.',
    intro: 'Read 9:41pm. Read 9:41pm. Read 9:41pm. This award recognises a body of work.',
    winnerId: 'jules', winnerLine: 'Jules couldn’t be here tonight. Jules did see the invitation, though.',
    nominees: [
      ['jules', '213 messages seen, never answered', 'sorry just saw this'],
      ['tomas', 'Median reply: 2 days, 4 hours', 'just seeing this'],
      ['dani', 'Answered 0 of 41 planning questions', 'lmao'],
    ],
    context: { date: 'Apr 4', evidence: 3, lines: ['bea|19:02|@Jules are you coming saturday', 'bea|19:20|@Jules I can SEE the blue ticks', 'sys||6 days later', 'jules|13:02|sorry just saw this', 'bea|13:03|saturday was 4 days ago'] },
  },
  {
    id: 'k', title: 'Most “k.” Energy',
    howJudged: 'One-word replies to messages longer than 50 words.',
    intro: 'One letter. A full stop. A world of unspoken feeling.',
    winnerId: 'tomas', winnerLine: 'Tomás, would you like to say a few words? Tomás has said: k.',
    nominees: [
      ['tomas', '“k” sent 188 times', 'k.'],
      ['jules', '“sure” sent 96 times', 'sure'],
      ['dani', '“fine” sent 54 times', 'fine. it’s fine.'],
    ],
    context: { date: 'Feb 11', evidence: 2, lines: ['priya|02:20|(1,408 words about Lisbon)', 'sys||7 hours later', 'tomas|09:31|k.', 'priya|09:32|that’s it?', 'tomas|09:40|congrats'] },
  },
  {
    id: 'lol', title: 'Typing for Six Minutes, Sent “lol”',
    howJudged: 'Deleted-and-resent drafts, ranked by how short the final message was.',
    intro: 'We all saw the dots. We all waited. We were all let down.',
    winnerId: 'bea', winnerLine: 'A first draft. A second draft. A crisis. And then: lol. Bea, a true artist.',
    nominees: [
      ['bea', '340 deleted drafts', 'lol'],
      ['dani', '77 long pauses ending in a sticker', '[sticker omitted]'],
      ['priya', 'Longest message: 1,408 words', 'ok this is going to be long'],
    ],
    context: { date: 'Jan 28', evidence: 4, lines: ['priya|21:10|wait bea what did you think of him', 'bea|21:16|This message was deleted', 'bea|21:19|This message was deleted', 'priya|21:20|I SAW THAT', 'bea|21:22|lol'] },
  },
  {
    id: 'dead', title: 'Most Deaths by Laughter',
    howJudged: '“dead”, “lmao” with 4+ o’s, and STOP in caps.',
    intro: 'Every joke in this chat killed. We have the body count.',
    winnerId: 'jules', winnerLine: 'Jules has never answered a question but has laughed 1,380 times. Priorities.',
    nominees: [
      ['jules', '“lmaooo” and longer: 1,380', 'lmaoooooooo'],
      ['dani', '“I’m dead” and variants: 1,204', 'IM DEAD. bury me'],
      ['bea', '“STOP” in caps: 408', 'STOP. STOPPPP'],
    ],
    context: { date: 'Jul 4', evidence: 1, lines: ['marco|00:30|tried to parallel park, hit the same bin twice, bin now on its side', 'jules|00:31|lmaoooooooo', 'dani|00:32|IM DEAD. bury me', 'bea|00:32|STOP. STOPPPP', 'marco|00:33|it was a very small bin'] },
  },
  {
    id: 'late', title: 'Fashionably Late (to Every Plan)',
    howJudged: '“omw” messages compared with when the plan actually started.',
    intro: 'This year’s theme was punctuality. Some guests interpreted it loosely.',
    winnerId: 'dani', winnerLine: 'Dani said she was five minutes away 47 times this year. We held her award for 38 minutes, her average.',
    nominees: [
      ['dani', '“omw” 47 times · avg 38 min late', 'omw!! 5 min'],
      ['marco', 'Narrated 23 parking attempts', 'parking. ok not parking. still driving'],
      ['bea', '“leaving now” while not leaving: 19', 'leaving now (I am in the shower)'],
    ],
    context: { date: 'May 17', evidence: 2, lines: ['marco|11:00|we’re here, table by the window', 'priya|11:20|dani?', 'dani|11:52|omw!! 5 min', 'bea|11:53|we’ve ordered', 'dani|12:31|here!! where are you', 'marco|12:31|leaving'] },
  },
  {
    id: 'excuse', title: 'Best Dressed Excuse',
    howJudged: 'Cancellations ranked by creativity.',
    intro: 'Cancelling plans is easy. Cancelling with style takes craft.',
    winnerId: 'bea', winnerLine: 'Bea, we hope the plant is doing better. We know it was never about the plant.',
    nominees: [
      ['bea', '14 cancellations, no repeats', 'can’t come, my plant is going through something'],
      ['marco', '9 cancellations, all car-related', 'my car is fine but emotionally it’s not'],
      ['tomas', '6 cancellations, one word each', 'no'],
    ],
    context: { date: 'Jun 21', evidence: 1, lines: ['marco|17:40|tonight 8pm, no excuses', 'bea|17:55|can’t come, my plant is going through something', 'dani|17:56|which plant', 'bea|17:58|the big one. it knows what it did'] },
  },
  {
    id: 'main', title: 'Main Character of the Year',
    howJudged: 'Share of messages, topics started and how often the chat was about them.',
    intro: 'This award goes to the person this chat revolves around. She asked us to say that.',
    winnerId: 'priya', winnerLine: 'Priya sent a third of every message in this chat, so this was a formality. UPDATE: she won.',
    nominees: [
      ['priya', '9,940 messages · 34% of the chat', 'UPDATE: (a thread)'],
      ['marco', 'Live-narrated his commute 140 times', 'on the bus. the bus is late. developing story'],
      ['dani', 'Changed the group icon 19 times', 'changed the group icon to me, you’re welcome'],
    ],
    context: { date: 'Oct 30', evidence: 0, lines: ['priya|08:01|UPDATE: (a thread)', 'priya|08:01|1/ so the landlord replied', 'priya|08:02|2/ he said “we’ll see”', 'priya|08:02|3/ WE’LL SEE??', 'jules|08:40|lmaooo'] },
  },
];

export const BRUNCH_CLUB_SHOWS: SampleShowGroup[] = [
  { name: 'The Golden Globes', sub: 'Prestige. Drama. Voice notes.', intro: 'First up, the Golden Globes. The most prestigious awards a group chat can give, which is to say: not very.', awardIds: ['mono', 'twist', 'main'] },
  { name: 'The Yayademuy Awards', sub: 'Ya, ya. De muy. For behaviour that was a lot.', intro: 'Next, the Yayademuy Awards. Ya, ya, de muy. Honouring the moments that were, frankly, too much.', awardIds: ['lol', 'dead', 'late'] },
  { name: 'The Chat Gala', sub: 'The year’s most fashionable behaviour.', intro: 'And finally, the Chat Gala. The red carpet is out. Dani is still on her way.', awardIds: ['read', 'k', 'excuse'] },
];
