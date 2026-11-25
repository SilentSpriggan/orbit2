/* Writes plain report text as a PDF. Uses the built-in Helvetica fonts, so the app stays offline and needs no library. */
const PdfLogic = (() => {
  const PAGE = { width: 612, height: 792, margin: 54, footer: 46 };
  const INK = '0.11 0.14 0.19', MUTED = '0.36 0.40 0.46', ACCENT = '0.10 0.23 0.37', RULE = '0.80 0.83 0.87', LABEL = '1 0.95 0.80';
  const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const WIDE = '—…™‰€Œœ', BOLD_SCALE = 1.06;
  const WINDOWS = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
  const SWAPS = { '‐': '-', '‑': '-', '‒': '-', '−': '-', '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '≈': '~' };
  const printable = ch => { const code = ch.codePointAt(0); return (code >= 32 && code <= 126) || (code >= 160 && code <= 255) || ch in WINDOWS; };

  /* Dates from toLocaleString contain thin no-break spaces, so spaces are normalised before fonts are considered. */
  function clean(text, stats) {
    const flat = String(text ?? '').normalize('NFC').replace(/[\s  -   　]/g, ' ').replace(/[\u0000-\u001F\u007F-\u009F­​-‍⁠﻿]/g, '');
    let out = '';
    for (const ch of flat) {
      const swap = SWAPS[ch] ?? ch;
      if ([...swap].every(printable)) out += swap;
      else { out += '?'; stats.replaced += 1; }
    }
    return out;
  }
  function charWidth(ch) {
    const base = ch.normalize('NFD')[0], code = base.charCodeAt(0);
    if (code >= 32 && code <= 126) return HELVETICA[code - 32];
    return WIDE.includes(ch) ? 1000 : ch === '•' ? 350 : 556;
  }
  function textWidth(text, size, bold = false) {
    let units = 0;
    for (const ch of text) units += charWidth(ch);
    return units * size / 1000 * (bold ? BOLD_SCALE : 1);
  }
  function wrap(text, width, size, bold = false) {
    const lines = [];
    let line = '';
    for (let word of text.split(' ').filter(Boolean)) {
      while (textWidth(word, size, bold) > width) {
        if (line) { lines.push(line); line = ''; }
        let cut = 1;
        while (textWidth(word.slice(0, cut + 1), size, bold) <= width) cut += 1;
        lines.push(word.slice(0, cut)); word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, bold) <= width) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  function pdfString(text) {
    let out = '';
    for (const ch of text) {
      const code = WINDOWS[ch] ?? ch.charCodeAt(0);
      if (ch === '(' || ch === ')' || ch === '\\') out += `\\${ch}`;
      else out += code >= 32 && code <= 126 ? ch : `\\${code.toString(8).padStart(3, '0')}`;
    }
    return `(${out})`;
  }

  /* Report text is blocks split by blank lines: a header, capitalised sections, then closing notes. */
  function parseText(text) {
    const blocks = String(text).split(/\n\s*\n/).map(block => block.split('\n').filter(line => line.trim())).filter(block => block.length);
    const [header = [], ...rest] = blocks, doc = { title: header[0] || 'ORBIT report', banner: '', meta: [], sections: [], notes: [] };
    for (const line of header.slice(1)) {
      if (line.includes('SYNTHETIC TRAINING DATA')) doc.banner = 'SYNTHETIC TRAINING DATA';
      else doc.meta.push(line);
    }
    rest.forEach((block, i) => {
      if (!/[a-z]/.test(block[0])) doc.sections.push({ title: block[0], lines: block.slice(1) });
      else if (i === rest.length - 1) doc.notes = block;
      else if (doc.sections.length) doc.sections.at(-1).lines.push(...block);
    });
    return doc;
  }

  function layout(doc) {
    const { width, height, margin, footer } = PAGE, content = width - margin * 2, bottom = margin + footer;
    const pages = [[]];
    let y = height - margin;
    const op = value => pages.at(-1).push(value);
    const text = (x, base, value, size, font = 'F1', color = INK) => op(`BT /${font} ${size} Tf ${color} rg ${x} ${base.toFixed(2)} Td ${pdfString(value)} Tj ET`);
    const rule = (at, color = RULE) => op(`${color} RG 0.75 w ${margin} ${at.toFixed(2)} m ${width - margin} ${at.toFixed(2)} l S`);
    const room = needed => { if (y - needed < bottom) { pages.push([]); y = height - margin; } };

    for (const line of wrap(doc.title, content, 18, true)) { text(margin, y - 18, line, 18, 'F2', ACCENT); y -= 24; }
    if (doc.banner) {
      y -= 2;
      op(`${LABEL} rg ${margin} ${(y - 20).toFixed(2)} ${content} 20 re f`);
      text(margin + 8, y - 14, doc.banner, 10, 'F2');
      y -= 28;
    }
    for (const line of doc.meta.flatMap(item => wrap(item, content, 10))) { text(margin, y - 10, line, 10, 'F1', MUTED); y -= 14; }
    y -= 4;
    rule(y, ACCENT);
    y -= 8;

    for (const section of doc.sections) {
      room(52);
      y -= 12;
      for (const line of wrap(section.title, content, 11, true)) { text(margin, y - 11, line, 11, 'F2', ACCENT); y -= 15; }
      rule(y);
      y -= 5;
      for (const item of section.lines) {
        const nested = /^\s/.test(item), left = margin + (nested ? 26 : 12);
        wrap(item.trim(), width - margin - left, 10).forEach((line, i) => {
          room(14);
          if (!i) text(left - 10, y - 10, nested ? '–' : '•', 10);
          text(left, y - 10, line, 10);
          y -= 14;
        });
      }
    }

    if (doc.notes.length) {
      room(30);
      y -= 12;
      rule(y);
      y -= 6;
      for (const line of doc.notes.flatMap(item => wrap(item, content, 9))) { room(12); text(margin, y - 9, line, 9, 'F1', MUTED); y -= 12; }
    }

    const crew = doc.meta.find(line => line.startsWith('Crew:'));
    const label = wrap([doc.title, crew, doc.banner].filter(Boolean).join('  ·  '), content - 70, 8)[0];
    return pages.map((page, i) => {
      const count = `Page ${i + 1} of ${pages.length}`;
      return [...page,
        `${RULE} RG 0.75 w ${margin} ${margin + 12} m ${width - margin} ${margin + 12} l S`,
        `BT /F1 8 Tf ${MUTED} rg ${margin} ${margin} Td ${pdfString(label)} Tj ET`,
        `BT /F1 8 Tf ${MUTED} rg ${(width - margin - textWidth(count, 8)).toFixed(2)} ${margin} Td ${pdfString(count)} Tj ET`
      ].join('\n');
    });
  }

  function serialise(title, streams) {
    const objects = [];
    const pageRef = i => 6 + i * 2;
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Count ${streams.length} /Kids [${streams.map((_, i) => `${pageRef(i)} 0 R`).join(' ')}] >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    objects[5] = `<< /Title ${pdfString(title)} /Producer (ORBIT Crew Health) >>`;
    streams.forEach((stream, i) => {
      objects[pageRef(i)] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageRef(i) + 1} 0 R >>`;
      objects[pageRef(i) + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    let out = '%PDF-1.4\n';
    const offsets = [];
    for (let i = 1; i < objects.length; i += 1) { offsets[i] = out.length; out += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(at => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}`;
    return `${out}trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  }

  function create(doc) {
    const stats = { replaced: 0 }, safe = value => clean(value, stats);
    const page = {
      title: safe(doc.title), banner: safe(doc.banner), meta: (doc.meta || []).map(safe), notes: (doc.notes || []).map(safe),
      /* Leading spaces mark a nested line, so they are kept outside the cleaned text. */
      sections: (doc.sections || []).map(s => ({ title: safe(s.title), lines: s.lines.map(line => `${/^\s/.test(line) ? ' ' : ''}${safe(line).trim()}`) }))
    };
    if (stats.replaced) page.notes.push(`${stats.replaced} character${stats.replaced === 1 ? '' : 's'} could not be shown in this PDF and appear as "?". Check the original record in ORBIT.`);
    return new TextEncoder().encode(serialise(page.title, layout(page)));
  }
  /* Report text keeps exact ISO times. The PDF shows them the way the rest of the report does, with the time zone. */
  const readableTimes = text => String(text).replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?/g, stamp => {
    const at = new Date(stamp);
    return Number.isNaN(at.getTime()) ? stamp : at.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  });
  const fromText = text => create(parseText(readableTimes(text)));

  return { PAGE, clean, textWidth, wrap, parseText, create, fromText };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PdfLogic;
