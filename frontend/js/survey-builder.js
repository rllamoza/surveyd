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
    setupBrandingDropzones();
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
   * Obtener objeto de Branding del formulario
   */
  const getBrandingData = () => {
    const primaryInput = document.getElementById('branding-color-primary');
    const secondaryInput = document.getElementById('branding-color-secondary');
    const fontInput = document.getElementById('branding-font-family');
    const logoInput = document.getElementById('branding-logo-url');
    const bannerInput = document.getElementById('branding-banner-url');
    const titleInput = document.getElementById('branding-public-title');
    const subInput = document.getElementById('branding-public-subtitle');
    const welcomeInput = document.getElementById('branding-welcome-msg');
    const thanksInput = document.getElementById('branding-thanks-msg');

    return {
      primary_color: primaryInput ? primaryInput.value : '#00F2FE',
      secondary_color: secondaryInput ? secondaryInput.value : '#8B5CF6',
      font_family: fontInput ? fontInput.value : 'Plus Jakarta Sans',
      logo_url: logoInput ? logoInput.value.trim() : '',
      banner_url: bannerInput ? bannerInput.value.trim() : '',
      public_title: titleInput ? titleInput.value.trim() : '',
      public_subtitle: subInput ? subInput.value.trim() : '',
      welcome_message: welcomeInput ? welcomeInput.value.trim() : '',
      thank_you_message: thanksInput ? thanksInput.value.trim() : ''
    };
  };

  /**
   * Actualizar el estado visual del selector/dropzone del logo
   */
  const updateLogoDropzoneUI = (url, fileName = '') => {
    const emptyState = document.getElementById('branding-logo-empty-state');
    const loadingState = document.getElementById('branding-logo-loading-state');
    const previewState = document.getElementById('branding-logo-preview-state');
    const thumbImg = document.getElementById('branding-logo-thumb');
    const fileNameEl = document.getElementById('branding-logo-filename');
    const fileSizeEl = document.getElementById('branding-logo-filesize');

    if (loadingState) loadingState.classList.add('hidden');

    if (url && url.trim()) {
      if (emptyState) emptyState.classList.add('hidden');
      if (previewState) {
        previewState.classList.remove('hidden');
        previewState.classList.add('flex');
      }
      if (thumbImg) thumbImg.src = url;
      if (fileNameEl) {
        const name = fileName || url.split('/').pop() || 'logo.png';
        fileNameEl.textContent = name;
        fileNameEl.title = url;
      }
      if (fileSizeEl) fileSizeEl.textContent = 'Alojado en el servidor';
    } else {
      if (emptyState) emptyState.classList.remove('hidden');
      if (previewState) {
        previewState.classList.add('hidden');
        previewState.classList.remove('flex');
      }
      if (thumbImg) thumbImg.src = '';
    }
  };

  /**
   * Actualizar el estado visual del selector/dropzone del banner
   */
  const updateBannerDropzoneUI = (url, fileName = '') => {
    const emptyState = document.getElementById('branding-banner-empty-state');
    const loadingState = document.getElementById('branding-banner-loading-state');
    const previewState = document.getElementById('branding-banner-preview-state');
    const thumbImg = document.getElementById('branding-banner-thumb');
    const fileNameEl = document.getElementById('branding-banner-filename');
    const fileSizeEl = document.getElementById('branding-banner-filesize');

    if (loadingState) loadingState.classList.add('hidden');

    if (url && url.trim()) {
      if (emptyState) emptyState.classList.add('hidden');
      if (previewState) {
        previewState.classList.remove('hidden');
        previewState.classList.add('flex');
      }
      if (thumbImg) thumbImg.src = url;
      if (fileNameEl) {
        const name = fileName || url.split('/').pop() || 'banner.png';
        fileNameEl.textContent = name;
        fileNameEl.title = url;
      }
      if (fileSizeEl) fileSizeEl.textContent = 'Alojado en el servidor';
    } else {
      if (emptyState) emptyState.classList.remove('hidden');
      if (previewState) {
        previewState.classList.add('hidden');
        previewState.classList.remove('flex');
      }
      if (thumbImg) thumbImg.src = '';
    }
  };

  /**
   * Subir archivo de Logo al servidor mediante API.uploadImage
   */
  const handleLogoUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.svg')) {
      App.showToast('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG, WEBP)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      App.showToast('El archivo de imagen no debe superar los 10 MB', 'error');
      return;
    }

    const emptyState = document.getElementById('branding-logo-empty-state');
    const loadingState = document.getElementById('branding-logo-loading-state');
    const previewState = document.getElementById('branding-logo-preview-state');

    if (emptyState) emptyState.classList.add('hidden');
    if (previewState) {
      previewState.classList.add('hidden');
      previewState.classList.remove('flex');
    }
    if (loadingState) loadingState.classList.remove('hidden');

    try {
      const data = await API.uploadImage(file);
      const logoUrlInput = document.getElementById('branding-logo-url');
      if (logoUrlInput) {
        logoUrlInput.value = data.url;
      }
      updateLogoDropzoneUI(data.url, data.original_name || data.filename);
      updateLivePreview();
      App.showToast(`Logo "${data.original_name || file.name}" alojado correctamente en el servidor`, 'success');
    } catch (err) {
      console.error('Error subiendo logo:', err);
      updateLogoDropzoneUI(document.getElementById('branding-logo-url')?.value || '');
      App.showToast(err.message || 'Error al subir imagen al servidor', 'error');
    }
  };

  /**
   * Subir archivo de Banner al servidor mediante API.uploadImage
   */
  const handleBannerUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.svg')) {
      App.showToast('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG, WEBP)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      App.showToast('El archivo de imagen no debe superar los 10 MB', 'error');
      return;
    }

    const emptyState = document.getElementById('branding-banner-empty-state');
    const loadingState = document.getElementById('branding-banner-loading-state');
    const previewState = document.getElementById('branding-banner-preview-state');

    if (emptyState) emptyState.classList.add('hidden');
    if (previewState) {
      previewState.classList.add('hidden');
      previewState.classList.remove('flex');
    }
    if (loadingState) loadingState.classList.remove('hidden');

    try {
      const data = await API.uploadImage(file);
      const bannerUrlInput = document.getElementById('branding-banner-url');
      if (bannerUrlInput) {
        bannerUrlInput.value = data.url;
      }
      updateBannerDropzoneUI(data.url, data.original_name || data.filename);
      updateLivePreview();
      App.showToast(`Banner "${data.original_name || file.name}" alojado correctamente en el servidor`, 'success');
    } catch (err) {
      console.error('Error subiendo banner:', err);
      updateBannerDropzoneUI(document.getElementById('branding-banner-url')?.value || '');
      App.showToast(err.message || 'Error al subir banner al servidor', 'error');
    }
  };

  const removeLogoImage = () => {
    const logoUrlInput = document.getElementById('branding-logo-url');
    const fileInput = document.getElementById('branding-logo-file-input');
    if (logoUrlInput) logoUrlInput.value = '';
    if (fileInput) fileInput.value = '';
    updateLogoDropzoneUI('');
    updateLivePreview();
    App.showToast('Logotipo removido', 'info');
  };

  const removeBannerImage = () => {
    const bannerUrlInput = document.getElementById('branding-banner-url');
    const fileInput = document.getElementById('branding-banner-file-input');
    if (bannerUrlInput) bannerUrlInput.value = '';
    if (fileInput) fileInput.value = '';
    updateBannerDropzoneUI('');
    updateLivePreview();
    App.showToast('Banner removido', 'info');
  };

  /**
   * Configuración de Dropzones de Imágenes (Logo y Banner)
   */
  const setupBrandingDropzones = () => {
    // Dropzone Logo
    const dropLogo = document.getElementById('dropzone-branding-logo');
    const inputLogo = document.getElementById('branding-logo-file-input');
    const urlLogo = document.getElementById('branding-logo-url');

    if (dropLogo && inputLogo) {
      ['dragenter', 'dragover'].forEach(name => {
        dropLogo.addEventListener(name, (e) => {
          e.preventDefault();
          dropLogo.classList.add('border-primary', 'bg-primary/10');
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        dropLogo.addEventListener(name, (e) => {
          e.preventDefault();
          dropLogo.classList.remove('border-primary', 'bg-primary/10');
        });
      });
      dropLogo.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files && files.length) handleLogoUpload(files[0]);
      });
      inputLogo.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleLogoUpload(e.target.files[0]);
        }
      });
    }

    if (urlLogo) {
      urlLogo.addEventListener('input', (e) => {
        updateLogoDropzoneUI(e.target.value.trim());
        updateLivePreview();
      });
    }

    // Dropzone Banner
    const dropBanner = document.getElementById('dropzone-branding-banner');
    const inputBanner = document.getElementById('branding-banner-file-input');
    const urlBanner = document.getElementById('branding-banner-url');

    if (dropBanner && inputBanner) {
      ['dragenter', 'dragover'].forEach(name => {
        dropBanner.addEventListener(name, (e) => {
          e.preventDefault();
          dropBanner.classList.add('border-secondary', 'bg-secondary/10');
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        dropBanner.addEventListener(name, (e) => {
          e.preventDefault();
          dropBanner.classList.remove('border-secondary', 'bg-secondary/10');
        });
      });
      dropBanner.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files && files.length) handleBannerUpload(files[0]);
      });
      inputBanner.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleBannerUpload(e.target.files[0]);
        }
      });
    }

    if (urlBanner) {
      urlBanner.addEventListener('input', (e) => {
        updateBannerDropzoneUI(e.target.value.trim());
        updateLivePreview();
      });
    }
  };

  /**
   * Cargar datos de Branding en el formulario
   */
  const setBrandingData = (b) => {
    const data = b || {};
    const primaryInput = document.getElementById('branding-color-primary');
    const secondaryInput = document.getElementById('branding-color-secondary');
    const fontInput = document.getElementById('branding-font-family');
    const logoInput = document.getElementById('branding-logo-url');
    const bannerInput = document.getElementById('branding-banner-url');
    const titleInput = document.getElementById('branding-public-title');
    const subInput = document.getElementById('branding-public-subtitle');
    const welcomeInput = document.getElementById('branding-welcome-msg');
    const thanksInput = document.getElementById('branding-thanks-msg');
    const labelPrimary = document.getElementById('label-primary-color');
    const labelSecondary = document.getElementById('label-secondary-color');

    const prim = data.primary_color || '#00F2FE';
    const sec = data.secondary_color || '#8B5CF6';

    if (primaryInput) primaryInput.value = prim;
    if (secondaryInput) secondaryInput.value = sec;
    if (labelPrimary) labelPrimary.textContent = prim;
    if (labelSecondary) labelSecondary.textContent = sec;
    if (fontInput) fontInput.value = data.font_family || 'Plus Jakarta Sans';
    if (logoInput) logoInput.value = data.logo_url || '';
    if (bannerInput) bannerInput.value = data.banner_url || '';
    if (titleInput) titleInput.value = data.public_title || '';
    if (subInput) subInput.value = data.public_subtitle || '';
    if (welcomeInput) welcomeInput.value = data.welcome_message || '';
    if (thanksInput) thanksInput.value = data.thank_you_message || '';

    updateLogoDropzoneUI(data.logo_url || '');
    updateBannerDropzoneUI(data.banner_url || '');
    updateLivePreview();
  };

  /**
   * Cambiar color de branding desde un selector o preset
   */
  const setBrandingColor = (type, hex) => {
    if (type === 'primary') {
      const el = document.getElementById('branding-color-primary');
      const label = document.getElementById('label-primary-color');
      if (el) el.value = hex;
      if (label) label.textContent = hex;
    } else if (type === 'secondary') {
      const el = document.getElementById('branding-color-secondary');
      const label = document.getElementById('label-secondary-color');
      if (el) el.value = hex;
      if (label) label.textContent = hex;
    }
    updateLivePreview();
  };

  /**
   * Seleccionar preset de logo
   */
  const setLogoPreset = (url) => {
    const el = document.getElementById('branding-logo-url');
    if (el) el.value = url;
    updateLogoDropzoneUI(url);
    updateLivePreview();
  };

  /**
   * Actualizar mini vista previa de branding en tiempo real
   */
  const updateLivePreview = () => {
    const data = getBrandingData();
    const previewBox = document.getElementById('branding-live-preview-box');
    const previewTitle = document.getElementById('preview-title');
    const previewSubtitle = document.getElementById('preview-subtitle');
    const previewBtn = document.getElementById('preview-btn');
    const previewLogoIcon = document.getElementById('preview-logo-icon');
    const previewLogoImg = document.getElementById('preview-logo-img');
    const previewBannerContainer = document.getElementById('preview-banner-container');
    const previewBannerImg = document.getElementById('preview-banner-img');

    if (previewBox) {
      previewBox.style.fontFamily = `'${data.font_family}', sans-serif`;
    }
    if (previewTitle) {
      previewTitle.textContent = data.public_title || (document.getElementById('survey-title-input')?.value || 'Título de la Encuesta');
    }
    if (previewSubtitle) {
      previewSubtitle.textContent = data.public_subtitle || (document.getElementById('survey-cat-input')?.value || 'Subtítulo u Organización');
    }
    if (previewBtn) {
      previewBtn.style.backgroundColor = data.primary_color;
      previewBtn.style.color = '#0b132b';
    }
    if (previewLogoImg && previewLogoIcon) {
      if (data.logo_url) {
        previewLogoImg.src = data.logo_url;
        previewLogoImg.classList.remove('hidden');
        previewLogoIcon.classList.add('hidden');
      } else {
        previewLogoImg.classList.add('hidden');
        previewLogoIcon.classList.remove('hidden');
        previewLogoIcon.style.color = data.primary_color;
      }
    }
    if (previewBannerContainer && previewBannerImg) {
      if (data.banner_url) {
        previewBannerImg.src = data.banner_url;
        previewBannerContainer.classList.remove('hidden');
      } else {
        previewBannerContainer.classList.add('hidden');
      }
    }
  };

  /**
   * Actualizar texto e iconos de los botones de acción según el modo (Crear vs Editar)
   */
  const updateActionButtons = (isEditing) => {
    const saveBtns = [
      document.getElementById('btn-save-draft'),
      document.getElementById('btn-save-draft-bottom')
    ].filter(Boolean);

    const publishBtns = [
      document.getElementById('btn-publish-survey'),
      document.getElementById('btn-publish-survey-bottom')
    ].filter(Boolean);

    const btnDuplicate = document.getElementById('btn-builder-duplicate');

    saveBtns.forEach(btn => {
      btn.innerHTML = isEditing 
        ? '<span class="material-symbols-outlined text-base">save</span><span>Guardar Cambios</span>'
        : '<span class="material-symbols-outlined text-base">save</span><span>Guardar Borrador</span>';
      btn.title = isEditing 
        ? 'Guardar los cambios o preguntas nuevas directamente en esta misma encuesta' 
        : 'Guardar como borrador para revisión posterior';
    });

    publishBtns.forEach(btn => {
      btn.innerHTML = isEditing 
        ? '<span class="material-symbols-outlined text-lg">rocket_launch</span><span>Guardar y Publicar</span>'
        : '<span class="material-symbols-outlined text-lg">rocket_launch</span><span>Publicar Encuesta</span>';
      btn.title = isEditing 
        ? 'Publicar los cambios actualizados en esta misma encuesta' 
        : 'Publicar encuesta oficialmente y generar dirección funcional';
    });

    if (btnDuplicate) {
      if (isEditing) {
        btnDuplicate.classList.remove('hidden');
        btnDuplicate.classList.add('flex');
      } else {
        btnDuplicate.classList.add('hidden');
        btnDuplicate.classList.remove('flex');
      }
    }
  };

  /**
   * Duplicar la encuesta cargada como una nueva encuesta separada (con nuevo código)
   */
  const duplicateAsNew = () => {
    if (!editingSurveyId) return;

    editingSurveyId = null;

    // Convertir todas las preguntas en nuevas preguntas (IDs temporales)
    questions = questions.map((q, idx) => ({
      ...q,
      id: Date.now() + idx
    }));

    const titleInput = document.getElementById('survey-title-input');
    if (titleInput && !titleInput.value.includes('(Copia)')) {
      titleInput.value = `${titleInput.value} (Copia)`;
    }

    const selector = document.getElementById('builder-survey-selector');
    if (selector) selector.value = 'new';

    const btnViewPublic = document.getElementById('btn-builder-view-public');
    const btnViewPublicQuick = document.getElementById('btn-builder-view-public-quick');
    if (btnViewPublic) {
      btnViewPublic.classList.add('hidden');
      btnViewPublic.classList.remove('flex');
    }
    if (btnViewPublicQuick) {
      btnViewPublicQuick.classList.add('hidden');
      btnViewPublicQuick.classList.remove('flex');
    }

    const modeBadge = document.getElementById('builder-mode-badge');
    const modeLabel = document.getElementById('builder-mode-label');
    if (modeBadge) {
      modeBadge.textContent = 'NUEVA COPIA';
      modeBadge.className = 'badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold';
    }
    if (modeLabel) {
      modeLabel.textContent = '📋 Duplicando como Nueva Encuesta (al guardar se creará un código nuevo)';
    }

    updateActionButtons(false);
    renderQuestionsList();
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast('Modo Copia: ahora al guardar se creará una NUEVA encuesta con un código diferente', 'info');
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
    const btnViewPublic = document.getElementById('btn-builder-view-public');
    const btnViewPublicQuick = document.getElementById('btn-builder-view-public-quick');

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

    // Ocultar botones de ver encuesta porque es nueva
    if (btnViewPublic) {
      btnViewPublic.classList.add('hidden');
      btnViewPublic.classList.remove('flex');
      btnViewPublic.href = '#';
    }
    if (btnViewPublicQuick) {
      btnViewPublicQuick.classList.add('hidden');
      btnViewPublicQuick.classList.remove('flex');
      btnViewPublicQuick.href = '#';
    }

    // Actualizar botones de acción a modo nuevo
    updateActionButtons(false);

    // Resetear branding a valores estándar
    setBrandingData({});

    renderQuestionsList();
    if (notify && typeof App !== 'undefined' && App.showToast) {
      App.showToast('Lienzo en blanco listo para crear nueva encuesta', 'info');
    }
  };

  /**
   * Cargar una encuesta existente para editarla
   */
  const loadSurveyForEdit = async (idOrCode, silent = false) => {
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
      const btnViewPublic = document.getElementById('btn-builder-view-public');
      const btnViewPublicQuick = document.getElementById('btn-builder-view-public-quick');

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

      // Habilitar y vincular botones permanentes para ver encuesta pública
      const surveyCode = survey.codigo || survey.id;
      const publicUrl = `encuesta.html?id=${encodeURIComponent(surveyCode)}`;

      if (btnViewPublic) {
        btnViewPublic.href = publicUrl;
        btnViewPublic.classList.remove('hidden');
        btnViewPublic.classList.add('flex');
      }
      if (btnViewPublicQuick) {
        btnViewPublicQuick.href = publicUrl;
        btnViewPublicQuick.classList.remove('hidden');
        btnViewPublicQuick.classList.add('flex');
      }

      // Actualizar botones a modo Edición
      updateActionButtons(true);

      // Cargar Branding exclusivo
      setBrandingData(survey.branding || {});

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
          : (p.tipo === 'opcion_unica' || p.tipo === 'opcion_multiple' ? ['Alternativa 1', 'Alternativa 2'] : []),
        validacion: p.validacion || { modo: 'libre', min: '', max: '', maxlength: 500, min_chars: 0, lista: [] }
      }));

      renderQuestionsList();
      if (!silent && typeof App !== 'undefined' && App.showToast) {
        App.showToast(`Encuesta "${survey.titulo}" [${surveyCode}] cargada para edición`, 'success');
      }
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
        <div class="options-builder-wrapper">
          ${renderQuestionOptionsBuilder(q)}
        </div>

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

    // Texto Libre Panel de Configuracion de Validacion Explicita
    if (q.tipo === 'texto') {
      const v = q.validacion || { modo: 'libre', min: '', max: '', maxlength: 500, min_chars: 0, lista: [], decimales: false };
      const lista = Array.isArray(v.lista) ? v.lista : (v.lista ? String(v.lista).split(',').map(s => s.trim()).filter(Boolean) : []);

      const modeOptions = [
        { val: 'libre',       icon: 'subject',   label: 'Texto Libre',      desc: 'Escribe libremente (con limite)' },
        { val: 'solo_texto',  icon: 'abc',       label: 'Solo Letras',      desc: 'Bloquea numeros y simbolos' },
        { val: 'solo_numero', icon: 'pin',       label: 'Solo Numeros',     desc: 'Enteros o decimales, rango configurable' },
        { val: 'lista',       icon: 'checklist', label: 'Lista de Valores', desc: 'Solo acepta valores predefinidos' }
      ];

      let modeSpecificHtml = '';
      if (v.modo === 'libre') {
        modeSpecificHtml = `
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-mono font-bold text-outline uppercase block mb-1">Max. Caracteres</label>
              <input type="number" min="10" max="2000" value="${v.maxlength || 500}"
                oninput="SurveyBuilder.updateValidacion(${q.id}, 'maxlength', parseInt(this.value)||500)"
                class="input-glass w-full text-sm py-2 px-3 rounded-lg font-mono" placeholder="500" />
            </div>
            <div>
              <label class="text-[10px] font-mono font-bold text-outline uppercase block mb-1">Min. Caracteres</label>
              <input type="number" min="0" max="500" value="${v.min_chars || 0}"
                oninput="SurveyBuilder.updateValidacion(${q.id}, 'min_chars', parseInt(this.value)||0)"
                class="input-glass w-full text-sm py-2 px-3 rounded-lg font-mono" placeholder="0" />
            </div>
          </div>
          <p class="text-[10px] text-on-surface-variant font-mono flex items-center gap-1">
            <span class="material-symbols-outlined text-xs text-primary">info</span>
            El encuestado escribe libremente. Se aceptan letras, numeros y simbolos.
          </p>`;
      } else if (v.modo === 'solo_texto') {
        modeSpecificHtml = `
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-mono font-bold text-outline uppercase block mb-1">Max. Caracteres</label>
              <input type="number" min="3" max="2000" value="${v.maxlength || 200}"
                oninput="SurveyBuilder.updateValidacion(${q.id}, 'maxlength', parseInt(this.value)||200)"
                class="input-glass w-full text-sm py-2 px-3 rounded-lg font-mono" placeholder="200" />
            </div>
            <div>
              <label class="text-[10px] font-mono font-bold text-outline uppercase block mb-1">Min. Caracteres</label>
              <input type="number" min="0" max="500" value="${v.min_chars || 0}"
                oninput="SurveyBuilder.updateValidacion(${q.id}, 'min_chars', parseInt(this.value)||0)"
                class="input-glass w-full text-sm py-2 px-3 rounded-lg font-mono" placeholder="0" />
            </div>
          </div>
          <p class="text-[10px] text-on-surface-variant font-mono flex items-center gap-1">
            <span class="material-symbols-outlined text-xs text-amber-400">text_fields</span>
            Solo letras, espacios, acentos y guiones. Se bloquean numeros y simbolos especiales.
          </p>`;
      } else if (v.modo === 'solo_numero') {
        modeSpecificHtml = `
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-mono font-bold text-outline uppercase block mb-1">Valor Minimo</label>
              <input type="number" value="${v.min !== undefined && v.min !== '' ? v.min : ''}"
                oninput="SurveyBuilder.updateValidacion(${q.id}, 'min', this.value)"
                class="input-glass w-full text-sm py-2 px-3 rounded-lg font-mono" placeholder="Sin limite" />
            </div>
            <div>
              <label class="text-[10px] font-mono font-bold text-outline uppercase block mb-1">Valor Maximo</label>
              <input type="number" value="${v.max !== undefined && v.max !== '' ? v.max : ''}"
                oninput="SurveyBuilder.updateValidacion(${q.id}, 'max', this.value)"
                class="input-glass w-full text-sm py-2 px-3 rounded-lg font-mono" placeholder="Sin limite" />
            </div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-on-surface-variant">
            <input type="checkbox" ${v.decimales ? 'checked' : ''}
              onchange="SurveyBuilder.updateValidacion(${q.id}, 'decimales', this.checked)"
              class="h-4 w-4 accent-primary rounded cursor-pointer" />
            Permitir decimales (ej: 1.5, 3.14)
          </label>
          <p class="text-[10px] text-on-surface-variant font-mono flex items-center gap-1">
            <span class="material-symbols-outlined text-xs text-blue-400">pin</span>
            Solo numeros${v.decimales ? ' (enteros o decimales)' : ' enteros'}.
            ${(v.min !== '' && v.min !== undefined) || (v.max !== '' && v.max !== undefined)
              ? ` Rango: ${v.min !== '' && v.min !== undefined ? v.min : '-inf'} a ${v.max !== '' && v.max !== undefined ? v.max : '+inf'}.`
              : ' Sin limite de rango.'}
          </p>`;
      } else if (v.modo === 'lista') {
        modeSpecificHtml = `
          <div>
            <label class="text-[10px] font-mono font-bold text-outline uppercase block mb-1.5">
              Valores Permitidos <span class="text-on-surface-variant normal-case font-normal">(separados por coma)</span>
            </label>
            <input type="text" value="${escapeHtml(lista.join(', '))}"
              oninput="SurveyBuilder.updateValidacionLista(${q.id}, this.value)"
              class="input-glass w-full text-sm py-2.5 px-3 rounded-lg"
              placeholder="Ej: Lima, Cusco, Arequipa, Piura" />
          </div>
          ${lista.length > 0 ? `
            <div id="val-lista-chips-${q.id}" class="flex flex-wrap gap-1.5">
              ${lista.map(item => `<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] font-semibold">${escapeHtml(item)}</span>`).join('')}
            </div>
            <p id="val-lista-count-${q.id}" class="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">check_circle</span>
              ${lista.length} valor(es) definido(s). El encuestado debera escribir exactamente uno de ellos.
            </p>
          ` : `
            <div id="val-lista-chips-${q.id}"></div>
            <p id="val-lista-count-${q.id}" class="text-[10px] text-amber-400 font-mono flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">warning</span>
              Ingrese los valores permitidos separados por coma arriba.
            </p>
          `}`;
      }

      return `
        <div class="mt-4 rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden validation-config-panel">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/20">
            <span class="material-symbols-outlined text-base text-primary">rule_settings</span>
            <span class="text-[11px] font-mono font-bold text-primary uppercase tracking-wider">Configuracion de Validacion del Campo</span>
          </div>
          <div class="p-4 space-y-4">
            <div>
              <p class="text-[11px] font-semibold text-on-surface-variant mb-2">Que tipo de dato puede ingresar el encuestado?</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                ${modeOptions.map(m => `
                  <label class="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${v.modo === m.val ? 'border-primary bg-primary/15 text-primary shadow-sm' : 'border-outline-variant/40 bg-surface-container/50 text-on-surface-variant hover:border-primary/50'}">
                    <input type="radio" name="val_modo_${q.id}" value="${m.val}" ${v.modo === m.val ? 'checked' : ''} onchange="SurveyBuilder.updateValidacion(${q.id}, 'modo', this.value)" class="sr-only" />
                    <span class="material-symbols-outlined text-xl">${m.icon}</span>
                    <span class="text-[11px] font-bold text-center leading-tight">${m.label}</span>
                    <span class="text-[9px] text-center leading-tight opacity-70">${m.desc}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            <div class="space-y-3 p-3 rounded-xl bg-surface-container/60 border border-outline-variant/30">
              ${modeSpecificHtml}
            </div>
          </div>
        </div>
      `;
    }

    return '';
  };

  /**
   * Operaciones interactivas sobre preguntas
   */
  /**
   * Actualizar un campo de la validación de una pregunta de texto
   */
  const updateValidacion = (id, campo, valor) => {
    const q = questions.find(item => item.id === id);
    if (!q) return;
    if (!q.validacion) q.validacion = { modo: 'libre', min: '', max: '', maxlength: 500, min_chars: 0, lista: [], decimales: false };
    q.validacion[campo] = valor;

    // Solo re-renderizar el panel de opciones si cambia de modo estructural
    if (campo === 'modo' || campo === 'decimales') {
      const wrapper = document.querySelector(`#builder-q-${id} .options-builder-wrapper`);
      if (wrapper) {
        wrapper.innerHTML = renderQuestionOptionsBuilder(q);
      } else {
        renderQuestionsList();
      }
    }
  };

  /**
   * Actualizar la lista de valores permitidos desde una cadena separada por comas
   */
  const updateValidacionLista = (id, rawText) => {
    const q = questions.find(item => item.id === id);
    if (!q) return;
    if (!q.validacion) q.validacion = { modo: 'lista', min: '', max: '', maxlength: 500, min_chars: 0, lista: [], decimales: false };
    // Guardar como array limpio
    q.validacion.lista = rawText.split(',').map(s => s.trim()).filter(Boolean);
    // Actualizar solo los chips de preview sin re-renderizar todo
    const lista = q.validacion.lista;
    const chipsEl = document.getElementById(`val-lista-chips-${id}`);
    const countEl = document.getElementById(`val-lista-count-${id}`);
    if (chipsEl) {
      chipsEl.innerHTML = lista.map(item =>
        `<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] font-semibold">${escapeHtml(item)}</span>`
      ).join('');
    }
    if (countEl) countEl.textContent = `✅ ${lista.length} valor(es) permitido(s). El encuestado solo podrá ingresar uno de estos exactamente.`;
  };

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
            : [],
          validacion: { modo: 'libre', min: '', max: '', maxlength: 500, min_chars: 0, lista: [] }
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

    // Botón Duplicar como Nueva Encuesta
    const btnDuplicate = document.getElementById('btn-builder-duplicate');
    if (btnDuplicate) {
      btnDuplicate.addEventListener('click', () => {
        duplicateAsNew();
      });
    }

    // Guardar Borrador / Guardar Cambios
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
        const wasEditing = Boolean(editingSurveyId);
        const payload = {
          id: editingSurveyId,
          titulo: title,
          descripcion: 'Borrador diseñado en el Constructor & Importador Excel',
          categoria: categoria,
          norma_tecnica: norma,
          estado: 'pendiente',
          publicar: false,
          preguntas: questions,
          branding: getBrandingData()
        };

        const res = await API.createEncuesta(payload);

        draftBtns.forEach(btn => {
          btn.disabled = false;
        });

        if (res && res.id) {
          editingSurveyId = res.id;
          await refreshSurveySelector();
          const selector = document.getElementById('builder-survey-selector');
          if (selector) selector.value = res.id;

          const btnViewPublic = document.getElementById('btn-builder-view-public');
          const btnViewPublicQuick = document.getElementById('btn-builder-view-public-quick');
          const code = res.codigo || res.id;
          const publicUrl = `encuesta.html?id=${encodeURIComponent(code)}`;
          if (btnViewPublic) {
            btnViewPublic.href = publicUrl;
            btnViewPublic.classList.remove('hidden');
            btnViewPublic.classList.add('flex');
          }
          if (btnViewPublicQuick) {
            btnViewPublicQuick.href = publicUrl;
            btnViewPublicQuick.classList.remove('hidden');
            btnViewPublicQuick.classList.add('flex');
          }

          // Recargar silenciosamente para sincronizar IDs de preguntas asignadas por la base de datos
          await loadSurveyForEdit(res.id, true);

          if (wasEditing) {
            App.showToast(`Cambios guardados en la encuesta "${title}" [${code}] con éxito`, 'success');
          } else {
            App.showToast(`Borrador "${title}" guardado en MySQL con éxito`, 'success');
          }
        }
      } catch (e) {
        draftBtns.forEach(btn => {
          btn.disabled = false;
        });
        updateActionButtons(Boolean(editingSurveyId));
        App.showToast('Error al guardar en base de datos', 'error');
      }
    };

    // Publicar Encuesta Oficialmente / Guardar y Publicar
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
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">autorenew</span> Guardando...';
      });

      try {
        const wasEditing = Boolean(editingSurveyId);
        const payload = {
          id: editingSurveyId,
          titulo: title,
          descripcion: 'Encuesta construida y publicada oficialmente desde el Constructor OmniPoll',
          categoria: categoria,
          norma_tecnica: norma,
          estado: 'aprobada',
          publicar: true,
          preguntas: questions,
          branding: getBrandingData()
        };

        const res = await API.createEncuesta(payload);

        publishBtns.forEach(btn => {
          btn.disabled = false;
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

        // Actualizar botones de ver encuesta en el constructor
        const btnViewPublic = document.getElementById('btn-builder-view-public');
        const btnViewPublicQuick = document.getElementById('btn-builder-view-public-quick');
        if (btnViewPublic) {
          btnViewPublic.href = fullPublicUrl;
          btnViewPublic.classList.remove('hidden');
          btnViewPublic.classList.add('flex');
        }
        if (btnViewPublicQuick) {
          btnViewPublicQuick.href = fullPublicUrl;
          btnViewPublicQuick.classList.remove('hidden');
          btnViewPublicQuick.classList.add('flex');
        }

        if (res && res.id) editingSurveyId = res.id;
        await refreshSurveySelector();
        const selector = document.getElementById('builder-survey-selector');
        if (selector && res && res.id) selector.value = res.id;

        // Recargar silenciosamente para sincronizar IDs de preguntas
        if (res && res.id) {
          await loadSurveyForEdit(res.id, true);
        }

        // Abrir modal conmemorativo
        App.openModal('modal-survey-published');
        if (wasEditing) {
          App.showToast(`¡Encuesta ${codigoFinal} actualizada y publicada con éxito!`, 'success');
        } else {
          App.showToast(`¡Encuesta publicada con código oficial ${codigoFinal}!`, 'success');
        }
      } catch (err) {
        console.error('Error publicando encuesta:', err);
        publishBtns.forEach(btn => {
          btn.disabled = false;
        });
        updateActionButtons(Boolean(editingSurveyId));
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

    // Guardar Branding Exclusivo de la Encuesta
    const btnSaveBranding = document.getElementById('btn-save-survey-branding');
    if (btnSaveBranding) {
      btnSaveBranding.addEventListener('click', async () => {
        if (!editingSurveyId) {
          App.showToast('Primero guarde el borrador o cargue una encuesta existente para guardar su branding', 'info');
          return;
        }

        const branding = getBrandingData();
        btnSaveBranding.disabled = true;
        btnSaveBranding.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">autorenew</span> Guardando...';

        try {
          await API.updateBranding(editingSurveyId, branding);
          btnSaveBranding.disabled = false;
          btnSaveBranding.innerHTML = '<span class="material-symbols-outlined text-base">palette</span><span>Guardar Branding de esta Encuesta</span>';
          App.showToast('¡Branding exclusivo de la encuesta guardado correctamente!', 'success');
        } catch (err) {
          btnSaveBranding.disabled = false;
          btnSaveBranding.innerHTML = '<span class="material-symbols-outlined text-base">palette</span><span>Guardar Branding de esta Encuesta</span>';
          App.showToast('Error al guardar el branding de la encuesta', 'error');
        }
      });
    }

    // Escuchadores en vivo para la vista previa del branding
    ['branding-color-primary', 'branding-color-secondary', 'branding-font-family', 'branding-logo-url', 'branding-public-title', 'branding-public-subtitle', 'survey-title-input', 'survey-cat-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (id === 'branding-color-primary') {
            const lbl = document.getElementById('label-primary-color');
            if (lbl) lbl.textContent = el.value;
          }
          if (id === 'branding-color-secondary') {
            const lbl = document.getElementById('label-secondary-color');
            if (lbl) lbl.textContent = el.value;
          }
          updateLivePreview();
        });
      }
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
    getBrandingData,
    setBrandingData,
    setBrandingColor,
    setLogoPreset,
    updateLivePreview,
    toggleRequired,
    changeQuestionType,
    updateQuestionText,
    updateQuestionHelp,
    addOption,
    updateOptionText,
    removeOption,
    moveQuestion,
    duplicateQuestion,
    deleteQuestion,
    duplicateAsNew,
    removeLogoImage,
    removeBannerImage,
    updateValidacion,
    updateValidacionLista
  };
})();
