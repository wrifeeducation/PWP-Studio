-- WF-039: Seed word_banks for L21-L67 (Phase C and D)
-- Phase C (L21-34): Yr 4-6 vocabulary
-- Phase D (L35-67): Yr 5-9 vocabulary, more sophisticated
-- Migration: seed_word_banks_l21_l67

-- ── PHASE C: Levels 21–34 (Year 4–6 vocabulary) ─────────────────────────────

-- L21 – Adjective + Noun + Verb + Adverb
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (21, 'adjective',   '["ancient","enormous","peculiar","shimmering","fierce","graceful","jagged","hollow","murky","vibrant"]', '[]'),
  (21, 'noun',        '["creature","valley","glacier","merchant","current","temple","blossom","cavern","ridge","lagoon"]', '[]'),
  (21, 'verb',        '["glides","trembles","vanishes","pursues","emerges","collapses","drifts","scatters","echoes","surges"]', '[]'),
  (21, 'adverb',      '["gradually","fiercely","elegantly","cautiously","swiftly","deeply","barely","steadily","endlessly","briskly"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L22 – Determiner + Adjective + Noun + Preposition + Noun
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (22, 'determiner',  '["the","a","this","that","every","each","no","some","any","both"]', '[]'),
  (22, 'adjective',   '["vast","delicate","rugged","silvery","dense","luminous","remote","brittle","vivid","turbulent"]', '[]'),
  (22, 'noun',        '["harbour","summit","corridor","dynasty","frontier","canopy","plateau","vessel","terrain","current"]', '[]'),
  (22, 'preposition', '["beyond","beneath","through","across","beside","above","within","against","along","around"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L23 – Pronoun + Verb + Adverb + Conjunction + Verb
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (23, 'pronoun',     '["he","she","they","it","we","I","one","you","them","us"]', '[]'),
  (23, 'verb',        '["crept","soared","faltered","persisted","retreated","descended","accelerated","observed","resisted","calculated"]', '[]'),
  (23, 'adverb',      '["silently","relentlessly","abruptly","precisely","instinctively","wearily","boldly","cautiously","swiftly","smoothly"]', '[]'),
  (23, 'conjunction', '["although","because","however","nevertheless","whereas","since","unless","until","before","whenever"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L24 – Adjective + Noun + Verb + Prepositional Phrase
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (24, 'adjective',   '["towering","gleaming","treacherous","secluded","barren","flourishing","crumbling","immense","tranquil","forbidding"]', '[]'),
  (24, 'noun',        '["fortress","peninsula","expedition","ancestor","threshold","courtyard","vegetation","estuary","monument","landscape"]', '[]'),
  (24, 'verb',        '["dominated","glistened","concealed","expanded","stretched","collapsed","thrived","overlooked","marked","carved"]', '[]'),
  (24, 'preposition', '["throughout","despite","beyond","beneath","amid","along","towards","against","within","across"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L25 – Complex verb patterns
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (25, 'verb',        '["had been","was becoming","could see","might have","would never","began to","seemed to","started to","appeared to","tried to"]', '[]'),
  (25, 'adverb',      '["seemingly","reportedly","apparently","genuinely","remarkably","considerably","increasingly","desperately","ultimately","inevitably"]', '[]'),
  (25, 'adjective',   '["unexpected","remarkable","insignificant","determined","bewildered","reluctant","persistent","courageous","cautious","melancholy"]', '[]'),
  (25, 'noun',        '["consequence","challenge","opportunity","difficulty","evidence","impression","suspicion","hesitation","motivation","revelation"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L26 – Fronted adverbials
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (26, 'adverb',      '["Immediately","Gradually","Suddenly","Cautiously","Reluctantly","Unexpectedly","Silently","Frantically","Carefully","Precisely"]', '[]'),
  (26, 'preposition', '["In the distance","At the edge","Beyond the hill","Through the mist","Across the river","Beneath the surface","Beside the path","Along the shore","Against the wind","Within the forest"]', '[]'),
  (26, 'verb',        '["appeared","echoed","gathered","scattered","emerged","settled","drifted","advanced","retreated","loomed"]', '[]'),
  (26, 'noun',        '["silhouette","procession","settlement","rumour","boundary","landmark","signal","passage","shelter","refuge"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L27 – Relative clauses
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (27, 'noun',        '["explorer","navigator","scholar","craftsman","messenger","guardian","commander","observer","rival","companion"]', '[]'),
  (27, 'verb',        '["discovered","navigated","questioned","crafted","delivered","protected","commanded","witnessed","challenged","accompanied"]', '[]'),
  (27, 'adjective',   '["legendary","renowned","formidable","mysterious","accomplished","celebrated","notorious","dedicated","experienced","fearless"]', '[]'),
  (27, 'conjunction', '["who","which","whose","that","where","when","as","while","if","though"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L28 – Passive voice
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (28, 'verb',        '["was discovered","were constructed","had been carved","is believed","were transported","was celebrated","had been abandoned","was announced","were collected","is considered"]', '[]'),
  (28, 'noun',        '["artefact","structure","inscription","tradition","ceremony","collection","technique","evidence","theory","document"]', '[]'),
  (28, 'adjective',   '["precious","elaborate","sophisticated","significant","extraordinary","preserved","ancient","complex","unique","intricate"]', '[]'),
  (28, 'adverb',      '["carefully","expertly","traditionally","officially","apparently","recently","widely","originally","specifically","finally"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L29 – Non-fiction: technical vocabulary
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (29, 'noun',        '["ecosystem","organism","habitat","adaptation","migration","predator","prey","photosynthesis","atmosphere","population"]', '[]'),
  (29, 'verb',        '["adapts","migrates","evolves","survives","inhabits","produces","consumes","regulates","influences","sustains"]', '[]'),
  (29, 'adjective',   '["aquatic","terrestrial","nocturnal","carnivorous","herbivorous","microscopic","atmospheric","biological","geographical","environmental"]', '[]'),
  (29, 'adverb',      '["typically","annually","primarily","increasingly","occasionally","naturally","significantly","largely","closely","actively"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L30 – Persuasive: rhetorical language
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (30, 'noun',        '["responsibility","consequence","generation","evidence","argument","conclusion","proposal","concern","solution","advantage"]', '[]'),
  (30, 'verb',        '["must","should","could","consider","ensure","recognise","demonstrate","prove","support","prevent"]', '[]'),
  (30, 'adjective',   '["crucial","essential","vital","urgent","significant","serious","beneficial","effective","positive","responsible"]', '[]'),
  (30, 'adverb',      '["clearly","undeniably","certainly","strongly","urgently","firmly","absolutely","particularly","critically","especially"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L31 – Narrative: atmosphere
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (31, 'adjective',   '["ominous","eerie","desolate","suffocating","oppressive","haunting","chilling","foreboding","melancholic","unsettling"]', '[]'),
  (31, 'noun',        '["shadow","silence","fog","darkness","ruin","hollow","mist","gloom","dusk","stillness"]', '[]'),
  (31, 'verb',        '["loomed","settled","crept","thickened","descended","enveloped","suffocated","consumed","intensified","deepened"]', '[]'),
  (31, 'adverb',      '["ominously","relentlessly","slowly","gradually","steadily","silently","heavily","densely","eerily","inevitably"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L32 – Poetry: figurative language
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (32, 'noun',        '["metaphor","image","rhythm","stanza","verse","couplet","refrain","line","pattern","voice"]', '[]'),
  (32, 'adjective',   '["golden","fleeting","eternal","bitter","tender","fierce","hollow","radiant","pale","silent"]', '[]'),
  (32, 'verb',        '["whispers","burns","fades","blooms","soars","breaks","falls","dances","flows","echoes"]', '[]'),
  (32, 'adverb',      '["softly","endlessly","quietly","slowly","gently","suddenly","wildly","tenderly","bitterly","keenly"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L33 – Multi-clause sentences
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (33, 'conjunction', '["although","despite","whereas","unless","provided that","in order to","as long as","even though","so that","now that"]', '[]'),
  (33, 'noun',        '["circumstance","perspective","interpretation","consequence","assumption","implication","expectation","realisation","contradiction","transformation"]', '[]'),
  (33, 'verb',        '["suggested","implied","demonstrated","challenged","contradicted","transformed","revealed","confirmed","questioned","acknowledged"]', '[]'),
  (33, 'adjective',   '["plausible","contradictory","ambiguous","definitive","subjective","objective","theoretical","practical","rational","emotional"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L34 – Advanced sentence variety
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (34, 'adverb',      '["Nevertheless","Furthermore","Consequently","Meanwhile","Subsequently","Additionally","Therefore","Moreover","Alternatively","Nonetheless"]', '[]'),
  (34, 'noun',        '["perspective","interpretation","assumption","impact","dynamic","framework","principle","concept","phenomenon","dimension"]', '[]'),
  (34, 'verb',        '["reflects","challenges","demonstrates","acknowledges","examines","explores","considers","establishes","emphasises","highlights"]', '[]'),
  (34, 'adjective',   '["nuanced","analytical","coherent","evaluative","systematic","critical","comparative","contextual","theoretical","empirical"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- ── PHASE D: Levels 35–67 (Year 5–9 vocabulary) ─────────────────────────────

-- L35-L40: Extended sophisticated vocabulary
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (35, 'noun',        '["sovereignty","constitution","legislature","bureaucracy","infrastructure","ideology","amendment","referendum","jurisdiction","diplomacy"]', '[]'),
  (35, 'verb',        '["legislated","governed","reformed","challenged","enforced","established","amended","ratified","abolished","implemented"]', '[]'),
  (35, 'adjective',   '["democratic","constitutional","parliamentary","federal","judicial","legislative","political","civic","sovereign","diplomatic"]', '[]'),
  (35, 'adverb',      '["constitutionally","democratically","judicially","politically","officially","diplomatically","formally","legally","systematically","fundamentally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (36, 'noun',        '["catalyst","synthesis","decomposition","molecule","compound","element","reaction","bond","isotope","equilibrium"]', '[]'),
  (36, 'verb',        '["reacts","decomposes","synthesises","dissolves","precipitates","oxidises","reduces","ionises","neutralises","catalyses"]', '[]'),
  (36, 'adjective',   '["acidic","alkaline","soluble","insoluble","reactive","stable","volatile","saturated","ionic","covalent"]', '[]'),
  (36, 'adverb',      '["chemically","rapidly","gradually","completely","partially","exothermically","endothermically","spontaneously","reversibly","precisely"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (37, 'noun',        '["protagonist","antagonist","narrative","denouement","foreshadowing","allegory","motif","allusion","irony","catharsis"]', '[]'),
  (37, 'verb',        '["foreshadows","alludes","symbolises","develops","transforms","confronts","resolves","evokes","portrays","conveys"]', '[]'),
  (37, 'adjective',   '["omniscient","unreliable","linear","circular","episodic","retrospective","prospective","allegorical","symbolic","thematic"]', '[]'),
  (37, 'adverb',      '["thematically","symbolically","ironically","metaphorically","allegorically","retrospectively","deliberately","subtly","powerfully","effectively"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (38, 'noun',        '["circumference","hypothesis","variable","coefficient","equation","theorem","probability","correlation","gradient","asymptote"]', '[]'),
  (38, 'verb',        '["calculate","demonstrate","prove","disprove","derive","substitute","factorise","simplify","evaluate","determine"]', '[]'),
  (38, 'adjective',   '["proportional","inverse","quadratic","linear","perpendicular","parallel","congruent","equivalent","rational","irrational"]', '[]'),
  (38, 'adverb',      '["algebraically","geometrically","proportionally","statistically","approximately","precisely","conversely","subsequently","therefore","consequently"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (39, 'noun',        '["Renaissance","Reformation","Enlightenment","colonialism","imperialism","nationalism","industrialisation","revolution","empire","civilisation"]', '[]'),
  (39, 'verb',        '["colonised","industrialised","revolutionised","reformed","enlightened","conquered","traded","negotiated","resisted","expanded"]', '[]'),
  (39, 'adjective',   '["imperial","colonial","revolutionary","feudal","mercantile","aristocratic","bourgeois","proletarian","medieval","contemporary"]', '[]'),
  (39, 'adverb',      '["historically","politically","economically","socially","culturally","ideologically","internationally","domestically","gradually","fundamentally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (40, 'noun',        '["ambiguity","paradox","inference","interpretation","connotation","denotation","rhetoric","discourse","syntax","semantics"]', '[]'),
  (40, 'verb',        '["infers","connotates","implies","denotes","structures","patterns","argues","constructs","deconstructs","interprets"]', '[]'),
  (40, 'adjective',   '["ambiguous","connotative","denotative","rhetorical","syntactic","semantic","linguistic","textual","contextual","inferential"]', '[]'),
  (40, 'adverb',      '["rhetorically","semantically","syntactically","linguistically","contextually","implicitly","explicitly","arguably","significantly","arguably"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L41-L50: Advanced academic vocabulary
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (41, 'noun',        '["abstraction","conceptualisation","paradigm","epistemology","methodology","ontology","hermeneutics","dialectic","phenomenology","taxonomy"]', '[]'),
  (41, 'verb',        '["conceptualise","theorise","critique","synthesise","analyse","evaluate","deconstruct","contextualise","problematise","operationalise"]', '[]'),
  (41, 'adjective',   '["abstract","conceptual","theoretical","paradigmatic","epistemological","methodological","ontological","phenomenological","dialectical","taxonomical"]', '[]'),
  (41, 'adverb',      '["theoretically","conceptually","analytically","critically","synthetically","dialectically","epistemologically","ontologically","philosophically","fundamentally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (42, 'noun',        '["biodiversity","photosynthesis","respiration","homeostasis","metabolism","mitosis","meiosis","chromosome","genotype","phenotype"]', '[]'),
  (42, 'verb',        '["metabolises","synthesises","respires","reproduces","mutates","evolves","adapts","regulates","catalyses","transcribes"]', '[]'),
  (42, 'adjective',   '["metabolic","genetic","chromosomal","cellular","molecular","biological","physiological","ecological","evolutionary","biochemical"]', '[]'),
  (42, 'adverb',      '["biologically","genetically","physiologically","metabolically","cellularly","molecularly","ecologically","biochemically","evolutionarily","microscopically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (43, 'noun',        '["velocity","acceleration","momentum","inertia","gravity","electromagnetism","thermodynamics","quantum","relativity","entropy"]', '[]'),
  (43, 'verb',        '["accelerates","decelerates","transfers","converts","radiates","conducts","insulates","magnetises","charges","oscillates"]', '[]'),
  (43, 'adjective',   '["kinetic","potential","thermal","electrical","magnetic","nuclear","electromagnetic","gravitational","mechanical","quantum"]', '[]'),
  (43, 'adverb',      '["mechanically","thermally","electrically","magnetically","gravitationally","atomically","quantumly","electromagnetically","physically","proportionally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (44, 'noun',        '["globalisation","capitalism","socialism","democracy","autocracy","meritocracy","oligarchy","plutocracy","theocracy","technocracy"]', '[]'),
  (44, 'verb',        '["globalises","democratises","privatises","nationalises","liberalises","regulates","deregulates","politicises","centralises","decentralises"]', '[]'),
  (44, 'adjective',   '["global","capitalist","socialist","democratic","autocratic","meritocratic","oligarchic","plutocratic","theocratic","technocratic"]', '[]'),
  (44, 'adverb',      '["globally","democratically","capitalistically","sociologically","politically","economically","ideologically","structurally","systematically","fundamentally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (45, 'noun',        '["protagonist","nemesis","archetype","foil","motif","leitmotif","intertextuality","polyphony","dialogism","heteroglossia"]', '[]'),
  (45, 'verb',        '["subverts","parodies","satirises","alludes","interpolates","contextualises","problematises","interrogates","deconstructs","challenges"]', '[]'),
  (45, 'adjective',   '["satirical","parodic","subversive","intertextual","polyphonic","dialogic","heteroglossic","archetypal","emblematic","paradigmatic"]', '[]'),
  (45, 'adverb',      '["satirically","parodically","subversively","intertextually","dialogically","archetypally","emblematically","paradigmatically","deliberately","ironically"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L46-L55: Advanced cross-curricular
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (46, 'noun',        '["anthropology","sociology","psychology","ethnography","demography","linguistics","semiotics","pragmatics","discourse","ideology"]', '[]'),
  (46, 'verb',        '["anthropologises","analyses","contextualises","theorises","ethnographically","demographically","linguistically","semiotically","pragmatically","ideologically"]', '[]'),
  (46, 'adjective',   '["anthropological","sociological","psychological","ethnographic","demographic","linguistic","semiotic","pragmatic","discursive","ideological"]', '[]'),
  (46, 'adverb',      '["anthropologically","sociologically","psychologically","ethnographically","demographically","linguistically","semiotically","pragmatically","discursively","ideologically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (47, 'noun',        '["stratification","sediment","tectonic","erosion","deposition","weathering","topography","cartography","geomorphology","hydrology"]', '[]'),
  (47, 'verb',        '["erodes","deposits","weathers","stratifies","uplifts","subsides","floods","drains","permeates","accumulates"]', '[]'),
  (47, 'adjective',   '["tectonic","seismic","volcanic","sedimentary","igneous","metamorphic","glacial","fluvial","coastal","continental"]', '[]'),
  (47, 'adverb',      '["geologically","tectonically","seismically","volcanically","glacially","fluvially","coastally","continentally","gradually","catastrophically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (48, 'noun',        '["Renaissance","Baroque","Romanticism","Impressionism","Cubism","Surrealism","Expressionism","Modernism","Postmodernism","Abstraction"]', '[]'),
  (48, 'verb',        '["depicts","evokes","represents","challenges","subverts","transforms","abstracts","symbolises","contextualises","interprets"]', '[]'),
  (48, 'adjective',   '["baroque","romantic","impressionistic","cubist","surrealist","expressionist","modernist","postmodern","abstract","representational"]', '[]'),
  (48, 'adverb',      '["artistically","aesthetically","compositionally","symbolically","expressively","abstractly","representationally","stylistically","dramatically","evocatively"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (49, 'noun',        '["counterpoint","harmony","dissonance","cadence","modulation","transposition","improvisation","orchestration","composition","performance"]', '[]'),
  (49, 'verb',        '["harmonises","modulates","transposes","improvises","orchestrates","composes","performs","conducts","interprets","accompanies"]', '[]'),
  (49, 'adjective',   '["harmonic","dissonant","melodic","rhythmic","contrapuntal","polyphonic","monophonic","chromatic","diatonic","atonal"]', '[]'),
  (49, 'adverb',      '["harmonically","melodically","rhythmically","polyphonically","chromatically","diatonically","atonally","contrapuntally","expressively","dynamically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (50, 'noun',        '["algorithm","encryption","cybersecurity","artificial intelligence","machine learning","neural network","database","protocol","interface","architecture"]', '[]'),
  (50, 'verb',        '["encrypts","decrypts","processes","algorithms","trains","optimises","interfaces","integrates","authenticates","validates"]', '[]'),
  (50, 'adjective',   '["algorithmic","encrypted","cybersecure","intelligent","neural","digital","binary","computational","virtual","automated"]', '[]'),
  (50, 'adverb',      '["algorithmically","digitally","computationally","automatically","intelligently","securely","efficiently","iteratively","recursively","systematically"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L51-L60: Specialist academic register
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (51, 'noun',        '["jurisprudence","litigation","tort","statute","precedent","judiciary","plaintiff","defendant","jurisdiction","arbitration"]', '[]'),
  (51, 'verb',        '["legislates","litigates","adjudicates","arbitrates","prosecutes","defends","appeals","petitions","ratifies","codifies"]', '[]'),
  (51, 'adjective',   '["judicial","statutory","legislative","constitutional","precedential","jurisdictional","litigious","arbitral","equitable","tortious"]', '[]'),
  (51, 'adverb',      '["judicially","statutorily","legislatively","constitutionally","legally","equitably","arbitrarily","jurisdictionally","precedentially","formally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (52, 'noun',        '["macroeconomics","microeconomics","inflation","deflation","recession","depression","equilibrium","elasticity","monopoly","oligopoly"]', '[]'),
  (52, 'verb',        '["inflates","deflates","recesses","equilibrates","elasticises","monopolises","oligopolises","subsidises","taxes","regulates"]', '[]'),
  (52, 'adjective',   '["macroeconomic","microeconomic","inflationary","deflationary","recessionary","monopolistic","oligopolistic","elastic","inelastic","equitable"]', '[]'),
  (52, 'adverb',      '["macroeconomically","microeconomically","inflationally","deflationarily","recessionally","monopolistically","elastically","economically","financially","commercially"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (53, 'noun',        '["neuroscience","cognition","perception","consciousness","memory","attention","emotion","motivation","behaviour","neuroplasticity"]', '[]'),
  (53, 'verb',        '["perceives","cognises","processes","remembers","attends","motivates","behaves","responds","adapts","learns"]', '[]'),
  (53, 'adjective',   '["cognitive","perceptual","conscious","unconscious","emotional","motivational","behavioural","neural","synaptic","neurological"]', '[]'),
  (53, 'adverb',      '["cognitively","perceptually","consciously","unconsciously","emotionally","motivationally","behaviourally","neurologically","psychologically","empirically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (54, 'noun',        '["architecture","infrastructure","superstructure","foundation","facade","elevation","blueprint","specification","proportion","perspective"]', '[]'),
  (54, 'verb',        '["constructs","designs","plans","structures","elevates","proportions","specifies","blueprints","facades","foundations"]', '[]'),
  (54, 'adjective',   '["architectural","structural","foundational","infrastructural","proportional","elevational","spatial","functional","aesthetic","sustainable"]', '[]'),
  (54, 'adverb',      '["architecturally","structurally","foundationally","proportionally","spatially","functionally","aesthetically","sustainably","geometrically","precisely"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (55, 'noun',        '["anthropocene","biosphere","lithosphere","hydrosphere","atmosphere","cryosphere","ecosphere","geosphere","magnetosphere","stratosphere"]', '[]'),
  (55, 'verb',        '["anthropogenically impacts","affects","disrupts","regulates","sustains","circulates","radiates","absorbs","reflects","transforms"]', '[]'),
  (55, 'adjective',   '["anthropogenic","biospheric","lithospheric","hydrospheric","atmospheric","cryospheric","geospheric","global","planetary","systemic"]', '[]'),
  (55, 'adverb',      '["anthropogenically","biospherically","globally","atmospherically","systemically","ecologically","geologically","climatically","environmentally","sustainably"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- L56-L67: Highest-level academic and literary vocabulary
INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (56, 'noun',        '["postcolonialism","decolonisation","subaltern","hybridity","diaspora","othering","hegemony","marginalisation","intersectionality","emancipation"]', '[]'),
  (56, 'verb',        '["decolonises","marginalises","othering","hybridises","emancipates","challenges","subverts","reclaims","interrogates","destabilises"]', '[]'),
  (56, 'adjective',   '["postcolonial","decolonial","subaltern","hybrid","diasporic","hegemonic","marginalised","intersectional","emancipatory","subversive"]', '[]'),
  (56, 'adverb',      '["postcolonially","decolonially","hegemonically","intersectionally","emancipatorily","subversively","critically","politically","culturally","historically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (57, 'noun',        '["phenomenology","existentialism","structuralism","poststructuralism","deconstruction","hermeneutics","pragmatism","positivism","rationalism","empiricism"]', '[]'),
  (57, 'verb',        '["phenomenologises","deconstructs","contextualises","problematises","questions","critiques","synthesises","argues","demonstrates","proves"]', '[]'),
  (57, 'adjective',   '["phenomenological","existential","structuralist","poststructuralist","deconstructive","hermeneutic","pragmatic","positivist","rationalist","empiricist"]', '[]'),
  (57, 'adverb',      '["phenomenologically","existentially","structurally","poststructurally","deconstructively","hermeneutically","pragmatically","positivistically","rationally","empirically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (58, 'noun',        '["mitigation","adaptation","sequestration","resilience","vulnerability","sustainability","transition","decarbonisation","net-zero","carbon footprint"]', '[]'),
  (58, 'verb',        '["mitigates","adapts","sequesters","builds resilience","vulnerates","sustains","transitions","decarbonises","offsets","reduces"]', '[]'),
  (58, 'adjective',   '["mitigative","adaptive","sequestering","resilient","vulnerable","sustainable","transitional","decarbonising","carbon-neutral","net-zero"]', '[]'),
  (58, 'adverb',      '["mitigatively","adaptively","resiliently","sustainably","transitionally","environmentally","ecologically","climatically","urgently","globally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (59, 'noun',        '["intertextuality","polyphony","heteroglossia","defamiliarisation","mimesis","diegesis","focalization","metalepsis","anachrony","prolepsis"]', '[]'),
  (59, 'verb',        '["defamiliarises","mimics","digresses","focalises","transgresses","anachronises","prolepses","subverts","mediates","narrates"]', '[]'),
  (59, 'adjective',   '["intertextual","polyphonic","heteroglossic","defamiliarising","mimetic","diegetic","focalised","metaleptic","anachronistic","proleptic"]', '[]'),
  (59, 'adverb',      '["intertextually","polyphonically","mimetically","diegetically","metaleptically","anachronistically","proleptically","narratively","deliberately","reflexively"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (60, 'noun',        '["epistemology","axiology","ontology","teleology","cosmology","eschatology","soteriology","theodicy","metaphysics","ethics"]', '[]'),
  (60, 'verb',        '["epistemologically questions","axiologically evaluates","ontologically establishes","teleologically drives","cosmologically situates","ethically reasons"]', '[]'),
  (60, 'adjective',   '["epistemological","axiological","ontological","teleological","cosmological","eschatological","soteriological","metaphysical","ethical","philosophical"]', '[]'),
  (60, 'adverb',      '["epistemologically","axiologically","ontologically","teleologically","cosmologically","metaphysically","ethically","philosophically","fundamentally","profoundly"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (61, 'noun',        '["biopolitics","necropolitics","biopower","governmentality","subjectivity","disciplinary power","surveillance","normalisation","dispositif","assemblage"]', '[]'),
  (61, 'verb',        '["governs","surveils","normalises","disciplines","biopolitically controls","subjectivises","assembles","disposes","regulates","produces"]', '[]'),
  (61, 'adjective',   '["biopolitical","necropolitical","governmental","disciplinary","surveillant","normative","dispositional","assemblage-based","regulatory","productive"]', '[]'),
  (61, 'adverb',      '["biopolitically","necropolitically","governmentally","disciplinarily","normatively","regulatorily","productively","politically","institutionally","structurally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (62, 'noun',        '["thermodynamics","entropy","enthalpy","kinetics","equilibrium","stoichiometry","spectroscopy","crystallography","electrochemistry","quantum chemistry"]', '[]'),
  (62, 'verb',        '["thermodynamically drives","increases entropy","decreases enthalpy","kinetically limits","equilibrates","stoichiometrically balances","spectroscopically analyses"]', '[]'),
  (62, 'adjective',   '["thermodynamic","entropic","enthalpic","kinetic","equilibrial","stoichiometric","spectroscopic","crystallographic","electrochemical","quantum"]', '[]'),
  (62, 'adverb',      '["thermodynamically","entropically","kinetically","stoichiometrically","spectroscopically","crystallographically","electrochemically","quantumly","precisely","systematically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (63, 'noun',        '["postmodernism","metanarrative","grand narrative","simulacrum","hyperreality","spectacle","commodity fetishism","reification","alienation","praxis"]', '[]'),
  (63, 'verb',        '["deconstructs","problematises","demystifies","reifies","alienates","commodifies","spectacularises","simulates","hyperrealises","critiques"]', '[]'),
  (63, 'adjective',   '["postmodern","meta-narrative","simulacral","hyperreal","spectacular","fetishised","reified","alienated","commodified","critical"]', '[]'),
  (63, 'adverb',      '["postmodernly","hyperrealistically","spectacularly","critically","dialectically","materialistically","ideologically","culturally","economically","politically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (64, 'noun',        '["transcendentalism","romanticism","sublimity","aesthetics","teleology","immanence","transcendence","dialectical materialism","critical theory","praxis"]', '[]'),
  (64, 'verb',        '["transcends","sublimes","aestheticises","teleologically drives","immanently inhabits","dialectically resolves","critically theorises","praxically demonstrates"]', '[]'),
  (64, 'adjective',   '["transcendental","romantic","sublime","aesthetic","teleological","immanent","transcendent","materialist","critical","dialectical"]', '[]'),
  (64, 'adverb',      '["transcendentally","romantically","sublimely","aesthetically","teleologically","immanently","transcendently","materialistically","critically","dialectically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (65, 'noun',        '["geopolitics","realpolitik","multilateralism","unilateralism","sovereignty","self-determination","intervention","humanitarian law","diplomacy","deterrence"]', '[]'),
  (65, 'verb',        '["geopolitically shapes","multilaterally negotiates","unilaterally acts","intervenes","deters","sanctions","mediates","arbitrates","balances","hegemonises"]', '[]'),
  (65, 'adjective',   '["geopolitical","multilateral","unilateral","sovereign","humanitarian","deterrent","diplomatic","hegemonic","realpolitical","interventionist"]', '[]'),
  (65, 'adverb',      '["geopolitically","multilaterally","unilaterally","sovereignly","humanitarianly","diplomatically","hegemonically","strategically","politically","internationally"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (66, 'noun',        '["semiotics","signifier","signified","denotation","connotation","paradigm","syntagm","code","discourse","ideology"]', '[]'),
  (66, 'verb',        '["signifies","denotes","connotes","encodes","decodes","contextualises","frames","mediates","constructs","represents"]', '[]'),
  (66, 'adjective',   '["semiotic","denotative","connotative","paradigmatic","syntagmatic","discursive","ideological","mediated","encoded","decoded"]', '[]'),
  (66, 'adverb',      '["semiotically","denotatively","connotatively","paradigmatically","syntagmatically","discursively","ideologically","mediately","rhetorically","critically"]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_banks (level_id, word_class, words, images) VALUES
  (67, 'noun',        '["synthesis","evaluation","analysis","argumentation","justification","substantiation","exemplification","qualification","concession","refutation"]', '[]'),
  (67, 'verb',        '["synthesises","evaluates","analyses","argues","justifies","substantiates","exemplifies","qualifies","concedes","refutes"]', '[]'),
  (67, 'adjective',   '["synthetic","evaluative","analytical","argumentative","justified","substantiated","exemplified","qualified","concessive","refutational"]', '[]'),
  (67, 'adverb',      '["synthetically","evaluatively","analytically","argumentatively","justifiably","substantially","exemplarily","qualifiedly","concessively","refutationally"]', '[]')
ON CONFLICT (id) DO NOTHING;
