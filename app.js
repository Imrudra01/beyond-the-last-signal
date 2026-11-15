/**
 * BEYOND THE LAST SIGNAL — APPLICATION ENGINE
 * 2026 NASA International Space Apps Challenge
 * Team: ANTIGRAVIITYYY
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  initClock();
  initAudioSynthesizer();
  initScrollytelling();
  initQuiz();
});

/* ==========================================================================
   1. MISSION CLOCK & TELEMETRY TIME
   ========================================================================== */
function initClock() {
  const clockEl = document.getElementById('clock-display');
  function updateTime() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
    if (clockEl) {
      clockEl.innerText = now.toLocaleString('en-US', options).replace(/,/g, '');
    }
  }
  updateTime();
  setInterval(updateTime, 10000);
}

/* ==========================================================================
   2. PROCEDURAL WEB AUDIO SOUNDSCAPE (Martian Wind & Telemetry Beeps)
   Zero external asset dependencies! Pure Web Audio API synthesis.
   ========================================================================== */
let audioCtx = null;
let isAudioPlaying = false;
let noiseNode = null;
let filterNode = null;
let gainNode = null;
let telemetryInterval = null;

function initAudioSynthesizer() {
  const toggleBtn = document.getElementById('audio-indicator');
  const statusText = document.getElementById('audio-status');
  const icon = document.getElementById('audio-icon');

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (!isAudioPlaying) {
      startSoundscape();
      isAudioPlaying = true;
      toggleBtn.classList.add('active');
      statusText.innerText = 'AUDIO: ON';
    } else {
      stopSoundscape();
      isAudioPlaying = false;
      toggleBtn.classList.remove('active');
      statusText.innerText = 'AUDIO: OFF';
    }
  });
}

function startSoundscape() {
  if (!audioCtx) return;

  // 1. Synthesize Pink/Brown Martian Wind Noise
  const bufferSize = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
    b6 = white * 0.115926;
  }

  noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;

  // Bandpass filter for low Martian wind rumble
  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(260, audioCtx.currentTime);

  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

  noiseNode.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  noiseNode.start(0);

  // 2. Intermittent DSN Telemetry Beep (every 8-14s)
  telemetryInterval = setInterval(() => {
    playTelemetryPing();
  }, 9000);
}

function stopSoundscape() {
  if (noiseNode) {
    try { noiseNode.stop(); } catch (e) {}
    noiseNode.disconnect();
    noiseNode = null;
  }
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
  }
}

function playTelemetryPing() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const osc = audioCtx.createOscillator();
  const pingGain = audioCtx.createGain();

  const freq = 1760; // A6 tone
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  pingGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  pingGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

  osc.connect(pingGain);
  pingGain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.35);
}

function playUnlockSound() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    g.gain.setValueAtTime(0.08, now + idx * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.3);
  });
}

/* ==========================================================================
   3. SCROLLYTELLING & GAMIFIED PROGRESSION ENGINE
   ========================================================================== */
const unlockedLocks = {
  1: false,
  2: false,
  3: false,
  4: false
};

const lockRewards = {
  1: { title: "Lock 01 Unlocked: 3D Opportunity Rover Model", modal: "modal-3d", desc: "Inspect the rover subsystems in 3D" },
  2: { title: "Lock 02 Unlocked: Scientific Instruments Suite", modal: "modal-instruments", desc: "Explore the Athena science payload" },
  3: { title: "Lock 03 Unlocked: NASA Mars Traverse Path Map", modal: "modal-map", desc: "View the 45.16 km route across Meridiani" },
  4: { title: "Lock 04 Unlocked: The Final Mission Quiz", modal: "modal-quiz", desc: "Test your mission knowledge & get certified" }
};

function initScrollytelling() {
  const chapters = document.querySelectorAll('.story-chapter');
  const segments = document.querySelectorAll('.progress-segment');

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -40% 0px',
    threshold: 0.2
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const chapterIdx = parseInt(entry.target.getAttribute('data-chapter'), 10);
        updateProgressHUD(chapterIdx);
        checkUnlocks(chapterIdx);
      }
    });
  }, observerOptions);

  chapters.forEach(ch => observer.observe(ch));
}

