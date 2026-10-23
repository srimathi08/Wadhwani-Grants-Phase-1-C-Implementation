/**
 * wcfPdfFonts — U28 fix: "PDF drops or garbles some characters".
 *
 * Root cause
 *   jsPDF's built-in fonts (helvetica/times/courier) only know WinAnsi (cp1252).
 *   Any character outside that set is written as its raw UTF-16 bytes, so
 *   "≥" (U+2265 → bytes 0x22 0x65) prints as `"e`, which is exactly what the
 *   UAT screenshot shows ("50% "e40%"). CJK, Devanagari, ₹ and many accented
 *   letters (ċ, Ũ) break the same way.
 *
 * Fix
 *   1. Register a Unicode TTF (Noto Sans, 4 styles) on each jsPDF doc.
 *   2. Clean every string jsPDF draws or measures: NFC-normalise, remove
 *      invisible control characters, and replace glyphs the font does not
 *      have with a readable fallback (">=", "Rs", "?") instead of garbage.
 *   3. plainTextToHtml(): escape plain-text answers before they reach the
 *      HTML parser in htmlToParagraphs(), so "<" and ">" are not swallowed
 *      as tags.
 *
 * Nothing here changes layout, sizes, colours or page logic.
 *
 * Static resource required: "NotoSansFonts" (zip) containing at its root
 *   NotoSans-Regular.ttf, NotoSans-Bold.ttf,
 *   NotoSans-Italic.ttf, NotoSans-BoldItalic.ttf
 * (static TTFs from https://fonts.google.com/noto/specimen/Noto+Sans, OFL licence)
 */
import NOTO_SANS from '@salesforce/resourceUrl/NotoSansFonts';

export const PDF_FONT = 'NotoSans';

const FONT_FILES = {
    normal: 'NotoSans-Regular.ttf',
    bold: 'NotoSans-Bold.ttf',
    italic: 'NotoSans-Italic.ttf',
    bolditalic: 'NotoSans-BoldItalic.ttf'
};

// cp1252 characters above 0x7F that are not in Latin-1 (helvetica can draw these)
const CP1252_EXTRA = new Set([
    0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030,
    0x0160, 0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
    0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178
]);

// Readable stand-ins, used only when the active font has no glyph
const FALLBACK = {
    '\u2264': '<=', '\u2265': '>=', '\u2260': '!=', '\u2248': '~',
    '\u20B9': 'Rs', '\u2212': '-', '\u2010': '-', '\u2011': '-',
    '\u2192': '->', '\u2190': '<-', '\u2194': '<->',
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
    '\u2013': '-', '\u2014': '-', '\u2026': '...', '\u2022': '*',
    '\u2713': 'v', '\u2714': 'v', '\u2717': 'x', '\u2718': 'x'
};

const SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u2028\u2029\u2060\uFEFF]/g;

let fontCache = null; // Promise<{ [style]: base64 }>

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

/** Fetches the four TTFs once per page load and caches them as base64. */
export function loadPdfFonts() {
    if (!fontCache) {
        fontCache = Promise.all(
            Object.entries(FONT_FILES).map(async ([style, file]) => {
                const res = await fetch(`${NOTO_SANS}/${file}`);
                if (!res.ok) throw new Error(`Font ${file} failed to load (${res.status})`);
                return [style, arrayBufferToBase64(await res.arrayBuffer())];
            })
        )
            .then(entries => Object.fromEntries(entries))
            .catch(err => {
                fontCache = null; // allow a retry on the next download
                throw err;
            });
    }
    return fontCache;
}

/** Registers Noto Sans on one jsPDF instance. Returns true when it is active. */
export async function registerPdfFonts(doc) {
    try {
        const fonts = await loadPdfFonts();
        Object.entries(fonts).forEach(([style, b64]) => {
            const vfsName = `${PDF_FONT}-${style}.ttf`;
            doc.addFileToVFS(vfsName, b64);
            doc.addFont(vfsName, PDF_FONT, style);
        });
        doc.setFont(PDF_FONT, 'normal');
        return true;
    } catch (e) {
        // Fallback: keep helvetica; the cleaner below still prevents garbled output.
        console.warn('Unicode PDF font unavailable, using safe fallback:', e?.message || e);
        return false;
    }
}

