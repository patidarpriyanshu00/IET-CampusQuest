// --- 1. Marauder's Map Themed IET DAVV Checkpoints ---
const HOGWARTS_IET_CHECKPOINTS = [
  {
    id: 1,
    actualName: "M-Block Auditorium",
    lat: 22.6809,
    lng: 75.8798,
    radius: 35,
    riddle: "“Where day one began with long formal speech, Head to the grand room of red carpets.”",
    hint: "Where freshman Admission files are processed and Walk toward the tall administrative pillars",
    solved: false
  },
  {
    id: 2,
    actualName: "IET Block B",
    lat: 22.6818,
    lng: 75.8804,
    radius: 35,
    riddle: "“Home of fiber optic lines, code sprints, and logic gates”",
    hint: "Right across the inner garden courtyard",
    solved: false
  },
  {
    id: 3,
    actualName: "IET INCUBATION CENTER",
    lat: 22.6813,
    lng: 75.8808,
    radius: 35,
    riddle: "“Where ideas hatch before they learn to fly”",
    hint: "Place Where Silence Is First Priority",
    solved: false
  },
  {
    id: 4,
    actualName: "IET LAKE VIEW",
    lat: 22.6810,
    lng: 75.8789,
    radius: 30,
    riddle: "“I run on no power, reflect every coder’s gaze, and sit right where IET’s IT branch meets the water’s edge—where am I”",
    hint: "NOT IT DEPARTMENT BUT VIEW FROM IT DEPARTMENT.",
    solved: false
  },
  {
    id: 5,
    actualName: "IET Mechanical Workshop",
    lat: 22.6811,
    lng: 75.8814,
    radius: 30,
    riddle: "“Smell the grease and metal filings. Where safety goggles are mandatory and giant lathe machines shape raw steel.”",
    hint: "The industrial tin-roof workshop shed situated behind the primary classroom wings.",
    solved: false
  }
];

// --- 2. State ---
let gameState = {
  roll: "",
  name: "",
  house: "🦁 Gryffindor",
  score: 0,
  currentIdx: 0,
  checkpoints: JSON.parse(localStorage.getItem("hogwarts_iet_checkpoints")) || HOGWARTS_IET_CHECKPOINTS,
  userLocation: null,
  activeRadiusBoost: 0,
  multiplier: 1,
  powerups: {
    radius: 1,
    hint: 1,
    multiplier: 1
  }
};

// --- 3. Haversine Math ---
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- 4. Leaflet Map with Custom Broomstick Marker ---
const map = L.map("map", {
  zoomControl: false,
  attributionControl: false
}).setView([22.6810, 75.8800], 17);

