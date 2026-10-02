// ============================================================
//  QUIZ APPLICATION — MAIN LOGIC
//  Flow: Home → Level Select → Quiz → Result
// ============================================================

// ── State ────────────────────────────────────────────────────
const state = {
  questions:    [],     // questions for this round
  currentIndex: 0,
  userAnswers:  {},     // { questionId: "A"|"B"|"C"|"D" }
  timerInterval: null,
  timeLeft: 0,
  TOTAL_TIME: 1800,     // 30 minutes
  selectedLevel: 0,     // 0 = all levels
};

// ── Screen Registry ───────────────────────────────────────────
const screens = {
  home:   document.getElementById("screen-home"),
  level:  document.getElementById("screen-level"),
  quiz:   document.getElementById("screen-quiz"),
  result: document.getElementById("screen-result"),
};

function showScreen(name) {
  Object.keys(screens).forEach((key) => {
    screens[key].classList.toggle("active", key === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── DOM References ────────────────────────────────────────────
// Home
const btnStart        = document.getElementById("btn-start");

// Level select
const levelCards      = document.querySelectorAll(".level-card");
const btnBackHome     = document.getElementById("btn-back-home");

// Quiz
const qNumber         = document.getElementById("q-number");
const qCategory       = document.getElementById("q-category");
const qText           = document.getElementById("q-text");
const optionBtns      = document.querySelectorAll(".option-btn");
const btnPrev         = document.getElementById("btn-prev");
const btnNext         = document.getElementById("btn-next");
const btnSubmit       = document.getElementById("btn-submit");
const progressBar     = document.getElementById("progress-bar");
const timerDisplay    = document.getElementById("timer-display");
const timerRing       = document.getElementById("timer-ring");
const qLevel          = document.getElementById("q-level");
const qLevelStars     = document.getElementById("q-level-stars");
const qCompany        = document.getElementById("q-company");

// Result
const resTotal        = document.getElementById("res-total");
const resCorrect      = document.getElementById("res-correct");
const resWrong        = document.getElementById("res-wrong");
const resScore        = document.getElementById("res-score");
const resPercent      = document.getElementById("res-percent");
const resMessage      = document.getElementById("res-message");
const resIcon         = document.getElementById("res-icon");
const btnRestart      = document.getElementById("btn-restart");
const btnChooseLevel  = document.getElementById("btn-choose-level");
const btnHome         = document.getElementById("btn-home");

// ── Home → Level Select ───────────────────────────────────────
btnStart.addEventListener("click", () => showScreen("level"));
btnBackHome.addEventListener("click", () => showScreen("home"));

// ── Level Card Click ──────────────────────────────────────────
levelCards.forEach((card) => {
  card.addEventListener("click", () => {
    const lvl = parseInt(card.dataset.level, 10);
    state.selectedLevel = lvl;
    startQuiz(lvl);
  });
});

// ── Start Quiz ────────────────────────────────────────────────
function startQuiz(level) {
  // Filter questions by level (0 = all)
  const pool = level === 0
    ? [...quizQuestions]
    : quizQuestions.filter((q) => q.level === level);

  // Sort by level order
  state.questions    = pool.sort((a, b) => a.level - b.level);
  state.currentIndex = 0;
  state.userAnswers  = {};
  state.timeLeft     = state.TOTAL_TIME;

  showScreen("quiz");
  renderQuestion();
  startTimer();
}

// ── Render Current Question ───────────────────────────────────
function renderQuestion() {
  const q     = state.questions[state.currentIndex];
  const total = state.questions.length;

  // Header
  qNumber.textContent   = `Question ${state.currentIndex + 1} of ${total}`;
  qCategory.textContent = q.category;
  qText.textContent     = q.question;

  // Company tag
  if (qCompany) qCompany.textContent = "\uD83C\uDFE2 " + q.company;

  // Level badge
  const levelColors = ["", "#22c55e", "#84cc16", "#f59e0b", "#f97316", "#ef4444"];
  if (qLevel) {
    qLevel.textContent        = `Level ${q.level} \u2014 ${q.levelLabel}`;
    qLevel.style.color        = levelColors[q.level];
    qLevel.style.borderColor  = levelColors[q.level];
    qLevel.style.background   = levelColors[q.level] + "20";
  }
  if (qLevelStars) {
    qLevelStars.textContent = "\u2605".repeat(q.level) + "\u2606".repeat(5 - q.level);
    qLevelStars.style.color = levelColors[q.level];
  }

  // Progress bar
  const pct = ((state.currentIndex + 1) / total) * 100;
  progressBar.style.width = pct + "%";

  // Options
  ["A", "B", "C", "D"].forEach((key) => {
    const btn   = document.getElementById(`opt-${key}`);
    btn.querySelector(".opt-label").textContent = key;
    btn.querySelector(".opt-text").textContent  = q.options[key];
    btn.classList.remove("selected", "correct", "wrong");
    if (state.userAnswers[q.id] === key) btn.classList.add("selected");
  });

  // Nav buttons
  btnPrev.disabled             = state.currentIndex === 0;
  btnNext.style.display        = state.currentIndex < total - 1 ? "flex" : "none";
  btnSubmit.style.display      = state.currentIndex === total - 1 ? "flex" : "none";

  // Slide-in animation
  const card = document.getElementById("question-card");
  card.classList.remove("slide-in");
  void card.offsetWidth;
  card.classList.add("slide-in");
}

// ── Option Selection ──────────────────────────────────────────
optionBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const q      = state.questions[state.currentIndex];
    const chosen = btn.dataset.key;
    optionBtns.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    state.userAnswers[q.id] = chosen;
  });
});

