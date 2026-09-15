const SKILLS = [
  { id: 'three_pt', name: '3-Point Shooting', icon: '🎯' },
  { id: 'finishing', name: 'Finishing & Dunks', icon: '💥' },
  { id: 'mid_range', name: 'Mid-Range & Post Scoring', icon: '🗡️' },
  { id: 'playmaking', name: 'Playmaking & Vision', icon: '🪄' },
  { id: 'perimeter_def', name: 'Perimeter Lockdown', icon: '🔒' },
  { id: 'interior_def', name: 'Rim Protection & Rebounding', icon: '🛡️' },
  { id: 'athleticism', name: 'Speed, Burst & Vertical', icon: '⚡' },
  { id: 'iq_clutch', name: 'Basketball IQ & Clutch', icon: '🧠' }
];

let database = { teams: [], eras: [], players: {} };
let slotsState = {};
let usedPlayers = new Set();
let currentSpin = { teamCode: null, eraStr: null };
let mustPick = false;
let rerolls = { team: 1, era: 1 };

// Load the JSON database on startup
async function init() {
  try {
    const res = await fetch('./data/rosters.json');
    database = await res.json();
  } catch (err) {
    console.error("Failed to load rosters.json:", err);
  }
  renderSlots();
}

// Modal dismissal listeners
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('assignModal').addEventListener('click', (e) => {
  if (e.target.id === 'assignModal') closeModal();
});

// Spin mechanics
function triggerMainSpin() {
  if (mustPick) {
    alert("You must choose a player for an open attribute before spinning again!");
    return;
  }
  if (Object.keys(slotsState).length >= 8) return;

  const teamEl = document.getElementById('teamDisplay');
  const eraEl = document.getElementById('eraDisplay');
  const spinBtn = document.getElementById('spinBtn');

  spinBtn.disabled = true;
  teamEl.classList.add('rolling');
  eraEl.classList.add('rolling');

  let rollCount = 0;
  const interval = setInterval(() => {
    const rTeam = database.teams[Math.floor(Math.random() * database.teams.length)];
    const rEra = database.eras[Math.floor(Math.random() * database.eras.length)];
    teamEl.innerText = rTeam.code;
    eraEl.innerText = rEra;
    rollCount++;

    if (rollCount > 10) {
      clearInterval(interval);
      teamEl.classList.remove('rolling');
      eraEl.classList.remove('rolling');

      const validKeys = Object.keys(database.players);
      const pickedKey = validKeys[Math.floor(Math.random() * validKeys.length)];
      const [team, era] = pickedKey.split('_');

      currentSpin = { teamCode: team, eraStr: era };
      teamEl.innerText = team;
      eraEl.innerText = era;

      mustPick = true;
      spinBtn.classList.add('opacity-40', 'cursor-not-allowed');
      document.getElementById('spinNotice').innerText = "Pick locked! Select a player below to fill an attribute.";
      document.getElementById('spinNotice').className = "text-[11px] text-center text-orange-400 mt-2.5 font-bold animate-pulse";

      loadRoster();
    }
  }, 70);
}

// Lifeline Rerolls
function useReroll(type) {
  if (!mustPick) {
    alert("Spin the reel first before using a reroll!");
    return;
  }
  if (rerolls[type] <= 0) return;

  rerolls[type]--;
  const btn = document.getElementById(type === 'team' ? 'rerollTeamBtn' : 'rerollEraBtn');
  btn.disabled = true;
  btn.innerText = `🔄 ${type.toUpperCase()} (0)`;

  if (type === 'team') {
    const otherTeams = database.teams.filter(t => t.code !== currentSpin.teamCode && database.players[`${t.code}_${currentSpin.eraStr}`]);
    const pool = otherTeams.length > 0 ? otherTeams : database.teams.filter(t => t.code !== currentSpin.teamCode);
    const newTeam = pool[Math.floor(Math.random() * pool.length)].code;
    currentSpin.teamCode = newTeam;
    document.getElementById('teamDisplay').innerText = newTeam;
  } else {
    const otherEras = database.eras.filter(e => e !== currentSpin.eraStr);
    const newEra = otherEras[Math.floor(Math.random() * otherEras.length)];
    currentSpin.eraStr = newEra;
    document.getElementById('eraDisplay').innerText = newEra;
  }

  loadRoster();
}

