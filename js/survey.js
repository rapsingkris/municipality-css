// ── SUPABASE INITIALIZATION ──
const supabaseUrl = 'https://ircbidpdgkezxnszzeuu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyY2JpZHBkZ2tlenhuc3p6ZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjQ1ODYsImV4cCI6MjA5MjIwMDU4Nn0.OkLuJsyIx1a3AsIb9w7KWEDlyIJfWjQJ9O_fN5KoSMw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log('Supabase client:', supabaseClient);
console.log('Auth headers:', supabaseClient.rest?.headers);

// ── SQD QUESTIONS ──
const sqdQuestions = [
  { id: 'SQD0', text: 'SQD-0 Nasiyahan ako sa serbisyo na aking natanggap sa napuntahang tanggapan.' },
  { id: 'SQD1', text: 'SQD-1 Makatwiran ang oras na aking ginugol para sa pagproseso ng aking transaksyon.' },
  { id: 'SQD2', text: 'SQD-2 Ang opisina ay sumusunod sa mga kinakailangang dokumento at mga hakbang batay sa impormasyong ibinigay.' },
  { id: 'SQD3', text: 'SQD-3 Ang mga hakbang sa pagproseso, kasama na ang pagbayad, ay madali at simple lamang.' },
  { id: 'SQD4', text: 'SQD-4 Mabilis at madali akong nakahanap ng impormasyon tungkol sa aking transaksyon mula sa opisina o sa website nito.' },
  { id: 'SQD5', text: 'SQD-5 Nagbayad ako ng makatwirang halaga para sa aking transaksyon. (Kung libre ang serbisyo, piliin ang N/A.)' },
  { id: 'SQD6', text: 'SQD-6 Pakiramdam ko ay patas ang opisina sa lahat — "walang palakasan" — sa aking transaksyon.' },
  { id: 'SQD7', text: 'SQD-7 Magalang akong trinato ng mga tauhan at alam ko na sila ay handang tumulong sa akin.' },
  { id: 'SQD8', text: 'SQD-8 Nakuha ko ang kinakailangan ko mula sa tanggapan; kung tinanggihan man, sapat na ipinaliwanag sa akin.' },
];

// ── EMOJI OPTIONS ──
const emojiOptions = [
  { value: '5', emoji: '<img src="../images/happy.png" alt="Happy">', selectedEmoji: '<img src="../images/happy_selected.png" alt="Happy Selected">' },
  { value: '4', emoji: '<img src="../images/smile.png" alt="Smile">', selectedEmoji: '<img src="../images/smile_selected.png" alt="Smile Selected">' },
  { value: '3', emoji: '<img src="../images/neutral.png" alt="Neutral">', selectedEmoji: '<img src="../images/neutral_selected.png" alt="Neutral Selected">' },
  { value: '2', emoji: '<img src="../images/sad.png" alt="Sad">', selectedEmoji: '<img src="../images/sad_selected.png" alt="Sad Selected">' },
  { value: '1', emoji: '<img src="../images/angry.png" alt="Angry">', selectedEmoji: '<img src="../images/angry_selected.png" alt="Angry Selected">' },
  { value: 'NA', emoji: '<img src="../images/na.png" alt="N/A">', selectedEmoji: '<img src="../images/na.png" alt="N/A">' },
];

// ── PAGE STATE ──
let currentPage = 1;
const totalPages = 4;

// ── INPUT VALIDATIONS ──

// Prevent numbers in name fields
function preventNumbers(e) {
  e.target.value = e.target.value.replace(/[0-9]/g, '');
}

// Validate age (acceptable range 1-120)
function validateAge(e) {
  let value = parseInt(e.target.value);
  if (isNaN(value)) {
    e.target.value = '';
  } else if (value < 1) {
    e.target.value = 1;
  } else if (value > 120) {
    e.target.value = 120;
  }
}

