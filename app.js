'use strict';
(() => {
  const root = document.documentElement;
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionToggle = document.getElementById('motion-toggle');
  let manualReduction = false;
  let photoObserver;
  const photos = [...document.querySelectorAll('.project .image-button, .about-photo, .founder-photo, .project-film')];
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
  function pauseOtherVideos(active) {
    document.querySelectorAll('video').forEach(video => { if (video !== active) video.pause(); });
  }
  const portfolio = document.querySelector('.video-portfolio');
  if (portfolio) {
    const projects = [...portfolio.querySelectorAll('[data-project]')];
    const selector = portfolio.querySelector('.project-selector');
    const choices = [...selector.querySelectorAll('[data-project-choice]')];
    const announcement = selector.querySelector('.project-selection-status');
    function selectProject(name, trigger) {
      const selected = projects.find(project => project.dataset.project === name);
      if (!selected) return;
      projects.forEach(project => {
        const active = project === selected;
        if (!active) project.querySelector('video')?.pause();
        project.hidden = !active;
        project.classList.remove('project-enter');
      });
      selected.querySelector('.video-project-info').append(selector);
      choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectChoice === name)));
      if (trigger) {
        selected.classList.add('project-enter');
        announcement.textContent = `Exibindo ${selected.querySelector('h3').textContent}.`;
        trigger.focus({ preventScroll: true });
        measure('project_select', { project: name });
        if (window.matchMedia('(max-width: 760px)').matches) {
          selected.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        }
      }
    }
    choices.forEach(button => button.addEventListener('click', () => selectProject(button.dataset.projectChoice, button)));
    projects.forEach(project => {
      const video = project.querySelector('video');
      if (!video) return;
      video.addEventListener('play', () => {
        pauseOtherVideos(video);
        project.querySelector('.project-film').classList.add('film-playing');
        measure('project_video_play', { project: project.dataset.project });
      });
    });
    portfolio.querySelectorAll('.project-photo').forEach(carousel => {
      const slides = carousel.querySelector('.project-photo-slides');
      const photos = [...slides.querySelectorAll('[data-project-photo]')];
      const controls = carousel.querySelector('.project-photo-controls');
      const previous = controls.querySelector('[data-photo-prev]');
      const next = controls.querySelector('[data-photo-next]');
      const status = controls.querySelector('[data-photo-status]');
      let current = 0;
      function showPhoto(index, direction = '') {
        current = Math.max(0, Math.min(index, photos.length - 1));
        slides.dataset.direction = direction;
        photos.forEach((photo, i) => { photo.hidden = i !== current; });
        status.textContent = `Foto ${current + 1} de ${photos.length}`;
        previous.disabled = current === 0;
        next.disabled = current === photos.length - 1;
        if (direction) measure('project_photo_select', { project: carousel.closest('[data-project]').dataset.project, photo: current + 1 });
      }
      previous.addEventListener('click', () => showPhoto(current - 1, 'previous'));
      next.addEventListener('click', () => showPhoto(current + 1, 'next'));
      carousel.classList.add('photo-carousel-ready');
      controls.hidden = false;
      showPhoto(0);
    });
    portfolio.classList.add('portfolio-ready');
    selector.hidden = false;
    selectProject(projects[0].dataset.project);
  }
  const gallery = document.getElementById('feedback-gallery');
  const status = document.getElementById('feedback-status');
  const previous = document.getElementById('feedback-prev');
  const next = document.getElementById('feedback-next');
  const feedbackSize = window.matchMedia('(max-width: 760px)');
  let offset = 0;
  function renderFeedback(direction = '') {
    gallery.dataset.direction = direction;
    const items = window.estrelaFeedback || [];
    const size = feedbackSize.matches ? 1 : 3;
    offset = Math.min(offset, Math.max(0, Math.floor((items.length - 1) / size) * size));
    const visible = items.slice(offset, offset + size);
    gallery.replaceChildren(...visible.map(item => {
      const card = document.createElement('figure');
      card.className = 'feedback-card';
      const img = document.createElement('img');
      img.className = 'feedback-image';
      img.src = item.poster; img.alt = item.title;
      img.width = item.width; img.height = item.height;
      img.loading = 'lazy';
      card.append(img);
      const caption = document.createElement('figcaption');
      const title = document.createElement('strong'); title.textContent = item.title;
      const format = document.createElement('span'); format.textContent = item.excerpt ? 'Trecho de mensagem compartilhada pela Estrela' : 'Mensagem compartilhada pela Estrela';
      caption.append(title, format); card.append(caption);
      return card;
    }));
    status.textContent = `${offset + 1} a ${offset + visible.length} de ${items.length}`;
    previous.disabled = offset === 0;
    next.disabled = offset + size >= items.length;
  }
  previous.addEventListener('click', () => { offset = Math.max(0, offset - (feedbackSize.matches ? 1 : 3)); renderFeedback('previous'); measure('feedback_page'); });
  next.addEventListener('click', () => { offset += feedbackSize.matches ? 1 : 3; renderFeedback('next'); measure('feedback_page'); });
  feedbackSize.addEventListener('change', () => { offset = 0; renderFeedback(); });
  renderFeedback();
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
