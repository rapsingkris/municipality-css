// ── SUPABASE INITIALIZATION ──
const supabaseUrl = 'https://ircbidpdgkezxnszzeuu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyY2JpZHBkZ2tlenhuc3p6ZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjQ1ODYsImV4cCI6MjA5MjIwMDU4Nn0.OkLuJsyIx1a3AsIb9w7KWEDlyIJfWjQJ9O_fN5KoSMw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ── EMOJI OPTIONS ──
const emojiOptions = [
  { value: '5', emoji: '<img src="../images/happy.png" alt="Happy">',   selectedEmoji: '<img src="../images/happy_selected.png" alt="Happy Selected">' },
  { value: '4', emoji: '<img src="../images/smile.png" alt="Smile">',   selectedEmoji: '<img src="../images/smile_selected.png" alt="Smile Selected">' },
  { value: '3', emoji: '<img src="../images/neutral.png" alt="Neutral">',selectedEmoji: '<img src="../images/neutral_selected.png" alt="Neutral Selected">' },
  { value: '2', emoji: '<img src="../images/sad.png" alt="Sad">',       selectedEmoji: '<img src="../images/sad_selected.png" alt="Sad Selected">' },
  { value: '1', emoji: '<img src="../images/angry.png" alt="Angry">',   selectedEmoji: '<img src="../images/angry_selected.png" alt="Angry Selected">' },
  { value: 'NA',emoji: '<img src="../images/na.png" alt="N/A">',        selectedEmoji: '<img src="../images/na.png" alt="N/A">' },
];

// ── STATE ──
let currentPage  = 1;
let totalPages   = 2;
let dynamicPages = [];

// ── OFFICES CACHE: name → UUID ──
let officeMap = {};

// ── ANSWER STORE ──
const answers = { likert: {}, mc: {}, comment: {} };


// ═══════════════════════════════════════════════
// OFFICES
// ═══════════════════════════════════════════════
async function fetchOffices() {
  try {
    const { data, error } = await supabaseClient
      .from('offices').select('id, name').order('name');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('fetchOffices:', e);
    return [];
  }
}

function populateOfficeDropdown(offices) {
  const sel = document.getElementById('tanggapan');
  if (!sel) return;

  officeMap = {};

  sel.innerHTML = '<option value="" disabled selected>Pumili ng Tanggapan</option>';
  if (!offices.length) {
    sel.innerHTML += '<option value="" disabled>No offices available</option>';
    return;
  }

  offices.forEach(o => {
    officeMap[o.name] = o.id;
    const opt = document.createElement('option');
    opt.value       = o.name;
    opt.textContent = o.name;
    sel.appendChild(opt);
  });
}

function loadFallbackOffices() {
  console.warn('Using fallback office list — office_id will be null for these submissions.');
  populateOfficeDropdown([
    { id: null, name: "Mayor's Office" },
    { id: null, name: "Municipal Planning and Development Council (MPDC)" },
    { id: null, name: "Municipal Budget Office (MBO)" },
    { id: null, name: "Municipal Treasurers Office (MTO)" },
    { id: null, name: "Municipal Accounting Office (MAcO)" },
    { id: null, name: "Municipal Civil Registrar (MCR)" },
    { id: null, name: "Municipal Environment and Natural Resources Office (MENRO)" },
    { id: null, name: "Municipal Social Welfare and Development Office (MSWDO)" },
    { id: null, name: "Office of the Vice Mayor / Sangguniang Bayan (OVM/SB)" },
    { id: null, name: "Municipal Agricultural Office (MAgO)" },
    { id: null, name: "Municipal Assessor Office (MAsO)" },
    { id: null, name: "Municipal Engineering Office (MEO)" },
    { id: null, name: "Municipal Health Office (MHO)" },
    { id: null, name: "Municipal Disaster Risk Reduction and Management Office (MDRRMO)" },
    { id: null, name: "Luisiana WaterWorks System (LWS)" },
    { id: null, name: "Public Employment Service Office (PESO) / 4Ps / Sustainable Livelihood Program (SLP)" },
    { id: null, name: "Local Youth Development Office (LYDO)" },
    { id: null, name: "Tourism Office" },
    { id: null, name: "Human Resource Management Office (HRMO) / MRVDC" },
    { id: null, name: "NC / Business Permit and Licensing Office (BPLO)" },
    { id: null, name: "Kalinga sa Matatanda (KaSaMa)" },
    { id: null, name: "Department of the Interior and Local Government (DILG)" },
  ]);
}


