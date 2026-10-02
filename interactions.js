(function () {
    'use strict';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const header = document.querySelector('#storefront header');
    let ticking = false;

    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.type = 'button';
    backToTop.setAttribute('aria-label', 'Voltar ao topo');
    backToTop.title = 'Voltar ao topo';
    backToTop.textContent = '↑';
    document.body.appendChild(backToTop);

    // Move o brilho do hero com o cursor sem afetar celulares ou o desempenho.
    const pointerStorefront = document.querySelector('#storefront');
    const pointerDevice = window.matchMedia('(hover: hover) and (pointer: fine)');
    let pointerFrame = 0;
    if (pointerStorefront && pointerDevice.matches && !reducedMotion) {
        window.addEventListener('pointermove', event => {
            if (pointerFrame) return;
            pointerFrame = window.requestAnimationFrame(() => {
                const x = (event.clientX / Math.max(window.innerWidth, 1)) * 100;
                const y = (event.clientY / Math.max(window.innerHeight, 1)) * 100;
                pointerStorefront.style.setProperty('--pointer-x', `${x}%`);
                pointerStorefront.style.setProperty('--pointer-y', `${y}%`);
                pointerFrame = 0;
            });
        }, {passive: true});
    }

    const updateScrollUI = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
        progress.style.width = `${ratio * 100}%`;
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
        backToTop.classList.toggle('is-visible', window.scrollY > Math.max(360, window.innerHeight * .7));
        ticking = false;
    };

    const requestScrollUI = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateScrollUI);
            ticking = true;
        }
    };

    window.addEventListener('scroll', requestScrollUI, {passive: true});
    window.addEventListener('resize', requestScrollUI, {passive: true});
    backToTop.addEventListener('click', () => window.scrollTo({top: 0, behavior: reducedMotion ? 'auto' : 'smooth'}));

    const storefront = document.querySelector('#storefront');
    let revealObserver = null;
    const revealSelector = '.section, .hero-content, .promo, .benefit, .category, .product';

    const enableReveal = () => {
        if (!storefront || storefront.hidden || storefront.classList.contains('reveal-ready')) return;
        storefront.classList.add('reveal-ready');
        const revealTargets = storefront.querySelectorAll(revealSelector);
        revealTargets.forEach(target => target.classList.add('reveal-on-scroll'));

        if (reducedMotion || !('IntersectionObserver' in window)) {
            revealTargets.forEach(target => target.classList.add('is-visible'));
            return;
        }
        revealObserver = new IntersectionObserver((entries, instance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    instance.unobserve(entry.target);
                }
            });
        }, {rootMargin: '0px 0px -8% 0px', threshold: .08});
        revealTargets.forEach(target => revealObserver.observe(target));
    };

    // A tela de login começa visível e o storefront começa hidden. Aguarde a troca.
    if (storefront) {
        new MutationObserver(enableReveal).observe(storefront, {attributes: true, attributeFilter: ['hidden']});
        enableReveal();
    }

    updateScrollUI();
})();
