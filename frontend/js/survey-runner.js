/**
 * OmniPoll - Módulo de Encuesta en Vivo con Cascada UBIGEO
 * Spatial Data Intelligence Core
 */

const SurveyRunner = (() => {
  let currentStep = 3; // Default en Paso 3 (UBIGEO) para coincidir con la vista principal del diseño
  const totalSteps = 5;

  let state = {
    encuestaId: 1,
    pais: 'Perú',
    paisCodigo: '00-00-00',
    departamento: '15', // Lima por defecto
    departamentoNombre: 'Lima',
    provincia: '1501', // Lima Metropolitana
    provinciaNombre: 'Lima Metropolitana',
    distrito: '150122', // Miraflores
    distritoNombre: 'Miraflores',
    respuestas: {
      conexion: 'fibra_optica',
      dispositivos: ['smartphones', 'computadoras', 'smart_tv'],
      calificacion: 5,
      nps: 9,
      comentario: ''
    }
  };

  const init = async () => {
    await loadActiveSurveys();
    await loadDepartamentos();
    await loadProvincias(state.departamento);
    await loadDistritos(state.provincia);
    setupEventListeners();
    updateTelemetry();
  };

  const loadActiveSurveys = async () => {
    const encuestas = await API.getEncuestas();
    const select = document.getElementById('select-active-survey');
    if (!select) return;

    // Detectar si hay parámetro de encuesta en la URL (?encuesta=CENSO001 o ?id=1 o ?c=CENSO001)
    const urlParams = new URLSearchParams(window.location.search);
    const targetParam = urlParams.get('encuesta') || urlParams.get('id') || urlParams.get('c');
    if (targetParam) {
      const match = encuestas.find(e => 
        (e.codigo && e.codigo.toUpperCase() === targetParam.trim().toUpperCase()) ||
        String(e.id) === String(targetParam).trim()
      );
      if (match) {
        state.encuestaId = match.id;
      }
    }

    select.innerHTML = encuestas.map(e => `
      <option value="${e.id}" ${e.id === state.encuestaId ? 'selected' : ''}>
        ${e.codigo} - ${e.titulo} [${e.estado.toUpperCase()}]
      </option>
    `).join('');

    const updateSurveyDisplay = async (eid) => {
      state.encuestaId = eid;
      const det = await API.getEncuesta(eid);
      if (det) {
        const titleEl = document.getElementById('runner-survey-title');
        const descEl = document.getElementById('runner-survey-desc');
        const codeEl = document.getElementById('runner-survey-code');
        const normaEl = document.getElementById('runner-survey-norma');

        if (titleEl) titleEl.textContent = det.titulo;
        if (descEl) descEl.textContent = det.descripcion;
        if (codeEl) codeEl.textContent = `ID: ${det.codigo}`;
        if (normaEl) normaEl.textContent = det.norma_tecnica || 'N/A';
      }
    };

    // Actualizar visualización inicial si fue seleccionada por URL
    if (targetParam) {
      await updateSurveyDisplay(state.encuestaId);
    }

    select.addEventListener('change', async (ev) => {
      const eid = Number(ev.target.value);
      await updateSurveyDisplay(eid);
      const titleEl = document.getElementById('runner-survey-title');
      if (titleEl) App.showToast(`Cargada encuesta: ${titleEl.textContent}`);
    });
  };

  const loadDepartamentos = async () => {
    const deps = await API.getDepartamentos();
    const select = document.getElementById('select-departamento');
    if (!select) return;

    select.innerHTML = '<option value="" disabled>Seleccione Departamento</option>' +
      deps.map(d => `<option value="${d.codigo}" ${d.codigo === state.departamento ? 'selected' : ''}>${d.nombre} (${d.codigo})</option>`).join('');
  };

  const loadProvincias = async (depCodigo) => {
    const provs = await API.getProvincias(depCodigo);
    const select = document.getElementById('select-provincia');
    if (!select) return;

    if (provs.length === 0) {
      select.innerHTML = '<option value="" disabled selected>No hay provincias registradas</option>';
      return;
    }

    const defaultProv = provs.find(p => p.codigo === state.provincia) ? state.provincia : provs[0].codigo;
    state.provincia = defaultProv;
    const provObj = provs.find(p => p.codigo === defaultProv);
    state.provinciaNombre = provObj ? provObj.nombre : '';

    select.innerHTML = provs.map(p => 
      `<option value="${p.codigo}" ${p.codigo === defaultProv ? 'selected' : ''}>${p.nombre}</option>`
    ).join('');

    const provCodeBadge = document.getElementById('provincia-code-badge');
    if (provCodeBadge) provCodeBadge.textContent = `UBI: ${state.provincia}`;
  };

  const loadDistritos = async (provCodigo) => {
    const dists = await API.getDistritos(provCodigo);
    const select = document.getElementById('select-distrito');
    if (!select) return;

    if (dists.length === 0) {
      select.innerHTML = '<option value="" disabled selected>Distrito Capital / Único</option>';
      return;
    }

    const defaultDist = dists.find(d => d.codigo === state.distrito) ? state.distrito : dists[0].codigo;
    state.distrito = defaultDist;
    const distObj = dists.find(d => d.codigo === defaultDist);
    state.distritoNombre = distObj ? distObj.nombre : '';

    select.innerHTML = dists.map(d => 
      `<option value="${d.codigo}" ${d.codigo === defaultDist ? 'selected' : ''}>${d.nombre}</option>`
    ).join('');

    const distCodeBadge = document.getElementById('distrito-code-badge');
    if (distCodeBadge) distCodeBadge.textContent = `UBI: ${state.distrito}`;
  };

  const setupEventListeners = () => {
    // Cambio en Departamento -> Cascada
    const depSelect = document.getElementById('select-departamento');
    if (depSelect) {
      depSelect.addEventListener('change', async (e) => {
        state.departamento = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.departamentoNombre = opt.text.split(' (')[0];
        
        const depCodeBadge = document.getElementById('departamento-code-badge');
        if (depCodeBadge) depCodeBadge.textContent = `UBI: ${state.departamento}0000`;

        await loadProvincias(state.departamento);
        await loadDistritos(state.provincia);
        triggerCascadeGlow('card-provincia');
      });
    }

    // Cambio en Provincia -> Cascada
    const provSelect = document.getElementById('select-provincia');
    if (provSelect) {
      provSelect.addEventListener('change', async (e) => {
        state.provincia = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.provinciaNombre = opt.text;

        const provCodeBadge = document.getElementById('provincia-code-badge');
        if (provCodeBadge) provCodeBadge.textContent = `UBI: ${state.provincia}`;

        await loadDistritos(state.provincia);
        triggerCascadeGlow('card-distrito');
      });
    }

    // Cambio en Distrito
    const distSelect = document.getElementById('select-distrito');
    if (distSelect) {
      distSelect.addEventListener('change', (e) => {
        state.distrito = e.target.value;
        const opt = e.target.options[e.target.selectedIndex];
        state.distritoNombre = opt.text;

        const distCodeBadge = document.getElementById('distrito-code-badge');
        if (distCodeBadge) distCodeBadge.textContent = `UBI: ${state.distrito}`;
        triggerCascadeGlow('card-distrito');
      });
    }

    // Estrellas de Calificación
    document.querySelectorAll('.rating-star').forEach(star => {
      star.addEventListener('click', (e) => {
        const val = Number(e.currentTarget.dataset.value);
        state.respuestas.calificacion = val;
        updateStarRating(val);
      });
    });

    // Escala NPS
    document.querySelectorAll('.nps-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nps-btn').forEach(b => {
          b.classList.remove('active', 'border-primary', 'text-primary', 'font-bold');
        });
        e.currentTarget.classList.add('active', 'border-primary', 'text-primary', 'font-bold');
        state.respuestas.nps = Number(e.currentTarget.dataset.nps);
      });
    });

    // Botones de paso
    const btnNext = document.getElementById('btn-next-step');
    if (btnNext) {
      btnNext.addEventListener('click', nextStep);
    }

    const btnPrev = document.getElementById('btn-prev-step');
    if (btnPrev) {
      btnPrev.addEventListener('click', prevStep);
    }
  };

  const triggerCascadeGlow = (cardId) => {
    const el = document.getElementById(cardId);
    if (!el) return;
    el.classList.add('animate-glow');
    setTimeout(() => el.classList.remove('animate-glow'), 1200);
  };

  const updateStarRating = (val) => {
    document.querySelectorAll('.rating-star').forEach(s => {
      const sVal = Number(s.dataset.value);
      if (sVal <= val) {
        s.classList.add('text-amber-400');
        s.classList.remove('text-outline/40');
      } else {
        s.classList.remove('text-amber-400');
        s.classList.add('text-outline/40');
      }
    });
  };

  const updateTelemetry = () => {
    const stepLabel = document.getElementById('telemetry-step-label');
    const pctBadge = document.getElementById('telemetry-pct-badge');
    const progressBar = document.getElementById('telemetry-progress-bar');

    const pct = Math.round((currentStep / totalSteps) * 100);
    if (stepLabel) stepLabel.textContent = `Paso ${currentStep} de ${totalSteps}`;
    if (pctBadge) pctBadge.textContent = `${pct}% COMPLETADO`;
    if (progressBar) progressBar.style.width = `${pct}%`;
  };

  const nextStep = async () => {
    if (currentStep < totalSteps) {
      currentStep++;
      updateTelemetry();
      App.showToast(`Avanzando a Paso ${currentStep}`);
    } else {
      await submitSurvey();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      currentStep--;
      updateTelemetry();
    }
  };

  const submitSurvey = async () => {
    const btnNext = document.getElementById('btn-next-step');
    if (btnNext) {
      btnNext.disabled = true;
      btnNext.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Enviando...';
    }

    const payload = {
      encuesta_id: state.encuestaId,
      ubigeo: {
        departamento: state.departamentoNombre,
        provincia: state.provinciaNombre,
        distrito: state.distritoNombre,
        codigo_distrito: state.distrito
      },
      respuestas: state.respuestas,
      tiempo_llenado_segundos: 165
    };

    const res = await API.submitRespuesta(payload);

    if (btnNext) {
      btnNext.disabled = false;
      btnNext.innerHTML = '<span>Completar Encuesta</span><span class="material-symbols-outlined text-lg">check</span>';
    }

    showSubmissionSuccessModal(res);
  };

  const showSubmissionSuccessModal = (receipt) => {
    const modal = document.getElementById('receipt-modal');
    if (!modal) {
      App.showToast('¡Encuesta enviada con éxito!', 'success');
      return;
    }
    const receiptCode = document.getElementById('receipt-hash-code');
    if (receiptCode) receiptCode.textContent = receipt.recibo_id || 'OMNI-HASH-9812A';

    const receiptUbigeo = document.getElementById('receipt-ubigeo-text');
    if (receiptUbigeo) receiptUbigeo.textContent = `${state.departamentoNombre} > ${state.provinciaNombre} > ${state.distritoNombre} (${state.distrito})`;

    modal.classList.add('active');
  };

  return { init, submitSurvey };
})();
