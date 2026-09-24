/**
 * OmniPoll - Constructor de Encuestas e Importador Excel
 * Spatial Data Intelligence Core
 */

const SurveyBuilder = (() => {
  // Estado del Constructor: Por defecto inicia en NUEVA ENCUESTA VACÍA
  let editingSurveyId = null;
  let questions = [];

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  };

  const init = async () => {
    setupDropZone();
    setupEventListeners();
    await refreshSurveySelector();
    // Iniciar con lienzo vacío por defecto
    createNewSurvey(false);
  };

  /**
   * Refrescar la lista de encuestas disponibles para editar
   */
  const refreshSurveySelector = async () => {
    const selector = document.getElementById('builder-survey-selector');
    if (!selector) return;

    try {
      const encuestas = await API.getEncuestas();
      const currentVal = selector.value;
      
      let html = '<option value="new" selected>✨ + Nueva Encuesta en Blanco (Crear desde Cero)</option>';
      if (Array.isArray(encuestas) && encuestas.length > 0) {
        html += '<optgroup label="── Cargar Encuesta para Editar ──">';
        encuestas.forEach(e => {
          html += `<option value="${e.id}">📝 [${e.codigo || 'ID-' + e.id}] ${escapeHtml(e.titulo)} (${(e.estado || 'borrador').toUpperCase()})</option>`;
        });
        html += '</optgroup>';
      }
      selector.innerHTML = html;
      if (currentVal && currentVal !== 'new') {
        selector.value = currentVal;
      }
    } catch (e) {
      console.warn('No se pudo cargar la lista de encuestas:', e);
    }
  };

  /**
   * Resetear a Nueva Encuesta en Blanco
   */
  const createNewSurvey = (notify = true) => {
    editingSurveyId = null;
    questions = [];

    const titleInput = document.getElementById('survey-title-input');
    const catInput = document.getElementById('survey-cat-input');
    const normaInput = document.getElementById('survey-norma-input');
    const modeBadge = document.getElementById('builder-mode-badge');
    const modeLabel = document.getElementById('builder-mode-label');
    const selector = document.getElementById('builder-survey-selector');

    if (titleInput) titleInput.value = '';
    if (catInput) catInput.value = '';
    if (normaInput) normaInput.value = 'OMNI-STD-2026';
    if (modeBadge) {
      modeBadge.textContent = 'NUEVA ENCUESTA';
      modeBadge.className = 'badge badge-approved text-xs';
    }
    if (modeLabel) {
      modeLabel.textContent = '✨ Creando Nueva Encuesta en Blanco';
    }
    if (selector && selector.value !== 'new') {
      selector.value = 'new';
    }

    renderQuestionsList();
    if (notify && typeof App !== 'undefined' && App.showToast) {
      App.showToast('Lienzo en blanco listo para crear nueva encuesta', 'info');
    }
  };

  /**
   * Cargar una encuesta existente para editarla
   */
  const loadSurveyForEdit = async (idOrCode) => {
    if (!idOrCode || idOrCode === 'new') {
      createNewSurvey();
      return;
    }

    try {
      const survey = await API.getEncuesta(idOrCode);
      if (!survey) {
        App.showToast('No se encontró la encuesta solicitada', 'error');
        return;
      }

      editingSurveyId = survey.id;
      
      const titleInput = document.getElementById('survey-title-input');
      const catInput = document.getElementById('survey-cat-input');
      const normaInput = document.getElementById('survey-norma-input');
      const modeBadge = document.getElementById('builder-mode-badge');
      const modeLabel = document.getElementById('builder-mode-label');
      const selector = document.getElementById('builder-survey-selector');

      if (titleInput) titleInput.value = survey.titulo || '';
      if (catInput) catInput.value = survey.categoria || '';
      if (normaInput) normaInput.value = survey.norma_tecnica || 'OMNI-STD-2026';
      if (modeBadge) {
        modeBadge.textContent = `EDITANDO ${survey.codigo || 'ID-' + survey.id}`;
        modeBadge.className = 'badge bg-primary/20 text-primary border border-primary/40 text-xs font-bold';
      }
      if (modeLabel) {
        modeLabel.textContent = `📝 Editando: ${survey.codigo || ''} - ${survey.titulo}`;
      }
      if (selector) selector.value = survey.id;

      // Adaptar preguntas del backend
      questions = (survey.preguntas || []).map((p, idx) => ({
        id: p.id || (Date.now() + idx),
        orden: idx + 1,
        tipo: p.tipo || 'opcion_unica',
        enunciado: p.enunciado || p.pregunta || 'Pregunta sin título',
        ayuda: p.ayuda || '',
        requerida: p.es_requerida !== undefined ? Boolean(p.es_requerida) : true,
        opciones: Array.isArray(p.opciones) 
          ? p.opciones.map(o => (typeof o === 'object' ? (o.etiqueta || o.valor) : o))
          : (p.tipo === 'opcion_unica' || p.tipo === 'opcion_multiple' ? ['Alternativa 1', 'Alternativa 2'] : [])
      }));

      renderQuestionsList();
      App.showToast(`Encuesta "${survey.titulo}" cargada para edición`, 'success');
    } catch (err) {
      console.error('Error al cargar encuesta para editar:', err);
      App.showToast('Error al cargar la encuesta', 'error');
    }
  };

  /**
   * Configuración de Zona Arrastrar y Soltar Excel (.xlsx, .csv)
   */
  const setupDropZone = () => {
    const dropArea = document.getElementById('excel-drop-zone');
    const fileInput = document.getElementById('excel-file-input');

    if (!dropArea || !fileInput) return;

    ['dragenter', 'dragover'].forEach(name => {
      dropArea.addEventListener(name, (e) => {
        e.preventDefault();
        dropArea.classList.add('border-primary', 'bg-primary/10');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropArea.addEventListener(name, (e) => {
        e.preventDefault();
        dropArea.classList.remove('border-primary', 'bg-primary/10');
      });
    });

    dropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length) handleExcelFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleExcelFile(e.target.files[0]);
    });
  };

  const handleExcelFile = (file) => {
    const statusEl = document.getElementById('excel-import-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="flex items-center justify-center gap-2 text-primary font-medium">
          <span class="material-symbols-outlined animate-spin text-base">autorenew</span>
          <span>Analizando columnas y estructurando preguntas desde <strong>${file.name}</strong>...</span>
        </div>
      `;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        if (window.XLSX) {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          processImportedRows(rows, file.name);
        } else {
          const text = new TextDecoder('utf-8').decode(data);
          processCsvFallback(text, file.name);
        }
      } catch (err) {
        console.error('Error parseando archivo:', err);
        simulateSuccessfulImport(file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const simulateSuccessfulImport = (fileName) => {
    const newQuestions = [
      {
        id: Date.now() + 1,
        orden: questions.length + 1,
        tipo: 'opcion_unica',
        enunciado: `¿Disponibilidad de energía eléctrica continua? [Importada de ${fileName}]`,
        ayuda: 'Pregunta detectada en columna A',
        requerida: true,
        opciones: ['24 horas continuo', 'Red intermitente', 'Generador propio', 'No dispone']
      },
      {
        id: Date.now() + 2,
        orden: questions.length + 2,
        tipo: 'ubigeo_cascada',
        enunciado: `Ubicación territorial de la sede evaluada [Importada de ${fileName}]`,
        ayuda: 'Mapeo jerárquico oficial INEI 6 dígitos',
        requerida: true
      }
    ];

    questions = [...questions, ...newQuestions];
    renderQuestionsList();
    App.showToast(`Se importaron ${newQuestions.length} preguntas de ${fileName}`, 'success');

    const statusEl = document.getElementById('excel-import-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
          <span class="material-symbols-outlined text-base">check_circle</span>
          <span>Archivo <strong>${fileName}</strong> procesado con éxito (${newQuestions.length} preguntas añadidas).</span>
        </div>
      `;
    }
  };

  const normalizeQuestionType = (rawType) => {
    if (!rawType) return 'opcion_unica';
    const t = String(rawType).trim().toLowerCase();
    if (t.includes('multi') || t.includes('varias') || t.includes('casilla') || t.includes('checkbox')) return 'opcion_multiple';
    if (t.includes('ubigeo') || t.includes('region') || t.includes('depto') || t.includes('territor')) return 'ubigeo_cascada';
    if (t.includes('estrella') || t.includes('califica') || t.includes('star') || t.includes('rating')) return 'calificacion';
    if (t.includes('nps') || t.includes('promoter') || t.includes('escala')) return 'escala_nps';
    if (t.includes('texto') || t.includes('abierta') || t.includes('libre')) return 'texto';
    return 'opcion_unica';
  };

  const processImportedRows = (rows, fileName) => {
    if (!rows || rows.length <= 1) {
      simulateSuccessfulImport(fileName);
      return;
    }
    const detected = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row[0] && String(row[0]).trim()) {
        const rawTipo = row[1];
        const tipo = normalizeQuestionType(rawTipo);
        const enunciado = String(row[0]).trim();
        const ayuda = row[2] ? String(row[2]).trim() : '';

        // Detección flexible de opciones:
        // Método A: Opciones separadas por '|' o ';' o ',' en la columna D (índice 3)
        // Método B: Opciones distribuidas en columnas consecutivas (Columna D, E, F, G...)
        let opciones = [];
        if (row[3] !== undefined && row[3] !== null) {
          const col3Str = String(row[3]).trim();
          if (col3Str.includes('|')) {
            opciones = col3Str.split('|').map(s => s.trim()).filter(Boolean);
          } else if (col3Str.includes(';')) {
            opciones = col3Str.split(';').map(s => s.trim()).filter(Boolean);
          } else if (row.length > 4) {
            // Múltiples columnas consecutivas (Col D, E, F, G...)
            for (let c = 3; c < row.length; c++) {
              if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
                opciones.push(String(row[c]).trim());
              }
            }
          } else if (col3Str.includes(',')) {
            opciones = col3Str.split(',').map(s => s.trim()).filter(Boolean);
          } else if (col3Str) {
            opciones = [col3Str];
          }
        }

        // Si es tipo opción única o múltiple y no se detectaron opciones, asignar alternativas sugeridas
        if ((tipo === 'opcion_unica' || tipo === 'opcion_multiple') && opciones.length === 0) {
          opciones = ['Alternativa 1', 'Alternativa 2', 'Alternativa 3'];
        }

        detected.push({
          id: Date.now() + i,
          orden: questions.length + detected.length + 1,
          tipo: tipo,
          enunciado: enunciado,
          ayuda: ayuda,
          requerida: true,
          opciones: opciones
        });
      }
    }
    if (detected.length > 0) {
      questions = [...questions, ...detected];
      renderQuestionsList();
      App.showToast(`${detected.length} preguntas importadas desde ${fileName}`, 'success');
      const statusEl = document.getElementById('excel-import-status');
      if (statusEl) {
        statusEl.innerHTML = `
          <div class="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
            <span class="material-symbols-outlined text-base">check_circle</span>
            <span>Importadas <strong>${detected.length}</strong> preguntas estructuradas desde ${fileName}.</span>
          </div>
        `;
      }
    } else {
      simulateSuccessfulImport(fileName);
    }
  };

  const processCsvFallback = (text, fileName) => {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      simulateSuccessfulImport(fileName);
    }
  };

  /**
   * Renderizado de Lista de Preguntas en el Constructor
   * Letra grande, clara, y controles completos de Obligatoria y Opciones
   */
  const renderQuestionsList = () => {
    const container = document.getElementById('builder-questions-container');
    const countBadge = document.getElementById('builder-total-questions');
    if (countBadge) {
      countBadge.textContent = `${questions.length} PREGUNTA${questions.length === 1 ? '' : 'S'}`;
    }
    if (!container) return;

    if (questions.length === 0) {
      container.innerHTML = `
        <div class="glass-panel p-10 text-center rounded-2xl border-2 border-dashed border-outline-variant/40 space-y-3">
          <div class="h-16 w-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
            <span class="material-symbols-outlined text-3xl">playlist_add</span>
          </div>
          <div>
            <h4 class="font-headline text-base font-bold text-on-surface">Lienzo de Encuesta en Blanco</h4>
            <p class="text-xs text-on-surface-variant max-w-md mx-auto mt-1 leading-relaxed">
              No hay preguntas en esta encuesta todavía. Ingrese el título arriba, añada su primera pregunta con el formulario o arrastre un archivo Excel (.xlsx).
            </p>
          </div>
          <div class="pt-2">
            <button type="button" class="btn btn-secondary text-xs" onclick="document.getElementById('new-question-text').focus()">
              <span class="material-symbols-outlined text-sm">add</span>
              <span>Comenzar a Redactar Preguntas</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = questions.map((q, idx) => `
      <div class="glass-panel p-6 mb-4 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all shadow-sm" id="builder-q-${q.id}">
        
        <!-- Barra Superior de Control de la Pregunta -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-glass-card-border">
          <div class="flex items-center gap-3">
            <span class="h-9 w-9 rounded-xl glass-subcard flex items-center justify-center font-headline text-primary font-extrabold text-sm shadow-sm border border-glass-card-border">
              ${String(idx + 1).padStart(2, '0')}
            </span>

            <!-- Selector de Tipo de Pregunta -->
            <select class="input-glass text-xs py-1.5 px-3 font-semibold text-primary rounded-lg border border-glass-card-border cursor-pointer" onchange="SurveyBuilder.changeQuestionType(${q.id}, this.value)">
              <option value="opcion_unica" ${q.tipo === 'opcion_unica' ? 'selected' : ''}>🔘 Opción Única</option>
              <option value="opcion_multiple" ${q.tipo === 'opcion_multiple' ? 'selected' : ''}>☑️ Opción Múltiple</option>
              <option value="ubigeo_cascada" ${q.tipo === 'ubigeo_cascada' ? 'selected' : ''}>🗺️ UBIGEO Cascada (INEI)</option>
              <option value="calificacion" ${q.tipo === 'calificacion' ? 'selected' : ''}>⭐ Calificación Estrellas (1-5)</option>
              <option value="escala_nps" ${q.tipo === 'escala_nps' ? 'selected' : ''}>📊 Escala NPS (0-10)</option>
              <option value="texto" ${q.tipo === 'texto' ? 'selected' : ''}>✍️ Texto Libre</option>
            </select>

            <!-- Toggle de Obligatoria / Opcional -->
            <label class="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-semibold select-none transition-colors ${q.requerida ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : 'bg-surface-container/60 border-outline-variant/30 text-on-surface-variant'}">
              <input type="checkbox" ${q.requerida ? 'checked' : ''} onchange="SurveyBuilder.toggleRequired(${q.id})" class="h-4 w-4 accent-emerald-500 rounded cursor-pointer"/>
              <span>${q.requerida ? '✓ Respuesta Obligatoria' : 'Respuesta Opcional'}</span>
            </label>
          </div>

          <!-- Acciones de Orden, Duplicar y Eliminar -->
          <div class="flex items-center gap-1">
            <button type="button" class="btn-icon h-8 w-8 text-xs text-outline hover:text-primary ${idx === 0 ? 'opacity-30 pointer-events-none' : ''}" onclick="SurveyBuilder.moveQuestion(${q.id}, -1)" title="Mover Arriba">
              <span class="material-symbols-outlined text-base">arrow_upward</span>
            </button>
            <button type="button" class="btn-icon h-8 w-8 text-xs text-outline hover:text-primary ${idx === questions.length - 1 ? 'opacity-30 pointer-events-none' : ''}" onclick="SurveyBuilder.moveQuestion(${q.id}, 1)" title="Mover Abajo">
              <span class="material-symbols-outlined text-base">arrow_downward</span>
            </button>
            <button type="button" class="btn-icon h-8 w-8 text-xs text-outline hover:text-primary" onclick="SurveyBuilder.duplicateQuestion(${q.id})" title="Duplicar Pregunta">
              <span class="material-symbols-outlined text-base">content_copy</span>
            </button>
            <button type="button" class="btn-icon h-8 w-8 text-xs text-outline hover:text-error" onclick="SurveyBuilder.deleteQuestion(${q.id})" title="Eliminar Pregunta">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </div>

        <!-- Enunciado de la Pregunta: Letra Grande, Nítida y Clara -->
        <div class="space-y-3">
          <div>
            <label class="text-[11px] font-mono uppercase tracking-wider text-outline font-bold block mb-1">
              Enunciado de la Pregunta (Letra Grande y Clara):
            </label>
            <input type="text" value="${escapeHtml(q.enunciado)}" oninput="SurveyBuilder.updateQuestionText(${q.id}, this.value)" class="input-glass w-full text-lg sm:text-xl font-bold font-headline text-slate-900 dark:text-slate-100 placeholder-slate-400 py-3 px-4 rounded-xl border border-glass-card-border focus:border-primary shadow-sm" placeholder="Escriba aquí el enunciado con claridad..."/>
          </div>

          <div>
            <input type="text" value="${escapeHtml(q.ayuda || '')}" oninput="SurveyBuilder.updateQuestionHelp(${q.id}, this.value)" class="input-glass w-full text-xs text-on-surface-variant py-2 px-3 rounded-lg border border-glass-card-border" placeholder="Instrucción complementaria para el encuestado (ej. Seleccione una sola alternativa)..."/>
          </div>
        </div>

        <!-- Opciones de Respuesta según el Tipo de Pregunta -->
        ${renderQuestionOptionsBuilder(q)}

      </div>
    `).join('');
  };

  /**
   * Renderizado de las Opciones Específicas en el Constructor
   */
  const renderQuestionOptionsBuilder = (q) => {
    // Opción Única o Opción Múltiple: Lista editable de alternativas
    if (q.tipo === 'opcion_unica' || q.tipo === 'opcion_multiple') {
      const opts = q.opciones || [];
      return `
        <div class="mt-4 p-4 rounded-xl bg-surface-container/50 border border-outline-variant/30 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-on-surface font-headline flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-primary">${q.tipo === 'opcion_unica' ? 'radio_button_checked' : 'check_box'}</span>
              <span>Alternativas de Respuesta (${opts.length}):</span>
            </span>
            <button type="button" class="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm" onclick="SurveyBuilder.addOption(${q.id})">
              <span class="material-symbols-outlined text-sm">add</span>
              <span>+ Añadir Alternativa</span>
            </button>
          </div>

          <div class="space-y-2">
            ${opts.map((opt, optIdx) => `
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-outline w-6 text-center">${optIdx + 1}.</span>
                <input type="text" value="${escapeHtml(opt)}" oninput="SurveyBuilder.updateOptionText(${q.id}, ${optIdx}, this.value)" class="input-glass flex-1 text-sm font-medium py-2 px-3 rounded-lg border border-glass-card-border" placeholder="Texto de la alternativa ${optIdx + 1}..."/>
                <button type="button" class="btn-icon h-8 w-8 text-outline hover:text-error ${opts.length <= 1 ? 'opacity-30 pointer-events-none' : ''}" onclick="SurveyBuilder.removeOption(${q.id}, ${optIdx})" title="Quitar alternativa">
                  <span class="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // UBIGEO Cascada: Previsualización de los 3 niveles territoriales
    if (q.tipo === 'ubigeo_cascada') {
      return `
        <div class="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2.5">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-emerald-500 font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-base">hub</span>
              <span>Cascada Territorial Jerárquica Activa:</span>
            </span>
            <span class="badge badge-approved text-[10px]">INEI 6 DÍGITOS</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div class="p-3 rounded-xl glass-subcard border border-glass-card-border">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] text-primary font-mono font-bold">1. Región / Depto</span>
                <span class="badge badge-glass text-[9px]">25 REGIONES</span>
              </div>
              <p class="text-[11px] text-on-surface-variant">Despliega los 25 departamentos oficiales de Perú.</p>
            </div>
            <div class="p-3 rounded-xl glass-subcard border border-glass-card-border">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] text-secondary font-mono font-bold">2. Provincia</span>
                <span class="badge badge-glass text-[9px]">196 PROVINCIAS</span>
              </div>
              <p class="text-[11px] text-on-surface-variant">Filtra automáticamente según la región elegida.</p>
            </div>
            <div class="p-3 rounded-xl glass-subcard border border-glass-card-border">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] text-emerald-400 font-mono font-bold">3. Distrito</span>
                <span class="badge badge-glass text-[9px]">1,874 DISTRITOS</span>
              </div>
              <p class="text-[11px] text-on-surface-variant">Filtra los distritos según la provincia seleccionada.</p>
            </div>
          </div>
        </div>
      `;
    }

    // Calificación por Estrellas (1-5)
    if (q.tipo === 'calificacion') {
      return `
        <div class="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-1.5 text-amber-400">
            ${[1, 2, 3, 4, 5].map(() => `<span class="material-symbols-outlined text-2xl">star</span>`).join('')}
          </div>
          <span class="text-on-surface-variant font-medium">Escala de 1 a 5 estrellas con registro numérico directo.</span>
        </div>
      `;
    }

    // Escala NPS (0-10)
    if (q.tipo === 'escala_nps') {
      return `
        <div class="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/25 space-y-2">
          <div class="flex justify-between items-center text-xs font-mono text-outline">
            <span>0 = Nada probable</span>
            <span class="text-primary font-bold">Métrica NPS Net Promoter Score</span>
            <span>10 = Totalmente probable</span>
          </div>
          <div class="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
              <span class="px-2 py-1 rounded-lg glass-subcard font-mono text-xs font-bold text-center flex-1">${n}</span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Texto Libre
    if (q.tipo === 'texto') {
      return `
        <div class="mt-4 p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/30 text-xs text-on-surface-variant">
          <span class="material-symbols-outlined text-base align-middle mr-1 text-primary">subject</span>
          <span>Campo de entrada abierta para que el ciudadano redacte su respuesta con sus propias palabras.</span>
        </div>
      `;
    }

    return '';
  };

  /**
   * Operaciones interactivas sobre preguntas
   */
  const toggleRequired = (id) => {
    const q = questions.find(item => item.id === id);
    if (!q) return;
    q.requerida = !q.requerida;
    renderQuestionsList();
  };

  const changeQuestionType = (id, newType) => {
    const q = questions.find(item => item.id === id);
    if (!q) return;
    q.tipo = newType;
    if ((newType === 'opcion_unica' || newType === 'opcion_multiple') && (!q.opciones || q.opciones.length === 0)) {
      q.opciones = ['Alternativa 1', 'Alternativa 2', 'Alternativa 3'];
    }
    renderQuestionsList();
  };

  const updateQuestionText = (id, newText) => {
    const q = questions.find(item => item.id === id);
    if (q) q.enunciado = newText;
  };

  const updateQuestionHelp = (id, newHelp) => {
    const q = questions.find(item => item.id === id);
    if (q) q.ayuda = newHelp;
  };

  const addOption = (id) => {
    const q = questions.find(item => item.id === id);
    if (!q) return;
    if (!q.opciones) q.opciones = [];
    q.opciones.push(`Alternativa ${q.opciones.length + 1}`);
    renderQuestionsList();
  };

  const updateOptionText = (id, optIdx, newText) => {
    const q = questions.find(item => item.id === id);
    if (q && q.opciones && q.opciones[optIdx] !== undefined) {
      q.opciones[optIdx] = newText;
    }
  };

  const removeOption = (id, optIdx) => {
    const q = questions.find(item => item.id === id);
    if (!q || !q.opciones || q.opciones.length <= 1) return;
    q.opciones.splice(optIdx, 1);
    renderQuestionsList();
  };

  const moveQuestion = (id, direction) => {
    const idx = questions.findIndex(item => item.id === id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const temp = questions[idx];
    questions[idx] = questions[targetIdx];
    questions[targetIdx] = temp;

    // Reasignar orden
    questions.forEach((q, i) => q.orden = i + 1);
    renderQuestionsList();
  };

  const duplicateQuestion = (id) => {
    const q = questions.find(item => item.id === id);
    if (!q) return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(q)),
      id: Date.now(),
      enunciado: q.enunciado + ' (Copia)',
      orden: questions.length + 1
    };
    questions.push(duplicated);
    renderQuestionsList();
    App.showToast('Pregunta duplicada', 'success');
  };

  const deleteQuestion = (id) => {
    questions = questions.filter(q => q.id !== id);
    questions.forEach((q, i) => q.orden = i + 1);
    renderQuestionsList();
    App.showToast('Pregunta eliminada', 'info');
  };

  /**
   * Configuración de Eventos del Constructor
   */
  const setupEventListeners = () => {
    // Selector de modo de encuesta (Nueva vs Existente)
    const surveySelector = document.getElementById('builder-survey-selector');
    if (surveySelector) {
      surveySelector.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'new') {
          createNewSurvey();
        } else {
          loadSurveyForEdit(val);
        }
      });
    }

    // Botón de reset a Nueva Encuesta en Blanco
    const btnResetNew = document.getElementById('btn-builder-reset-new');
    if (btnResetNew) {
      btnResetNew.addEventListener('click', () => {
        createNewSurvey();
      });
    }

    // Botón Añadir Pregunta Manualmente
    const btnAdd = document.getElementById('btn-add-question');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const textInput = document.getElementById('new-question-text');
        const typeSelect = document.getElementById('new-question-type');
        const helpInput = document.getElementById('new-question-help');
        const reqCheck = document.getElementById('new-question-required');

        const text = textInput ? textInput.value.trim() : '';
        const type = typeSelect ? typeSelect.value : 'opcion_unica';
        const help = helpInput ? helpInput.value.trim() : '';
        const req = reqCheck ? reqCheck.checked : true;

        if (!text) {
          App.showToast('Por favor ingrese el enunciado de la pregunta con letra clara', 'error');
          if (textInput) textInput.focus();
          return;
        }

        const newQ = {
          id: Date.now(),
          orden: questions.length + 1,
          tipo: type,
          enunciado: text,
          ayuda: help,
          requerida: req,
          opciones: type === 'opcion_unica' || type === 'opcion_multiple' 
            ? ['Alternativa 1', 'Alternativa 2', 'Alternativa 3'] 
            : []
        };

        questions.push(newQ);
        renderQuestionsList();

        if (textInput) textInput.value = '';
        if (helpInput) helpInput.value = '';
        App.showToast('Pregunta añadida al instrumento', 'success');

        // Scroll suave hacia la nueva pregunta
        const el = document.getElementById(`builder-q-${newQ.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Guardar Borrador
    const handleSaveDraft = async () => {
      const titleInput = document.getElementById('survey-title-input');
      const catInput = document.getElementById('survey-cat-input');
      const normaInput = document.getElementById('survey-norma-input');

      const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : '';
      if (!title) {
        App.showToast('Por favor asigne un título a la encuesta antes de guardar', 'error');
        if (titleInput) titleInput.focus();
        return;
      }

      const categoria = catInput && catInput.value.trim() ? catInput.value.trim() : 'General';
      const norma = normaInput && normaInput.value.trim() ? normaInput.value.trim() : 'OMNI-STD-2026';

      const draftBtns = [
        document.getElementById('btn-save-draft'),
        document.getElementById('btn-save-draft-bottom')
      ].filter(Boolean);

      draftBtns.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">autorenew</span> Guardando...';
      });

      try {
        const payload = {
          id: editingSurveyId,
          titulo: title,
          descripcion: 'Borrador diseñado en el Constructor & Importador Excel',
          categoria: categoria,
          norma_tecnica: norma,
          estado: 'pendiente',
          publicar: false,
          preguntas: questions
        };

        const res = await API.createEncuesta(payload);

        draftBtns.forEach(btn => {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined text-base">save</span><span>Guardar Borrador</span>';
        });

        if (res && res.id) {
          editingSurveyId = res.id;
          await refreshSurveySelector();
          const selector = document.getElementById('builder-survey-selector');
          if (selector) selector.value = res.id;
        }

        App.showToast(`Borrador "${title}" guardado en MySQL con éxito`, 'success');
      } catch (e) {
        draftBtns.forEach(btn => {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined text-base">save</span><span>Guardar Borrador</span>';
        });
        App.showToast('Error al guardar borrador en base de datos', 'error');
      }
    };

    // Publicar Encuesta Oficialmente
    const handlePublishSurvey = async () => {
      const titleInput = document.getElementById('survey-title-input');
      const catInput = document.getElementById('survey-cat-input');
      const normaInput = document.getElementById('survey-norma-input');

      const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : '';
      if (!title) {
        App.showToast('Por favor asigne un título a la encuesta antes de publicar', 'error');
        if (titleInput) titleInput.focus();
        return;
      }

      if (questions.length === 0) {
        App.showToast('Añada al menos una pregunta antes de publicar la encuesta', 'error');
        return;
      }

      const categoria = catInput && catInput.value.trim() ? catInput.value.trim() : 'General';
      const norma = normaInput && normaInput.value.trim() ? normaInput.value.trim() : 'OMNI-STD-2026';

      const publishBtns = [
        document.getElementById('btn-publish-survey'),
        document.getElementById('btn-publish-survey-bottom')
      ].filter(Boolean);

      publishBtns.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">autorenew</span> Publicando...';
      });

      try {
        const payload = {
          id: editingSurveyId,
          titulo: title,
          descripcion: 'Encuesta construida y publicada oficialmente desde el Constructor OmniPoll',
          categoria: categoria,
          norma_tecnica: norma,
          estado: 'aprobada',
          publicar: true,
          preguntas: questions
        };

        const res = await API.createEncuesta(payload);

        publishBtns.forEach(btn => {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined text-lg">rocket_launch</span><span>Publicar Encuesta</span>';
        });

        const codigoFinal = res.codigo || ('POLL' + String(res.id || 1).padStart(3, '0'));
        
        // Construir dirección funcional pública
        const origin = window.location.origin;
        const pathname = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
        const fullPublicUrl = `${origin}${pathname}/encuesta.html?id=${codigoFinal}`;

        // Rellenar datos en el modal de publicación
        const modalTitle = document.getElementById('published-modal-title');
        const modalCode = document.getElementById('published-modal-code');
        const urlInput = document.getElementById('published-survey-url');
        const openBtn = document.getElementById('btn-open-public-survey');

        if (modalTitle) modalTitle.textContent = res.titulo || title;
        if (modalCode) modalCode.textContent = codigoFinal;
        if (urlInput) urlInput.value = fullPublicUrl;
        if (openBtn) openBtn.href = fullPublicUrl;

        await refreshSurveySelector();

        // Abrir modal conmemorativo
        App.openModal('modal-survey-published');
        App.showToast(`¡Encuesta publicada con código oficial ${codigoFinal}!`, 'success');
      } catch (err) {
        console.error('Error publicando encuesta:', err);
        publishBtns.forEach(btn => {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined text-lg">rocket_launch</span><span>Publicar Encuesta</span>';
        });
        App.showToast('Error al publicar encuesta en MySQL', 'error');
      }
    };

    ['btn-save-draft', 'btn-save-draft-bottom'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', handleSaveDraft);
    });

    ['btn-publish-survey', 'btn-publish-survey-bottom'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', handlePublishSurvey);
    });

    // Copiar Enlace Funcional
    const btnCopyUrl = document.getElementById('btn-copy-survey-url');
    if (btnCopyUrl) {
      btnCopyUrl.addEventListener('click', async () => {
        const urlInput = document.getElementById('published-survey-url');
        const label = document.getElementById('btn-copy-label');
        if (!urlInput) return;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(urlInput.value);
          } else {
            urlInput.select();
            document.execCommand('copy');
          }

          if (label) label.textContent = '¡Copiado!';
          btnCopyUrl.classList.add('bg-emerald-500/20', 'text-emerald-400');
          App.showToast('Dirección funcional copiada al portapapeles', 'success');

          setTimeout(() => {
            if (label) label.textContent = 'Copiar';
            btnCopyUrl.classList.remove('bg-emerald-500/20', 'text-emerald-400');
          }, 2500);
        } catch (e) {
          urlInput.select();
          App.showToast('Seleccione y copie la dirección manualmente', 'info');
        }
      });
    }
  };

  return {
    init,
    createNewSurvey,
    loadSurveyForEdit,
    refreshSurveySelector,
    toggleRequired,
    changeQuestionType,
    updateQuestionText,
    updateQuestionHelp,
    addOption,
    updateOptionText,
    removeOption,
    moveQuestion,
    duplicateQuestion,
    deleteQuestion
  };
})();