// ═══════════════════════════════════════════════
// FETCH DYNAMIC PAGES FROM SUPABASE
// ═══════════════════════════════════════════════
async function fetchDynamicPages() {
  try {
    const { data: surveys, error: sErr } = await supabaseClient
      .from('surveys').select('id').order('created_at', { ascending: false }).limit(1);
    if (sErr || !surveys?.length) return loadFallbackDynamicPages();

    const surveyId = surveys[0].id;

    const [mcRes, likertRes, commentRes] = await Promise.all([
      supabaseClient.from('mc_pages').select('*').eq('survey_id', surveyId).order('page_order'),
      supabaseClient.from('likert_pages').select('*').eq('survey_id', surveyId).order('page_order'),
      supabaseClient.from('comment_pages').select('*').eq('survey_id', surveyId).order('page_order'),
    ]);
    if (mcRes.error)      throw mcRes.error;
    if (likertRes.error)  throw likertRes.error;
    if (commentRes.error) throw commentRes.error;

    const allMeta = [
      ...(mcRes.data      || []).map(p => ({ ...p, card_type: 'multiple-choice' })),
      ...(likertRes.data  || []).map(p => ({ ...p, card_type: 'likert' })),
      ...(commentRes.data || []).map(p => ({ ...p, card_type: 'comment' })),
    ].sort((a, b) => a.page_order - b.page_order);

    if (!allMeta.length) return loadFallbackDynamicPages();

    const pages = [];
    for (const meta of allMeta) {
      const entry = { type: meta.card_type, pageId: meta.id, instruction: meta.instruction || '', questions: [] };

      if (meta.card_type === 'multiple-choice') {
        const { data: qs, error: qErr } = await supabaseClient
          .from('mc_questions').select('*').eq('page_id', meta.id).order('question_order');
        if (qErr) throw qErr;
        for (const q of qs) {
          const { data: opts, error: oErr } = await supabaseClient
            .from('mc_options').select('option_text').eq('question_id', q.id).order('option_order');
          if (oErr) throw oErr;
          entry.questions.push({ id: q.id, text: q.question_text, select_type: q.select_type || 'radio', options: opts.map(o => o.option_text) });
        }
      } else if (meta.card_type === 'likert') {
        const { data: qs, error: qErr } = await supabaseClient
          .from('likert_questions').select('*').eq('page_id', meta.id).order('question_order');
        if (qErr) throw qErr;
        entry.questions = qs.map(q => ({ id: q.id, text: q.question_text }));
      } else if (meta.card_type === 'comment') {
        const { data: qs, error: qErr } = await supabaseClient
          .from('comment_questions').select('*').eq('page_id', meta.id).order('question_order');
        if (qErr) throw qErr;
        entry.questions = qs.map(q => ({ id: q.id, text: q.question_text }));
      }

      pages.push(entry);
    }

    console.log(`Loaded ${pages.length} dynamic page(s) from Supabase.`);
    return pages;

  } catch (err) {
    console.error('fetchDynamicPages error:', err);
    return loadFallbackDynamicPages();
  }
}

function loadFallbackDynamicPages() {
  console.warn('Using fallback SQD questions.');
  return [{
    type: 'likert', pageId: 'fallback-likert', instruction: '',
    questions: [
      { id: 'SQD0', text: 'SQD-0 Nasiyahan ako sa serbisyo na aking natanggap sa napuntahang tanggapan.' },
      { id: 'SQD1', text: 'SQD-1 Makatwiran ang oras na aking ginugol para sa pagproseso ng aking transaksyon.' },
      { id: 'SQD2', text: 'SQD-2 Ang opisina ay sumusunod sa mga kinakailangang dokumento at mga hakbang batay sa impormasyong ibinigay.' },
      { id: 'SQD3', text: 'SQD-3 Ang mga hakbang sa pagproseso, kasama na ang pagbayad, ay madali at simple lamang.' },
      { id: 'SQD4', text: 'SQD-4 Mabilis at madali akong nakahanap ng impormasyon tungkol sa aking transaksyon mula sa opisina o sa website nito.' },
      { id: 'SQD5', text: 'SQD-5 Nagbayad ako ng makatwirang halaga para sa aking transaksyon. (Kung libre ang serbisyo, piliin ang N/A.)' },
      { id: 'SQD6', text: 'SQD-6 Pakiramdam ko ay patas ang opisina sa lahat — "walang palakasan" — sa aking transaksyon.' },
      { id: 'SQD7', text: 'SQD-7 Magalang akong trinato ng mga tauhan at alam ko na sila ay handang tumulong sa akin.' },
      { id: 'SQD8', text: 'SQD-8 Nakuha ko ang kinakailangan ko mula sa tanggapan; kung tinanggihan man, sapat na ipinaliwanag sa akin.' },
    ],
  }];
}


