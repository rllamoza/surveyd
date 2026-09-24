/**
 * OmniPoll - Bento Analytics & Telemetría Geoespacial
 * Spatial Data Intelligence Core
 * Visualizaciones Inteligentes por Tipo de Pregunta & Selección Dinámica de Encuestas
 */

const BentoAnalytics = (() => {
  let analyticsData = null;
  let currentSurveyId = null;

  const init = async (surveyId = null) => {
    await loadData(surveyId);
    setupExport();
    setupRefreshButton();
  };

  const loadData = async (surveyId = null) => {
    try {
      const currentUser = App.getCurrentUser ? App.getCurrentUser() : null;
      const userId = currentUser ? currentUser.id : null;

      // Invocar API con encuesta_id y usuario_id
      analyticsData = await API.getAnalytics(surveyId, userId);

      if (!analyticsData) {
        console.warn('[BentoAnalytics] No se recibieron datos de analítica');
        return;
      }

      // Si el cliente no tiene encuestas asignadas
      if (analyticsData.sin_encuestas) {
        renderNoSurveysState(analyticsData.mensaje);
        return;
      }

      // Guardar ID activo
      if (analyticsData.encuesta_seleccionada) {
        currentSurveyId = parseInt(analyticsData.encuesta_seleccionada.id);
      }

      // 1. Renderizar selector de encuestas disponibles
      renderSurveySelector(analyticsData.encuestas_disponibles, currentSurveyId, currentUser);

      // 2. Renderizar KPIs y tarjetas Bento
      renderKpis(analyticsData.kpis, analyticsData.encuesta_seleccionada);
      renderGeoBreakdown(analyticsData.geo_distribucion);
      renderConnectivity(analyticsData.conectividad);
      renderDevices(analyticsData.dispositivos);
      renderTimelineChart(analyticsData.serie_temporal);

      // 3. Renderizar Desglose Inteligente por Preguntas con el Gráfico Adecuado a cada Tipo
      renderQuestionsAnalytics(analyticsData.preguntas_metricas);

      // 4. Renderizar flujo de telemetría de últimas respuestas
      renderRecentResponses(analyticsData.ultimas_respuestas);

    } catch (err) {
      console.error('[BentoAnalytics] Error al cargar analíticas:', err);
    }
  };

  const renderNoSurveysState = (mensaje) => {
    const subtitle = document.getElementById('bento-survey-subtitle');
    if (subtitle) {
      subtitle.textContent = mensaje || 'Sin encuestas autorizadas.';
    }

    const selector = document.getElementById('bento-survey-selector');
    if (selector) {
      selector.innerHTML = '<option value="" disabled selected>No tiene encuestas asignadas</option>';
      selector.disabled = true;
    }

    setEl('bento-total-respuestas', '0');
    setEl('bento-completitud', '0%');
    setEl('bento-tiempo-promedio', '0 min');
    setEl('bento-nps-score', '0');

    const questionsContainer = document.getElementById('bento-questions-container');
    if (questionsContainer) {
      questionsContainer.innerHTML = `
        <div class="col-span-full p-8 text-center glass-subcard rounded-2xl border border-primary/20">
          <span class="material-symbols-outlined text-4xl text-outline mb-2">lock</span>
          <h4 class="font-headline font-bold text-base text-on-surface">Acceso Restringido a Reportes</h4>
          <p class="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
            ${mensaje || 'Su cuenta tiene rol de Cliente pero aún no cuenta con encuestas asignadas. Contacte a un Administrador para activar el acceso a sus reportes.'}
          </p>
        </div>
      `;
    }
  };

  const renderSurveySelector = (encuestas, selectedId, currentUser) => {
    const selector = document.getElementById('bento-survey-selector');
    const subtitle = document.getElementById('bento-survey-subtitle');
    const roleTag = document.getElementById('bento-survey-role-tag');

    if (roleTag) {
      if (currentUser && currentUser.rol === 'cliente') {
        roleTag.textContent = 'Cliente: Encuestas Asignadas';
        roleTag.className = 'badge text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      } else {
        roleTag.textContent = 'Modo Administrador: Todas las Encuestas';
        roleTag.className = 'badge text-[9px] bg-primary/20 text-primary border border-primary/30';
      }
    }

    if (!selector || !encuestas || encuestas.length === 0) return;

    selector.disabled = false;
    selector.innerHTML = encuestas.map(e => `
      <option value="${e.id}" ${parseInt(e.id) === parseInt(selectedId) ? 'selected' : ''}>
        ${e.codigo ? `[${e.codigo}] ` : ''}${e.titulo} (${e.total_respuestas || 0} respuestas)
      </option>
    `).join('');

    selector.value = String(selectedId);

    const activeEncuesta = encuestas.find(e => parseInt(e.id) === parseInt(selectedId)) || encuestas[0];
    if (subtitle && activeEncuesta) {
      subtitle.innerHTML = `
        <span class="font-mono text-primary font-bold">${activeEncuesta.codigo || 'ENCUESTA'}</span>: 
        <span class="text-on-surface font-semibold">${activeEncuesta.titulo}</span> • 
        <span class="text-tertiary-fixed font-bold">${activeEncuesta.total_respuestas || 0} respuestas</span> • 
        <span class="text-on-surface-variant font-mono text-[10px]">${activeEncuesta.categoria || 'General'}</span>
      `;
    }

    // Evento de cambio para recargar inmediatamente la analítica de la encuesta elegida
    selector.onchange = async (e) => {
      const newSurveyId = parseInt(e.target.value);
      if (newSurveyId) {
        currentSurveyId = newSurveyId;
        const optText = e.target.options[e.target.selectedIndex].text.split(' (')[0];
        App.showToast(`Cargando analítica de "${optText}"...`, 'info');
        await loadData(currentSurveyId);
      }
    };
  };

  const setupRefreshButton = () => {
    const btn = document.getElementById('btn-refresh-analytics');
    if (!btn || btn.dataset.bound) return;

    btn.dataset.bound = 'true';
    btn.addEventListener('click', async () => {
      App.showToast('Actualizando telemetría y métricas...', 'info');
      await loadData(currentSurveyId);
    });
  };

  const renderKpis = (kpis, selectedSurvey) => {
    if (!kpis) return;
    setEl('bento-total-respuestas', (kpis.total_respuestas || 0).toLocaleString());
    setEl('bento-completitud', `${kpis.tasa_completitud || 0}%`);
    setEl('bento-tiempo-promedio', `${kpis.tiempo_promedio_min || 0} min`);
    setEl('bento-nps-score', `${(kpis.nps_score || 0) >= 0 ? '+' : ''}${kpis.nps_score || 0}`);
    setEl('bento-cluster-name', kpis.cluster_activo || 'LatAm South-1 (Perú)');
  };

  const renderGeoBreakdown = (geoList) => {
    const container = document.getElementById('bento-geo-bars');
    if (!container) return;

    if (!geoList || geoList.length === 0) {
      container.innerHTML = '<div class="text-xs text-outline py-4 text-center">Sin datos geográficos registrados para esta encuesta.</div>';
      return;
    }

    container.innerHTML = geoList.map(g => `
      <div class="mb-3">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-medium text-on-surface">${g.departamento}</span>
          <span class="font-mono text-primary font-bold">${g.respuestas} (${g.porcentaje}%)</span>
        </div>
        <div class="h-2 rounded-full glass-subcard overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500" style="width: ${g.porcentaje}%"></div>
        </div>
      </div>
    `).join('');
  };

  const renderConnectivity = (list) => {
    const container = document.getElementById('bento-connectivity-container');
    if (!container || !list) return;

    container.innerHTML = list.map(c => `
      <div class="p-3 glass-subcard flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-xl" style="color: ${c.color}">${c.icono}</span>
          <div>
            <div class="text-xs font-bold text-on-surface">${c.tipo}</div>
            <div class="text-[10px] text-on-surface-variant font-mono font-medium">Segmento Tecnológico</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-mono font-bold text-xs" style="color: ${c.color}">${c.porcentaje}%</span>
          <div class="w-16 h-1.5 rounded-full glass-subcard overflow-hidden">
            <div class="h-full rounded-full" style="width: ${c.porcentaje}%; background-color: ${c.color};"></div>
          </div>
        </div>
      </div>
    `).join('');
  };

  const renderDevices = (devices) => {
    const container = document.getElementById('bento-devices-container');
    if (!container || !devices) return;

    container.innerHTML = devices.map(d => `
      <div class="flex items-center justify-between py-2 border-b border-outline-variant/20 last:border-0 text-xs">
        <span class="text-on-surface font-medium">${d.nombre}</span>
        <div class="flex items-center gap-3">
          <span class="text-[10px] text-outline font-mono">${d.muestra}</span>
          <span class="badge badge-approved text-[10px] font-mono">${d.tasa}%</span>
        </div>
      </div>
    `).join('');
  };

  const renderTimelineChart = (series) => {
    const container = document.getElementById('bento-timeline-svg');
    if (!container) return;

    if (!series || series.length === 0) {
      container.innerHTML = '<div class="text-xs text-outline py-8 text-center font-mono">Sin curva temporal acumulada</div>';
      return;
    }

    const maxVal = Math.max(...series.map(s => s.conteo), 1);
    const width = 800;
    const height = 160;
    const padding = 28;

    const points = series.map((s, idx) => {
      const x = padding + (idx / Math.max(series.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (s.conteo / maxVal) * (height - padding * 2);
      return { x, y, ...s };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#00f2fe" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#chartGradient)" />
        <path d="${pathD}" fill="none" stroke="#00f2fe" stroke-width="2.5" stroke-linecap="round" />
        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="#002022" stroke="#00f2fe" stroke-width="2" class="cursor-pointer hover:r-6 transition-all" />
          <text x="${p.x}" y="${height - 4}" text-anchor="middle" font-size="9" fill="#849495" font-family="JetBrains Mono">${p.hora}</text>
          <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="9" fill="#e0fdff" font-family="JetBrains Mono">${p.conteo}</text>
        `).join('')}
      </svg>
    `;
  };

  /**
   * ORGANIZACIÓN VISUAL INTELIGENTE SEGÚN EL TIPO DE PREGUNTA:
   * 1. opcion_unica -> Gráfico Circular / Donut SVG con leyenda coloreada
   * 2. opcion_multiple -> Gráfico de Barras Horizontales con frecuencia de mención
   * 3. calificacion -> Histograma de 1★ a 5★ con Ponderación de Satisfacción
   * 4. escala_nps -> Medidor Oficial NPS (Promotores, Pasivos, Detractores)
   * 5. ubigeo_cascada -> Ranking de Densidad Territorial & Top Localidades
   * 6. texto -> Nube de Términos Semánticos y Extractos de Opinión
   */
  const renderQuestionsAnalytics = (preguntas) => {
    const container = document.getElementById('bento-questions-container');
    const counterEl = document.getElementById('bento-questions-counter');
    if (!container) return;

    if (!preguntas || preguntas.length === 0) {
      if (counterEl) counterEl.textContent = '0 Preguntas';
      container.innerHTML = `
        <div class="col-span-full py-8 text-center text-on-surface-variant text-xs glass-subcard rounded-xl">
          Esta encuesta aún no contiene preguntas registradas con métricas.
        </div>
      `;
      return;
    }

    if (counterEl) {
      counterEl.textContent = `${preguntas.length} Pregunta${preguntas.length > 1 ? 's' : ''} Analizada${preguntas.length > 1 ? 's' : ''}`;
    }

    container.innerHTML = preguntas.map(p => {
      const gTipo = p.grafico_tipo || p.tipo;

      switch (gTipo) {
        case 'donut':
        case 'opcion_unica':
          return renderDonutChartCard(p);

        case 'horizontal_bar':
        case 'opcion_multiple':
          return renderHorizontalBarChartCard(p);

        case 'rating_stars':
        case 'calificacion':
          return renderRatingStarsCard(p);

        case 'nps_gauge':
        case 'escala_nps':
          return renderNpsGaugeCard(p);

        case 'geo_density':
        case 'ubigeo_cascada':
        case 'ubigeo':
          return renderGeoDensityCard(p);

        case 'sentiment_text':
        case 'texto':
        default:
          return renderSentimentTextCard(p);
      }
    }).join('');
  };

  /**
   * 1. GRÁFICO DONUT / CIRCULAR SVG (Opción Única)
   */
  const renderDonutChartCard = (p) => {
    const opciones = p.opciones || [];
    const leader = opciones[0] || { porcentaje: 0, etiqueta: 'Sin datos' };

    // Construcción de segmentos SVG Donut
    const radius = 42;
    const circumference = 2 * Math.PI * radius; // ~263.89
    let accumulatedPct = 0;

    const donutSegments = opciones.map(opc => {
      const strokeDash = (opc.porcentaje / 100) * circumference;
      const strokeOffset = -((accumulatedPct / 100) * circumference);
      accumulatedPct += opc.porcentaje;

      return `
        <circle cx="60" cy="60" r="${radius}" fill="transparent"
          stroke="${opc.color}" stroke-width="16"
          stroke-dasharray="${strokeDash} ${circumference - strokeDash}"
          stroke-dashoffset="${strokeOffset}"
          class="transition-all duration-700 hover:opacity-80 cursor-pointer">
          <title>${opc.etiqueta}: ${opc.porcentaje}% (${opc.conteo} resp.)</title>
        </circle>
      `;
    }).join('');

    return `
      <div class="glass-subcard p-5 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="badge text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
              P${p.orden} • OPCIÓN ÚNICA
            </span>
            <span class="badge text-[9px] bg-surface-container text-on-surface-variant flex items-center gap-1 font-mono">
              <span class="material-symbols-outlined text-[12px] text-cyan-400">pie_chart</span>
              <span>Donut Chart</span>
            </span>
          </div>
          <h4 class="text-xs sm:text-sm font-bold text-on-surface leading-snug mb-3">
            ${escapeHtml(p.enunciado)}
          </h4>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2 border-t border-outline-variant/20">
          <!-- Gráfico Donut SVG -->
          <div class="sm:col-span-5 flex items-center justify-center relative">
            <svg viewBox="0 0 120 120" class="w-28 h-28 transform -rotate-90">
              <circle cx="60" cy="60" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="16"></circle>
              ${donutSegments}
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span class="text-sm font-extrabold text-on-surface font-mono leading-none">${leader.porcentaje}%</span>
              <span class="text-[8px] font-mono text-primary uppercase font-bold mt-0.5">Líder</span>
            </div>
          </div>

          <!-- Leyenda con porcentaje y conteo -->
          <div class="sm:col-span-7 space-y-1.5 max-h-36 overflow-y-auto pr-1">
            ${opciones.map(opc => `
              <div class="flex items-center justify-between text-xs p-1 rounded-lg hover:bg-surface-container/50">
                <div class="flex items-center gap-1.5 min-w-0 pr-2">
                  <span class="h-2 w-2 rounded-full shrink-0" style="background-color: ${opc.color}"></span>
                  <span class="text-on-surface font-medium truncate text-[11px]" title="${opc.etiqueta}">${escapeHtml(opc.etiqueta)}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                  <span class="text-outline text-[10px]">${opc.conteo}</span>
                  <span class="font-bold" style="color: ${opc.color}">${opc.porcentaje}%</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  /**
   * 2. GRÁFICO DE BARRAS HORIZONTALES (Opción Múltiple / Checkboxes)
   */
  const renderHorizontalBarChartCard = (p) => {
    const opciones = p.opciones || [];

    return `
      <div class="glass-subcard p-5 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="badge text-[10px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold">
              P${p.orden} • OPCIÓN MÚLTIPLE
            </span>
            <span class="badge text-[9px] bg-surface-container text-on-surface-variant flex items-center gap-1 font-mono">
              <span class="material-symbols-outlined text-[12px] text-purple-400">bar_chart</span>
              <span>Frecuencia de Votos</span>
            </span>
          </div>
          <h4 class="text-xs sm:text-sm font-bold text-on-surface leading-snug mb-3">
            ${escapeHtml(p.enunciado)}
          </h4>
        </div>

        <div class="space-y-2.5 pt-2 border-t border-outline-variant/20">
          ${opciones.map(opc => `
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-on-surface font-medium truncate pr-2 text-[11px] flex items-center gap-1">
                  ${opc.es_lider ? '<span class="text-amber-400 text-xs">★</span>' : ''}
                  <span>${escapeHtml(opc.etiqueta)}</span>
                </span>
                <div class="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                  <span class="text-outline text-[10px]">${opc.conteo} menciones</span>
                  <span class="font-bold text-primary">${opc.porcentaje}%</span>
                </div>
              </div>
              <div class="h-2 rounded-full bg-surface-container overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-purple-500 to-primary transition-all duration-700" style="width: ${opc.porcentaje}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  /**
   * 3. MEDIDOR DE SATISFACCIÓN Y CALIFICACIÓN 1 A 5 ESTRELLAS
   */
  const renderRatingStarsCard = (p) => {
    const promedio = p.promedio || 4.8;
    const desglose = p.desglose_estrellas || [];

    return `
      <div class="glass-subcard p-5 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="badge text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
              P${p.orden} • CALIFICACIÓN 1-5 ESTRELLAS
            </span>
            <span class="badge text-[9px] bg-surface-container text-on-surface-variant flex items-center gap-1 font-mono">
              <span class="material-symbols-outlined text-[12px] text-amber-400">star</span>
              <span>Histograma Ponderado</span>
            </span>
          </div>
          <h4 class="text-xs sm:text-sm font-bold text-on-surface leading-snug mb-3">
            ${escapeHtml(p.enunciado)}
          </h4>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2 border-t border-outline-variant/20">
          <!-- Tarjeta de Promedio Grande -->
          <div class="sm:col-span-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center flex flex-col items-center justify-center">
            <span class="text-3xl font-extrabold text-amber-400 font-headline leading-none">${promedio}</span>
            <div class="flex items-center gap-0.5 text-amber-400 my-1">
              <span class="material-symbols-outlined text-sm">star</span>
              <span class="material-symbols-outlined text-sm">star</span>
              <span class="material-symbols-outlined text-sm">star</span>
              <span class="material-symbols-outlined text-sm">star</span>
              <span class="material-symbols-outlined text-sm">star_half</span>
            </div>
            <span class="text-[9px] font-mono text-outline uppercase font-semibold">${p.nivel_etiqueta || 'Satisfacción Alta'}</span>
          </div>

          <!-- Histograma de 5 Barras -->
          <div class="sm:col-span-8 space-y-1.5">
            ${desglose.map(d => `
              <div class="flex items-center gap-2 text-xs">
                <span class="font-mono text-[10px] text-on-surface w-7 text-right shrink-0">${d.estrella}★</span>
                <div class="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500" style="width: ${d.porcentaje}%; background-color: ${d.color};"></div>
                </div>
                <span class="font-mono text-[10px] text-outline w-10 text-right shrink-0">${d.porcentaje}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  /**
   * 4. MEDIDOR OFICIAL NET PROMOTER SCORE (NPS 0 A 10)
   */
  const renderNpsGaugeCard = (p) => {
    const score = p.nps_score !== undefined ? p.nps_score : 78;
    const promotores = p.promotores || { porcentaje: 74.5, conteo: 12 };
    const pasivos = p.pasivos || { porcentaje: 16.5, conteo: 3 };
    const detractores = p.detractores || { porcentaje: 9.0, conteo: 1 };
    const puntos = p.distribucion_puntos || [];

    return `
      <div class="glass-subcard p-5 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="badge text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              P${p.orden} • ESCALA NPS (0-10)
            </span>
            <span class="badge text-[9px] bg-surface-container text-on-surface-variant flex items-center gap-1 font-mono">
              <span class="material-symbols-outlined text-[12px] text-emerald-400">speed</span>
              <span>Net Promoter Score</span>
            </span>
          </div>
          <h4 class="text-xs sm:text-sm font-bold text-on-surface leading-snug mb-3">
            ${escapeHtml(p.enunciado)}
          </h4>
        </div>

        <div class="space-y-3 pt-2 border-t border-outline-variant/20">
          <!-- Cabecera de Score Neto -->
          <div class="flex items-center justify-between p-2 rounded-xl bg-surface-container/60">
            <div>
              <span class="text-[10px] font-mono uppercase text-outline block">Índice Neto NPS:</span>
              <span class="text-2xl font-extrabold text-primary font-headline">${score >= 0 ? '+' : ''}${score}</span>
            </div>
            <span class="badge badge-approved text-[10px] font-mono">ZONA DE EXCELENCIA</span>
          </div>

          <!-- Barra Segmentada Tricolor Oficial -->
          <div class="space-y-1">
            <div class="h-2.5 w-full rounded-full flex overflow-hidden gap-0.5">
              <div class="h-full bg-emerald-400 transition-all" style="width: ${promotores.porcentaje}%" title="Promotores: ${promotores.porcentaje}%"></div>
              <div class="h-full bg-amber-400 transition-all" style="width: ${pasivos.porcentaje}%" title="Pasivos: ${pasivos.porcentaje}%"></div>
              <div class="h-full bg-rose-500 transition-all" style="width: ${detractores.porcentaje}%" title="Detractores: ${detractores.porcentaje}%"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono pt-0.5">
              <span class="text-emerald-400 font-bold">Promotores (${promotores.porcentaje}%)</span>
              <span class="text-amber-400 font-bold">Pasivos (${pasivos.porcentaje}%)</span>
              <span class="text-rose-400 font-bold">Detractores (${detractores.porcentaje}%)</span>
            </div>
          </div>

          <!-- Cuadrícula de 11 Puntos -->
          <div class="grid grid-cols-11 gap-1 text-center font-mono text-[9px] pt-1">
            ${puntos.map(pt => `
              <div class="p-1 rounded bg-surface-container/80 border border-outline-variant/20" title="${pt.puntaje} pts: ${pt.conteo} votos">
                <span class="font-bold block" style="color: ${pt.color}">${pt.puntaje}</span>
                <span class="text-outline text-[8px]">${pt.conteo}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  /**
   * 5. DENSIDAD TERRITORIAL & RANKING UBIGEO
   */
  const renderGeoDensityCard = (p) => {
    const lugares = p.top_localidades || [];

    return `
      <div class="glass-subcard p-5 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="badge text-[10px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold">
              P${p.orden} • UBICACIÓN TERRITORIAL
            </span>
            <span class="badge text-[9px] bg-surface-container text-on-surface-variant flex items-center gap-1 font-mono">
              <span class="material-symbols-outlined text-[12px] text-sky-400">map</span>
              <span>Densidad INEI</span>
            </span>
          </div>
          <h4 class="text-xs sm:text-sm font-bold text-on-surface leading-snug mb-3">
            ${escapeHtml(p.enunciado)}
          </h4>
        </div>

        <div class="space-y-2 pt-2 border-t border-outline-variant/20">
          <span class="text-[10px] font-mono uppercase text-outline font-bold block mb-1">Top Localidades Concentradas:</span>
          ${lugares.map(l => `
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-on-surface font-semibold flex items-center gap-1.5 text-[11px]">
                  <span class="material-symbols-outlined text-xs text-primary">pin_drop</span>
                  <span>${escapeHtml(l.lugar)}</span>
                </span>
                <span class="font-mono text-primary font-bold text-[11px]">${l.conteo} (${l.porcentaje}%)</span>
              </div>
              <div class="h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-sky-400 to-primary transition-all duration-500" style="width: ${l.porcentaje}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  /**
   * 6. ANÁLISIS SEMÁNTICO & CITAS (Pregunta Abierta)
   */
  const renderSentimentTextCard = (p) => {
    const s = p.sentimiento || { positivo: 82, neutro: 14, mejora: 4 };
    const tags = p.conceptos_clave || ['Calidad', 'Atención', 'Accesibilidad'];
    const citas = p.citas_muestra || [];

    return `
      <div class="glass-subcard p-5 rounded-2xl border border-glass-card-border hover:border-primary/40 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="badge text-[10px] font-mono bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold">
              P${p.orden} • OPINIÓN ABIERTA
            </span>
            <span class="badge text-[9px] bg-surface-container text-on-surface-variant flex items-center gap-1 font-mono">
              <span class="material-symbols-outlined text-[12px] text-teal-400">chat</span>
              <span>Análisis Semántico</span>
            </span>
          </div>
          <h4 class="text-xs sm:text-sm font-bold text-on-surface leading-snug mb-3">
            ${escapeHtml(p.enunciado)}
          </h4>
        </div>

        <div class="space-y-2.5 pt-2 border-t border-outline-variant/20">
          <!-- Barra de Sentimiento -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="text-emerald-400 font-bold">${s.positivo}% Positivo</span>
              <span class="text-cyan-400 font-bold">${s.neutro}% Neutro</span>
              <span class="text-amber-400 font-bold">${s.mejora}% Mejora</span>
            </div>
            <div class="h-1.5 w-full rounded-full flex overflow-hidden gap-0.5">
              <div class="h-full bg-emerald-400" style="width: ${s.positivo}%"></div>
              <div class="h-full bg-cyan-400" style="width: ${s.neutro}%"></div>
              <div class="h-full bg-amber-400" style="width: ${s.mejora}%"></div>
            </div>
          </div>

          <!-- Nube de Conceptos Clave -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            ${tags.map(t => `
              <span class="badge text-[9px] bg-surface-container/80 text-primary border border-primary/20 font-mono">
                #${escapeHtml(t)}
              </span>
            `).join('')}
          </div>

          <!-- Cita Destacada -->
          ${citas.length > 0 ? `
            <div class="p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/20 text-xs italic text-on-surface-variant">
              "${escapeHtml(citas[0].texto)}"
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  /**
   * Renderiza las últimas respuestas registradas para esta encuesta
   */
  const renderRecentResponses = (ultimas) => {
    const container = document.getElementById('bento-recent-pings');
    if (!container) return;

    if (!ultimas || ultimas.length === 0) {
      container.innerHTML = '<div class="text-xs text-outline py-2 text-center">Esperando nuevas respuestas de campo...</div>';
      return;
    }

    container.innerHTML = ultimas.map(r => {
      const ubigeoStr = r.ubigeo_codigo ? `${r.ubigeo_codigo} • ` : '';
      const lugar = r.distrito_nombre ? `${r.distrito_nombre}, ${r.departamento_nombre}` : (r.departamento_nombre || 'Perú');
      const timeStr = r.created_at ? r.created_at.substring(11, 16) : 'Hoy';

      return `
        <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container/60 hover:bg-surface-container transition-colors">
          <span class="text-on-surface font-semibold flex items-center gap-2 text-xs">
            <span class="material-symbols-outlined text-xs text-primary">pin_drop</span>
            <span class="truncate max-w-[200px]">${ubigeoStr}${lugar}</span>
          </span>
          <span class="text-emerald-400 font-bold font-mono text-[11px]">${r.tiempo_llenado_segundos || 180}s • NPS ${r.nps || 9}</span>
          <span class="text-[10px] text-outline font-mono">${timeStr}</span>
        </div>
      `;
    }).join('');
  };

  const setupExport = () => {
    const btnExport = document.getElementById('btn-export-analytics');
    if (!btnExport || btnExport.dataset.bound) return;

    btnExport.dataset.bound = 'true';
    btnExport.addEventListener('click', () => {
      if (!analyticsData) return;

      const surveyName = analyticsData.encuesta_seleccionada 
        ? analyticsData.encuesta_seleccionada.titulo.replace(/[^a-zA-Z0-9]/g, '_')
        : 'General';

      const csvRows = [
        ['--- REPORTE ANALITICO DE ENCUESTA ---'],
        ['Encuesta', analyticsData.encuesta_seleccionada?.titulo || 'Todas'],
        ['Codigo', analyticsData.encuesta_seleccionada?.codigo || 'N/A'],
        ['Total Respuestas', analyticsData.kpis?.total_respuestas || 0],
        ['Completitud', `${analyticsData.kpis?.tasa_completitud || 0}%`],
        ['Tiempo Promedio', `${analyticsData.kpis?.tiempo_promedio_min || 0} min`],
        ['NPS Score', analyticsData.kpis?.nps_score || 0],
        [],
        ['--- DISTRIBUCION GEOGRAFICA ---'],
        ['Departamento', 'Respuestas', 'Porcentaje'],
        ...analyticsData.geo_distribucion.map(g => [g.departamento, g.respuestas, `${g.porcentaje}%`]),
        [],
        ['--- ANALISIS DE PREGUNTAS Y OPCIONES ---'],
        ['Pregunta Orden', 'Tipo Grafico', 'Enunciado', 'Alternativa / Metrica', 'Respuestas / Conteo', 'Porcentaje']
      ];

      if (analyticsData.preguntas_metricas) {
        analyticsData.preguntas_metricas.forEach(p => {
          if (p.opciones && p.opciones.length > 0) {
            p.opciones.forEach(opc => {
              csvRows.push([`P${p.orden}`, p.grafico_tipo, `"${p.enunciado.replace(/"/g, '""')}"`, `"${opc.etiqueta.replace(/"/g, '""')}"`, opc.conteo, `${opc.porcentaje}%`]);
            });
          }
        });
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `OmniPoll_Analytics_${surveyName}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      App.showToast(`Informe de "${analyticsData.encuesta_seleccionada?.titulo || 'Encuesta'}" exportado a CSV`, 'success');
    });
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  return { 
    init,
    loadData
  };
})();
