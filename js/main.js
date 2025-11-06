// Main JS: smooth scrolling, join form handling, games slider with autoplay, dots, arrows, modal, drag behavior, and site search
document.addEventListener('DOMContentLoaded', function () {
  // Set year in footer
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') return;
      if (href.startsWith('#')) {
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', href);
        }
      }
    });
  });

  // JOIN form submission (client-side only)
  var form = document.getElementById('join-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.name && form.name.value) ? form.name.value.trim() : '';
      var email = (form.email && form.email.value) ? form.email.value.trim() : '';
      var terms = document.getElementById('jm-terms') ? document.getElementById('jm-terms').checked : false;

      if (!name || !email || !terms) {
        alert('Please complete all required fields and accept the terms.');
        return;
      }

      // Replace with real backend integration when ready
      var successEl = document.getElementById('join-success');
      if (successEl) {
        successEl.hidden = false;
      }
      form.reset();
      setTimeout(function () { if (successEl) successEl.hidden = true; }, 8000);
    });
  }

  // ---- Games slider + autoplay + arrows + dots + modal ----
  (function initGamesSlider() {
    var slider = document.getElementById('games-slider');
    if (!slider) return;
    var track = document.getElementById('slides-track');
    var slides = Array.from(track.querySelectorAll('.slide'));
    var prevBtn = document.getElementById('slider-prev');
    var nextBtn = document.getElementById('slider-next');
    var dotsContainer = document.getElementById('slider-dots');

    // Create dots
    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = (i === 0) ? 'active' : '';
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.dataset.index = i;
      dotsContainer.appendChild(dot);
      dot.addEventListener('click', function () {
        scrollToSlide(i);
        resetAutoplay();
      });
    });

    function setActiveDot(index) {
      var dots = Array.from(dotsContainer.children);
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === index);
        d.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    // Programmatic scroll to slide index
    function scrollToSlide(index) {
      var slide = slides[index];
      if (!slide) return;
      var center = track.offsetWidth / 2;
      var targetLeft = slide.offsetLeft - center + (slide.offsetWidth / 2);
      track.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }

    // Arrow navigation
    if (prevBtn) prevBtn.addEventListener('click', function () { gotoPrevious(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { gotoNext(); resetAutoplay(); });

    function gotoNext() {
      var current = getClosestIndex();
      var next = (current + 1) % slides.length;
      scrollToSlide(next);
    }
    function gotoPrevious() {
      var current = getClosestIndex();
      var prev = (current - 1 + slides.length) % slides.length;
      scrollToSlide(prev);
    }

    // Drag-to-scroll (pointer) behavior
    var isDown = false;
    var startX = 0;
    var scrollLeft = 0;

    // IMPORTANT: do not start drag if the pointer is on a .btn-details (link)
    track.addEventListener('pointerdown', function (e) {
      if (e.target && e.target.closest && e.target.closest('.btn-details')) {
        // clicking a details link — don't start a drag / don't capture pointer here
        return;
      }
      isDown = true;
      track.classList.add('grabbing');
      startX = e.clientX;
      scrollLeft = track.scrollLeft;
      try {
        track.setPointerCapture(e.pointerId);
      } catch (err) {}
      pauseAutoplay();
    });

    track.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var x = e.clientX;
      var walk = x - startX;
      track.scrollLeft = scrollLeft - walk;
    });

    ['pointerup', 'pointercancel'].forEach(function (ev) {
      track.addEventListener(ev, function (e) {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('grabbing');
        try { track.releasePointerCapture(e.pointerId); } catch (err) {}
        setTimeout(snapToClosest, 100);
        resumeAutoplayAfterDelay();
      });
    });

    // Wheel -> horizontal scroll inside slider
    track.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        track.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // Determine closest slide index to center of track
    function getClosestIndex() {
      var center = track.scrollLeft + track.offsetWidth / 2;
      var best = null;
      slides.forEach(function (slide, i) {
        var slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        var diff = Math.abs(slideCenter - center);
        if (!best || diff < best.diff) best = { i: i, diff: diff };
      });
      return best ? best.i : 0;
    }

    // Snap helper + update dots
    function snapToClosest() {
      var index = getClosestIndex();
      scrollToSlide(index);
      setActiveDot(index);
    }

    // Update active dot on scroll (throttled)
    var scrollTimeout;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function () {
        var index = getClosestIndex();
        setActiveDot(index);
      }, 80);
    });

    // Keyboard navigation while slider focused
    if (slider) {
      slider.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { gotoNext(); resetAutoplay(); }
        else if (e.key === 'ArrowLeft') { gotoPrevious(); resetAutoplay(); }
      });
    }

    // ----- Autoplay -----
    var autoplayInterval = 4000; // 4s
    var autoplayTimer = null;
    var autoplayPaused = false;

    function startAutoplay() {
      if (autoplayTimer) return;
      autoplayTimer = setInterval(function () {
        if (autoplayPaused) return;
        gotoNext();
      }, autoplayInterval);
    }
    function stopAutoplay() { clearInterval(autoplayTimer); autoplayTimer = null; }
    function pauseAutoplay() { autoplayPaused = true; }
    function resumeAutoplay() { autoplayPaused = false; }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }
    function resumeAutoplayAfterDelay() { resumeAutoplay(); }

    slider.addEventListener('mouseenter', function () { pauseAutoplay(); });
    slider.addEventListener('mouseleave', function () { resumeAutoplay(); });
    slider.addEventListener('focusin', function () { pauseAutoplay(); });
    slider.addEventListener('focusout', function () { resumeAutoplay(); });

    startAutoplay();
    setActiveDot(0);

    // ----- Modal (expanded game details) -----
    var modal = document.getElementById('game-modal');
    var modalBackdrop = document.getElementById('modal-backdrop');
    var modalClose = document.getElementById('modal-close');
    var modalImage = document.getElementById('modal-image');
    var modalTitle = document.getElementById('modal-title');
    var modalDesc = document.getElementById('modal-desc');
    var modalPrev = document.getElementById('modal-prev');
    var modalNext = document.getElementById('modal-next');
    var modalDetails = document.getElementById('modal-details');
    var currentModalIndex = 0;

    // Open modal when the slide-inner is clicked or Enter pressed.
    slides.forEach(function (slide, index) {
      var inner = slide.querySelector('.slide-inner');
      var detailsLink = slide.querySelector('.btn-details');

      // Ensure details link won't bubble and won't trigger modal:
      if (detailsLink) {
        detailsLink.addEventListener('click', function (ev) {
          // Let the anchor navigate normally, but stop it bubbling to parent handlers
          ev.stopPropagation();
          // ensure default navigation occurs (do not call preventDefault)
        });
      }

      if (!inner) return;

      inner.addEventListener('click', function (e) {
        // If click originated on a details link, let navigation happen; do not open modal
        if (e.target && e.target.closest && e.target.closest('.btn-details')) return;
        openModal(index);
        pauseAutoplay();
      });

      inner.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          // if focused element is a link, let it handle Enter
          if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('btn-details')) return;
          e.preventDefault();
          openModal(index);
          pauseAutoplay();
        }
      });
    });

    function openModal(index) {
      var slide = slides[index];
      if (!slide) return;
      currentModalIndex = index;
      var img = slide.dataset.img || '';
      var title = slide.dataset.title || '';
      var desc = slide.dataset.desc || '';
      modalImage.src = img;
      modalImage.alt = title;
      modalTitle.textContent = title;
      modalDesc.textContent = desc;
      // set the modal details link to the game's page (if slide has a btn-details)
      var detailsLink = slide.querySelector('.btn-details');
      modalDetails.href = detailsLink ? detailsLink.href : '#';
      modalDetails.textContent = 'View details';
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      modalClose.focus();
    }

    function closeModal() {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      resumeAutoplay();
    }

    if (modalClose) modalClose.addEventListener('click', function () { closeModal(); });
    if (modalBackdrop) modalBackdrop.addEventListener('click', function () { closeModal(); });

    if (modalPrev) modalPrev.addEventListener('click', function () {
      currentModalIndex = (currentModalIndex - 1 + slides.length) % slides.length;
      openModal(currentModalIndex);
      scrollToSlide(currentModalIndex);
      resetAutoplay();
    });
    if (modalNext) modalNext.addEventListener('click', function () {
      currentModalIndex = (currentModalIndex + 1) % slides.length;
      openModal(currentModalIndex);
      scrollToSlide(currentModalIndex);
      resetAutoplay();
    });

    document.addEventListener('keydown', function (e) {
      if (modal && modal.getAttribute('aria-hidden') === 'false') {
        if (e.key === 'Escape') closeModal();
        else if (e.key === 'ArrowLeft') modalPrev && modalPrev.click();
        else if (e.key === 'ArrowRight') modalNext && modalNext.click();
      }
    });

  })();

  // ===== Site search functionality =====
  (function initSiteSearch() {
    var searchToggle = document.getElementById('search-toggle');
    var searchPanel = document.getElementById('site-search');
    var searchInput = document.getElementById('site-search-input');
    var searchClose = document.getElementById('site-search-close');
    var resultsEl = document.getElementById('site-search-results');

    // basic search index (can be expanded or fetched from JSON)
    var index = [
      { title: 'Dark Souls', href: 'games/darksouls.html', img: 'images/darksouls.jpg', desc: 'Gritty and punishing — a hallmark of the series.' },
      { title: 'Bloodborne', href: 'games/bloodborne.html', img: 'images/bloodborne.jpg', desc: 'Fast and brutal combat with gothic environments.' },
      { title: 'Elden Ring', href: 'games/eldenring.html', img: 'images/eldenring.jpg', desc: 'Open-world design and rich lore.' },
      { title: 'Sekiro', href: 'games/sekiro.html', img: 'images/sekiro.jpg', desc: 'Precision parrying and challenging encounters.' }
    ];

    function openSearch() {
      if (!searchPanel) return;
      searchPanel.setAttribute('aria-hidden', 'false');
      searchToggle.setAttribute('aria-expanded', 'true');
      if (searchInput) {
        searchInput.value = '';
        // Slight delay to ensure panel is visible before focusing (fixes some stacking/focus issues)
        setTimeout(function () { searchInput.focus(); }, 100);
      }
      renderResults(index); // show initial list
    }
    function closeSearch() {
      if (!searchPanel) return;
      searchPanel.setAttribute('aria-hidden', 'true');
      searchToggle.setAttribute('aria-expanded', 'false');
      if (resultsEl) resultsEl.innerHTML = '';
    }

    if (searchToggle) {
      searchToggle.addEventListener('click', function (ev) {
        // prevent the document click handler from immediately toggling things
        ev.stopPropagation();
        var hidden = searchPanel && searchPanel.getAttribute('aria-hidden') === 'true';
        if (hidden) openSearch(); else closeSearch();
      });
    }
    if (searchClose) {
      searchClose.addEventListener('click', function (ev) { ev.stopPropagation(); closeSearch(); });
    }

    // close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (searchPanel && searchPanel.getAttribute('aria-hidden') === 'false') closeSearch();
      }
    });

    // click outside to close (only when panel is open)
    document.addEventListener('click', function (e) {
      if (!searchPanel) return;
      var isOpen = searchPanel.getAttribute('aria-hidden') === 'false';
      if (!isOpen) return;
      if (!e.target.closest('.site-search-panel') && !e.target.closest('#search-toggle')) {
        closeSearch();
      }
    });

    // live filtering
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.trim().toLowerCase();
        if (!q) {
          renderResults(index);
          return;
        }
        var results = index.filter(function (item) {
          return item.title.toLowerCase().indexOf(q) !== -1 || item.desc.toLowerCase().indexOf(q) !== -1;
        });
        renderResults(results);
      });

      // Enter: go to first result if exists
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var first = resultsEl && resultsEl.querySelector('.site-search-result');
          if (first) {
            var href = first.getAttribute('data-href');
            if (href) {
              window.location.href = href;
            }
          }
        }
      });
    }

    function renderResults(items) {
      if (!resultsEl) return;
      resultsEl.innerHTML = '';
      if (!items || items.length === 0) {
        resultsEl.innerHTML = '<div class="site-search-empty">No results</div>';
        return;
      }
      items.forEach(function (it) {
        var a = document.createElement('a');
        a.className = 'site-search-result';
        a.href = it.href;
        a.setAttribute('role', 'option');
        a.setAttribute('data-href', it.href);

        var img = document.createElement('img');
        img.src = it.img;
        img.alt = it.title;
        a.appendChild(img);

        var txt = document.createElement('div');
        var strong = document.createElement('strong');
        strong.textContent = it.title;
        txt.appendChild(strong);
        var small = document.createElement('small');
        small.textContent = it.desc;
        txt.appendChild(small);

        a.appendChild(txt);

        // stop propagation so the slider doesn't start drag when clicking result
        a.addEventListener('click', function (ev) {
          // Let the anchor navigate normally, but ensure no slider drag interference
          ev.stopPropagation();
        });

        resultsEl.appendChild(a);
      });
    }
  })();

});