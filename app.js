/* ============================================
   PIXEL RIBBON VALENTINE - App Logic
   ============================================ */

// ===== CUSTOMIZE HERE =====
const CONFIG = {
  name: "",
  message: "You make even the most mundane, boring, silent days feel special. 💗",
  dateLocation: "February 14th",
  colors: {
    pink: "#f4b8c4",
    lavender: "#d4c4f0",
    mint: "#b8e8d4",
  },
};

// ===== ADD YOUR PHOTOS HERE =====
// Put your images in the images/ folder, then add them below.
// Each: { src: "images/your-photo.jpg", caption: "Our first date at the beach" }
// Photos are sorted by EXIF date (when available) before the game starts.
const PHOTOS_RAW = [
  { src: "images/ballard.jpeg", caption: "failing at topgolf and overpriced desserts" },
  { src: "images/bday.JPEG", caption: "fireworks after a not-so-fire day" },
  { src: "images/crater.jpeg", caption: "crater lake with the whole family?!" },
  { src: "images/formal2024.JPEG", caption: "stressing me out by leaving before me" },
  { src: "images/formal2025.JPEG", caption: "formal again!" },
  { src: "images/formal2025_1.jpeg", caption: "cute purse in westlake" },
  { src: "images/formal2025_2.JPG", caption: "making each other smile" },
  { src: "images/h&m.jpeg", caption: "we will never stop shopping at h&m" },
  { src: "images/halloween1.PNG", caption: "mr. and mrs. fox" },
  { src: "images/halloween2.jpeg", caption: "trophy wife, football husband" },
  { src: "images/holi.jpeg", caption: "bringing my 'close friend' to holi" },
  { src: "images/ikea.jpeg", caption: "IKEA again soon?" },
  { src: "images/kygo.jpeg", caption: "KYGO!" },
  { src: "images/leavenworth.jpeg", caption: "leavenworth trip" },
  { src: "images/market.jpeg", caption: "fremont sundays together" },
  { src: "images/neon.JPG", caption: "surprisingly fun night" },
  { src: "images/summer_1.jpeg", caption: "our first summer" },
  { src: "images/weeknd.JPG", caption: "best concert ever" },
  { src: "images/xmas.jpeg", caption: "christmas (only at our place from now)" },
  { src: "images/zoo.jpeg", caption: "i can't wait to show you elephants halfway across the world" },
];
let PHOTOS = [...PHOTOS_RAW]; // Sorted by date after load

// ===== STATE =====
let soundEnabled = true;
let revealedCount = 0;
let photoQueue = [];
let yesScale = 1;
let noScale = 1;
let confettiInterval = null;

// ===== DOM =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const screenIntro = $("#screen-intro");
const screenEntrance = $("#screen-entrance");
const screenPregame = $("#screen-pregame");
const screenGame = $("#screen-game");
const screenTransition = $("#screen-transition");
const screenReveal = $("#screen-reveal");
const btnSound = $("#btn-sound");
const btnYes = $("#btn-yes");
const btnNo = $("#btn-no");
const revealButtons = $("#reveal-buttons");
const revealAfterYes = $("#reveal-after-yes");
const btnBackToCollage = $("#btn-back-to-collage");
const btnDownloadCollage = $("#btn-download-collage");
const collageActions = $("#collage-actions");
const fallingZone = $("#falling-zone");
const memoryBoard = $("#memory-board");
const gameScroll = $("#game-scroll");
const photoCountEl = $("#photo-count");
const gameCompleteEl = $("#game-complete");
const personalMessage = $("#personal-message");
const confettiContainer = $("#confetti-container");
const gameCanvas = $("#screen-game");

// ===== SIMPLE SOUND (optional, no external files) =====
function playSound() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 523;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}

// ===== SCREEN NAVIGATION =====
function showScreen(screenEl) {
  $$(".screen").forEach((s) => s.classList.remove("screen-active"));
  screenEl.classList.add("screen-active");
}

// ===== PHOTO SORTING BY EXIF DATE =====
function parseExifDate(str) {
  if (!str || typeof str !== "string") return null;
  const m = str.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}