// Load Roster
function loadRoster() {
  const container = document.getElementById('rosterContainer');
  const countEl = document.getElementById('playerCount');
  container.innerHTML = '';

  const key = `${currentSpin.teamCode}_${currentSpin.eraStr}`;
  const players = database.players[key] || [];

  countEl.innerText = `(${players.length})`;

  if (players.length === 0) {
    container.innerHTML = `<div class="py-12 text-center text-slate-500 text-xs">No roster data found for ${currentSpin.teamCode} (${currentSpin.eraStr}).</div>`;
    return;
  }

  players.forEach(p => {
    const isBurned = usedPlayers.has(p.name);
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border transition flex items-center justify-between ${
      isBurned 
        ? 'opacity-30 bg-slate-950/40 border-slate-900 cursor-not-allowed'
        : 'bg-slate-950/80 border-slate-800/80 hover:border-orange-500/50 cursor-pointer'
    }`;

    card.innerHTML = `
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-white">${p.name}</span>
          <span class="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">${p.pos}</span>
        </div>
        <div class="text-[10px] text-slate-500 mt-0.5">${currentSpin.teamCode} • ${currentSpin.eraStr} ${isBurned ? '• (Used)' : ''}</div>
      </div>
      <button ${isBurned ? 'disabled' : ''} class="text-xs px-3 py-1.5 rounded-lg ${isBurned ? 'bg-slate-900 text-slate-600' : 'bg-slate-800 hover:bg-orange-500 hover:text-white text-slate-300'} font-semibold transition">
        ${isBurned ? 'Locked' : 'Draft'}
      </button>
    `;

    if (!isBurned) {
      card.onclick = () => openAssignModal(p);
    }
    container.appendChild(card);
  });
}

// Search Filter
function filterRoster() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rows = document.getElementById('rosterContainer').children;
  Array.from(rows).forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
  });
}

// Assign Modal Logic
function openAssignModal(player) {
  document.getElementById('modalPlayerName').innerText = player.name;
  document.getElementById('modalPlayerSub').innerText = `${player.pos} • ${currentSpin.teamCode} (${currentSpin.eraStr})`;
  const choices = document.getElementById('modalSkillChoices');
  choices.innerHTML = '';

  SKILLS.forEach(s => {
    const isFilled = !!slotsState[s.id];
    const val = player.ratings[s.id] || 50;

    const row = document.createElement('button');
    row.disabled = isFilled;
    row.className = `p-3 rounded-xl border flex items-center justify-between text-left transition ${
      isFilled 
        ? 'opacity-30 bg-slate-950 border-slate-900 cursor-not-allowed'
        : 'bg-slate-950 border-slate-800 hover:border-orange-500 hover:bg-slate-900/60'
    }`;

    row.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-lg">${s.icon}</span>
        <div>
          <div class="text-xs font-bold text-white">${s.name}</div>
          <div class="text-[10px] text-slate-500">${isFilled ? 'Slot Filled' : 'Available Slot'}</div>
        </div>
      </div>
      <div class="text-base font-black ${isFilled ? 'text-slate-600' : getRatingColor(val)}">
        ${val}
      </div>
    `;

    if (!isFilled) {
      row.onclick = () => confirmAssignment(s.id, player, val);
    }
    choices.appendChild(row);
  });

  document.getElementById('assignModal').classList.remove('hidden');
  document.getElementById('assignModal').classList.add('flex');
}

function closeModal() {
  document.getElementById('assignModal').classList.add('hidden');
  document.getElementById('assignModal').classList.remove('flex');
}

function confirmAssignment(skillId, player, rating) {
  slotsState[skillId] = {
    player: player.name,
    rating: rating,
    team: currentSpin.teamCode,
    era: currentSpin.eraStr
  };
  usedPlayers.add(player.name);

  closeModal();
  mustPick = false;

  const spinBtn = document.getElementById('spinBtn');
  spinBtn.disabled = false;
  spinBtn.classList.remove('opacity-40', 'cursor-not-allowed');
  document.getElementById('spinNotice').innerText = "Slot locked! Spin for your next skill.";
  document.getElementById('spinNotice').className = "text-[11px] text-center text-slate-400 mt-2.5 italic";

  document.getElementById('rosterContainer').innerHTML = `
    <div class="py-16 text-center text-slate-500 text-xs italic">
      Skill assigned! Roll again to reveal your next draft pool.
    </div>
  `;
  document.getElementById('playerCount').innerText = "(0)";

  renderSlots();
}

