import {
  AVATAR_CSS,
  audienceMotion,
  nomineeChoreography,
  nomineeCameraTime,
  characterMotion,
  getCostume,
  resolveCastAvatar,
} from '@spammy/domain';

import type { CeremonyScript, CeremonyScene } from '@spammy/domain';

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

/**
 * creates seekable local HTML from the shared ceremony clock
 * @param script validated ceremony
 * @param portrait whether to use a vertical stage
 * @returns HyperFrames entry document
 */
export function compositionHtml(script: CeremonyScript, portrait = false): string {
  const hostName = `${script.persona[0]?.toUpperCase()}${script.persona.slice(1)}`;
  const person = (id?: string | null): string =>
    escapeHtml(
      script.cast.find((member) => member.participantId === id)?.displayName ??
        'Awaiting judgement',
    );
  const avatar = (id?: string | null): string => {
    const member = script.cast.find((candidate) => candidate.participantId === id);
    if (!member) return '<span class="avatar">?</span>';
    const costume = getCostume(member.costumeId);
    const resolved = resolveCastAvatar(
      member,
      member.photoAssetId ?? undefined,
      `costumes/${costume.id}.png`,
    );
    return `<span class="avatar cast-avatar" aria-label="${escapeHtml(member.displayName)}"><img class="cast-avatar-costume" src="${escapeHtml(resolved.costumeUrl)}" alt="${escapeHtml(costume.label)}"/><span class="cast-avatar-face">${resolved.photoUrl ? `<img src="${escapeHtml(resolved.photoUrl)}" alt=""/>` : escapeHtml(resolved.initial)}</span></span>`;
  };
  const winners = script.scenes
    .filter((scene) => scene.kind === 'env')
    .map(
      (scene) =>
        `<article>${avatar(scene.award?.winnerId)}<div><small>${escapeHtml(scene.award?.title ?? '')}</small><h3>${person(scene.award?.winnerId)}</h3></div></article>`,
    )
    .join('');
  const content = (scene: CeremonyScene): string => {
    const award = scene.award;
    switch (scene.kind) {
      case 'open':
        return `<small>The Spammy presents</small><h1>${escapeHtml(script.title)}</h1><p>A year of messages. A night of receipts.</p>`;
      case 'show':
        return `<small>Now presenting</small><h1>${escapeHtml(scene.showName ?? '')}</h1><p>Prestige. Drama. Group chat behavior.</p>`;
      case 'intro':
        return `<small>${escapeHtml(scene.showName ?? '')}</small><p>The award for</p><h1>${escapeHtml(award?.title ?? '')}</h1>`;
      case 'noms':
        return `<small>${escapeHtml(award?.title ?? '')}</small><h2 class="nominee-title">The nominees are…</h2><div class="grid nominee-camera" style="grid-template-columns:repeat(${Math.max(1, award?.nominees.length ?? 0)},minmax(0,1fr))">${award?.nominees.map((nominee) => `<article>${avatar(nominee.participantId)}<h3>${person(nominee.participantId)}</h3><p>${escapeHtml(nominee.stat)}</p><blockquote>“${escapeHtml(nominee.quote)}”</blockquote></article>`).join('') ?? ''}</div>`;
      case 'env':
        return `<div class="envelope"><i></i></div><div class="winner-card"><small>${escapeHtml(award?.title ?? '')}</small><p>And the award goes to</p>${avatar(award?.winnerId)}<h1>${person(award?.winnerId)}</h1><p>${escapeHtml(award?.nominees.find((nominee) => nominee.participantId === award.winnerId)?.stat ?? '')}</p></div>`;
      case 'finale':
        return `<h1>That's a wrap.</h1><div class="grid">${winners}</div>`;
    }
  };
  const palette =
    script.look === 'blacktie'
      ? ['#0f0d0a', '#f6efe1']
      : script.look === 'champagne'
        ? ['#f8e3da', '#2a1a17']
        : ['#f7f1e4', '#1c1915'];
  const scenes = script.scenes
    .map(
      (scene, index) =>
        `<section id="scene-${index}" class="clip scene scene-${scene.kind}" data-start="${scene.startSeconds}" data-duration="${scene.durationSeconds}" data-track-index="0" ${scene.kind === 'open' ? 'data-layout-allow-occlusion="true"' : ''}>${content(scene)}${scene.kind === 'open' ? '<div class="curtain left" data-layout-allow-overflow="true"></div><div class="curtain right" data-layout-allow-overflow="true"></div>' : ''}${scene.kind === 'env' ? `<div class="confetti">${Array.from({ length: 40 }, (_, particle) => `<i style="left:${(particle * 37) % 100}%;background:${['#c99a3e', '#c94b5a', '#5a86a2'][particle % 3]}"></i>`).join('')}</div>` : ''}<footer><span class="host-avatar">✦</span><div>${escapeHtml(hostName)} · your AI host<p>${escapeHtml(scene.line)}</p></div></footer></section>${scene.audioUrl ? `<audio src="${escapeHtml(scene.audioUrl)}" data-start="${scene.startSeconds}" data-duration="${scene.audioDurationSeconds ?? scene.durationSeconds}" data-track-index="1"></audio>` : ''}`,
    )
    .join('');
  const music = (script.music ?? [])
    .flatMap((cue) => {
      const boundaries = [
        ...new Set([
          cue.startSeconds,
          cue.startSeconds + cue.durationSeconds,
          ...script.scenes.flatMap((scene) => [
            scene.startSeconds,
            scene.startSeconds + (scene.audioDurationSeconds ?? scene.durationSeconds),
          ]),
        ]),
      ]
        .filter(
          (time) => time >= cue.startSeconds && time <= cue.startSeconds + cue.durationSeconds,
        )
        .sort((a, b) => a - b);
      return boundaries.slice(0, -1).map((start, index) => {
        const speaking = script.scenes.some(
          (scene) =>
            scene.audioUrl &&
            start >= scene.startSeconds &&
            start < scene.startSeconds + (scene.audioDurationSeconds ?? scene.durationSeconds),
        );
        return `<audio src="${escapeHtml(cue.audioUrl)}" data-start="${start}" data-duration="${boundaries[index + 1]! - start}" data-media-start="${start - cue.startSeconds}" data-volume="${speaking ? cue.volume : Math.min(cue.volume * 2, 0.5)}" data-track-index="2"></audio>`;
      });
    })
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:Fredoka;src:url('fredoka-latin-700-normal.woff2')}@font-face{font-family:Nunito;src:url('nunito-latin-800-normal.woff2')}body{margin:0}#stage{position:relative;width:${portrait ? 1080 : 1920}px;height:${portrait ? 1920 : 1080}px;overflow:hidden;background:${palette[0]};color:${palette[1]};font-family:Nunito,sans-serif}.curtain{position:absolute;top:0;bottom:0;width:50%;z-index:5;background:repeating-linear-gradient(90deg,#7e1b30,#a32c41 9%,#601426 18%)}.curtain.left{left:0}.curtain.right{right:0}.envelope{position:absolute;left:35%;top:35%;width:30%;height:25%;background:#d2a447;border:2px solid #8a6420;perspective:500px}.envelope i{position:absolute;inset:0;clip-path:polygon(0 0,100% 0,50% 65%);background:#f0d48a;transform-origin:top}.winner-card{position:relative}.confetti{position:absolute;inset:0;pointer-events:none}.confetti i{position:absolute;width:14px;height:22px;top:-30px}.scene{opacity:0;position:absolute;inset:0;padding:90px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box}h1{font-family:Fredoka,sans-serif;font-size:90px;color:${script.look === 'blacktie' ? '#c99a3e' : '#8a6420'};margin:22px;background:linear-gradient(100deg,${script.look === 'blacktie' ? '#b8862f,#f0d48a,#c99a3e,#f0d48a' : '#6f4f18,#8a6420,#ad7a25,#7d5a1c'});background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent}h2{font-family:Fredoka,sans-serif;font-size:64px}h3{font-family:Fredoka,sans-serif;font-size:30px}p,small{font-size:28px}.grid{display:grid;grid-template-columns:repeat(${portrait ? 2 : 3},1fr);gap:22px;width:90%}article{padding:22px;border-radius:28px;background:#ffffff20}blockquote{font-size:23px}.avatar{display:inline-flex;align-items:center;justify-content:center;width:110px;height:110px;border-radius:50%;object-fit:cover;background:#c99a3e;color:#1c1915;font-size:60px}.scene-finale .avatar{width:64px;height:64px;font-size:36px}.scene-finale article{padding:20px;display:flex;align-items:center;gap:18px;text-align:left}.scene-finale article .avatar{flex-shrink:0}.scene-finale h3{margin:8px;font-size:28px}.scene-finale small{font-size:24px}.scene-finale h1{font-size:72px}.scene-finale .grid{gap:12px}.host-avatar{display:inline-grid;place-items:center;width:90px;height:90px;border-radius:50%;background:#8a6420;color:#f7e3a8;font-size:50px;flex-shrink:0}footer{z-index:6;display:flex;align-items:center;gap:24px;text-align:left;position:absolute;bottom:25px;left:50px;right:50px;font-size:28px}footer>div{background:${palette[0]};padding:16px 22px;border-radius:24px}footer p{font-size:28px}${AVATAR_CSS}.cast-avatar.avatar{display:inline-block;width:220px;height:auto;border-radius:12%;font-size:inherit}.scene-finale .cast-avatar.avatar{width:80px;height:auto}.scene-env .cast-avatar.avatar{width:200px}.stage-edge{position:absolute;left:0;right:0;bottom:15.3%;height:1.4%;z-index:2;background:linear-gradient(90deg,#8a6420,#f0d48a,#b8862f)}.audience{position:absolute;inset:0;pointer-events:none;z-index:3}.audience i{position:absolute;width:5.3%;height:8.5%;bottom:6.4%;border-radius:48% 48% 15% 15%;background:${script.look === 'blacktie' ? '#2a251d' : script.look === 'champagne' ? '#8a675c' : '#6b5f4e'}}.audience i:after{content:'';position:absolute;left:-20%;right:-20%;top:65%;height:150%;border-radius:45% 45% 0 0;background:inherit}.audience .front{width:7.8%;height:12.4%;bottom:-2.1%;background:${script.look === 'blacktie' ? '#060504' : script.look === 'champagne' ? '#3a2622' : '#2a241c'}}.scene{padding-bottom:${portrait ? 600 : 400}px}footer{bottom:18%}.scene-noms .nominee-camera{width:80%;grid-template-columns:repeat(3,minmax(0,1fr));gap:3.2%;transform-origin:50% 100%}.scene-noms article{position:relative;padding:14px}.scene-noms .cast-avatar{width:${portrait ? 150 : 192}px}.scene-noms h3{font-size:32px;margin:12px 0}.scene-noms article p{font-size:22px}.scene-noms blockquote{position:absolute;left:14px;right:14px;top:60px;padding:14px;background:${palette[0]};border-radius:18px;font-size:20px;box-shadow:0 8px 20px #0003;opacity:0}</style></head><body><div id="stage" data-composition-id="ceremony" data-start="0" data-duration="${script.durationSeconds}" data-width="${portrait ? 1080 : 1920}" data-height="${portrait ? 1920 : 1080}">${scenes}${music}<div class="stage-edge"></div><div class="audience">${Array.from({ length: 37 }, (_, index) => `<i class="${index >= 22 ? 'front' : 'back'}" style="left:${((index >= 22 ? index - 22 : index) / (index >= 22 ? 15 : 22)) * 106 - 3}%"></i>`).join('')}</div></div><script src="gsap.min.js"></script><script>const nomineeCameraTime=${nomineeCameraTime.toString()};const nomineeChoreography=${nomineeChoreography.toString()};const audienceMotion=${audienceMotion.toString()};const characterMotion=${characterMotion.toString()};const tl=gsap.timeline({paused:true});tl.to('.curtain.left',{xPercent:-100,duration:1.6},0);tl.to('.curtain.right',{xPercent:100,duration:1.6},0);${script.scenes.map((scene, index) => `tl.fromTo('#scene-${index}',{opacity:0,y:25},{opacity:1,y:0,duration:0.3},${scene.startSeconds});tl.set('#scene-${index}',{opacity:0},${scene.startSeconds + scene.durationSeconds});${scene.kind === 'env' ? `tl.to('#scene-${index} .envelope i',{rotationX:180,duration:0.7},${scene.startSeconds});tl.to('#scene-${index} .envelope',{opacity:0,duration:0.6},${scene.startSeconds + 0.8});tl.fromTo('#scene-${index} .winner-card',{opacity:0,y:70},{opacity:1,y:0,duration:0.8},${scene.startSeconds + 0.4});tl.fromTo('#scene-${index} .confetti i',{y:0,rotation:0},{y:1300,rotation:600,duration:Math.min(6.4,${scene.durationSeconds}),ease:'none'},${scene.startSeconds});` : ''}`).join('')}tl.to({}, {duration:0.001},${script.durationSeconds});const captions=${JSON.stringify(script.scenes.map((scene) => ({ start: scene.startSeconds, duration: scene.durationSeconds, kind: scene.kind, nominees: scene.award?.nominees.map((nominee) => ({ name: script.cast.find((member) => member.participantId === nominee.participantId)?.displayName ?? nominee.participantId, stat: nominee.stat })) ?? [], audio: Boolean(scene.audioUrl), line: scene.line, words: scene.words ?? [] }))).replace(/</g, '\\u003c')};tl.eventCallback('onUpdate',()=>{const now=tl.time();captions.forEach((caption,index)=>{const elapsed=now-caption.start;const section=document.querySelector('#scene-'+index);const role=section.classList.contains('scene-env')?'winner':section.classList.contains('scene-finale')?'finale':'nominee';section.querySelectorAll('.cast-avatar').forEach((avatar,position)=>{avatar.style.transform=characterMotion(elapsed,role,position);avatar.style.transformOrigin='50% 90%';});if(elapsed<0||elapsed>=caption.duration)return;document.querySelectorAll('.audience i').forEach((head,position)=>{head.style.transform=audienceMotion(elapsed,(caption.kind==='env'&&elapsed<6.4)||caption.kind==='finale',position);});let nomineeLine='The nominees are…';if(caption.kind==='noms'){const pose=nomineeChoreography(nomineeCameraTime(elapsed,caption.nominees,caption.audio?caption.words:[]),caption.nominees.length);section.querySelector('.nominee-camera').style.transform=pose.camera;section.querySelector('.nominee-title').style.opacity=pose.titleOpacity;section.querySelectorAll('article').forEach((card,position)=>{const state=pose.cards[position];card.style.opacity=state.opacity*state.entrance;card.style.transform='translateY('+((1-state.entrance)*20)+'px)';card.querySelector('blockquote').style.opacity=state.quoteOpacity;});const nominee=caption.nominees[pose.focus];if(nominee)nomineeLine=nominee.name+'. '+nominee.stat+'.';}const node=document.querySelector('#scene-'+index+' footer p');node.textContent=caption.kind==='noms'&&!caption.audio?nomineeLine:caption.words.length?caption.words.filter(word=>word.start<=elapsed).map(word=>word.word).join(' '):caption.line.slice(0,Math.floor(elapsed*84)+1);});});window.__timelines={ceremony:tl};</script></body></html>`;
}
