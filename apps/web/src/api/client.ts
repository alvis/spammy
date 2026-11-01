import { CeremonyScriptSchema, AwardSchema, FaceBoxSchema, ShowSchema } from '@spammy/domain';

import type {
  CeremonyScript,
  CostumeId,
  Award,
  CreateShowRequest,
  DateOrder,
  FaceBox,
  Show,
  ShowSettings,
} from '@spammy/domain';

/** an HTTP failure with its status preserved for sample fallback */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * distinguishes unavailable server features from rejected user input
 * @param error request failure
 * @returns whether the fictional sample may replace the unavailable operation
 */
export function canUseSample(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof ApiError && [501, 502, 503, 504].includes(error.status))
  );
}

async function request(path: string, options?: RequestInit): Promise<unknown> {
  const timeout = AbortSignal.timeout(
    /\/(production|exports)$/.test(path)
      ? 1_800_000
      : /\/(analysis|awards)$/.test(path) && options?.method === 'POST'
        ? 600_000
        : 120_000,
  );
  const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(`/api${path}`, { ...options, signal });
  const result: unknown = await response.json().catch(() => {
    signal.throwIfAborted();
    return null;
  });

  if (!response.ok) {
    const message =
      result &&
      typeof result === 'object' &&
      'message' in result &&
      typeof result.message === 'string'
        ? result.message
        : result &&
            typeof result === 'object' &&
            'error' in result &&
            typeof result.error === 'string'
          ? result.error.replaceAll('_', ' ')
          : 'The request could not be completed';
    throw new ApiError(message, response.status);
  }

  return result;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

/** typed calls matching the local server's host workflow */
export const api = {
  async health(): Promise<boolean> {
    const result = await request('/health');

    return Boolean(
      result && typeof result === 'object' && 'status' in result && result.status === 'ok',
    );
  },
  async listShows(): Promise<Show[]> {
    return ShowSchema.array().parse(await request('/shows'));
  },
  async createShow(settings: CreateShowRequest): Promise<Show> {
    return ShowSchema.parse(await request('/shows', jsonRequest('POST', settings)));
  },
  async readShow(showId: string): Promise<Show> {
    return ShowSchema.parse(await request(`/shows/${encodeURIComponent(showId)}`));
  },
  async readCeremony(showId: string): Promise<CeremonyScript> {
    return CeremonyScriptSchema.parse(
      await request(`/shows/${encodeURIComponent(showId)}/ceremony`),
    );
  },
  async updateSettings(
    showId: string,
    settings: ShowSettings,
    signal?: AbortSignal,
  ): Promise<Show> {
    return ShowSchema.parse(
      await request(`/shows/${encodeURIComponent(showId)}/settings`, {
        ...jsonRequest('PUT', settings),
        signal,
      }),
    );
  },
  async uploadChat(
    showId: string,
    file: File,
    dateOrder?: Exclude<DateOrder, 'ambiguous'>,
  ): Promise<Show> {
    const form = new FormData();
    form.set('file', file);
    if (dateOrder) form.set('dateOrder', dateOrder);
    await request(`/shows/${encodeURIComponent(showId)}/chat`, { method: 'POST', body: form });

    return api.readShow(showId);
  },
  async uploadPhoto(showId: string, castMemberId: string, file: File): Promise<Show> {
    const form = new FormData();
    form.set('castMemberId', castMemberId);
    form.set('file', file);
    await request(`/shows/${encodeURIComponent(showId)}/photos`, { method: 'POST', body: form });

    return api.readShow(showId);
  },
  async updateCast(
    showId: string,
    cast: { id: string; displayName?: string; excluded?: boolean; costumeId?: CostumeId }[],
    signal?: AbortSignal,
  ): Promise<Show> {
    return ShowSchema.parse(
      await request(`/shows/${encodeURIComponent(showId)}/cast`, {
        ...jsonRequest('POST', { cast }),
        signal,
      }),
    );
  },
  async locateFaces(
    showId: string,
    file: File,
  ): Promise<{ photoAssetId: string; photoUrl: string; faces: FaceBox[] }> {
    const form = new FormData();
    form.set('file', file);
    const result = await request(`/shows/${encodeURIComponent(showId)}/faces`, {
      method: 'POST',
      body: form,
    });
    if (
      !result ||
      typeof result !== 'object' ||
      !('photoAssetId' in result) ||
      typeof result.photoAssetId !== 'string' ||
      !('photoUrl' in result) ||
      typeof result.photoUrl !== 'string' ||
      !('faces' in result)
    )
      throw new ApiError('Invalid face response', 502);
    return {
      photoAssetId: result.photoAssetId,
      photoUrl: result.photoUrl,
      faces: FaceBoxSchema.array().parse(result.faces),
    };
  },
  async generateCharacter(
    showId: string,
    castMemberId: string,
    description: string,
  ): Promise<Show> {
    const result = await request(
      `/shows/${encodeURIComponent(showId)}/characters`,
      jsonRequest('POST', { castMemberId, description }),
    );
    return ShowSchema.parse(
      result && typeof result === 'object' && 'show' in result ? result.show : result,
    );
  },
  async estimateAnalysis(showId: string): Promise<number> {
    const result = await request(`/shows/${encodeURIComponent(showId)}/analysis/estimate`);
    if (
      !result ||
      typeof result !== 'object' ||
      !('estimatedTokens' in result) ||
      typeof result.estimatedTokens !== 'number'
    )
      throw new ApiError('Invalid token estimate', 502);
    return result.estimatedTokens;
  },
  async analyze(showId: string, signal?: AbortSignal): Promise<unknown> {
    return request(`/shows/${encodeURIComponent(showId)}/analysis`, { method: 'POST', signal });
  },
  async suggestAwards(showId: string, signal?: AbortSignal): Promise<Award[]> {
    const result = await request(`/shows/${encodeURIComponent(showId)}/awards`, {
      method: 'POST',
      signal,
    });
    const show = ShowSchema.safeParse(result);
    if (show.success) return show.data.awards;
    if (result && typeof result === 'object' && 'awards' in result)
      return AwardSchema.array().parse(result.awards);

    return AwardSchema.array().parse(result);
  },
  async saveAwards(showId: string, awards: Award[], signal?: AbortSignal): Promise<Show> {
    return ShowSchema.parse(
      await request(`/shows/${encodeURIComponent(showId)}/awards`, {
        ...jsonRequest('PUT', { awards }),
        signal,
      }),
    );
  },
  async decideAward(
    showId: string,
    awardId: string,
    decision: { decision: 'sealed' } | { decision: 'host-picked'; winnerId: string },
    signal?: AbortSignal,
  ): Promise<void> {
    await request(`/shows/${encodeURIComponent(showId)}/awards/${encodeURIComponent(awardId)}`, {
      ...jsonRequest('PUT', decision),
      signal,
    });
  },
  async produceShow(showId: string, signal?: AbortSignal): Promise<unknown> {
    return request(`/shows/${encodeURIComponent(showId)}/production`, { method: 'POST', signal });
  },
  async exportShow(
    showId: string,
    kind: 'video' | 'poster' = 'video',
    aspect: '16:9' | '9:16' = '16:9',
  ): Promise<unknown> {
    return request(
      `/shows/${encodeURIComponent(showId)}/exports`,
      jsonRequest('POST', { aspect, kind, draft: false }),
    );
  },
};
