import { unzipSync } from 'fflate';

import { ParsedChatSchema } from '@spammy/domain';

import type { ChatMessage, DateOrder, ExportFormat, ParsedChat, Participant } from '@spammy/domain';

/** raw upload as received from the host */
export interface ExportFile {
  /** original file name; `.zip` selects the iPhone archive path */
  fileName: string;
  /** file content */
  bytes: Uint8Array;
}

/** host overrides applied when auto-detection is ambiguous */
export interface ParseOptions {
  /** forces the day/month order instead of detecting it */
  dateOrder?: Exclude<DateOrder, 'ambiguous'>;
}

interface ExportLine {
  date: string;
  hour: number;
  minute: number;
  second: number;
  meridiem: string | undefined;
  text: string;
}

const IPHONE_LINE =
  /^\[(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?\]\s?(.*)$/i;
const ANDROID_LINE =
  /^(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?\s+-\s(.*)$/i;
// limits expansion to a text-sized archive rather than extracting attached media
const MAX_TEXT_BYTES = 64 * 1024 * 1024;

/**
 * parses a WhatsApp export into messages and stable participant identifiers
 * @param file uploaded export
 * @param options date-order override
 * @returns normalized chat in export order
 * @throws {TypeError} when the upload has no recognizable messages
 */
export function parseExport(file: ExportFile, options: ParseOptions = {}): ParsedChat {
  const text = readExportText(file);
  const format = detectTextFormat(file.fileName, text);
  const lines = text.split(/\r?\n/);
  const records: ExportLine[] = [];

  for (const line of lines) {
    const record = parseLine(line);
    if (record) {
      records.push(record);
    } else if (records.length > 0) {
      const previous = records[records.length - 1]!;
      previous.text += `\n${line}`;
    }
  }

  if (records.length === 0) {
    throw new TypeError('the file does not contain a recognized WhatsApp export');
  }

  const dateOrder = options.dateOrder ?? inferDateOrder(records);
  const participantsByName = new Map<string, Participant>();
  const assignedIds = new Set<string>();
  let groupName: string | null = null;

  const messages = records.map((record, index): ChatMessage => {
    const separator = record.text.indexOf(': ');
    const author = separator < 0 ? null : record.text.slice(0, separator).trim();
    const body = separator < 0 ? record.text : record.text.slice(separator + 2);
    const isSystem =
      author === null ||
      /^(?:messages and calls are end-to-end encrypted|you created this group|this group was created)/i.test(
        body,
      );
    const groupMatch = /created (?:this )?group ["“](.+?)["”]/i.exec(record.text);
    groupName ??= groupMatch?.[1] ?? (isSystem && author ? author : null);

    if (isSystem || author === null) {
      return {
        id: `m${index + 1}`,
        sentAt: formatTimestamp(record, dateOrder),
        authorId: null,
        text: record.text.trimEnd(),
        kind: 'system',
      };
    }

    let participant = participantsByName.get(author);
    if (!participant) {
      const baseId =
        author
          .normalize('NFKD')
          .replace(/\p{M}/gu, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'participant';
      let id = baseId;
      let suffix = 2;
      while (assignedIds.has(id)) {
        id = `${baseId}-${suffix++}`;
      }
      participant = { id, displayName: author, messageCount: 0 };
      participantsByName.set(author, participant);
      assignedIds.add(id);
    }
    participant.messageCount += 1;

    return {
      id: `m${index + 1}`,
      sentAt: formatTimestamp(record, dateOrder),
      authorId: participant.id,
      text: body.trimEnd(),
      kind: /^<?(?:media|image|photo|video|audio|voice|sticker|document|gif)(?: note)? omitted>?$/i.test(
        body.trim(),
      )
        ? 'media-omitted'
        : /^(?:this message was deleted|you deleted this message)\.?$/i.test(body.trim())
          ? 'deleted'
          : 'text',
    };
  });

  return ParsedChatSchema.parse({
    format,
    dateOrder,
    groupName,
    participants: [...participantsByName.values()],
    messages,
  });
}

/**
 * detects the export format from its timestamped text
 * @param file uploaded export
 * @returns Android, iPhone text, or iPhone archive format
 */
export function detectFormat(file: ExportFile): ExportFormat {
  return detectTextFormat(file.fileName, readExportText(file));
}

function readExportText(file: ExportFile): string {
  if (file.bytes.byteLength > MAX_TEXT_BYTES) {
    throw new RangeError('the export exceeds the text upload limit');
  }
  if (!/\.zip$/i.test(file.fileName)) {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(file.bytes)
      .replace(/[\u200e\u200f\ufeff]/g, '')
      .replace(/[\u00a0\u202f]/g, ' ');
  }

  let archive;
  try {
    archive = unzipSync(file.bytes, {
      filter: (entry) =>
        /(?:^|\/)_chat\.txt$/i.test(entry.name) && entry.originalSize <= MAX_TEXT_BYTES,
    });
  } catch (cause) {
    throw new TypeError('the archive is not a readable ZIP export', { cause });
  }
  const bytes = Object.values(archive)[0];
  if (!bytes) {
    throw new TypeError('the archive must contain a text-sized _chat.txt export');
  }
  return new TextDecoder('utf-8', { fatal: true })
    .decode(bytes)
    .replace(/[\u200e\u200f\ufeff]/g, '')
    .replace(/[\u00a0\u202f]/g, ' ');
}

function detectTextFormat(fileName: string, text: string): ExportFormat {
  const line = text
    .split(/\r?\n/)
    .find((value) => IPHONE_LINE.test(value) || ANDROID_LINE.test(value));
  if (!line) {
    throw new TypeError('the file does not contain a recognized WhatsApp export');
  }
  return /\.zip$/i.test(fileName)
    ? 'iphone-zip'
    : IPHONE_LINE.test(line)
      ? 'iphone-txt'
      : 'android-txt';
}

function parseLine(line: string): ExportLine | null {
  const match = IPHONE_LINE.exec(line) ?? ANDROID_LINE.exec(line);
  return match
    ? {
        date: match[1]!,
        hour: Number(match[2]),
        minute: Number(match[3]),
        second: Number(match[4] ?? 0),
        meridiem: match[5],
        text: match[6]!,
      }
    : null;
}

function inferDateOrder(records: ExportLine[]): DateOrder {
  for (const record of records) {
    const [first, second] = record.date.split(/[/.-]/).map(Number);
    if (record.date.split(/[/.-]/)[0]!.length === 4) continue;
    if (first! > 12) return 'day-first';
    if (second! > 12) return 'month-first';
  }
  return 'ambiguous';
}

function formatTimestamp(record: ExportLine, dateOrder: DateOrder): string {
  const [first, second, third] = record.date.split(/[/.-]/).map(Number) as [number, number, number];
  const isYearFirst = first > 999;
  const year = isYearFirst ? first : third < 100 ? 2000 + third : third;
  const month = isYearFirst ? second : dateOrder === 'month-first' ? first : second;
  const day = isYearFirst ? third : dateOrder === 'month-first' ? second : first;
  if (record.meridiem && (record.hour < 1 || record.hour > 12))
    throw new RangeError('the export contains an invalid timestamp');
  const hour = record.meridiem
    ? (record.hour % 12) + (record.meridiem.toLowerCase() === 'pm' ? 12 : 0)
    : record.hour;
  const date = new Date(Date.UTC(year, month - 1, day, hour, record.minute, record.second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    hour > 23 ||
    record.minute > 59 ||
    record.second > 59
  ) {
    throw new RangeError('the export contains an invalid timestamp');
  }
  return date.toISOString().slice(0, 19);
}
