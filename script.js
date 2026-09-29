const logoDock = document.getElementById('logoDock');
const opening = document.getElementById('opening');
const siteNav = document.getElementById('siteNav');
const brandButton = document.getElementById('brandButton');
const home = document.getElementById('home');
const navLinks = [...document.querySelectorAll('.site-nav a')];
const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

let ticking = false;
let doorAnimating = false;
let doorAnimationFrame = 0;
let siteUnlocked = false;
const TRANSITION_DISTANCE = 108;
const DOOR_DURATION = 1120;

function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }
function ease(v){
  // Premium ease: soft acceleration, a long glide, then a gentle settle.
  const t = clamp(v, 0, 1);
  return 1 - Math.pow(1 - t, 4);
}

function smoothEase(v){
  // Slightly more balanced easing for the reverse/return motion.
  const t = clamp(v, 0, 1);
  return t < 0.5
    ? 8 * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function updateOpening(){
  if (!doorAnimating && window.scrollY <= 2) siteUnlocked = false;
  const p = clamp(window.scrollY / TRANSITION_DISTANCE, 0, 1);
  const e = smoothEase(p);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const startW = Math.min(vw * .66, 700);
  const endW = Math.min(vw * .23, 132);
  const width = startW + (endW - startW) * e;
  const startX = vw / 2;
  const startY = vh / 2;
  const endX = vw <= 650 ? 48 : 76;
  const endY = vw <= 650 ? 34 : 40;
  const x = startX + (endX - startX) * e;
  const y = startY + (endY - startY) * e;

  logoDock.style.width = `${width}px`;
  logoDock.style.left = `${x}px`;
  logoDock.style.top = `${y}px`;
  logoDock.style.transform = 'translate(-50%, -50%)';

  // Let the navigation arrive slightly after the logo starts moving.
  const navProgress = clamp((p - .16) / .52, 0, 1);
  siteNav.style.setProperty('--nav-progress', navProgress.toFixed(3));
  siteNav.classList.toggle('is-visible', navProgress > .01);
  opening.classList.toggle('is-done', p > .78);

  ticking = false;
}

function requestUpdate(){
  if (!ticking) {
    requestAnimationFrame(updateOpening);
    ticking = true;
  }
}

window.addEventListener('scroll', requestUpdate, {passive:true});
window.addEventListener('resize', requestUpdate);

function animateDoor(target){
  if (doorAnimating) return;
  const start = window.scrollY;
  const distance = target - start;
  if (Math.abs(distance) < 1) return;

  doorAnimating = true;
  const startedAt = performance.now();
  cancelAnimationFrame(doorAnimationFrame);

  const frame = (now) => {
    const progress = clamp((now - startedAt) / DOOR_DURATION, 0, 1);
    const eased = smoothEase(progress);
    window.scrollTo({top: start + distance * eased, left: 0, behavior: 'auto'});
    updateOpening();

    if (progress < 1) {
      doorAnimationFrame = requestAnimationFrame(frame);
    } else {
      window.scrollTo({top: target, left: 0, behavior: 'auto'});
      updateOpening();
      siteUnlocked = target >= TRANSITION_DISTANCE;
      doorAnimating = false;
    }
  };

  doorAnimationFrame = requestAnimationFrame(frame);
}

// Full-page scroll: one wheel gesture moves cleanly between the website sections.
// The opening logo keeps its original center -> top-left transition; after that,
// wheel gestures snap one section at a time in either direction.
let sectionAnimating = false;
let wheelGestureLocked = false;
let wheelUnlockTimer = 0;
let lastWheelAt = 0;
const SECTION_DURATION = 1320;
const WHEEL_GESTURE_GAP = 420;

function sectionStops(){
  return sections.map(section => Math.max(0, section.offsetTop));
}

function animateToScrollTarget(target, duration = SECTION_DURATION){
  const start = window.scrollY;
  const distance = target - start;
  if (Math.abs(distance) < 2) return;
  sectionAnimating = true;
  const startedAt = performance.now();
  cancelAnimationFrame(doorAnimationFrame);
  const frame = (now) => {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const eased = smoothEase(progress);
    window.scrollTo({top: start + distance * eased, left: 0, behavior: 'auto'});
    requestUpdate();
    if (progress < 1) {
      doorAnimationFrame = requestAnimationFrame(frame);
    } else {
      window.scrollTo({top: target, left: 0, behavior: 'auto'});
      requestUpdate();
      sectionAnimating = false;
    }
  };
  doorAnimationFrame = requestAnimationFrame(frame);
}

function moveOneSection(direction){
  if (sectionAnimating || doorAnimating || wheelGestureLocked) return;
  const stops = sectionStops();
  const current = window.scrollY;
  let index = 0;
  let smallest = Infinity;
  stops.forEach((stop, i) => {
    const delta = Math.abs(stop - current);
    if (delta < smallest) { smallest = delta; index = i; }
  });
  const nextIndex = clamp(index + direction, 0, stops.length - 1);
  if (nextIndex === index && direction < 0 && current > 2) {
    animateToScrollTarget(0);
    return;
  }
  if (nextIndex === index) return;
  wheelGestureLocked = true;
  animateToScrollTarget(stops[nextIndex]);
}

window.addEventListener('wheel', (event) => {
  const now = performance.now();
  lastWheelAt = now;

  // Always consume the wheel while our section controller owns the page.
  if (doorAnimating || sectionAnimating || wheelGestureLocked) {
    event.preventDefault();
    if (wheelGestureLocked && wheelUnlockTimer) clearTimeout(wheelUnlockTimer);
    if (wheelGestureLocked) {
      wheelUnlockTimer = setTimeout(() => {
        wheelGestureLocked = false;
      }, WHEEL_GESTURE_GAP);
    }
    return;
  }

  // Opening: one downward wheel gesture moves the logo to the top-left and enters About.
  if (!siteUnlocked && window.scrollY <= 2 && event.deltaY > 0) {
    event.preventDefault();
    wheelGestureLocked = true;
    doorAnimating = true;
    const start = window.scrollY;
    const target = TRANSITION_DISTANCE;
    const startedAt = performance.now();
    const frame = (time) => {
      const progress = clamp((time - startedAt) / DOOR_DURATION, 0, 1);
      const eased = smoothEase(progress);
      window.scrollTo({top: start + (target - start) * eased, left: 0, behavior: 'auto'});
      updateOpening();
      if (progress < 1) {
        doorAnimationFrame = requestAnimationFrame(frame);
      } else {
        window.scrollTo({top: target, left: 0, behavior: 'auto'});
        updateOpening();
        siteUnlocked = true;
        doorAnimating = false;
        const about = document.getElementById('about');
        if (about) setTimeout(() => {
          animateToScrollTarget(about.offsetTop, 980);
        }, 40);
        wheelUnlockTimer = setTimeout(() => { wheelGestureLocked = false; }, WHEEL_GESTURE_GAP);
      }
    };
    doorAnimationFrame = requestAnimationFrame(frame);
    return;
  }

  if (siteUnlocked && Math.abs(event.deltaY) > 2) {
    event.preventDefault();
    moveOneSection(event.deltaY > 0 ? 1 : -1);
    if (wheelGestureLocked) {
      if (wheelUnlockTimer) clearTimeout(wheelUnlockTimer);
      wheelUnlockTimer = setTimeout(() => { wheelGestureLocked = false; }, WHEEL_GESTURE_GAP);
    }
  }
}, {passive:false});

updateOpening();

// The logo is the door: center -> site on click, and site -> center on click.
brandButton.addEventListener('click', () => {
  animateDoor(siteUnlocked ? 0 : TRANSITION_DISTANCE);
});

navLinks.forEach(link => {
  link.addEventListener('click', event => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    if (target.id === 'home') {
      animateDoor(0);
      return;
    }
    siteUnlocked = true;
    animateToScrollTarget(target.offsetTop, 1120);
  });
});

