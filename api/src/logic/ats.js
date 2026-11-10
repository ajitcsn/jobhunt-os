// Local, deterministic ATS-style resume ↔ JD match. No AI.
import { SKILLS, norm, skillsInText, skillLabel } from './taxonomy.js';

const STOP = new Set(`a an and are as at be by for from has have in is it its of on or that the to was were will with you your we our us they their this these those who what which when where how all any can may must should would could about into over under than then also such other more most very not no yes per via etc e.g i.e role team work working experience years year job candidate candidates ability strong good great excellent including include includes using use used new across within based well looking join company opportunity responsibilities requirements preferred plus skills skill knowledge understanding help make ensure provide support day one`.split(/\s+/));

function topTerms(text, n = 15) {
  const words = norm(text).split(' ').filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const counts = {};
  words.forEach((w) => (counts[w] = (counts[w] || 0) + 1));
  for (let i = 0; i < words.length - 1; i++) {
    const bg = words[i] + ' ' + words[i + 1];
    counts[bg] = (counts[bg] || 0) + 1.5; // favour phrases slightly
  }
  return Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

export function atsScore(resumeText = '', jdText = '') {
  const resume = norm(resumeText);
  const checks = [
    { key: 'contact', label: 'Email and phone present', ok: /@/.test(resumeText) && /\d{10}|\+\d{2}/.test(resumeText.replace(/[\s-]/g, '')) },
    { key: 'numbers', label: '3+ quantified bullets (numbers / %)', ok: resumeText.split('\n').filter((l) => /\d/.test(l) && l.trim().length > 25).length >= 3 },
    { key: 'length', label: 'Length 300–900 words', ok: (() => { const w = resumeText.split(/\s+/).filter(Boolean).length; return w >= 300 && w <= 900; })() },
    { key: 'sections', label: 'Standard sections (Experience, Education, Skills/Projects)', ok: /experience/i.test(resumeText) && /education/i.test(resumeText) && /(skills|projects)/i.test(resumeText) },
  ];

  if (!jdText.trim() || !resumeText.trim()) {
    return { score: null, matched: [], missing: [], checks };
  }

  // Keywords = taxonomy skills mentioned in the JD (weight 2) + frequent JD terms (weight 1).
  const jdSkills = skillsInText(jdText);
  const terms = topTerms(jdText).filter((t) => !jdSkills.some((s) => SKILLS[s].synonyms.includes(t)));
  const matched = [], missing = [];
  let got = 0, total = 0;
  for (const s of jdSkills) {
    total += 2;
    const has = SKILLS[s].synonyms.some((syn) => resume.includes(syn));
    (has ? matched : missing).push(skillLabel(s));
    if (has) got += 2;
  }
  for (const t of terms) {
    total += 1;
    const has = resume.includes(' ' + t + ' ') || resume.includes(t);
    (has ? matched : missing).push(t);
    if (has) got += 1;
  }
  const kw = total ? got / total : 0;
  const hygiene = checks.filter((c) => c.ok).length / checks.length;
  const score = Math.round(100 * (0.7 * kw + 0.3 * hygiene));
  return { score, matched, missing: missing.slice(0, 15), checks };
}
