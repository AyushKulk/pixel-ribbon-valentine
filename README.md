# Pixel Ribbon Valentine 💗

A small, polished web app to ask someone special to be your Valentine. Photos fall gently from the top—tap each one to reveal it as a polaroid. The page fills with your memories before the big question.

## Run locally

```bash
cd pixel-ribbon-valentine
npx serve .
# Open http://localhost:3000
```

**Note:** Use a local server (not just `open index.html`) so images load correctly.

## Add your photos

1. Put your images in the `images/` folder (e.g. `photo1.jpg`, `photo2.jpg`).
2. Edit the `PHOTOS` array at the top of `app.js`:

```javascript
const PHOTOS = [
  { src: "images/photo1.jpg", caption: "Our first date" },
  { src: "images/photo2.jpg", caption: "Trip to the mountains" },
  { src: "images/photo3.jpg", caption: "Coffee shop afternoon" },
  // ... add as many as you like
];
```

Use any image format (jpg, png, webp). Captions appear under each photo in the polaroid style.

## Customize

Edit the `CONFIG` object in `app.js`:

```javascript
const CONFIG = {
  name: "Her name",
  message: "You make every day feel special. 💗",
  dateLocation: "February 14th",
};
```

## Tech

- Vanilla HTML/CSS/JS
- No backend, no build step
- Responsive (iPad + MacBook)
- Touch-friendly
