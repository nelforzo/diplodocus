# Diplodocus

A local-first e-reader that **listens, not reads**.

Diplodocus is a browser-based EPUB reader with a twist: instead of displaying the text of a book on screen, it uses the browser's built-in Text-to-Speech engine (Web Speech API) to read it aloud. Your library and all book files live entirely in the browser — nothing is sent to a server.

---

## How it works

1. **Import** EPUB files from your file system (file picker or drag-and-drop).
2. **Open** a book — the reader screen shows playback controls, not text.
3. **Listen.** The app reads the book chapter by chapter, sentence by sentence.
4. **Stop anytime.** Your position is saved automatically.
5. **Resume** exactly where you left off the next time you open the book.

---

## Storage model

| What | Where | Why |
|---|---|---|
| EPUB files (raw) | Cache Storage | Large binary blobs, served efficiently |
| Book metadata, covers, reading position | IndexedDB (Dexie) | Structured, queryable, persistent |

---

## Playback controls

| Control | Action |
|---|---|
| **Rewind** | Jump to the start of the current chapter |
| **Play / Pause** | Start or pause narration |
| **Stop** | Stop narration and save position |
| **Forward** | Skip to the next chapter |

---

## Current state

- [x] Library screen — grid view of imported books
- [x] EPUB import — file picker and drag-and-drop, duplicate detection
- [x] EPUB metadata extraction — title, author, cover image
- [x] Cache Storage layer for raw EPUB files
- [x] IndexedDB (Dexie) schema for book metadata and chapters
- [x] EPUB spine + TOC parsing (EPUB 2 NCX and EPUB 3 nav)
- [x] HTML text extraction (block-level DOM traversal)
- [x] Sentence tokenizer with abbreviation and decimal protection

---

## Roadmap

### Phase 2 — EPUB content extraction ✓
Parse the readable content out of an EPUB so the TTS engine has clean text to work with.

- [x] Parse EPUB spine to produce an ordered list of content documents
- [x] Extract and clean body text from HTML content files (strip tags, handle whitespace)
- [x] Parse the Table of Contents (NCX / EPUB 3 nav) to get named chapters
- [x] Tokenise each chapter into sentences (splitting on `.`, `?`, `!` with edge-case handling)
- [x] Store the parsed chapter list in IndexedDB (`chapters` table, keyed by `bookId`)

### Phase 3 — TTS reader engine
Wrap the Web Speech API into a reliable, stateful playback engine.

- [ ] Sentence-queue player using `SpeechSynthesisUtterance`
- [ ] Handle browser quirks (Chrome utterance length limit, iOS pause/resume bugs)
- [ ] Chapter boundary detection — advance automatically when a chapter ends
- [ ] Expose a clean API: `play()`, `pause()`, `stop()`, `seek(chapter, sentence)`

### Phase 4 — Reader screen & controls
A dedicated screen that opens when a book is tapped from the library.

- [ ] Reader route / view (no page reload — swap views in JS)
- [ ] Playback controls: Rewind, Play/Pause, Stop, Forward
- [ ] Display current chapter title and overall book progress
- [ ] Visual sentence highlight or scrolling transcript (optional, secondary to audio)

### Phase 5 — Position persistence
Never lose your place.

- [ ] Save `{ chapterIndex, sentenceIndex }` to IndexedDB on Stop and on page unload
- [ ] Restore position automatically when a book is reopened
- [ ] Show progress indicator per book on the library card (e.g. "Chapter 4 of 12")

### Phase 6 — Playback settings
- [ ] Voice selector (list available `SpeechSynthesisVoice` entries)
- [ ] Speed control (0.5× – 2×)
- [ ] Pitch control
- [ ] Persist settings per-book or globally in IndexedDB

### Phase 7 — Polish & UX
- [ ] Keyboard shortcuts (Space = play/pause, ← → = chapter nav)
- [ ] Sleep timer (stop after N minutes)
- [ ] Chapter list / jump-to-chapter panel
- [ ] Book detail screen (title, author, file size, time remaining estimate)
- [ ] Library sort and filter options

---

## Running locally

ES modules and the Cache Storage API require a server — open `index.html` directly over `file://` will not work.

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# Deno
deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts
```

Then open `http://localhost:8000`.

---

## Tech stack

- **Vanilla JS** (ES modules, no framework)
- **Standard CSS** (custom properties, grid, no preprocessor)
- **Dexie.js** — ergonomic IndexedDB wrapper
- **JSZip** — EPUB/ZIP parsing in the browser
- **Web Speech API** — browser-native TTS, no API key required