function updateProgressHUD(activeIdx) {
  const segments = document.querySelectorAll('.progress-segment');
  segments.forEach((seg, idx) => {
    seg.classList.remove('active', 'passed');
    if (idx === activeIdx) {
      seg.classList.add('active');
    } else if (idx < activeIdx) {
      seg.classList.add('passed');
    }
  });
}

function checkUnlocks(chapterIdx) {
  // Milestone triggers:
  // Chapter 2 -> Unlock Lock 1
  if (chapterIdx >= 2 && !unlockedLocks[1]) {
    unlockReward(1);
  }
  // Chapter 4 -> Unlock Lock 2
  if (chapterIdx >= 4 && !unlockedLocks[2]) {
    unlockReward(2);
  }
  // Chapter 6 -> Unlock Lock 3
  if (chapterIdx >= 6 && !unlockedLocks[3]) {
    unlockReward(3);
  }
  // Chapter 7 or 8 -> Unlock Lock 4
  if (chapterIdx >= 7 && !unlockedLocks[4]) {
    unlockReward(4);
  }
}

function unlockReward(lockNum) {
  unlockedLocks[lockNum] = true;
  const lockBtn = document.getElementById(`lock-btn-${lockNum}`);
  if (lockBtn) {
    lockBtn.classList.remove('locked');
    lockBtn.classList.add('unlocked');
    const icon = lockBtn.querySelector('.lock-icon');
    if (icon) {
      icon.setAttribute('data-lucide', 'unlock');
      if (window.lucide) lucide.createIcons();
    }
  }

  playUnlockSound();
  showToast(lockRewards[lockNum]);
}

let toastTimer = null;
function showToast(reward) {
  const toast = document.getElementById('unlock-toast');
  const title = document.getElementById('toast-title');
  const desc = document.getElementById('toast-desc');
  const btn = document.getElementById('toast-explore-btn');

  if (!toast) return;

  title.innerText = reward.title;
  desc.innerText = reward.desc;
  btn.onclick = () => {
    toast.classList.add('hidden');
    openModal(reward.modal);
  };

  toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 6500);
}

/* ==========================================================================
   4. MODALS & 3D ROVER INSPECTOR (THREE.JS)
   ========================================================================== */
let threeInitialized = false;
let scene, camera, renderer, roverGroup;

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');

  if (modalId === 'modal-3d' && !threeInitialized) {
    initThreeRover();
    threeInitialized = true;
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
}

// Close on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
    }
  });
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
});