// ── Navigation ────────────────────────────────────────────────
btnPrev.addEventListener("click", () => {
  if (state.currentIndex > 0) { state.currentIndex--; renderQuestion(); }
});

btnNext.addEventListener("click", () => {
  const q = state.questions[state.currentIndex];
  if (!state.userAnswers[q.id]) {
    flashWarning("Please select an answer before proceeding.");
    return;
  }
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
  }
});

btnSubmit.addEventListener("click", () => {
  const q = state.questions[state.currentIndex];
  if (!state.userAnswers[q.id]) {
    flashWarning("Please select an answer before submitting.");
    return;
  }
  submitQuiz();
});

// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
  clearInterval(state.timerInterval);
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) { clearInterval(state.timerInterval); submitQuiz(true); }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timeLeft / 60);
  const secs = state.timeLeft % 60;
  timerDisplay.textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  timerRing.classList.toggle("danger", state.timeLeft <= 60);
}

// ── Submit Quiz ───────────────────────────────────────────────
function submitQuiz(timeout = false) {
  clearInterval(state.timerInterval);

  let correct = 0;
  state.questions.forEach((q) => {
    if (state.userAnswers[q.id] === q.correctAnswer) correct++;
  });

  const total   = state.questions.length;
  const wrong   = total - correct;
  const percent = Math.round((correct / total) * 100);

  resTotal.textContent   = total;
  resCorrect.textContent = correct;
  resWrong.textContent   = wrong;
  resScore.textContent   = `${correct} / ${total}`;
  resPercent.textContent = percent + "%";

  let message, icon;
  if (percent >= 90)      { message = "Outstanding! You have mastered this topic!";         icon = "\uD83C\uDFC6"; }
  else if (percent >= 70) { message = "Great Job! You did really well on this quiz!";       icon = "\uD83C\uDF89"; }
  else if (percent >= 50) { message = "Good Effort! Keep practising to improve further.";   icon = "\uD83D\uDC4D"; }
  else                    { message = "Keep Learning! Review the topics and try again.";    icon = "\uD83D\uDCDA"; }

  resMessage.textContent = timeout ? "Time's up! " + message : message;
  resIcon.textContent    = icon;

  animateScoreRing(percent);
  showScreen("result");
}

// ── Score Ring Animation ──────────────────────────────────────
function animateScoreRing(percent) {
  const circle       = document.getElementById("score-circle");
  if (!circle) return;
  const radius       = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = circumference;
  circle.style.strokeDashoffset = circumference;
  let colour = "#ef4444";
  if (percent >= 70)      colour = "#22c55e";
  else if (percent >= 50) colour = "#f59e0b";
  circle.style.stroke = colour;
  setTimeout(() => {
    circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
  }, 300);
}

// ── Result Buttons ────────────────────────────────────────────
btnRestart.addEventListener("click", () => startQuiz(state.selectedLevel));
btnChooseLevel.addEventListener("click", () => { clearInterval(state.timerInterval); showScreen("level"); });
btnHome.addEventListener("click", () => { clearInterval(state.timerInterval); showScreen("home"); });

// ── Toast Warning ─────────────────────────────────────────────
function flashWarning(msg) {
  let el = document.getElementById("warn-toast");
  if (!el) { el = document.createElement("div"); el.id = "warn-toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

// ── Boot ──────────────────────────────────────────────────────
showScreen("home");
