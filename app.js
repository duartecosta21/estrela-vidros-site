'use strict';
(() => {
  const root = document.documentElement;
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionToggle = document.getElementById('motion-toggle');
  let manualReduction = false;
  let photoObserver;
  const photos = [...document.querySelectorAll('.project .image-button, .about-photo')];
  function reduceMotion() { return systemMotion.matches || manualReduction; }
  function applyMotion() {
    root.dataset.motion = reduceMotion() ? 'reduced' : 'full';
    motionToggle.hidden = false;
    motionToggle.disabled = systemMotion.matches;
    motionToggle.setAttribute('aria-pressed', String(reduceMotion()));
    motionToggle.textContent = systemMotion.matches ? 'Movimento reduzido pelo sistema' : manualReduction ? 'Ativar movimento' : 'Reduzir movimento';
    if (reduceMotion()) {
      photoObserver?.disconnect();
      photos.forEach(photo => photo.classList.add('photo-revealed'));
    }
  }
  applyMotion();
  motionToggle.addEventListener('click', () => { manualReduction = !manualReduction; applyMotion(); });
  systemMotion.addEventListener('change', applyMotion);
  if (!reduceMotion() && 'IntersectionObserver' in window) {
    photoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('photo-revealed');
        photoObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    photos.forEach(photo => {
      photoObserver.observe(photo);
      const finish = () => { photo.classList.add('photo-revealed'); photoObserver.unobserve(photo); };
      photo.addEventListener('focusin', finish);
      photo.addEventListener('pointerdown', finish);
    });
  }
  // Integração futura de medição: nenhum dado pessoal, tag ou envio externo.
  // Clique de contato não representa lead confirmado.
  function measure(name, detail = {}) {
    window.dispatchEvent(new CustomEvent('estrela:interaction', { detail: { name, ...detail } }));
  }
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('nav');
  function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
  document.querySelectorAll('[data-interest]').forEach(link => link.addEventListener('click', () => measure('quote_interest', { placement: link.dataset.interest })));
  document.querySelectorAll('.whatsapp-link').forEach(link => link.addEventListener('click', () => measure('whatsapp_click', { placement: link.id === 'prepared-link' ? 'prepared_message' : 'direct_contact' })));
  const dialog = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  let trigger;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-image]');
    if (!button) return;
    trigger = button;
    lightboxImage.src = button.dataset.image;
    lightboxImage.alt = button.dataset.caption;
    document.getElementById('lightbox-caption').textContent = button.dataset.caption;
    dialog.showModal();
    measure('image_view', { kind: button.dataset.kind || (button.classList.contains('source-link') ? 'testimonial' : 'project') });
  });
  document.getElementById('close-lightbox').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { lightboxImage.removeAttribute('src'); trigger?.focus(); });
  const gallery = document.getElementById('feedback-gallery');
  const status = document.getElementById('feedback-status');
  const previous = document.getElementById('feedback-prev');
  const next = document.getElementById('feedback-next');
  const feedbackSize = window.matchMedia('(max-width: 760px)');
  const order = [19, 4, 22, 20, 21, 18, 23, 26, 27, 12, 9, 8, 7, 6, 5, 13, 14, 15, 16, 17];
  let group = 'feedback';
  let offset = 0;
  function renderFeedback(direction = '') {
    gallery.dataset.direction = direction;
    gallery.querySelectorAll('video').forEach(video => video.pause());
    const items = (window.estrelaFeedback || []).filter(item => item.group === group);
    if (group === 'feedback') items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const size = feedbackSize.matches ? 1 : 3;
    offset = Math.min(offset, Math.max(0, Math.floor((items.length - 1) / size) * size));
    const visible = items.slice(offset, offset + size);
    gallery.replaceChildren(...visible.map(item => {
      const card = document.createElement('figure');
      card.className = 'feedback-card';
      if (item.video) {
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'none';
        video.poster = item.poster;
        video.src = item.video;
        video.setAttribute('aria-label', item.title);
        video.addEventListener('play', () => {
          gallery.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
          measure('feedback_video_play', { media_id: item.id });
        });
        card.append(video);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'feedback-image';
        button.dataset.image = item.poster;
        button.dataset.caption = item.title;
        button.dataset.kind = 'testimonial';
        button.setAttribute('aria-label', `Ampliar relato: ${item.title}`);
        const img = document.createElement('img');
        img.src = item.poster; img.alt = item.title;
        img.width = item.width; img.height = item.height;
        img.loading = 'lazy';
        const zoom = document.createElement('span');
        zoom.className = 'feedback-zoom'; zoom.textContent = 'Ampliar';
        button.append(img, zoom);
        card.append(button);
      }
      const caption = document.createElement('figcaption');
      const title = document.createElement('strong'); title.textContent = item.title;
      const format = document.createElement('span'); format.textContent = item.video ? 'Vídeo compartilhado pela Estrela' : 'Mensagem compartilhada pela Estrela';
      caption.append(title, format); card.append(caption);
      return card;
    }));
    status.textContent = `${offset + 1} a ${offset + visible.length} de ${items.length}`;
    previous.disabled = offset === 0;
    next.disabled = offset + size >= items.length;
  }
  document.querySelectorAll('[data-feedback-filter]').forEach(button => button.addEventListener('click', () => {
    group = button.dataset.feedbackFilter; offset = 0;
    document.querySelectorAll('[data-feedback-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    renderFeedback('next'); measure('feedback_filter', { group });
  }));
  previous.addEventListener('click', () => { offset = Math.max(0, offset - (feedbackSize.matches ? 1 : 3)); renderFeedback('previous'); measure('feedback_page', { group }); });
  next.addEventListener('click', () => { offset += feedbackSize.matches ? 1 : 3; renderFeedback('next'); measure('feedback_page', { group }); });
  feedbackSize.addEventListener('change', () => { offset = 0; renderFeedback(); });
  renderFeedback();
  const comparison = document.querySelector('[data-comparison]');
  if (comparison) {
    const range = comparison.querySelector('input[type="range"]');
    const frame = comparison.querySelector('.comparison-frame');
    const readout = comparison.querySelector('.comparison-value');
    function setComparison(value) {
      const position = Math.max(0, Math.min(100, Math.round(value)));
      range.value = String(position);
      frame.style.setProperty('--comparison-position', `${position}%`);
      range.setAttribute('aria-valuetext', `${position}% da imagem antes e ${100 - position}% da imagem depois`);
      readout.textContent = `${position}% antes / ${100 - position}% depois`;
    }
    setComparison(range.value);
    comparison.classList.add('comparison-ready');
    range.addEventListener('input', () => setComparison(range.value));
    range.addEventListener('change', () => measure('comparison_change'));
    let drag;
    // Pan vertical permanece do navegador; arraste horizontal usa a mesma posição do range.
    frame.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moving: false };
      if (event.pointerType !== 'touch') {
        range.focus({ preventScroll: true });
        const rect = frame.getBoundingClientRect();
        setComparison((event.clientX - rect.left) / rect.width * 100);
      }
      frame.setPointerCapture(event.pointerId);
    });
    frame.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const horizontal = Math.abs(event.clientX - drag.x);
      const vertical = Math.abs(event.clientY - drag.y);
      if (!drag.moving && horizontal < 6) return;
      if (!drag.moving && vertical > horizontal) { drag = null; return; }
      drag.moving = true;
      const rect = frame.getBoundingClientRect();
      setComparison((event.clientX - rect.left) / rect.width * 100);
    });
    function finishComparison(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (event.type === 'pointerup') {
        if (!drag.moving) {
          const rect = frame.getBoundingClientRect();
          setComparison((event.clientX - rect.left) / rect.width * 100);
        }
        measure('comparison_change');
      }
      drag = null;
    }
    frame.addEventListener('pointerup', finishComparison);
    frame.addEventListener('pointercancel', finishComparison);
    frame.addEventListener('lostpointercapture', () => { drag = null; });
    comparison.querySelectorAll('[data-comparison-value]').forEach(button => button.addEventListener('click', () => {
      setComparison(Number(button.dataset.comparisonValue));
      measure('comparison_change');
    }));
  }
  const form = document.getElementById('quote-form');
  const preview = document.getElementById('message-preview');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const city = String(data.get('city') || '').trim();
    if (!city) { const field = form.elements.city; field.setCustomValidity('Informe a cidade do projeto.'); field.reportValidity(); field.addEventListener('input', () => field.setCustomValidity(''), { once: true }); return; }
    const details = String(data.get('details') || '').trim();
    const message = `Olá! Vim pelo site da Estrela e gostaria de conversar sobre um orçamento.\n\nO que procuro: ${data.get('service')}\nCidade: ${city}\nEtapa do projeto: ${data.get('stage')}${details ? `\n\nMais informações: ${details}` : ''}`;
    document.getElementById('prepared-message').textContent = message;
    document.getElementById('prepared-link').href = `https://wa.me/5511953871057?text=${encodeURIComponent(message)}`;
    preview.hidden = false;
    measure('quote_prepared');
    preview.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'instant' : 'smooth' });
  });
  // Alterações exigem nova preparação, evitando envio de um pedido desatualizado.
  form.addEventListener('input', () => { preview.hidden = true; });
})();