// Set date restrictions (current month and last month only)
function setDateRestrictions() {
  const dateInput = document.getElementById('petsa');
  if (!dateInput) return;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11

  // Calculate first day of last month
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonth = lastMonthDate.getMonth();

  // First day of last month (YYYY-MM-DD)
  const minDate = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-01`;

  // Today's date as max
  const maxDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  dateInput.setAttribute('min', minDate);
  dateInput.setAttribute('max', maxDate);

  // Set default value to today
  dateInput.value = maxDate;
}

// ── SELECT SQD EMOJI ──
window.selectSQDEmoji = function(el, questionId, value) {
  const card = el.closest('.sqd-question-card');
  if (card) {
    card.querySelectorAll('.sqd-emoji-option').forEach(opt => {
      opt.classList.remove('selected');
      const emojiSpan = opt.querySelector('.sqd-emoji');
      const currentImg = emojiSpan.querySelector('img');
      const normalSrc = currentImg.getAttribute('data-normal-src');
      if (normalSrc) {
        currentImg.src = normalSrc;
      }
    });
  }

  el.classList.add('selected');

  const emojiSpan = el.querySelector('.sqd-emoji');
  const currentImg = emojiSpan.querySelector('img');
  const valueAttr = el.getAttribute('data-value');

  const selectedOpt = emojiOptions.find(opt => opt.value === valueAttr);
  if (selectedOpt && selectedOpt.selectedEmoji) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = selectedOpt.selectedEmoji;
    const newSrc = tempDiv.querySelector('img').src;
    currentImg.src = newSrc;
  }

  let hiddenRadio = document.querySelector(`input[name="${questionId}"]`);
  if (!hiddenRadio) {
    hiddenRadio = document.createElement('input');
    hiddenRadio.type = 'radio';
    hiddenRadio.name = questionId;
    hiddenRadio.style.display = 'none';
    document.body.appendChild(hiddenRadio);
  }
  hiddenRadio.value = value;
  hiddenRadio.checked = true;
};

function goBack() {
  // Find which page is currently active
  const pages = document.querySelectorAll('.page');
  let activeIndex = -1;

  for (let i = 0; i < pages.length; i++) {
    if (pages[i].classList.contains('active')) {
      activeIndex = i;
      break;
    }
  }

  // If on page 1 (index 0), go back to the home page (index.html in root)
  if (activeIndex === 0) {
    // Navigate to the root directory's index.html
    window.location.href = '../index.html';
  }
  // Otherwise go to previous page
  else if (activeIndex > 0) {
    goPrev(activeIndex + 1);
  }
}

function getSQDValue(questionId) {
  const radio = document.querySelector(`input[name="${questionId}"]:checked`);
  return radio ? radio.value : '';
}

function buildSQDTable() {
  const container = document.getElementById('sqdContainer');
  if (!container) return;
  container.innerHTML = '';

  sqdQuestions.forEach((q) => {
    const card = document.createElement('div');
    card.className = 'sqd-question-card';
    card.setAttribute('data-qid', q.id);

    const questionText = document.createElement('div');
    questionText.className = 'sqd-question-text';
    questionText.textContent = q.text;
    card.appendChild(questionText);

    const emojiGroup = document.createElement('div');
    emojiGroup.className = 'sqd-emoji-group';

    emojiOptions.forEach(opt => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'sqd-emoji-option';
      optionDiv.setAttribute('data-value', opt.value);
      optionDiv.onclick = function() {
        window.selectSQDEmoji(optionDiv, q.id, opt.value);
      };

      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'sqd-emoji';
      emojiSpan.innerHTML = opt.emoji;

      const img = emojiSpan.querySelector('img');
      if (img) {
        img.setAttribute('data-normal-src', img.src);
      }

      optionDiv.appendChild(emojiSpan);
      emojiGroup.appendChild(optionDiv);
    });

    card.appendChild(emojiGroup);
    container.appendChild(card);
  });
}

function updateProgressLines(pageNum) {
  const lines = document.querySelectorAll('.progress-line');
  lines.forEach((line, idx) => {
    if (idx < pageNum) line.classList.add('active');
    else line.classList.remove('active');
  });
  const stepLabel = document.querySelector('.step1-step-label');
  if (stepLabel) {
    stepLabel.textContent = `Hakbang ${pageNum} ng ${totalPages}`;
  }
}

function showPage(num) {
  document.querySelectorAll('.page').forEach((p, i) => {
    p.classList.toggle('active', i + 1 === num);
  });
  updateProgressLines(num);
  currentPage = num;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.goPrev = function(fromPage) {
  if (fromPage > 1) showPage(fromPage - 1);
  else window.location.href = '../index.html';
};

// Scroll to first empty SQD question
function scrollToFirstEmpty() {
  const cards = document.querySelectorAll('.sqd-question-card');
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const selected = card.querySelector('.sqd-emoji-option.selected');

    if (!selected) {
      // Scroll to the first unanswered question
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Highlight the card briefly
      card.style.transition = 'background-color 0.3s';
      card.style.backgroundColor = '#fee2e2';
      setTimeout(() => {
        card.style.backgroundColor = '';
      }, 1500);

      return;
    }
  }
}

window.goNext = function(fromPage) {
  if (validatePage(fromPage)) {
    showPage(fromPage + 1);
  } else {
    // If validation fails on page 3, scroll to first empty question
    if (fromPage === 3) {
      scrollToFirstEmpty();
    }
  }
};

window.selectRadio = function(el, groupId) {
  const container = document.getElementById(groupId);
  if (container) {
    container.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
  }
  el.classList.add('selected');
};

window.selectCC1 = function(el, val) {
  document.querySelectorAll('#cc1_group .cc1-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  const knowsCC = ['1', '2', '3'].includes(val);
  const cc2Group = document.getElementById('cc2_group');
  const cc3Group = document.getElementById('cc3_group');

  if (cc2Group) cc2Group.style.display = knowsCC ? 'block' : 'none';
  if (cc3Group) cc3Group.style.display = knowsCC ? 'block' : 'none';

  if (!knowsCC) {
    const cc2Radio = document.querySelector('input[name="cc2"]:checked');
    const cc3Radio = document.querySelector('input[name="cc3"]:checked');
    if (cc2Radio) cc2Radio.checked = false;
    if (cc3Radio) cc3Radio.checked = false;
    document.querySelectorAll('#cc2_options label, #cc3_options label').forEach(l => l.classList.remove('selected'));
  }
};

window.selectInline = function(el) {
  const container = el.closest('.inline-rating');
  if (container) {
    container.querySelectorAll('label').forEach(l => l.classList.remove('selected'));
  }
  el.classList.add('selected');
};

function val(id) {
  const el = document.getElementById(id);
  return el ? (el.value?.trim() || '') : '';
}

function radioVal(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function showErr(id, show) {
  const el = document.getElementById(`err-${id}`);
  if (el) el.style.display = show ? 'block' : 'none';
}

function validatePage(page) {
  let ok = true;

  if (page === 1) {
    const fields = [
      ['tanggapan', val('tanggapan')],
      ['uri_transaksyon', val('uri_transaksyon')],
    ];
    fields.forEach(([id, v]) => {
      const fail = !v;
      showErr(id, fail);
      if (fail) ok = false;
    });
  }

  if (page === 2) {
    const cc1 = radioVal('cc1');
    if (!cc1) {
      showErr('cc1', true);
      ok = false;
    } else {
      showErr('cc1', false);
      if (['1', '2', '3'].includes(cc1)) {
        if (!radioVal('cc2')) { showErr('cc2', true); ok = false; }
        else showErr('cc2', false);
        if (!radioVal('cc3')) { showErr('cc3', true); ok = false; }
        else showErr('cc3', false);
      }
    }
  }

  if (page === 3) {
    const missing = sqdQuestions.some(q => !getSQDValue(q.id));
    const errEl = document.getElementById('err-sqd');
    if (errEl) errEl.style.display = missing ? 'block' : 'none';
    if (missing) ok = false;
  }

  return ok;
}

window.submitForm = async function() {
  if (!validatePage(4)) {
    return;
  }

  const surveyData = {
    first_name: val('firstName') || null,
    last_name: val('lastName') || null,
    email: val('email') || null,
    date: val('petsa') || null,
    gender: val('kasarian') || null,
    age: val('edad') ? parseInt(val('edad')) : null,
    office: val('tanggapan') || null,
    client_type: radioVal('uri_kliyente') || null,
    region: val('rehiyon') || null,
    transaction_type: val('uri_transaksyon') || null,
    cc1: radioVal('cc1') || null,
    cc2: radioVal('cc2') || null,
    cc3: radioVal('cc3') || null,
    suggestions: val('suggestions') || null,
  };

  console.log('Saving to Supabase:', surveyData);

  const { data, error } = await supabaseClient
    .from('surveys_user')
    .insert([surveyData])
    .select();

  if (error) {
    console.error('Error:', error);
    alert('Error saving: ' + error.message);
    return;
  }

  console.log('Saved successfully!', data);

  const surveyId = data[0].id;
  const { error: answersError } = await supabaseClient
  .from('sqd_answers')
  .insert([{
    survey_id: surveyId,
    sqd0: getSQDValue('SQD0') || null,
    sqd1: getSQDValue('SQD1') || null,
    sqd2: getSQDValue('SQD2') || null,
    sqd3: getSQDValue('SQD3') || null,
    sqd4: getSQDValue('SQD4') || null,
    sqd5: getSQDValue('SQD5') || null,
    sqd6: getSQDValue('SQD6') || null,
    sqd7: getSQDValue('SQD7') || null,
    sqd8: getSQDValue('SQD8') || null,
  }]);

if (answersError) {
  console.error('Error saving answers:', answersError);
}

  showSuccessScreen();
};

function showSuccessScreen() {
  const progressWrap = document.querySelector('.step1-progress-wrap');
  if (progressWrap) progressWrap.style.display = 'none';

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });

  const successScreen = document.getElementById('successScreen');
  if (successScreen) successScreen.style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── INITIALIZE ──
document.addEventListener('DOMContentLoaded', () => {
  buildSQDTable();

  // Set date restrictions (current and last month only)
  setDateRestrictions();

  // Add validation to name fields (prevent numbers)
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');

  if (firstNameInput) {
    firstNameInput.addEventListener('input', preventNumbers);
  }
  if (lastNameInput) {
    lastNameInput.addEventListener('input', preventNumbers);
  }

  // Add age validation
  const ageInput = document.getElementById('edad');
  if (ageInput) {
    ageInput.addEventListener('input', validateAge);
    ageInput.addEventListener('blur', validateAge);
  }

  updateProgressLines(1);

  const cc1Checked = document.querySelector('input[name="cc1"]:checked');
  if (!cc1Checked) {
    const cc2Group = document.getElementById('cc2_group');
    const cc3Group = document.getElementById('cc3_group');
    if (cc2Group) cc2Group.style.display = 'none';
    if (cc3Group) cc3Group.style.display = 'none';
  }
});