// ═══════════════════════════════════════════════
// BUILD PAGES
// ═══════════════════════════════════════════════
function buildDynamicPage(pageData, stepIndex) {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = `page${stepIndex}`;
  page.setAttribute('data-page-type', pageData.type);
  page.setAttribute('data-page-db-id', pageData.pageId);

  if (pageData.type === 'likert')               buildLikertPage(page, pageData);
  else if (pageData.type === 'multiple-choice') buildMCPage(page, pageData);
  else if (pageData.type === 'comment')         buildCommentPage(page, pageData);

  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group';

  // Last dynamic page gets a Submit button instead of Next
  const isLastPage = stepIndex === totalPages;
  if (isLastPage) {
    btnGroup.innerHTML = `
      <button class="btn btn-prev" onclick="goPrev(${stepIndex})"><i class="fas fa-arrow-left"></i> Bumalik</button>
      <button class="btn btn-submit" onclick="submitForm()">Isumite <i class="fas fa-check"></i></button>
    `;
  } else {
    btnGroup.innerHTML = `
      <button class="btn btn-prev" onclick="goPrev(${stepIndex})"><i class="fas fa-arrow-left"></i> Bumalik</button>
      <button class="btn btn-next" onclick="goNext(${stepIndex})">Susunod <i class="fas fa-arrow-right"></i></button>
    `;
  }

  page.appendChild(btnGroup);
  return page;
}

function buildLikertPage(page, pageData) {
  page.innerHTML = `
    <div class="page-title">Survey Questions</div>
    <div class="page-sub">${pageData.instruction || 'Piliin ang emoji na naaangkop sa inyong karanasan.'}</div>
    <div class="emoji-legend">
      <div class="legend-item"><img src="../images/happy.png"  alt="Happy"><span>Labis na Sumasang-ayon</span></div>
      <div class="legend-item"><img src="../images/smile.png"  alt="Smile"><span>Sumasang-ayon</span></div>
      <div class="legend-item"><img src="../images/neutral.png"alt="Neutral"><span>Walang Opinyon</span></div>
      <div class="legend-item"><img src="../images/sad.png"    alt="Sad"><span>Hindi Sumasang-ayon</span></div>
      <div class="legend-item"><img src="../images/angry.png"  alt="Angry"><span>Lubos na Hindi Sumasang-ayon</span></div>
      <div class="legend-item"><img src="../images/na.png"     alt="NA"><span>Hindi Naaangkop</span></div>
    </div>
    <div id="sqdContainer_${pageData.pageId}"></div>
    <div class="error-msg" id="err-likert-${pageData.pageId}">Pakisagutan ang lahat ng katanungan.</div>
  `;

  const container = page.querySelector(`#sqdContainer_${pageData.pageId}`);
  pageData.questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'sqd-question-card';
    card.setAttribute('data-qid', q.id);

    const txt = document.createElement('div');
    txt.className = 'sqd-question-text';
    txt.textContent = q.text;
    card.appendChild(txt);

    const emojiGroup = document.createElement('div');
    emojiGroup.className = 'sqd-emoji-group';
    emojiOptions.forEach(opt => {
      const div = document.createElement('div');
      div.className = 'sqd-emoji-option';
      div.setAttribute('data-value', opt.value);
      div.onclick = () => selectLikertEmoji(div, q.id, opt.value);

      const span = document.createElement('span');
      span.className = 'sqd-emoji';
      span.innerHTML = opt.emoji;
      const img = span.querySelector('img');
      if (img) img.setAttribute('data-normal-src', img.src);

      div.appendChild(span);
      emojiGroup.appendChild(div);
    });
    card.appendChild(emojiGroup);
    container.appendChild(card);
  });
}

