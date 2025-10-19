(() => {
  "use strict";

  // =========================
  // Configuración editable
  // =========================
  const webhookUrl = (window && window.rtWebhookUrl) || "https://n8n.dataotec.com/webhook-test/d49b5d18-39c9-4bde-b58a-d3313919b0f1";

  /**
   * Premios y pesos (opcional). Si no se especifica weight, se asume 1.
   */
  const prizes = [
    { label: "Cápsula Formativa gratuita(*)" },
    { label: "10% descuento" },
    { label: "Merch GRATIS cursos Team Building" },
    { label: "Desayuno de asesoria" },
    { label: "3 cupos e-learning" },
    { label: "2x1 cursos e-learning(*)" }
  ];

  /**
   * Cursos de ejemplo. Reemplazar con contenido real (12–15 items)
   */
  const coursesData = [
    { id: "c1", name: "Liderazgo Ágil", image: "https://via.placeholder.com/480x320?text=Liderazgo", description: "Herramientas para liderar equipos adaptativos." },
    { id: "c2", name: "Comunicación Asertiva", image: "https://via.placeholder.com/480x320?text=Comunicacion", description: "Mejora la interacción y los acuerdos internos." },
    { id: "c3", name: "Trabajo en Equipo", image: "https://via.placeholder.com/480x320?text=Teamwork", description: "Fortalece la colaboración entre áreas." },
    { id: "c4", name: "Gestión del Cambio", image: "https://via.placeholder.com/480x320?text=Cambio", description: "Acompaña transformaciones de negocio." },
    { id: "c5", name: "Resolución de Conflictos", image: "https://via.placeholder.com/480x320?text=Conflictos", description: "Metodologías para acuerdos efectivos." },
    { id: "c6", name: "Creatividad e Innovación", image: "https://via.placeholder.com/480x320?text=Innovacion", description: "Fomenta ideas y mejora continua." },
    { id: "c7", name: "Gestión del Tiempo", image: "https://via.placeholder.com/480x320?text=Tiempo", description: "Planifica con foco y priorización." },
    { id: "c8", name: "Atención al Cliente", image: "https://via.placeholder.com/480x320?text=Cliente", description: "Experiencias memorables y fidelización." },
    { id: "c9", name: "Negociación Efectiva", image: "https://via.placeholder.com/480x320?text=Negociacion", description: "Crea valor y cierra acuerdos." },
    { id: "c10", name: "Excel para Negocios", image: "https://via.placeholder.com/480x320?text=Excel", description: "Análisis y reporting práctico." },
    { id: "c11", name: "Presentaciones Impactantes", image: "https://via.placeholder.com/480x320?text=Presentaciones", description: "Storytelling y visualización." },
    { id: "c12", name: "Mindfulness Laboral", image: "https://via.placeholder.com/480x320?text=Mindfulness", description: "Bienestar y enfoque en el trabajo." }
  ];

  const STORAGE = {
    HAS_SPUN: "rtHasSpun",
    PRIZE: "rtPrize",
    COURSES: "rtSelectedCourses"
  };

  const PALETTE = [
    "var(--rt-seg-a)",
    "var(--rt-seg-b)",
    "var(--rt-seg-c)"
  ];

  const state = {
    hasSpun: false,
    prize: "",
    spinning: false,
    segments: [], // { label, weight, from, to, center, color }
    selectedCourses: new Set()
  };

  const els = {};

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function el(tag, className) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

  function sanitizeText(s) {
    return String(s || "").replace(/[\u0000-\u001F\u007F<>]/g, "").trim().slice(0, 300);
  }

  function weightedPick(items) {
    const weights = items.map(p => (typeof p.weight === "number" && p.weight > 0 ? p.weight : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      if (r < weights[i]) return i;
      r -= weights[i];
    }
    return items.length - 1;
  }

  function buildSegments(prizesArr) {
    const weights = prizesArr.map(p => (typeof p.weight === "number" && p.weight > 0 ? p.weight : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    const segs = prizesArr.map((p, idx) => {
      const slice = (weights[idx] / total) * 360;
      const from = acc;
      const to = acc + slice;
      acc = to;
      const center = from + slice / 2;
      const color = PALETTE[idx % PALETTE.length];
      return { label: p.label, weight: weights[idx], from, to, center, color };
    });
    return segs;
  }

  function setWheelGradient(segs) {
    const parts = segs.map(s => `${s.color} ${s.from}deg ${s.to}deg`);
    els.wheel.style.background = `conic-gradient(${parts.join(", ")})`;
  }

  function renderWheelLabels(segs) {
    els.wheelLabels.innerHTML = "";
    const rect = els.wheel.getBoundingClientRect();
    const radius = rect.width / 2;
    segs.forEach(seg => {
      const holder = el("div", "rt-segment-label");
      holder.textContent = seg.label;
      // Posicionar el texto radialmente (perpendicular al centro, como rayos de rueda)
      const angle = seg.center; // Ángulo del segmento (diferente para cada segmento)
      const distance = radius * 0.55; // Ajusta este valor: menor = más cerca del centro, mayor = más cerca del borde
      // rotate(angle): mueve el punto al ángulo correcto del segmento
      // translate(0, -distance): desplaza hacia el borde
      // rotate(90): rota 90° para que quede perpendicular al radio (apuntando hacia el centro)
      // NO usamos -angle porque queremos que SIGA la orientación del radio, no que se cancele
      holder.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(0, -${distance}px) rotate(90deg)`;
      els.wheelLabels.appendChild(holder);
    });
  }

  function readStoredPrize() {
    try {
      const has = localStorage.getItem(STORAGE.HAS_SPUN) === "true";
      const prize = localStorage.getItem(STORAGE.PRIZE) || "";
      if (has && prize) {
        state.hasSpun = true;
        state.prize = prize;
      }
    } catch (_) { /* ignore */ }
  }

  function storePrize(label) {
    try {
      localStorage.setItem(STORAGE.HAS_SPUN, "true");
      localStorage.setItem(STORAGE.PRIZE, label);
    } catch (_) { /* ignore */ }
  }

  function updatePrizeSummary(label) {
    els.summaryPrize.textContent = label || "—";
    els.prizeInput.value = label || "";
  }

  function updateCoursesSummary() {
    const names = Array.from(state.selectedCourses);
    els.summaryCourses.innerHTML = "";
    names.forEach(name => {
      const chip = el("span", "rt-chip");
      chip.textContent = name;
      els.summaryCourses.appendChild(chip);
    });
    els.coursesInput.value = names.join(", ");
    try { localStorage.setItem(STORAGE.COURSES, JSON.stringify(names)); } catch (_) {}
  }

  function restoreSelectedCourses() {
    try {
      const raw = localStorage.getItem(STORAGE.COURSES);
      if (!raw) return;
      const names = JSON.parse(raw);
      if (Array.isArray(names)) {
        names.forEach(n => state.selectedCourses.add(String(n)));
      }
    } catch (_) { /* ignore */ }
  }

  function renderCarousel() {
    const track = els.track;
    track.innerHTML = "";
    coursesData.forEach(course => {
      const card = el("article", "rt-card");
      const img = el("img");
      img.alt = course.name;
      img.loading = "lazy";
      img.src = course.image;
      const body = el("div", "rt-card-body");
      const title = el("div", "rt-card-title");
      title.textContent = course.name;
      const desc = el("div", "rt-card-desc");
      desc.textContent = course.description;
      const actions = el("div", "rt-card-actions");
      const label = el("label");
      const check = el("input", "rt-check");
      check.type = "checkbox";
      check.name = "course";
      check.value = course.name;
      check.checked = state.selectedCourses.has(course.name);
      label.append(check);
      label.append(document.createTextNode(" Seleccionar"));
      check.addEventListener("change", () => {
        if (check.checked) state.selectedCourses.add(course.name);
        else state.selectedCourses.delete(course.name);
        updateCoursesSummary();
      });
      actions.append(label);
      body.append(title, desc, actions);
      card.append(img, body);
      track.append(card);
    });

    // Navegación
    const viewport = $(".rt-viewport");
    $(".rt-prev").addEventListener("click", () => {
      viewport.scrollBy({ left: -viewport.clientWidth, behavior: "smooth" });
    });
    $(".rt-next").addEventListener("click", () => {
      viewport.scrollBy({ left: viewport.clientWidth, behavior: "smooth" });
    });
  }

  function spinToSegment(segIdx) {
    const seg = state.segments[segIdx];
    if (!seg) return;
    state.spinning = true;
    els.spinBtn.setAttribute("disabled", "true");

    // Puntero triangular está a la izquierda apuntando hacia la ruleta
    // La punta del triángulo toca la ruleta en 180° (lado izquierdo)
    // Queremos que el centro del segmento quede alineado con la punta
    // Si el puntero parece estar debajo, ajustamos sumando 90° (lo que indicaría que está abajo en 270°)
    const pointerAngle = 270; // Ajusta este valor: 180=izquierda, 270=abajo, 0/360=arriba, 90=derecha
    const baseTurns = 5 + Math.floor(Math.random() * 3); // 5-7 vueltas
    const target = baseTurns * 360 + (pointerAngle - seg.center);

    // Aseguramos que cada giro parta desde el múltiplo de 360 actual para consistencia.
    const currentRotation = (state.currentRotation || 0) % 360;
    const normalize = target + (360 - currentRotation);
    state.currentRotation = normalize;

    // Disparar animación
    requestAnimationFrame(() => {
      els.wheel.style.transform = `rotate(${normalize}deg)`;
    });

    const onEnd = () => {
      els.wheel.removeEventListener("transitionend", onEnd);
      state.spinning = false;
      state.hasSpun = true;
      state.prize = seg.label;
      storePrize(seg.label);
      updatePrizeSummary(seg.label);
      showModal(seg.label);
    };
    els.wheel.addEventListener("transitionend", onEnd);
  }

  function onSpin() {
    if (state.hasSpun || state.spinning) return;
    const idx = weightedPick(state.segments);
    spinToSegment(idx);
  }

  function showModal(prizeText) {
    els.modalPrize.textContent = prizeText;
    els.modal.removeAttribute("hidden");
    els.modalClose.focus({ preventScroll: true });
  }

  function closeModal() {
    els.modal.setAttribute("hidden", "");
    els.spinBtn.focus({ preventScroll: true });
  }

  function validateForm() {
    const name = sanitizeText(els.name.value);
    const email = sanitizeText(els.email.value);
    const company = sanitizeText(els.company.value);
    const phone = sanitizeText(els.phone.value);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
    const errors = [];
    if (!name) errors.push("Nombre es obligatorio");
    if (!email || !emailOk) errors.push("Correo inválido");
    return { valid: errors.length === 0, errors, data: { name, email, company, phone } };
  }

  async function submitForm(ev) {
    ev.preventDefault();
    const { valid, errors, data } = validateForm();
    if (!valid) {
      setStatus(errors.join(" · "), true);
      return;
    }

    const payload = {
      formId: "rt-lead",
      prize: state.prize || "",
      courses: Array.from(state.selectedCourses),
      user: data,
      meta: {
        pageUrl: location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    try {
      els.submit.disabled = true;
      setStatus("Enviando…", false);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      setStatus("Gracias, hemos recibido tus datos.", false, true);
      // Limpiar campos visibles (mantener premio)
      els.form.reset();
      state.selectedCourses.clear();
      updateCoursesSummary();
    } catch (err) {
      setStatus("No se pudo enviar. Intenta nuevamente.", true);
    } finally {
      els.submit.disabled = false;
    }
  }

  function setStatus(text, isError = false, isOk = false) {
    els.status.textContent = text || "";
    els.status.style.color = isError ? "var(--rt-danger)" : (isOk ? "var(--rt-success)" : "inherit");
  }

  function initEls() {
    els.app = document.getElementById("rt-app");
    els.wheel = document.querySelector(".rt-wheel");
    els.wheelLabels = document.querySelector(".rt-wheel-labels");
    els.spinBtn = document.querySelector(".rt-spin-btn");
    els.summaryPrize = document.getElementById("rt-summary-prize");
    els.summaryCourses = document.getElementById("rt-summary-courses");
    els.prizeInput = document.getElementById("rt-prize-input");
    els.coursesInput = document.getElementById("rt-courses-input");
    els.track = document.getElementById("rt-track");
    els.form = document.getElementById("rt-form");
    els.name = document.getElementById("rt-name");
    els.email = document.getElementById("rt-email");
    els.company = document.getElementById("rt-company");
    els.phone = document.getElementById("rt-phone");
    els.submit = document.getElementById("rt-submit");
    els.status = document.getElementById("rt-status");
    els.modal = document.getElementById("rt-modal");
    els.modalPrize = document.getElementById("rt-modal-prize");
    els.modalClose = document.getElementById("rt-modal-close");
  }

  function initWheel() {
    state.segments = buildSegments(prizes);
    setWheelGradient(state.segments);
    renderWheelLabels(state.segments);
    if (state.hasSpun) {
      els.spinBtn.setAttribute("disabled", "true");
      updatePrizeSummary(state.prize);
      els.spinBtn.textContent = "Ya jugaste";
    }
  }

  function initCarouselAndForm() {
    restoreSelectedCourses();
    renderCarousel();
    updateCoursesSummary();
  }

  function bindEvents() {
    els.spinBtn.addEventListener("click", onSpin);
    els.form.addEventListener("submit", submitForm);
    els.modalClose.addEventListener("click", closeModal);
    els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });
    window.addEventListener("resize", () => renderWheelLabels(state.segments));
  }

  function boot() {
    initEls();
    readStoredPrize();
    initWheel();
    initCarouselAndForm();
    bindEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


