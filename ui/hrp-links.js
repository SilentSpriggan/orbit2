/* Ties NASA's named spaceflight risks and the CSA's station experiments (dist/hrp-reference.js) to what ORBIT shows:
   the indicators the crew logs, the Body systems figure, and the anatomy lab. NASA publishes which risks each of its
   studies addresses (studiesFor), but not which indicators or body parts go with a risk, so those pairings are
   ORBIT's own reading of the NASA and CSA pages, and the page says so wherever they appear. Keys are page ids. */
'use strict';

const HrpLinks = (() => {
  const IMMUNE = 'risk-of-altered-immune-system-responses', VESTIBULAR = 'risk-of-altered-sensorimotor-and-vestibular-function',
    HEART = 'risk-of-cardiovascular-adaptations', DCS = 'risk-of-decompression-sickness', MICROBES = 'risk-of-host-microorganism-interactions',
    HYPOXIA = 'risk-of-hypoxia', FOOD = 'risk-of-inadequate-food-and-nutrition', EVA = 'risk-of-injury-and-compromised-performance-from-extravehicular-activity-eva',
    FITNESS = 'risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness', SANS = 'risk-of-spaceflight-associated-neuro-ocular-syndrome-sans',
    BONE = 'risk-of-spaceflight-induced-bone-changes', BEHAVIOR = 'risk-of-behavioral-conditions-and-psychiatric-disorders',
    TEAM = 'risk-of-inadequate-teamwork', SLEEP = 'risk-from-inadequate-sleep-and-irregular-schedules',
    SUPPORT = 'risk-of-inadequate-systems-operations-support', LOADS = 'risk-of-injury-from-dynamic-loads', CANCER = 'risk-of-radiation-induced-cancers';

  /* Each logged indicator, and the NASA risks it can help the crew keep an eye on. */
  const INDICATORS = {
    hr: [HEART, FITNESS], sys: [HEART], temp: [IMMUNE, MICROBES], glucose: [FOOD], sleep: [SLEEP], mood: [BEHAVIOR, TEAM],
    spo2: [HYPOXIA], rr: [HYPOXIA], fluids: [FOOD], exercise: [FITNESS, BONE]
  };
  /* The five areas of the Body systems figure. */
  const SYSTEMS = {
    cardiovascular: [HEART, FITNESS], musculoskeletal: [BONE, FITNESS, LOADS, EVA], immune: [IMMUNE, MICROBES, CANCER],
    behavioral: [BEHAVIOR, SLEEP, TEAM, VESTIBULAR, SUPPORT], nutrition: [FOOD]
  };
  /* Anatomy layers (dist/models/catalog.json). Layers with no NASA risk page about them map to nothing. */
  const LAYERS = {
    skeleton: [BONE, LOADS], cartilage: [BONE, LOADS], dental: [], muscles: [FITNESS, EVA], connective: [FITNESS, LOADS],
    heart: [HEART], arteries: [HEART], veins: [HEART], nervous: [SANS, VESTIBULAR, BEHAVIOR], respiratory: [HYPOXIA, DCS],
    digestive: [FOOD, MICROBES], urinary: [], reproductive: [], integumentary: [MICROBES, IMMUNE], lymphatic: [IMMUNE],
    endocrine: [], sensory: [SANS, VESTIBULAR]
  };
  /* Study topics narrower than their layer. */
  const TOPICS = { 'special-senses-eye': [SANS], 'special-senses-ear': [VESTIBULAR], 'head-muscles-extraocular-muscles': [SANS] };

  /* Why each indicator is paired: one sentence quoted word for word from a NASA risk or hazard page, or from the CSA
     infographic. from is the page id in dist/hrp-reference.js. tests/hrp-reference.test.cjs checks each quote against the page text. */
  const GRAVITY = 'hazard-gravity-fields', ISOLATION = 'hazard-isolation-and-confinement', CSA_BODY = 'csa-infographic';
  const QUOTES = {
    hr: { from: HEART, text: 'Low-gravity conditions and other spaceflight stressors can alter the heart and blood vessels, potentially leading to blood clots, heart arrythmias, cardiovascular disease, and low blood pressure which elevates the chances of fainting at landing.' },
    sys: { from: GRAVITY, text: 'When shifting from weightlessness to gravity, astronauts may even experience lightheadedness and fainting.' },
    temp: { from: IMMUNE, text: 'Some astronauts aboard the International Space Station have reported cold sores, rashes, atypical allergies, and infections that can be attributed to immune system alterations.' },
    glucose: { from: CSA_BODY, text: 'Blood vessels stiffen and age faster, and astronauts can develop insulin resistance, which may lead to Type 2 diabetes.' },
    sleep: { from: ISOLATION, text: 'Sleep loss, circadian desynchronization, and work overload compound this issue and may lead to decreased performance, adverse health outcomes, and compromised mission objectives.' },
    mood: { from: BEHAVIOR, text: 'To improve mental health, NASA encourages astronauts to explore self-care options including keeping a regular journal.' },
    spo2: { from: HYPOXIA, text: 'Mild hypoxia, if untreated, can cause confusion, headaches, vision impairment, and trouble sleeping.' },
    rr: { from: HYPOXIA, text: 'Mild hypoxia, if untreated, can cause confusion, headaches, vision impairment, and trouble sleeping.' },
    fluids: { from: GRAVITY, text: 'If preventive measures are not implemented, crews may experience an increased risk of developing kidney stones due to dehydration and increased excretion of calcium from their bones.' },
    exercise: { from: FITNESS, text: 'Six to seven days a week, astronauts on the International Space Station perform resistance training and aerobic exercises for 1.5 hours per day to maintain their fitness and protect against muscle and bone loss.' }
  };

  /* The CSA infographic's six body areas, by their title on the CSA page, and where each one shows. */
  const CSA_AREAS = {
    'Blood': { systems: ['immune'], layers: ['lymphatic'] },
    'Radiation': { systems: ['immune'], topics: ['special-senses-eye'] },
    'Brain': { systems: ['behavioral'], layers: ['nervous'], topics: ['special-senses-ear'] },
    'Heart & blood vessels': { systems: ['cardiovascular', 'nutrition'], layers: ['heart', 'arteries', 'veins'] },
    'Muscles & nervous system': { systems: ['musculoskeletal'], layers: ['muscles', 'connective', 'nervous'] },
    'Bones': { systems: ['musculoskeletal'], layers: ['skeleton', 'cartilage'] }
  };
  /* Current CSA station experiments (ids from their page addresses) and what each one measures or studies. */
  const CSA_EXPERIMENTS = {
    'space-flight-improve-monitor-health-earth': { indicators: ['hr', 'rr', 'spo2'], systems: ['cardiovascular'], layers: ['heart'] },
    cardiobreath: { indicators: ['hr', 'sys', 'rr', 'exercise'], systems: ['cardiovascular'], layers: ['heart', 'arteries', 'respiratory'] },
    vascular: { indicators: ['sys'], systems: ['cardiovascular'], layers: ['arteries', 'veins'] },
    astrofit: { indicators: ['exercise', 'glucose'], systems: ['musculoskeletal', 'nutrition'], layers: ['muscles'] },
    tbone: { systems: ['musculoskeletal'], layers: ['skeleton'] },
    spark: { systems: ['immune'], layers: ['lymphatic'] },
    cstars: { indicators: ['mood'], systems: ['behavioral'] },
    wayfinding: { systems: ['behavioral'], layers: ['nervous'] },
    homebase: { systems: ['behavioral'], layers: ['nervous'] },
    'sansori-2': { topics: ['special-senses-eye'] },
    sansori: { topics: ['special-senses-eye'] }
  };

  /* NASA's five hazards (Mission brief) and the named risks each one feeds. NASA groups the risks under the hazards
     but does not publish this table, so it is ORBIT's reading of the hazard and risk pages: radiation's page names cancer
     and behavioural change; the behavioural risk's summary names isolation, radiation and distance from Earth; the
     gravity page names bone, muscle, balance, eyes and landing; the closed-environment page names immunity and microbes,
     and the spacewalk, hypoxia and decompression pages are about cabin and suit atmosphere. Every risk appears at least once. */
  const HAZARDS = {
    'hazard-space-radiation': [CANCER, BEHAVIOR],
    'hazard-isolation-and-confinement': [BEHAVIOR, TEAM, SLEEP],
    'hazard-distance-from-earth': [SUPPORT, FOOD, TEAM, BEHAVIOR],
    'hazard-gravity-fields': [VESTIBULAR, HEART, FITNESS, BONE, SANS, LOADS, EVA],
    'hazard-hostile-closed-environments': [IMMUNE, MICROBES, HYPOXIA, DCS, EVA]
  };

  /* The order NASA's "Did you know?" facts unlock on Daily routine, most surprising first. */
  const FACT_ORDER = [SLEEP, SANS, BONE, HEART, EVA, VESTIBULAR, FOOD, BEHAVIOR, IMMUNE, SUPPORT, MICROBES, TEAM, LOADS, FITNESS, DCS, HYPOXIA, CANCER];

  const ref = () => (typeof HrpReference !== 'undefined' ? HrpReference : typeof require === 'function' ? require('./hrp-reference.js') : null);
  const lookup = ids => { const R = ref(); return R ? (ids || []).map(id => R.risks.find(r => r.id === id)).filter(Boolean) : []; };
  const name = title => title.replace(/^Risk (?:of|from) /, '').replace(/^./, c => c.toUpperCase());
  /* Where a quote comes from, for its citation line. */
  function source(id) {
    const R = ref(); if (!R) return null;
    if (id === CSA_BODY) return { title: R.csaInfographic.title, url: R.csaInfographic.url, credit: R.csaCredit };
    const page = R.risks.find(r => r.id === id) || R.hazards.find(h => h.id === id);
    return page && { title: page.title.startsWith('Risk') ? page.title : `Hazard: ${page.title}`, url: page.url, credit: 'NASA Human Research Program' };
  }
  const matches = (entry, { indicator, system, layer, topic }) => indicator ? (entry.indicators || []).includes(indicator)
    : system ? (entry.systems || []).includes(system) : (!!topic && (entry.topics || []).includes(topic)) || (entry.layers || []).includes(layer);
  /* CSA material for an indicator, a body system or an anatomy selection: infographic areas and current experiments. */
  function csaFor(where) {
    const R = ref(); if (!R) return { areas: [], experiments: [] };
    return {
      areas: where.indicator ? [] : R.csaInfographic.areas.filter(a => CSA_AREAS[a.title] && matches(CSA_AREAS[a.title], where)),
      experiments: R.csaExperiments.filter(e => CSA_EXPERIMENTS[e.id] && matches(CSA_EXPERIMENTS[e.id], where))
    };
  }

  return {
    FACT_ORDER, facts: () => lookup(FACT_ORDER).filter(r => r.fact),
    INDICATORS, SYSTEMS, LAYERS, TOPICS, QUOTES, CSA_AREAS, CSA_EXPERIMENTS, HAZARDS, name, source,
    /* A hazard's NASA page entry (with its page text) and the risks ORBIT pairs it with. */
    hazard: id => ref()?.hazards.find(h => h.id === id) || null,
    forHazard: id => lookup(HAZARDS[id]),
    forIndicator: key => lookup(INDICATORS[key]),
    forSystem: key => lookup(SYSTEMS[key]),
    forAnatomy: ({ layer, topic } = {}) => lookup(TOPICS[topic] || LAYERS[layer]),
    quoteFor: key => QUOTES[key] ? { ...QUOTES[key], ...source(QUOTES[key].from) } : null,
    /* NASA's own "Top Risks Addressed" on each study page, read the other way round. */
    studiesFor: riskId => (ref()?.studies || []).filter(s => (s.risks || []).includes(riskId)),
    csaForIndicator: key => csaFor({ indicator: key }),
    csaForSystem: key => csaFor({ system: key }),
    csaForAnatomy: ({ layer, topic } = {}) => csaFor({ layer, topic })
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HrpLinks;