function buildMCPage(page, pageData) {
  page.innerHTML = `
    <div class="page-title">Mga Katanungan</div>
    <div class="page-sub">${pageData.instruction || 'Piliin ang sagot na naaangkop sa inyong karanasan.'}</div>
    <div id="mcContainer_${pageData.pageId}"></div>
    <div class="error-msg" id="err-mc-${pageData.pageId}">Pakisagutan ang lahat ng katanungan.</div>
  `;

  const container = page.querySelector(`#mcContainer_${pageData.pageId}`);
  pageData.questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'sqd-question-card';
    card.setAttribute('data-qid', q.id);

    const txt = document.createElement('div');
    txt.className = 'sqd-question-text';
    txt.textContent = q.text;
    card.appendChild(txt);

    const optGroup = document.createElement('div');
    optGroup.style.cssText = 'display:flex;flex-direction:column;gap:.5rem;margin-top:.75rem;';

    q.options.forEach(optText => {
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:.75rem;padding:.65rem .9rem;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:all .2s;font-size:.92rem;';

      const inputType = q.select_type === 'checkbox' ? 'checkbox' : 'radio';
      const input = document.createElement('input');
      input.type  = inputType;
      input.name  = `mc_${q.id}`;
      input.value = optText;
      input.style.cssText = 'width:1.1rem;height:1.1rem;accent-color:var(--blue);flex-shrink:0;';

      input.addEventListener('change', () => {
        if (inputType === 'radio') {
          answers.mc[q.id] = optText;
          optGroup.querySelectorAll('label').forEach(l => { l.style.borderColor='var(--border)'; l.style.background=''; l.style.fontWeight=''; });
          label.style.borderColor = 'var(--blue)';
          label.style.background  = 'var(--blue-light)';
          label.style.fontWeight  = '600';
        } else {
          answers.mc[q.id] = [...optGroup.querySelectorAll('input:checked')].map(cb => cb.value);
          label.style.borderColor = input.checked ? 'var(--blue)' : 'var(--border)';
          label.style.background  = input.checked ? 'var(--blue-light)' : '';
          label.style.fontWeight  = input.checked ? '600' : '';
        }
        saveDraft();
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(optText));
      optGroup.appendChild(label);
    });

    card.appendChild(optGroup);
    container.appendChild(card);
  });
}

// Comment page now also shows the confidential note and acts as the final step
// when it is the last dynamic page (buttons are handled in buildDynamicPage).
function buildCommentPage(page, pageData) {
  page.innerHTML = `
    <div class="page-title">Mga Komento at Suhestiyon</div>
    <div class="page-sub">${pageData.instruction || 'Mangyaring magbigay ng inyong komento o puna (opsyonal).'}</div>
    <div id="commentContainer_${pageData.pageId}"></div>
    <div class="confidential-box">
      <i class="fas fa-lock"></i> Ang lahat ng inyong sagot ay mananatiling kompidensyal.
    </div>
  `;

  const container = page.querySelector(`#commentContainer_${pageData.pageId}`);
  pageData.questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'sqd-question-card';
    card.setAttribute('data-qid', q.id);

    const txt = document.createElement('div');
    txt.className = 'sqd-question-text';
    txt.textContent = q.text;
    card.appendChild(txt);

    const ta = document.createElement('textarea');
    ta.id = `comment_${q.id}`;
    ta.placeholder = 'Ilagay dito ang inyong sagot...';
    ta.style.cssText = 'width:100%;margin-top:.75rem;resize:vertical;min-height:100px;';
    ta.addEventListener('input', () => { answers.comment[q.id] = ta.value.trim(); saveDraft(); });

    card.appendChild(ta);
    container.appendChild(card);
  });
}


// ═══════════════════════════════════════════════
// INJECT INTO DOM
// Note: buildSuggestionsPage removed — comment pages
// now serve as the final step with the Submit button.
// ═══════════════════════════════════════════════
function injectDynamicPages() {
  const container     = document.getElementById('mainContainer');
  const successScreen = document.getElementById('successScreen');

  container.querySelectorAll('.page.dynamic-survey-page').forEach(p => p.remove());

  // Pre-calculate totalPages so buildDynamicPage knows which is last
  totalPages = 2 + dynamicPages.length;

  let stepIndex = 3;
  dynamicPages.forEach(pageData => {
    const el = buildDynamicPage(pageData, stepIndex);
    el.classList.add('dynamic-survey-page');
    container.insertBefore(el, successScreen);
    stepIndex++;
  });

  updateProgressBar();
  console.log('Total survey pages:', totalPages);
}


