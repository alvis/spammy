import { awardTitleError, formatReceiptQuote } from '@spammy/domain';
import type { FC } from 'react';
import type { Award } from '@spammy/domain';
import { api, canUseSample } from '../api/client';
import { Avatar } from '../components/avatar';
import type { StepProps } from './types';

/** renders editable awards without disclosing sealed decisions */
export const AwardsStep: FC<StepProps> = ({
  show,
  onChange,
  onReceipts,
  isBusy,
  setBusy,
  onNotice,
}) => {
  const replace = (award: Award): void =>
    onChange({
      ...show,
      awards: show.awards.map((current) => (current.id === award.id ? award : current)),
    });
  const swap = (award: Award): Award => ({
    ...award,
    title:
      award.title === 'Outstanding Chat Energy'
        ? 'The Group Chat Legend'
        : 'Outstanding Chat Energy',
    decision: 'sealed',
  });
  async function suggestAlternatives(awardId?: string): Promise<void> {
    if (show.id.startsWith('sample-')) {
      if (awardId) {
        const award = show.awards.find((candidate) => candidate.id === awardId);
        if (award) replace(swap(award));
      } else onChange({ ...show, awards: show.awards.map(swap) });
      return;
    }
    setBusy(true);
    onNotice('Finding fresh awards from your chat…');
    try {
      const suggestions = await api.suggestAwards(show.id);
      const fresh = suggestions.map((award) => ({ ...award, id: crypto.randomUUID() }));
      const replacement = fresh[0];
      if (!replacement) {
        onNotice('No new suggestions came back. Your current awards are unchanged; please retry.');
        return;
      }
      onChange({
        ...show,
        awards: awardId
          ? show.awards.map((award) => (award.id === awardId ? replacement : award))
          : fresh.slice(0, 12),
      });
      onNotice('Fresh suggestions are ready. Your choices will be saved when you lock them in.');
    } catch (error) {
      onNotice(
        canUseSample(error)
          ? 'Award suggestions are unavailable. Your chat and awards are unchanged. Start the local server or configure OpenAI, then retry.'
          : `Could not suggest awards: ${(error as Error).message}. Your current choices are unchanged; please retry.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function addAward(): Promise<void> {
    if (show.awards.length >= 12) return;
    if (show.id.startsWith('sample-')) {
      const source = show.awards[0];
      if (source)
        onChange({
          ...show,
          awards: [
            ...show.awards,
            {
              ...source,
              id: crypto.randomUUID(),
              title: 'The Group Chat Legend',
              decision: 'sealed',
            },
          ],
        });
      return;
    }
    setBusy(true);
    onNotice('Finding another award for your cast…');
    try {
      const suggestions = await api.suggestAwards(show.id);
      const fresh =
        suggestions.find(
          (award) => !show.awards.some((current) => current.title === award.title),
        ) ?? suggestions[0];
      if (!fresh) {
        onNotice('No new award came back. Your current awards are unchanged; please retry.');
        return;
      }
      onChange({ ...show, awards: [...show.awards, { ...fresh, id: crypto.randomUUID() }] });
      onNotice('One fresh award added. Lock them in when you’re ready.');
    } catch (error) {
      onNotice(
        canUseSample(error)
          ? 'Award suggestions are unavailable. Your chat and awards are unchanged. Start the local server or configure OpenAI, then retry.'
          : `Could not add an award: ${(error as Error).message}. Please retry.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="step-heading">
        <span className="eyebrow">THE NOMINATIONS ARE IN</span>
        <h1>
          A little prestige.
          <br />
          <span className="foil">A lot of receipts.</span>
        </h1>
        <p>Keep the winners a surprise, or take the judge’s seat.</p>
      </div>
      <div className="section-heading">
        <strong>
          {show.awards.length} awards · {new Set(show.awards.map((award) => award.showName)).size}{' '}
          shows
        </strong>
        <div className="actions">
          <button
            className="chip"
            type="button"
            disabled={isBusy}
            onClick={() => void suggestAlternatives()}
          >
            ⟳ Shuffle all
          </button>
          <button
            className="chip"
            type="button"
            disabled={isBusy || show.awards.length >= 12}
            onClick={() => void addAward()}
          >
            + Add an award
          </button>
        </div>
      </div>
      <div className="award-grid">
        {show.awards.map((award) => {
          const winner =
            award.decision === 'host-picked'
              ? show.cast.find((person) => person.participantId === award.winnerId)
              : undefined;
          return (
            <article className="award-card" key={award.id}>
              <div className="award-top">
                <span className="eyebrow">{award.showName}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Swap ${award.title}`}
                  disabled={isBusy}
                  onClick={() => void suggestAlternatives(award.id)}
                >
                  ⟳
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${award.title}`}
                  disabled={isBusy || show.awards.length <= 3}
                  onClick={() =>
                    onChange({
                      ...show,
                      awards: show.awards.filter((current) => current.id !== award.id),
                    })
                  }
                >
                  ×
                </button>
              </div>
              <input
                disabled={isBusy}
                className="award-title"
                aria-label="Award title"
                aria-invalid={Boolean(awardTitleError(award.title))}
                aria-describedby={`title-help-${award.id}`}
                value={award.title}
                onChange={(event) => replace({ ...award, title: event.target.value })}
              />
              <p
                id={`title-help-${award.id}`}
                className="muted"
                role={awardTitleError(award.title) ? 'alert' : undefined}
              >
                {awardTitleError(award.title) ?? 'Four words maximum.'}
              </p>
              <p className="muted">{award.howJudged}</p>
              <div className="winner-summary">
                {winner ? (
                  <>
                    <Avatar person={winner} showId={show.id} />
                    <span>
                      <strong>{winner.displayName}</strong> wins over{' '}
                      {award.nominees
                        .filter((nominee) => nominee.participantId !== winner.participantId)
                        .map(
                          (nominee) =>
                            show.cast.find(
                              (person) => person.participantId === nominee.participantId,
                            )?.displayName ?? 'Nominee',
                        )
                        .join(' and ')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="sealed-icon">✉</span>
                    <span>
                      <strong>Sealed until the big night</strong>
                      <br />
                      {award.nominees
                        .map(
                          (nominee) =>
                            show.cast.find(
                              (person) => person.participantId === nominee.participantId,
                            )?.displayName ?? nominee.participantId,
                        )
                        .join(', ')}
                    </span>
                  </>
                )}
              </div>
              <label className="decision-label">
                The decision
                <select
                  disabled={isBusy}
                  value={award.decision === 'sealed' ? 'sealed' : (award.winnerId ?? '')}
                  onChange={(event) =>
                    replace(
                      event.target.value === 'sealed'
                        ? { ...award, decision: 'sealed' }
                        : { ...award, decision: 'host-picked', winnerId: event.target.value },
                    )
                  }
                >
                  <option value="sealed">Seal it (AI picks, revealed live)</option>
                  {award.nominees.map((nominee) => (
                    <option key={nominee.participantId} value={nominee.participantId}>
                      Pick{' '}
                      {show.cast.find((person) => person.participantId === nominee.participantId)
                        ?.displayName ?? nominee.participantId}
                    </option>
                  ))}
                </select>
              </label>
              <button className="receipt-link" type="button" onClick={() => onReceipts(award)}>
                <span>
                  “
                  {award.nominees[0] &&
                    formatReceiptQuote(
                      {
                        messageId: award.nominees[0].receiptMessageId ?? '',
                        authorId: award.nominees[0].participantId,
                        quote: award.nominees[0].quote,
                      },
                      show,
                    )}
                  ”
                </span>
                <small>{award.nominees[0]?.stat}</small>
                <strong>See the conversation →</strong>
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
};
