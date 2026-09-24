/**
 * OmniPoll - Panel de Aprobación SuperAdmin y Auditoría
 * Spatial Data Intelligence Core
 */

const AdminApproval = (() => {
  let activeFilter = 'todos';
  let encuestasList = [];
  let selectedEncuesta = null;

  const init = async () => {
    setupFilterTabs();
    setupModals();
    await loadData();
  };

  const setupFilterTabs = () => {
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', async (e) => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active', 'bg-surface-container-high', 'text-primary-container'));
        e.currentTarget.classList.add('active', 'bg-surface-container-high', 'text-primary-container');
        activeFilter = e.currentTarget.dataset.filter;
        await loadData();
      });
    });
  };

  const loadData = async () => {
    const data = await API.getAprobaciones(activeFilter);
    encuestasList = data.encuestas || [];

    // Renderizar KPIs
    if (data.kpis) {
      updateKpi('kpi-total', data.kpis.total);
      updateKpi('kpi-pendientes', data.kpis.pendientes);
      updateKpi('kpi-aprobadas', data.kpis.aprobadas);
      updateKpi('kpi-rechazadas', data.kpis.rechazadas);
    }

    renderTable(encuestasList);
    renderAuditTimeline(data.auditoria_reciente || []);
  };

  const updateKpi = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const renderTable = (list) => {
    const tbody = document.getElementById('approval-table-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-on-surface-variant">
            No se encontraron encuestas con el filtro seleccionado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(e => `
      <tr class="border-b border-glass-card-border hover:bg-primary/5 transition-colors">
        <td class="p-4">
          <div class="flex flex-col">
            <span class="font-headline text-sm font-bold text-on-surface">${escapeHtml(e.titulo)}</span>
            <span class="text-xs font-mono text-primary font-semibold">${escapeHtml(e.codigo)}</span>
          </div>
        </td>
        <td class="p-4">
          <span class="badge badge-glass text-xs font-mono font-semibold">
            ${escapeHtml(e.norma_tecnica || 'N/A')}
          </span>
        </td>
        <td class="p-4">
          <span class="text-xs text-on-surface-variant font-medium">${e.categoria || 'General'}</span>
        </td>
        <td class="p-4">
          ${getStatusBadge(e.estado)}
        </td>
        <td class="p-4">
          <span class="font-mono text-xs font-bold text-primary">${e.total_respuestas !== undefined ? e.total_respuestas : 0}</span>
        </td>
        <td class="p-4 text-right">
          <div class="flex items-center justify-end gap-2">
            ${e.estado === 'pendiente' ? `
              <button class="btn btn-success text-xs py-1.5 px-3" onclick="AdminApproval.openApproveModal(${e.id})">
                <span class="material-symbols-outlined text-sm">verified</span>
                <span>Aprobar</span>
              </button>
              <button class="btn btn-danger text-xs py-1.5 px-3" onclick="AdminApproval.openRejectModal(${e.id})">
                <span class="material-symbols-outlined text-sm">cancel</span>
                <span>Rechazar</span>
              </button>
            ` : `
              <button class="btn btn-secondary text-xs py-1.5 px-3" onclick="AdminApproval.openPreviewModal(${e.id})">
                <span class="material-symbols-outlined text-sm">visibility</span>
                <span>Detalles</span>
              </button>
            `}
          </div>
        </td>
      </tr>
    `).join('');
  };

  const getStatusBadge = (estado) => {
    switch (estado.toLowerCase()) {
      case 'aprobada':
        return '<span class="badge badge-approved"><span class="material-symbols-outlined text-xs">check_circle</span> Aprobada</span>';
      case 'pendiente':
        return '<span class="badge badge-pending"><span class="material-symbols-outlined text-xs">schedule</span> Pendiente</span>';
      case 'rechazada':
        return '<span class="badge badge-rejected"><span class="material-symbols-outlined text-xs">error</span> Rechazada</span>';
      default:
        return `<span class="badge bg-surface-container">${estado}</span>`;
    }
  };

  const renderAuditTimeline = (auditoria) => {
    const container = document.getElementById('audit-timeline-container');
    if (!container) return;

    if (auditoria.length === 0) {
      container.innerHTML = '<p class="text-xs text-on-surface-variant">Sin eventos de auditoría registrados.</p>';
      return;
    }

    container.innerHTML = auditoria.map(a => `
      <div class="relative pl-6 pb-4 border-l border-outline-variant/30 last:border-0">
        <span class="absolute -left-1.5 top-0 h-3 w-3 rounded-full ${a.accion === 'aprobada' ? 'bg-tertiary-fixed' : (a.accion === 'rechazada' ? 'bg-error' : 'bg-primary-container')}"></span>
        <div class="flex items-center justify-between text-xs text-on-surface-variant mb-1">
          <span class="font-bold text-on-surface uppercase">${a.accion}</span>
          <span class="font-mono text-[10px]">${a.fecha || 'Reciente'}</span>
        </div>
        <p class="text-xs text-on-surface mb-1">${escapeHtml(a.comentario || 'Acción procesada en consola SuperAdmin.')}</p>
        ${a.resolucion ? `<span class="text-[10px] font-mono text-tertiary-fixed">${escapeHtml(a.resolucion)}</span>` : ''}
      </div>
    `).join('');
  };

  const setupModals = () => {
    const btnConfirmApprove = document.getElementById('btn-confirm-approve');
    if (btnConfirmApprove) {
      btnConfirmApprove.addEventListener('click', async () => {
        if (!selectedEncuesta) return;
        const resInput = document.getElementById('approve-resolution-input');
        const resolucion = resInput ? resInput.value.trim() : '';

        await API.setAprobacion({
          encuesta_id: selectedEncuesta.id,
          accion: 'aprobar',
          resolucion_oficial: resolucion || 'RES-DIR-099-2026/MTC',
          comentario: 'Validado conforme a la norma técnica oficial.'
        });

        closeModal('modal-approve');
        App.showToast(`Encuesta "${selectedEncuesta.titulo}" aprobada oficialmente`, 'success');
        await loadData();
      });
    }

    const btnConfirmReject = document.getElementById('btn-confirm-reject');
    if (btnConfirmReject) {
      btnConfirmReject.addEventListener('click', async () => {
        if (!selectedEncuesta) return;
        const reasonInput = document.getElementById('reject-reason-input');
        const motivo = reasonInput ? reasonInput.value.trim() : '';

        if (!motivo) {
          App.showToast('Debe ingresar un motivo de rechazo u observación', 'error');
          return;
        }

        await API.setAprobacion({
          encuesta_id: selectedEncuesta.id,
          accion: 'rechazar',
          comentario: motivo
        });

        closeModal('modal-reject');
        App.showToast(`Encuesta rechazada con observaciones`, 'info');
        await loadData();
      });
    }
  };

  const openApproveModal = (id) => {
    selectedEncuesta = encuestasList.find(e => e.id === id);
    if (!selectedEncuesta) return;

    const titleEl = document.getElementById('approve-modal-survey-title');
    if (titleEl) titleEl.textContent = selectedEncuesta.titulo;

    const resInput = document.getElementById('approve-resolution-input');
    if (resInput) resInput.value = `RES-DIR-${Math.floor(100 + Math.random() * 900)}-2026/MTC`;

    openModal('modal-approve');
  };

  const openRejectModal = (id) => {
    selectedEncuesta = encuestasList.find(e => e.id === id);
    if (!selectedEncuesta) return;

    const titleEl = document.getElementById('reject-modal-survey-title');
    if (titleEl) titleEl.textContent = selectedEncuesta.titulo;

    openModal('modal-reject');
  };

  const openPreviewModal = (id) => {
    const enc = encuestasList.find(e => e.id === id);
    if (!enc) return;
    App.showToast(`Visualizando: ${enc.titulo} (${enc.codigo})`);
  };

  const openModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  };

  const closeModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  return { init, openApproveModal, openRejectModal, openPreviewModal, closeModal };
})();