/* Procedural 3D Opportunity Rover using Three.js */
function initThreeRover() {
  const container = document.getElementById('three-canvas-container');
  if (!container || !window.THREE) return;

  const width = container.clientWidth || 550;
  const height = container.clientHeight || 480;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1d);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(4, 3, 5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffedd5, 1.2);
  sunLight.position.set(5, 10, 7);
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xea580c, 0.6);
  fillLight.position.set(-5, -2, -3);
  scene.add(fillLight);

  // Grid Plane (Mars Ground)
  const gridHelper = new THREE.GridHelper(10, 20, 0xea580c, 0x1e293b);
  gridHelper.position.y = -1.2;
  scene.add(gridHelper);

  // Assemble Procedural Rover Geometry
  roverGroup = new THREE.Group();

  // 1. Warm Electronics Box (Body)
  const bodyGeo = new THREE.BoxGeometry(2, 0.7, 1.4);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcca677, metalness: 0.4, roughness: 0.5 });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = -0.2;
  roverGroup.add(bodyMesh);

  // 2. Solar Arrays (Triangular Deck)
  const deckShape = new THREE.Shape();
  deckShape.moveTo(-1.2, -0.9);
  deckShape.lineTo(1.2, -0.9);
  deckShape.lineTo(1.5, 0.4);
  deckShape.lineTo(0, 1.2);
  deckShape.lineTo(-1.5, 0.4);
  deckShape.closePath();

  const deckGeo = new THREE.ShapeGeometry(deckShape);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x1a2e40, roughness: 0.2, metalness: 0.8, side: THREE.DoubleSide });
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.rotation.x = -Math.PI / 2;
  deckMesh.position.y = 0.16;
  roverGroup.add(deckMesh);

  // 3. Pancam Mast Assembly
  const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 16);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6 });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(0.6, 0.8, -0.5);
  roverGroup.add(mast);

  // Camera Head
  const headGeo = new THREE.BoxGeometry(0.3, 0.15, 0.2);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0.6, 1.45, -0.5);
  roverGroup.add(head);

  // Stereo Lenses
  const lensGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const lensL = new THREE.Mesh(lensGeo, lensMat);
  lensL.rotation.x = Math.PI / 2;
  lensL.position.set(0.5, 1.45, -0.4);
  const lensR = lensL.clone();
  lensR.position.x = 0.7;
  roverGroup.add(lensL);
  roverGroup.add(lensR);

  // 4. High-Gain Dish Antenna
  const dishGeo = new THREE.CylinderGeometry(0.25, 0.05, 0.08, 32);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = Math.PI / 4;
  dish.position.set(-0.6, 0.45, -0.4);
  roverGroup.add(dish);

  // 5. 6 Aluminum Wheels with Rocker Bogie
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.5 });

  const wheelPositions = [
    [-1.2, -1.0, 0.8], [0, -1.0, 0.9], [1.2, -1.0, 0.8],
    [-1.2, -1.0, -0.8], [0, -1.0, -0.9], [1.2, -1.0, -0.8]
  ];

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos[0], pos[1], pos[2]);
    roverGroup.add(wheel);
  });

  // 6. Robotic Arm (IDD)
  const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.rotation.z = -Math.PI / 3;
  arm.position.set(1.2, -0.5, 0.4);
  roverGroup.add(arm);

  scene.add(roverGroup);

  // Mouse Interaction (Orbiting)
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  const canvas = renderer.domElement;
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => isDragging = false);

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    roverGroup.rotation.y += deltaX * 0.008;
    roverGroup.rotation.x += deltaY * 0.008;

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.position.z = Math.min(Math.max(camera.position.z + e.deltaY * 0.005, 3), 10);
  });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    if (!isDragging) {
      roverGroup.rotation.y += 0.002;
    }
    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function focusRoverSubsystem(type) {
  document.querySelectorAll('.hotspot-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');

  if (!roverGroup) return;

  if (type === 'pancam') {
    roverGroup.rotation.set(0.2, 0, 0);
  } else if (type === 'arrays') {
    roverGroup.rotation.set(0.8, 0, 0);
  } else if (type === 'arm') {
    roverGroup.rotation.set(0, -Math.PI / 3, 0);
  } else if (type === 'bogie') {
    roverGroup.rotation.set(-0.2, Math.PI / 2, 0);
  }
}

/* ==========================================================================
   5. MISSION QUIZ ENGINE
   ========================================================================== */