// Free OpenStreetMap tile layer (No API key required)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Broomstick DivIcon
const broomIcon = L.divIcon({
  className: "broom-marker-container",
  html: '<div class="broom-marker">🧹</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

let playerBroomMarker = null;
let enchantedZoneCircle = null;

// Circle is cleared so the riddle destination is not revealed on the map
function renderEnchantedZone() {
  if (enchantedZoneCircle) {
    map.removeLayer(enchantedZoneCircle);
    enchantedZoneCircle = null;
  }
}

// --- 5. GPS Tracking ---
function startMarauderGPS() {
  const badge = document.getElementById("gps-indicator");

  if (!navigator.geolocation) {
    badge.innerText = "No Owl Signal";
    return;
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      gameState.userLocation = { lat: latitude, lng: longitude };

      badge.innerText = "⚡ Footsteps Revealed";
      badge.classList.add("enchanted");

      if (!playerBroomMarker) {
        playerBroomMarker = L.marker([latitude, longitude], { icon: broomIcon }).addTo(map);
      } else {
        playerBroomMarker.setLatLng([latitude, longitude]);
      }

      updateMarauderHUD();
    },
    (err) => {
      badge.innerText = "Spell Distorted (GPS Denied)";
      console.warn("GPS error:", err.message);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 6000 }
  );
}

// --- 6. HUD Gameplay Update ---
function updateMarauderHUD() {
  const current = gameState.checkpoints[gameState.currentIdx];
  const targetIndex = document.getElementById("target-index");
  const targetTitle = document.getElementById("target-title");
  const riddleText = document.getElementById("clue-body");
  const distReadout = document.getElementById("distance-readout");
  const claimBtn = document.getElementById("claim-btn");

  document.getElementById("hud-score").innerText = gameState.score;

  if (!current) {
    targetIndex.innerText = "MISCHIEF MANAGED";
    targetTitle.innerText = "🏆 Master of the Map!";
    riddleText.innerText = "You have traversed and solved every ward of IET DAVV! Your House points have been immortalized.";
    distReadout.innerText = "COMPLETED";
    claimBtn.disabled = true;
    claimBtn.innerText = "Quest Accomplished";
    claimBtn.classList.remove("unlocked-ready");
    saveHogwartsScore();
    return;
  }

  targetIndex.innerText = `MYSTERY ${gameState.currentIdx + 1} OF ${gameState.checkpoints.length}`;
  targetTitle.innerText = `Enchanted Ward #${gameState.currentIdx + 1}`;
  riddleText.innerText = current.riddle;

  if (gameState.userLocation) {
    const dist = Math.round(
      getDistanceInMeters(
        gameState.userLocation.lat,
        gameState.userLocation.lng,
        current.lat,
        current.lng
      )
    );
    distReadout.innerText = "Follow the clue...";

    const threshold = current.radius + gameState.activeRadiusBoost;
    if (dist <= threshold) {
      claimBtn.disabled = false;
      claimBtn.classList.add("unlocked-ready");
      claimBtn.innerText = `✨ Breach Barrier (+${100 * gameState.multiplier} pts)`;
    } else {
      claimBtn.disabled = true;
      claimBtn.classList.remove("unlocked-ready");
      claimBtn.innerText = "🔒 Warded: Search for the location";
    }
  }
}

// Claim / Breach Barrier
document.getElementById("claim-btn").addEventListener("click", () => {
  const current = gameState.checkpoints[gameState.currentIdx];
  if (!current) return;

  current.solved = true;
  gameState.score += 100 * gameState.multiplier;
  gameState.activeRadiusBoost = 0;
  document.getElementById("revealed-hint-container").classList.add("hidden");

  alert(`⚡ Ward Breached: "${current.actualName}"!\nAwarded +${100 * gameState.multiplier} House Points!`);

  gameState.currentIdx++;
  saveHogwartsScore();
  renderEnchantedZone();
  updateMarauderHUD();
});

// --- 7. Spells & Power-Ups ---
// Firebolt Overdrive (+25m)
document.getElementById("btn-powerup-radius").addEventListener("click", () => {
  if (gameState.powerups.radius > 0) {
    gameState.powerups.radius--;
    gameState.activeRadiusBoost = 25;
    document.getElementById("count-radius").innerText = gameState.powerups.radius;
    document.getElementById("btn-powerup-radius").disabled = true;
    renderEnchantedZone();
    updateMarauderHUD();
    alert("🧹 Firebolt Overdrive Cast: Ward boundary enlarged by +25 meters!");
  }
});

// Lumos Revelio (Clue Decryptor)
document.getElementById("btn-powerup-hint").addEventListener("click", () => {
  const current = gameState.checkpoints[gameState.currentIdx];
  if (gameState.powerups.hint > 0 && current) {
    gameState.powerups.hint--;
    document.getElementById("count-hint").innerText = gameState.powerups.hint;
    document.getElementById("btn-powerup-hint").disabled = true;

    const hintBox = document.getElementById("revealed-hint-container");
    document.getElementById("revealed-hint-text").innerText = current.hint;
    hintBox.classList.remove("hidden");
    alert("🪄 Lumos Revelio! Secrets whispered on your scroll.");
  }
});

// Felix Felicis (2x Multiplier)
document.getElementById("btn-powerup-multiplier").addEventListener("click", () => {
  if (gameState.powerups.multiplier > 0) {
    gameState.powerups.multiplier--;
    gameState.multiplier = 2;
    document.getElementById("count-mult").innerText = "Active (60s)";
    document.getElementById("btn-powerup-multiplier").disabled = true;
    updateMarauderHUD();

    setTimeout(() => {
      gameState.multiplier = 1;
      document.getElementById("count-mult").innerText = "0";
      updateMarauderHUD();
      alert("🧪 Felix Felicis wore off.");
    }, 60000);
  }
});

// --- 8. Tab Navigation ---
const tabs = {
  "tab-mission": "view-mission",
  "tab-powerups": "view-powerups",
  "tab-board": "view-board",
  "tab-admin": "view-admin"
};

Object.entries(tabs).forEach(([btnId, viewId]) => {
  document.getElementById(btnId).addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((v) => v.classList.remove("active"));
    document.getElementById(btnId).classList.add("active");
    document.getElementById(viewId).classList.add("active");
  });
});