async function getPhotoDate(photo) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (typeof EXIF !== "undefined") {
        try {
          EXIF.getData(img, function () {
            const dt = EXIF.getTag(this, "DateTimeOriginal") || EXIF.getTag(this, "DateTime");
            resolve(parseExifDate(dt) || 0);
          });
        } catch {
          resolve(0);
        }
      } else resolve(0);
    };
    img.onerror = () => resolve(0);
    img.src = photo.src;
  });
}

async function sortPhotosByDate() {
  const dated = await Promise.all(
    PHOTOS_RAW.map(async (p) => ({ ...p, _ts: await getPhotoDate(p) }))
  );
  dated.sort((a, b) => a._ts - b._ts);
  PHOTOS = dated.map(({ _ts, ...p }) => p);
}

function preloadImages() {
  return Promise.all(
    PHOTOS.map(
      (p) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = p.src;
        })
    )
  );
}

// ===== PHOTO MEMORIES GAME =====
let spawnInterval = null;

function startPhotoGame() {
  if (!PHOTOS.length) {
    photoCountEl.textContent = "0 / 0";
    gameCompleteEl.classList.remove("hidden");
    return;
  }

  revealedCount = 0;
  photoQueue = [...PHOTOS];
  // No shuffle - photos are shown in date order (oldest first)
  photoCountEl.textContent = `0 / ${photoQueue.length}`;
  fallingZone.querySelectorAll(".falling-photo").forEach((el) => el.remove());
  memoryBoard.innerHTML = "";
  gameCompleteEl.classList.add("hidden");

  // Spawn photos gently, one at a time
  spawnInterval = setInterval(spawnFallingPhoto, 2200);
  setTimeout(() => spawnFallingPhoto(), 400);
  setTimeout(() => spawnFallingPhoto(), 1200);
}

function spawnFallingPhoto() {
  if (!photoQueue.length || !fallingZone) return;
  // Don't clear interval when queue empty - photos may be re-added when they miss

  const photo = photoQueue.shift();
  if (!photo) return;

  const el = document.createElement("div");
  el.className = "falling-photo";
  el.dataset.caption = photo.caption;
  el.dataset.src = photo.src;

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = photo.caption;
  img.loading = "eager";
  img.onerror = () => { el.classList.add("photo-error"); img.src = "images/placeholder.svg"; };
  el.appendChild(img);

  const rect = fallingZone.getBoundingClientRect();
  const photoSize = 80;
  const maxLeft = rect.width - photoSize;
  const left = Math.max(8, Math.random() * maxLeft);
  el.style.left = `${left}px`;

  const onReveal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (el.classList.contains("revealed")) return;
    el.classList.add("revealed");
    el.style.animation = "none";
    playSound();

    addPolaroidToBoard(photo);
    revealedCount++;
    photoCountEl.textContent = `${revealedCount} / ${PHOTOS.length}`;

    setTimeout(() => el.remove(), 300);

    if (revealedCount >= PHOTOS.length) {
      clearInterval(spawnInterval);
      setTimeout(() => {
        gameCompleteEl.classList.remove("hidden");
        playSound();
      }, 600);
    }
  };

  el.addEventListener("click", onReveal);
  el.addEventListener("touchend", onReveal, { passive: false });

  // Re-add to queue if photo reaches bottom without being clicked
  el.addEventListener("animationend", () => {
    if (el.classList.contains("revealed")) return;
    photoQueue.push(photo);
    el.remove();
  });

  fallingZone.appendChild(el);
}