const quizData = [
  {
    question: "What was Opportunity's original primary mission warranty duration on Mars?",
    options: ["30 Martian Days (Sols)", "90 Martian Days (Sols)", "1 Martian Year (687 Sols)", "10 Earth Years"],
    correct: 1,
    explanation: "Opportunity was designed and certified for an initial primary mission of only 90 sols and 600 meters, but operated for over 5,111 sols (nearly 15 years)!"
  },
  {
    question: "What historic geological discovery in Eagle Crater proved ancient liquid water existed on Mars?",
    options: ["Subsurface Frozen Permafrost", "Hematite Spherules ('Martian Blueberries')", "Liquid Methane Lakes", "Basaltic Lava Tubes"],
    correct: 1,
    explanation: "The Microscopic Imager and Mössbauer Spectrometer identified hematite spherules that formed by groundwater percolation through porous Martian rock."
  },
  {
    question: "What treacherous sand trap held Opportunity captive for five weeks before JPL engineered an escape?",
    options: ["Endurance Chasm", "Victoria Abyss", "Purgatory Dune", "Perseverance Quicksand"],
    correct: 2,
    explanation: "On Sol 446, Opportunity was trapped hub-deep in Purgatory Dune. JPL tested maneuvers in an Earth sandbox before successfully extricating Oppy on Sol 484."
  },
  {
    question: "Opportunity holds the record as the first vehicle to complete an official Olympic marathon on an alien world. What was its final odometer reading?",
    options: ["12.4 km (7.7 mi)", "28.1 km (17.4 mi)", "45.16 km (28.06 mi)", "72.8 km (45.2 mi)"],
    correct: 2,
    explanation: "Opportunity traveled 45.16 kilometers (28.06 miles), securing the off-world distance driving record in human history."
  },
  {
    question: "What was the final wake-up song beamed to Opportunity across the Deep Space Network before NASA concluded recovery efforts?",
    options: ["David Bowie — 'Space Oddity'", "The Beatles — 'Here Comes the Sun'", "Billie Holiday — 'I'll Be Seeing You'", "Elton John — 'Rocket Man'"],
    correct: 2,
    explanation: "On Sol 5352 (Feb 12, 2019), mission controllers broadcast Billie Holiday's 'I'll Be Seeing You' as a poignant farewell to the immortal explorer."
  }
];

let currentQuestion = 0;
let quizScore = 0;

function initQuiz() {
  loadQuestion();
}

function loadQuestion() {
  const q = quizData[currentQuestion];
  document.getElementById('q-current').innerText = currentQuestion + 1;
  document.getElementById('q-title').innerText = q.question;

  const optContainer = document.getElementById('q-options');
  optContainer.innerHTML = '';

  const fbEl = document.getElementById('q-feedback');
  fbEl.className = 'quiz-feedback hidden';
  fbEl.innerText = '';

  const nextBtn = document.getElementById('q-next-btn');
  nextBtn.classList.add('hidden');

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn';
    btn.innerText = opt;
    btn.onclick = () => selectQuizOption(idx);
    optContainer.appendChild(btn);
  });
}

function selectQuizOption(selectedIdx) {
  const q = quizData[currentQuestion];
  const buttons = document.querySelectorAll('.quiz-opt-btn');
  buttons.forEach(b => b.disabled = true);

  const fbEl = document.getElementById('q-feedback');
  fbEl.classList.remove('hidden');

  if (selectedIdx === q.correct) {
    buttons[selectedIdx].classList.add('correct');
    fbEl.className = 'quiz-feedback correct-fb';
    fbEl.innerHTML = `<strong>Correct!</strong> ${q.explanation}`;
    quizScore++;
  } else {
    buttons[selectedIdx].classList.add('incorrect');
    buttons[q.correct].classList.add('correct');
    fbEl.className = 'quiz-feedback incorrect-fb';
    fbEl.innerHTML = `<strong>Incorrect.</strong> ${q.explanation}`;
  }

  const nextBtn = document.getElementById('q-next-btn');
  nextBtn.classList.remove('hidden');
  if (currentQuestion === quizData.length - 1) {
    nextBtn.innerText = "View Final Certification";
  }
}

function nextQuizQuestion() {
  currentQuestion++;
  if (currentQuestion < quizData.length) {
    loadQuestion();
  } else {
    showQuizResults();
  }
}

function showQuizResults() {
  document.getElementById('quiz-question-screen').classList.add('hidden');
  document.getElementById('quiz-results-screen').classList.remove('hidden');
  document.getElementById('final-score-num').innerText = quizScore;
}

function resetQuiz() {
  currentQuestion = 0;
  quizScore = 0;
  document.getElementById('quiz-question-screen').classList.remove('hidden');
  document.getElementById('quiz-results-screen').classList.add('hidden');
  loadQuestion();
}
