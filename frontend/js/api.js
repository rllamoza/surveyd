/**
 * OmniPoll API Client
 * Conector REST con soporte híbrido (Backend PHP + Fallback Local)
 */

const API = (() => {
  // Detectar URL base del backend
  const getBaseUrl = () => {
    if (window.location.protocol === 'file:') {
      return 'http://localhost/APPS/app_encuestas/backend/api';
    }
    const pathParts = window.location.pathname.split('/');
    // Eliminar 'frontend' o el nombre del archivo si está presente
    const filtered = pathParts.filter(p => p && p !== 'frontend' && !p.endsWith('.html'));
    const basePath = filtered.length > 0 ? '/' + filtered.join('/') : '';
    return `${window.location.origin}${basePath}/backend/api`;
  };

  const BASE_URL = getBaseUrl();

  // Memoria local para fallback offline inmediato
  let localStore = {
    encuestas: [
      {
        id: 1,
        codigo: 'CENSO001',
        titulo: 'Censo Nacional de Conectividad & Servicios Digitales 2025',
        descripcion: 'Instrumento de recolección georreferenciado para el diseño de infraestructura de telecomunicaciones e inclusión digital.',
        norma_tecnica: 'DS-024-INEI-PE',
        categoria: 'Censo & Conectividad',
        version: 'v3.4-PRO',
        estado: 'aprobada',
        tiempo_estimado_min: 4,
        total_pasos: 4,
        resolucion_aprobacion: 'RES-DIR-088-2025/MTC',
        created_at: '2026-09-20 14:30:00'
      },
      {
        id: 2,
        codigo: 'CLIMA002',
        titulo: 'Adopción de Tecnologías Cloud e Inteligencia Artificial en Entidades Públicas',
        descripcion: 'Medición de madurez digital, gobierno de datos y ciberseguridad en el sector estatal peruano.',
        norma_tecnica: 'PCM-SGTD-004-2025',
        categoria: 'Innovación Pública',
        version: 'v2.1',
        estado: 'pendiente',
        tiempo_estimado_min: 6,
        total_pasos: 5,
        created_at: '2026-09-21 11:20:00'
      },
      {
        id: 3,
        codigo: 'EVALU003',
        titulo: 'Evaluación de Calidad de Atención en Establecimientos de Salud Red Sur',
        descripcion: 'Sondeo de percepción ciudadana en centros de salud del Minsa y EsSalud en regiones del sur.',
        norma_tecnica: 'NTS-142-MINSA/DGAIN',
        categoria: 'Salud Pública',
        version: 'v1.0',
        estado: 'aprobada',
        tiempo_estimado_min: 3,
        total_pasos: 3,
        resolucion_aprobacion: 'RES-MINSA-451-2025',
        created_at: '2026-09-18 09:15:00'
      },
      {
        id: 4,
        codigo: 'INCLU004',
        titulo: 'Inclusión Financiera y Uso de Billeteras Digitales en Comunidades Rurales',
        descripcion: 'Estudio sobre adopción de pagos digitales (Yape, Plin) y brecha de cajeros automáticos.',
        norma_tecnica: 'SBS-CIRC-B-2240',
        categoria: 'Inclusión Financiera',
        version: 'v1.2',
        estado: 'rechazada',
        tiempo_estimado_min: 7,
        total_pasos: 5,
        motivo_rechazo: 'Requiere ampliar el bloque de preguntas de ciberseguridad y consentimiento explícito conforme a la Ley 29733.',
        created_at: '2026-09-22 09:15:00'
      }
    ],
    departamentos: [
      { codigo: '01', nombre: 'Amazonas' }, { codigo: '02', nombre: 'Áncash' },
      { codigo: '03', nombre: 'Apurímac' }, { codigo: '04', nombre: 'Arequipa' },
      { codigo: '05', nombre: 'Ayacucho' }, { codigo: '06', nombre: 'Cajamarca' },
      { codigo: '07', nombre: 'Callao' }, { codigo: '08', nombre: 'Cusco' },
      { codigo: '09', nombre: 'Huancavelica' }, { codigo: '10', nombre: 'Huánuco' },
      { codigo: '11', nombre: 'Ica' }, { codigo: '12', nombre: 'Junín' },
      { codigo: '13', nombre: 'La Libertad' }, { codigo: '14', nombre: 'Lambayeque' },
      { codigo: '15', nombre: 'Lima' }, { codigo: '16', nombre: 'Loreto' },
      { codigo: '17', nombre: 'Madre de Dios' }, { codigo: '18', nombre: 'Moquegua' },
      { codigo: '19', nombre: 'Pasco' }, { codigo: '20', nombre: 'Piura' },
      { codigo: '21', nombre: 'Puno' }, { codigo: '22', nombre: 'San Martín' },
      { codigo: '23', nombre: 'Tacna' }, { codigo: '24', nombre: 'Tumbes' },
      { codigo: '25', nombre: 'Ucayali' }
    ],
    provincias: [
      { codigo: '1501', dep_codigo: '15', nombre: 'Lima Metropolitana' },
      { codigo: '1502', dep_codigo: '15', nombre: 'Barranca' },
      { codigo: '1505', dep_codigo: '15', nombre: 'Cañete' },
      { codigo: '0701', dep_codigo: '07', nombre: 'Prov. Const. del Callao' },
      { codigo: '0401', dep_codigo: '04', nombre: 'Arequipa' },
      { codigo: '0801', dep_codigo: '08', nombre: 'Cusco' },
      { codigo: '1301', dep_codigo: '13', nombre: 'Trujillo' },
      { codigo: '2001', dep_codigo: '20', nombre: 'Piura' },
      { codigo: '1201', dep_codigo: '12', nombre: 'Huancayo' },
      { codigo: '1401', dep_codigo: '14', nombre: 'Chiclayo' }
    ],
    distritos: [
      { codigo: '150101', prov_codigo: '1501', nombre: 'Lima (Cercado)' },
      { codigo: '150122', prov_codigo: '1501', nombre: 'Miraflores' },
      { codigo: '150131', prov_codigo: '1501', nombre: 'San Isidro' },
      { codigo: '150140', prov_codigo: '1501', nombre: 'Santiago de Surco' },
      { codigo: '150132', prov_codigo: '1501', nombre: 'San Juan de Lurigancho' },
      { codigo: '150130', prov_codigo: '1501', nombre: 'San Borja' },
      { codigo: '070101', prov_codigo: '0701', nombre: 'Callao' },
      { codigo: '070102', prov_codigo: '0701', nombre: 'Bellavista' },
      { codigo: '040101', prov_codigo: '0401', nombre: 'Arequipa' },
      { codigo: '040103', prov_codigo: '0401', nombre: 'Cayma' },
      { codigo: '080101', prov_codigo: '0801', nombre: 'Cusco' },
      { codigo: '130101', prov_codigo: '1301', nombre: 'Trujillo' },
      { codigo: '200101', prov_codigo: '2001', nombre: 'Piura' },
      { codigo: '120101', prov_codigo: '1201', nombre: 'Huancayo' }
    ],
    respuestas: [
      { id: 1, encuesta_id: 1, departamento: 'Lima', provincia: 'Lima Metropolitana', distrito: 'Miraflores', tiempo_llenado_segundos: 185, satisfaccion: 5, nps: 9 },
      { id: 2, encuesta_id: 1, departamento: 'Lima', provincia: 'Lima Metropolitana', distrito: 'San Isidro', tiempo_llenado_segundos: 142, satisfaccion: 4, nps: 8 },
      { id: 3, encuesta_id: 1, departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Arequipa', tiempo_llenado_segundos: 210, satisfaccion: 4, nps: 7 },
      { id: 4, encuesta_id: 1, departamento: 'Cusco', provincia: 'Cusco', distrito: 'Cusco', tiempo_llenado_segundos: 195, satisfaccion: 5, nps: 10 },
      { id: 5, encuesta_id: 1, departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', tiempo_llenado_segundos: 160, satisfaccion: 3, nps: 6 },
      { id: 6, encuesta_id: 1, departamento: 'Callao', provincia: 'Prov. Const. del Callao', distrito: 'Bellavista', tiempo_llenado_segundos: 178, satisfaccion: 4, nps: 8 }
    ],
    auditoria: [
      { id: 1, encuesta_id: 1, accion: 'aprobada', usuario: 'Ing. Carlos Valdivia', resolucion: 'RES-DIR-088-2025/MTC', comentario: 'Estructura metodológica validada.', fecha: '2026-09-20 14:30:00' },
      { id: 2, encuesta_id: 4, accion: 'rechazada', usuario: 'Ing. Carlos Valdivia', comentario: 'Requiere consentimiento explícito Ley 29733.', fecha: '2026-09-22 09:15:00' }
    ]
  };

  const request = async (endpoint, options = {}) => {
    try {
      const token = localStorage.getItem('omnipoll_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${BASE_URL}/${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
        ...options
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        return json.data !== undefined ? json.data : json;
      }
      return json || { success: false, error: `HTTP ${res.status}` };
    } catch (err) {
      console.warn(`[OmniPoll API Fallback] '${endpoint}' no disponible vía HTTP (${err.message}). Usando almacén en memoria.`);
      return null;
    }
  };

  return {
    // --- AUTENTICACIÓN & SESIÓN RBAC ---
    async login(identifier, password) {
      try {
        const res = await fetch(`${BASE_URL}/auth.php?action=login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: identifier,
            username: identifier,
            email: identifier,
            pass: password,
            password: password
          })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('omnipoll_token', data.token);
          localStorage.setItem('omnipoll_user', JSON.stringify(data.usuario));
        }
        return data;
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async checkSession() {
      const token = localStorage.getItem('omnipoll_token');
      if (!token) return { success: false, authenticated: false };

      try {
        const res = await fetch(`${BASE_URL}/auth.php?action=check_session`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.usuario) {
            localStorage.setItem('omnipoll_user', JSON.stringify(data.usuario));
          }
          return data;
        }
        return { success: false, authenticated: false };
      } catch (err) {
        const cached = localStorage.getItem('omnipoll_user');
        if (cached) {
          return { success: true, authenticated: true, usuario: JSON.parse(cached) };
        }
        return { success: false, authenticated: false };
      }
    },

    async logout() {
      const token = localStorage.getItem('omnipoll_token');
      try {
        if (token) {
          await fetch(`${BASE_URL}/auth.php?action=logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      } catch (e) {}
      localStorage.removeItem('omnipoll_token');
      localStorage.removeItem('omnipoll_user');
      return { success: true };
    },

    // --- GESTIÓN DE USUARIOS ---
    async getUsuarios() {
      const res = await request('usuarios.php');
      return res || { success: false, usuarios: [] };
    },

    async createUsuario(userData) {
      const res = await request('usuarios.php', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      return res;
    },

    async updateUsuario(userData) {
      const res = await request('usuarios.php', {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      return res;
    },

    async deactivateUsuario(id) {
      const res = await request(`usuarios.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return res;
    },

    // --- ROLES & PERMISOS ---
    async getRoles() {
      const res = await request('roles.php');
      return res || { success: false, roles: [], matriz_permisos: {} };
    },
    // --- UBIGEO ---
    async getDepartamentos() {
      const res = await request('ubigeo.php?action=departamentos');
      return res || localStore.departamentos;
    },

    async getProvincias(depCodigo) {
      const res = await request(`ubigeo.php?action=provincias&dep=${encodeURIComponent(depCodigo)}`);
      if (res) return res;
      return localStore.provincias.filter(p => p.dep_codigo === depCodigo);
    },

    async getDistritos(provCodigo) {
      const res = await request(`ubigeo.php?action=distritos&prov=${encodeURIComponent(provCodigo)}`);
      if (res) return res;
      return localStore.distritos.filter(d => d.prov_codigo === provCodigo);
    },

    // --- ENCUESTAS ---
    async getEncuestas(params = {}) {
      const q = new URLSearchParams(params).toString();
      const res = await request(`encuestas.php${q ? '?' + q : ''}`);
      if (res) return res;
      
      let list = [...localStore.encuestas];
      if (params.estado && params.estado !== 'todos') {
        list = list.filter(e => e.estado.toLowerCase() === params.estado.toLowerCase());
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        list = list.filter(e => e.titulo.toLowerCase().includes(s) || e.codigo.toLowerCase().includes(s));
      }
      return list;
    },

    async getEncuesta(idOrCodigo) {
      const q = isNaN(idOrCodigo) ? `codigo=${encodeURIComponent(idOrCodigo)}` : `id=${encodeURIComponent(idOrCodigo)}`;
      const res = await request(`encuestas.php?${q}`);
      if (res) return res;

      const searchKey = String(idOrCodigo).trim().toUpperCase();
      return localStore.encuestas.find(e => 
        e.id === Number(idOrCodigo) || 
        (e.codigo && e.codigo.toUpperCase() === searchKey)
      ) || localStore.encuestas[0];
    },

    async createEncuesta(payload) {
      const res = await request('encuestas.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) return res;

      const nuevoId = localStore.encuestas.length + 1;
      const cleanTitle = (payload.titulo || 'POLL')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase();
      const codeLetters = cleanTitle.padEnd(5, 'X').substring(0, 5);
      const codGenerated = `${codeLetters}${String(nuevoId).padStart(3, '0')}`;

      const nuevo = {
        id: nuevoId,
        codigo: codGenerated,
        titulo: payload.titulo,
        descripcion: payload.descripcion || '',
        norma_tecnica: payload.norma_tecnica || 'OMNI-STD-2026',
        categoria: payload.categoria || 'General',
        estado: payload.publicar ? 'aprobada' : (payload.estado || 'pendiente'),
        tiempo_estimado_min: 5,
        total_pasos: payload.preguntas ? payload.preguntas.length : 4,
        url_publica: `encuesta.html?id=${codGenerated}`,
        url_runner: `?encuesta=${codGenerated}`,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      localStore.encuestas.unshift(nuevo);
      return nuevo;
    },

    async updateBranding(encuestaId, brandingPayload) {
      const res = await request('encuestas.php?action=update_branding', {
        method: 'POST',
        body: JSON.stringify({ encuesta_id: encuestaId, branding: brandingPayload })
      });
      return res;
    },

    // --- RESPUESTAS DE ENCUESTA ---
    async submitRespuesta(payload) {
      const res = await request('respuestas.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) return res;

      const nueva = {
        id: localStore.respuestas.length + 1,
        encuesta_id: payload.encuesta_id || 1,
        codigo_sesion: payload.codigo_sesion || `SES-${Date.now()}`,
        departamento: payload.ubigeo?.departamento || 'Lima',
        provincia: payload.ubigeo?.provincia || 'Lima Metropolitana',
        distrito: payload.ubigeo?.distrito || 'Miraflores',
        tiempo_llenado_segundos: payload.tiempo_llenado_segundos || 150,
        satisfaccion: 5,
        nps: 9,
        fecha: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      localStore.respuestas.push(nueva);
      return {
        recibo_id: 'OMNI-HASH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        codigo_sesion: nueva.codigo_sesion,
        estado: 'REGISTRADA_LOCAL'
      };
    },

    // --- APROBACIONES & AUDITORÍA ---
    async getAprobaciones(estado = null) {
      const res = await request(`aprobaciones.php${estado ? '?estado=' + estado : ''}`);
      if (res) return res;

      let filtered = [...localStore.encuestas];
      if (estado && estado !== 'todos') {
        filtered = filtered.filter(e => e.estado.toLowerCase() === estado.toLowerCase());
      }
      return {
        encuestas: filtered,
        kpis: {
          total: localStore.encuestas.length,
          pendientes: localStore.encuestas.filter(e => e.estado === 'pendiente').length,
          aprobadas: localStore.encuestas.filter(e => e.estado === 'aprobada').length,
          rechazadas: localStore.encuestas.filter(e => e.estado === 'rechazada').length
        },
        auditoria_reciente: localStore.auditoria
      };
    },

    async setAprobacion(payload) {
      const res = await request('aprobaciones.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) return res;

      const enc = localStore.encuestas.find(e => e.id === Number(payload.encuesta_id));
      if (enc) {
        enc.estado = payload.accion === 'aprobar' ? 'aprobada' : 'rechazada';
        if (payload.accion === 'aprobar') {
          enc.resolucion_aprobacion = payload.resolucion_oficial || 'RES-DIR-099-2026/MTC';
          enc.motivo_rechazo = null;
        } else {
          enc.motivo_rechazo = payload.comentario || 'Rechazada en auditoría.';
        }
      }
      localStore.auditoria.unshift({
        id: localStore.auditoria.length + 1,
        encuesta_id: payload.encuesta_id,
        accion: payload.accion,
        usuario: 'Ing. Carlos Valdivia',
        comentario: payload.comentario || '',
        fecha: new Date().toISOString().replace('T', ' ').slice(0, 19)
      });
      return { success: true };
    },

    // --- BENTO ANALYTICS ---
    async getAnalytics(encuestaId = null, usuarioId = null) {
      const params = new URLSearchParams();
      if (encuestaId) params.append('encuesta_id', encuestaId);
      if (usuarioId) params.append('usuario_id', usuarioId);
      const q = params.toString();
      const res = await request(`analytics.php${q ? '?' + q : ''}`);
      if (res) return res;

      return {
        kpis: {
          total_respuestas: localStore.respuestas.length + 3840,
          encuestas_activas: localStore.encuestas.filter(e => e.estado === 'aprobada').length,
          tasa_completitud: 94.6,
          tiempo_promedio_min: 2.8,
          satisfaccion_promedio: 4.8,
          nps_score: 72,
          cluster_activo: 'LatAm South-1 (Perú)',
          sesiones_cifradas: 4492
        },
        geo_distribucion: [
          { departamento: 'Lima', respuestas: 1840, porcentaje: 47.9 },
          { departamento: 'Arequipa', respuestas: 620, porcentaje: 16.1 },
          { departamento: 'Cusco', respuestas: 490, porcentaje: 12.8 },
          { departamento: 'La Libertad', respuestas: 380, porcentaje: 9.9 },
          { departamento: 'Piura', respuestas: 290, porcentaje: 7.6 },
          { departamento: 'Otras Regiones', respuestas: 220, porcentaje: 5.7 }
        ],
        conectividad: [
          { tipo: 'Fibra Óptica (FTTH)', porcentaje: 64.2, color: '#00f2fe', icono: 'cable' },
          { tipo: 'Cable Coaxial (HFC)', porcentaje: 21.8, color: '#d946ef', icono: 'router' },
          { tipo: 'Banda Ancha Móvil 4G/5G', porcentaje: 10.5, color: '#10b981', icono: 'cell_tower' },
          { tipo: 'Satelital (LEO / Starlink)', porcentaje: 3.5, color: '#f59e0b', icono: 'satellite_alt' }
        ],
        dispositivos: [
          { nombre: 'Smartphones 5G/4G', tasa: 96.4, muestra: 'Alta Frecuencia' },
          { nombre: 'Laptops & Computadoras', tasa: 78.1, muestra: 'Teletrabajo/Estudio' },
          { nombre: 'Smart TV & Streaming', tasa: 65.0, muestra: 'Hogar' },
          { nombre: 'Tablets Educativas', tasa: 34.2, muestra: 'Escolar' },
          { nombre: 'Dispositivos IoT Domótica', tasa: 22.8, muestra: 'Urbano' }
        ],
        serie_temporal: [
          { hora: '08:00', conteo: 48 },
          { hora: '10:00', conteo: 124 },
          { hora: '12:00', conteo: 245 },
          { hora: '14:00', conteo: 180 },
          { hora: '16:00', conteo: 310 },
          { hora: '18:00', conteo: 285 }
        ]
      };
    },

    // --- IMPORTAR EXCEL ---
    async importarExcel(payload) {
      const res = await request('import_excel.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) return res;

      const nueva = {
        id: localStore.encuestas.length + 1,
        codigo: `POLL-XLS-${Date.now().toString().slice(-4)}`,
        titulo: payload.titulo || 'Encuesta Excel Importada',
        descripcion: payload.descripcion || 'Encuesta estructurada desde archivo de datos.',
        categoria: payload.categoria || 'Importación Excel',
        norma_tecnica: 'OMNI-XLSX-V1',
        version: 'v1.0-EXCEL',
        estado: 'pendiente',
        tiempo_estimado_min: 4,
        total_pasos: payload.preguntas ? payload.preguntas.length : 3,
        preguntas: payload.preguntas || [],
        };
      localStore.encuestas.unshift(nueva);
      return { encuesta: nueva, preguntas_importadas: nueva.total_pasos };
    },

    // --- EXPORTAR EXCEL ---
    getBaseUrl() {
      return BASE_URL;
    },

    getExportExcelUrl(encuestaId, usuarioId = null) {
      const params = new URLSearchParams();
      if (encuestaId) params.append('encuesta_id', encuestaId);
      if (usuarioId) params.append('usuario_id', usuarioId);
      const q = params.toString();
      return `${BASE_URL}/export_excel.php${q ? '?' + q : ''}`;
    }
  };
})();