// ═══════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════
function updateProgressBar() {
  const wrap = document.querySelector('.step1-progress-lines');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < totalPages; i++) {
    const line = document.createElement('div');
    line.className = 'progress-line';
    wrap.appendChild(line);
  }
}

function updateProgressLines(pageNum) {
  document.querySelectorAll('.progress-line').forEach((l, i) => l.classList.toggle('active', i < pageNum));
  const lbl = document.querySelector('.step1-step-label');
  if (lbl) lbl.textContent = `Hakbang ${pageNum} ng ${totalPages}`;
}


// ═══════════════════════════════════════════════
// EMOJI SELECTION
// ═══════════════════════════════════════════════
function selectLikertEmoji(el, questionId, value) {
  const card = el.closest('.sqd-question-card');
  card?.querySelectorAll('.sqd-emoji-option').forEach(opt => {
    opt.classList.remove('selected');
    const img = opt.querySelector('.sqd-emoji img');
    const src = img?.getAttribute('data-normal-src');
    if (src) img.src = src;
  });

  el.classList.add('selected');
  const img = el.querySelector('.sqd-emoji img');
  const found = emojiOptions.find(o => o.value === value);
  if (found && img) {
    const tmp = document.createElement('div');
    tmp.innerHTML = found.selectedEmoji;
    const newSrc = tmp.querySelector('img')?.src;
    if (newSrc) img.src = newSrc;
  }

  answers.likert[questionId] = value;
  saveDraft();
}


// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function showPage(num) {
  document.querySelectorAll('.page').forEach((p, i) => p.classList.toggle('active', i + 1 === num));
  updateProgressLines(num);
  currentPage = num;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  saveDraft();
}

window.goPrev = (fromPage) => fromPage > 1 ? showPage(fromPage - 1) : (window.location.href = '../index.html');

window.goNext = (fromPage) => {
  if (validatePage(fromPage)) {
    showPage(fromPage + 1);
  } else {
    if (fromPage === 1 || fromPage === 2) scrollToFirstError(fromPage);
    else if (fromPage >= 3)               scrollToFirstUnanswered(fromPage);
  }
};

function goBack() {
  const pages = [...document.querySelectorAll('.page')];
  const idx   = pages.findIndex(p => p.classList.contains('active'));
  if (idx === 0) window.location.href = '../index.html';
  else if (idx > 0) goPrev(idx + 1);
}

function scrollToFirstUnanswered(pageNum) {
  const page = document.getElementById(`page${pageNum}`);
  if (!page) return;
  const type = page.getAttribute('data-page-type');
  for (const card of page.querySelectorAll('.sqd-question-card')) {
    const qid = card.getAttribute('data-qid');
    let answered = false;
    if (type === 'likert')               answered = !!answers.likert[qid];
    else if (type === 'multiple-choice') { const v = answers.mc[qid]; answered = v && (Array.isArray(v) ? v.length > 0 : !!v); }
    else answered = true; // comment cards are optional
    if (!answered) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.transition = 'background-color .3s';
      card.style.backgroundColor = '#fee2e2';
      setTimeout(() => { card.style.backgroundColor = ''; }, 1500);
      return;
    }
  }
}

function scrollToFirstError(pageNum) {
  const page = document.getElementById(`page${pageNum}`);
  if (!page) return;

  if (pageNum === 1) {
    if (!getVal('tanggapan')) {
      const el = document.getElementById('tanggapan');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'border-color 0.3s, box-shadow 0.3s';
      el.style.borderColor = '#dc2626';
      el.style.boxShadow   = '0 0 0 3px rgba(220,38,38,0.1)';
      setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1500);
      return;
    }
    if (!getVal('uri_transaksyon')) {
      const el = document.getElementById('uri_transaksyon');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'border-color 0.3s, box-shadow 0.3s';
      el.style.borderColor = '#dc2626';
      el.style.boxShadow   = '0 0 0 3px rgba(220,38,38,0.1)';
      setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1500);
      return;
    }
  }

  if (pageNum === 2) {
    const cc1Selected = radioVal('cc1');
    if (!cc1Selected) {
      const el = document.getElementById('cc1_group');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background-color 0.3s';
        el.style.backgroundColor = '#fee2e2';
        setTimeout(() => { el.style.backgroundColor = ''; }, 1500);
      }
      return;
    }
    if (['1', '2', '3'].includes(cc1Selected)) {
      if (!radioVal('cc2')) {
        const el = document.getElementById('cc2_options');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.backgroundColor = '#fee2e2'; setTimeout(() => { el.style.backgroundColor = ''; }, 1500); }
        return;
      }
      if (!radioVal('cc3')) {
        const el = document.getElementById('cc3_options');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.backgroundColor = '#fee2e2'; setTimeout(() => { el.style.backgroundColor = ''; }, 1500); }
        return;
      }
    }
  }
}


