// Static role → skills → project-template map. This is the app's "brain" for gap analysis
// and ATS keyword extraction. Pure data, no AI.

export const SKILLS = {
  sql: { label: 'SQL', synonyms: ['sql', 'postgres', 'mysql', 'bigquery', 'snowflake', 'redshift'] },
  excel: { label: 'Excel / Sheets', synonyms: ['excel', 'spreadsheet', 'google sheets', 'vlookup', 'pivot'] },
  python: { label: 'Python', synonyms: ['python', 'pandas', 'numpy', 'jupyter'] },
  r_lang: { label: 'R', synonyms: [' r ', 'rstudio', 'tidyverse'] },
  dashboards: { label: 'Dashboards / BI', synonyms: ['tableau', 'power bi', 'powerbi', 'looker', 'metabase', 'dashboard', 'superset'] },
  product_metrics: { label: 'Product metrics', synonyms: ['funnel', 'retention', 'cohort', 'dau', 'mau', 'activation', 'north star', 'churn', 'engagement'] },
  ab_testing: { label: 'A/B testing', synonyms: ['a/b', 'ab test', 'ab testing', 'experiment', 'hypothesis test', 'statistical significance'] },
  statistics: { label: 'Statistics', synonyms: ['statistics', 'statistical', 'regression', 'hypothesis', 'probability', 'inference'] },
  machine_learning: { label: 'Machine learning', synonyms: ['machine learning', 'scikit', 'sklearn', 'xgboost', 'classification', 'random forest', 'model training'] },
  credit_risk: { label: 'Credit risk', synonyms: ['credit risk', 'underwriting', 'probability of default', 'pd model', 'scorecard', 'delinquency', 'npa', 'loss forecasting', 'collections'] },
  financial_analysis: { label: 'Financial analysis', synonyms: ['financial analysis', 'financial model', 'valuation', 'p&l', 'unit economics', 'dcf', 'cfa'] },
  marketing_analytics: { label: 'Marketing analytics', synonyms: ['marketing analytics', 'attribution', 'cac', 'ltv', 'roas', 'campaign', 'mmm', 'performance marketing'] },
  seo_growth: { label: 'Growth / SEO', synonyms: ['seo', 'growth', 'acquisition', 'referral', 'viral', 'lifecycle', 'crm'] },
  ecommerce: { label: 'E-commerce metrics', synonyms: ['e-commerce', 'ecommerce', 'gmv', 'aov', 'conversion rate', 'cart', 'catalog', 'marketplace'] },
  stakeholder: { label: 'Stakeholder management', synonyms: ['stakeholder', 'cross-functional', 'cross functional', 'leadership', 'presented to'] },
  product_sense: { label: 'Product sense / PRDs', synonyms: ['prd', 'product requirement', 'user research', 'roadmap', 'prioritisation', 'prioritization', 'wireframe', 'figma'] },
  strategy: { label: 'Strategy / problem solving', synonyms: ['strategy', 'go-to-market', 'gtm', 'market sizing', 'business case', 'competitive analysis'] },
  operations: { label: 'Operations', synonyms: ['operations', 'process improvement', 'sop', 'ops', 'execution', 'program management'] },
  communication: { label: 'Writing / communication', synonyms: ['memo', 'presentation', 'report', 'communication', 'storytelling', 'documentation'] },
};