// Render Slots & Score
function renderSlots() {
  const grid = document.getElementById('skillSlotsGrid');
  grid.innerHTML = '';

  SKILLS.forEach(s => {
    const slot = slotsState[s.id];
    const card = document.createElement('div');
    card.className = "p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between " +
      (slot ? "bg-slate-950/80 border-slate-700 shadow-inner" : "bg-slate-950/20 border-dashed border-slate-800");

    if (slot) {
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-xl">${s.icon}</span>
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase leading-none">${s.name}</div>
            <div class="text-sm font-black text-white mt-1">${slot.player}</div>
            <div class="text-[10px] text-slate-500">${slot.team} • ${slot.era}</div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xl font-black ${getRatingColor(slot.rating)}">${slot.rating}</span>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-xl opacity-30">${s.icon}</span>
          <div>
            <div class="text-xs font-bold text-slate-500 uppercase">${s.name}</div>
            <div class="text-xs text-slate-600 italic mt-0.5">Open Slot</div>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-xs font-bold">+</div>
      `;
    }
    grid.appendChild(card);
  });

  calculateOverall();
}

function getRatingColor(val) {
  if (val >= 95) return 'text-amber-400 font-extrabold';
  if (val >= 90) return 'text-orange-400';
  if (val >= 80) return 'text-blue-400';
  if (val >= 70) return 'text-emerald-400';
  return 'text-rose-400';
}

// Calculate Overall Score
function calculateOverall() {
  const keys = Object.keys(slotsState);
  const count = keys.length;
  document.getElementById('slotsFilledCount').innerText = `${count} of 8 skills drafted`;

  if (count === 0) {
    document.getElementById('overallScore').innerText = "--";
    document.getElementById('archetypeTitle').innerText = "Prospect";
    return;
  }

  let sum = 0;
  let minVal = 100;
  keys.forEach(k => {
    const val = slotsState[k].rating;
    sum += val;
    if (val < minVal) minVal = val;
  });

  const rawAvg = sum / count;
  let finalOVR = Math.round(rawAvg);

  if (count === 8) {
    if (rawAvg >= 98.5 && minVal >= 96) {
      finalOVR = 99;
    } else if (finalOVR === 99) {
      finalOVR = 98;
    }
  }

  document.getElementById('overallScore').innerText = finalOVR;
  updateArchetypeTitle();

  let tier = "Prospect";
  let tierStyles = "text-slate-400 border-slate-700 bg-slate-950";

  if (finalOVR === 99) {
    tier = "GOAT";
    tierStyles = "text-amber-400 border-amber-500 bg-amber-950/40 shadow-amber-500/20";
  } else if (finalOVR >= 95) {
    tier = "Demigod";
    tierStyles = "text-orange-400 border-orange-500 bg-orange-950/30";
  } else if (finalOVR >= 90) {
    tier = "All-NBA";
    tierStyles = "text-purple-400 border-purple-500 bg-purple-950/30";
  } else if (finalOVR >= 84) {
    tier = "All-Star";
    tierStyles = "text-blue-400 border-blue-500 bg-blue-950/30";
  } else if (finalOVR >= 76) {
    tier = "Role Player";
    tierStyles = "text-emerald-400 border-emerald-500 bg-emerald-950/30";
  } else if (finalOVR >= 70) {
    tier = "Benchwarmer";
    tierStyles = "text-slate-300 border-slate-600 bg-slate-900";
  } else if (finalOVR >= 60) {
    tier = "10-Day Contract";
    tierStyles = "text-yellow-400 border-yellow-600 bg-yellow-950/20";
  } else if (finalOVR >= 50) {
    tier = "G-League";
    tierStyles = "text-orange-600 border-orange-800 bg-orange-950/20";
  } else {
    tier = "Traded to Shanghai";
    tierStyles = "text-rose-500 border-rose-600 bg-rose-950/30";
  }

  document.getElementById('tierBadge').innerText = tier;
  document.getElementById('overallBadge').className = `w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-xl transition-all duration-300 border-2 ${tierStyles}`;

  if (count === 8) {
    showFinishModal(finalOVR, tier);
  }
}

function updateArchetypeTitle() {
  const keys = Object.keys(slotsState);
  if (keys.length < 2) {
    document.getElementById('archetypeTitle').innerText = "Prospect";
    return;
  }

  const has3pt = slotsState['three_pt']?.rating >= 90;
  const hasFin = slotsState['finishing']?.rating >= 90;
  const hasDef = (slotsState['perimeter_def']?.rating >= 90) || (slotsState['interior_def']?.rating >= 90);
  const hasPlay = slotsState['playmaking']?.rating >= 90;

  let name = "Shot Creator";
  if (hasDef && has3pt && hasFin) name = "2-Way 3-Level Threat";
  else if (hasDef && has3pt) name = "2-Way Sharpshooter";
  else if (hasDef && hasPlay) name = "2-Way Playmaker";
  else if (hasFin && hasPlay) name = "Slashing Point Forward";
  else if (has3pt && hasPlay) name = "Floor-Spacing Maestro";
  else if (slotsState['interior_def']?.rating >= 92 && hasFin) name = "Paint Beast";

  document.getElementById('archetypeTitle').innerText = name;
}

function showFinishModal(ovr, tier) {
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('spinBtn').classList.add('opacity-40', 'cursor-not-allowed');

  const banner = document.getElementById('finishBanner');
  const title = document.getElementById('finishTier');
  const sub = document.getElementById('finishSubtitle');
  banner.classList.remove('hidden');

  title.innerText = `${ovr} OVR — ${tier}`;

  if (ovr === 99) {
    title.className = "text-3xl font-black uppercase text-amber-400";
    sub.innerText = "Flawless run! You assembled an immortal, mythical basketball demigod.";
  } else if (ovr >= 95) {
    title.className = "text-3xl font-black uppercase text-orange-400";
    sub.innerText = "Superstar caliber. Just one or two picks away from pure GOAT status.";
  } else if (ovr <= 50) {
    title.className = "text-3xl font-black uppercase text-rose-500";
    sub.innerText = "Ni Hao! Pack your bags, you're heading straight to the Shanghai Sharks.";
  } else {
    title.className = "text-3xl font-black uppercase text-white";
    sub.innerText = "Your MyPlayer build is officially locked in. Challenge your friends to beat it!";
  }
}

function shareBuild() {
  const ovr = document.getElementById('overallScore').innerText;
  const tier = document.getElementById('tierBadge').innerText;
  const arch = document.getElementById('archetypeTitle').innerText;
  const text = `🏀 My99Overall Challenge\nBuild: ${ovr} OVR (${tier})\nArchetype: ${arch}\nCan you build a 99 Demigod?`;
  navigator.clipboard.writeText(text).then(() => {
    alert("Build stats copied to clipboard!");
  });
}

function resetGame() {
  slotsState = {};
  usedPlayers.clear();
  currentSpin = { teamCode: null, eraStr: null };
  mustPick = false;
  rerolls = { team: 1, era: 1 };

  document.getElementById('teamDisplay').innerText = "--";
  document.getElementById('eraDisplay').innerText = "--";
  document.getElementById('finishBanner').classList.add('hidden');
  document.getElementById('spinBtn').disabled = false;
  document.getElementById('spinBtn').classList.remove('opacity-40', 'cursor-not-allowed');
  document.getElementById('spinNotice').innerText = "Press Spin to draw your first franchise.";
  document.getElementById('spinNotice').className = "text-[11px] text-center text-slate-400 mt-2.5 italic";

  document.getElementById('rerollTeamBtn').disabled = false;
  document.getElementById('rerollTeamBtn').innerText = "🔄 Team (1)";
  document.getElementById('rerollEraBtn').disabled = false;
  document.getElementById('rerollEraBtn').innerText = "🔄 Era (1)";

  document.getElementById('rosterContainer').innerHTML = `
    <div class="py-16 text-center text-slate-500 text-xs italic">
      Spin the reel above to load the franchise roster.
    </div>
  `;
  document.getElementById('playerCount').innerText = "(0)";

  renderSlots();
}

// Start app
init();