// ═══════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════
const getVal   = id   => document.getElementById(id)?.value?.trim() || '';
const radioVal = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
const showErr  = (id, show) => { const el = document.getElementById(`err-${id}`); if (el) el.style.display = show ? 'block' : 'none'; };

function validatePage(page) {
  let ok = true;

  if (page === 1) {
    const tanggapan  = document.getElementById('tanggapan');
    const transaksyon = document.getElementById('uri_transaksyon');
    tanggapan?.style.removeProperty('border-color');
    tanggapan?.style.removeProperty('box-shadow');
    transaksyon?.style.removeProperty('border-color');
    transaksyon?.style.removeProperty('box-shadow');

    [['tanggapan', getVal('tanggapan')], ['uri_transaksyon', getVal('uri_transaksyon')]].forEach(([id, v]) => {
      const fail = !v;
      showErr(id, fail);
      if (fail) ok = false;
    });
    return ok;
  }

  if (page === 2) {
    const cc1 = radioVal('cc1');
    if (!cc1) { showErr('cc1', true); return false; }
    showErr('cc1', false);
    if (['1','2','3'].includes(cc1)) {
      if (!radioVal('cc2')) { showErr('cc2', true); ok = false; } else showErr('cc2', false);
      if (!radioVal('cc3')) { showErr('cc3', true); ok = false; } else showErr('cc3', false);
    }
    return ok;
  }

  if (page >= 3 && page <= totalPages) {
    const pageEl = document.getElementById(`page${page}`);
    if (!pageEl) return true;
    const type  = pageEl.getAttribute('data-page-type');
    const dbId  = pageEl.getAttribute('data-page-db-id');

    if (type === 'likert') {
      const missing = [...pageEl.querySelectorAll('.sqd-question-card')].some(c => !answers.likert[c.getAttribute('data-qid')]);
      const errEl = document.getElementById(`err-likert-${dbId}`);
      if (errEl) errEl.style.display = missing ? 'block' : 'none';
      if (missing) ok = false;
    } else if (type === 'multiple-choice') {
      const missing = [...pageEl.querySelectorAll('.sqd-question-card')].some(c => {
        const v = answers.mc[c.getAttribute('data-qid')];
        return !v || (Array.isArray(v) && !v.length);
      });
      const errEl = document.getElementById(`err-mc-${dbId}`);
      if (errEl) errEl.style.display = missing ? 'block' : 'none';
      if (missing) ok = false;
    }
    // comment pages are always valid (optional answers)
  }

  return ok;
}


