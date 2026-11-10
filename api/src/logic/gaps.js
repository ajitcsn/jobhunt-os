// Gap analysis: compare the skills a target role needs with the evidence in the user's
// Resume, profile skills and projects. Deterministic.
import { ROLES, SKILLS, norm, roleLabel, skillLabel } from './taxonomy.js';

export function skillCoverage(profile = {}, projects = []) {
  const text = norm((profile.resume_text || '') + ' ' + (profile.skills || []).join(' '));
  const cov = {};
  for (const [k, s] of Object.entries(SKILLS)) {
    let c = s.synonyms.some((syn) => text.includes(syn)) ? 1 : 0;
    if ((profile.skills || []).map((x) => x.toLowerCase()).includes(k)) c = 1;
    for (const p of projects) {
      if (!(p.skills_covered || []).includes(k)) continue;
      if (p.status === 'done') c = Math.max(c, 1);
      else if (p.status === 'in_progress') c = Math.max(c, 0.5);
    }
    cov[k] = c;
  }
  return cov;
}

export function gapsForRole(roleKey, profile, projects) {
  const role = ROLES[roleKey];
  if (!role) return null;
  const cov = skillCoverage(profile, projects);
  const weights = Object.entries(role.skills);
  const totalW = weights.reduce((a, [, w]) => a + w, 0);
  const coveredW = weights.reduce((a, [k, w]) => a + w * cov[k], 0);
  const skills = weights
    .map(([k, w]) => ({ key: k, label: skillLabel(k), weight: w, coverage: cov[k], gap: w * (1 - cov[k]) }))
    .sort((a, b) => b.gap - a.gap || b.weight - a.weight);
  const gapKeys = skills.filter((s) => s.coverage < 1).map((s) => s.key);
  const suggestions = role.projects
    .map((p) => ({ ...p, closes: p.covers.filter((c) => gapKeys.includes(c)).map(skillLabel) }))
    .filter((p) => p.closes.length && !projects.some((x) => x.title.toLowerCase() === p.title.toLowerCase()))
    .sort((a, b) => b.closes.length - a.closes.length);
  return {
    role: roleKey,
    label: roleLabel(roleKey),
    readiness: Math.round((100 * coveredW) / totalW),
    skills,
    top_gaps: skills.filter((s) => s.coverage < 1).slice(0, 5),
    suggestions,
  };
}

export function allGaps(profile, projects) {
  return (profile?.target_roles || []).map((r) => gapsForRole(r, profile, projects)).filter(Boolean);
}