/** Builds a cleaner that makes any string safe for the font that is active. */
export function createPdfTextCleaner(doc, unicodeReady) {
    let hasGlyph = null;
    if (unicodeReady) {
        try {
            const meta = doc.getFont(PDF_FONT, 'normal')?.metadata;
            if (meta && typeof meta.characterToGlyph === 'function') {
                hasGlyph = cp => meta.characterToGlyph(cp) !== 0;
            }
        } catch (e) { /* no glyph table: trust the font */ }
    }
    const inWinAnsi = cp => (cp >= 0x20 && cp <= 0x7E) || (cp >= 0xA0 && cp <= 0xFF) || CP1252_EXTRA.has(cp);
    const supported = unicodeReady ? (hasGlyph || (() => true)) : inWinAnsi;

    const memo = new Map();
    const cleanChar = ch => {
        if (ch === '\n' || ch === '\t') return ch;
        if (memo.has(ch)) return memo.get(ch);
        let out;
        const cp = ch.codePointAt(0);
        if (supported(cp)) {
            out = ch;
        } else if (FALLBACK[ch] !== undefined) {
            out = FALLBACK[ch];
        } else {
            // e.g. "ċ" -> "c" when the accented form is not drawable
            const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            out = (base && base !== ch && [...base].every(b => supported(b.codePointAt(0)))) ? base : '?';
        }
        memo.set(ch, out);
        return out;
    };

    const clean = value => {
        if (value === null || value === undefined || typeof value === 'number') return value;
        const s = String(value)
            .normalize('NFC')
            .replace(/\r\n?/g, '\n')
            .replace(SPACES, ' ')
            .replace(INVISIBLE, '');
        let out = '';
        for (const ch of s) out += cleanChar(ch); // for..of keeps surrogate pairs (emoji, rare CJK) whole
        return out;
    };

    return value => (Array.isArray(value) ? value.map(clean) : clean(value));
}

/**
 * Routes every draw/measure call through the cleaner. jspdf-autotable draws
 * through the same doc.text / splitTextToSize, so tables are covered too.
 */
export function applyPdfTextCleaner(doc, clean) {
    const text = doc.text.bind(doc);
    const getTextWidth = doc.getTextWidth.bind(doc);
    const splitTextToSize = doc.splitTextToSize.bind(doc);
    doc.text = (t, ...rest) => text(clean(t), ...rest);
    doc.getTextWidth = t => getTextWidth(clean(t));
    doc.splitTextToSize = (t, ...rest) => splitTextToSize(clean(t), ...rest);
    return doc;
}

/**
 * One call per download, right after `new jsPDF()`.
 * Returns the family name to pass to autoTable's `styles.font`.
 */
export async function preparePdfDoc(doc) {
    const unicodeReady = await registerPdfFonts(doc);
    applyPdfTextCleaner(doc, createPdfTextCleaner(doc, unicodeReady));
    return { fontFamily: unicodeReady ? PDF_FONT : 'helvetica', unicodeReady };
}

/**
 * Plain-text answers (lightning-textarea, not the rich editor) must be escaped
 * before htmlToParagraphs() parses them, or text such as "a<b and c>d" is read
 * as a tag and dropped. Values that are already editor HTML pass through.
 *
 * Only a well-formed tag counts as HTML: a known tag name followed by nothing
 * but name="value" attributes, e.g. <b>, <p class="x">, <br/>. Text such as
 * "a<b, c>d" is not a tag, so it is escaped and prints exactly as typed.
 * Pass alwaysPlain = true to escape regardless.
 */
const EDITOR_TAG = /<\/?(p|div|br|b|i|u|s|strong|em|ul|ol|li|span|h[1-6])(\s+[a-z-]+\s*=\s*("[^"]*"|'[^']*'))*\s*\/?>/i;

export function plainTextToHtml(value, alwaysPlain = false) {
    if (value === null || value === undefined) return value;
    const s = String(value);
    if (!alwaysPlain && EDITOR_TAG.test(s)) return s;
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r\n?|\n/g, '<br>');
}