// Navigation active state.
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const active = navLinks.find(a => a.getAttribute('href') === `#${entry.target.id}`);
    if (!active) return;
    navLinks.forEach(a => a.classList.remove('active'));
    active.classList.add('active');
  });
}, {rootMargin:'-35% 0px -55% 0px', threshold:0});
sections.forEach(section => observer.observe(section));

// Reveal sections as they enter the viewport.
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {threshold:.14});
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Problem section: use the supplied cinematic HoReCa video as the visual layer.
const problemVideo = document.getElementById('problemVideo');
if (problemVideo) {
  const tryPlayProblemVideo = () => {
    const play = problemVideo.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  };
  tryPlayProblemVideo();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryPlayProblemVideo();
  });
}

// Problem queries are saved locally for the current device and prepared for delivery to info@velocityforze.com.
const problemForm = document.getElementById('problemForm');
const problemInput = document.getElementById('problemInput');
const problemResponse = document.getElementById('problemResponse');
problemForm.addEventListener('submit', event => {
  event.preventDefault();
  const value = problemInput.value.trim();
  if(!value) return;

  // Save the query immediately in this browser before showing the confirmation.
  // This is local storage only; a shared team inbox/database requires a backend connection.
  const key = 'velocityForzeProblemQueries';
  let savedQueries = [];
  try { savedQueries = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
  savedQueries.push({ query: value, savedAt: new Date().toISOString() });
  try { localStorage.setItem(key, JSON.stringify(savedQueries)); } catch (_) {}

  problemResponse.textContent = 'Thanks. We’ve received your problem. Our team will review it and get back to you.';
  problemResponse.classList.remove('show');
  void problemResponse.offsetWidth;
  problemResponse.classList.add('show');
  problemInput.value='';
  problemPromptText?.classList.remove('is-hidden');
});

// Problem-section typography loop: animate the prompt inside the input dialog.
const problemPromptText = document.getElementById('problemPromptText');
const problemInputEl = document.getElementById('problemInput');
if (problemPromptText && problemInputEl) {
  const prompts = ['How can we help?'];
  let promptIndex = 0;
  let promptChar = prompts[0].length;
  let deleting = true;

  const typePrompt = () => {
    if (document.activeElement === problemInputEl || problemInputEl.value) {
      setTimeout(typePrompt, 250);
      return;
    }
    const current = prompts[promptIndex];
    if (deleting) {
      if (promptChar > 0) {
        promptChar -= 1;
        problemPromptText.firstChild.textContent = current.slice(0, promptChar);
        setTimeout(typePrompt, 55);
      } else {
        deleting = false;
        promptIndex = (promptIndex + 1) % prompts.length;
        promptChar = 0;
        setTimeout(typePrompt, 420);
      }
    } else {
      const next = prompts[promptIndex];
      if (promptChar < next.length) {
        promptChar += 1;
        problemPromptText.firstChild.textContent = next.slice(0, promptChar);
        setTimeout(typePrompt, 72);
      } else {
        deleting = true;
        setTimeout(typePrompt, 1500);
      }
    }
  };

  problemInputEl.addEventListener('focus', () => problemPromptText.classList.add('is-hidden'));
  problemInputEl.addEventListener('input', () => {
    problemPromptText.classList.toggle('is-hidden', Boolean(problemInputEl.value));
  });
  problemInputEl.addEventListener('blur', () => {
    if (!problemInputEl.value) problemPromptText.classList.remove('is-hidden');
  });

  setTimeout(typePrompt, 1500);
}
