/* Team research, topics 1 to 5, checked against each published paper. Every entry states only what its source supports. */
'use strict';

const ResearchLibrary = (() => {
  const doi = id => `https://doi.org/${id}`;
  const SOURCES = {
    scully: { cite: 'Scully et al., 2019', title: 'Effects of acute exposures to carbon dioxide on decision making and cognition in astronaut-like subjects', journal: 'npj Microgravity', url: doi('10.1038/s41526-019-0071-6') },
    nasaCo2: { cite: 'NASA, 2023', title: 'Carbon dioxide technical brief', journal: 'NASA Office of the Chief Health and Medical Officer', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf' },
    miranda: { cite: 'Miranda et al., 2023', title: 'A Dusty Road for Astronauts', journal: 'Biomedicines', url: doi('10.3390/biomedicines11071921') },
    avila: { cite: 'Avila-Herrera et al., 2020', title: 'Crewmember microbiome may influence microbial composition of ISS habitable surfaces', journal: 'PLOS ONE', url: doi('10.1371/journal.pone.0231838') },
    pittia: { cite: 'Pittia et al., 2023', title: 'Unraveling the intricate connection between dietary factors and the success in long-term space missions', journal: 'npj Microgravity', url: doi('10.1038/s41526-023-00331-x') },
    jonesSleep: { cite: 'Jones et al., 2022', title: 'Sleep deficiency in spaceflight is associated with degraded neurobehavioral functions and elevated stress in astronauts on six-month missions aboard the International Space Station', journal: 'Sleep', url: doi('10.1093/sleep/zsac006') },
    yin: { cite: 'Yin et al., 2023', title: 'Long-term spaceflight composite stress induces depression and cognitive impairment in astronauts: insights from neuroplasticity', journal: 'Translational Psychiatry', url: doi('10.1038/s41398-023-02638-5') },
    chouker: { cite: 'Choukér & Stahn, 2020', title: 'COVID-19: the largest isolation study in history: the value of shared learnings from spaceflight analogs', journal: 'npj Microgravity', url: doi('10.1038/s41526-020-00122-8') },
    bell: { cite: 'Bell et al., 2019', title: 'What We Know About Team Dynamics for Long-Distance Space Missions: A Systematic Review of Analog Research', journal: 'Frontiers in Psychology', url: doi('10.3389/fpsyg.2019.00811') },
    cantisani: { cite: 'Cantisani et al., 2026', title: 'Social interactions in isolated, confined, and extreme environments: A study of Antarctic winter teams using wearable sensors', journal: 'PNAS', url: doi('10.1073/pnas.2533420123') },
    flynnEvans: { cite: 'Flynn-Evans et al., 2016', title: 'Circadian misalignment affects sleep and medication use before and during spaceflight', journal: 'npj Microgravity', url: doi('10.1038/npjmgrav.2015.19') },
    gatti: { cite: 'Gatti et al., 2022', title: 'Affective health and countermeasures in long-duration space exploration', journal: 'Heliyon', url: doi('10.1016/j.heliyon.2022.e09414') },
    pagnini: { cite: 'Pagnini, 2024', title: 'Supporting the Mind in Space: Psychological Tools for Long-Duration Missions', journal: 'Interactive Journal of Medical Research', url: doi('10.2196/66626') },
    smith: { cite: 'Smith, 2024', title: 'Automated Psychotherapy in a Spaceflight Environment: Advantages, Drawbacks, and Unknowns', journal: 'Interactive Journal of Medical Research', url: doi('10.2196/58803') },
    casario: { cite: 'Casario et al., 2022', title: 'Acceptability of the Cognition Test Battery in astronaut and astronaut-surrogate populations', journal: 'Acta Astronautica', url: doi('10.1016/j.actaastro.2021.09.035') },
    chancellor: { cite: 'Chancellor et al., 2014', title: 'Space Radiation: The Number One Risk to Astronaut Health beyond Low Earth Orbit', journal: 'Life', url: doi('10.3390/life4030491') },
    guo: { cite: 'Guo et al., 2022', title: 'Carcinogenesis induced by space radiation: A systematic review', journal: 'Neoplasia', url: doi('10.1016/j.neo.2022.100828') },
    kokhan: { cite: 'Kokhan & Dobynde, 2023', title: 'The Effects of Galactic Cosmic Rays on the Central Nervous System: From Negative to Unexpectedly Positive Effects That Astronauts May Encounter', journal: 'Biology', url: doi('10.3390/biology12030400') },
    kennedy: { cite: 'Kennedy, 2014', title: 'Acute effects of solar particle event radiation', journal: 'Journal of Radiation Research', url: doi('10.1093/jrr/rrt196') },
    rooney: { cite: 'Rooney et al., 2019', title: 'Herpes Virus Reactivation in Astronauts During Spaceflight and Its Application on Earth', journal: 'Frontiers in Microbiology', url: doi('10.3389/fmicb.2019.00016') },
    cytokine: { cite: 'Crucian et al., 2014', title: 'Plasma cytokine concentrations indicate that in vivo hormonal regulation of immunity is altered during long-duration spaceflight', journal: 'Journal of Interferon & Cytokine Research', url: doi('10.1089/jir.2013.0129') },
    crucian: { cite: 'Crucian et al., 2016', title: 'Incidence of clinical symptoms during long-duration orbital spaceflight', journal: 'International Journal of General Medicine', url: doi('10.2147/IJGM.S114188') },
    puhl: { cite: 'Puhl et al., 2022', title: 'Wound management and healing in space', journal: 'Frontiers in Bioengineering and Biotechnology', url: doi('10.3389/fbioe.2022.958515') },
    voorhies: { cite: 'Voorhies et al., 2019', title: 'Study of the impact of long-duration space missions at the International Space Station on the astronaut microbiome', journal: 'Scientific Reports', url: doi('10.1038/s41598-019-46303-8') },
    park: { cite: 'Park et al., 2024', title: 'Spatial multi-omics of human skin reveals KRAS and inflammatory responses to spaceflight', journal: 'Nature Communications', url: doi('10.1038/s41467-024-48625-2') },
    sugita: { cite: 'Sugita et al., 2016', title: 'Comprehensive analysis of the skin fungal microbiota of astronauts during a half-year stay at the International Space Station', journal: 'Medical Mycology', url: doi('10.1093/mmy/myv121') },
    man: { cite: 'Man et al., 2022', title: 'The effects of microgravity on bone structure and function', journal: 'npj Microgravity', url: doi('10.1038/s41526-022-00194-8') },
    ceniza: { cite: 'Ceniza-Bordallo et al., 2024', title: 'Low Back Pain During and After Spaceflight: A Systematic Review with Meta-Analysis', journal: 'Journal of Pain Research', url: doi('10.2147/jpr.s491060') },
    vernice: { cite: 'Vernice et al., 2020', title: 'Long-term spaceflight and the cardiovascular system', journal: 'Precision Clinical Medicine', url: doi('10.1093/pcmedi/pbaa022') },
    hoenemann: { cite: 'Hoenemann et al., 2023', title: 'Effects of daily artificial gravity training on orthostatic tolerance following 60-day strict head-down tilt bedrest', journal: 'Clinical Autonomic Research', url: doi('10.1007/s10286-023-00959-5') },
    clement: { cite: 'Clément et al., 2023', title: 'Cognitive and balance functions of astronauts after spaceflight are comparable to those of individuals with bilateral vestibulopathy', journal: 'Frontiers in Neurology', url: doi('10.3389/fneur.2023.1284029') },
    jonesExercise: { cite: 'Jones et al., 2019', title: 'Optimization of Exercise Countermeasures for Human Space Flight: Operational Considerations for Concurrent Strength and Aerobic Training', journal: 'Frontiers in Physiology', url: doi('10.3389/fphys.2019.00584') },
    scott: { cite: 'Scott et al., 2019', title: 'Introduction to the Frontiers Research Topic: Optimization of Exercise Countermeasures for Human Space Flight', journal: 'Frontiers in Physiology', url: doi('10.3389/fphys.2019.00173') },
    lee: { cite: 'Lee et al., 2020', title: 'Spaceflight associated neuro-ocular syndrome (SANS) and the neuro-ophthalmologic effects of microgravity: a review and an update', journal: 'npj Microgravity', url: doi('10.1038/s41526-020-0097-9') },
    perhonen: { cite: 'Perhonen et al., 2001', title: 'Cardiac atrophy after bed rest and spaceflight', journal: 'Journal of Applied Physiology', url: doi('10.1152/jappl.2001.91.2.645') },
    pietrzyk: { cite: 'Pietrzyk et al., 2007', title: 'Renal stone formation among astronauts', journal: 'Aviation, Space, and Environmental Medicine', url: 'https://pubmed.ncbi.nlm.nih.gov/17511294/' },
    crucianReview: { cite: 'Crucian et al., 2018', title: 'Immune System Dysregulation During Spaceflight: Potential Countermeasures for Deep Space Exploration Missions', journal: 'Frontiers in Immunology', url: doi('10.3389/fimmu.2018.01437') },
    opperman: { cite: 'Opperman et al., 2010', title: 'Probability of Spacesuit-Induced Fingernail Trauma Is Associated with Hand Circumference', journal: 'Aviation, Space, and Environmental Medicine', url: doi('10.3357/asem.2810.2010') },
    neutelings: { cite: 'Neutelings et al., 2015', title: 'Skin physiology in microgravity: a 3-month stay aboard ISS induces dermal atrophy and affects cutaneous muscle and hair follicles cycling in mice', journal: 'npj Microgravity', url: doi('10.1038/npjmgrav.2015.2') },
    wilson: { cite: 'Wilson et al., 2007', title: 'Space flight alters bacterial gene expression and virulence and reveals a role for global regulator Hfq', journal: 'PNAS', url: doi('10.1073/pnas.0707155104') },
    twins: { cite: 'Garrett-Bakelman et al., 2019', title: 'The NASA Twins Study: A multidimensional analysis of a year-long human spaceflight', journal: 'Science', url: doi('10.1126/science.aau8650') },
    urbaniak: { cite: 'Urbaniak et al., 2022', title: 'Microbial Tracking-2, a metagenomics analysis of bacteria and fungi onboard the International Space Station', journal: 'Microbiome', url: doi('10.1186/s40168-022-01293-0') },
    novikova: { cite: 'Novikova et al., 2006', title: 'Survey of environmental biocontamination on board the International Space Station', journal: 'Research in Microbiology', url: doi('10.1016/j.resmic.2005.07.010') },
    tomsia: { cite: 'Tomsia et al., 2024', title: 'Long-term space missions’ effects on the human organism: what we do know and what requires further research', journal: 'Frontiers in Physiology', url: doi('10.3389/fphys.2024.1284644') },
    nasaRadiation: { cite: 'NASA, 2022', title: 'Design for ionizing radiation protection technical brief', journal: 'NASA Office of the Chief Health and Medical Officer', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf' },
    barcellos: { cite: 'Barcellos-Hoff et al., 2015', title: 'Concepts and challenges in cancer risk prediction for the space radiation environment', journal: 'Life Sciences in Space Research', url: doi('10.1016/j.lssr.2015.07.006') },
    cataract: { cite: 'Cucinotta et al., 2001', title: 'Space Radiation and Cataracts in Astronauts', journal: 'Radiation Research', url: doi('10.1667/0033-7587(2001)156[0460:SRACIA]2.0.CO;2') },
    fuglesang: { cite: 'Fuglesang et al., 2006', title: 'Phosphenes in low Earth orbit: survey responses from 59 astronauts', journal: 'Aviation, Space, and Environmental Medicine', url: 'https://pubmed.ncbi.nlm.nih.gov/16676658/' },
    nasaIsolation: { cite: 'NASA, 2024', title: 'Hazard: Isolation and Confinement', journal: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/', apa: 'National Aeronautics and Space Administration. (2024, August 1). <i>Hazard: Isolation and confinement</i>. NASA Human Research Program. https://www.nasa.gov/hrp/hazard-isolation-and-confinement/' },
    nasaDistance: { cite: 'NASA, 2024', title: 'Hazard: Distance From Earth', journal: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/', apa: 'National Aeronautics and Space Administration. (2024, August 1). <i>Hazard: Distance from Earth</i>. NASA Human Research Program. https://www.nasa.gov/hrp/hazard-distance-from-earth/' },
    nasaGravity: { cite: 'NASA, 2024', title: 'Hazard: Gravity Fields', journal: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/', apa: 'National Aeronautics and Space Administration. (2024, August 1). <i>Hazard: Gravity fields</i>. NASA Human Research Program. https://www.nasa.gov/hrp/hazard-gravity-fields/' },
    apex: { cite: 'Bell et al., 2026', title: 'Summary Results from the Assessment of Psychology in Extreme Environments (APEX) Standardized Suite', journal: 'Aerospace Medical Association Annual Scientific Meeting (abstract, NASA NTRS)', url: 'https://ntrs.nasa.gov/citations/20250011721', apa: 'Bell, S. T., Landon Blackwell, L., Dev, S., Miller, J., Begerowski, S., Anderson, S. R., & Stosic, M. (2026). <i>Summary results from the Assessment of Psychology in Extreme Environments (APEX) standardized suite</i> [Conference abstract]. Aerospace Medical Association Annual Scientific Meeting, Denver, CO, United States. https://ntrs.nasa.gov/citations/20250011721' },
    stuster: { cite: 'Stuster, 2010', title: 'Behavioral Issues Associated With Long Duration Space Expeditions: Review and Analysis of Astronaut Journals', journal: 'NASA contractor report JSC-CN-21128', url: 'https://ntrs.nasa.gov/citations/20100026549', apa: 'Stuster, J. (2010). <i>Behavioral issues associated with long duration space expeditions: Review and analysis of astronaut journals</i> (Report No. JSC-CN-21128). NASA Johnson Space Center. https://ntrs.nasa.gov/citations/20100026549' },
    mcbrayer: { cite: 'McBrayer et al., 2022', title: 'Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions', journal: 'AIAA ASCEND 2022 (NASA NTRS)', url: 'https://ntrs.nasa.gov/citations/20220013418', apa: 'McBrayer, K. T., Chai, P. R., & Judd, E. L. (2022). <i>Communication delays, disruptions, and blackouts for crewed Mars missions</i> [Conference paper]. ASCEND 2022, Las Vegas, NV, United States. https://ntrs.nasa.gov/citations/20220013418' },
    parisi: { cite: 'Parisi et al., 2023', title: 'Effects of Communication Delay on Human Spaceflight Missions', journal: 'Applied Human Factors and Ergonomics (AHFE) 2023 (NASA NTRS)', url: 'https://ntrs.nasa.gov/citations/20230002268', apa: 'Parisi, M., Panontin, T., Wu, S., Mctigue, K., & Vera, A. (2023). <i>Effects of communication delay on human spaceflight missions</i> [Conference paper]. 14th International Conference on Applied Human Factors and Ergonomics, San Francisco, CA, United States. https://ntrs.nasa.gov/citations/20230002268' },
    hoffler: { cite: 'Hoffler & Johnson, 1975', title: 'Apollo flight crew cardiovascular evaluations', journal: 'Biomedical Results of Apollo, NASA SP-368', url: 'https://ntrs.nasa.gov/citations/19760005591', apa: 'Hoffler, G. W., & Johnson, R. L. (1975). Apollo flight crew cardiovascular evaluations. In R. S. Johnston, L. F. Dietlein, & C. A. Berry (Eds.), <i>Biomedical results of Apollo</i> (NASA SP-368). National Aeronautics and Space Administration. https://ntrs.nasa.gov/citations/19760005591' },
    homick: { cite: 'Homick & Miller, 1975', title: 'Apollo flight crew vestibular assessment', journal: 'Biomedical Results of Apollo, NASA SP-368', url: 'https://ntrs.nasa.gov/citations/19760005595', apa: 'Homick, J. L., & Miller, E. F., II. (1975). Apollo flight crew vestibular assessment. In R. S. Johnston, L. F. Dietlein, & C. A. Berry (Eds.), <i>Biomedical results of Apollo</i> (NASA SP-368). National Aeronautics and Space Administration. https://ntrs.nasa.gov/citations/19760005595' },
    skylabResults: { cite: 'Johnston & Dietlein, 1977', title: 'Biomedical Results from Skylab', journal: 'NASA SP-377', url: 'https://ntrs.nasa.gov/citations/19770026836', apa: 'Johnston, R. S., & Dietlein, L. F. (Eds.). (1977). <i>Biomedical results from Skylab</i> (NASA SP-377). National Aeronautics and Space Administration. https://ntrs.nasa.gov/citations/19770026836' },
    skylabMedical: { cite: 'Johnston & Dietlein, 1975', title: 'Medical Support and Findings of the Skylab Program', journal: 'NASA TM X-58160', url: 'https://ntrs.nasa.gov/api/citations/19750017465/downloads/19750017465.pdf', apa: 'Johnston, R. S., & Dietlein, L. F. (1975). <i>Medical support and findings of the Skylab program</i> (NASA TM X-58160). NASA Johnson Space Center. https://ntrs.nasa.gov/api/citations/19750017465/downloads/19750017465.pdf' },
    ma7Report: { cite: 'NASA, 1962', title: 'Results of the Second United States Manned Orbital Space Flight, May 24, 1962', journal: 'NASA SP-6', url: 'https://ntrs.nasa.gov/api/citations/19620004691/downloads/19620004691.pdf', apa: 'National Aeronautics and Space Administration. (1962). <i>Results of the second United States manned orbital space flight, May 24, 1962</i> (NASA SP-6). https://ntrs.nasa.gov/api/citations/19620004691/downloads/19620004691.pdf' },
    apollo10: { cite: 'NASA, 1969', title: 'Apollo 10 Mission Report', journal: 'NASA Manned Spacecraft Center, MSC-00126', url: 'https://www.nasa.gov/wp-content/uploads/2025/11/a10-missionreport.pdf', apa: 'National Aeronautics and Space Administration. (1969). <i>Apollo 10 mission report</i> (MSC-00126). Manned Spacecraft Center. https://www.nasa.gov/wp-content/uploads/2025/11/a10-missionreport.pdf' },
    mercuryFacts: { cite: 'NASA Science', title: 'Mercury: Facts', journal: 'NASA Science', url: 'https://science.nasa.gov/mercury/facts/', apa: 'NASA Science. (n.d.). <i>Mercury: Facts</i>. National Aeronautics and Space Administration. https://science.nasa.gov/mercury/facts/' },
    venusFacts: { cite: 'NASA Science', title: 'Venus: Facts', journal: 'NASA Science', url: 'https://science.nasa.gov/venus/facts/', apa: 'NASA Science. (n.d.). <i>Venus: Facts</i>. National Aeronautics and Space Administration. https://science.nasa.gov/venus/facts/' },
    earthFacts: { cite: 'NASA Science', title: 'Facts About Earth', journal: 'NASA Science', url: 'https://science.nasa.gov/earth/facts/', apa: 'NASA Science. (n.d.). <i>Facts about Earth</i>. National Aeronautics and Space Administration. https://science.nasa.gov/earth/facts/' },
    marsFacts: { cite: 'NASA Science', title: 'Mars: Facts', journal: 'NASA Science', url: 'https://science.nasa.gov/mars/facts/', apa: 'NASA Science. (n.d.). <i>Mars: Facts</i>. National Aeronautics and Space Administration. https://science.nasa.gov/mars/facts/' },
    jupiterFacts: { cite: 'NASA Science', title: 'Jupiter: Facts', journal: 'NASA Science', url: 'https://science.nasa.gov/jupiter/facts/', apa: 'NASA Science. (n.d.). <i>Jupiter: Facts</i>. National Aeronautics and Space Administration. https://science.nasa.gov/jupiter/facts/' },
    saturnFacts: { cite: 'NASA Science', title: 'Saturn: Facts', journal: 'NASA Science', url: 'https://science.nasa.gov/saturn/facts/', apa: 'NASA Science. (n.d.). <i>Saturn: Facts</i>. National Aeronautics and Space Administration. https://science.nasa.gov/saturn/facts/' },
    uranusFacts: { cite: 'NASA Science', title: 'Uranus: Facts', journal: 'NASA Science', url: 'https://science.nasa.gov/uranus/facts/', apa: 'NASA Science. (n.d.). <i>Uranus: Facts</i>. National Aeronautics and Space Administration. https://science.nasa.gov/uranus/facts/' },
    neptuneFacts: { cite: 'NASA Science', title: 'Neptune: Facts', journal: 'NASA Science', url: 'https://science.nasa.gov/neptune/facts/', apa: 'NASA Science. (n.d.). <i>Neptune: Facts</i>. National Aeronautics and Space Administration. https://science.nasa.gov/neptune/facts/' },
    lsroNutrition: { cite: 'Altman & Fisher, 1986', title: 'Research Opportunities in Nutrition and Metabolism in Space', journal: 'Life Sciences Research Office, FASEB, for NASA (NASA CR-190992)', url: 'https://ntrs.nasa.gov/citations/19930074290', apa: 'Altman, P. L., & Fisher, K. D. (Eds.). (1986). <i>Research opportunities in nutrition and metabolism in space</i> (NASA CR-190992). Life Sciences Research Office, Federation of American Societies for Experimental Biology. https://ntrs.nasa.gov/citations/19930074290' },
    paulEva: { cite: 'Paul, 2012', title: 'Energy Expenditure During Extravehicular Activity Through Apollo', journal: 'AIAA International Conference on Environmental Systems (AIAA 2012-3504)', url: 'https://ntrs.nasa.gov/citations/20120003917', apa: 'Paul, H. L. (2012). Energy expenditure during extravehicular activity through Apollo. In <i>42nd International Conference on Environmental Systems</i>. American Institute of Aeronautics and Astronautics. https://doi.org/10.2514/6.2012-3504' },
    evaHeartRate: { cite: 'EVA dissertation, ch. 5', title: 'Extravehicular Activity Metabolic Rate Model: Metabolic Rate Estimated From Heart Rate', journal: 'Doctoral dissertation chapter (author and year not stated in the supplied file)', url: './assets/evidence/eva-metabolic-rate-from-heart-rate.pdf', apa: '<i>Extravehicular activity metabolic rate model: Metabolic rate estimated from heart rate</i> (Chapter 5). (n.d.). [Unpublished doctoral dissertation chapter; author not stated].' },
    evaCardiothermal: { cite: 'EVA dissertation, ch. 6', title: 'Evaluation of Cardiothermal Model Prediction of Simulated Lunar Extravehicular Activity', journal: 'Doctoral dissertation chapter (author and year not stated in the supplied file)', url: './assets/evidence/lunar-eva-cardiothermal-model.pdf', apa: '<i>Evaluation of cardiothermal model prediction of simulated lunar extravehicular activity</i> (Chapter 6). (n.d.). [Unpublished doctoral dissertation chapter; author not stated].' }
  };
  const EVIDENCE = { crew: 'Astronaut data', ground: 'Ground study', lab: 'Animal and cell studies', review: 'Research review', opinion: 'Expert commentary', reference: 'NASA reference data' };
  const TOPICS = {
    environment: { title: 'Cabin environment', owner: 'Sadiq', items: [
      { title: 'Carbon dioxide', evidence: 'ground', sources: ['scully', 'nasaCo2'], text: 'Twenty-two astronaut-like volunteers were exposed for a few hours to 600 to 5,000 ppm. There was no clear dose-response pattern in decision-making or cognition. Longer exposures still need study. NASA reports that 19 of 49 astronauts in one ISS analysis had headaches, and that carbon dioxide level was linked to them. Fluid shifts in microgravity can cause similar symptoms.', watch: 'Record headaches or slowed thinking, and check the vehicle’s cabin alerts.', track: ['care', 'Log symptoms'] },
      { title: 'Lunar dust', evidence: 'crew', sources: ['miranda'], text: 'Apollo astronauts reported allergy-like symptoms after tracking dust into the lunar module. One reported sneezing, red eyes, an itchy throat and congested sinuses. Researchers are also concerned about effects on the lungs, skin and eyes.', watch: 'Record breathing, eye or throat symptoms after surface work.', track: ['care', 'Log symptoms'] },
      { title: 'Microbes on cabin surfaces', evidence: 'crew', sources: ['avila'], text: 'A study of one crew member found that ISS surfaces resemble the crew’s skin microbes. The authors support continued microbial surveillance for long missions.', watch: 'Follow habitat hygiene procedures and report shared symptoms.', track: ['care', 'Log symptoms'] },
      { title: 'Air, water and surfaces', evidence: 'crew', sources: ['urbaniak', 'novikova'], text: 'ISS surface microbes are mostly human skin organisms, with Staphylococcus and Malassezia the most represented. A six-year survey found Staphylococcus dominant in air and surface samples. No viable pathogens were recovered from potable water.', watch: 'Follow cabin cleaning and water sampling procedures.', track: null },
      { title: 'Noise, vibration and light', evidence: 'review', sources: ['tomsia'], text: 'Astronauts often have disturbed body clocks and poor sleep. Reviewers recommend designing stations with less noise and vibration, and with lighting that supports the circadian rhythm.', watch: 'Record whether noise or lighting affected your sleep.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Food and nutrition', evidence: 'review', sources: ['pittia'], text: 'Too few calories have contributed to muscle loss and weakened immune and cardiovascular systems during missions. Prolonged storage can degrade nutrients. There is currently no reliable way to measure total energy use in real time, so diet and body mass need monitoring.', watch: 'Record appetite changes and intake against the meal plan.', track: ['routine', 'Daily routine'] },
      { title: 'Calories in early spaceflight', evidence: 'review', sources: ['lsroNutrition'], text: 'Early missions assumed weightlessness needed fewer calories, but tasks that use friction on Earth take muscular effort in space. Apollo crews averaged 1,877 kcal a day against about 2,900 recommended and lost a mean 3.9 kg. U.S. space diets rose from about 2,500 to about 3,000 kcal a day. On the 13-day Apollo 17, intake fell short of needs and each crew member lost a mean 1 kg of lean body mass and 2.3 kg of fat. Unpalatable early foods were often not fully eaten.', watch: 'Record what is actually eaten, including snacks.', track: ['routine', 'Daily routine'] },
      { title: 'Diet and weight loss on Skylab', evidence: 'crew', sources: ['lsroNutrition'], text: 'Of the nine Skylab crew, the five who ate less in flight lost 75% more weight than those who kept their preflight intake. About 60% of the weight lost was lean body mass. Skylab 4, with the most food and exercise, was the only flight with no net tissue loss. Analyses suggest losses can be prevented with about 46 to 50 kcal per kg of body weight a day, plus 5 to 6 kcal per kg of exercise.', watch: 'Track body mass and food intake together.', track: ['routine', 'Daily routine'] }
    ] },
    behavior: { title: 'Mind and behavior', owner: 'Mohnish', items: [
      { title: 'Short sleep', evidence: 'crew', sources: ['jonesSleep', 'flynnEvans'], text: 'In 24 astronauts on six-month ISS missions, average sleep was about 6.5 hours. Sleeping under 6 hours was linked to slower responses, more stress and higher workload. Longer sleep helped. Sleep medication is also common in flight.', watch: 'Track sleep hours, stress and workload every day.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Depression and cognition', evidence: 'review', sources: ['yin'], text: 'The combined stress of long missions, including microgravity, isolation, noise and disrupted body clocks, could contribute to depression and cognitive impairment.', watch: 'Discuss lasting changes in mood, motivation or focus privately with the medical officer.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Isolation and confinement', evidence: 'review', sources: ['chouker', 'gatti'], text: 'Spaceflight analogs are used to study how prolonged isolation affects the brain, behavior and immune system. Stress, coping, adaptation and resilience can each be affected differently.', watch: 'Keep check-ins consistent so changes are easier to notice.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Team dynamics', evidence: 'review', sources: ['bell'], text: 'A review of 72 analog sources, such as Antarctic stations and space chambers, examined how crews work together. All teams reported at least one conflict by 90 days or 40% of the mission. Mood data did not consistently support a morale dip after the mission’s halfway point, known as the third-quarter phenomenon.', watch: 'Use the crew connection score in the daily check-in.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Loneliness', evidence: 'ground', sources: ['cantisani'], text: 'Twelve crew members at an Antarctic station were followed for 10 months with surveys and wearable proximity sensors. Loneliness and conflict rose while cohesion and performance fell. More close-range contact was linked to more conflict, so contact alone did not equal support.', watch: 'Discuss loneliness privately with the medical officer. Wearable sensors are not part of ORBIT.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Delayed contact with Earth', evidence: 'opinion', sources: ['pagnini', 'smith'], text: 'Communication delays, isolation and confinement can affect mental health. Automated support has been proposed for times when Earth cannot respond quickly, with benefits, drawbacks and unknowns still to be worked out.', watch: 'Plan what the crew will do while waiting for a reply.', track: ['voice', 'Crew voice AI assistant'] },
      { title: 'Cognitive testing', evidence: 'crew', sources: ['casario'], text: 'The Cognition battery of 10 brief tests was built for astronauts. Its acceptability was evaluated in 87 people on the ISS and in space analog settings on Earth.', watch: 'Repeated cognitive tests are not yet part of ORBIT.', track: null },
      { title: 'Isolation in analog habitats', evidence: 'review', sources: ['nasaIsolation'], text: 'NASA notes that sleep loss, body-clock disruption and work overload on long, isolated missions may lower performance and harm health, so crews are carefully chosen, trained and supported. Its analogs include HERA, a 650-square-foot habitat where crews live for 45 days, and CHAPEA, a 1,700-square-foot habitat for simulated year-long Mars stays with four crew.', watch: 'Log sleep, workload and mood across the mission.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Mood over long stays', evidence: 'crew', sources: ['apex'], text: 'The APEX psychology suite was given to 121 people in 40 teams: astronauts in space for 150 to 350 days and analog crews isolated for 45 to 240 days. No one showed clinically elevated depression. Positive mood declined over time, while negative mood and stress varied widely and tracked situational stressors more than time in isolation. These are summary results from a conference abstract.', watch: 'Note stressful events alongside mood check-ins.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Morale in the third quarter', evidence: 'crew', sources: ['stuster'], text: 'Personal journals from astronauts on six-month ISS expeditions were mostly about work, then outside communications, adjustment, crew interactions and recreation. Morale declined in the third quarter of the missions. Astronauts said journal writing helped them keep perspective, and living on the ISS was less difficult than they had expected.', watch: 'Check in more often during the third quarter of a long mission.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Distance from Earth', evidence: 'review', sources: ['nasaDistance', 'mcbrayer'], text: 'Mars is on average 140 million miles from Earth, and a Mars mission would keep crews away for about three years. NASA cites one-way communication delays of up to 20 minutes. A Mars mission analysis found delays of 0 to 22 minutes over a mission, and disruptions lasting from several days to several months depending on the communication band.', watch: 'Keep emergency procedures available without a link to Earth.', track: ['care', 'Log symptoms'] },
      { title: 'Acting without ground support', evidence: 'review', sources: ['parisi'], text: 'An analysis of real ISS and Apollo anomalies found that even delays of seconds to a minute hamper the ground’s real-time oversight and its ability to catch fast-moving problems. With delays of up to 40 minutes on Mars missions, crews must make time-critical decisions on their own. The authors note that the effectiveness of countermeasures is still a research gap.', watch: 'Rehearse decisions the crew may have to make alone.', track: ['care', 'Log symptoms'] }
    ] },
    radiation: { title: 'Space radiation', owner: 'Manav', items: [
      { title: 'Cancer risk', evidence: 'lab', sources: ['guo', 'chancellor', 'barcellos'], text: 'Cell and animal experiments show that high-energy protons and heavy ions can cause cancer. There are no human data on extended exposure to these complex radiation fields, so the size of the risk to astronauts remains very uncertain.', watch: 'Track cumulative dose against the mission limit.', track: ['risks', 'Mission health risks'] },
      { title: 'Brain and nervous system', evidence: 'lab', sources: ['chancellor', 'kokhan'], text: 'Space radiation may affect the central nervous system, but the evidence is mixed. Rodent and primate experiments show negative, neutral and even positive effects on cognition at space-related doses.', watch: 'Record changes in memory, focus or mood.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Long-term tissue damage', evidence: 'review', sources: ['chancellor', 'vernice'], text: 'Degenerative tissue effects are one of the main radiation risks beyond low Earth orbit. Exposure to deep space radiation has been linked to artery degeneration, aortic stiffness and faster atherosclerosis.', watch: 'Track cumulative dose and keep long-term follow-up records.', track: ['risks', 'Mission health risks'] },
      { title: 'Acute radiation syndrome', evidence: 'lab', sources: ['kennedy', 'chancellor'], text: 'A major solar particle event could put astronauts at significant risk of acute radiation syndrome, which other spaceflight stressors may worsen. Shielding is an effective countermeasure against these events.', watch: 'Follow the vehicle’s radiation procedure. Report unexplained nausea or fatigue after a solar event.', track: ['risks', 'Mission health risks'] },
      { title: 'Cataracts', evidence: 'crew', sources: ['cataract'], text: 'Among 295 astronauts, those with higher lens doses (above 8 mSv) had more cataracts. The authors call the results preliminary because the scoring methods were subjective.', watch: 'Record vision changes and keep eye exam results for follow-up.', track: null },
      { title: 'Radiation limits', evidence: 'review', sources: ['nasaRadiation'], text: 'NASA limits career effective dose to under 600 mSv for all ages and sexes, and exposure to 250 mSv per solar particle event. NASA also requires space weather monitoring, radiation alerting and dose monitoring.', watch: 'Enter dosimeter readings. ORBIT cannot measure radiation.', track: ['risks', 'Mission health risks'] },
      { title: 'Secondary radiation', evidence: 'review', sources: ['chancellor'], text: 'Space radiation striking spacecraft shielding produces secondary particles, including neutrons. These can deliver a significant share of the total mission dose.', watch: 'Follow the vehicle’s shielding and shelter procedure.', track: null },
      { title: 'Light flashes', evidence: 'crew', sources: ['fuglesang'], text: 'Of 59 astronauts who answered a survey, 47 noticed flashes of light during spaceflight, most often before sleep. They are related to high-energy particles, and several people thought they disturbed their sleep.', watch: 'Note disturbed sleep in the daily check-in.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Radiation dose (Apollo 10)', evidence: 'crew', sources: ['apollo10'], text: 'Each Apollo 10 crewman received a total absorbed dose of about 0.5 rad, which the report calls well below the medically significant threshold. Passive dosimeters at the chest, thigh and ankle read 386 to 560 millirads. Passing through the Van Allen belts, the highest rates were 3.63 rad/hr skin dose and 2.09 rad/hr depth dose.', watch: 'Record dosimeter readings after each pass through high-radiation regions.', track: ['risks', 'Mission health risks'] }
    ] },
    immune: { title: 'Immune system and skin', owner: 'Felix', items: [
      { title: 'Dormant virus reactivation', evidence: 'crew', sources: ['rooney', 'crucianReview'], text: 'Dormant herpes viruses reactivate during spaceflight: 53% of shuttle astronauts and 61% of ISS astronauts shed one or more. Shedding is typically symptom-free, though it has been linked to skin lesions in some cases.', watch: 'Viral testing needs laboratory equipment. Record cold sores and skin lesions.', track: ['skin', 'Skin & wounds'] },
      { title: 'Altered immune signaling', evidence: 'crew', sources: ['cytokine'], text: 'Blood levels of 22 cytokines were monitored in 28 astronauts on long ISS missions. Several rose during flight, suggesting that immune regulation changes in space.', watch: 'Immune blood tests are not yet part of ORBIT.', track: null },
      { title: 'Rashes and infections', evidence: 'crew', sources: ['crucian'], text: 'Medical records from 46 ISS crew members showed 3.40 immune-related events per flight year. Skin rashes were reported most often, followed by upper respiratory symptoms. Rashes or hypersensitivities made up 40% of notable events.', watch: 'Record temperature, new rashes and respiratory symptoms.', track: ['skin', 'Skin & wounds'] },
      { title: 'Wound healing', evidence: 'review', sources: ['puhl'], text: 'Research suggests that wound healing is slowed and impaired in microgravity. Radiation and other spaceflight stressors may add to this.', watch: 'Track size and warning signs until the wound heals.', track: ['skin', 'Skin & wounds'] },
      { title: 'Skin microbes', evidence: 'crew', sources: ['voorhies'], text: 'In nine astronauts on six to twelve month ISS missions, microbes on the skin, gut, nose and tongue changed. The skin changes might contribute to the high rate of rashes.', watch: 'Record skin irritation and how long it lasts.', track: ['skin', 'Skin & wounds'] },
      { title: 'Skin inflammation', evidence: 'crew', sources: ['park'], text: 'Skin biopsies from the four-person Inspiration4 crew showed raised inflammation-related gene activity after a three-day flight, along with DNA damage and barrier disruption.', watch: 'Record redness, dryness or irritation.', track: ['skin', 'Skin & wounds'] },
      { title: 'Skin fungi', evidence: 'crew', sources: ['sugita'], text: 'In 10 astronauts on half-year ISS stays, skin fungal diversity fell and the share of Malassezia rose. An uncommon yeast was abundant in flight samples from 5 of the 10. Higher colonization is not the same as an infection.', watch: 'Flag skin symptoms that persist.', track: ['skin', 'Skin & wounds'] },
      { title: 'Allergy and hypersensitivity', evidence: 'review', sources: ['crucianReview', 'crucian'], text: 'Some crew members have allergic symptoms and persistent skin hypersensitivity reactions during flight. Longer missions and deep space radiation may increase this clinical risk.', watch: 'Record rashes, itching or swelling and what you were exposed to.', track: ['skin', 'Skin & wounds'] },
      { title: 'Fingernail injuries', evidence: 'crew', sources: ['opperman'], text: 'Records from 232 crew members linked fingernail separation to hand size. Hand circumference had the strongest effect on the likelihood of injury from spacesuit gloves.', watch: 'Record nail pain, discoloration or separation after spacewalk work.', track: ['skin', 'Skin & wounds'] },
      { title: 'Skin thinning', evidence: 'lab', sources: ['neutelings'], text: 'Mice kept 91 days on the ISS had 15% thinner dermis than matched ground mice. This has not been shown in people.', watch: 'Record skin dryness or fragility.', track: ['skin', 'Skin & wounds'] },
      { title: 'Bacteria in flight', evidence: 'lab', sources: ['wilson'], text: 'Salmonella grown on a Space Shuttle mission changed gene expression and was more virulent in mice. This study did not involve infections in crew.', watch: 'Follow hygiene procedures and report signs of infection.', track: null },
      { title: 'Lasting gene changes', evidence: 'crew', sources: ['twins'], text: 'In the one-year NASA Twins Study, most gene expression returned to near preflight levels within six months, but some genes stayed disrupted. This is one astronaut, compared with their identical twin.', watch: 'Keep long-term follow-up records after the mission.', track: null }
    ] },
    gravity: { title: 'Altered gravity', owner: 'Avneet', items: [
      { title: 'Bone loss', evidence: 'crew', sources: ['man'], text: 'Microgravity causes 1 to 2% bone loss per month in astronauts, mainly in weight-bearing bones.', watch: 'Compare repeated scans from the same site.', track: ['risks', 'Mission health risks'] },
      { title: 'Back pain and muscle loss', evidence: 'review', sources: ['ceniza'], text: 'A systematic review of 11 studies found lower back muscle atrophy, reduced range of motion and disc changes. Reports of pain reached 77% during flight, 47% acute after flight and 33% chronic.', watch: 'Record back pain and changes in movement.', track: ['exercise', 'Exercise'] },
      { title: 'Exercise countermeasures', evidence: 'review', sources: ['jonesExercise', 'scott'], text: 'The ISS schedule allows 2.5 hours of exercise a day, and current recommendations combine strength and aerobic training. If that combination is planned poorly, strength gains can be held back, so timing matters.', watch: 'Log both aerobic and resistance sessions against the plan.', track: ['exercise', 'Exercise'] },
      { title: 'Heart and circulation', evidence: 'review', sources: ['vernice', 'hoenemann'], text: 'Fluid shifts toward the head reduce plasma volume by about 10 to 15%. Fainting or near-fainting on standing commonly follows spaceflight. The Hoenemann study is a 60-day bed rest study, not a spaceflight study.', watch: 'Track heart rate and blood pressure, and take care when returning to gravity.', track: ['log', 'Health log'] },
      { title: 'Balance after landing', evidence: 'crew', sources: ['clement'], text: 'On landing day, 28 astronauts performed walking and balance tests at a level comparable to people with bilateral vestibulopathy, a serious balance disorder.', watch: 'Plan for impaired balance after any return to gravity.', track: null },
      { title: 'Heart muscle', evidence: 'ground', sources: ['perhonen'], text: 'In a small study, left ventricle mass fell 8% after six weeks of bed rest. It fell 12% in four astronauts after a 10-day flight, though that change was not statistically significant.', watch: 'Keep up the exercise plan and record heart rate and blood pressure.', track: ['log', 'Health log'] },
      { title: 'Eye changes', evidence: 'crew', sources: ['lee'], text: 'Long microgravity exposure can cause spaceflight-associated neuro-ocular syndrome. Findings include optic disc swelling, globe flattening, retinal folds and shifts toward farsightedness.', watch: 'Report near-vision changes. Eye imaging is not part of ORBIT.', track: null },
      { title: 'Kidney stones', evidence: 'crew', sources: ['pietrzyk'], text: 'Analysis of 24-hour urine samples showed an increased risk of stone formation after landing. Risk factors can be assessed before flight and right after landing.', watch: 'Follow the fluid and diet plan. Report flank pain or urinary symptoms.', track: null },
      { title: 'Changing gravity fields', evidence: 'review', sources: ['nasaGravity'], text: 'Without Earth’s gravity, weight-bearing bones lose on average 1% to 1.5% of mineral density per month. Fluid shifts toward the head can press on the eyes and affect vision, and dehydration plus calcium leaving the bones can raise kidney stone risk. Moving between gravity fields affects orientation, coordination and balance and can cause space motion sickness. Returning to gravity can cause lightheadedness and fainting.', watch: 'Plan for dizziness and balance problems after each gravity change.', track: ['risks', 'Mission health risks'] },
      { title: 'Heart and circulation after Apollo', evidence: 'crew', sources: ['hoffler'], text: 'Apollo crews had reduced orthostatic tolerance after flight. Heart rate was the most reliable sign: it rose right after flight while systolic and pulse pressure fell. Body weight, calf girth, leg volume and cardiothoracic ratio all decreased and had not fully recovered by the end of postflight testing. Changes varied widely between crew members.', watch: 'Compare standing heart rate and blood pressure with preflight values.', track: ['log', 'Health log'] },
      { title: 'Motion sickness on Apollo', evidence: 'crew', sources: ['homick'], text: 'The larger Apollo command and lunar modules allowed more movement, and vestibular disturbances were more common than on earlier flights. The findings come from motion sickness histories and astronaut reports, because there was no systematic testing program. The authors say in-flight vestibular problems are hard to predict.', watch: 'Log nausea or disorientation, especially in the first days of flight.', track: ['care', 'Log symptoms'] },
      { title: 'Adapting to weightlessness (Apollo 10)', evidence: 'crew', sources: ['apollo10'], text: 'After orbital insertion, all three Apollo 10 crew felt fullness of the head, lasting about 8, 12 and 24 hours. The Lunar Module Pilot had mild vestibular disturbance for the first 2 days and reached the point of nausea within 2 minutes of head-movement exercises. Heart rates during normal activity ranged from 49 to 93 beats/min, rose in critical phases and quickly returned to baseline. No in-flight illnesses occurred.', watch: 'Record head fullness and motion sensitivity in the first days.', track: ['log', 'Health log'] },
      { title: 'Long-duration findings from Skylab', evidence: 'crew', sources: ['skylabMedical'], text: 'On Skylab missions lasting up to 84 days, crews had space motion sickness early in flight, moderate cardiovascular deconditioning, and loss of red cell mass and plasma volume. Calcium loss averaged 6 grams a month, or 0.5% of total body calcium, comparable to bed rest. Orthostatic intolerance appeared early after landing, and recovery was faster after missions with more in-flight exercise. The report concludes crews perform well with proper nutrition, regular exercise and enough sleep.', watch: 'Log exercise sessions and recovery after landing.', track: ['exercise', 'Exercise'] },
      { title: 'Skylab clinical summary', evidence: 'crew', sources: ['skylabResults'], text: 'Three Skylab crews flew for about 672, 1,427 and 2,017 hours. From a clinical view, all physiological and psychological responses were self-limiting or needed only minimal counteraction, and they did not rule out longer stays in zero gravity.', watch: 'Track whether each change settles without treatment.', track: ['log', 'Health log'] },
      { title: 'Early weightless flight (Mercury-Atlas 7)', evidence: 'crew', sources: ['ma7Report'], text: 'Medical examinations of two astronauts who each flew about 4.5 hours weightless found no physical or biochemical evidence of harm: no lung collapse (atelectasis), cosmic-ray damage or psychiatric problems. Despite deliberate efforts to provoke them, no vestibular or related stomach symptoms occurred. On Mercury-Atlas 7, Scott Carpenter lost about 6 pounds although he drank more than he passed.', watch: 'Weigh before and after flight to catch dehydration.', track: ['log?crew=hist-ma7', 'View in Scott Carpenter’s health log'] },
      { title: 'Calcium and vitamin D', evidence: 'review', sources: ['lsroNutrition'], text: 'On Skylab 4 calcium loss rose to almost 300 mg a day by day 84, and one projection put the loss at 25% of the body’s calcium over a year. The 1986 review suggested 1,200 to 1,500 mg of calcium a day instead of the Shuttle’s 800 mg, and noted that without sunlight vitamin D may run short, with no safe intake range yet set for long flights.', watch: 'Follow the calcium and vitamin D plan.', track: ['risks', 'Mission health risks'] }
    ] },
    spacewalks: { title: 'Spacewalks', owner: 'Mohnish', items: [
      { title: 'Why spacewalk effort is monitored', evidence: 'review', sources: ['paulEva'], text: 'Tracking metabolic rate in real time during a spacewalk protects the crew member, shows how fast oxygen and cooling water are used, and lets planners change tasks. The laboratory method, open-circuit spirometry, is impractical in a suit. Heart rate, suit oxygen pressure decay and cooling-garment water temperatures have all been used, but none is reliable alone: heart rate also rises with stress, and oxygen decay includes suit leakage.', watch: 'Log heart rate and how hard suited work feels.', track: ['log', 'Health log'] },
      { title: 'Overexertion on Gemini spacewalks', evidence: 'crew', sources: ['paulEva'], text: 'Gemini spacewalks took more effort than expected and at times exceeded the suit’s cooling. High exertion fogged the visor on Gemini IV and IX-A, and IX-A ended early. On Gemini XI sweat ran into the astronaut’s eyes and the spacewalk was ended early. For Gemini XII, NASA added restraints, underwater training and closer heart rate monitoring, advising the crew member when heart rate stayed at or above 140 beats per minute.', watch: 'Rest when heart rate stays high during suited work.', track: ['log', 'Health log'] },
      { title: 'Effort on the Apollo moonwalks', evidence: 'crew', sources: ['paulEva'], text: 'Average metabolic rates on the 14 Apollo lunar surface spacewalks ranged from 780 to 1,200 Btu/hr, with a mean of about 930 Btu/hr (980 kJ/hr), lower than predicted. Moving equipment, climbing in and out of the lander and drilling cost the most, and riding the Lunar Roving Vehicle the least, about 392 Btu/hr. On Apollo 14 a crew member’s heart rate reached 150 bpm while hauling a cart toward Cone Crater, and the task was abandoned.', watch: 'Plan rest stops between heavy surface tasks.', track: ['log', 'Health log'] },
      { title: 'Apollo spacewalks in weightlessness', evidence: 'crew', sources: ['paulEva'], text: 'Four Apollo spacewalks in weightlessness, mainly to retrieve film, averaged 63 minutes. The suits had only gas cooling, which could not sustain more than about 995 Btu/hr, yet the crew did not overheat. The low work rates were credited to good restraints, underwater training and the short duration.', watch: 'Use restraints and rehearse tasks to keep effort down.', track: ['log', 'Health log'] },
      { title: 'Energy cost of spacewalks', evidence: 'crew', sources: ['lsroNutrition'], text: 'Apollo lunar spacewalks averaged 234 kcal per hour over almost 159 hours, Skylab spacewalks 230 kcal per hour over more than 83 hours, and Shuttle spacewalks 196 kcal per hour measured by oxygen use. The peak, 500 kcal per hour, came when the Skylab 2 commander cut a strap jamming a solar panel. Riding the lunar rover cost about 123 kcal per hour; climbing in and out of the vehicle about 270.', watch: 'Allow extra food after a spacewalk.', track: ['routine', 'Daily routine'] },
      { title: 'Water during spacewalks', evidence: 'review', sources: ['lsroNutrition'], text: 'A 1986 review for NASA warned that breathing dry 100% oxygen for up to 6 hours on a spacewalk risks dehydration, that thirst is not a reliable guide to water needs, and recommended working out how much water the suit should carry. Electrolyte loss from sweat is highest in the first few minutes of sweating.', watch: 'Drink before and after a spacewalk and log the amount.', track: ['routine', 'Daily routine'] },
      { title: 'Heart rate as a workload estimate', evidence: 'crew', sources: ['evaHeartRate'], text: 'In 132 Shuttle and ISS spacewalks of five hours or more, heart rate and metabolic rate fell together over the spacewalk, from about 117 bpm and 1,040 Btu/hr at the start to about 100 bpm and 813 Btu/hr at hour four. One regression across all spacewalks explained 40% of the variation, but one fitted to each crew member explained over 82% and kept prediction error within the 200 Btu/hr accepted during Apollo. On average each heartbeat corresponded to about 0.14 Btu.', watch: 'Compare suited heart rate with the crew member’s own baseline.', track: ['log', 'Health log'] },
      { title: 'Simulated lunar spacewalks', evidence: 'ground', sources: ['evaCardiothermal'], text: 'Two suited operators in NASA’s Mark III suit did 3- to 5-hour simulated lunar spacewalks at one-sixth gravity on NASA’s ARGOS offload rig, walking graded treadmills, sampling geology and moving objects. Heart-rate models predicted metabolic rate within 200 Btu/hr, and adding suit cooling and humidity readings cut the error below 180 Btu/hr. Models predicted core temperature within 0.12 to 0.46 °C, similar to NASA’s METMAN thermal model, and skin temperature better than it. Only two people were tested.', watch: 'Watch core temperature during long suited work.', track: ['log', 'Health log'] },
      { title: 'Heart rhythm under spacewalk load', evidence: 'ground', sources: ['evaCardiothermal'], text: 'In the same simulated lunar spacewalks, harder tasks raised the ratio of low- to high-frequency heart rate variability (LF/HF), which the author reads as a shift toward stress-type sympathetic control. Metabolic rates ranged from about 480 Btu/hr while adjusting suit settings to about 1,400 Btu/hr walking a 30% grade.', watch: 'Note which tasks bring the highest strain.', track: ['wellbeing', 'Sleep & wellbeing'] },
      { title: 'Irregular heartbeats on Apollo 15', evidence: 'crew', sources: ['paulEva', 'lsroNutrition'], text: 'On Apollo 15, the first mission with the Lunar Roving Vehicle and 7- to 8-hour moonwalks, flight doctors saw irregular heartbeats in the moonwalking crew, continuing on the way home. The cause was uncertain: low potassium and workload may have contributed, and one crew member may have had undetected coronary artery disease. NASA added potassium to drinks on later flights, and no irregular heartbeats were recorded on Apollo 16.', watch: 'Report palpitations or an irregular pulse.', track: ['care', 'Log symptoms'] }
    ] },
    hostile: { title: 'Hostile Environments', owner: 'Mohnish', items: [
      { title: 'Fiberglass in the cabin (Apollo 10)', evidence: 'crew', sources: ['apollo10'], text: 'On Apollo 10, fiberglass insulation blew into the command and lunar modules. It irritates skin and mucous membranes, and the crew had scratchy throats, coughing, nasal stuffiness, mild eye irritation and some skin rash. The nasal stuffiness cleared in about 5 days, and water rinses and eye drops relieved the eye irritation.', watch: 'Record eye, throat or skin irritation after any cabin contamination.', track: ['skin', 'Skin & wounds'] },
      { title: 'Water and food (Apollo 10)', evidence: 'crew', sources: ['apollo10'], text: 'Apollo 10 crew drank about 3 pounds of water per man per day for the first 35 hours, and 75 pounds in total over the first 128 hours. Hydrogen gas in the drinking water caused abdominal rumbling, and the crew took Lomotil against possible diarrhea, which the report says was not medically indicated. Estimated daily food intake was about 1,311 to 1,484 kilocalories.', watch: 'Track fluid and food intake against the plan.', track: ['routine', 'Daily routine'] },
      { title: 'Microbes on Skylab', evidence: 'crew', sources: ['skylabResults'], text: 'Skylab showed gross microbial contamination of the cabin and several in-flight disease events, presumably microbial, and disease-causing microbes passed between crew members. These events were not shown to be limiting hazards for long flights. None of the in-flight illnesses was tested microbiologically.', watch: 'Log infections and who else on the crew has symptoms.', track: ['care', 'Log symptoms'] },
      { title: 'Planet Mercury', evidence: 'reference', sources: ['mercuryFacts'], text: 'Mercury has no true atmosphere, only a thin exosphere. Daytime highs reach 800°F (430°C) and nights fall to -290°F (-180°C). Its magnetic field is about 1% as strong as Earth’s. One full day-night cycle lasts 176 Earth days.', watch: 'Reference conditions for mission planning, not crew readings.', track: null },
      { title: 'Planet Venus', evidence: 'reference', sources: ['venusFacts'], text: 'Venus has surface temperatures of about 872°F (467°C) and surface pressure 93 times Earth’s at sea level. The atmosphere is mostly carbon dioxide, with clouds of sulfuric acid. One day lasts 243 Earth days.', watch: 'Reference conditions for mission planning, not crew readings.', track: null },
      { title: 'Planet Earth', evidence: 'reference', sources: ['earthFacts'], text: 'Near the surface, Earth’s air is 78% nitrogen, 21% oxygen and 1% other gases such as argon, carbon dioxide and neon. The atmosphere shields the surface from much of the Sun’s harmful radiation. Earth rotates once every 23.9 hours.', watch: 'Baseline for comparing other environments.', track: null },
      { title: 'Planet Mars', evidence: 'reference', sources: ['marsFacts'], text: 'Mars temperatures range from about -225°F (-153°C) to 70°F (20°C). The thin atmosphere is mostly carbon dioxide, nitrogen and argon, and Mars has no global magnetic field today. A day (sol) lasts 24.6 hours. Dust storms can cover much of the planet, and the dust can take months to settle.', watch: 'Reference conditions for mission planning, not crew readings.', track: null },
      { title: 'Planet Jupiter', evidence: 'reference', sources: ['jupiterFacts'], text: 'Jupiter has no true surface and is mostly hydrogen and helium. Its magnetic field is 16 to 54 times as powerful as Earth’s, and charged particles trapped near the planet create intense radiation that can damage spacecraft. One day lasts 9.9 hours.', watch: 'Reference conditions for mission planning, not crew readings.', track: null },
      { title: 'Planet Saturn', evidence: 'reference', sources: ['saturnFacts'], text: 'Saturn has no true surface and is mostly hydrogen and helium. Winds in the upper atmosphere reach 1,600 feet per second (500 meters per second) near the equator. Its magnetic field is 578 times as powerful as Earth’s. One day lasts 10.7 hours.', watch: 'Reference conditions for mission planning, not crew readings.', track: null },
      { title: 'Planet Uranus', evidence: 'reference', sources: ['uranusFacts'], text: 'Uranus has no true surface. Its atmosphere is mostly hydrogen and helium with a little methane and traces of water and ammonia, and reaches a minimum of 49 K (-224.2°C). It is tilted 97.77 degrees, and one day lasts about 17 hours.', watch: 'Reference conditions for mission planning, not crew readings.', track: null },
      { title: 'Planet Neptune', evidence: 'reference', sources: ['neptuneFacts'], text: 'Neptune has no solid surface. Its atmosphere is mostly hydrogen and helium with a little methane, and winds drive frozen methane clouds at more than 1,200 miles per hour (2,000 km/h). One day lasts about 16 hours.', watch: 'Reference conditions for mission planning, not crew readings.', track: null }
    ] }
  };
  // BEGIN GENERATED HISTORICAL EVIDENCE
  EVIDENCE.historical = 'Historical mission data (supplied transcription)';
  SOURCES.historicalCsv = {"cite": "User-supplied historical metrics CSV", "title": "ALL_NUMERIC_METRICS_LONG.csv \u2014 PDF/page/table references retained in each entry", "journal": "Original PDFs not supplied; transcription unverified", "url": "./assets/ALL_NUMERIC_METRICS_LONG.csv"};
  TOPICS.historical = {
  "title": "Historical mission measurements",
  "items": [
    {
      "title": "NASA-VITAL-001: Mercury-Atlas 9 — Prelaunch",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 9; Subject: Gordon Cooper; Mission phase: Prelaunch; Record type: reported_phase_value. Measurements: heart rate: 72 bpm (heart_rate_bpm); systolic bp: 113 mmHg (systolic_bp_mmHg); diastolic bp: 79 mmHg (diastolic_bp_mmHg); respiratory rate: 19 breaths/min (respiratory_rate_breaths_min). Source reference: 19770026836.pdf, page 420, Table 40-III. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma9",
        "View in Gordon Cooper’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-002: Mercury-Atlas 9 — Orbital",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 9; Subject: Gordon Cooper; Mission phase: Orbital; Record type: reported_phase_value. Measurements: heart rate: 89 bpm (heart_rate_bpm); systolic bp: 119 mmHg (systolic_bp_mmHg); diastolic bp: 81 mmHg (diastolic_bp_mmHg); respiratory rate: 15 breaths/min (respiratory_rate_breaths_min). Source reference: 19770026836.pdf, page 420, Table 40-III. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma9",
        "View in Gordon Cooper’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-003: Mercury-Atlas 9 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 9; Subject: Gordon Cooper; Mission phase: Postflight; Posture: supine; Relative time: 1–7 hours after landing; Record type: reported_phase_value. Measurements: heart rate: 83 bpm (heart_rate_bpm); systolic bp: 89 mmHg (systolic_bp_mmHg); diastolic bp: 64 mmHg (diastolic_bp_mmHg). Source reference: 19770026836.pdf, page 420, Table 40-III. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma9",
        "View in Gordon Cooper’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-004: Mercury-Atlas 9 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 9; Subject: Gordon Cooper; Mission phase: Postflight; Posture: erect; Relative time: 1–7 hours after landing; Record type: reported_phase_value. Measurements: heart rate: 123 bpm (heart_rate_bpm); systolic bp: 90 mmHg (systolic_bp_mmHg); diastolic bp: 73 mmHg (diastolic_bp_mmHg). Source reference: 19770026836.pdf, page 420, Table 40-III. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma9",
        "View in Gordon Cooper’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-005: Mercury-Atlas 9 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 9; Subject: Gordon Cooper; Mission phase: Postflight; Posture: supine; Relative time: 18 hours after landing; Record type: reported_phase_value. Measurements: heart rate: 58 bpm (heart_rate_bpm); systolic bp: 98 mmHg (systolic_bp_mmHg); diastolic bp: 61 mmHg (diastolic_bp_mmHg). Source reference: 19770026836.pdf, page 420, Table 40-III. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma9",
        "View in Gordon Cooper’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-006: Mercury-Atlas 9 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 9; Subject: Gordon Cooper; Mission phase: Postflight; Posture: erect; Relative time: 18 hours after landing; Record type: reported_phase_value. Measurements: heart rate: 80 bpm (heart_rate_bpm); systolic bp: 94 mmHg (systolic_bp_mmHg); diastolic bp: 68 mmHg (diastolic_bp_mmHg). Source reference: 19770026836.pdf, page 420, Table 40-III. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma9",
        "View in Gordon Cooper’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-007: Mercury-Atlas 9 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 9; Subject: Gordon Cooper; Mission phase: Postflight; Record type: reported_temperature. Measurements: body temperature: 99.4 degF (body_temperature_f); body temperature: 37.44 degC (body_temperature_c). Source reference: 19770026836.pdf, page 420, Table 40-III. Quality notes: Oral temperature; table reports 310.6 K (99.4°F). Postflight timing unspecified. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma9",
        "View in Gordon Cooper’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-008: Mercury-Atlas 7 — All preflight data",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 7; Subject: Scott Carpenter; Mission phase: All preflight data; Record type: aggregate_mean. Measurements: heart rate: 57 bpm (heart_rate_bpm); heart rate min: 42 bpm (heart_rate_min_bpm); heart rate max: 84 bpm (heart_rate_max_bpm); heart rate sample count: 408 count (heart_rate_sample_count); respiratory rate: 15 breaths/min (respiratory_rate_breaths_min); respiratory rate min: 5 breaths/min (respiratory_rate_min); respiratory rate max: 32 breaths/min (respiratory_rate_max); respiratory rate sample count: 354 count (respiratory_rate_sample_count); body temperature: 99.3 degF (body_temperature_f); body temperature: 37.39 degC (body_temperature_c); body temperature min: 98.3 degF (body_temp_min_f); body temperature max: 101.5 degF (body_temp_max_f); body temperature sample count: 128 count (body_temp_sample_count). Source reference: More nasa data 2.pdf, page 66, Table 5-XII. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma7",
        "View in Scott Carpenter’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-009: Mercury-Atlas 7 — Countdown",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 7; Subject: Scott Carpenter; Mission phase: Countdown; Record type: aggregate_mean. Measurements: heart rate: 62 bpm (heart_rate_bpm); heart rate min: 50 bpm (heart_rate_min_bpm); heart rate max: 84 bpm (heart_rate_max_bpm); heart rate sample count: 92 count (heart_rate_sample_count); respiratory rate: 15 breaths/min (respiratory_rate_breaths_min); respiratory rate min: 6 breaths/min (respiratory_rate_min); respiratory rate max: 26 breaths/min (respiratory_rate_max); respiratory rate sample count: 75 count (respiratory_rate_sample_count); body temperature: 97.8 degF (body_temperature_f); body temperature: 36.56 degC (body_temperature_c); body temperature min: 96.8 degF (body_temp_min_f); body temperature max: 98.2 degF (body_temp_max_f); body temperature sample count: 57 count (body_temp_sample_count). Source reference: More nasa data 2.pdf, page 66, Table 5-XII. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma7",
        "View in Scott Carpenter’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-010: Mercury-Atlas 7 — Launch",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 7; Subject: Scott Carpenter; Mission phase: Launch; Record type: aggregate_mean. Measurements: heart rate: 87 bpm (heart_rate_bpm); heart rate min: 82 bpm (heart_rate_min_bpm); heart rate max: 96 bpm (heart_rate_max_bpm); heart rate sample count: 7 count (heart_rate_sample_count); respiratory rate: 16 breaths/min (respiratory_rate_breaths_min); respiratory rate min: 10 breaths/min (respiratory_rate_min); respiratory rate max: 20 breaths/min (respiratory_rate_max); respiratory rate sample count: 5 count (respiratory_rate_sample_count); body temperature: 98 degF (body_temperature_f); body temperature: 36.67 degC (body_temperature_c); body temperature min: 98 degF (body_temp_min_f); body temperature max: 98 degF (body_temp_max_f); body temperature sample count: 4 count (body_temp_sample_count). Source reference: More nasa data 2.pdf, page 66, Table 5-XII. Quality notes: No quality note supplied. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma7",
        "View in Scott Carpenter’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-011: Mercury-Atlas 7 — Orbital",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 7; Subject: Scott Carpenter; Mission phase: Orbital; Record type: aggregate_mean. Measurements: heart rate: 70 bpm (heart_rate_bpm); heart rate min: 60 bpm (heart_rate_min_bpm); heart rate max: 94 bpm (heart_rate_max_bpm); heart rate sample count: 94 count (heart_rate_sample_count); respiratory rate: 14 breaths/min (respiratory_rate_breaths_min); respiratory rate min: 10 breaths/min (respiratory_rate_min); respiratory rate max: 18 breaths/min (respiratory_rate_max); respiratory rate sample count: 83 count (respiratory_rate_sample_count); body temperature: 99.9 degF (body_temperature_f); body temperature: 37.72 degC (body_temperature_c); body temperature min: 98 degF (body_temp_min_f); body temperature max: 100.6 degF (body_temp_max_f); body temperature sample count: 60 count (body_temp_sample_count). Source reference: More nasa data 2.pdf, page 66, Table 5-XII. Quality notes: Respiratory-rate estimates derived from ECG R-wave variation; approximate only. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma7",
        "View in Scott Carpenter’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-012: Mercury-Atlas 7 — Reentry",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 7; Subject: Scott Carpenter; Mission phase: Reentry; Record type: aggregate_mean. Measurements: heart rate: 84 bpm (heart_rate_bpm); heart rate min: 72 bpm (heart_rate_min_bpm); heart rate max: 104 bpm (heart_rate_max_bpm); heart rate sample count: 15 count (heart_rate_sample_count); respiratory rate: 19 breaths/min (respiratory_rate_breaths_min); respiratory rate min: 16 breaths/min (respiratory_rate_min); respiratory rate max: 24 breaths/min (respiratory_rate_max); respiratory rate sample count: 9 count (respiratory_rate_sample_count); body temperature: 100.4 degF (body_temperature_f); body temperature: 38.0 degC (body_temperature_c); body temperature min: 100.2 degF (body_temp_min_f); body temperature max: 100.5 degF (body_temp_max_f); body temperature sample count: 15 count (body_temp_sample_count). Source reference: More nasa data 2.pdf, page 66, Table 5-XII. Quality notes: Respiratory-rate estimates derived from ECG R-wave variation; approximate only. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma7",
        "View in Scott Carpenter’s health log"
      ]
    },
    {
      "title": "NASA-VITAL-013: Mercury-Atlas 7 — Preflight transfer van",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Mercury-Atlas 7; Subject: Scott Carpenter; Mission phase: Preflight transfer van; Relative time: ~50 minutes on launch day; Record type: aggregate_mean. Measurements: heart rate: 65 bpm (heart_rate_bpm); heart rate min: 56 bpm (heart_rate_min_bpm); heart rate max: 70 bpm (heart_rate_max_bpm); respiratory rate: 14 breaths/min (respiratory_rate_breaths_min); respiratory rate min: 8 breaths/min (respiratory_rate_min); respiratory rate max: 20 breaths/min (respiratory_rate_max). Source reference: More nasa data 2.pdf, page 64, Narrative. Quality notes: Narrative preflight transfer-van period; no blood pressure or body temperature recorded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": [
        "log?crew=hist-ma7",
        "View in Scott Carpenter’s health log"
      ]
    },
    {
      "title": "SKYLAB4-COMMANDER-REST-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: Preflight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 66 bpm (heart_rate_bpm); systolic bp: 96 mmHg (systolic_bp_mmHg); diastolic bp: 67 mmHg (diastolic_bp_mmHg); minute ventilation: 8.9 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.237 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.234 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-REST-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: In-flight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 66 bpm (heart_rate_bpm); systolic bp: 97 mmHg (systolic_bp_mmHg); diastolic bp: 59 mmHg (diastolic_bp_mmHg); minute ventilation: 11.79 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.283 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.301 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-REST-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: Postflight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 76 bpm (heart_rate_bpm); systolic bp: 106 mmHg (systolic_bp_mmHg); diastolic bp: 72 mmHg (diastolic_bp_mmHg); minute ventilation: 9.27 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.203 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.187 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-LEVEL3-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: Preflight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 157 bpm (heart_rate_bpm); systolic bp: 192 mmHg (systolic_bp_mmHg); diastolic bp: 71 mmHg (diastolic_bp_mmHg); minute ventilation: 64.43 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 2.26 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.14 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-LEVEL3-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: In-flight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 152 bpm (heart_rate_bpm); systolic bp: 195 mmHg (systolic_bp_mmHg); diastolic bp: 56 mmHg (diastolic_bp_mmHg); minute ventilation: 62.04 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 2.2 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.13 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-LEVEL3-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: Postflight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 163 bpm (heart_rate_bpm); systolic bp: 195 mmHg (systolic_bp_mmHg); diastolic bp: 67 mmHg (diastolic_bp_mmHg); minute ventilation: 60.04 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 2.14 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.05 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-RECOVERY-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: Preflight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 112 bpm (heart_rate_bpm); systolic bp: 149 mmHg (systolic_bp_mmHg); diastolic bp: 66 mmHg (diastolic_bp_mmHg); minute ventilation: 25.98 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.603 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.721 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-RECOVERY-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: In-flight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 87 bpm (heart_rate_bpm); systolic bp: 131 mmHg (systolic_bp_mmHg); diastolic bp: 61 mmHg (diastolic_bp_mmHg); minute ventilation: 24.65 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.632 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.776 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-COMMANDER-RECOVERY-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Commander; Mission phase: Postflight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 109 bpm (heart_rate_bpm); systolic bp: 170 mmHg (systolic_bp_mmHg); diastolic bp: 78 mmHg (diastolic_bp_mmHg); minute ventilation: 29.18 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.717 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.839 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-REST-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: Preflight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 64 bpm (heart_rate_bpm); systolic bp: 127 mmHg (systolic_bp_mmHg); diastolic bp: 84 mmHg (diastolic_bp_mmHg); minute ventilation: 7.51 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.269 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.255 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-REST-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: In-flight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 62 bpm (heart_rate_bpm); systolic bp: 119 mmHg (systolic_bp_mmHg); diastolic bp: 74 mmHg (diastolic_bp_mmHg); minute ventilation: 9.98 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.289 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.279 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-REST-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: Postflight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 74 bpm (heart_rate_bpm); systolic bp: 123 mmHg (systolic_bp_mmHg); diastolic bp: 78 mmHg (diastolic_bp_mmHg); minute ventilation: 10.33 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.263 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.221 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-LEVEL3-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: Preflight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 164 bpm (heart_rate_bpm); systolic bp: 204 mmHg (systolic_bp_mmHg); diastolic bp: 55 mmHg (diastolic_bp_mmHg); minute ventilation: 84.18 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 3.07 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.88 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-LEVEL3-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: In-flight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 166 bpm (heart_rate_bpm); systolic bp: 200 mmHg (systolic_bp_mmHg); diastolic bp: 52 mmHg (diastolic_bp_mmHg); minute ventilation: 97.24 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 3.01 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 3.03 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-LEVEL3-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: Postflight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 167 bpm (heart_rate_bpm); systolic bp: 198 mmHg (systolic_bp_mmHg); diastolic bp: 51 mmHg (diastolic_bp_mmHg); minute ventilation: 102.69 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 3.0 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.91 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-RECOVERY-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: Preflight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 104 bpm (heart_rate_bpm); systolic bp: 186 mmHg (systolic_bp_mmHg); diastolic bp: 66 mmHg (diastolic_bp_mmHg); minute ventilation: 24.6 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.676 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.791 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-RECOVERY-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: In-flight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 92 bpm (heart_rate_bpm); systolic bp: 174 mmHg (systolic_bp_mmHg); diastolic bp: 61 mmHg (diastolic_bp_mmHg); minute ventilation: 31.44 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.745 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.982 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-SCIENTISTPILOT-RECOVERY-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Scientist Pilot; Mission phase: Postflight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 102 bpm (heart_rate_bpm); systolic bp: 189 mmHg (systolic_bp_mmHg); diastolic bp: 63 mmHg (diastolic_bp_mmHg); minute ventilation: 34.07 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.763 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.893 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-REST-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: Preflight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 54 bpm (heart_rate_bpm); systolic bp: 115 mmHg (systolic_bp_mmHg); diastolic bp: 72 mmHg (diastolic_bp_mmHg); minute ventilation: 6.69 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.238 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.216 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-REST-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: In-flight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 53 bpm (heart_rate_bpm); systolic bp: 115 mmHg (systolic_bp_mmHg); diastolic bp: 64 mmHg (diastolic_bp_mmHg); minute ventilation: 8.47 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.283 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.247 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-REST-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: Postflight; Exercise state: Rest; Record type: grouped_protocol_mean. Measurements: heart rate: 65 bpm (heart_rate_bpm); systolic bp: 125 mmHg (systolic_bp_mmHg); diastolic bp: 74 mmHg (diastolic_bp_mmHg); minute ventilation: 10.73 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.253 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 0.222 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-LEVEL3-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: Preflight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 147 bpm (heart_rate_bpm); systolic bp: 204 mmHg (systolic_bp_mmHg); diastolic bp: 60 mmHg (diastolic_bp_mmHg); minute ventilation: 98.51 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 2.86 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.72 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-LEVEL3-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: In-flight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 147 bpm (heart_rate_bpm); systolic bp: 200 mmHg (systolic_bp_mmHg); diastolic bp: 51 mmHg (diastolic_bp_mmHg); minute ventilation: 90.61 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 2.59 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.65 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-LEVEL3-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: Postflight; Exercise state: Level 3; Record type: grouped_protocol_mean. Measurements: heart rate: 156 bpm (heart_rate_bpm); systolic bp: 213 mmHg (systolic_bp_mmHg); diastolic bp: 59 mmHg (diastolic_bp_mmHg); minute ventilation: 95.12 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 2.63 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 2.68 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-RECOVERY-PREFLIGHT: Skylab 4 — Preflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: Preflight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 114 bpm (heart_rate_bpm); systolic bp: 188 mmHg (systolic_bp_mmHg); diastolic bp: 65 mmHg (diastolic_bp_mmHg); minute ventilation: 40.97 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.849 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 1.22 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-RECOVERY-IN-FLIGHT: Skylab 4 — In-flight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: In-flight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 91 bpm (heart_rate_bpm); systolic bp: 186 mmHg (systolic_bp_mmHg); diastolic bp: 60 mmHg (diastolic_bp_mmHg); minute ventilation: 34.77 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.754 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 1.08 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    },
    {
      "title": "SKYLAB4-PILOT-RECOVERY-POSTFLIGHT: Skylab 4 — Postflight",
      "evidence": "historical",
      "sources": [
        "historicalCsv"
      ],
      "text": "Mission: Skylab 4; Crew role: Pilot; Mission phase: Postflight; Exercise state: Recovery; Record type: grouped_protocol_mean. Measurements: heart rate: 118 bpm (heart_rate_bpm); systolic bp: 204 mmHg (systolic_bp_mmHg); diastolic bp: 69 mmHg (diastolic_bp_mmHg); minute ventilation: 45.02 L/min BTPS (minute_ventilation_l_min_BTPS); oxygen consumption: 0.849 L/min STPD (oxygen_consumption_l_min_STPD); co2 production: 1.08 L/min STPD (co2_production_l_min_STPD). Source reference: 19770026836.pdf, page 387, Table 36-III. Quality notes: Mean values by crew role, phase, and exercise state; not simultaneous continuous telemetry. Minute ventilation is NOT breaths/min. Superscript significance markers not encoded. Original PDFs were not supplied; these user-supplied transcriptions have not been independently verified.",
      "watch": "Historical observations for reference. Values are not clinical thresholds or current crew readings. Group means, ranges and sample counts retain their original meaning.",
      "track": null
    }
  ]
};
  // END GENERATED HISTORICAL EVIDENCE
  const allItems = () => Object.entries(TOPICS).flatMap(([topic, t]) => t.items.map(item => ({ ...item, topic, topicTitle: t.title })));
  function search(query, topic = 'all') {
    const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    return allItems().filter(item => {
      if (topic !== 'all' && item.topic !== topic) return false;
      const words = [item.title, item.text, item.watch, item.topicTitle, ...item.sources.map(id => `${SOURCES[id].cite} ${SOURCES[id].title}`)].join(' ').toLowerCase();
      return terms.every(term => words.includes(term));
    });
  }
  /* Ranked search for questions (the online assistant): best entries first, partial matches allowed.
     Mirrors search_evidence in server/orbit_server/store.py, which the local assistant uses. */
  const STOP = new Set('what was were the for and with does this that show tell about during how why who when where which did are much many like can you its there is me my a an of in on to it do get'.split(' '));
  const SYNONYMS = { hot: 'temperature', cold: 'temperature', heat: 'temperature', warm: 'temperature', air: 'atmosphere', windy: 'winds', wind: 'winds' };
  const stem = w => w.length > 5 ? w.slice(0, 5) : w.replace(/s+$/, '');
  const wordsOf = text => String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  function rank(query, limit = 3) {
    const q = String(query || '').toLowerCase();
    const terms = [...new Set(wordsOf(q).filter(w => (w.length > 2 || /^\d+$/.test(w)) && !STOP.has(w)).map(w => stem(SYNONYMS[w] || w)))];
    if (!terms.length) return [];
    // Missions named in the question, spelled as entries spell them ("ma-9" means Mercury-Atlas 9).
    const missions = [...(q.match(/\b(?:apollo|skylab|mercury-atlas|gemini) (?:\d+|[ivx]+(?:-a)?)\b/g) || []), ...[...q.matchAll(/\bma-?(\d+)\b/g)].map(m => `mercury-atlas ${m[1]}`)];
    const escape = s => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
    return allItems().map(item => {
      const words = new Set(wordsOf(`${item.title} ${item.topicTitle} ${item.text} ${item.sources.map(id => SOURCES[id].cite).join(' ')}`).map(stem));
      const title = new Set(wordsOf(item.title).map(stem));
      const hits = terms.filter(t => words.has(t)).length;
      if (!hits) return null;
      let score = hits / terms.length + 0.25 * terms.filter(t => title.has(t)).length / terms.length;
      // "Mercury" is a planet and a mission program: without mission words, mean the planet.
      const planet = /^Planet (\w+)/.exec(item.title);
      if (planet && new RegExp(`\\b${planet[1].toLowerCase()}\\b`).test(q)) score += planet[1] === 'Mercury' && /atlas|mission|cooper|carpenter|pilot|astronaut|crew|flight|\bma-?\d/.test(q) ? -0.5 : 1;
      // A named mission outranks shared words such as "heart rate" in records from other missions.
      const text = `${item.title} ${item.text}`.toLowerCase();
      if (missions.some(m => new RegExp(`\\b${escape(m)}\\b`).test(text))) score += 0.75;
      return { item, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, limit).map(({ item, score }) => ({ ...item, score: Math.round(score * 100) / 100 }));
  }
  return { SOURCES, EVIDENCE, TOPICS, allItems, search, rank };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ResearchLibrary;
