import { NotImplementedError } from '@wrapa/domain';

import type { DateOrder, ExportFormat, ParsedChat } from '@wrapa/domain';

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

/**
 * parses an Android .txt, iPhone .txt, or iPhone .zip WhatsApp export into a normalized chat
 * @param file uploaded export
 * @param options host overrides for ambiguous exports
 * @returns normalized chat with participants and messages in send order
 * @throws {NotImplementedError} until implemented
 */
export function parseExport(file: ExportFile, options: ParseOptions = {}): ParsedChat {
  throw new NotImplementedError('parser.parseExport');
}

/**
 * detects the export format from the file name and the first timestamped line
 * @param file uploaded export
 * @returns detected export format
 * @throws {NotImplementedError} until implemented
 */
export function detectFormat(file: ExportFile): ExportFormat {
  throw new NotImplementedError('parser.detectFormat');
}
