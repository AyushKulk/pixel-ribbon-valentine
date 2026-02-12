/* ============================================
   PIXEL RIBBON VALENTINE - App Logic
   ============================================ */

// ===== CUSTOMIZE HERE =====
const CONFIG = {
  name: "",
  message: "You make every day feel special. 💗",
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
  { src: "images/ballard.jpeg", caption: "Ballard memories" },
  { src: "images/bday.JPEG", caption: "Birthday celebration" },
  { src: "images/crater.jpeg", caption: "Crater Lake adventure" },
  { src: "images/formal2024.JPEG", caption: "Formal evening 2024" },
  { src: "images/formal2025.JPEG", caption: "Formal evening 2025" },
  { src: "images/formal2025_1.jpeg", caption: "Dressed up together" },
  { src: "images/formal2025_2.JPG", caption: "Another special night" },
  { src: "images/h&m.jpeg", caption: "H&M shopping day" },
  { src: "images/halloween1.PNG", caption: "Halloween fun" },
  { src: "images/halloween2.jpeg", caption: "Spooky season together" },
  { src: "images/holi.jpeg", caption: "Holi celebration" },
  { src: "images/ikea.jpeg", caption: "IKEA adventure" },
  { src: "images/kygo.jpeg", caption: "Kygo concert night" },
  { src: "images/leavenworth.jpeg", caption: "Leavenworth getaway" },
  { src: "images/market.jpeg", caption: "Market day outing" },
  { src: "images/neon.JPG", caption: "Neon nights" },
  { src: "images/summer_1.jpeg", caption: "Summer sunshine" },
  { src: "images/weeknd.JPG", caption: "The Weeknd concert" },
  { src: "images/xmas.jpeg", caption: "Christmas memories" },
  { src: "images/zoo.jpeg", caption: "Day at the zoo" },
];
let PHOTOS = [...PHOTOS_RAW]; // Sorted by date after load

// ===== STATE =====
let soundEnabled = true;
let revealedCount = 0;
let photoQueue = [];
let yesScale = 1;
let noScale = 1;

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
  fallingZone.innerHTML = "";
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
  img.loading = "lazy";
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
  await sortPhotosByDate();
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
  screenGame.classList.add("collage-view");
  collageActions.classList.remove("hidden");
  showScreen(screenGame);
});

async function getImageSourcesFromDOM() {
  const polaroids = memoryBoard.querySelectorAll(".polaroid");
  return Promise.all(
    Array.from(polaroids).map(async (p) => {
      const img = p.querySelector(".polaroid-img img");
      if (!img || !img.src) return null;
      try {
        if (img.src.startsWith("data:")) return img.src;
        const url = new URL(img.src, window.location.href).href;
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      } catch {
        return img.src;
      }
    })
  );
}

