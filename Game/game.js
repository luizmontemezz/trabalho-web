(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GROUND_Y = 360;


  const menuScreen = document.getElementById('menu');
  const difficultyMenu = document.getElementById('difficultyMenu');
  const weaponsMenu = document.getElementById('weaponsMenu');
  const skillsMenu = document.getElementById('skillsMenu');
  const gameoverScreen = document.getElementById('gameover');
  const hud = document.getElementById('hud');

  const hp1El = document.getElementById('hp1');
  const hp2El = document.getElementById('hp2');
  const p2nameEl = document.getElementById('p2name');
  const roundMsg = document.getElementById('round-msg');
  const resultText = document.getElementById('resultText');
  const coinRewardEl = document.getElementById('coinReward');
  const survivalBadgeEl = document.getElementById('survivalBadge');
  const bossCutsceneEl = document.getElementById('bossCutscene');
  const cutsceneTitleEl = document.getElementById('cutsceneTitle');
  const cutsceneTextEl = document.getElementById('cutsceneText');
  const cutsceneProgressEl = document.getElementById('cutsceneProgress');
  const cutsceneSpeakerEl = document.getElementById('cutsceneSpeaker');
  const portraitSamuraiEl = document.getElementById('portraitSamurai');
  const portraitDragonEl = document.getElementById('portraitDragon');
  const pauseOverlayEl = document.getElementById('pauseOverlay');
  const survivalRoundNumEl = document.getElementById('survivalRoundNum');

  const coinDisplayEl = document.getElementById('coinDisplay');
  const menuCoinDisplayEl = document.getElementById('menuCoinDisplay');
  const menuCoinDisplaySkillsEl = document.getElementById('menuCoinDisplaySkills');
  const skillCoinDisplayEl = document.getElementById('skillCoinDisplay');

  const currentDiffLabelEl = document.getElementById('currentDiffLabel');
  const diffListEl = document.getElementById('diffList');
  const weaponListEl = document.getElementById('weaponList');
  const skillListEl = document.getElementById('skillList');

  const ALL_SCREENS = [menuScreen, difficultyMenu, weaponsMenu, skillsMenu, gameoverScreen];

  function showScreen(screen) {
    ALL_SCREENS.forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  // ---------- ECONOMIA / PROGRESSO ----------
  let coins = 0;

  function updateCoinDisplays() {
    menuCoinDisplayEl.textContent = '🪙 ' + coins;
    menuCoinDisplaySkillsEl.textContent = '🪙 ' + coins;
    coinDisplayEl.textContent = '🪙 ' + coins;
    skillCoinDisplayEl.textContent = '🪙 ' + coins;
  }

  let weapons = {
    padrao: { name: 'Luva de Boxe', tag: 'dano muito baixo', dmgMin: 5, dmgMax: 8, cost: 0, owned: true },
    shuriken: { name: 'Shuriken', tag: 'alcance longo (tecla R)', dmgMin: 10, dmgMax: 14, cost: 120, owned: false, isShuriken: true },
    nunchaku: { name: 'Nunchaku', tag: 'dano baixo', dmgMin: 7, dmgMax: 10, cost: 30, owned: false },
    faca: { name: 'Faca', tag: 'dano médio', dmgMin: 13, dmgMax: 17, cost: 70, owned: false },
    katana: { name: 'Katana', tag: 'dano alto', dmgMin: 20, dmgMax: 26, cost: 200, owned: false },
  };

  let skills = {
    dano_critico: { name: 'Dano Crítico', tag: '10% de chance de +30% de dano extra', cost: 40, owned: false },
    derrubar: { name: 'Derrubar', tag: '10% de chance de derrubar o adversário por 1s', cost: 50, owned: false }
  };

  let equippedWeapon = 'padrao';
  let difficulty = 'medio';

  // ---------- PROGRESSÃO DO BOSS ----------
  const BOSS_PROGRESS_KEY = 'shadowDuelBossProgress_v1';
  let bossProgress = { facil: false, medio: false, dificil: false };
  try {
    const saved = JSON.parse(localStorage.getItem(BOSS_PROGRESS_KEY) || '{}');
    bossProgress = { ...bossProgress, ...saved };
  } catch (e) { }

  function isBossUnlocked() {
    return !!(bossProgress.facil && bossProgress.medio && bossProgress.dificil);
  }

  function saveBossProgress() {
    try { localStorage.setItem(BOSS_PROGRESS_KEY, JSON.stringify(bossProgress)); } catch (e) { }
  }

  function registerDifficultyVictory(diffKey) {
    if (['facil', 'medio', 'dificil'].includes(diffKey) && !bossProgress[diffKey]) {
      bossProgress[diffKey] = true;
      saveBossProgress();
      renderDifficultyMenu();
    }
  }


  // ---------- MODO SOBREVIVÊNCIA ----------
  const SURVIVAL_TOTAL_ROUNDS = 10;
  const SURVIVAL_COIN_PER_ROUND = 10;
  let survivalMode = false;
  let survivalRound = 1;
  let savedDifficulty = difficulty; // dificuldade "normal" para restaurar depois
  let lastRunWasSurvival = false;

  function survivalDifficultyForRound(round) {
    if (round <= 4) return 'facil';
    if (round <= 7) return 'medio';
    return 'dificil';
  }

  const DIFFICULTY_SETTINGS = {
    facil: { label: 'Fácil', aiSpeedMult: 0.7, aiReactionMin: 34, aiReactionMax: 62, aiAttackChance: 0.32, aiDmgMult: 0.8, aiHp: 85, coinReward: 10, scale: 1, weaponKey: 'padrao' },
    medio: { label: 'Médio', aiSpeedMult: 0.9, aiReactionMin: 22, aiReactionMax: 48, aiAttackChance: 0.52, aiDmgMult: 1.0, aiHp: 100, coinReward: 20, scale: 1, weaponKey: 'padrao' },
    dificil: { label: 'Difícil', aiSpeedMult: 1.15, aiReactionMin: 12, aiReactionMax: 28, aiAttackChance: 0.74, aiDmgMult: 1.3, aiHp: 118, coinReward: 30, scale: 1, weaponKey: 'padrao' },
    boss: { label: 'Boss', aiSpeedMult: 1, aiReactionMin: 12, aiReactionMax: 28, aiAttackChance: 0.74, aiDmgMult: 1.15, aiHp: 150, coinReward: 30, scale: 1.5, weaponKey: 'padrao', isDragon: true, fireballDmgMin: 12, fireballDmgMax: 18 },
  };

  // ---------- ÁUDIO: EFEITOS SONOROS DE GOLPE (sintetizados, sem arquivos externos) ----------
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function noiseBuffer(ctxA, duration) {
    const bufferSize = Math.max(1, Math.floor(ctxA.sampleRate * duration));
    const buffer = ctxA.createBuffer(1, bufferSize, ctxA.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Whoosh do golpe sendo desferido (antes de acertar ou não)
  function playSwingSound(action) {
    const ctxA = getAudioCtx(); if (!ctxA) return;
    const now = ctxA.currentTime;
    const pitch = action === 'shuriken' ? 1.6 : (action === 'kick' ? 1.3 : 1.0);
    const dur = 0.12;
    const src = ctxA.createBufferSource();
    src.buffer = noiseBuffer(ctxA, dur);
    const bp = ctxA.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800 * pitch, now);
    bp.frequency.exponentialRampToValueAtTime(500 * pitch, now + dur);
    bp.Q.value = 0.8;
    const gain = ctxA.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp).connect(gain).connect(ctxA.destination);
    src.start(now);
    src.stop(now + dur);
  }

  // Impacto metálico (espada/faca)
  function playClangSound() {
    const ctxA = getAudioCtx(); if (!ctxA) return;
    const now = ctxA.currentTime;
    [1600, 2400, 3100].forEach((freq, i) => {
      const osc = ctxA.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const gain = ctxA.createGain();
      gain.gain.setValueAtTime(0.12 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain).connect(ctxA.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    });
    const src = ctxA.createBufferSource();
    src.buffer = noiseBuffer(ctxA, 0.05);
    const hp = ctxA.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2000;
    const gain = ctxA.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    src.connect(hp).connect(gain).connect(ctxA.destination);
    src.start(now);
  }

  // Impacto surdo sintetizado (reserva, caso os arquivos de áudio ainda não tenham carregado)
  function playThudSound() {
    const ctxA = getAudioCtx(); if (!ctxA) return;
    const now = ctxA.currentTime;
    const osc = ctxA.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    const gain = ctxA.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(ctxA.destination);
    osc.start(now);
    osc.stop(now + 0.2);
    const src = ctxA.createBufferSource();
    src.buffer = noiseBuffer(ctxA, 0.08);
    const lp = ctxA.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 800;
    const gain2 = ctxA.createGain();
    gain2.gain.setValueAtTime(0.25, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    src.connect(lp).connect(gain2).connect(ctxA.destination);
    src.start(now);
  }

  // Sons de soco reais (arquivos enviados), sorteados a cada acerto para variar
  const PUNCH_SOUND_FILES = [
    'assets/sfx/punch1.wav',
    'assets/sfx/punch2.wav',
    'assets/sfx/punch3.mp3',
    'assets/sfx/punch4.mp3',
    'assets/sfx/punch5.mp3'
  ];
  let lastPunchIndex = -1;
  function playPunchSound() {
    try {
      let idx = Math.floor(Math.random() * PUNCH_SOUND_FILES.length);
      if (PUNCH_SOUND_FILES.length > 1 && idx === lastPunchIndex) {
        idx = (idx + 1) % PUNCH_SOUND_FILES.length; // evita repetir o mesmo som duas vezes seguidas
      }
      lastPunchIndex = idx;
      const audio = new Audio(PUNCH_SOUND_FILES[idx]);
      audio.volume = 0.8;
      const p = audio.play();
      if (p && p.catch) p.catch(() => { playThudSound(); }); // reserva se o navegador bloquear
    } catch (e) {
      playThudSound();
    }
  }

  // Som de disparo (whoosh) da bola de fogo do dragão
  function playFireballLaunchSound() {
    const ctxA = getAudioCtx(); if (!ctxA) return;
    const now = ctxA.currentTime;
    const src = ctxA.createBufferSource();
    src.buffer = noiseBuffer(ctxA, 0.35);
    const bp = ctxA.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(750, now);
    bp.frequency.exponentialRampToValueAtTime(180, now + 0.35);
    bp.Q.value = 0.6;
    const gain = ctxA.createGain();
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    src.connect(bp).connect(gain).connect(ctxA.destination);
    src.start(now);
    src.stop(now + 0.36);

    const osc = ctxA.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);
    const gain2 = ctxA.createGain();
    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain2).connect(ctxA.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Impacto de explosão da bola de fogo
  function playFireballImpactSound() {
    playThudSound();
    const ctxA = getAudioCtx(); if (!ctxA) return;
    const now = ctxA.currentTime;
    const src = ctxA.createBufferSource();
    src.buffer = noiseBuffer(ctxA, 0.16);
    const hp = ctxA.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1400;
    const gain = ctxA.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    src.connect(hp).connect(gain).connect(ctxA.destination);
    src.start(now);
  }

  // Impacto do shuriken
  function playTwangSound() {
    const ctxA = getAudioCtx(); if (!ctxA) return;
    const now = ctxA.currentTime;
    const osc = ctxA.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
    const gain = ctxA.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(ctxA.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  function playImpactSound(attackType) {
    if (attackType === 'katana' || attackType === 'faca') {
      playClangSound();
    } else if (attackType === 'shuriken') {
      playTwangSound();
    } else if (attackType === 'fireball') {
      playFireballImpactSound();
    } else {
      playPunchSound(); // soco, chute, nunchaku — sorteia entre os sons enviados
    }
  }

  // ---------- PARTICULAS (SANGUE E TEXTOS FLUTUANTES) ----------
  let bloodParticles = [];
  let floatTexts = [];

  function spawnBlood(x, y, attackerFacing) {
    for (let i = 0; i < 16; i++) {
      bloodParticles.push({
        x: x + (Math.random() * 16 - 8),
        y: y + (Math.random() * 20 - 10),
        vx: attackerFacing * (Math.random() * 4 + 1.5) + (Math.random() * 2 - 1),
        vy: -Math.random() * 4 - 1.5,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        size: Math.random() * 3 + 1.5,
        color: '#050308'
      });
    }
  }

  // Explosão de fagulhas de fogo (usada no impacto da bola de fogo do dragão)
  function spawnFireBurst(x, y) {
    const palette = ['#ffcc33', '#ff8a1e', '#ff4d1e'];
    for (let i = 0; i < 18; i++) {
      bloodParticles.push({
        x: x + (Math.random() * 14 - 7),
        y: y + (Math.random() * 14 - 7),
        vx: (Math.random() * 6 - 3),
        vy: -Math.random() * 5 - 1,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02,
        size: Math.random() * 4 + 2,
        color: palette[Math.floor(Math.random() * palette.length)]
      });
    }
  }

  function updateParticles() {
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
      let p = bloodParticles[i];
      if (p.y < GROUND_Y) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY * 0.8;
      } else {
        p.y = GROUND_Y;
        p.vx *= 0.6;
        p.size *= 0.96;
      }
      p.life -= p.decay;
      if (p.life <= 0) bloodParticles.splice(i, 1);
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      floatTexts[i].y -= 0.8;
      floatTexts[i].life--;
      if (floatTexts[i].life <= 0) floatTexts.splice(i, 1);
    }
  }

  function drawParticles() {
    ctx.save();
    for (let p of bloodParticles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color || '#050308'; // Preto/Escuro por padrão, ou cor customizada (ex: fogo)
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "bold 18px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    for (let t of floatTexts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 15));
      ctx.fillStyle = "#ffcc00";
      ctx.shadowColor = "#ff3300";
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  // ---------- PROJECTILES (SHURIKENS) ----------
  let projectiles = [];

  function spawnShuriken(owner, damageMin, damageMax) {
    const s = owner.scale || 1;
    const dir = owner.facing;
    const startX = owner.x + dir * (20 * s);
    const startY = owner.y - (45 * s);
    projectiles.push({
      type: 'shuriken',
      x: startX,
      y: startY,
      vx: dir * 10,
      radius: 8,
      rotation: 0,
      rotSpeed: 0.35,
      owner: owner,
      dmgMin: damageMin,
      dmgMax: damageMax,
      active: true
    });
  }

  // Bola de fogo cuspida pelo dragão
  function spawnFireball(owner, damageMin, damageMax) {
    const s = owner.scale || 1;
    const dir = owner.facing;
    const lane = owner.dragonAttackLane || 'low';
    const startX = owner.x + dir * (34 * s);
    // Ataque baixo passa pelos pés e exige pular. Ataque alto passa pelo tronco/cabeça e exige agachar.
    const startY = owner.y - (lane === 'low' ? 24 * s : 104 * s);
    owner.dragonAttackLane = lane === 'low' ? 'high' : 'low';
    projectiles.push({
      type: 'fireball',
      x: startX,
      y: startY,
      vx: dir * 6.2,
      radius: 13,
      rotation: 0,
      rotSpeed: 0.05,
      owner: owner,
      dmgMin: damageMin,
      dmgMax: damageMax,
      active: true,
      lane,
      trail: []
    });
    playFireballLaunchSound();
  }

  function updateProjectiles(target) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      let p = projectiles[i];
      if (!p.active) continue;

      if (p.type === 'fireball') {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
      }

      p.x += p.vx;
      p.rotation += p.rotSpeed;

      const targetTop = target.y - (target.h * target.scale);
      const targetBottom = target.y;
      const targetLeft = target.x - (20 * target.scale);
      const targetRight = target.x + (20 * target.scale);

      if (p.x >= targetLeft && p.x <= targetRight && p.y >= targetTop && p.y <= targetBottom) {
        if (p.type === 'fireball') {
          const dodged = p.lane === 'low' ? target.jumping : target.crouching;
          if (dodged) {
            floatTexts.push({ x: target.x, y: target.y - target.h * target.scale - 18, text: p.lane === 'low' ? 'SALTO!' : 'ABAIXOU!', life: 24 });
            p.active = false;
            projectiles.splice(i, 1);
            continue;
          }
        }
        let dmg = p.dmgMin + Math.random() * (p.dmgMax - p.dmgMin);
        if (!p.owner.isPlayer) {
          dmg *= DIFFICULTY_SETTINGS[difficulty].aiDmgMult;
        }
        applyDamage(p.owner, target, dmg, p.type);
        p.active = false;
        projectiles.splice(i, 1);
        continue;
      }

      if (p.x < -30 || p.x > W + 30) {
        p.active = false;
        projectiles.splice(i, 1);
      }
    }
  }

  function drawProjectiles() {
    projectiles.forEach(p => {
      if (p.type === 'fireball') {
        ctx.save();
        // rastro de fogo
        for (let i = 0; i < p.trail.length; i++) {
          const tp = p.trail[i];
          const alpha = (i + 1) / p.trail.length * 0.5;
          const r = p.radius * (0.4 + (i / p.trail.length) * 0.5);
          ctx.globalAlpha = alpha;
          const grad = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, r);
          grad.addColorStop(0, '#ffdd66');
          grad.addColorStop(0.5, '#ff8a1e');
          grad.addColorStop(1, 'rgba(255,60,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        const grad2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad2.addColorStop(0, '#fff6d0');
        grad2.addColorStop(0.4, '#ffb347');
        grad2.addColorStop(1, '#ff3c00');
        ctx.fillStyle = grad2;
        ctx.shadowColor = '#ff6a00';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.lane) {
          ctx.save();
          ctx.font = "bold 10px 'Trebuchet MS', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffe9a6';
          ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
          ctx.fillText(p.lane === 'low' ? 'PULE' : 'AGACHE', p.x, p.y + (p.lane === 'low' ? -18 : 22));
          ctx.restore();
        }
        return;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.fillStyle = '#e6b84f';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#e6b84f';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.lineTo(0, -p.radius * 1.4);
        ctx.lineTo(p.radius * 0.3, -p.radius * 0.3);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  // ---------- NAVEGAÇÃO DO MENU ----------
  document.getElementById('openDifficultyBtn').addEventListener('click', () => {
    renderDifficultyMenu();
    showScreen(difficultyMenu);
  });

  document.getElementById('openWeaponsBtn').addEventListener('click', () => {
    renderShop();
    showScreen(weaponsMenu);
  });

  document.getElementById('openSkillsBtn').addEventListener('click', () => {
    renderSkills();
    showScreen(skillsMenu);
  });

  document.getElementById('backFromDiff').addEventListener('click', () => showScreen(menuScreen));
  document.getElementById('backFromWeapons').addEventListener('click', () => showScreen(menuScreen));
  document.getElementById('backFromSkills').addEventListener('click', () => showScreen(menuScreen));

  // ---------- TELA: dificuldade ----------
  function renderDifficultyMenu() {
    diffListEl.querySelectorAll('.diff-card').forEach(card => {
      const isBoss = card.dataset.diff === 'boss';
      const locked = isBoss && !isBossUnlocked();
      card.classList.toggle('selected', !locked && card.dataset.diff === difficulty);
      card.classList.toggle('locked', locked);
      card.disabled = locked;
      if (isBoss) {
        const desc = card.querySelector('.diff-card-desc');
        const reward = card.querySelector('.diff-card-reward');
        if (locked) {
          if (desc) desc.textContent = 'Bloqueado: vença nas dificuldades Fácil, Médio e Difícil';
          if (reward) reward.textContent = '🔒 3 vitórias necessárias';
        } else {
          if (desc) desc.textContent = 'Dragão chinês: rajadas de fogo e janela de vulnerabilidade';
          if (reward) reward.textContent = 'Recompensa: 🪙 60';
        }
      }
    });
  }

  diffListEl.querySelectorAll('.diff-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.disabled) return;
      difficulty = card.dataset.diff;
      renderDifficultyMenu();
      currentDiffLabelEl.textContent = DIFFICULTY_SETTINGS[difficulty].label;
      showScreen(menuScreen);
    });
  });

  currentDiffLabelEl.textContent = DIFFICULTY_SETTINGS[difficulty].label;

  // ---------- TELA: loja de armas ----------
  function renderShop() {
    updateCoinDisplays();
    weaponListEl.innerHTML = '';
    Object.keys(weapons).forEach(key => {
      const w = weapons[key];
      const card = document.createElement('div');
      card.className = 'weapon-card';
      if (equippedWeapon === key) card.classList.add('equipped');
      if (!w.owned && coins < w.cost) card.classList.add('locked');

      let actionHtml;
      if (equippedWeapon === key) {
        actionHtml = '<div class="weapon-action equipped-tag">Equipada</div>';
      } else if (w.owned) {
        actionHtml = '<div class="weapon-action">Equipar</div>';
      } else {
        actionHtml = `<div class="weapon-action buy-tag">🪙 ${w.cost}</div>`;
      }

      card.innerHTML = `
        <div class="weapon-info">
          <div class="weapon-name">${w.name}</div>
          <div class="weapon-dmg">${w.tag}</div>
        </div>
        ${actionHtml}
      `;

      card.addEventListener('click', () => {
        if (w.owned) {
          equippedWeapon = key;
          renderShop();
        } else if (coins >= w.cost) {
          coins -= w.cost;
          w.owned = true;
          equippedWeapon = key;
          renderShop();
        }
      });
      weaponListEl.appendChild(card);
    });
  }

  // ---------- TELA: habilidades ----------
  function renderSkills() {
    updateCoinDisplays();
    skillListEl.innerHTML = '';
    Object.keys(skills).forEach(key => {
      const s = skills[key];
      const card = document.createElement('div');
      card.className = 'weapon-card';
      if (s.owned) card.classList.add('equipped');
      if (!s.owned && coins < s.cost) card.classList.add('locked');

      let actionHtml;
      if (s.owned) {
        actionHtml = '<div class="weapon-action equipped-tag">Adquirido</div>';
      } else {
        actionHtml = `<div class="weapon-action buy-tag">🪙 ${s.cost}</div>`;
      }

      card.innerHTML = `
        <div class="weapon-info">
          <div class="weapon-name">${s.name}</div>
          <div class="weapon-dmg">${s.tag}</div>
        </div>
        ${actionHtml}
      `;

      card.addEventListener('click', () => {
        if (!s.owned && coins >= s.cost) {
          coins -= s.cost;
          s.owned = true;
          renderSkills();
          renderShop();
        }
      });
      skillListEl.appendChild(card);
    });
  }

  updateCoinDisplays();
  renderShop();

  // ---------- INPUT / PAUSA ----------
  const keys = {};
  let paused = false;

  function clearKeys() {
    Object.keys(keys).forEach(k => { keys[k] = false; });
  }

  function hidePause() {
    clearKeys();
    paused = false;
    pauseOverlayEl.classList.add('hidden');
  }

  function pauseGame() {
    if (!running || paused) return;
    clearKeys();
    paused = true;
    pauseOverlayEl.classList.remove('hidden');
  }

  function resumeGame() {
    if (!running || !paused) return;
    clearKeys();
    paused = false;
    pauseOverlayEl.classList.add('hidden');
    lastFrameTime = 0;
    accumulator = 0;
    requestAnimationFrame(loop);
  }

  function goToMainMenu() {
    running = false;
    paused = false;
    bossCutsceneEl.classList.add('hidden');
    pauseOverlayEl.classList.add('hidden');
    hud.style.display = 'none';
    survivalBadgeEl.classList.add('hidden');
    survivalMode = false;
    difficulty = savedDifficulty;
    currentDiffLabelEl.textContent = DIFFICULTY_SETTINGS[difficulty].label;
    showScreen(menuScreen);
    renderDifficultyMenu();
    draw();
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (running) {
        if (paused) resumeGame(); else pauseGame();
      }
      return;
    }
    if (!paused) keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('pauseMenuBtn').addEventListener('click', goToMainMenu);

  function makeFighter(x, facing, isPlayer, accent, scale, weaponKey, isSamurai) {
    return {
      x, y: GROUND_Y, vy: 0,
      facing,
      w: 34, h: 86,
      scale: scale || 1,
      weaponKey: weaponKey || 'padrao',
      isSamurai: !!isSamurai,
      crouching: false,
      jumping: false,
      isPlayer,
      accent,
      hp: 100, maxHp: 100,
      state: 'idle',
      actionTimer: 0,
      cooldown: 0,
      hitApplied: false,
      animFrame: 0,
      hitFlash: 0, // Timer de piscar vermelho independentemente do estado
      aiTimer: 0,
      aiState: 'approach',
    };
  }

  let player, ai, running = false, roundOver = false;

  function resetFight() {
    const diff = DIFFICULTY_SETTINGS[difficulty];
    player = makeFighter(220, 1, true, '#e6b84f', 1, 'padrao', true);
    ai = makeFighter(600, -1, false, '#ff5c5c', diff.scale, diff.weaponKey, false);
    ai.hp = diff.aiHp;
    ai.maxHp = diff.aiHp;

    if (diff.isDragon) {
      ai.isDragon = true;
      ai.dragonState = 'idle';   // idle -> breathing -> tired -> idle...
      ai.dragonTimer = 80;       // espera antes da primeira lufada de fogo
      ai.breathCount = 0;
      ai.breathTotal = 0;
      ai.breathTimer = 0;
      ai.dragonAttackLane = 'low'; // alterna: ataque baixo -> alto -> baixo...
      p2nameEl.textContent = 'DRAGÃO';
    } else {
      ai.isDragon = false;
      p2nameEl.textContent = 'SOMBRA';
    }

    projectiles = [];
    bloodParticles = [];
    floatTexts = [];
    roundOver = false;
    roundMsg.classList.add('hidden');
    updateHUD();
  }

  function updateHUD() {
    hp1El.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';
    hp2El.style.width = Math.max(0, (ai.hp / ai.maxHp) * 100) + '%';
  }

  const GRAVITY = 0.65;
  const MOVE_SPEED = 3.4;
  const JUMP_VEL = -10.5;
  const ATTACK_RANGE_SWORD = 78;
  const ATTACK_RANGE_KICK = 60;

  function startAction(f, action) {
    if (f.cooldown > 0 || f.state === 'hit' || f.state === 'dead' || f.state === 'knockdown' || f.state === 'getting_up') return;
    if (action === 'sword') {
      f.state = 'attack_sword'; f.actionTimer = 26; f.hitApplied = false; f.cooldown = 40;
    } else if (action === 'kick') {
      f.state = 'attack_kick'; f.actionTimer = 18; f.hitApplied = false; f.cooldown = 28;
    } else if (action === 'shuriken') {
      f.state = 'attack_shuriken'; f.actionTimer = 22; f.hitApplied = false; f.cooldown = 50;
    } else {
      return;
    }
    playSwingSound(action);
  }

  function applyDamage(attacker, defender, dmg, attackType) {
    if (attackType === 'kick' && defender.crouching) return false;

    // --- HABILIDADE: DANO CRÍTICO ---
    if (attacker.isPlayer && skills.dano_critico.owned) {
      if (Math.random() <= 0.10) {
        dmg *= 1.3;
        floatTexts.push({ x: defender.x, y: defender.y - (defender.h * defender.scale) - 15, text: "CRÍTICO!", life: 40 });
      }
    }

    defender.hp -= dmg;
    defender.hitFlash = 12; // Efeito de tomar hit indepedente de cair/levantar
    playImpactSound(attackType);

    // Sangue / fagulhas de fogo
    if (attackType === 'fireball' || defender.isDragon) {
      const midY = defender.y - (defender.h * defender.scale * 0.6);
      spawnFireBurst(defender.x, midY);
    } else if (['katana', 'faca', 'shuriken'].includes(attackType)) {
      const midY = defender.y - (defender.h * defender.scale * 0.6);
      spawnBlood(defender.x, midY, attacker.facing);
    }

    // Se morreu, altera o estado e não levanta mais
    if (defender.hp <= 0) {
      defender.hp = 0;
      defender.state = 'dead';
      return true;
    }

    // --- HABILIDADE: DERRUBAR ---
    let knocked = false;
    if (attacker.isPlayer && skills.derrubar.owned) {
      if (defender.state !== 'knockdown' && defender.state !== 'getting_up') {
        if (Math.random() <= 0.10) {
          knocked = true;
          defender.state = 'knockdown';
          defender.actionTimer = 60; // 60 frames = 1 segundo caído
          floatTexts.push({ x: defender.x, y: defender.y - (defender.h * defender.scale) - 25, text: "DERRUBADO!", life: 40 });
        }
      }
    }

    // Se não for derrubado nem estiver já deitado/levantando, reage ao hit
    if (!knocked && defender.state !== 'knockdown' && defender.state !== 'getting_up') {
      defender.state = 'hit';
      defender.actionTimer = 14;
    }

    return true;
  }

  function distanceBetween() { return Math.abs(player.x - ai.x); }

  function handlePlayer() {
    if (player.state === 'dead') return;
    player.animFrame++;

    if (player.state === 'hit' || player.state === 'attack_sword' || player.state === 'attack_kick' || player.state === 'attack_shuriken' || player.state === 'knockdown' || player.state === 'getting_up') return;

    player.crouching = false;
    let moving = false;

    if (!player.jumping) {
      if (keys['d'] || keys['arrowright']) { player.x += MOVE_SPEED; moving = true; }
      if (keys['a'] || keys['arrowleft']) { player.x -= MOVE_SPEED; moving = true; }
      if (keys['s'] || keys['arrowdown']) { player.crouching = true; moving = false; }
      if ((keys['w'] || keys['arrowup']) && !player.jumping) {
        player.vy = JUMP_VEL; player.jumping = true;
      }
    } else {
      if (keys['d'] || keys['arrowright']) { player.x += MOVE_SPEED * 0.7; }
      if (keys['a'] || keys['arrowleft']) { player.x -= MOVE_SPEED * 0.7; }
    }

    if (keys[' ']) startAction(player, 'sword');
    else if (keys['f']) startAction(player, 'kick');
    else if (keys['r'] && (weapons.shuriken.owned || equippedWeapon === 'shuriken')) startAction(player, 'shuriken');

    if (player.state !== 'attack_sword' && player.state !== 'attack_kick' && player.state !== 'attack_shuriken') {
      player.state = player.jumping ? 'jump' : (player.crouching ? 'crouch' : (moving ? 'walk' : 'idle'));
    }
  }

  function handleAI() {
    if (ai.state === 'dead') return;
    ai.animFrame++;

    const diff = DIFFICULTY_SETTINGS[difficulty];
    ai.facing = player.x < ai.x ? -1 : 1;
    player.facing = ai.x < player.x ? -1 : 1;

    if (ai.state === 'hit' || ai.state === 'attack_sword' || ai.state === 'attack_kick' || ai.state === 'attack_shuriken' || ai.state === 'knockdown' || ai.state === 'getting_up') return;

    ai.crouching = false;
    const dist = distanceBetween();

    ai.aiTimer--;
    if (ai.aiTimer <= 0) {
      const r = Math.random();
      const atk = diff.aiAttackChance;

      if (dist < ATTACK_RANGE_SWORD + 10) {
        if (r < atk * 0.55) ai.aiState = 'attack_sword';
        else if (r < atk) ai.aiState = 'attack_kick';
        else if (r < atk + 0.18) ai.aiState = 'retreat';
        else ai.aiState = 'crouch';
      } else {
        if (diff.canThrowShuriken && r < 0.25) {
          ai.aiState = 'shuriken';
        } else if (r < 0.75) ai.aiState = 'approach';
        else if (r < 0.88) ai.aiState = 'jump';
        else ai.aiState = 'crouch';
      }
      ai.aiTimer = diff.aiReactionMin + Math.random() * (diff.aiReactionMax - diff.aiReactionMin);
    }

    let moving = false;
    if (ai.aiState === 'approach' && !ai.jumping) {
      ai.x += ai.facing * MOVE_SPEED * 0.85 * diff.aiSpeedMult; moving = true;
    } else if (ai.aiState === 'retreat' && !ai.jumping) {
      ai.x -= ai.facing * MOVE_SPEED * 0.85 * diff.aiSpeedMult; moving = true;
    } else if (ai.aiState === 'jump' && !ai.jumping) {
      ai.vy = JUMP_VEL; ai.jumping = true;
    } else if (ai.aiState === 'crouch') {
      ai.crouching = true;
    } else if (ai.aiState === 'attack_sword' && dist < ATTACK_RANGE_SWORD + 16) {
      startAction(ai, 'sword');
    } else if (ai.aiState === 'attack_kick' && dist < ATTACK_RANGE_KICK + 16) {
      startAction(ai, 'kick');
    } else if (ai.aiState === 'shuriken') {
      startAction(ai, 'shuriken');
    }

    ai.x = Math.max(40, Math.min(W - 40, ai.x));

    if (ai.state !== 'attack_sword' && ai.state !== 'attack_kick' && ai.state !== 'attack_shuriken') {
      ai.state = ai.jumping ? 'jump' : (ai.crouching ? 'crouch' : (moving ? 'walk' : 'idle'));
    }
  }

  // ---------- IA DO DRAGÃO (BOSS) ----------
  // Ciclo: idle (espera) -> breathing (cospe algumas bolas de fogo, uma a uma) ->
  // tired (fica exausto, não ataca — janela boa para o jogador acertar golpes) -> idle de novo.
  function handleDragonAI() {
    if (ai.state === 'dead') return;
    ai.animFrame++;

    ai.facing = player.x < ai.x ? -1 : 1;
    player.facing = ai.x < player.x ? -1 : 1;

    if (ai.state === 'hit' || ai.state === 'knockdown' || ai.state === 'getting_up') return; // reagindo a um golpe, pausa a máquina de estados

    const diff = DIFFICULTY_SETTINGS.boss;
    ai.dragonTimer--;

    if (ai.dragonState === 'idle') {
      ai.state = 'idle';
      if (ai.dragonTimer <= 0) {
        ai.dragonState = 'breathing';
        ai.breathCount = 0;
        ai.breathTotal = 10 + Math.floor(Math.random() * 3); // 10 a 12 bolas de fogo
        ai.breathTimer = 22; // pequeno tempo de "carregar" antes da 1ª bola
      }
    } else if (ai.dragonState === 'breathing') {
      ai.state = 'attack_breath';
      ai.breathTimer--;
      if (ai.breathTimer <= 0) {
        spawnFireball(ai, diff.fireballDmgMin, diff.fireballDmgMax);
        ai.breathCount++;
        if (ai.breathCount >= ai.breathTotal) {
          ai.dragonState = 'tired';
          ai.dragonTimer = 200; // ~2s exausto e vulnerável
        } else {
          ai.breathTimer = 22; // intervalo entre bolas de fogo
        }
      }
    } else if (ai.dragonState === 'tired') {
      ai.state = 'tired';
      if (ai.dragonTimer <= 0) {
        ai.dragonState = 'idle';
        ai.dragonTimer = 90 + Math.floor(Math.random() * 50);
      }
    }

    // leve flutuação/deslocamento, mantendo o dragão numa área alcançável pelo jogador
    ai.x += Math.sin(ai.animFrame * 0.012) * 0.35;
    ai.x = Math.max(360, Math.min(W - 50, ai.x));
  }

  function physics(f) {
    if (f.jumping) {
      f.y += f.vy;
      f.vy += GRAVITY;
      if (f.y >= GROUND_Y) { f.y = GROUND_Y; f.vy = 0; f.jumping = false; }
    }
    f.x = Math.max(30, Math.min(W - 30, f.x));
  }

  function updateActionTimers(f, opponent) {
    if (f.state === 'attack_shuriken') {
      f.actionTimer--;
      if (f.actionTimer === 12 && !f.hitApplied) {
        const wShuriken = weapons.shuriken;
        spawnShuriken(f, wShuriken.dmgMin, wShuriken.dmgMax);
        f.hitApplied = true;
      }
      if (f.actionTimer <= 0) f.state = 'idle';
    } else if (f.state === 'attack_sword' || f.state === 'attack_kick') {
      f.actionTimer--;
      const isKick = f.state === 'attack_kick';
      const activeFrame = isKick ? f.actionTimer < 10 && f.actionTimer > 4 : f.actionTimer < 16 && f.actionTimer > 6;

      if (activeFrame && !f.hitApplied) {
        const dist = Math.abs(f.x - opponent.x);
        const range = isKick ? ATTACK_RANGE_KICK : ATTACK_RANGE_SWORD;
        const facingRight = f.x < opponent.x ? 1 : -1;

        if (dist < range && f.facing === facingRight) {
          let dmg;
          if (isKick) {
            dmg = 6 + Math.random() * 3;
          } else if (f.isPlayer) {
            const w = weapons[equippedWeapon];
            dmg = w.dmgMin + Math.random() * (w.dmgMax - w.dmgMin);
          } else if (f.weaponKey === 'katana') {
            const w = weapons.katana;
            dmg = w.dmgMin + Math.random() * (w.dmgMax - w.dmgMin);
          } else {
            dmg = 9 + Math.random() * 4;
          }

          if (!f.isPlayer) {
            dmg *= DIFFICULTY_SETTINGS[difficulty].aiDmgMult;
          }

          const attackType = isKick ? 'kick' : (f.isPlayer ? equippedWeapon : (f.weaponKey || 'padrao'));
          applyDamage(f, opponent, dmg, attackType);
          f.hitApplied = true;
        }
      }

      if (f.actionTimer <= 0) f.state = 'idle';
    } else if (f.state === 'hit') {
      f.actionTimer--;
      if (f.actionTimer <= 0) f.state = 'idle';
    } else if (f.state === 'knockdown') {
      f.actionTimer--;
      if (f.actionTimer <= 0) {
        f.state = 'getting_up';
        f.actionTimer = 25; // Animação de se levantar
      }
    } else if (f.state === 'getting_up') {
      f.actionTimer--;
      if (f.actionTimer <= 0) f.state = 'idle';
    }

    if (f.cooldown > 0) f.cooldown--;
    if (f.hitFlash > 0) f.hitFlash--; // Reduz brilho vermelho de dano independente do estado
  }

  function checkRoundEnd() {
    if (roundOver) return;
    if (player.hp <= 0) {
      player.hp = 0; player.state = 'dead'; endRound(false);
    } else if (ai.hp <= 0) {
      ai.hp = 0; ai.state = 'dead'; endRound(true);
    }
  }

  function endRound(playerWon) {
    roundOver = true;
    running = false;
    updateHUD();

    if (survivalMode) {
      setTimeout(() => {
        if (playerWon) {
          coins += SURVIVAL_COIN_PER_ROUND;
          updateCoinDisplays();

          if (survivalRound >= SURVIVAL_TOTAL_ROUNDS) {
            finishSurvival(true);
          } else {
            survivalRound++;
            difficulty = survivalDifficultyForRound(survivalRound);
            showRoundTransition('RODADA ' + survivalRound + ' — ' + DIFFICULTY_SETTINGS[difficulty].label.toUpperCase());
          }
        } else {
          finishSurvival(false);
        }
      }, 900);
      return;
    }

    if (playerWon) {
      registerDifficultyVictory(difficulty);
    }

    setTimeout(() => {
      resultText.textContent = playerWon ? 'VITÓRIA' : 'DERROTA';
      resultText.style.color = playerWon ? '#e6b84f' : '#ff5c5c';
      if (playerWon) {
        const reward = DIFFICULTY_SETTINGS[difficulty].coinReward;
        coins += reward;
        updateCoinDisplays();
        coinRewardEl.textContent = '+' + reward + ' moedas 🪙';
        coinRewardEl.classList.remove('hidden');
      } else {
        coinRewardEl.classList.add('hidden');
      }
      showScreen(gameoverScreen);
    }, 900);
  }

  // ---------- DESENHO DE CENÁRIO ----------
  // ---------- IMAGEM DE FUNDO ----------
  const bgImg = new Image();
  let bgLoaded = false;
  bgImg.onload = () => { bgLoaded = true; };
  bgImg.onerror = () => { bgLoaded = false; };
  bgImg.src = 'assets/bg.jpg';

  function drawBackground() {
    if (bgLoaded) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      let g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1b1330');
      g.addColorStop(1, '#3a1f4d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#f2e9c9';
      ctx.beginPath();
      ctx.arc(670, 90, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(10,5,20,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.lineTo(120, 220);
      ctx.lineTo(260, 300);
      ctx.lineTo(400, 200);
      ctx.lineTo(560, 290);
      ctx.lineTo(700, 210);
      ctx.lineTo(800, 280);
      ctx.lineTo(800, 360);
      ctx.lineTo(0, 360);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10);

    ctx.strokeStyle = 'rgba(230,184,79,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 10);
    ctx.lineTo(W, GROUND_Y + 10);
    ctx.stroke();
  }

  function drawWeapon(key, handX, handY, angle, isAttacking, accent, s) {
    ctx.save();
    if (key === 'nunchaku') {
      const segLen = 20 * s;
      const midX = handX + Math.cos(angle) * segLen;
      const midY = handY + Math.sin(angle) * segLen;
      const angle2 = angle + (isAttacking ? 0.9 : 0.5);
      const tipX = midX + Math.cos(angle2) * segLen;
      const tipY = midY + Math.sin(angle2) * segLen;

      ctx.strokeStyle = '#4a3220';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(midX, midY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(midX, midY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (key === 'faca') {
      const bladeLen = 24 * s;
      const tipX = handX + Math.cos(angle) * bladeLen;
      const tipY = handY + Math.sin(angle) * bladeLen;

      ctx.strokeStyle = '#4a3220';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(handX - Math.cos(angle) * 8 * s, handY - Math.sin(angle) * 8 * s);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      ctx.strokeStyle = '#dfe6ee';
      ctx.lineWidth = 3 * s;
      ctx.shadowColor = '#dfe6ee';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    } else if (key === 'katana') {
      const bladeLen = 52 * s;
      const tipX = handX + Math.cos(angle) * bladeLen;
      const tipY = handY + Math.sin(angle) * bladeLen;
      const curveX = handX + Math.cos(angle - 0.15) * bladeLen * 0.5;
      const curveY = handY + Math.sin(angle - 0.15) * bladeLen * 0.5;

      ctx.fillStyle = '#e6b84f';
      ctx.beginPath();
      ctx.arc(handX, handY, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(handX - Math.cos(angle) * 10 * s, handY - Math.sin(angle) * 10 * s);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      ctx.strokeStyle = '#eaf6ff';
      ctx.lineWidth = 3.2 * s;
      ctx.shadowColor = accent || '#9fd8ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.quadraticCurveTo(curveX, curveY, tipX, tipY);
      ctx.stroke();
    } else if (key === 'shuriken') {
      ctx.save();
      ctx.translate(handX, handY);
      ctx.fillStyle = '#e6b84f';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.lineTo(0, -7 * s);
        ctx.lineTo(2 * s, -2 * s);
      }
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = isAttacking ? 10 : 4;
      ctx.beginPath();
      ctx.arc(handX, handY, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(handX, handY, 9 * s, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- DESENHO DO DRAGÃO (CHEFE) ----------
  // Fica parado no lugar, cospe algumas bolas de fogo e depois fica exausto (vulnerável).
  function drawDragon(f) {
    ctx.save();
    const s = f.scale || 1;
    const t = f.animFrame * 0.045;
    const breathing = f.state === 'attack_breath';
    const tired = f.state === 'tired';
    const hit = f.hitFlash > 0 || f.state === 'hit';

    // Sombra no chão
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(f.x, GROUND_Y + 13, 58 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.translate(f.x, f.y - (tired ? -2 * s : 0));
    ctx.scale(f.facing, 1);

    if (f.state === 'dead') {
      ctx.rotate(-0.25);
      ctx.translate(10 * s, 18 * s);
    }

    const dark = hit ? '#3a0a0a' : '#090710';
    const mid = hit ? '#5a1212' : '#171021';
    const light = hit ? '#ff7777' : '#6d4f95';
    const belly = hit ? '#8b3b3b' : '#c9b4dd';
    const sway = Math.sin(t) * 5 * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Corpo serpentino e cauda enrolada, sem asas: silhueta de dragão chinês.
    ctx.strokeStyle = dark;
    ctx.lineWidth = 24 * s;
    ctx.beginPath();
    ctx.moveTo(-8 * s, -86 * s);
    ctx.bezierCurveTo(-32 * s, -52 * s, -68 * s, -50 * s, -70 * s, -8 * s);
    ctx.bezierCurveTo(-72 * s, 38 * s, -24 * s, 38 * s, -30 * s, 8 * s);
    ctx.bezierCurveTo(-34 * s, -13 * s, -80 * s, -18 * s, -94 * s, 16 * s);
    ctx.bezierCurveTo(-105 * s, 42 * s, -72 * s, 58 * s, -50 * s, 47 * s);
    ctx.stroke();

    // Pescoço serpentino levantado.
    ctx.lineWidth = 29 * s;
    ctx.beginPath();
    ctx.moveTo(-2 * s, -68 * s);
    ctx.bezierCurveTo(-10 * s, -104 * s, -1 * s, -140 * s, 22 * s, -156 * s);
    ctx.bezierCurveTo(42 * s, -170 * s, 55 * s, -171 * s, 70 * s, -165 * s);
    ctx.stroke();

    // Barriga clara segmentada.
    ctx.strokeStyle = belly;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(0, -72 * s);
    ctx.bezierCurveTo(-8 * s, -104 * s, 1 * s, -136 * s, 26 * s, -151 * s);
    ctx.bezierCurveTo(42 * s, -161 * s, 54 * s, -165 * s, 66 * s, -161 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (let i = 0; i < 9; i++) {
      const q = i / 8;
      const x = (8 + q * 54) * s;
      const y = (-90 - q * 72) * s;
      ctx.strokeStyle = light;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(x - 5 * s, y); ctx.lineTo(x + 5 * s, y); ctx.stroke();
    }

    // Cristas dorsais.
    ctx.fillStyle = mid;
    for (let i = 0; i < 8; i++) {
      const x = (-6 + i * 8) * s;
      const y = (-84 - i * 9) * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 4 * s);
      ctx.lineTo(x + 6 * s, y - 13 * s - Math.sin(t + i) * 2 * s);
      ctx.lineTo(x + 10 * s, y - 3 * s);
      ctx.closePath(); ctx.fill();
    }

    // Pernas e garras.
    const legLift = tired ? 3 * s : Math.sin(t * 1.7) * 2 * s;
    [[-2, -42, -15], [10, -52, 18]].forEach(([x, y, foot]) => {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 9 * s;
      ctx.beginPath(); ctx.moveTo(x * s, y * s); ctx.lineTo((x + foot * 0.45) * s, (y + 15 + legLift) * s); ctx.stroke();
      ctx.lineWidth = 2 * s;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo((x + foot * 0.45) * s, (y + 15 + legLift) * s);
        ctx.lineTo((x + foot * 0.45 + foot * 0.25 + k * 2) * s, (y + 18 + legLift) * s);
        ctx.stroke();
      }
    });

    // Cabeça alongada.
    const hx = 70 * s;
    const hy = -166 * s + (tired ? 9 * s : 0) + sway * 0.3;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(hx, hy, 31 * s, 21 * s, -0.08, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = light; ctx.lineWidth = 2 * s; ctx.stroke();

    // Focinho e mandíbula.
    const jaw = breathing ? 15 * s : 6 * s;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(hx + 18 * s, hy - 4 * s);
    ctx.quadraticCurveTo(hx + 48 * s, hy - 1 * s, hx + 52 * s, hy + 7 * s);
    ctx.quadraticCurveTo(hx + 37 * s, hy + jaw + 10 * s, hx + 12 * s, hy + 7 * s);
    ctx.closePath(); ctx.fill();

    // Chifres ramificados.
    ctx.strokeStyle = light; ctx.lineWidth = 3 * s;
    const horns = [
      [hx - 9, hy - 15, hx - 16, hy - 34, hx - 4, hy - 42],
      [hx - 4, hy - 15, hx + 1, hy - 31, hx + 14, hy - 38],
      [hx + 4, hy - 15, hx + 17, hy - 26, hx + 28, hy - 28]
    ];
    horns.forEach(a => {
      ctx.beginPath(); ctx.moveTo(a[0] * s, a[1] * s);
      ctx.quadraticCurveTo(a[2] * s, a[3] * s, a[4] * s, a[5] * s); ctx.stroke();
    });

    // Bigodes longos característicos do dragão chinês.
    ctx.lineWidth = 1.8 * s; ctx.strokeStyle = light;
    ctx.beginPath(); ctx.moveTo(hx + 38 * s, hy + 5 * s); ctx.bezierCurveTo(hx + 65 * s, hy + 2 * s, hx + 75 * s, hy - 13 * s, hx + 92 * s, hy - 16 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 38 * s, hy + 9 * s); ctx.bezierCurveTo(hx + 61 * s, hy + 17 * s, hx + 68 * s, hy + 32 * s, hx + 86 * s, hy + 33 * s); ctx.stroke();

    // Barba/pelos.
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(hx + 20 * s, hy + 12 * s); ctx.lineTo(hx + 8 * s, hy + 35 * s); ctx.lineTo(hx + 19 * s, hy + 27 * s);
    ctx.lineTo(hx + 23 * s, hy + 42 * s); ctx.lineTo(hx + 30 * s, hy + 20 * s); ctx.closePath(); ctx.fill();

    // Olho.
    ctx.fillStyle = hit ? '#ffb3b3' : '#ffb52e'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.arc(hx + 14 * s, hy - 5 * s, 3.2 * s, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    // Fogo carregando na boca durante o ataque.
    if (breathing) {
      const gx = hx + 51 * s, gy = hy + 7 * s;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 20 * s);
      grad.addColorStop(0, '#fff6cc'); grad.addColorStop(0.35, '#ffcf40'); grad.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(gx, gy, 20 * s, 0, Math.PI * 2); ctx.fill();
    }

    if (tired) {
      ctx.save(); ctx.globalAlpha = .5; ctx.fillStyle = '#a895bd';
      for (let i = 0; i < 3; i++) { const sx = hx + 18 * s + i * 7 * s, sy = hy - 24 * s - Math.sin(t + i) * 4 * s; ctx.beginPath(); ctx.arc(sx, sy, 4 * s, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }

    ctx.restore();

    if (tired) {
      ctx.save(); ctx.globalAlpha = .9 + Math.sin(f.animFrame * .18) * .1;
      ctx.font = "bold 13px 'Trebuchet MS', sans-serif"; ctx.textAlign = 'center';
      ctx.fillStyle = '#9fffb0'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 6;
      ctx.fillText('VULNERÁVEL', f.x, f.y - 230 * s); ctx.restore();
    }
  }

  // Desenha e anima o sprite do samurai (usado pelo personagem-sombra principal).
  // Segue a mesma convenção do boneco-sombra procedural: local +x = direção da frente.
  function drawFighter(f) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    const s = f.scale || 1;
    const groundOffset = GROUND_Y - f.y;
    const baseY = f.y - groundOffset;
    const crouchOffset = f.crouching ? 22 * s : 0;

    ctx.save();
    ctx.globalAlpha = Math.max(0.1, 0.4 - groundOffset * 0.002);
    ctx.fillStyle = '#000';
    const shadowWidth = Math.max(10 * s, 26 * s - groundOffset * 0.12);
    ctx.beginPath();
    ctx.ellipse(f.x, GROUND_Y + 12, shadowWidth, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const cx = f.x;
    const feetY = baseY - groundOffset;

    const bodyH = f.h * s - crouchOffset;
    const headR = 11 * s;

    const t = f.animFrame * 0.15;
    let breathY = 0;
    let walkCycle = 0;

    if (f.state === 'idle') {
      breathY = Math.sin(t) * 2 * s;
    } else if (f.state === 'walk') {
      walkCycle = Math.sin(f.animFrame * 0.25);
      breathY = Math.abs(Math.sin(f.animFrame * 0.25)) * -3 * s;
    }

    const hipY = feetY - bodyH * 0.42 + breathY * 0.3;
    const headY = feetY - bodyH + headR + breathY;

    // Configurando sistema de coordenadas nos pés
    ctx.translate(cx, feetY);
    ctx.scale(f.facing, 1);

    // HABILIDADE DERRUBAR: Lógica de rotação deitando no chão
    let rotAngle = 0;
    let dropY = 0;
    if (f.state === 'knockdown' || f.state === 'dead') {
      rotAngle = -Math.PI / 2.2;
      dropY = 12 * s; // afunda levemente no chao
    } else if (f.state === 'getting_up') {
      const prog = f.actionTimer / 25; // 1 a 0
      rotAngle = (-Math.PI / 2.2) * prog;
      dropY = 12 * s * prog;
    }
    ctx.translate(0, dropY);
    ctx.rotate(rotAngle);
    ctx.translate(0, -feetY); // Volta para origem para desenhar os membros normalmente

    let lean = 0;
    if (f.state === 'attack_sword') lean = 0.18;
    if (f.state === 'attack_shuriken') lean = -0.1;
    if (f.state === 'attack_kick') lean = 0.05;
    if (f.state === 'hit') lean = -0.2;
    if (f.state === 'walk') lean = 0.05;

    let isHitVisual = f.hitFlash > 0 || f.state === 'hit';
    ctx.strokeStyle = isHitVisual ? '#ff8080' : '#050308';
    ctx.fillStyle = isHitVisual ? '#2a0808' : '#050308';
    ctx.lineWidth = 10 * s;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-4 * s, hipY);
    if (f.state === 'walk') {
      ctx.lineTo(-4 * s - walkCycle * 14 * s, feetY);
    } else if (f.state === 'jump') {
      ctx.lineTo(-12 * s, feetY - 12 * s);
    } else {
      ctx.lineTo(-10 * s, feetY);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4 * s, hipY);
    if (f.state === 'attack_kick' && f.actionTimer < 12 && f.actionTimer > 2) {
      ctx.lineTo(36 * s, hipY + 2 * s);
    } else if (f.state === 'walk') {
      ctx.lineTo(4 * s + walkCycle * 14 * s, feetY);
    } else if (f.state === 'jump') {
      ctx.lineTo(12 * s, feetY - 8 * s);
    } else {
      ctx.lineTo(10 * s, feetY);
    }
    ctx.stroke();

    const shoulderY = hipY - bodyH * 0.42 + breathY * 0.5;

    if (f.isSamurai) {
      // ROBE: silhueta de veste (ao invés da linha fina de tronco), com leve brilho de contorno
      const hipL = -9 * s, hipR = 9 * s;
      const flareL = -14 * s, flareR = 14 * s;
      const shL = lean * 20 * s - 8 * s, shR = lean * 20 * s + 8 * s;
      ctx.save();
      ctx.shadowColor = f.accent;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(flareL, hipY + 12 * s);
      ctx.lineTo(hipL, hipY);
      ctx.lineTo(shL, shoulderY);
      ctx.lineTo(shR, shoulderY);
      ctx.lineTo(hipR, hipY);
      ctx.lineTo(flareR, hipY + 12 * s);
      ctx.quadraticCurveTo(0, hipY + 6 * s, flareL, hipY + 12 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // obi (faixa da cintura)
      ctx.save();
      ctx.strokeStyle = f.accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(hipL, hipY);
      ctx.lineTo(hipR, hipY);
      ctx.stroke();
      ctx.restore();

      // katana envainada na cintura, visível quando não está sendo empunhada
      if (f.state !== 'attack_sword' && f.state !== 'knockdown' && f.state !== 'getting_up' && f.state !== 'dead') {
        ctx.save();
        const sheathAngle = -0.55;
        const sheathBaseX = -hipL * 0.2, sheathBaseY = hipY + 2 * s;
        const sheathTipX = sheathBaseX + Math.cos(sheathAngle) * 34 * s;
        const sheathTipY = sheathBaseY + Math.sin(sheathAngle) * 34 * s;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 4.5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sheathBaseX - Math.cos(sheathAngle) * 10 * s, sheathBaseY - Math.sin(sheathAngle) * 10 * s);
        ctx.lineTo(sheathTipX, sheathTipY);
        ctx.stroke();
        ctx.strokeStyle = f.accent;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(sheathBaseX - Math.cos(sheathAngle) * 10 * s, sheathBaseY - Math.sin(sheathAngle) * 10 * s);
        ctx.lineTo(sheathTipX, sheathTipY);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(lean * 20 * s, shoulderY);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(lean * 20 * s, shoulderY);
    let backArmX = -14 * s;
    let backArmY = shoulderY + 18 * s;
    if (f.state === 'walk') {
      backArmX += walkCycle * 10 * s;
    } else if (f.state === 'jump') {
      backArmY -= 8 * s;
    }
    ctx.lineTo(backArmX, backArmY);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    let armX = 14 * s, armY = shoulderY + 16 * s;
    if (f.state === 'attack_sword') {
      const at = f.actionTimer;
      if (at > 16) { armX = 6 * s; armY = shoulderY - 16 * s; }
      else if (at > 6) { armX = 32 * s; armY = shoulderY + 8 * s; }
      else { armX = 14 * s; armY = shoulderY + 18 * s; }
    } else if (f.state === 'attack_shuriken') {
      const at = f.actionTimer;
      if (at > 14) { armX = -12 * s; armY = shoulderY - 10 * s; }
      else if (at > 6) { armX = 34 * s; armY = shoulderY - 4 * s; }
      else { armX = 14 * s; armY = shoulderY + 18 * s; }
    } else if (f.state === 'walk') {
      armX -= walkCycle * 10 * s;
    } else if (f.state === 'idle') {
      armY += Math.sin(t) * 2 * s;
    } else if (f.state === 'jump') {
      armY -= 12 * s;
      armX += 6 * s;
    }
    ctx.moveTo(lean * 20 * s, shoulderY);
    ctx.lineTo(armX, armY);
    ctx.stroke();
    ctx.restore();

    let weaponAngle = -0.9;
    if (f.state === 'attack_sword') {
      const at = f.actionTimer;
      if (at > 16) weaponAngle = -2.2;
      else if (at > 6) weaponAngle = 0.6;
      else weaponAngle = 1.4;
    } else if (f.state === 'walk') {
      weaponAngle = -0.9 + walkCycle * 0.2;
    }

    const weaponKey = f.isPlayer ? equippedWeapon : (f.isSamurai ? 'katana' : f.weaponKey);
    drawWeapon(weaponKey, armX, armY, weaponAngle, f.state === 'attack_sword', f.accent, s);

    ctx.beginPath();
    ctx.fillStyle = isHitVisual ? '#2a0808' : '#050308';
    ctx.arc(lean * 22 * s, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    if (f.isSamurai) {
      // CHAPÉU (kasa) cobrindo o topo da cabeça, com leve brilho de contorno
      const hcx = lean * 22 * s;
      ctx.save();
      ctx.shadowColor = f.accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(hcx - 18 * s, headY - 2 * s);
      ctx.lineTo(hcx, headY - 18 * s);
      ctx.lineTo(hcx + 18 * s, headY - 2 * s);
      ctx.quadraticCurveTo(hcx, headY + 4 * s, hcx - 18 * s, headY - 2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const eyeX = f.isSamurai ? lean * 22 * s + 3 * s : lean * 22 * s + 5 * s;
    const eyeY = f.isSamurai ? headY + 4 * s : headY - 1;
    ctx.fillStyle = f.accent;
    ctx.shadowColor = f.accent;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawEntity(f) {
    if (f.isDragon) drawDragon(f); else drawFighter(f);
  }

  function draw() {
    drawBackground();
    drawEntity(player.x < ai.x ? player : ai);
    drawEntity(player.x < ai.x ? ai : player);
    drawProjectiles();
    drawParticles();
  }

  const FIXED_DT = 1000 / 60; // a lógica do jogo sempre roda a 60 atualizações por segundo
  let lastFrameTime = 0;
  let accumulator = 0;

  function loop(timestamp) {
    if (!running || paused) return;
    if (!lastFrameTime) lastFrameTime = timestamp || performance.now();
    let delta = (timestamp || performance.now()) - lastFrameTime;
    lastFrameTime = timestamp || performance.now();
    if (delta > 250) delta = 250; // evita saltos grandes ao voltar de uma aba em segundo plano
    accumulator += delta;

    let steps = 0;
    while (accumulator >= FIXED_DT && steps < 5) {
      handlePlayer();
      if (ai.isDragon) handleDragonAI(); else handleAI();
      physics(player);
      physics(ai);
      updateActionTimers(player, ai);
      updateActionTimers(ai, player);
      updateProjectiles(ai);
      updateProjectiles(player);
      updateParticles();
      checkRoundEnd();
      accumulator -= FIXED_DT;
      steps++;
      if (!running) break; // o round terminou no meio da atualização
    }

    updateHUD();
    draw();
    if (running) requestAnimationFrame(loop);
  }

  // ---------- CUTSCENE DO BOSS ----------
  const BOSS_CUTSCENE = [
    { title: 'O TEMPLO', speaker: 'narrador', text: 'O caminho termina diante de um templo antigo. O silêncio é quebrado por um rugido vindo das sombras.' },
    { title: 'O GUARDIÃO', speaker: 'dragon', text: 'DRAGÃO: Então... finalmente você chegou.' },
    { title: 'DESAFIO', speaker: 'samurai', text: 'SAMURAI: Você estava me esperando?\n\nDRAGÃO: Eu sabia que você viria.' },
    { title: 'AVISO', speaker: 'dragon', text: 'DRAGÃO: Você entra no meu domínio, aponta sua espada para mim e ainda dá ordens?' },
    { title: 'RESPOSTA', speaker: 'samurai', text: 'SAMURAI: Não vim aqui para conversar.\n\nDRAGÃO: Então venha. Mostre-me do que as sombras são capazes.' },
    { title: 'O RUGIDO', speaker: 'dragon', text: 'O dragão ergue a cabeça. Seus bigodes se agitam e o ar começa a esquentar.' },
    { title: 'BATALHA', speaker: 'dragon', text: 'DRAGÃO: Prepare-se, guerreiro. Esta será sua última lição.' }
  ];
  let cutsceneIndex = 0;

  function showBossCutscene() {
    cutsceneIndex = 0;
    hud.style.display = 'none';
    pauseOverlayEl.classList.add('hidden');
    bossCutsceneEl.classList.remove('hidden');
    renderBossCutscene();
  }

  function renderBossCutscene() {
    const scene = BOSS_CUTSCENE[cutsceneIndex];
    cutsceneTitleEl.textContent = scene.title;
    cutsceneTextEl.textContent = scene.text;
    cutsceneProgressEl.textContent = (cutsceneIndex + 1) + ' / ' + BOSS_CUTSCENE.length;
    const speakerNames = { samurai: 'SAMURAI', dragon: 'DRAGÃO', narrador: 'CENA' };
    cutsceneSpeakerEl.textContent = speakerNames[scene.speaker] || '';
    cutsceneSpeakerEl.className = 'cutscene-speaker speaker-' + scene.speaker;
    portraitSamuraiEl.classList.toggle('speaking', scene.speaker === 'samurai');
    portraitDragonEl.classList.toggle('speaking', scene.speaker === 'dragon');
    document.getElementById('cutsceneNextBtn').textContent = cutsceneIndex === BOSS_CUTSCENE.length - 1 ? 'Começar luta' : 'Continuar';
  }

  function finishBossCutscene() {
    bossCutsceneEl.classList.add('hidden');
    hud.style.display = 'flex';
    running = true;
    paused = false;
    lastFrameTime = 0;
    accumulator = 0;
    requestAnimationFrame(loop);
  }

  document.getElementById('cutsceneNextBtn').addEventListener('click', () => {
    if (cutsceneIndex < BOSS_CUTSCENE.length - 1) { cutsceneIndex++; renderBossCutscene(); }
    else finishBossCutscene();
  });

  function startGame() {
    if (difficulty === 'boss' && !isBossUnlocked()) {
      difficulty = 'medio';
      currentDiffLabelEl.textContent = DIFFICULTY_SETTINGS[difficulty].label;
      renderDifficultyMenu();
      showScreen(menuScreen);
      return;
    }

    resetFight();
    ALL_SCREENS.forEach(s => s.classList.add('hidden'));
    hidePause();

    if (survivalMode) {
      survivalRoundNumEl.textContent = survivalRound;
      survivalBadgeEl.classList.remove('hidden');
    } else {
      survivalBadgeEl.classList.add('hidden');
    }

    running = false;
    if (!survivalMode && difficulty === 'boss') {
      showBossCutscene();
      return;
    }

    hud.style.display = 'flex';
    running = true;
    lastFrameTime = 0;
    accumulator = 0;
    requestAnimationFrame(loop);
  }

  function startSurvival() {
    savedDifficulty = difficulty;
    survivalMode = true;
    lastRunWasSurvival = true;
    survivalRound = 1;
    difficulty = survivalDifficultyForRound(survivalRound);
    startGame();
  }

  // Transição rápida entre rounds da sobrevivência (sem passar pela tela de vitória/derrota)
  function showRoundTransition(text) {
    roundMsg.textContent = text;
    roundMsg.classList.remove('hidden');
    setTimeout(() => {
      roundMsg.classList.add('hidden');
      resetFight();
      survivalRoundNumEl.textContent = survivalRound;
      running = true;
      lastFrameTime = 0;
      accumulator = 0;
      requestAnimationFrame(loop);
    }, 1300);
  }

  function finishSurvival(won) {
    const roundsCleared = won ? SURVIVAL_TOTAL_ROUNDS : (survivalRound - 1);
    const totalEarnedThisRun = roundsCleared * SURVIVAL_COIN_PER_ROUND;

    survivalMode = false;
    difficulty = savedDifficulty;
    currentDiffLabelEl.textContent = DIFFICULTY_SETTINGS[difficulty].label;
    survivalBadgeEl.classList.add('hidden');

    if (won) {
      resultText.textContent = 'SOBREVIVÊNCIA CONCLUÍDA!';
      resultText.style.color = '#e6b84f';
      coinRewardEl.textContent = '+' + totalEarnedThisRun + ' moedas 🪙 (10 rodadas)';
      coinRewardEl.classList.remove('hidden');
    } else {
      resultText.textContent = 'DERROTA — RODADA ' + survivalRound;
      resultText.style.color = '#ff5c5c';
      if (totalEarnedThisRun > 0) {
        coinRewardEl.textContent = 'Ganhou 🪙 ' + totalEarnedThisRun + ' antes de cair';
        coinRewardEl.classList.remove('hidden');
      } else {
        coinRewardEl.classList.add('hidden');
      }
    }

    showScreen(gameoverScreen);
  }

  document.getElementById('playBtn').addEventListener('click', () => { lastRunWasSurvival = false; startGame(); });
  document.getElementById('survivalBtn').addEventListener('click', startSurvival);
  document.getElementById('restartBtn').addEventListener('click', () => {
    if (lastRunWasSurvival) { startSurvival(); } else { startGame(); }
  });
  document.getElementById('menuBtn').addEventListener('click', goToMainMenu);

  resetFight();
  renderDifficultyMenu();
  draw();
})();