// --- 9. House Cup Leaderboard ---
function saveHogwartsScore() {
  let board = JSON.parse(localStorage.getItem("hogwarts_iet_board")) || [
    { roll: "23T1012", name: "Moony (23T1012)", score: 400 },
    { roll: "22T2045", name: "Prongs (22T2045)", score: 300 }
  ];

  const match = board.find((p) => p.roll === gameState.roll);
  if (match) {
    match.score = Math.max(match.score, gameState.score);
  } else {
    board.push({
      roll: gameState.roll,
      name: `${gameState.name} [${gameState.house}]`,
      score: gameState.score
    });
  }

  board.sort((a, b) => b.score - a.score);
  localStorage.setItem("hogwarts_iet_board", JSON.stringify(board));
  renderLeaderboard();
}

function renderLeaderboard() {
  const board = JSON.parse(localStorage.getItem("hogwarts_iet_board")) || [];
  const tbody = document.getElementById("leaderboard-body");
  tbody.innerHTML = board
    .slice(0, 7)
    .map(
      (entry, idx) => `
      <tr>
        <td>#${idx + 1}</td>
        <td>${entry.roll}</td>
        <td>${entry.name}</td>
        <td><strong>${entry.score}</strong></td>
      </tr>`
    )
    .join("");
}

// --- 10. Registration Event ---
document.getElementById("auth-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const roll = document.getElementById("player-roll").value.trim();
  const name = document.getElementById("player-name").value.trim();
  const houseEl = document.getElementById("player-house");
  const house = houseEl ? houseEl.value : "🦁 Gryffindor";

  if (roll && name) {
    gameState.roll = roll;
    gameState.name = name;
    gameState.house = house;
    document.getElementById("hud-codename").innerText = `${name} (${roll})`;

    document.getElementById("screen-register").classList.add("hidden");
    document.getElementById("screen-hud").classList.remove("hidden");

    setTimeout(() => {
      map.invalidateSize();
      renderEnchantedZone();
    }, 200);

    startMarauderGPS();
    renderLeaderboard();
    updateMarauderHUD();
  }
});

// --- 11. Headmaster Checkpoint Inscription ---
document.getElementById("admin-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("admin-name").value.trim();
  const lat = parseFloat(document.getElementById("admin-lat").value);
  const lng = parseFloat(document.getElementById("admin-lng").value);
  const rad = parseInt(document.getElementById("admin-rad").value, 10);
  const riddle = document.getElementById("admin-riddle").value.trim();
  const hint = document.getElementById("admin-intel").value.trim();

  if (name && !isNaN(lat) && !isNaN(lng) && !isNaN(rad) && riddle && hint) {
    const customCp = {
      id: gameState.checkpoints.length + 1,
      actualName: name,
      lat,
      lng,
      radius: rad,
      riddle,
      hint,
      solved: false
    };

    gameState.checkpoints.push(customCp);
    localStorage.setItem("hogwarts_iet_checkpoints", JSON.stringify(gameState.checkpoints));
    e.target.reset();
    alert("✨ New ward inscribed into the Marauder's Map!");
    renderEnchantedZone();
    updateMarauderHUD();
  }
});