async function downloadCollageAsPng(sources) {
  const STORY_W = 1080;
  const STORY_H = 1920;
  const PAD_TOP = 12, PAD_SIDES = 12, PAD_BOTTOM = 36;
  const CORNER_RADIUS = 4;
  const margin = 24;
  const gap = 14;
  const HEADER_HEIGHT = 360;
  const BOTTOM_HEIGHT = 200;
  const MIFFY_HEADER_SIZE = 180;
  const MIFFY_TOP_RIGHT_SIZE = 200;
  const MIFFY_BOTTOM_SIZE = 240;
  const MIFFY_MARGIN = 20;
  const DECORATION_MIN_SIZE = 100;
  const DECORATION_MAX_SIZE = 130;
  const DECORATION_PADDING = 45;
  const DECORATION_CLUSTER_WIDTH = 640;

  const DECORATIONS = [
    "images/decorations/black_cat.png",
    "images/decorations/white_brown_cat.png",
    "images/decorations/yoshimoto_nara.png",
    "images/decorations/vivienne_westwood.png",
    "images/decorations/maison_margiela.png",
    "images/decorations/matcha.png",
    "images/decorations/nyc.png",
  ];

  const TITLE = "Always & Forever";
  const NOTE = "I love our little world we've created together, I want you to be my forever Valentine ♥";

  const CREAM = "#faf6f0", LAVENDER = "#d4c4f0", PINK = "#f4b8c4", CREAM_DARK = "#f0ebe3";

  try {
    await document.fonts.ready;
    const valid = sources.filter(Boolean);
    if (!valid.length) throw new Error("No images to export");

    const cols = Math.max(3, Math.ceil(Math.sqrt(valid.length * 1.2)));
    const rows = Math.ceil(valid.length / cols);

    const contentH = STORY_H - HEADER_HEIGHT - BOTTOM_HEIGHT - margin * 2;
    const availH = contentH - gap * (rows + 1);
    const availW = (STORY_W - margin * 2 - gap * (cols + 1)) / cols;

    let polaroidH = Math.max(90, availH / rows);
    let imgSize = polaroidH - PAD_TOP - PAD_BOTTOM;
    let polaroidW = imgSize + PAD_SIDES * 2;

    if (polaroidW > availW) {
      polaroidW = availW;
      imgSize = polaroidW - PAD_SIDES * 2;
      polaroidH = imgSize + PAD_TOP + PAD_BOTTOM;
    }

    const gridW = cols * polaroidW + (cols - 1) * gap;
    const gridH = rows * polaroidH + (rows - 1) * gap;
    const offsetX = margin + (STORY_W - margin * 2 - gridW) / 2 + polaroidW / 2;
    const offsetY = HEADER_HEIGHT + margin + (contentH - gridH) / 2 + polaroidH / 2;

    const out = document.createElement("canvas");
    out.width = STORY_W;
    out.height = STORY_H;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Canvas failed");

    const grad = ctx.createLinearGradient(STORY_W * 0.1, 0, STORY_W * 0.9, STORY_H);
    grad.addColorStop(0, CREAM);
    grad.addColorStop(0.3, LAVENDER);
    grad.addColorStop(0.7, PINK);
    grad.addColorStop(1, CREAM_DARK);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STORY_W, STORY_H);

    const removeLightBackground = (img) => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const cctx = c.getContext("2d");
      if (!cctx) return c;
      cctx.drawImage(img, 0, 0);
      let id;
      try {
        id = cctx.getImageData(0, 0, c.width, c.height);
      } catch {
        return c;
      }
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const isWhite = r > 250 && g > 250 && b > 250;
        const isLightBg = r > 245 && g > 240 && b > 242;
        if (isWhite) d[i + 3] = 0;
        else if (isLightBg) d[i + 3] = Math.max(0, Math.round(d[i + 3] * (255 - r) / 15));
      }
      cctx.putImageData(id, 0, 0);
      return c;
    };
    const drawMiffy = (img, x, y, opts = {}) => {
      if (!img) return;
      const { alignRight, alignBottom, alignCenter, maxSize, moveUpByHalfHeight } = opts;
      const sz = maxSize ?? MIFFY_TOP_RIGHT_SIZE;
      const scale = Math.min(sz / img.width, sz / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const dx = alignCenter ? x - w / 2 : (alignRight ? x - w : x);
      let dy = alignCenter ? y - h / 2 : (alignBottom ? y - h : y);
      if (moveUpByHalfHeight) dy -= h / 2;
      try {
        const cleaned = removeLightBackground(img);
        ctx.drawImage(cleaned, 0, 0, cleaned.width, cleaned.height, dx, dy, w, h);
      } catch {
        ctx.drawImage(img, dx, dy, w, h);
      }
    };

    const drawPolaroid = (img, cx, cy, rotation) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);

      const w = polaroidW;
      const h = polaroidH;
      const x = -w / 2;
      const y = -h / 2;

      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      if (ctx.roundRect) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, CORNER_RADIUS);
        ctx.fill();
      } else {
        ctx.fillStyle = "white";
        ctx.beginPath();
        const r = CORNER_RADIUS;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      const cropSize = Math.min(img.width, img.height);
      const sx = (img.width - cropSize) / 2;
      const sy = (img.height - cropSize) / 2;
      const ix = x + PAD_SIDES;
      const iy = y + PAD_TOP;

      ctx.drawImage(img, sx, sy, cropSize, cropSize, ix, iy, imgSize, imgSize);
      ctx.restore();
    };

    const loadImg = (path) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = new URL(path, window.location.href).href;
      });

    const [loadResults, miffyLeft, miffyRight, decorationImgs] = await Promise.all([
      Promise.allSettled(
        valid.map((src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Load failed"));
            img.src = src;
          });
        })
      ),
      loadImg("images/miffy_and_smiski.png"),
      loadImg("images/miffy_balloon.png"),
      Promise.all(DECORATIONS.map(loadImg)),
    ]);
    const loadedImages = loadResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    if (!loadedImages.length) throw new Error("No images could be loaded. Check that image paths in PHOTOS are correct (e.g. images/photo.jpg).");

    const actualCols = Math.max(3, Math.ceil(Math.sqrt(loadedImages.length * 1.2)));
    const actualRows = Math.ceil(loadedImages.length / actualCols);
    const actualAvailH = contentH - gap * (actualRows + 1);
    const actualAvailW = (STORY_W - margin * 2 - gap * (actualCols + 1)) / actualCols;
    polaroidH = Math.max(90, actualAvailH / actualRows);
    imgSize = polaroidH - PAD_TOP - PAD_BOTTOM;
    polaroidW = imgSize + PAD_SIDES * 2;
    if (polaroidW > actualAvailW) {
      polaroidW = actualAvailW;
      imgSize = polaroidW - PAD_SIDES * 2;
      polaroidH = imgSize + PAD_TOP + PAD_BOTTOM;
    }
    const actualGridW = actualCols * polaroidW + (actualCols - 1) * gap;
    const actualGridH = actualRows * polaroidH + (actualRows - 1) * gap;
    const actualOffsetX = margin + (STORY_W - margin * 2 - actualGridW) / 2 + polaroidW / 2;
    const actualOffsetY = HEADER_HEIGHT + margin + (contentH - actualGridH) / 2 + polaroidH / 2;

    loadedImages.forEach((img, i) => {
      const col = i % actualCols;
      const row = Math.floor(i / actualCols);
      const baseX = actualOffsetX + col * (polaroidW + gap);
      const baseY = actualOffsetY + row * (polaroidH + gap);
      const jitterX = (Math.random() - 0.5) * 24;
      const jitterY = (Math.random() - 0.5) * 20;
      const rotation = (Math.random() - 0.5) * 10;
      drawPolaroid(img, baseX + jitterX, baseY + jitterY, rotation);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#6b5b7a";
    ctx.font = "600 48px Quicksand, Nunito, sans-serif";
    ctx.fillText(TITLE, STORY_W / 2, 78);

    const wrapText = (text, maxWidth, fontSize) => {
      const words = text.split(" ");
      const lines = [];
      let line = "";
      ctx.font = `400 ${fontSize}px Quicksand, Nunito, sans-serif`;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        const m = ctx.measureText(test);
        if (m.width > maxWidth && line) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    };
    const noteLines = wrapText(NOTE, STORY_W - margin * 4, 32);
    ctx.font = "400 32px Quicksand, Nunito, sans-serif";
    ctx.fillStyle = "#7a6b8a";
    const titleBottom = 78 + 36;
    const miffyHeaderCenter = titleBottom + 24 + MIFFY_HEADER_SIZE / 2;
    const miffyHeaderBottom = miffyHeaderCenter + MIFFY_HEADER_SIZE / 2;
    drawMiffy(miffyRight, STORY_W / 2, miffyHeaderCenter, { alignCenter: true, maxSize: MIFFY_HEADER_SIZE });

    const imagesStart = actualOffsetY - polaroidH / 2;
    const captionCenter = (miffyHeaderBottom + 20 + imagesStart) / 2;
    const lineHeight = 42;
    const noteY = captionCenter - ((noteLines.length - 1) * lineHeight) / 2;
    noteLines.forEach((line, i) => {
      ctx.fillText(line, STORY_W / 2, noteY + i * lineHeight);
    });

    const bottomCenterY = STORY_H - BOTTOM_HEIGHT / 2 - 90;
    const miffyBottomSize = MIFFY_BOTTOM_SIZE * 1.5;
    const gridTop = actualOffsetY - polaroidH / 2 - DECORATION_PADDING;
    const gridBottom = actualOffsetY + (actualRows - 1) * (polaroidH + gap) + polaroidH / 2 + DECORATION_PADDING;
    const gridLeft = actualOffsetX - polaroidW / 2 - DECORATION_PADDING;
    const gridRight = actualOffsetX + (actualCols - 1) * (polaroidW + gap) + polaroidW / 2 + DECORATION_PADDING;
    const zoneTop = gridBottom + 20;
    const zoneBottom = STORY_H - margin - 20;
    const zoneLeft = STORY_W / 2 - DECORATION_CLUSTER_WIDTH / 2;
    const zoneRight = STORY_W / 2 + DECORATION_CLUSTER_WIDTH / 2;

    const placedRects = [];
    const addRect = (x, y, w, h) => {
      placedRects.push({ x: x - w / 2, y: y - h / 2, w, h });
    };
    const overlaps = (cx, cy, w, h) => {
      const r = { x: cx - w / 2, y: cy - h / 2, w, h };
      if (r.x < margin || r.x + w > STORY_W - margin || r.y < zoneTop || r.y + h > STORY_H - margin) return true;
      const gridR = { x: gridLeft, y: gridTop, w: gridRight - gridLeft, h: gridBottom - gridTop };
      if (r.x + r.w > gridR.x && r.x < gridR.x + gridR.w && r.y + r.h > gridR.y && r.y < gridR.y + gridR.h) return true;
      const miffyR = { x: STORY_W / 2 - miffyBottomSize / 2 - DECORATION_PADDING, y: bottomCenterY - miffyBottomSize / 2 - DECORATION_PADDING, w: miffyBottomSize + DECORATION_PADDING * 2, h: miffyBottomSize + DECORATION_PADDING * 2 };
      if (r.x + r.w > miffyR.x && r.x < miffyR.x + miffyR.w && r.y + r.h > miffyR.y && r.y < miffyR.y + miffyR.h) return true;
      return placedRects.some((p) => r.x + r.w > p.x && r.x < p.x + p.w && r.y + r.h > p.y && r.y < p.y + p.h);
    };

    drawMiffy(miffyLeft, STORY_W / 2, STORY_H - BOTTOM_HEIGHT / 2, { alignCenter: true, maxSize: miffyBottomSize, moveUpByHalfHeight: true });

    decorationImgs.forEach((img) => {
      if (!img) return;
      const size = DECORATION_MIN_SIZE + Math.random() * (DECORATION_MAX_SIZE - DECORATION_MIN_SIZE);
      const scale = Math.min(size / img.width, size / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      let cx, cy;
      for (let attempt = 0; attempt < 80; attempt++) {
        cx = zoneLeft + Math.random() * (zoneRight - zoneLeft);
        cy = zoneTop + Math.random() * (zoneBottom - zoneTop);
        if (!overlaps(cx, cy, w, h)) break;
      }
      const tilt = Math.random() < 0.7 ? (Math.random() - 0.5) * 16 : 0;
      const checkW = tilt ? w * 1.15 : w;
      const checkH = tilt ? h * 1.15 : h;
      if (overlaps(cx, cy, checkW, checkH)) return;
      addRect(cx, cy, checkW, checkH);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((tilt * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });

    const link = document.createElement("a");
    link.download = "our-memories.png";
    link.href = out.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Download error:", err);
    const msg = err?.message || String(err);
    if (msg.includes("Tainted") || window.location.protocol === "file:") {
      alert(
        "Download failed: You must use a local server.\n\n" +
          "In terminal, run:\n  cd pixel-ribbon-valentine\n  python3 -m http.server 3000\n\n" +
          "Then open http://localhost:3000"
      );
    } else {
      alert(`Download failed: ${msg}\n\nCheck the browser console for details.`);
    }
  }
}

btnDownloadCollage.addEventListener("click", async () => {
  playSound();
  const sources = await getImageSourcesFromDOM();
  await downloadCollageAsPng(sources);
});

$("#btn-download-dev").addEventListener("click", async () => {
  playSound();
  const sources = await Promise.all(
    PHOTOS.map(async (p) => {
      try {
        if (p.src.startsWith("data:")) return p.src;
        const url = new URL(p.src, window.location.href).href;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      } catch (e) {
        return new URL(p.src, window.location.href).href;
      }
    })
  );
  await downloadCollageAsPng(sources);
});

// ===== INIT =====
setPersonalMessage();

if (window.location.protocol === "file:") {
  const msg = document.createElement("div");
  msg.style.cssText = "position:fixed;top:0;left:0;right:0;background:#8b5a6b;color:white;padding:1rem;text-align:center;z-index:9999;font-family:Nunito,sans-serif;";
  msg.innerHTML = "⚠️ Open with a local server (not file://). Run: <code>python3 -m http.server 3000</code> then go to <code>http://localhost:3000</code>";
  document.body.prepend(msg);
}