export const ROLES = {
  product_analyst: {
    label: 'Product Analyst',
    skills: { sql: 3, product_metrics: 3, ab_testing: 2, python: 2, dashboards: 2, product_sense: 1, stakeholder: 1 },
    projects: [
      { title: 'Funnel + cohort teardown of a public app', covers: ['sql', 'product_metrics', 'dashboards'], milestones: ['Pick an app and define the funnel', 'Build dataset (public / synthetic) in SQL', 'Cohort retention chart', 'Write a 1-page insight memo'] },
      { title: 'A/B test analysis with a written recommendation', covers: ['ab_testing', 'python', 'statistics'], milestones: ['Find a public experiment dataset', 'Check sample size + power', 'Analyse in Python', 'Publish recommendation'] },
      { title: 'Product teardown + PRD for one feature', covers: ['product_sense', 'stakeholder'], milestones: ['Pick a product', 'User pain points', 'Write PRD', 'Share on LinkedIn'] },
    ],
  },
  data_analyst: {
    label: 'Data Analyst',
    skills: { sql: 3, excel: 2, dashboards: 3, python: 2, statistics: 2, communication: 1 },
    projects: [
      { title: 'End-to-end KPI dashboard on public data', covers: ['sql', 'dashboards', 'excel'], milestones: ['Pick dataset', 'Model tables in SQL', 'Build dashboard', 'Publish link'] },
      { title: 'Exploratory analysis notebook with insights', covers: ['python', 'statistics', 'communication'], milestones: ['Pick dataset', 'Clean + EDA', 'Three insights with charts', 'Write-up'] },
    ],
  },
  credit_risk_analyst: {
    label: 'Credit / Risk Analyst',
    skills: { credit_risk: 3, sql: 3, python: 2, statistics: 2, financial_analysis: 2, excel: 1, machine_learning: 1 },
    projects: [
      { title: 'Probability-of-default scorecard on public loan data', covers: ['credit_risk', 'python', 'statistics', 'machine_learning'], milestones: ['Get Lending Club / Kaggle data', 'WoE / IV feature work', 'Logistic scorecard', 'Gini + KS report'] },
      { title: 'Vintage + roll-rate analysis in SQL', covers: ['credit_risk', 'sql', 'dashboards'], milestones: ['Synthetic loan book', 'Vintage curves', 'Roll-rate matrix', 'Risk memo'] },
    ],
  },
  marketing_analytics: {
    label: 'Marketing Analyst',
    skills: { marketing_analytics: 3, sql: 2, dashboards: 2, ab_testing: 2, seo_growth: 2, excel: 1 },
    projects: [
      { title: 'Channel attribution + CAC/LTV model', covers: ['marketing_analytics', 'excel', 'sql'], milestones: ['Synthetic campaign data', 'CAC by channel', 'LTV model', 'Budget reallocation memo'] },
      { title: 'Landing-page experiment write-up', covers: ['ab_testing', 'seo_growth'], milestones: ['Hypothesis', 'Run test (or simulate)', 'Analyse', 'Publish'] },
    ],
  },
  ecommerce_analytics: {
    label: 'E-commerce Analyst',
    skills: { ecommerce: 3, sql: 3, product_metrics: 2, dashboards: 2, marketing_analytics: 1, python: 1 },
    projects: [
      { title: 'Olist / public e-com dataset: GMV, AOV, repeat-rate study', covers: ['ecommerce', 'sql', 'product_metrics', 'dashboards'], milestones: ['Load data', 'GMV / AOV trends', 'Repeat-purchase cohorts', 'Dashboard + memo'] },
    ],
  },
  data_scientist_junior: {
    label: 'Junior Data Scientist',
    skills: { python: 3, machine_learning: 3, statistics: 3, sql: 2, communication: 1 },
    projects: [
      { title: 'Churn prediction model with business framing', covers: ['python', 'machine_learning', 'statistics'], milestones: ['Dataset', 'Baseline', 'Model + validation', 'Business impact write-up'] },
    ],
  },
  founders_office: {
    label: "Founder's Office",
    skills: { strategy: 3, operations: 2, financial_analysis: 2, stakeholder: 2, communication: 2, excel: 1, product_sense: 1 },
    projects: [
      { title: 'Market map + GTM memo for a startup you admire', covers: ['strategy', 'communication', 'financial_analysis'], milestones: ['Market sizing', 'Competitor map', 'GTM recommendation', 'Send to founder'] },
      { title: 'Ops teardown: fix one broken process', covers: ['operations', 'stakeholder', 'excel'], milestones: ['Map current process', 'Measure baseline', 'Propose fix', 'One-page SOP'] },
    ],
  },
};

export const roleLabel = (k) => ROLES[k]?.label || k;
export const skillLabel = (k) => SKILLS[k]?.label || k;

// Normalised text for matching: lowercase, padded so " r " style synonyms work.
export const norm = (t = '') => ' ' + String(t).toLowerCase().replace(/[^a-z0-9/&+%.\- ]+/g, ' ').replace(/\s+/g, ' ') + ' ';

export function skillsInText(text) {
  const t = norm(text);
  return Object.entries(SKILLS)
    .filter(([, s]) => s.synonyms.some((syn) => t.includes(syn.startsWith(' ') ? syn : syn)))
    .map(([k]) => k);
}
