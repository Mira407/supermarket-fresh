'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const MOBILE_BREAKPOINT = window.matchMedia('(max-width: 768px)');
    const getScrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    // 1. DYNAMICKÁ VÝŠKA HLAVIČKY PRO STICKY FILTRY
    const setHeaderHeight = () => {
        const header = document.querySelector('.main-header');
        if (header) {
            document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
        }
        
        const catalogFiltersEl = document.querySelector('.catalog-filters');
        if (catalogFiltersEl) {
            document.documentElement.style.setProperty('--filter-height', `${catalogFiltersEl.offsetHeight}px`);
        }
    };
    setHeaderHeight();

    // Používáme ResizeObserver místo window.resize – reaguje na změnu konkrétního prvku
    const header = document.querySelector('.main-header');
    if (header && typeof ResizeObserver !== 'undefined') {
        let roTimer;
        const ro = new ResizeObserver(() => {
            // Potlač všechny transitions a animace po dobu resize – zabrání bliknutí.
            document.body.classList.add('resize-animation-stopper');
            clearTimeout(roTimer);
            roTimer = setTimeout(() => {
                document.body.classList.remove('resize-animation-stopper');
            }, 150);
            setHeaderHeight();
        });
        ro.observe(header);
    } else {
        // Fallback pro prohlížeče bez ResizeObserver
        let resizeTimer;
        window.addEventListener('resize', () => {
            document.body.classList.add('resize-animation-stopper');
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.body.classList.remove('resize-animation-stopper');
                setHeaderHeight();
            }, 300);
        });
    }

    // 2. CHYTRÁ OTEVÍRACÍ DOBA S AUTOMATICKOU AKTUALIZACÍ
    let statusInterval = null;

    const updateOpeningStatus = () => {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (!statusDot || !statusText) return;

        const openHour = 7;
        const closeHour = 20;
    
        const { hours: pragueHours, minutes: pragueMinutes, day: pragueDayOfWeek } = (() => {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Prague',
                hour: 'numeric',
                minute: 'numeric',
                weekday: 'short',
                hour12: false
            });
            const parts = formatter.formatToParts(now);
            const weekdays = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0 };
            const weekdayStr = parts.find(p => p.type === 'weekday')?.value ?? '';
            return {
                hours: parseInt(parts.find(p => p.type === 'hour').value, 10),
                minutes: parseInt(parts.find(p => p.type === 'minute').value, 10),
                day: weekdays[weekdayStr] ?? new Date().getDay()
            };
        })();
        const currentMinutes = (pragueHours * 60) + pragueMinutes;
        const openTime = openHour * 60; 
        const closeTime = closeHour * 60;

        const isOpenNow = (currentMinutes >= openTime && currentMinutes < closeTime);

        if (isOpenNow) {
            statusDot.className = 'status-indicator is-open';
            statusText.textContent = `Prodejna Zlín: Dnes otevřeno do ${closeHour}:00`;
        } else {
            statusDot.className = 'status-indicator is-closed';
            const formattedOpenHour = String(openHour).padStart(2, '0');
            statusText.textContent = `Prodejna Zlín: Nyní zavřeno (Otevíráme v ${formattedOpenHour}:00)`;
        }

        const currentDayIndex = pragueDayOfWeek;
        const hoursTableRows = document.querySelectorAll('.hours-table tr');
        
        if (hoursTableRows.length > 0) {
            hoursTableRows.forEach(row => {
                row.classList.remove('current-day-open', 'current-day-closed');
            });
            const currentDayRow = document.getElementById(`day-${currentDayIndex}`);
            if (currentDayRow) {
                currentDayRow.classList.add(isOpenNow ? 'current-day-open' : 'current-day-closed');
            }
        }
    };

    updateOpeningStatus();
    statusInterval = setInterval(updateOpeningStatus, 30000);

    // visibilitychange listener je sloučen níže (viz sekce pekárny) pro případ,
    // že jsou aktivní oba intervaly zároveň (pekarna.html). Pokud pekárenský
    // interval neexistuje, sloučený listener jej jednoduše ignoruje.

    // 3. HLAVNÍ RESPONSIVNÍ MENU (Přístupnost, Focus Trap)
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.nav-link');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (menuToggle && mainNav) {
        const focusableElementsString = 'a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]';
        
        const closeMenu = () => {
            menuToggle.classList.remove('is-active');
            mainNav.classList.remove('is-active');
            
            const scrollY = document.body.style.top;
            document.body.classList.remove('no-scroll');
            document.body.style.top = '';
            if (scrollY) {
                window.scrollTo(0, -parseInt(scrollY, 10) || 0);
            }
            
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-label', 'Otevřít hlavní menu');
            menuToggle.focus();
        };

        const openMenu = () => {
            const scrollY = window.scrollY;
            document.body.style.top = `-${scrollY}px`;
            document.body.classList.add('no-scroll');
            
            menuToggle.classList.add('is-active');
            mainNav.classList.add('is-active');
            menuToggle.setAttribute('aria-expanded', 'true');
            menuToggle.setAttribute('aria-label', 'Zavřít hlavní menu');

            const firstLink = mainNav.querySelector('.nav-link');
            if (!firstLink) return;

            if (prefersReduced) {
                firstLink.focus();
            } else {
                // Menu animuje opacity – čekáme na konec fade-in přes opacity
                mainNav.addEventListener('transitionend', (e) => {
                    if (e.propertyName === 'opacity' && mainNav.classList.contains('is-active')) {
                        firstLink.focus();
                    }
                }, { once: true });
            }
        };

        menuToggle.addEventListener('click', () => {
            menuToggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
        });

        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('is-active') && !mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                closeMenu();
            }
        }, { passive: true });

        navLinks.forEach(link => {
            link.addEventListener('click', () => { if (mainNav.classList.contains('is-active')) closeMenu(); });
        });

        mainNav.addEventListener('keydown', (e) => {
            if (!mainNav.classList.contains('is-active')) return;
            if (e.key === 'Escape') return closeMenu();
            if (e.key === 'Tab') {
                const focusables = Array.from(mainNav.querySelectorAll(focusableElementsString));
                if (focusables.length === 0) return;
                
                const firstFocusable = focusables[0];
                const lastFocusable = focusables[focusables.length - 1];

                if (e.shiftKey && document.activeElement === firstFocusable) {
                    lastFocusable.focus(); e.preventDefault();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    firstFocusable.focus(); e.preventDefault();
                }
            }
        });

        // Při přechodu na desktop šířku automaticky zavřeme menu a odstraníme no-scroll.
        // Bez tohoto by zůstalo body.no-scroll aktivní při resize nad 768px.
        MOBILE_BREAKPOINT.addEventListener('change', (e) => {
            if (!e.matches && mainNav.classList.contains('is-active')) {
                closeMenu();
            }
        });
    }

    // 4. LETÁK: ANIMOVANÝ MOBILNÍ BURGER FILTR & LOGIKA
    const filterTrigger = document.querySelector('.filter-mobile-trigger');
    const filterWrapper = document.getElementById('filter-wrapper');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const flyerSections = document.querySelectorAll('.flyer-section');
    const catalogFilters = document.querySelector('.catalog-filters');

    // -------------------------------------------------------------------------
    // CHYBA č. 14: Roving tabindex helper
    // Implementuje WAI-ARIA roving tabindex pattern pro skupiny s role="radiogroup".
    // Aktivní prvek má tabindex="0", ostatní tabindex="-1".
    // Šipky vlevo/vpravo i nahoru/dolů přesouvají focus v rámci skupiny.
    // -------------------------------------------------------------------------
    const initRovingTabindex = (container) => {
        if (!container) return;
        const items = Array.from(container.querySelectorAll('[role="radio"]'));
        if (items.length === 0) return;

        const setActiveItem = (targetItem) => {
            items.forEach(item => {
                item.setAttribute('tabindex', item === targetItem ? '0' : '-1');
                item.setAttribute('aria-checked', item === targetItem ? 'true' : 'false');
                item.classList.toggle('is-active', item === targetItem);
            });
        };

        container.addEventListener('keydown', (e) => {
            const currentIndex = items.indexOf(document.activeElement);
            if (currentIndex === -1) return;

            let nextIndex;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % items.length;
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                nextIndex = (currentIndex - 1 + items.length) % items.length;
                e.preventDefault();
            } else if (e.key === 'Home') {
                nextIndex = 0;
                e.preventDefault();
            } else if (e.key === 'End') {
                nextIndex = items.length - 1;
                e.preventDefault();
            } else {
                return;
            }

            setActiveItem(items[nextIndex]);
            items[nextIndex].focus();
            items[nextIndex].click(); // Spustí filtraci
        });
    };

    // Inicializuj roving tabindex pro leták a kariéru
    initRovingTabindex(document.getElementById('filter-buttons'));
    initRovingTabindex(document.querySelector('.category-nav[role="radiogroup"]'));

    if (filterTrigger && filterWrapper) {
        filterTrigger.addEventListener('click', () => {
            const isExpanded = filterTrigger.getAttribute('aria-expanded') === 'true';
            filterTrigger.setAttribute('aria-expanded', !isExpanded);
            filterWrapper.classList.toggle('is-open');
        });

        document.addEventListener('click', (e) => {
            if (MOBILE_BREAKPOINT.matches && 
                filterWrapper.classList.contains('is-open') && 
                !filterWrapper.contains(e.target) && 
                !filterTrigger.contains(e.target)) {
                filterWrapper.classList.remove('is-open');
                filterTrigger.setAttribute('aria-expanded', 'false');
                filterTrigger.focus();
            }
        }, { passive: true });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterValue = btn.getAttribute('data-filter');

                filterBtns.forEach(b => {
                    b.classList.remove('is-active');
                    b.setAttribute('tabindex', '-1');
                    if (b.getAttribute('role') === 'radio') {
                        b.setAttribute('aria-checked', 'false');
                    } else {
                        b.setAttribute('aria-pressed', 'false');
                    }
                });
                btn.classList.add('is-active');
                btn.setAttribute('tabindex', '0');
                if (btn.getAttribute('role') === 'radio') {
                    btn.setAttribute('aria-checked', 'true');
                } else {
                    btn.setAttribute('aria-pressed', 'true');
                }

                if (MOBILE_BREAKPOINT.matches) {
                    filterWrapper.classList.remove('is-open');
                    filterTrigger.setAttribute('aria-expanded', 'false');
                    filterTrigger.focus();
                }

                flyerSections.forEach(section => {
                    const shouldHide = !(filterValue === 'all' || section.id === `category-${filterValue}`);
                    section.classList.toggle('is-hidden', shouldHide);
                });

                let targetEl = catalogFilters;
                if (filterValue !== 'all') {
                    targetEl = document.getElementById(`category-${filterValue}`);
                }

                if (targetEl) {
                    const header = document.querySelector('.main-header');
                    const headerHeight = header ? header.offsetHeight : 70;
                    const filterHeight = MOBILE_BREAKPOINT.matches ? (catalogFilters.offsetHeight || 50) : 0;
                    
                    const targetScrollPosition = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - filterHeight - 15;

                    window.scrollTo({
                        top: targetScrollPosition,
                        behavior: getScrollBehavior()
                    });
                }

                flyerSections.forEach(section => {
                    if (filterValue === 'all' || section.id === `category-${filterValue}`) {
                        section.classList.add('is-animating');
                        requestAnimationFrame(() => section.classList.remove('is-animating'));
                    }
                });
            });
        });
    }

    // 5. KARIÉRA: High-end filtrace pozic s Empty State logikou
    const careerCategoryBtns = document.querySelectorAll('.category-btn');
    const careerJobCards = document.querySelectorAll('.job-card');
    const noJobsMessage = document.getElementById('no-jobs-message');

    if (careerCategoryBtns.length > 0 && careerJobCards.length > 0) {
        careerCategoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                careerCategoryBtns.forEach(b => {
                    b.classList.remove('is-active');
                    b.setAttribute('tabindex', '-1');
                    if (b.getAttribute('role') === 'radio') {
                        b.setAttribute('aria-checked', 'false');
                    } else {
                        b.setAttribute('aria-pressed', 'false');
                    }
                });
                btn.classList.add('is-active');
                btn.setAttribute('tabindex', '0');
                if (btn.getAttribute('role') === 'radio') {
                    btn.setAttribute('aria-checked', 'true');
                } else {
                    btn.setAttribute('aria-pressed', 'true');
                }
                
                const filterValue = btn.dataset.filter;
                let visibleCount = 0;
                
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                careerJobCards.forEach(card => {
                    const badge = card.querySelector('.job-badge');
                    const department = badge ? badge.dataset.department : '';
                    const shouldShow = filterValue === 'all' || department === filterValue;
                    card.classList.toggle('is-hidden', !shouldShow);
                    if (shouldShow) {
                        if (!prefersReducedMotion) {
                            card.style.animation = 'none';
                            void card.offsetHeight;
                            card.style.animation = '';
                        }
                        visibleCount++;
                    }
                });

                if (noJobsMessage) {
                    noJobsMessage.classList.toggle('is-hidden', visibleCount !== 0);
                    if (visibleCount === 0 && !prefersReducedMotion) {
                        noJobsMessage.style.animation = 'none';
                        void noJobsMessage.offsetHeight;
                        noJobsMessage.style.animation = '';
                    }
                }
            });
        });
    }
    
    // 6. UNIVERZÁLNÍ TABS LOGIKA
    // -------------------------------------------------------------------------
    // OPRAVA: Původní kód byl navázán POUZE na #bakery-tablist.
    // Tato nová verze detekuje všechny tablisty na stránce pomocí obecného
    // selektoru [role="tablist"], takže funguje na pekarna.html,
    // ovoce-zelenina.html i reznictvi.html zároveň – bez nutnosti
    // znát konkrétní ID tablistu.
    // -------------------------------------------------------------------------

    const allTablists = document.querySelectorAll('[role="tablist"]');
    const scrollHint = document.querySelector('.scroll-hint');
    const scrollDots = document.querySelectorAll('.scroll-hint-dot');

    allTablists.forEach(tablist => {
        const tabs = tablist.querySelectorAll('[role="tab"]');
        // Panely jsou sourozenci tablistu (nebo jeho rodičovského wrapperu),
        // proto hledáme pomocí aria-controls, nikoli globálním selektorem.
        
        const getPanels = () => {
            return Array.from(tabs).map(tab => {
                const panelId = tab.getAttribute('aria-controls');
                return panelId ? document.getElementById(panelId) : null;
            }).filter(Boolean);
        };

        const switchTab = (selectedTab) => {
            const panels = getPanels();

            tabs.forEach(t => {
                t.setAttribute('aria-selected', 'false');
                t.setAttribute('tabindex', '-1');
            });

            panels.forEach(p => {
                p.classList.remove('is-active');
            });

            selectedTab.setAttribute('aria-selected', 'true');
            selectedTab.removeAttribute('tabindex');

            const activePanelId = selectedTab.getAttribute('aria-controls');
            const activePanel = document.getElementById(activePanelId);
            if (activePanel) {
                activePanel.classList.add('is-active');

                // Scroll tablistu tak, aby byl aktivní tab vycentrován
                const containerWidth = tablist.offsetWidth;
                const tabOffsetLeft = selectedTab.offsetLeft;
                const tabWidth = selectedTab.offsetWidth;

                tablist.scrollTo({
                    left: tabOffsetLeft - (containerWidth / 2) + (tabWidth / 2),
                    behavior: getScrollBehavior()
                });
            }
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab);
            });

            tab.addEventListener('keydown', (e) => {
                const index = Array.from(tabs).indexOf(tab);
                let nextIndex;

                if (e.key === 'ArrowRight') {
                    nextIndex = (index + 1) % tabs.length;
                    tabs[nextIndex].focus();
                    switchTab(tabs[nextIndex]);
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft') {
                    nextIndex = (index - 1 + tabs.length) % tabs.length;
                    tabs[nextIndex].focus();
                    switchTab(tabs[nextIndex]);
                    e.preventDefault();
                }
            });
        });
    });

    // Scroll-overflow detekce: fade-masky na wrapperu + scroll-hint tečky
    // Funguje pro každý tablist na stránce samostatně
    const primaryTablist = document.querySelector('[role="tablist"]');

    allTablists.forEach(tablist => {
        const wrapper = tablist.closest('.tabs-wrapper');

        const updateOverflow = () => {
            const hasOverflow = tablist.scrollWidth > tablist.clientWidth + 2;
            const atStart     = tablist.scrollLeft < 4;
            const atEnd       = tablist.scrollLeft >= tablist.scrollWidth - tablist.clientWidth - 4;

            if (wrapper) {
                wrapper.classList.toggle('has-overflow-right', hasOverflow);
                wrapper.classList.toggle('at-start', hasOverflow && atStart);
                wrapper.classList.toggle('at-end',   hasOverflow && atEnd);
            }

            // Scroll-hint tečky jen pro první tablist
            if (tablist === primaryTablist && scrollHint) {
                scrollHint.classList.toggle('is-visible', hasOverflow);
                if (hasOverflow && scrollDots.length > 0) {
                    const scrollableWidth = tablist.scrollWidth - tablist.clientWidth;
                    const progress  = scrollableWidth > 0 ? tablist.scrollLeft / scrollableWidth : 0;
                    const dotIndex  = Math.round(progress * (scrollDots.length - 1));
                    scrollDots.forEach((dot, i) => dot.classList.toggle('is-active', i === dotIndex));
                }
            }
        };

        tablist.addEventListener('scroll', updateOverflow, { passive: true });

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(updateOverflow).observe(tablist);
        } else {
            window.addEventListener('resize', updateOverflow);
        }

        updateOverflow();
    });

    // 6b. HARMONOGRAM PEČENÍ (zůstává beze změny, funguje na základě tříd)
    let bakeryScheduleInterval = null;

    const updateBakingSchedule = () => {
        const { hours: bakeryHours, minutes: bakeryMinutes } = (() => {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Prague',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            });
            const parts = formatter.formatToParts(now);
            return {
                hours: parseInt(parts.find(p => p.type === 'hour').value, 10),
                minutes: parseInt(parts.find(p => p.type === 'minute').value, 10)
            };
        })();
        const currentMinutes = (bakeryHours * 60) + bakeryMinutes;

        const scheduleCards = document.querySelectorAll('.schedule-card');
        if (scheduleCards.length === 0) return;

        scheduleCards.forEach(card => {
            card.classList.remove('is-active');
            const startStr = card.getAttribute('data-start');
            const endStr = card.getAttribute('data-end');

            if (startStr && endStr) {
                const [startH, startM] = startStr.split(':').map(Number);
                const [endH, endM] = endStr.split(':').map(Number);

                const startMinutes = (startH * 60) + startM;
                const endMinutes = (endH * 60) + endM;

                if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                    card.classList.add('is-active');
                }
            }
        });
    };

    const scheduleCards = document.querySelectorAll('.schedule-card');
    if (scheduleCards.length > 0) {
        updateBakingSchedule();
        bakeryScheduleInterval = setInterval(updateBakingSchedule, 30000);
    }

    // NÁLEZ #15 – Sloučený visibilitychange listener spravuje oba intervaly
    // (statusInterval i bakeryScheduleInterval) najednou. Na stránkách bez
    // pekárenského schedulu je bakeryScheduleInterval null a podmínka ho tiše přeskočí.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (statusInterval)         clearInterval(statusInterval);
            if (bakeryScheduleInterval) clearInterval(bakeryScheduleInterval);
        } else {
            clearInterval(statusInterval);
            if (bakeryScheduleInterval) clearInterval(bakeryScheduleInterval);
            updateOpeningStatus();
            updateBakingSchedule();
            statusInterval         = setInterval(updateOpeningStatus, 30000);
            if (document.querySelector('.schedule-card')) {
                bakeryScheduleInterval = setInterval(updateBakingSchedule, 30000);
            }
        }
    });

    // 7. OBECNÁ LOGIKA VALIDACE FORMULÁŘŮ
    const applyValidation = (formElement, isCareerForm = false) => {
        if (!formElement) return;
        
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;
            let firstInvalidField = null;
            
            const honeypotField = formElement.querySelector('input[name="_honeypot"]');
            if (honeypotField && honeypotField.value !== "") return;

            // BUG #1 + #9 FIX: Používáme dva oddělené statické live-regiony.
            // Specifikace WAI-ARIA zakazuje měnit aria-live za běhu – proto existují
            // dva regiony (#form-success s aria-live="polite", #form-error s aria-live="assertive"),
            // které jsou definovány staticky v HTML.
            const successRegion = formElement.querySelector('.form-status-success, #form-success');
            const errorRegion   = formElement.querySelector('.form-status-error,   #form-error');

            const setError = (field, message) => {
                field.classList.add('field-error');
                const errorSpan = document.getElementById(`${field.id}-error`);
                if (errorSpan) errorSpan.textContent = message;
                isValid = false;
                if (!firstInvalidField) firstInvalidField = field;
            };

            const clearError = (field) => {
                field.classList.remove('field-error');
                const errorSpan = document.getElementById(`${field.id}-error`);
                if(errorSpan) errorSpan.textContent = '';
            };

            const emailField = formElement.querySelector('input[type="email"]');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (emailField) {
                if (!emailField.value.trim()) {
                    setError(emailField, 'Prosím zadejte váš e-mail.');
                } else if (!emailRegex.test(emailField.value.trim())) {
                    setError(emailField, 'Zadejte e-mail v platném formátu.');
                } else {
                    clearError(emailField);
                }
            }

            const nameField = formElement.querySelector('input[autocomplete="name"]') || formElement.querySelector('input[name="fullname"]') || formElement.querySelector('input[name="name"]');
            if (nameField) {
                if (!nameField.value.trim()) setError(nameField, 'Prosím zadejte vaše jméno.');
                else clearError(nameField);
            }

            const messageField = formElement.querySelector('textarea[name="message"]');
            if (messageField) {
                if (!isCareerForm && !messageField.value.trim()) {
                    setError(messageField, 'Prosím napište zprávu.');
                } else {
                    clearError(messageField);
                }
            }
            
            if (!isCareerForm) {
                const subjectField = formElement.querySelector('select[name="subject"]');
                if (subjectField) {
                    if (!subjectField.value) setError(subjectField, 'Prosím vyberte předmět zprávy.');
                    else clearError(subjectField);
                }
                const gdprField = formElement.querySelector('input[name="gdpr"]');
                if (gdprField) {
                    if (!gdprField.checked) setError(gdprField, 'Pro odeslání zprávy je nutný souhlas s GDPR.');
                    else clearError(gdprField);
                }
            }
            
            const phoneField = formElement.querySelector('input[type="tel"]');
            const phoneRegex = /^(\+420|\+421|00420|00421)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}$/;
            if (phoneField) {
                if (phoneField.required && !phoneField.value.trim()) {
                    setError(phoneField, 'Prosím zadejte telefonní číslo.');
                } else if (phoneField.value.trim() && !phoneRegex.test(phoneField.value.trim().replace(/\s/g, ''))) {
                    setError(phoneField, 'Zadejte číslo v platném formátu (např. +420 777 123 456).');
                } else {
                    clearError(phoneField);
                }
            }
            
            if (isCareerForm) {
                const positionField = formElement.querySelector('select[name="position"]');
                if (positionField) {
                    if (!positionField.value) setError(positionField, 'Prosím vyberte pracovní pozici.');
                    else clearError(positionField);
                }
                
                const cvFileField = formElement.querySelector('input[type="file"]');
                if (cvFileField) {
                    if (cvFileField.files.length === 0) setError(cvFileField, 'Prosím nahrajte váš životopis.');
                    else clearError(cvFileField);
                }
                
                const gdprCareerField = formElement.querySelector('input[name="gdpr"]');
                if (gdprCareerField) {
                    if (!gdprCareerField.checked) setError(gdprCareerField, 'Pro odeslání je nutný souhlas s GDPR.');
                    else clearError(gdprCareerField);
                }
            }

            if (isValid) {
                // Vyčistíme chybový region a zobrazíme úspěch
                if (errorRegion) errorRegion.textContent = '';
                
                const successMsg = isCareerForm 
                    ? 'Děkujeme! Vaše přihláška byla odeslána. Ozveme se vám do 2 pracovních dnů.'
                    : 'Děkujeme, vaše zpráva byla úspěšně odeslána.';
                
                if (successRegion) {
                    successRegion.textContent = successMsg;
                    successRegion.setAttribute('tabindex', '-1');
                    successRegion.focus();
                }
                
                setTimeout(() => {
                    formElement.reset();
                    if (isCareerForm) {
                        const fileInput = formElement.querySelector('input[type="file"]');
                        if (fileInput) fileInput.value = '';
                    }
                }, 2500);
                
                setTimeout(() => { 
                    if (successRegion) {
                        successRegion.textContent = ''; 
                        successRegion.removeAttribute('tabindex');
                    }
                }, 6000);
            } else {
                // Vyčistíme úspěšný region a zobrazíme chybu
                if (successRegion) successRegion.textContent = '';
                
                if (errorRegion) {
                    errorRegion.textContent = 'Prosím, zkontrolujte a opravte chyby ve formuláři.';
                }
                
                if (firstInvalidField) {
                    firstInvalidField.focus();
                } else if (errorRegion) {
                    errorRegion.setAttribute('tabindex', '-1');
                    errorRegion.focus();
                }
            }
        });
    };

    applyValidation(document.getElementById('contact-form'), false);
    applyValidation(document.getElementById('career-form'), true);

    // 8. SCROLL TO TOP FUNKCIONALITA
    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                scrollToTopBtn.classList.add('is-visible');
            } else {
                scrollToTopBtn.classList.remove('is-visible');
            }
        }, { passive: true });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: getScrollBehavior() });
        });
    }

    // 9. FILTR ALERGENŮ – pekarna.html
    // -------------------------------------------------------------------------
    // Logika: uživatel vybere alergeny k VYLOUČENÍ. Produkt, jehož data-allergens
    // obsahuje alespoň jeden ze zaškrtnutých alergenů, dostane třídu allergen-hidden
    // a je skryt. Pokud jsou v daném tabpanelu všechny produkty skryty, zobrazí se
    // empty-state zpráva. Filtr funguje cross-tab – filtruje všechny panely najednou.
    // NÁLEZ #16 – Guard clause je nyní uvnitř funkce initAllergenFilter(), nikoli
    // v globálním DOMContentLoaded scopu, aby předčasný return neblokoval žádný
    // následující kód v callbacku.
    // -------------------------------------------------------------------------

    const initAllergenFilter = () => {
        const allergenCheckboxes = document.querySelectorAll('.allergen-checkbox');
        if (allergenCheckboxes.length === 0) return; // Spustit jen na stránce s filtrem

        const allergenResetBtn = document.getElementById('allergen-reset-btn');
        const allergenSummary  = document.getElementById('allergen-active-summary');
        const allergenNames = {
            '1':  'Lepek', '2': 'Korýši', '3': 'Vejce', '4': 'Ryby',
            '5':  'Arašídy', '6': 'Sója', '7': 'Mléko', '8': 'Ořechy',
            '9':  'Celer', '10': 'Hořčice', '11': 'Sezam', '12': 'SO₂',
            '13': 'Vlčí bob', '14': 'Měkkýši'
        };

        /**
         * Vrátí Set aktuálně zaškrtnutých čísel alergenů.
         */
        const getActiveAllergens = () => {
            const active = new Set();
            allergenCheckboxes.forEach(cb => { if (cb.checked) active.add(cb.value); });
            return active;
        };

        /**
         * Aplikuje filtr: skryje karty obsahující vyloučený alergen,
         * zobrazí/skryje empty-state pro každý panel.
         */
        const applyAllergenFilter = () => {
            const active = getActiveAllergens();

            // Aktualizuj resetovací tlačítko
            if (allergenResetBtn) {
                if (active.size > 0) {
                    allergenResetBtn.removeAttribute('hidden');
                } else {
                    allergenResetBtn.setAttribute('hidden', '');
                }
            }

            // Aktualizuj souhrn aktivních filtrů
            if (allergenSummary) {
                if (active.size > 0) {
                    const names = Array.from(active).map(n => `${n} – ${allergenNames[n] || n}`).join(', ');
                    allergenSummary.textContent = `Vyloučeny alergeny: ${names}`;
                } else {
                    allergenSummary.textContent = '';
                }
            }

            // Filtruj produktové karty
            const allCards = document.querySelectorAll('.product-card[data-allergens]');
            allCards.forEach(card => {
                if (active.size === 0) {
                    card.classList.remove('allergen-hidden');
                    return;
                }
                const cardAllergens = card.getAttribute('data-allergens')
                    .split(',').map(s => s.trim());
                const hasConflict = cardAllergens.some(a => active.has(a));
                card.classList.toggle('allergen-hidden', hasConflict);
            });

            // Zobrazuj / skrývej empty-state v každém tabpanelu
            const panels = document.querySelectorAll('[role="tabpanel"]');
            panels.forEach(panel => {
                const panelCards = panel.querySelectorAll('.product-card');
                const emptyState = panel.querySelector('.allergen-empty-state');
                if (!emptyState) return;

                const allHidden = panelCards.length > 0 &&
                    Array.from(panelCards).every(c => c.classList.contains('allergen-hidden'));

                if (allHidden) {
                    emptyState.removeAttribute('hidden');
                } else {
                    emptyState.setAttribute('hidden', '');
                }
            });
        };

        // Listener na každý checkbox
        allergenCheckboxes.forEach(cb => {
            cb.addEventListener('change', applyAllergenFilter);
        });

        // Reset tlačítko
        if (allergenResetBtn) {
            allergenResetBtn.addEventListener('click', () => {
                allergenCheckboxes.forEach(cb => { cb.checked = false; });
                applyAllergenFilter();
                // Vrátí focus na první checkbox pro přístupnost (#24 oprava: label není focusable)
                const firstCb = allergenCheckboxes[0];
                if (firstCb) firstCb.focus();
            });
        }

        // Spusť jednou pro inicializaci (žádný filtr aktivní)
        applyAllergenFilter();
    };

    initAllergenFilter();

});