// ═══════════════════════════════════════════════
// SUBMIT
// suggestions field removed — comment_responses
// now capture all open-ended answers.
// ═══════════════════════════════════════════════
window.submitForm = async function () {
  const selectedOfficeName = getVal('tanggapan');
  const officeId = officeMap[selectedOfficeName] || null;

  if (!officeId) {
    console.warn(`office_id not found for "${selectedOfficeName}" — saving with office_id = null.`);
  }

  const responseRow = {
    survey_id:        null,
    first_name:       getVal('firstName')       || null,
    last_name:        getVal('lastName')        || null,
    email:            getVal('email')           || null,
    response_date:    getVal('petsa')           || null,
    gender:           getVal('kasarian')        || null,
    age:              getVal('edad') ? parseInt(getVal('edad')) : null,
    office_id:        officeId,
    client_type:      radioVal('uri_kliyente')  || null,
    region:           getVal('rehiyon')         || null,
    transaction_type: getVal('uri_transaksyon') || null,
    cc1:              radioVal('cc1')           || null,
    cc2:              radioVal('cc2')           || null,
    cc3:              radioVal('cc3')           || null,
    // suggestions column removed from insert — answers go to comment_responses
  };

  try {
    const { data: surveys } = await supabaseClient
      .from('surveys').select('id').order('created_at', { ascending: false }).limit(1);
    if (surveys?.length) responseRow.survey_id = surveys[0].id;
  } catch (_) { /* non-fatal */ }

  const { data: inserted, error: rErr } = await supabaseClient
    .from('survey_responses').insert([responseRow]).select();
  if (rErr) {
    console.error('survey_responses insert error:', rErr);
    alert('Error saving your response: ' + rErr.message);
    return;
  }

  const responseId = inserted[0].id;

  // Likert answers
  const likertRows = Object.entries(answers.likert)
    .filter(([qid]) => isUUID(qid))
    .map(([question_id, rating]) => ({ response_id: responseId, question_id, rating }));

  if (likertRows.length) {
    const { error: lErr } = await supabaseClient.from('likert_responses').insert(likertRows);
    if (lErr) console.error('likert_responses insert error:', lErr);
  }

  // MC answers
  const mcRows = Object.entries(answers.mc)
    .filter(([qid]) => isUUID(qid))
    .map(([question_id, value]) => ({
      response_id: responseId,
      question_id,
      answer_text: Array.isArray(value) ? value.join(', ') : value,
    }));

  if (mcRows.length) {
    const { error: mErr } = await supabaseClient.from('mc_responses').insert(mcRows);
    if (mErr) console.error('mc_responses insert error:', mErr);
  }

  // Comment answers (skip blank ones — they are optional)
  const commentRows = Object.entries(answers.comment)
    .filter(([qid, v]) => isUUID(qid) && v?.trim())
    .map(([question_id, answer_text]) => ({ response_id: responseId, question_id, answer_text }));

  if (commentRows.length) {
    const { error: cErr } = await supabaseClient.from('comment_responses').insert(commentRows);
    if (cErr) console.error('comment_responses insert error:', cErr);
  }

  console.log('Submission saved. response_id:', responseId, '| office_id:', officeId);
  clearDraft();
  showSuccessScreen();
};

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function showSuccessScreen() {
  document.querySelector('.step1-progress-wrap')?.style && (document.querySelector('.step1-progress-wrap').style.display = 'none');
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
  const s = document.getElementById('successScreen');
  if (s) s.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ═══════════════════════════════════════════════
// DRAFT (localStorage)
// ═══════════════════════════════════════════════
function saveDraft() {
  const d = {
    firstName: getVal('firstName'), lastName: getVal('lastName'),
    email: getVal('email'), petsa: getVal('petsa'),
    kasarian: getVal('kasarian'), edad: getVal('edad'),
    tanggapan: getVal('tanggapan'), uri_kliyente: radioVal('uri_kliyente'),
    rehiyon: getVal('rehiyon'), uri_transaksyon: getVal('uri_transaksyon'),
    cc1: radioVal('cc1'), cc2: radioVal('cc2'), cc3: radioVal('cc3'),
    currentPage, answers, savedAt: new Date().toISOString(),
  };
  localStorage.setItem('surveyDraft', JSON.stringify(d));
}

function loadDraft() {
  const raw = localStorage.getItem('surveyDraft');
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
    set('firstName', d.firstName); set('lastName', d.lastName);
    set('email', d.email); set('petsa', d.petsa);
    set('kasarian', d.kasarian); set('edad', d.edad);
    set('tanggapan', d.tanggapan); set('rehiyon', d.rehiyon);
    set('uri_transaksyon', d.uri_transaksyon);

    if (d.uri_kliyente) {
      const r = document.querySelector(`input[name="uri_kliyente"][value="${d.uri_kliyente}"]`);
      if (r) { r.checked = true; selectRadio(r.closest('.radio-option'), 'uri_kliyente'); }
    }
    if (d.cc1) {
      const r = document.querySelector(`input[name="cc1"][value="${d.cc1}"]`);
      if (r) { r.checked = true; selectCC1(r.closest('.cc1-option'), d.cc1); }
    }
    ['cc2','cc3'].forEach(name => {
      if (d[name]) {
        const r = document.querySelector(`input[name="${name}"][value="${d[name]}"]`);
        if (r) { r.checked = true; selectInline(r.closest('label')); }
      }
    });

    if (d.answers) {
      Object.entries(d.answers.likert || {}).forEach(([qid, value]) => {
        answers.likert[qid] = value;
        setTimeout(() => {
          const opt = document.querySelector(`.sqd-question-card[data-qid="${qid}"] .sqd-emoji-option[data-value="${value}"]`);
          if (opt) selectLikertEmoji(opt, qid, value);
        }, 200);
      });
      Object.entries(d.answers.mc || {}).forEach(([qid, value]) => {
        answers.mc[qid] = value;
        setTimeout(() => {
          const vals = Array.isArray(value) ? value : [value];
          vals.forEach(v => {
            const inp = document.querySelector(`input[name="mc_${qid}"][value="${v}"]`);
            if (inp) { inp.checked = true; inp.dispatchEvent(new Event('change')); }
          });
        }, 200);
      });
      Object.entries(d.answers.comment || {}).forEach(([qid, value]) => {
        answers.comment[qid] = value;
        setTimeout(() => { const ta = document.getElementById(`comment_${qid}`); if (ta) ta.value = value; }, 200);
      });
    }

    if (d.currentPage > 1) setTimeout(() => showPage(d.currentPage), 300);
  } catch (e) { console.error('loadDraft:', e); }
}

