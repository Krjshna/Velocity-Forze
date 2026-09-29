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
    window.scrollTo(0, start + distance * eased);
    updateOpening();

    if (progress < 1) {
      doorAnimationFrame = requestAnimationFrame(frame);
    } else {
      window.scrollTo(0, target);
      updateOpening();
      siteUnlocked = target >= TRANSITION_DISTANCE;
      doorAnimating = false;
    }
  };

  doorAnimationFrame = requestAnimationFrame(frame);
}

// The first small wheel gesture opens the logo door. After that, wheel input is
// completely native so every section can be freely scrolled with the mouse.
window.addEventListener('wheel', (event) => {
  if (siteUnlocked) return;

  if (doorAnimating) {
    event.preventDefault();
    return;
  }

  if (window.scrollY <= 2 && event.deltaY > 0) {
    event.preventDefault();
    animateDoor(TRANSITION_DISTANCE);
  }
}, {passive:false});

updateOpening();

// The logo is the door: center -> site on click, and site -> center on click.
brandButton.addEventListener('click', () => {
  animateDoor(siteUnlocked ? 0 : TRANSITION_DISTANCE);
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

  const subject = encodeURIComponent('Velocity Forze — Problem query');
  const body = encodeURIComponent(`Problem query:
${value}

Submitted: ${new Date().toLocaleString()}`);
  const mailto = `mailto:info@velocityforze.com?subject=${subject}&body=${body}`;
  problemResponse.textContent = 'Saved on this device and prepared for info@velocityforze.com. Press Send in your email app to deliver it.';
  problemResponse.classList.remove('show');
  void problemResponse.offsetWidth;
  problemResponse.classList.add('show');
  problemInput.value='';
  window.location.href = mailto;
});

// Contact form: opens the visitor's mail client with a complete, ready-to-send message.
const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');
contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const name = String(data.get('name') || '').trim();
  const problem = String(data.get('problem') || '').trim();
  const message = String(data.get('message') || '').trim();
  if (!name || !problem || !message) return;

  const subject = encodeURIComponent(`Velocity Forze enquiry — ${problem}`);
  const body = encodeURIComponent(`Name: ${name}\nProblem: ${problem}\n\nMessage:\n${message}`);
  window.location.href = `mailto:info@velocityforze.com?subject=${subject}&body=${body}`;
  contactStatus.textContent = 'Your message is ready for info@velocityforze.com. Hit Send to deliver it.';
  contactStatus.classList.add('show');
});

// Problem-section typography loop: animate the prompt inside the input dialog.
const problemPromptText = document.getElementById('problemPromptText');
const problemInputEl = document.getElementById('problemInput');
if (problemPromptText && problemInputEl) {
  const prompts = ['Tell us first', 'How can we help you?'];
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

  setTimeout(typePrompt, 1500);
}
