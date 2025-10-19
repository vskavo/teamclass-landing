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
   * Líneas de cursos TeamClass
   */
  const coursesData = [
    { 
      id: "c1", 
      name: "Responsabilidad Social, Diversidad e Inclusión", 
      image: "/wp-content/uploads/2025/10/Inclusion.jpg",
      description: "Promueve culturas organizacionales más justas, conscientes y sostenibles, con foco en la gestión responsable y la inclusión laboral.",
      example: "Programas de capacitación inclusivo"
    },
    { 
      id: "c2", 
      name: "Autocuidado y Bienestar Psicolaboral", 
      image: "/wp-content/uploads/2025/10/Bienestar.jpg",
      description: "Promueve el equilibrio emocional y la salud integral de los equipos, fomentando entornos laborales más humanos y sostenibles.",
      example: "Taller de risoterapia"
    },
    { 
      id: "c3", 
      name: "Branding Corporativo", 
      image: "/wp-content/uploads/2025/10/Branding.jpg",
      description: "Potencia la identidad, reputación y comunicación de marca desde una mirada estratégica y coherente con los valores de la organización.",
      example: "Uso de canva, presentaciones que cautivan"
    },
    { 
      id: "c4", 
      name: "Oficios", 
      image: "/wp-content/uploads/2025/10/Oficios.jpg",
      description: "Desarrolla competencias técnicas y operativas clave para distintos sectores productivos. Programa diseñado tanto para onboarding y proyectos sociales.",
      example: "Técnicas de Electricidad Básica"
    },
    { 
      id: "c5", 
      name: "Power Skills", 
      image: "/wp-content/uploads/2025/10/Power-skills.jpg",
      description: "Fortalece las habilidades de tu equipo a la medida, impulsando el liderazgo, comunicación efectiva y el trabajo colaborativo dentro de los equipos.",
      example: "Programa trabajo en equipo/ Outdoor"
    },
    { 
      id: "c6", 
      name: "Innovación y Tecnología", 
      image: "/wp-content/uploads/2025/10/Tecnologia-e-innovacion.jpg",
      description: "Fortalece las habilidades de tu equipo a la medida, impulsando el liderazgo, comunicación efectiva y el trabajo colaborativo dentro de los equipos.",
      example: "Programa trabajo en equipo/ Outdoor"
    },
    { 
      id: "c7", 
      name: "Consultoría", 
      image: "/wp-content/uploads/2025/10/Consultoria.jpg",
      description: "Entrega herramientas estratégicas y metodológicas para analizar, diseñar e implementar soluciones efectivas para el desarrollo organizacional de tu empresa.",
      example: "Elaboración de perfiles de cargo"
    },
    { 
      id: "c8", 
      name: "Idiomas", 
      image: "/wp-content/uploads/2025/10/Idiomas.jpg",
      description: "Teamclass en alianza con Busuu incorpora en sus programas formativos una metodología innovadora combinando clases vivenciales, inteligencia artificial y una plataforma que se adapta a tu medida.",
      example: "Chino / Portugués / Inglés"
    },
    { 
      id: "c9", 
      name: "Formación en Normativas", 
      image: "/wp-content/uploads/2025/10/Normativa.jpg",
      description: "Fortalece el cumplimiento y la seguridad laboral con programas orientados a la normativa vigente y buenas prácticas organizacionales.",
      example: "Buenas Prácticas de Manufactura (BPM)"
    }
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
    if (els.prizeBoxDisplay) {
      els.prizeBoxDisplay.textContent = label || "—";
    }
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
    
    // Update courses box in left column
    if (els.coursesBoxList) {
      els.coursesBoxList.innerHTML = "";
      if (names.length === 0) {
        const empty = el("p", "rt-courses-box-empty");
        empty.textContent = "No has seleccionado ningún curso";
        els.coursesBoxList.appendChild(empty);
      } else {
        names.forEach(name => {
          const item = el("p", "rt-courses-box-item");
          item.textContent = name;
          els.coursesBoxList.appendChild(item);
        });
      }
    }
    
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
      
      // Contenedor del título con botón +
      const titleContainer = el("div", "rt-card-title-container");
      
      const title = el("div", "rt-card-title");
      title.textContent = course.name;
      
      const addBtn = el("button", "rt-add-btn");
      addBtn.type = "button";
      addBtn.setAttribute("aria-label", `Agregar ${course.name}`);
      addBtn.innerHTML = "+";
      addBtn.dataset.courseName = course.name;
      
      // Actualizar estado visual si ya está seleccionado
      if (state.selectedCourses.has(course.name)) {
        addBtn.classList.add("rt-add-btn-selected");
        addBtn.innerHTML = "✓";
      }
      
      // Toggle selección
      addBtn.addEventListener("click", () => {
        const isSelected = state.selectedCourses.has(course.name);
        if (isSelected) {
          state.selectedCourses.delete(course.name);
          addBtn.classList.remove("rt-add-btn-selected");
          addBtn.innerHTML = "+";
        } else {
          state.selectedCourses.add(course.name);
          addBtn.classList.add("rt-add-btn-selected");
          addBtn.innerHTML = "✓";
        }
        updateCoursesSummary();
      });
      
      titleContainer.append(title, addBtn);
      
      const imgContainer = el("div", "rt-card-img-container");
      const img = el("img");
      img.alt = course.name;
      img.loading = "lazy";
      img.src = course.image;
      imgContainer.append(img);
      
      const body = el("div", "rt-card-body");
      
      // Botón Ver detalles
      const detailsBtn = el("button", "rt-details-btn");
      detailsBtn.type = "button";
      detailsBtn.textContent = "Ver detalles";
      
      // Sección de detalles (oculta por defecto)
      const detailsSection = el("div", "rt-details-section");
      detailsSection.style.display = "none";
      
      const detailsText = el("p", "rt-details-text");
      detailsText.textContent = course.description;
      
      const detailsExample = el("p", "rt-details-example");
      detailsExample.innerHTML = `<strong>Ej:</strong> ${course.example}`;
      
      detailsSection.append(detailsText, detailsExample);
      
      // Toggle acordeón
      detailsBtn.addEventListener("click", () => {
        const isOpen = detailsSection.style.display !== "none";
        detailsSection.style.display = isOpen ? "none" : "block";
        detailsBtn.textContent = isOpen ? "Ver detalles" : "Ocultar detalles";
        detailsBtn.classList.toggle("rt-details-btn-open", !isOpen);
      });
      
      body.append(detailsBtn, detailsSection);
      card.append(titleContainer, imgContainer, body);
      track.append(card);
    });

    // Navegación con flechas
    setupCarouselNavigation();
  }

  function setupCarouselNavigation() {
    const track = els.track;
    const prevBtn = $(".rt-prev");
    const nextBtn = $(".rt-next");
    
    let autoScrollInterval;
    let currentIndex = 0;
    
    function getCardWidth() {
      const firstCard = track.querySelector(".rt-card");
      if (!firstCard) return 0;
      const cardStyle = window.getComputedStyle(firstCard);
      return firstCard.offsetWidth + parseFloat(cardStyle.marginRight || 0);
    }
    
    function scrollToIndex(index) {
      const cardWidth = getCardWidth();
      const maxIndex = Math.max(0, coursesData.length - Math.floor(track.clientWidth / cardWidth));
      currentIndex = Math.max(0, Math.min(index, maxIndex));
      track.scrollTo({
        left: currentIndex * cardWidth,
        behavior: "smooth"
      });
    }
    
    function scrollNext() {
      const cardWidth = getCardWidth();
      const maxIndex = Math.max(0, coursesData.length - Math.floor(track.clientWidth / cardWidth));
      if (currentIndex >= maxIndex) {
        currentIndex = 0;
      } else {
        currentIndex++;
      }
      scrollToIndex(currentIndex);
    }
    
    function scrollPrev() {
      currentIndex--;
      if (currentIndex < 0) {
        currentIndex = Math.max(0, coursesData.length - Math.floor(track.clientWidth / getCardWidth()));
      }
      scrollToIndex(currentIndex);
    }
    
    // Botones de navegación
    prevBtn.addEventListener("click", () => {
      scrollPrev();
      resetAutoScroll();
    });
    
    nextBtn.addEventListener("click", () => {
      scrollNext();
      resetAutoScroll();
    });
    
    // Auto-scroll cada 5 segundos
    function startAutoScroll() {
      autoScrollInterval = setInterval(() => {
        scrollNext();
      }, 2000);
    }
    
    function resetAutoScroll() {
      clearInterval(autoScrollInterval);
      startAutoScroll();
    }
    
    // Pausar auto-scroll al hacer hover
    track.addEventListener("mouseenter", () => {
      clearInterval(autoScrollInterval);
    });
    
    track.addEventListener("mouseleave", () => {
      startAutoScroll();
    });
    
    // Iniciar auto-scroll
    startAutoScroll();
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
    // premio
    els.modalPrize.textContent = prizeText;
    // mes actual para la nota
    const month = new Date().toLocaleString("es-ES", { month: "long" });
    const monthSpan = document.getElementById("rt-modal-month");
    if (monthSpan) monthSpan.textContent = month.charAt(0).toUpperCase() + month.slice(1);

    // abrir modal
    els.modal.removeAttribute("hidden");
    els.modalClose.focus({ preventScroll: true });

    // confeti sencillo en canvas del modal
    const canvas = document.getElementById("rt-confetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let rafId;
    const colors = ["#e73ce6", "#c6df31", "#ffffff", "#4b1fb4"];
    const pieces = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * canvas.clientWidth,
      y: -20 - Math.random() * 200,
      r: 4 + Math.random() * 6,
      c: colors[Math.floor(Math.random() * colors.length)],
      vx: -1 + Math.random() * 2,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (-0.1 + Math.random() * 0.2)
    }));

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
    resize();

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y - p.r > canvas.height) {
          p.y = -20; p.x = Math.random() * canvas.width; p.vy = 2 + Math.random() * 3;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        ctx.restore();
      });
      rafId = requestAnimationFrame(tick);
    }
    tick();

    // detener confeti al cerrar modal
    const stop = () => { if (rafId) cancelAnimationFrame(rafId); };
    els.modalClose.addEventListener("click", stop, { once: true });
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
    const position = sanitizeText(els.position.value);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
    const errors = [];
    if (!name) errors.push("Nombre es obligatorio");
    if (!email || !emailOk) errors.push("Correo inválido");
    return { valid: errors.length === 0, errors, data: { name, email, company, phone, position } };
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
    els.prizeBoxDisplay = document.getElementById("rt-prize-box-display");
    els.coursesBoxList = document.getElementById("rt-courses-box-list");
    els.track = document.getElementById("rt-track");
    els.form = document.getElementById("rt-form");
    els.name = document.getElementById("rt-name");
    els.email = document.getElementById("rt-email");
    els.company = document.getElementById("rt-company");
    els.phone = document.getElementById("rt-phone");
    els.position = document.getElementById("rt-position");
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


