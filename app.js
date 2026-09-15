// --- SKILL CATEGORIES CONFIG ---
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

const TEAM_COLORS = {
  GSW: { bg: 'bg-blue-600/30', border: 'border-blue-500/60', text: 'text-amber-400' },
  LAL: { bg: 'bg-purple-900/40', border: 'border-purple-500/60', text: 'text-yellow-400' },
  BOS: { bg: 'bg-emerald-900/40', border: 'border-emerald-500/60', text: 'text-emerald-300' },
  CHI: { bg: 'bg-red-950/40', border: 'border-red-600/60', text: 'text-red-400' },
  MIA: { bg: 'bg-rose-950/40', border: 'border-rose-600/60', text: 'text-amber-500' },
  SAS: { bg: 'bg-slate-800/40', border: 'border-slate-500/60', text: 'text-slate-200' },
  OKC: { bg: 'bg-sky-900/40', border: 'border-sky-500/60', text: 'text-orange-400' },
  DAL: { bg: 'bg-blue-900/40', border: 'border-blue-600/60', text: 'text-sky-300' },
  DEN: { bg: 'bg-indigo-950/40', border: 'border-yellow-500/60', text: 'text-yellow-400' },
  MIL: { bg: 'bg-emerald-950/40', border: 'border-emerald-600/60', text: 'text-amber-200' },
  NYK: { bg: 'bg-blue-950/40', border: 'border-orange-500/60', text: 'text-orange-400' }
};

// --- SUPABASE CONFIGURATION ---
// Paste your project values below
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

const supabaseClient = (window.supabase && SUPABASE_URL !== "https://YOUR_PROJECT_ID.supabase.co") 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// --- APP STATE ---
let database = { teams: [], eras: [], players: {} };
let slotsState = {};
let usedPlayers = new Set();
let currentSpin = { teamCode: null, eraStr: null };
let mustPick = false;
let rerolls = { team: 1, era: 1 };
let currentGameMode = 'classic'; // 'classic' | 'hoop_iq' | '1v1'
let currentUser = null;
let currentLeaderboardMode = 'classic';

// --- INITIALIZATION ---
async function init() {
  try {
    const res = await fetch('./data/rosters.json');
    database = await res.json();
  } catch (err) {
    console.error("Failed to load rosters.json:", err);
  }

  // Check Supabase session
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    updateUserAuthUI(session?.user || null);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      updateUserAuthUI(session?.user || null);
    });
  }

  renderSlots();
}

// --- HOME & VIEW NAVIGATION ---
function selectModeFromHome(mode) {
  currentGameMode = mode;
  resetGame();

  const modeLabels = {
    classic: 'Classic Mode',
    hoop_iq: '🧠 Hoop IQ Mode',
    '1v1': '⚔️ 1v1 Head-to-Head'
  };
  
  const labelEl = document.getElementById('activeModeText');
  if (labelEl) labelEl.innerText = modeLabels[mode];

  switchMainView('game');
}

function switchMainView(view) {
  const hView = document.getElementById('homeView');
  const gView = document.getElementById('gameView');
  const lbView = document.getElementById('leaderboardView');
  const sView = document.getElementById('statsView');
  const modeIndicator = document.getElementById('activeModeBadge');

  const navHome = document.getElementById('navHomeBtn');
  const navGame = document.getElementById('navGameBtn');
  const navLb = document.getElementById('navLeaderboardBtn');
  const navStats = document.getElementById('navStatsBtn');

  // Reset all tabs
  [navHome, navGame, navLb, navStats].forEach(b => {
    if (b) b.className = "px-3.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white";
  });
  [hView, gView, lbView, sView].forEach(v => {
    if (v) v.classList.add('hidden');
  });

  if (view === 'home') {
    hView.classList.remove('hidden');
    navHome.className = "px-3.5 py-1.5 rounded-lg transition bg-orange-500 text-white shadow-md";
    if (modeIndicator) {
      modeIndicator.classList.add('hidden');
      modeIndicator.classList.remove('flex');
    }
  } else if (view === 'game') {
    gView.classList.remove('hidden');
    navGame.className = "px-3.5 py-1.5 rounded-lg transition bg-orange-500 text-white shadow-md";
    if (modeIndicator) {
      modeIndicator.classList.remove('hidden');
      modeIndicator.classList.add('flex');
    }
  } else if (view === 'leaderboard') {
    lbView.classList.remove('hidden');
    navLb.className = "px-3.5 py-1.5 rounded-lg transition bg-orange-500 text-white shadow-md";
    if (modeIndicator) {
      modeIndicator.classList.add('hidden');
      modeIndicator.classList.remove('flex');
    }
    fetchLeaderboard();
  } else if (view === 'stats') {
    sView.classList.remove('hidden');
    navStats.className = "px-3.5 py-1.5 rounded-lg transition bg-orange-500 text-white shadow-md";
    if (modeIndicator) {
      modeIndicator.classList.add('hidden');
      modeIndicator.classList.remove('flex');
    }
    fetchUserStats();
  }
}

