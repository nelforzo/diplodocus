/**
 * reader.js — Full-screen reader view.
 *
 * Manages the reader HTML section, wires the TTSEngine to the UI,
 * and handles keyboard shortcuts while the reader is open.
 */

import { TTSEngine } from './tts.js';
import { escapeHtml, coverGradient } from './utils.js';

// ── Module state ──────────────────────────────────────────────

let engine    = null;
let coverUrl  = null;
let lastState = 'idle';
let kbAbort   = null;   // AbortController for keyboard listener

// ── DOM refs ──────────────────────────────────────────────────

const readerView  = document.getElementById('reader-view');
const elBookTitle = document.getElementById('reader-book-title');
const elCover     = document.getElementById('reader-cover');
const elChapter   = document.getElementById('reader-chapter-title');
const elSentence  = document.getElementById('reader-sentence');
const elFill      = document.getElementById('reader-progress-fill');
const elLabel     = document.getElementById('reader-progress-label');
const btnBack     = document.getElementById('reader-back-btn');
const btnRewind   = document.getElementById('ctrl-rewind');
const btnPlay     = document.getElementById('ctrl-play');
const btnStop     = document.getElementById('ctrl-stop');
const btnForward  = document.getElementById('ctrl-forward');

// ── Public API ────────────────────────────────────────────────

/**
 * Opens the reader for a book object (as stored in / returned from Dexie).
 * @param {{ id: number, title: string, coverBlob: Blob|null }} book
 */
export async function openReader(book) {
  _destroyEngine();
  _releaseCover();

  if (!('speechSynthesis' in window)) {
    alert('Text-to-speech is not supported in this browser.');
    return;
  }

  // Header
  elBookTitle.textContent = book.title;

  // Cover art
  if (book.coverBlob) {
    coverUrl = URL.createObjectURL(book.coverBlob);
    elCover.innerHTML = `<img src="${coverUrl}" alt="${escapeHtml(book.title)} cover">`;
  } else {
    const grad = coverGradient(book.title);
    const ltr  = escapeHtml(book.title.charAt(0).toUpperCase());
    elCover.innerHTML = `
      <div class="reader-cover-placeholder" style="background:${grad}">
        <span class="reader-cover-letter">${ltr}</span>
      </div>`;
  }

  // Show reader, hide library
  readerView.classList.remove('hidden');
  document.getElementById('main').classList.add('hidden');
  document.querySelector('.app-header').classList.add('hidden');

  // Reset UI to loading state
  _render({ state: 'loading', chapIdx: 0, sentIdx: 0, totalChapters: 0, chapterTitle: '', currentSentence: '' });

  // Keyboard shortcuts
  kbAbort = new AbortController();
  document.addEventListener('keydown', _onKeyDown, { signal: kbAbort.signal });

  // Start engine
  engine = new TTSEngine(_render);
  try {
    await engine.open(book.id);
  } catch (err) {
    elChapter.textContent  = 'Failed to load book';
    elSentence.textContent = err.message;
  }
}

/** Stops playback, saves position, and returns to the library. */
export function closeReader() {
  engine?.stop();
  _destroyEngine();
  _releaseCover();
  kbAbort?.abort();
  kbAbort = null;

  readerView.classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
  document.querySelector('.app-header').classList.remove('hidden');
}

// ── Engine → UI ───────────────────────────────────────────────

function _render({ state, chapIdx, sentIdx, totalChapters, chapterTitle, currentSentence }) {
  lastState = state;

  // Chapter title / sentence
  if (totalChapters === 0 && state !== 'loading') {
    elChapter.textContent  = 'No chapters found';
    elSentence.textContent = 'Remove and re-import this book to enable playback.';
  } else {
    elChapter.textContent  = chapterTitle || '—';
    elSentence.textContent =
      state === 'loading' ? 'Loading…' :
      state === 'stopped' && !currentSentence ? 'Press play to start.' :
      currentSentence;
  }

  // Chapter progress
  const chNum = chapIdx + 1;
  elFill.style.width  = totalChapters > 0 ? `${(chNum / totalChapters) * 100}%` : '0%';
  elLabel.textContent = totalChapters > 0 ? `Chapter ${chNum} of ${totalChapters}` : '';

  // Play/Pause icon toggle
  const isPlaying = state === 'playing';
  btnPlay.innerHTML = isPlaying ? _iconPause() : _iconPlay();
  btnPlay.title     = isPlaying ? 'Pause' : 'Play';
  btnPlay.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');

  // Enable / disable controls
  const ready = state !== 'idle' && state !== 'loading' && totalChapters > 0;
  btnPlay.disabled    = !ready;
  btnStop.disabled    = !ready || state === 'stopped';
  btnRewind.disabled  = !ready;
  btnForward.disabled = !ready;

  readerView.dataset.state = state;
}

// ── Button handlers ───────────────────────────────────────────

btnBack.addEventListener('click', closeReader);

btnPlay.addEventListener('click', () => {
  if (!engine) return;
  if (lastState === 'playing') engine.pause();
  else engine.play();
});

btnStop.addEventListener('click', () => engine?.stop());

btnRewind.addEventListener('click', () => engine?.rewind());

btnForward.addEventListener('click', () => engine?.forward());

// ── Keyboard shortcuts ────────────────────────────────────────

function _onKeyDown(e) {
  if (e.target.closest('input, textarea, select, button')) return;
  switch (e.key) {
    case ' ':
      e.preventDefault();
      if (lastState === 'playing') engine?.pause();
      else engine?.play();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      engine?.rewind();
      break;
    case 'ArrowRight':
      e.preventDefault();
      engine?.forward();
      break;
    case 'Escape':
      closeReader();
      break;
  }
}

// ── Helpers ───────────────────────────────────────────────────

function _destroyEngine() {
  engine?.destroy();
  engine    = null;
  lastState = 'idle';
}

function _releaseCover() {
  if (coverUrl) { URL.revokeObjectURL(coverUrl); coverUrl = null; }
  elCover.innerHTML = '';
}

function _iconPlay() {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`;
}

function _iconPause() {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>`;
}