function addPolaroidToBoard(photo) {
  const polaroid = document.createElement("div");
  polaroid.className = "polaroid";
  const rotation = (Math.random() - 0.5) * 8;
  polaroid.dataset.rotation = rotation;
  polaroid.style.setProperty("--polaroid-rotation", `${rotation}deg`);

  const imgWrap = document.createElement("div");
  imgWrap.className = "polaroid-img";
  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = photo.caption;
  img.onerror = () => { img.src = "images/placeholder.svg"; };
  imgWrap.appendChild(img);

  const caption = document.createElement("p");
  caption.className = "polaroid-caption";
  caption.textContent = photo.caption;

  polaroid.appendChild(imgWrap);
  polaroid.appendChild(caption);
  memoryBoard.appendChild(polaroid);

  // Auto-scroll so the new polaroid stays in view
  requestAnimationFrame(() => {
    polaroid.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

// ===== CONFETTI =====
function spawnConfetti() {
  const colors = [
    "#f4b8c4", "#e8a4b5", "#d4c4f0", "#c4b0e8", "#b8e8d4", "#a4e0c4",
  ];
  const count = 60;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = "-10px";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = `${Math.random() * 0.5}s`;
    el.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    confettiContainer.appendChild(el);

    setTimeout(() => el.remove(), 3500);
  }
}

// ===== POPULATE PERSONAL MESSAGE =====
function setPersonalMessage() {
  let text = CONFIG.message;
  if (CONFIG.name) text = `${CONFIG.name},\n\n${text}`;
  if (CONFIG.dateLocation) text += `\n\n${CONFIG.dateLocation}`;
  personalMessage.textContent = text;
}

// ===== EVENT HANDLERS =====
$("#btn-intro").addEventListener("click", () => {
  playSound();
  showScreen(screenEntrance);
});
$("#btn-entrance").addEventListener("click", () => {
  playSound();
  showScreen(screenPregame);
});
$("#btn-pregame").addEventListener("click", async () => {
  playSound();
  showScreen(screenGame);
  try {
    await Promise.race([
      sortPhotosByDate(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
  } catch (e) {
    PHOTOS = [...PHOTOS_RAW];
  }
  await Promise.race([preloadImages(), new Promise((r) => setTimeout(r, 6000))]);
  startPhotoGame();
});
$("#btn-transition").addEventListener("click", () => {
  playSound();
  revealButtons.classList.remove("hidden");
  revealAfterYes.classList.add("hidden");
  yesScale = 1;
  noScale = 1;
  btnYes.style.setProperty("--yes-scale", "1");
  btnYes.style.transform = "";
  btnNo.style.transform = "";
  btnNo.style.display = "";
  showScreen(screenReveal);
});
$("#btn-see-reveal")?.addEventListener("click", () => {
  playSound();
  showScreen(screenTransition);
});

btnSound.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  btnSound.textContent = soundEnabled ? "🔊" : "🔇";
  if (soundEnabled) playSound();
});

btnYes.addEventListener("click", () => {
  playSound();
  spawnConfetti();
  if (confettiInterval) clearInterval(confettiInterval);
  confettiInterval = setInterval(spawnConfetti, 1800);
  revealButtons.classList.add("hidden");
  revealAfterYes.classList.remove("hidden");
});

btnNo.addEventListener("click", () => {
  playSound();
  yesScale += 0.1;
  noScale -= 0.15;
  btnYes.style.setProperty("--yes-scale", String(yesScale));
  btnYes.style.transform = `scale(${yesScale})`;
  btnYes.classList.remove("shake");
  void btnYes.offsetWidth; // force reflow for animation restart
  btnYes.classList.add("shake");
  setTimeout(() => btnYes.classList.remove("shake"), 400);
  if (noScale <= 0) {
    btnNo.style.display = "none";
  } else {
    btnNo.style.transform = `scale(${noScale})`;
  }
});

btnBackToCollage.addEventListener("click", () => {
  playSound();
  if (confettiInterval) clearInterval(confettiInterval);
  confettiInterval = null;
  screenGame.classList.add("collage-view");
  collageActions.classList.remove("hidden");
  showScreen(screenGame);
});

btnDownloadCollage.addEventListener("click", () => {
  playSound();
  const link = document.createElement("a");
  link.download = "our-memories.png";
  link.href = new URL("images/our-memories-story.png", window.location.href).href;
  link.click();
});

// ===== INIT =====
setPersonalMessage();

if (window.location.protocol === "file:") {
  const msg = document.createElement("div");
  msg.style.cssText = "position:fixed;top:0;left:0;right:0;background:#8b5a6b;color:white;padding:1rem;text-align:center;z-index:9999;font-family:Nunito,sans-serif;";
  msg.innerHTML = "⚠️ Open with a local server (not file://). Run: <code>python3 -m http.server 3000</code> then go to <code>http://localhost:3000</code>";
  document.body.prepend(msg);
}