// --- AUTHENTICATION FLOW ---
function openAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('authModal').classList.add('flex');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('authModal').classList.remove('flex');
}

async function signInWithGoogle() {
  if (!supabaseClient) {
    alert("Please add your Supabase URL & Anon Key in app.js first!");
    return;
  }
  await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
}

async function handleEmailAuth(e) {
  e.preventDefault();
  if (!supabaseClient) {
    alert("Please add your Supabase URL & Anon Key in app.js first!");
    return;
  }

  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    const { error: signUpError } = await supabaseClient.auth.signUp({ email, password });
    if (signUpError) {
      alert(signUpError.message);
      return;
    }
    alert("Account registered and signed in!");
  }
  closeAuthModal();
}

async function handleSignOut() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
    updateUserAuthUI(null);
  }
}

function updateUserAuthUI(user) {
  currentUser = user;
  const container = document.getElementById('authContainer');
  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Hooper";
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-300 font-bold">${name}</span>
        <button onclick="handleSignOut()" class="text-[10px] text-slate-500 hover:text-rose-400 font-semibold uppercase underline">Sign Out</button>
      </div>
    `;
    const greet = document.getElementById('statsUserGreeting');
    if (greet) greet.innerText = `Logged in as ${user.email}`;
  } else {
    container.innerHTML = `
      <button onclick="openAuthModal()" class="px-3.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500 hover:text-white text-xs font-bold transition">
        Sign In
      </button>
    `;
    const greet = document.getElementById('statsUserGreeting');
    if (greet) greet.innerText = "Sign in to save your runs across devices.";
  }
}

// --- CLOUD SAVE ---
async function saveCompletedBuildToSupabase(finalOvr, tier, variance, arch) {
  const statusEl = document.getElementById('saveStatus');
  if (!statusEl) return;

  statusEl.innerText = "Syncing build to global leaderboard...";

  if (!supabaseClient) {
    statusEl.innerText = "Build complete! (Add Supabase keys in app.js for leaderboard rankings)";
    return;
  }

  const userName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || "Anonymous Hooper";

  try {
    const { error } = await supabaseClient.from('builds').insert({
      user_id: currentUser?.id || null,
      user_name: userName,
      overall_score: finalOvr,
      tier_name: tier,
      archetype_title: arch,
      attribute_variance: parseFloat(variance),
      game_mode: currentGameMode,
      slots_data: slotsState
    });

    if (error) throw error;
    statusEl.innerText = "✓ Build verified & ranked on the global leaderboard!";
  } catch (err) {
    console.error("Failed to save build:", err);
    statusEl.innerText = "Build saved locally.";
  }
}

// --- LEADERBOARD LOGIC ---
async function fetchLeaderboard() {
  const tbody = document.getElementById('leaderboardTableBody');
  tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500 italic">Fetching rankings...</td></tr>`;

  if (!supabaseClient) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500 italic">Configure Supabase keys in app.js to display live rankings.</td></tr>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from('builds')
    .select('*')
    .eq('game_mode', currentLeaderboardMode)
    .order('overall_score', { ascending: false })
    .order('attribute_variance', { ascending: true })
    .limit(25);

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500 italic">No builds submitted in this mode yet. Be the first!</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  data.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-800/40 transition";
    tr.innerHTML = `
      <td class="py-3 px-4 font-black ${i === 0 ? 'text-amber-400' : (i === 1 ? 'text-slate-300' : (i === 2 ? 'text-amber-600' : 'text-slate-500'))}">#${i + 1}</td>
      <td class="py-3 px-4 font-bold text-white">${row.user_name}</td>
      <td class="py-3 px-4 text-slate-400">${row.archetype_title} <span class="text-[10px] text-slate-500">(${row.tier_name})</span></td>
      <td class="py-3 px-4 text-center font-mono text-slate-400">${row.attribute_variance}</td>
      <td class="py-3 px-4 text-right font-black text-base ${getRatingColor(row.overall_score)}">${row.overall_score}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filterLeaderboardMode(mode) {
  currentLeaderboardMode = mode;
  const classicBtn = document.getElementById('lbFilterClassic');
  const hoopIqBtn = document.getElementById('lbFilterHoopIq');

  if (mode === 'classic') {
    classicBtn.className = "px-3.5 py-1.5 rounded-lg bg-orange-500 text-white transition";
    hoopIqBtn.className = "px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white transition";
  } else {
    hoopIqBtn.className = "px-3.5 py-1.5 rounded-lg bg-orange-500 text-white transition";
    classicBtn.className = "px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white transition";
  }
  fetchLeaderboard();
}

// --- USER STATS LOGIC ---
async function fetchUserStats() {
  const tbody = document.getElementById('userBuildsTableBody');
  if (!supabaseClient || !currentUser) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500 italic">Sign in to view your career stats and past builds.</td></tr>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from('builds')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-500 italic">No saved builds found for this account.</td></tr>`;
    return;
  }

  const total = data.length;
  const bestOvr = Math.max(...data.map(d => d.overall_score));
  const avgOvr = (data.reduce((acc, d) => acc + d.overall_score, 0) / total).toFixed(1);
  const bestTier = data.find(d => d.overall_score === bestOvr)?.tier_name || "--";

  document.getElementById('statTotalRuns').innerText = total;
  document.getElementById('statBestOvr').innerText = bestOvr;
  document.getElementById('statAvgOvr').innerText = avgOvr;
  document.getElementById('statBestTier').innerText = bestTier;

  tbody.innerHTML = '';
  data.forEach(row => {
    const d = new Date(row.created_at).toLocaleDateString();
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-800/40 transition";
    tr.innerHTML = `
      <td class="py-3 px-4 text-slate-400">${d}</td>
      <td class="py-3 px-4 uppercase text-[10px] font-bold text-slate-400">${row.game_mode}</td>
      <td class="py-3 px-4 font-bold text-white">${row.archetype_title}</td>
      <td class="py-3 px-4 text-center font-bold text-slate-300">${row.tier_name}</td>
      <td class="py-3 px-4 text-right font-black ${getRatingColor(row.overall_score)}">${row.overall_score}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- MODAL DISMISSAL LISTENERS ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeAuthModal();
  }
});

document.getElementById('assignModal').addEventListener('click', (e) => {
  if (e.target.id === 'assignModal') closeModal();
});

document.getElementById('authModal').addEventListener('click', (e) => {
  if (e.target.id === 'authModal') closeAuthModal();
});

// --- MAIN SPIN WHEEL ---
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
      
      const notice = document.getElementById('spinNotice');
      notice.innerText = "Pick locked! Select a player below to fill an attribute.";
      notice.className = "text-[11px] text-center text-orange-400 mt-2.5 font-bold animate-pulse";

      loadRoster();
    }
  }, 70);
}

// --- LIFELINE REROLLS ---
function useReroll(type) {
  if (!mustPick) {
    alert("Spin the reel first before using a reroll!");
    return;
  }
  if (rerolls[type] <= 0) return;

  const btn = document.getElementById(type === 'team' ? 'rerollTeamBtn' : 'rerollEraBtn');
  const displayEl = document.getElementById(type === 'team' ? 'teamDisplay' : 'eraDisplay');

  rerolls[type]--;
  btn.disabled = true;
  btn.innerText = `🔄 ${type.toUpperCase()} (0)`;
  displayEl.classList.add('rolling');

  let rollCount = 0;
  const interval = setInterval(() => {
    rollCount++;
    if (type === 'team') {
      const rTeam = database.teams[Math.floor(Math.random() * database.teams.length)];
      displayEl.innerText = rTeam.code;
    } else {
      const rEra = database.eras[Math.floor(Math.random() * database.eras.length)];
      displayEl.innerText = rEra;
    }

    if (rollCount > 8) {
      clearInterval(interval);
      displayEl.classList.remove('rolling');

      if (type === 'team') {
        const validTeams = database.teams.filter(t => 
          t.code !== currentSpin.teamCode && 
          database.players[`${t.code}_${currentSpin.eraStr}`]?.length > 0
        );
        currentSpin.teamCode = (validTeams.length > 0)
          ? validTeams[Math.floor(Math.random() * validTeams.length)].code
          : database.teams.filter(t => t.code !== currentSpin.teamCode)[0].code;
        displayEl.innerText = currentSpin.teamCode;

      } else {
        const validErasForTeam = database.eras.filter(e => 
          e !== currentSpin.eraStr && 
          database.players[`${currentSpin.teamCode}_${e}`]?.length > 0
        );

        if (validErasForTeam.length > 0) {
          currentSpin.eraStr = validErasForTeam[Math.floor(Math.random() * validErasForTeam.length)];
        } else {
          const allKeys = Object.keys(database.players);
          const fallbackKey = allKeys[Math.floor(Math.random() * allKeys.length)];
          const [fbTeam, fbEra] = fallbackKey.split('_');
          currentSpin.teamCode = fbTeam;
          currentSpin.eraStr = fbEra;
          document.getElementById('teamDisplay').innerText = fbTeam;
        }
        displayEl.innerText = currentSpin.eraStr;
      }

      loadRoster();
    }
  }, 60);
}

// --- LOAD ROSTER ---
function loadRoster() {
  const container = document.getElementById('rosterContainer');
  const countEl = document.getElementById('playerCount');
  container.innerHTML = '';

  const key = `${currentSpin.teamCode}_${currentSpin.eraStr}`;
  const players = database.players[key] || [];

  countEl.innerText = `(${players.length})`;

  if (players.length === 0) {
    container.innerHTML = `<div class="py-12 text-center text-slate-500 text-xs italic">No roster entries found for ${currentSpin.teamCode} (${currentSpin.eraStr}).</div>`;
    return;
  }

  const teamColors = TEAM_COLORS[currentSpin.teamCode] || { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-300' };

  players.forEach(p => {
    const isBurned = usedPlayers.has(p.name);
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border transition flex items-center justify-between ${
      isBurned 
        ? 'opacity-30 bg-slate-950/40 border-slate-900 cursor-not-allowed'
        : 'bg-slate-950/80 border-slate-800/80 hover:border-orange-500/50 cursor-pointer'
    }`;

    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg ${teamColors.bg} border ${teamColors.border} flex items-center justify-center font-black text-[11px] ${teamColors.text}">
          ${currentSpin.teamCode}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-white">${p.name}</span>
            <span class="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">${p.pos}</span>
          </div>
          <div class="text-[10px] text-slate-500 mt-0.5">${currentSpin.eraStr} ${isBurned ? '• (Drafted)' : ''}</div>
        </div>
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

function filterRoster() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rows = document.getElementById('rosterContainer').children;
  Array.from(rows).forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
  });
}

