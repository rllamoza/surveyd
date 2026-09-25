/**
 * OmniPoll - Módulo de Encuesta Pública Autónoma
 * Permite responder directamente la encuesta mediante enlace público funcional
 */

const PublicSurvey = (() => {
  let surveyData = null;
  let startTime = Date.now();

  let state = {
    departamento: '15',
    departamentoNombre: 'Lima',
    provincia: '1501',
    provinciaNombre: 'Lima Metropolitana',
    distrito: '150122',
    distritoNombre: 'Miraflores',
    respuestas: {},
    answeredQuestions: new Set()
  };

  const init = async () => {
    initTheme();
    setupThemeToggle();
    setupFormSubmission();
    setupFloatingProgress();

    // Obtener identificador desde la URL (?id=CENSO001 o ?codigo=CENSO001 o ?c=CENSO001)
    const urlParams = new URLSearchParams(window.location.search);
    const surveyIdOrCode = urlParams.get('id') || urlParams.get('codigo') || urlParams.get('c') || urlParams.get('encuesta') || 'CENSO001';

    await loadSurvey(surveyIdOrCode);
    await initUbigeo();
  };

  /* ==========================================================================
     SISTEMA DE TEMA DÍA / NOCHE
     ========================================================================== */
  const initTheme = () => {
    let savedTheme = localStorage.getItem('omnipoll_theme');
    if (!savedTheme) {
      savedTheme = 'light';
      localStorage.setItem('omnipoll_theme', 'light');
    }
    const isDark = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    if (isDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
    updateThemeIcon(isDark);
  };

  const setupThemeToggle = () => {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('omnipoll_theme', isDark ? 'dark' : 'light');
      if (isDark) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
      updateThemeIcon(isDark);
    });
  };

  const updateThemeIcon = (isDark) => {
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
  };

  /* ==========================================================================
     CARGA DE LA ENCUESTA Y DETALLES
     ========================================================================== */
  const loadSurvey = async (idOrCode) => {
    const loadingEl = document.getElementById('survey-loading');
    const contentEl = document.getElementById('survey-content');
    const errorEl = document.getElementById('survey-error');

    try {
      surveyData = await API.getEncuesta(idOrCode);

      if (!surveyData || !surveyData.id) {
        throw new Error('Encuesta no encontrada');
      }

      // Rellenar ficha cabecera
      document.getElementById('public-survey-code').textContent = `ID: ${surveyData.codigo || 'ENCUESTA'}`;
      document.getElementById('public-survey-title').textContent = surveyData.titulo;
      document.getElementById('public-survey-desc').textContent = surveyData.descripcion || 'Sin descripción disponible.';
      document.getElementById('public-survey-cat').textContent = surveyData.categoria || 'Sondeo General';
      document.getElementById('public-survey-time').textContent = `~ ${surveyData.tiempo_estimado_min || 4} min`;
      document.title = `${surveyData.titulo} - OmniPoll Oficial`;

      // Aplicar personalización de colores, branding, logos y tipografía exclusiva de esta encuesta
      applySurveyBranding(surveyData.branding);

      // Verificar si la encuesta contiene pregunta de UBIGEO
      const hasUbigeoQ = (surveyData.preguntas || []).some(q => q.tipo === 'ubigeo_cascada');
      const topUbigeoSec = document.getElementById('section-ubigeo');
      if (topUbigeoSec) {
        if (hasUbigeoQ) {
          topUbigeoSec.classList.add('hidden');
        } else {
          topUbigeoSec.classList.remove('hidden');
        }
      }

      // Renderizar preguntas
      renderQuestions(surveyData.preguntas || []);

      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');
      updateProgress();
    } catch (err) {
      console.error('Error cargando encuesta:', err);
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errorEl) {
        errorEl.classList.remove('hidden');
        document.getElementById('survey-error-desc').textContent = `No se pudo encontrar ninguna encuesta activa con el código "${idOrCode}". Verifique la dirección o contacte al administrador.`;
      }
    }
  };

  /**
   * Aplicar personalización y branding exclusivo de la encuesta
   */
  const applySurveyBranding = (branding) => {
    if (!branding || typeof branding !== 'object') return;

    // 1. Colores personalizados
    const primaryColor = branding.primary_color || branding.color_primario;
    const secondaryColor = branding.secondary_color || branding.color_secundario;
    const bgColor = branding.bg_color || branding.color_fondo;

    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor);
      document.documentElement.style.setProperty('--primary-container', primaryColor);
      document.documentElement.style.setProperty('--primary-hover', primaryColor);
      document.documentElement.style.setProperty('--primary-fixed-dim', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--secondary', secondaryColor);
      document.documentElement.style.setProperty('--secondary-container', secondaryColor);
    }
    if (bgColor) {
      document.documentElement.style.setProperty('--surface', bgColor);
      document.body.style.backgroundColor = bgColor;
    }

    // 2. Tipografía (Google Font dinámico)
    const fontFamily = branding.font_family || branding.fuente_familia;
    if (fontFamily && fontFamily !== 'Default') {
      const fontUrl = fontFamily.replace(/\s+/g, '+');
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = `https://fonts.googleapis.com/css2?family=${fontUrl}:wght@300;400;500;600;700;800&display=swap`;
      document.head.appendChild(fontLink);
      document.body.style.fontFamily = `"${fontFamily}", sans-serif`;
      document.documentElement.style.fontFamily = `"${fontFamily}", sans-serif`;
    }

    // 3. Logotipo de la encuesta
    const customLogoImg = document.getElementById('public-header-custom-logo');
    const defaultLogoIcon = document.getElementById('public-header-default-icon');
    if (branding.logo_url && customLogoImg) {
      customLogoImg.src = branding.logo_url;
      customLogoImg.classList.remove('hidden');
      if (defaultLogoIcon) defaultLogoIcon.classList.add('hidden');
    }

    // 4. Título, subtítulo y textos presentados
    const pubTitle = branding.public_title || branding.titulo_publico;
    const pubSubtitle = branding.public_subtitle || branding.subtitulo_publico;
    const welcomeMsg = branding.welcome_message || branding.mensaje_bienvenida;
    const thanksMsg = branding.thank_you_message || branding.mensaje_agradecimiento;

    if (pubTitle) {
      const pTitle = document.getElementById('public-survey-title');
      const bTitle = document.getElementById('public-header-brand-title');
      if (pTitle) pTitle.textContent = pubTitle;
      if (bTitle) bTitle.textContent = pubTitle;
      document.title = `${pubTitle} - OmniPoll`;
    }
    if (pubSubtitle) {
      const bSubtitle = document.getElementById('public-header-brand-subtitle');
      const pCat = document.getElementById('public-survey-cat');
      if (bSubtitle) bSubtitle.textContent = pubSubtitle;
      if (pCat) pCat.textContent = pubSubtitle;
    }
    if (welcomeMsg) {
      const pDesc = document.getElementById('public-survey-desc');
      if (pDesc) pDesc.textContent = welcomeMsg;
    }
    if (thanksMsg) {
      const pThanks = document.getElementById('public-survey-success-desc');
      if (pThanks) pThanks.textContent = thanksMsg;
    }
  };

  /* ==========================================================================
     RENDERIZADO DINÁMICO DE PREGUNTAS (MINIMALISTA, LETRA GRANDE Y CLARA)
     ========================================================================== */
  const renderQuestions = (preguntas) => {
    const container = document.getElementById('dynamic-questions-container');
    if (!container) return;

    if (preguntas.length === 0) {
      container.innerHTML = `
        <div class="glass-panel p-8 text-center text-on-surface-variant font-mono text-xs rounded-2xl">
          No hay preguntas adicionales registradas para este instrumento.
        </div>
      `;
      return;
    }

    container.innerHTML = preguntas.map((q, idx) => {
      const numStr = String(idx + 1).padStart(2, '0');
      return `
        <article class="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 question-block shadow-sm" data-question-id="${q.id}">
          <div class="flex items-center justify-between pb-2 border-b border-glass-card-border">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-primary">Pregunta ${numStr}</span>
              ${q.es_requerida ? '<span class="text-xs text-rose-500 font-semibold">* Obligatoria</span>' : '<span class="text-xs text-slate-400 font-medium">Opcional</span>'}
            </div>
            <span class="text-[11px] font-mono text-on-surface-variant">${formatType(q.tipo)}</span>
          </div>

          <div>
            <h2 class="font-headline text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 leading-snug tracking-tight">
              ${escapeHtml(q.enunciado)}
            </h2>
            ${q.ayuda ? `<p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-1 leading-relaxed">${escapeHtml(q.ayuda)}</p>` : ''}
          </div>

          <div class="pt-2">
            ${renderInputForType(q)}
          </div>
        </article>
      `;
    }).join('');

    setupInteractiveControls();
  };

  const renderInputForType = (q) => {
    switch (q.tipo) {
      case 'ubigeo_cascada':
        return `
          <div class="space-y-4 pt-1 ubigeo-question-wrapper" data-qid="${q.id}">
            <!-- Cuadrícula Cascada 3 Fases: Región, Provincia, Distrito -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              
              <!-- 1. REGIÓN / DEPARTAMENTO -->
              <div class="p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/30 flex flex-col justify-between" id="card-dep-${q.id}">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-mono text-[10px] text-primary font-bold uppercase tracking-wider">1. Región</span>
                  <span class="badge badge-glass text-[9px] font-mono" id="badge-dep-${q.id}">UBI: 150000</span>
                </div>
                <div>
                  <select id="select-dep-${q.id}" class="input-glass text-xs py-2 px-2.5 cursor-pointer font-medium w-full select-ubigeo-dep" data-qid="${q.id}">
                    <option value="" disabled selected>Cargando regiones...</option>
                  </select>
                </div>
              </div>

              <!-- 2. PROVINCIA -->
              <div class="p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/30 flex flex-col justify-between" id="card-prov-${q.id}">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-mono text-[10px] text-secondary font-bold uppercase tracking-wider">2. Provincia</span>
                  <span class="badge badge-glass text-[9px] font-mono" id="badge-prov-${q.id}">UBI: 1501</span>
                </div>
                <div>
                  <select id="select-prov-${q.id}" class="input-glass text-xs py-2 px-2.5 cursor-pointer font-medium w-full select-ubigeo-prov" data-qid="${q.id}">
                    <option value="" disabled selected>Seleccione primero Región</option>
                  </select>
                </div>
              </div>

              <!-- 3. DISTRITO -->
              <div class="p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/30 flex flex-col justify-between" id="card-dist-${q.id}">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">3. Distrito</span>
                  <span class="badge badge-glass text-[9px] font-mono" id="badge-dist-${q.id}">UBI: 150122</span>
                </div>
                <div>
                  <select id="select-dist-${q.id}" class="input-glass text-xs py-2 px-2.5 cursor-pointer font-medium w-full select-ubigeo-dist" data-qid="${q.id}">
                    <option value="" disabled selected>Seleccione primero Provincia</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Ficha Resumen de Selección Territorial -->
            <div class="p-3 rounded-xl bg-surface-container/30 border border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-emerald-400 text-base">pin_drop</span>
                <span class="text-on-surface-variant font-medium">Ubicación:</span>
                <span class="text-primary font-bold font-mono" id="ubigeo-display-${q.id}">Perú &gt; Lima &gt; Lima Metropolitana &gt; Miraflores</span>
              </div>
              <span class="badge badge-approved text-xs font-mono font-bold" id="ubigeo-code-${q.id}">150122</span>
            </div>
          </div>
        `;

      case 'opcion_unica':
        return `
          <div class="space-y-3">
            ${(q.opciones || []).map((opt, i) => {
              const val = opt.valor || opt.etiqueta || `opt_${i}`;
              const label = opt.etiqueta || opt.valor || 'Alternativa';
              return `
                <div class="relative">
                  <input type="radio" id="q_${q.id}_${i}" name="q_${q.id}" value="${escapeHtml(val)}" class="sr-only" ${q.es_requerida ? 'required' : ''} onchange="PublicSurvey.onAnswerChange(${q.id}, '${escapeHtml(val)}')"/>
                  <label for="q_${q.id}_${i}" class="option-card-label flex items-center justify-between p-4 rounded-xl cursor-pointer">
                    <span class="text-sm sm:text-base font-semibold text-on-surface select-none">${escapeHtml(label)}</span>
                    <span class="radio-custom-circle h-5 w-5 rounded-full border-2 border-outline-variant flex items-center justify-center shrink-0 transition-colors">
                      <span class="radio-custom-dot h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition-all duration-200 transform scale-50"></span>
                    </span>
                  </label>
                </div>
              `;
            }).join('')}
          </div>
        `;

      case 'opcion_multiple':
        return `
          <div class="space-y-3">
            ${(q.opciones || []).map((opt, i) => {
              const val = opt.valor || opt.etiqueta || `opt_${i}`;
              const label = opt.etiqueta || opt.valor || 'Alternativa';
              return `
                <div class="relative">
                  <input type="checkbox" id="q_${q.id}_${i}" name="q_${q.id}[]" value="${escapeHtml(val)}" class="sr-only" onchange="PublicSurvey.onCheckboxChange(${q.id}, '${escapeHtml(val)}', this.checked)"/>
                  <label for="q_${q.id}_${i}" class="option-card-label flex items-center justify-between p-4 rounded-xl cursor-pointer">
                    <span class="text-sm sm:text-base font-semibold text-on-surface select-none">${escapeHtml(label)}</span>
                    <span class="checkbox-custom-box h-5 w-5 rounded-lg border-2 border-outline-variant flex items-center justify-center shrink-0 transition-all">
                      <span class="checkbox-custom-icon material-symbols-outlined text-xs text-white dark:text-slate-900 opacity-0 transition-all duration-200 font-black transform scale-50">check</span>
                    </span>
                  </label>
                </div>
              `;
            }).join('')}
          </div>
        `;

      case 'calificacion':
        return `
          <div class="flex flex-col items-center justify-center p-6 rounded-xl glass-subcard space-y-3">
            <div class="flex items-center gap-2.5">
              ${[1, 2, 3, 4, 5].map(star => `
                <button type="button" class="btn-star p-1 transition-transform hover:scale-125 focus:outline-none" data-qid="${q.id}" data-val="${star}">
                  <span class="material-symbols-outlined text-3xl sm:text-4xl text-outline/40 hover:text-amber-400 transition-colors">star</span>
                </button>
              `).join('')}
            </div>
            <span class="font-mono text-xs text-primary font-bold" id="star-label-${q.id}">Toque una estrella para calificar</span>
          </div>
        `;

      case 'escala_nps':
        return `
          <div class="space-y-3">
            <div class="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
              ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
                <button type="button" class="btn-nps py-3 rounded-xl glass-subcard font-mono text-sm font-bold text-on-surface hover:text-primary hover:border-primary transition-all text-center" data-qid="${q.id}" data-nps="${n}">
                  ${n}
                </button>
              `).join('')}
            </div>
            <div class="flex justify-between items-center text-[10px] font-mono text-on-surface-variant px-1">
              <span>0 = Nada probable</span>
              <span>10 = Totalmente probable</span>
            </div>
          </div>
        `;

      case 'texto':
      default:
        return `
          <div class="space-y-2">
            <textarea id="q_${q.id}" rows="4" class="input-glass w-full text-sm p-4 rounded-xl resize-none leading-relaxed" placeholder="Escriba su respuesta detallada aquí con sus propias palabras..." oninput="PublicSurvey.onAnswerChange(${q.id}, this.value)"></textarea>
            <div class="text-right text-[10px] font-mono text-on-surface-variant">Máximo 500 caracteres</div>
          </div>
        `;
    }
  };

  const setupInteractiveControls = () => {
    // Estrellas de Calificación
    document.querySelectorAll('.btn-star').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qid = Number(btn.dataset.qid);
        const val = Number(btn.dataset.val);
        state.respuestas[`q_${qid}`] = val;
        state.respuestas.calificacion = val;
        state.answeredQuestions.add(qid);

        const starLabels = {
          1: '1 Estrella - Muy Inadecuado / Pésimo',
          2: '2 Estrellas - Insuficiente',
          3: '3 Estrellas - Regular / Aceptable',
          4: '4 Estrellas - Bueno / Satisfactorio',
          5: '5 Estrellas - Excelente / Sobresaliente'
        };

        const labelEl = document.getElementById(`star-label-${qid}`);
        if (labelEl) labelEl.textContent = starLabels[val] || `${val} Estrellas`;

        // Colorear estrellas del bloque
        document.querySelectorAll(`.btn-star[data-qid="${qid}"]`).forEach(b => {
          const bVal = Number(b.dataset.val);
          const icon = b.querySelector('.material-symbols-outlined');
          if (bVal <= val) {
            icon.classList.add('text-amber-400');
            icon.classList.remove('text-outline/40');
          } else {
            icon.classList.remove('text-amber-400');
            icon.classList.add('text-outline/40');
          }
        });
        updateProgress();
      });
    });

    // Escala NPS
    document.querySelectorAll('.btn-nps').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qid = Number(btn.dataset.qid);
        const npsVal = Number(btn.dataset.nps);
        state.respuestas[`q_${qid}`] = npsVal;
        state.respuestas.nps = npsVal;
        state.answeredQuestions.add(qid);

        document.querySelectorAll(`.btn-nps[data-qid="${qid}"]`).forEach(b => {
          b.classList.remove('border-primary', 'bg-primary/20', 'text-primary');
        });
        btn.classList.add('border-primary', 'bg-primary/20', 'text-primary');
        updateProgress();
      });
    });

    // Cascada de Opciones UBIGEO en Preguntas (Región -> Provincia -> Distrito)
    initUbigeoForQuestions();
  };

  const initUbigeoForQuestions = async () => {
    const wrappers = document.querySelectorAll('.ubigeo-question-wrapper');
    if (wrappers.length === 0) return;

    const deps = await API.getDepartamentos();
    if (!deps || deps.length === 0) return;

    wrappers.forEach(async (wrapper) => {
      const qid = Number(wrapper.dataset.qid);
      const selectDep = document.getElementById(`select-dep-${qid}`);
      const selectProv = document.getElementById(`select-prov-${qid}`);
      const selectDist = document.getElementById(`select-dist-${qid}`);
      const badgeDep = document.getElementById(`badge-dep-${qid}`);
      const badgeProv = document.getElementById(`badge-prov-${qid}`);
      const badgeDist = document.getElementById(`badge-dist-${qid}`);
      const display = document.getElementById(`ubigeo-display-${qid}`);
      const codeBadge = document.getElementById(`ubigeo-code-${qid}`);

      if (!selectDep || !selectProv || !selectDist) return;

      // Cargar opciones de Región / Departamento
      selectDep.innerHTML = '<option value="" disabled>Seleccione Región</option>' +
        deps.map(d => `<option value="${d.codigo}" ${d.codigo === state.departamento ? 'selected' : ''}>${d.nombre} (${d.codigo})</option>`).join('');

      const updateCascadeDisplay = (depName, provName, distName, distCode, isUserAction = false) => {
        if (display) display.textContent = `Perú > ${depName} > ${provName} > ${distName}`;
        if (codeBadge) codeBadge.textContent = distCode;
        if (badgeDep) badgeDep.textContent = `UBI: ${state.departamento}0000`;
        if (badgeProv) badgeProv.textContent = `UBI: ${state.provincia}`;
        if (badgeDist) badgeDist.textContent = `UBI: ${distCode}`;

        // Guardar selección en ubicación oficial
        state.departamentoNombre = depName;
        state.provinciaNombre = provName;
        state.distritoNombre = distName;
        state.distrito = distCode;

        if (isUserAction) {
          state.respuestas[`q_${qid}`] = `${depName} > ${provName} > ${distName} (${distCode})`;
          state.answeredQuestions.add(qid);
          updateProgress();
        }
      };

      const loadProvsForQ = async (depCod, isUserAction = false) => {
        const provs = await API.getProvincias(depCod);
        if (!provs || provs.length === 0) {
          selectProv.innerHTML = '<option value="" disabled selected>Sin provincias</option>';
          selectDist.innerHTML = '<option value="" disabled selected>Sin distritos</option>';
          return;
        }

        selectProv.innerHTML = provs.map((p, i) => `<option value="${p.codigo}" ${i === 0 ? 'selected' : ''}>${p.nombre}</option>`).join('');
        const firstProv = provs[0];
        state.provincia = firstProv.codigo;
        state.provinciaNombre = firstProv.nombre;

        await loadDistsForQ(firstProv.codigo, isUserAction);
      };

      const loadDistsForQ = async (provCod, isUserAction = false) => {
        const dists = await API.getDistritos(provCod);
        if (!dists || dists.length === 0) {
          selectDist.innerHTML = '<option value="" disabled selected>Distrito Capital</option>';
          updateCascadeDisplay(state.departamentoNombre, state.provinciaNombre, state.provinciaNombre, state.provincia + '01', isUserAction);
          return;
        }

        selectDist.innerHTML = dists.map((d, i) => `<option value="${d.codigo}" ${i === 0 ? 'selected' : ''}>${d.nombre}</option>`).join('');
        const firstDist = dists[0];
        state.distrito = firstDist.codigo;
        state.distritoNombre = firstDist.nombre;
        updateCascadeDisplay(state.departamentoNombre, state.provinciaNombre, firstDist.nombre, firstDist.codigo, isUserAction);
      };

      // Cargar Provincias y Distritos iniciales sin marcar la pregunta como contestada aún
      await loadProvsForQ(state.departamento, false);

      // Evento de Selección de Región: Despliega las provincias correspondientes
      selectDep.addEventListener('change', async (e) => {
        state.departamento = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.departamentoNombre = opt.text.split(' (')[0];
        await loadProvsForQ(state.departamento, true);
      });

      // Evento de Selección de Provincia: Despliega los distritos correspondientes
      selectProv.addEventListener('change', async (e) => {
        state.provincia = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.provinciaNombre = opt.text;
        await loadDistsForQ(state.provincia, true);
      });

      // Evento de Selección de Distrito
      selectDist.addEventListener('change', (e) => {
        state.distrito = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.distritoNombre = opt.text;
        updateCascadeDisplay(state.departamentoNombre, state.provinciaNombre, state.distritoNombre, state.distrito, true);
      });
    });
  };

  const onAnswerChange = (qid, val) => {
    const qidNum = Number(qid);
    state.respuestas[`q_${qidNum}`] = val;
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      state.answeredQuestions.add(qidNum);
    } else {
      state.answeredQuestions.delete(qidNum);
    }
    updateProgress();
  };

  const onCheckboxChange = (qid, val, isChecked) => {
    const qidNum = Number(qid);
    const key = `q_${qidNum}`;
    if (!Array.isArray(state.respuestas[key])) {
      state.respuestas[key] = [];
    }
    if (isChecked) {
      if (!state.respuestas[key].includes(val)) state.respuestas[key].push(val);
    } else {
      state.respuestas[key] = state.respuestas[key].filter(v => v !== val);
    }

    if (state.respuestas[key].length > 0) {
      state.answeredQuestions.add(qidNum);
    } else {
      state.answeredQuestions.delete(qidNum);
    }
    updateProgress();
  };

  const updateProgress = () => {
    const total = (surveyData && surveyData.preguntas) ? surveyData.preguntas.length : 1;
    const answeredCount = state.answeredQuestions ? state.answeredQuestions.size : 0;
    const pct = total > 0 ? Math.min(100, Math.round((answeredCount / total) * 100)) : 0;

    // Barra de cabecera
    const pText = document.getElementById('progress-text');
    const pPct = document.getElementById('progress-pct');
    const pBar = document.getElementById('progress-bar');

    if (pText) pText.textContent = `Progreso: ${answeredCount} de ${total} preguntas respondidas`;
    if (pPct) pPct.textContent = `${pct}% COMPLETADO`;
    if (pBar) pBar.style.width = `${pct}%`;

    // Barra flotante inferior en Smartphone
    const fText = document.getElementById('floating-progress-text');
    const fPct = document.getElementById('floating-progress-pct');
    const fBar = document.getElementById('floating-progress-bar');

    if (fText) fText.textContent = `${answeredCount} de ${total} respondidas`;
    if (fPct) fPct.textContent = `${pct}% COMPLETADO`;
    if (fBar) fBar.style.width = `${pct}%`;
  };

  const setupFloatingProgress = () => {
    const onScroll = () => {
      updateFloatingProgressVisibility();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  };

  const updateFloatingProgressVisibility = () => {
    const floatingBar = document.getElementById('floating-mobile-progress');
    const headerBar = document.getElementById('progress-bar');
    if (!floatingBar || !headerBar) return;

    // Si estamos en pantallas de escritorio (>= 640px), mantener oculto
    if (window.innerWidth >= 640) {
      floatingBar.classList.add('translate-y-full', 'opacity-0');
      return;
    }

    // Si el contenedor de éxito o de resumen están visibles, ocultar
    const successEl = document.getElementById('survey-success-container');
    const summaryEl = document.getElementById('survey-summary-container');
    if ((successEl && !successEl.classList.contains('hidden')) || 
        (summaryEl && !summaryEl.classList.contains('hidden'))) {
      floatingBar.classList.add('translate-y-full', 'opacity-0');
      return;
    }

    // Si la encuesta aún no ha cargado, ocultar
    const contentEl = document.getElementById('survey-content');
    if (!contentEl || contentEl.classList.contains('hidden')) {
      floatingBar.classList.add('translate-y-full', 'opacity-0');
      return;
    }

    // Verificar si la barra de cabecera ha desaparecido por el scroll superior
    const rect = headerBar.getBoundingClientRect();
    if (rect.bottom < 60 || window.scrollY > 140) {
      floatingBar.classList.remove('translate-y-full', 'opacity-0');
    } else {
      floatingBar.classList.add('translate-y-full', 'opacity-0');
    }
  };

  /* ==========================================================================
     CASCADA DE UBIGEO (Departamento -> Provincia -> Distrito)
     ========================================================================== */
  const initUbigeo = async () => {
    const depSelect = document.getElementById('public-select-dep');
    const provSelect = document.getElementById('public-select-prov');
    const distSelect = document.getElementById('public-select-dist');

    // Cargar Departamentos
    const deps = await API.getDepartamentos();
    if (depSelect && deps) {
      depSelect.innerHTML = deps.map(d => `<option value="${d.codigo}" ${d.codigo === state.departamento ? 'selected' : ''}>${d.nombre} (${d.codigo})</option>`).join('');
    }

    // Cargar Provincias iniciales
    await loadProvincias(state.departamento);
    await loadDistritos(state.provincia);

    // Eventos
    if (depSelect) {
      depSelect.addEventListener('change', async (e) => {
        state.departamento = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.departamentoNombre = opt.text.split(' (')[0];
        document.getElementById('badge-dep-code').textContent = `UBI: ${state.departamento}0000`;
        await loadProvincias(state.departamento);
        await loadDistritos(state.provincia);
      });
    }

    if (provSelect) {
      provSelect.addEventListener('change', async (e) => {
        state.provincia = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.provinciaNombre = opt.text;
        document.getElementById('badge-prov-code').textContent = `UBI: ${state.provincia}`;
        await loadDistritos(state.provincia);
      });
    }

    if (distSelect) {
      distSelect.addEventListener('change', (e) => {
        state.distrito = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.distritoNombre = opt.text;
        document.getElementById('badge-dist-code').textContent = `UBI: ${state.distrito}`;
      });
    }
  };

  const loadProvincias = async (depCodigo) => {
    const provs = await API.getProvincias(depCodigo);
    const select = document.getElementById('public-select-prov');
    if (!select) return;

    if (!provs || provs.length === 0) {
      select.innerHTML = '<option value="" disabled selected>No disponible</option>';
      return;
    }

    const defaultProv = provs.find(p => p.codigo === state.provincia) ? state.provincia : provs[0].codigo;
    state.provincia = defaultProv;
    const pObj = provs.find(p => p.codigo === defaultProv);
    state.provinciaNombre = pObj ? pObj.nombre : '';

    select.innerHTML = provs.map(p => `<option value="${p.codigo}" ${p.codigo === defaultProv ? 'selected' : ''}>${p.nombre}</option>`).join('');
    document.getElementById('badge-prov-code').textContent = `UBI: ${state.provincia}`;
  };

  const loadDistritos = async (provCodigo) => {
    const dists = await API.getDistritos(provCodigo);
    const select = document.getElementById('public-select-dist');
    if (!select) return;

    if (!dists || dists.length === 0) {
      select.innerHTML = '<option value="" disabled selected>Distrito Capital</option>';
      return;
    }

    const defaultDist = dists.find(d => d.codigo === state.distrito) ? state.distrito : dists[0].codigo;
    state.distrito = defaultDist;
    const dObj = dists.find(d => d.codigo === defaultDist);
    state.distritoNombre = dObj ? dObj.nombre : '';

    select.innerHTML = dists.map(d => `<option value="${d.codigo}" ${d.codigo === defaultDist ? 'selected' : ''}>${d.nombre}</option>`).join('');
    document.getElementById('badge-dist-code').textContent = `UBI: ${state.distrito}`;
  };

  /* ==========================================================================
     RESUMEN PREVIO DE RESPUESTAS & ENVÍO A LA BASE DE DATOS
     ========================================================================== */
  const setupFormSubmission = () => {
    const form = document.getElementById('public-survey-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      reviewAnswers();
    });
  };

  /**
   * Valida respuestas y despliega la pantalla de resumen antes de confirmar el envío
   */
  const reviewAnswers = () => {
    if (!surveyData) return;

    // 1. Validar que todas las preguntas obligatorias hayan sido respondidas
    const missingQuestions = [];
    (surveyData.preguntas || []).forEach((q, idx) => {
      if (q.es_requerida) {
        if (q.tipo === 'ubigeo_cascada') {
          // Si el usuario no modificó el ubigeo, usamos el valor por defecto cargado
          if (!state.respuestas[`q_${q.id}`]) {
            state.respuestas[`q_${q.id}`] = `${state.departamentoNombre} > ${state.provinciaNombre} > ${state.distritoNombre} (${state.distrito})`;
            state.answeredQuestions.add(Number(q.id));
          }
        } else {
          const val = state.respuestas[`q_${q.id}`];
          const hasAnswer = val !== undefined && val !== null && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== '');
          if (!hasAnswer) {
            missingQuestions.push({ qid: q.id, index: idx + 1, enunciado: q.enunciado });
          }
        }
      }
    });

    if (missingQuestions.length > 0) {
      const firstMissing = missingQuestions[0];
      showToast(`Por favor responda la Pregunta ${String(firstMissing.index).padStart(2, '0')}: "${firstMissing.enunciado.substring(0, 40)}..."`, 'error');

      const qBlock = document.querySelector(`.question-block[data-question-id="${firstMissing.qid}"]`);
      if (qBlock) {
        qBlock.classList.add('question-required-highlight');
        qBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => qBlock.classList.remove('question-required-highlight'), 3000);
      }
      return;
    }

    // 2. Renderizar lista de respuestas en la pantalla de resumen
    renderSummaryAnswers();

    // 3. Ocultar formulario de preguntas y mostrar pantalla de resumen
    const contentEl = document.getElementById('survey-content');
    const summaryEl = document.getElementById('survey-summary-container');
    const floatingBar = document.getElementById('floating-mobile-progress');

    if (contentEl) contentEl.classList.add('hidden');
    if (floatingBar) floatingBar.classList.add('translate-y-full', 'opacity-0');
    if (summaryEl) {
      summaryEl.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showToast('Respuestas listas para verificación. Revise o confirme el envío.', 'info');
  };

  /**
   * Renderiza el desglose detallado de cada pregunta y la respuesta seleccionada por el usuario
   */
  const renderSummaryAnswers = () => {
    const listContainer = document.getElementById('summary-answers-list');
    const codeBadge = document.getElementById('summary-code-badge');
    const ubiText = document.getElementById('summary-ubigeo-text');

    if (codeBadge) codeBadge.textContent = `ID: ${surveyData.codigo || 'ENCUESTA'}`;
    if (ubiText) {
      ubiText.textContent = `${state.departamentoNombre} > ${state.provinciaNombre} > ${state.distritoNombre} (${state.distrito})`;
    }

    if (!listContainer || !surveyData || !surveyData.preguntas) return;

    listContainer.innerHTML = surveyData.preguntas.map((q, idx) => {
      const numStr = String(idx + 1).padStart(2, '0');
      let answerDisplay = '';

      if (q.tipo === 'ubigeo_cascada') {
        const val = state.respuestas[`q_${q.id}`] || `${state.departamentoNombre} > ${state.provinciaNombre} > ${state.distritoNombre} (${state.distrito})`;
        answerDisplay = `
          <div class="flex items-center gap-1.5 text-primary font-bold">
            <span class="material-symbols-outlined text-sm">map</span>
            <span>${escapeHtml(val)}</span>
          </div>
        `;
      } else {
        const rawVal = state.respuestas[`q_${q.id}`];

        if (rawVal === undefined || rawVal === null || (Array.isArray(rawVal) && rawVal.length === 0) || String(rawVal).trim() === '') {
          answerDisplay = `<span class="text-slate-400 dark:text-slate-500 italic text-xs font-mono">(Sin respuesta / Opcional)</span>`;
        } else if (Array.isArray(rawVal)) {
          answerDisplay = `
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              ${rawVal.map(item => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold text-xs">
                  <span class="material-symbols-outlined text-[13px]">check</span>
                  <span>${escapeHtml(item)}</span>
                </span>
              `).join('')}
            </div>
          `;
        } else if (q.tipo === 'calificacion') {
          const stars = Number(rawVal) || 0;
          answerDisplay = `
            <div class="flex items-center gap-1 text-amber-400">
              ${Array.from({ length: 5 }, (_, i) => `<span class="material-symbols-outlined text-base">${i < stars ? 'star' : 'star_border'}</span>`).join('')}
              <span class="text-xs font-mono font-bold text-on-surface ml-1.5">${stars} de 5 Estrellas</span>
            </div>
          `;
        } else if (q.tipo === 'escala_nps') {
          answerDisplay = `
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-mono font-bold text-xs">
              <span>Puntaje de Recomendación: ${rawVal} de 10 (NPS)</span>
            </div>
          `;
        } else {
          answerDisplay = `
            <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
              ${escapeHtml(String(rawVal))}
            </p>
          `;
        }
      }

      return `
        <div class="glass-subcard p-4 sm:p-5 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="space-y-1.5 flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="badge text-[10px] font-mono bg-primary/15 text-primary border border-primary/30">
                P${numStr}
              </span>
              <span class="text-[10px] font-mono text-on-surface-variant font-medium">
                ${formatType(q.tipo)}
              </span>
            </div>
            <h3 class="text-xs sm:text-sm font-bold text-on-surface leading-snug">
              ${escapeHtml(q.enunciado)}
            </h3>
            <div class="pt-1.5">
              <span class="text-[9px] uppercase font-mono text-outline font-bold block mb-1">Tu Selección:</span>
              ${answerDisplay}
            </div>
          </div>
          <button type="button" class="btn btn-secondary text-xs py-1.5 px-3 self-end sm:self-center shrink-0 flex items-center gap-1.5 rounded-xl hover:border-primary transition-all cursor-pointer" onclick="PublicSurvey.editSpecificQuestion(${q.id})" title="Modificar esta respuesta">
            <span class="material-symbols-outlined text-sm text-primary">edit</span>
            <span>Corregir</span>
          </button>
        </div>
      `;
    }).join('');
  };

  /**
   * Regresa al formulario de preguntas desde la pantalla de resumen
   */
  const backToQuestions = () => {
    const contentEl = document.getElementById('survey-content');
    const summaryEl = document.getElementById('survey-summary-container');

    if (summaryEl) summaryEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

    updateFloatingProgressVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Regresa a una pregunta específica para editarla y hace scroll con resaltado visual
   */
  const editSpecificQuestion = (qid) => {
    const contentEl = document.getElementById('survey-content');
    const summaryEl = document.getElementById('survey-summary-container');

    if (summaryEl) summaryEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

    updateFloatingProgressVisibility();

    setTimeout(() => {
      const qBlock = document.querySelector(`.question-block[data-question-id="${qid}"]`);
      if (qBlock) {
        qBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        qBlock.classList.add('question-required-highlight');
        setTimeout(() => qBlock.classList.remove('question-required-highlight'), 2500);
      }
    }, 100);
  };

  /**
   * Envío definitivo y confirmación a la base de datos MySQL
   */
  const confirmFinalSubmit = async () => {
    if (!surveyData) return;

    const btnConfirm = document.getElementById('btn-confirm-final-submit');
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">sync</span><span>Registrando y Encriptando en MySQL...</span>`;
    }

    const elapsedSec = Math.round((Date.now() - startTime) / 1000);

    const payload = {
      encuesta_id: surveyData.id,
      codigo_sesion: 'PUB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      tiempo_llenado_segundos: Math.max(20, elapsedSec),
      ubigeo: {
        departamento: state.departamentoNombre,
        provincia: state.provinciaNombre,
        distrito: state.distritoNombre,
        codigo_distrito: state.distrito
      },
      respuestas: state.respuestas
    };

    try {
      const res = await API.submitRespuesta(payload);

      // Ocultar resumen y mostrar pantalla de confirmación exitosa
      const summaryEl = document.getElementById('survey-summary-container');
      const contentEl = document.getElementById('survey-content');
      const successEl = document.getElementById('survey-success-container');
      const floatingBar = document.getElementById('floating-mobile-progress');

      if (summaryEl) summaryEl.classList.add('hidden');
      if (contentEl) contentEl.classList.add('hidden');
      if (floatingBar) floatingBar.classList.add('translate-y-full', 'opacity-0');

      if (successEl) {
        const hash = (res && res.recibo_id) ? res.recibo_id : ('OMNI-HASH-' + Math.random().toString(36).substring(2, 10).toUpperCase());
        const ubigeoStr = `${payload.ubigeo.departamento} > ${payload.ubigeo.provincia} > ${payload.ubigeo.distrito} (${payload.ubigeo.codigo_distrito})`;
        const dateStr = new Date().toLocaleString('es-PE');

        const hashEl = document.getElementById('receipt-hash-val');
        const sessionEl = document.getElementById('receipt-session-val');
        const ubiEl = document.getElementById('receipt-ubigeo-val');
        const dateEl = document.getElementById('receipt-date-val');

        if (hashEl) hashEl.textContent = hash;
        if (sessionEl) sessionEl.textContent = payload.codigo_sesion;
        if (ubiEl) ubiEl.textContent = ubigeoStr;
        if (dateEl) dateEl.textContent = dateStr;

        successEl.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      showToast('¡Encuesta registrada exitosamente en MySQL!', 'success');
    } catch (err) {
      console.error('Error al enviar respuestas:', err);
      showToast('Error al enviar la encuesta. Por favor intente nuevamente.', 'error');
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = `<span>Reintentar Envío</span><span class="material-symbols-outlined text-base">send</span>`;
      }
    }
  };

  const submitSurvey = () => {
    reviewAnswers();
  };

  const showReceiptModal = (receipt, payload) => {
    const modal = document.getElementById('modal-receipt');
    if (!modal) return;

    const hash = receipt.recibo_id || 'OMNI-HASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const ubigeoStr = `${payload.ubigeo.departamento} > ${payload.ubigeo.provincia} > ${payload.ubigeo.distrito} (${payload.ubigeo.codigo_distrito})`;
    const dateStr = new Date().toLocaleString('es-PE');

    const mHash = document.getElementById('receipt-modal-hash-val');
    const mSes = document.getElementById('receipt-modal-session-val');
    const mUbi = document.getElementById('receipt-modal-ubigeo-val');
    const mDate = document.getElementById('receipt-modal-date-val');

    if (mHash) mHash.textContent = hash;
    if (mSes) mSes.textContent = payload.codigo_sesion;
    if (mUbi) mUbi.textContent = ubigeoStr;
    if (mDate) mDate.textContent = dateStr;

    modal.classList.add('active');
  };

  const formatType = (tipo) => {
    const map = {
      'opcion_unica': 'Opción Única',
      'opcion_multiple': 'Opción Múltiple',
      'calificacion': 'Calificación 1-5',
      'escala_nps': 'Escala NPS 0-10',
      'texto': 'Pregunta Abierta',
      'ubigeo_cascada': 'UBIGEO INEI'
    };
    return map[tipo] || tipo;
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="material-symbols-outlined text-primary-container">${type === 'error' ? 'error' : 'check_circle'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  const copyCurrentUrl = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const t = document.createElement('textarea');
        t.value = url;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        t.remove();
      }
      showToast('¡Dirección de la encuesta copiada al portapapeles!', 'success');
    } catch (e) {
      prompt('Copie la dirección para compartir con los usuarios:', url);
    }
  };

  return {
    init,
    submitSurvey,
    reviewAnswers,
    backToQuestions,
    editSpecificQuestion,
    confirmFinalSubmit,
    onAnswerChange,
    onCheckboxChange,
    copyCurrentUrl
  };
})();

document.addEventListener('DOMContentLoaded', PublicSurvey.init);