function clearDraft()  { localStorage.removeItem('surveyDraft'); }
function setupAutoSave() {
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('change', saveDraft);
    el.addEventListener('input',  saveDraft);
  });
  setInterval(saveDraft, 30000);
}


// ═══════════════════════════════════════════════
// STATIC PAGE HELPERS
// ═══════════════════════════════════════════════
window.selectRadio = function(el, groupId) {
  document.getElementById(groupId)?.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
  el?.classList.add('selected');
  saveDraft();
};

window.selectCC1 = function(el, v) {
  document.querySelectorAll('#cc1_group .cc1-option').forEach(o => o.classList.remove('selected'));
  el?.classList.add('selected');
  const knows = ['1','2','3'].includes(v);
  ['cc2_group','cc3_group'].forEach(id => { const g = document.getElementById(id); if (g) g.style.display = knows ? 'block' : 'none'; });
  if (!knows) {
    document.querySelectorAll('input[name="cc2"]:checked, input[name="cc3"]:checked').forEach(r => r.checked = false);
    document.querySelectorAll('#cc2_options label, #cc3_options label').forEach(l => l.classList.remove('selected'));
  }
  saveDraft();
};

window.selectInline = function(el) {
  el?.closest('.inline-rating')?.querySelectorAll('label').forEach(l => l.classList.remove('selected'));
  el?.classList.add('selected');
  saveDraft();
};

function preventNumbers(e) { e.target.value = e.target.value.replace(/\d/g, ''); }

function validateAge(e) {
  const v = parseInt(e.target.value);
  if (isNaN(v)) e.target.value = '';
  else if (v < 1) e.target.value = 1;
  else if (v > 120) e.target.value = 120;
}

function setDateRestrictions() {
  const el = document.getElementById('petsa');
  if (!el) return;
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth();
  const min = new Date(y, m - 1, 1);
  el.setAttribute('min', `${min.getFullYear()}-${String(min.getMonth()+1).padStart(2,'0')}-01`);
  const max = `${y}-${String(m+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  el.setAttribute('max', max);
  el.value = max;
}


// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const offices = await fetchOffices();
  offices.length ? populateOfficeDropdown(offices) : loadFallbackOffices();

  const container = document.getElementById('mainContainer');
  const loader    = document.createElement('div');
  loader.id = 'surveyLoader';
  loader.style.cssText = 'text-align:center;padding:2rem;color:var(--gray);font-size:.9rem;';
  loader.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Nilo-load ang survey...';
  container.appendChild(loader);

  dynamicPages = await fetchDynamicPages();
  document.getElementById('surveyLoader')?.remove();
  injectDynamicPages();

  setDateRestrictions();
  document.getElementById('firstName')?.addEventListener('input', preventNumbers);
  document.getElementById('lastName')?.addEventListener('input', preventNumbers);
  const age = document.getElementById('edad');
  age?.addEventListener('input', validateAge);
  age?.addEventListener('blur',  validateAge);

  const cc2 = document.getElementById('cc2_group');
  const cc3 = document.getElementById('cc3_group');
  if (!document.querySelector('input[name="cc1"]:checked')) {
    if (cc2) cc2.style.display = 'none';
    if (cc3) cc3.style.display = 'none';
  }

  updateProgressLines(1);
  showPage(1);
  loadDraft();
  setupAutoSave();

  console.log('Survey ready. Pages:', totalPages);
});