// --- ASSIGN MODAL ---
function openAssignModal(player) {
  document.getElementById('modalPlayerName').innerText = player.name;
  document.getElementById('modalPlayerSub').innerText = `${player.pos} • ${currentSpin.teamCode} (${currentSpin.eraStr})`;
  const choices = document.getElementById('modalSkillChoices');
  choices.innerHTML = '';

  SKILLS.forEach(s => {
    const isFilled = !!slotsState[s.id];
    const val = player.ratings[s.id] || 50;

    const displayVal = (currentGameMode === 'hoop_iq') ? '??' : val;
    const statColorClass = (currentGameMode === 'hoop_iq') 
      ? 'text-amber-400/80 font-mono tracking-widest' 
      : getRatingColor(val);

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
      <div class="text-base font-black ${isFilled ? 'text-slate-600' : statColorClass}">
        ${displayVal}
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

  const notice = document.getElementById('spinNotice');
  notice.innerText = "Slot locked! Spin for your next skill.";
  notice.className = "text-[11px] text-center text-slate-400 mt-2.5 italic";

  document.getElementById('rosterContainer').innerHTML = `
    <div class="py-16 text-center text-slate-500 text-xs italic">
      Skill assigned! Roll again to reveal your next draft pool.
    </div>
  `;
  document.getElementById('playerCount').innerText = "(0)";

  renderSlots();
}

// --- RENDER SLOTS & UPDATE RADAR ---
function renderSlots() {
  const grid = document.getElementById('skillSlotsGrid');
  grid.innerHTML = '';
  const isComplete = Object.keys(slotsState).length === 8;

  SKILLS.forEach(s => {
    const slot = slotsState[s.id];
    const card = document.createElement('div');
    card.className = "p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between " +
      (slot ? "bg-slate-950/80 border-slate-700 shadow-inner" : "bg-slate-950/20 border-dashed border-slate-800");

    if (slot) {
      const showStats = (currentGameMode !== 'hoop_iq') || isComplete;
      const scoreBadge = showStats 
        ? `<span class="text-xl font-black ${getRatingColor(slot.rating)}">${slot.rating}</span>`
        : `<span class="text-[11px] font-bold text-amber-500/80 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">LOCKED</span>`;

      const tColors = TEAM_COLORS[slot.team] || { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-300' };

      card.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg ${tColors.bg} border ${tColors.border} flex items-center justify-center font-black text-[10px] ${tColors.text}">
            ${slot.team}
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase leading-none">${s.name}</div>
            <div class="text-sm font-black text-white mt-1">${slot.player}</div>
            <div class="text-[10px] text-slate-500">${slot.era}</div>
          </div>
        </div>
        <div class="text-right">
          ${scoreBadge}
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

  updateRadarChart();
  calculateOverall();
}

// --- 2K-STYLE RADAR POLYGON REDRAW ---
function updateRadarChart() {
  const size = 160;
  const center = size / 2;
  const maxRadius = 60;

  const points = SKILLS.map((skill, index) => {
    const angle = (Math.PI * 2 / SKILLS.length) * index - (Math.PI / 2);
    const rating = slotsState[skill.id]?.rating || 30;
    const r = (rating / 99) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const polygonEl = document.getElementById('radarPolygon');
  if (polygonEl) {
    polygonEl.setAttribute('points', points);
  }
}

function getRatingColor(val) {
  if (val >= 95) return 'text-amber-400 font-extrabold';
  if (val >= 90) return 'text-orange-400';
  if (val >= 80) return 'text-blue-400';
  if (val >= 70) return 'text-emerald-400';
  return 'text-rose-400';
}

function calculateVariance(ratingsArray) {
  if (ratingsArray.length === 0) return 0;
  const mean = ratingsArray.reduce((sum, val) => sum + val, 0) / ratingsArray.length;
  return ratingsArray.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / ratingsArray.length;
}

// --- DYNAMIC ARCHETYPE & OVR ENGINE ---
function calculateOverall() {
  const keys = Object.keys(slotsState);
  const count = keys.length;
  document.getElementById('slotsFilledCount').innerText = `${count} of 8 skills drafted`;

  if (count === 0) {
    document.getElementById('overallScore').innerText = "--";
    document.getElementById('archetypeTitle').innerText = "Prospect";
    return;
  }

  const ratingsList = keys.map(k => slotsState[k].rating);
  let sum = ratingsList.reduce((a, b) => a + b, 0);
  let minVal = Math.min(...ratingsList);

  const rawAvg = sum / count;
  let finalOVR = Math.round(rawAvg);

  if (count === 8) {
    if (rawAvg >= 98.5 && minVal >= 96) {
      finalOVR = 99;
    } else if (finalOVR === 99) {
      finalOVR = 98;
    }
  }

  const isComplete = count === 8;
  if (currentGameMode === 'hoop_iq' && !isComplete) {
    document.getElementById('overallScore').innerText = "??";
  } else {
    document.getElementById('overallScore').innerText = finalOVR;
  }

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

  const tierBadge = document.getElementById('tierBadge');
  if (currentGameMode === 'hoop_iq' && !isComplete) {
    tierBadge.innerText = "Evaluating...";
  } else {
    tierBadge.innerText = tier;
    document.getElementById('overallBadge').className = `w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-xl transition-all duration-300 border-2 ${tierStyles}`;
  }

  if (isComplete) {
    const variance = calculateVariance(ratingsList).toFixed(2);
    const archTitle = document.getElementById('archetypeTitle').innerText;
    showFinishModal(finalOVR, tier, variance);
    saveCompletedBuildToSupabase(finalOVR, tier, variance, archTitle);
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

function showFinishModal(ovr, tier, variance) {
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('spinBtn').classList.add('opacity-40', 'cursor-not-allowed');

  const banner = document.getElementById('finishBanner');
  const title = document.getElementById('finishTier');
  const sub = document.getElementById('finishSubtitle');
  banner.classList.remove('hidden');

  title.innerText = `${ovr} OVR — ${tier}`;

  let desc = `Build Variance: ${variance}. `;
  if (ovr === 99) {
    title.className = "text-3xl font-black uppercase text-amber-400";
    sub.innerText = desc + "Flawless run! You assembled an immortal, mythical basketball demigod.";
  } else if (ovr >= 95) {
    title.className = "text-3xl font-black uppercase text-orange-400";
    sub.innerText = desc + "Superstar caliber. Just one or two picks away from pure GOAT status.";
  } else if (ovr <= 50) {
    title.className = "text-3xl font-black uppercase text-rose-500";
    sub.innerText = desc + "Ni Hao! Pack your bags, you're heading straight to the Shanghai Sharks.";
  } else {
    title.className = "text-3xl font-black uppercase text-white";
    sub.innerText = desc + "Your Frankenstein MyPlayer build is locked. Save your card or challenge friends!";
  }
}

// --- CARD EXPORT (NO COPY TEXT) ---
function downloadBuildImage() {
  const cardElement = document.getElementById('exportableBuildCard');
  const ovr = document.getElementById('overallScore').innerText;
  const arch = document.getElementById('archetypeTitle').innerText;

  html2canvas(cardElement, {
    backgroundColor: '#090c13',
    scale: 2
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `My99Overall_${arch.replace(/\s+/g, '_')}_${ovr}OVR.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    console.error("Screenshot export failed:", err);
    alert("Could not generate image. Please try again!");
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
  
  const spinBtn = document.getElementById('spinBtn');
  spinBtn.disabled = false;
  spinBtn.classList.remove('opacity-40', 'cursor-not-allowed');

  const notice = document.getElementById('spinNotice');
  notice.innerText = "Press Spin to draw your first franchise.";
  notice.className = "text-[11px] text-center text-slate-400 mt-2.5 italic";

  const rTeamBtn = document.getElementById('rerollTeamBtn');
  if (rTeamBtn) {
    rTeamBtn.disabled = false;
    rTeamBtn.innerText = "🔄 Team (1)";
  }

  const rEraBtn = document.getElementById('rerollEraBtn');
  if (rEraBtn) {
    rEraBtn.disabled = false;
    rEraBtn.innerText = "🔄 Era (1)";
  }

  document.getElementById('rosterContainer').innerHTML = `
    <div class="py-16 text-center text-slate-500 text-xs italic">
      Spin the reel above to load the franchise roster.
    </div>
  `;
  document.getElementById('playerCount').innerText = "(0)";

  renderSlots();
}

window.addEventListener('keydown', (e) => {
  if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
  if (e.code === 'Space') {
    e.preventDefault();
    triggerMainSpin();
  } else if (e.key === '1') {
    useReroll('team');
  } else if (e.key === '2') {
    useReroll('era');
  }
});

// Start app
init();