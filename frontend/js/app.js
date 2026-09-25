/**
 * OmniPoll - Spatial Data Intelligence Core
 * Coordinador Principal de Navegación, RBAC, Tema y Gestión de Usuarios
 */

const App = (() => {
  let currentRoute = 'encuestas-activas';
  
  // Usuario activo en el sistema con permisos por defecto (SuperAdmin Root)
  let currentUser = {
    id: 1,
    nombre: 'Raúl Llamoza',
    email: 'rllamoza@gmail.com',
    rol: 'superadmin',
    rol_nombre: 'SuperAdmin Root',
    cargo: 'Director General & Administrador del Sistema',
    sede: 'Lima Metropolitana (Sede Central)',
    cluster: 'LatAm South-1 (Perú MySQL Local)',
    permisos: [
      'encuestas.ver', 'encuestas.responder', 'encuestas.crear', 'encuestas.editar', 'encuestas.eliminar',
      'constructor.ver', 'constructor.crear', 'constructor.editar', 'constructor.importar_excel',
      'aprobaciones.ver', 'aprobaciones.aprobar', 'aprobaciones.rechazar', 'aprobaciones.firmar',
      'analitica.ver', 'analitica.exportar', 'analitica.filtrar_ubigeo',
      'usuarios.ver', 'usuarios.gestionar', 'roles.ver'
    ]
  };

  let systemRoles = [];
  let rolesMatrix = {};

  const init = async () => {
    initTheme();
    setupNavigation();
    setupThemeToggle();
    setupUserDropdown();
    setupNotifications();
    setupMobileSidebar();
    setupLoginModal();
    setupUserManagement();
    setupRolesMatrixModal();

    // Comprobar sesión existente (sin auto-login bypass)
    const hasSession = await checkAuthSession();

    if (hasSession) {
      // Inicializar módulos de la aplicación solo si está autenticado
      await SurveyRunner.init();
      SurveyBuilder.init();
      await AdminApproval.init();
      await BentoAnalytics.init();

      // Cargar matriz de roles
      await loadRolesAndMatrix();

      // Configurar ruta inicial respetando permisos
      navigateTo(currentRoute);
    }
  };

  /* ==========================================================================
     SISTEMA DE AUTENTICACIÓN & SESIÓN RBAC
     ========================================================================== */
  const checkAuthSession = async () => {
    const token = localStorage.getItem('omnipoll_token');
    if (token) {
      const res = await API.checkSession();
      if (res && res.authenticated && res.usuario) {
        currentUser = res.usuario;
      } else {
        currentUser = null;
        localStorage.removeItem('omnipoll_token');
        localStorage.removeItem('omnipoll_user');
      }
    } else {
      currentUser = null;
    }

    applyUserToUI();

    if (!currentUser) {
      openModal('modal-login');
      return false;
    }
    return true;
  };

  const hasPermission = (permKey) => {
    if (!currentUser) return false;
    if (currentUser.rol === 'superadmin') return true;
    if (!currentUser.permisos || !Array.isArray(currentUser.permisos)) return false;
    return currentUser.permisos.includes(permKey);
  };

  const applyUserToUI = () => {
    const quickLogoutBtn = document.getElementById('btn-quick-logout');
    const closeLoginModalBtn = document.getElementById('btn-close-modal-login');

    if (!currentUser) {
      if (quickLogoutBtn) quickLogoutBtn.classList.add('hidden');
      if (closeLoginModalBtn) closeLoginModalBtn.classList.add('hidden');

      const headerName = document.getElementById('header-user-name');
      const headerRole = document.getElementById('header-user-role');
      if (headerName) headerName.textContent = 'Sin Sesión';
      if (headerRole) headerRole.textContent = 'Acceso Requerido';

      const sideName = document.getElementById('sidebar-user-name');
      const sideRole = document.getElementById('sidebar-user-role');
      if (sideName) sideName.textContent = 'No Autenticado';
      if (sideRole) sideRole.textContent = 'Inicie Sesión';

      applyNavPermissions();
      return;
    }

    if (quickLogoutBtn) quickLogoutBtn.classList.remove('hidden');
    if (closeLoginModalBtn) closeLoginModalBtn.classList.remove('hidden');

    // Actualizar elementos de cabecera
    const headerName = document.getElementById('header-user-name');
    const headerRole = document.getElementById('header-user-role');
    const headerAvatar = document.getElementById('header-user-avatar');

    if (headerName) headerName.textContent = currentUser.nombre;
    if (headerRole) headerRole.textContent = currentUser.rol_nombre || currentUser.rol;
    if (headerAvatar && currentUser.avatar_url) headerAvatar.src = currentUser.avatar_url;

    // Actualizar elementos del dropdown
    const dropName = document.getElementById('dropdown-user-name');
    const dropEmail = document.getElementById('dropdown-user-email');
    const dropRole = document.getElementById('dropdown-user-role');
    const dropAvatar = document.getElementById('dropdown-user-avatar');

    if (dropName) dropName.textContent = currentUser.nombre;
    if (dropEmail) dropEmail.textContent = currentUser.email;
    if (dropRole) dropRole.textContent = currentUser.rol_nombre || currentUser.rol;
    if (dropAvatar && currentUser.avatar_url) dropAvatar.src = currentUser.avatar_url;

    // Actualizar elementos en la barra lateral
    const sideName = document.getElementById('sidebar-user-name');
    const sideRole = document.getElementById('sidebar-user-role');
    if (sideName) sideName.textContent = currentUser.nombre;
    if (sideRole) sideRole.textContent = currentUser.rol_nombre || currentUser.rol;

    // Actualizar modal de perfil
    const modalProfileName = document.querySelector('#modal-user-profile h3');
    const modalProfileEmail = document.querySelector('#modal-user-profile span.font-mono');
    const modalProfileCargo = document.querySelectorAll('#modal-user-profile span.font-semibold')[0];
    if (modalProfileName) modalProfileName.textContent = currentUser.nombre;
    if (modalProfileEmail) modalProfileEmail.textContent = currentUser.email;
    if (modalProfileCargo) modalProfileCargo.textContent = currentUser.cargo || 'Funcionario OmniPoll';

    // Aplicar RBAC a navegación en la barra lateral
    applyNavPermissions();
  };

  const applyNavPermissions = () => {
    const navModules = [
      { id: 'nav-encuestas-activas', perm: 'encuestas_activas.ver', path: 'encuestas-activas' },
      { id: 'nav-constructor-excel', perm: 'constructor_excel.ver', path: 'constructor-excel' },
      { id: 'nav-bento-analytics', perm: 'bento_analytics.ver', path: 'bento-analytics' },
      { id: 'nav-aprobacion-admin', perm: 'aprobacion_admin.ver', path: 'aprobacion-admin' },
      { id: 'nav-gestion-usuarios', perm: 'gestion_usuarios.ver', path: 'gestion-usuarios' }
    ];

    if (!currentUser) {
      navModules.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.style.display = 'none';
      });
      const optManage = document.getElementById('opt-manage-users');
      if (optManage) optManage.style.display = 'none';
      const optMatrix = document.getElementById('opt-roles-matrix');
      if (optMatrix) optMatrix.style.display = 'none';
      return;
    }

    let firstAllowedPath = null;

    navModules.forEach(item => {
      const el = document.getElementById(item.id);
      const allowed = hasPermission(item.perm) || hasPermission(item.perm.split('_')[0] + '.ver');
      if (el) {
        if (allowed) {
          el.style.display = 'flex';
          if (!firstAllowedPath) firstAllowedPath = item.path;
        } else {
          el.style.display = 'none';
        }
      }
    });

    // Opciones del dropdown
    const optManage = document.getElementById('opt-manage-users');
    if (optManage) {
      optManage.style.display = (hasPermission('gestion_usuarios.ver') || hasPermission('usuarios.ver')) ? 'flex' : 'none';
    }

    const optMatrix = document.getElementById('opt-roles-matrix');
    if (optMatrix) {
      optMatrix.style.display = (hasPermission('gestion_usuarios.roles') || hasPermission('roles.ver')) ? 'flex' : 'none';
    }

    // Si la ruta actual no está permitida, redirigir a la primera permitida
    const currentModule = navModules.find(m => m.path === currentRoute);
    if (currentModule) {
      const canAccessCurrent = hasPermission(currentModule.perm) || hasPermission(currentModule.perm.split('_')[0] + '.ver');
      if (!canAccessCurrent && firstAllowedPath) {
        navigateTo(firstAllowedPath);
      }
    }
  };

  /* ==========================================================================
     MODAL DE LOGIN & ACCESO RÁPIDO
     ========================================================================== */
  const setupLoginModal = () => {
    const formLogin = document.getElementById('form-login');
    const emailInput = document.getElementById('login-email');
    const pwdInput = document.getElementById('login-password');
    const togglePwdBtn = document.getElementById('btn-toggle-login-pwd');
    const errorAlert = document.getElementById('login-error-alert');
    const errorText = document.getElementById('login-error-text');

    if (togglePwdBtn && pwdInput) {
      togglePwdBtn.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        togglePwdBtn.innerHTML = `<span class="material-symbols-outlined text-base">${isPwd ? 'visibility_off' : 'visibility'}</span>`;
      });
    }

    const executeLogin = async (identifier, password) => {
      if (errorAlert) errorAlert.classList.add('hidden');
      const submitBtn = document.getElementById('btn-login-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">refresh</span><span>Verificando BCRYPT...</span>`;
      }

      const res = await API.login(identifier, password);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="material-symbols-outlined text-base">login</span><span>Iniciar Sesión en el Núcleo</span>`;
      }

      if (res && res.success && res.usuario) {
        currentUser = res.usuario;
        if (res.token) {
          localStorage.setItem('omnipoll_token', res.token);
          localStorage.setItem('omnipoll_user', JSON.stringify(res.usuario));
        }
        applyUserToUI();
        closeModal('modal-login');
        showToast(`Bienvenido al Núcleo, ${currentUser.nombre} (${currentUser.rol_nombre || currentUser.rol})`, 'success');

        // Inicializar módulos de la aplicación si no se habían inicializado
        await SurveyRunner.init();
        SurveyBuilder.init();
        await AdminApproval.init();
        await BentoAnalytics.init();
        await loadRolesAndMatrix();

        if (currentUser.rol === 'cliente') {
          navigateTo('bento-analytics');
        } else if (currentRoute === 'bento-analytics') {
          if (typeof BentoAnalytics !== 'undefined') BentoAnalytics.init();
        } else if (currentRoute === 'gestion-usuarios') {
          loadUsersTable();
        } else {
          navigateTo(currentRoute || 'encuestas-activas');
        }
      } else {
        if (errorAlert && errorText) {
          errorText.textContent = res.error || 'Credenciales inválidas. Verifique usuario o contraseña.';
          errorAlert.classList.remove('hidden');
        }
      }
    };

    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = emailInput.value.trim();
        const password = pwdInput.value;
        if (!identifier || !password) return;
        await executeLogin(identifier, password);
      });
    }

    // Botones de 1-clic para cuentas Demo
    document.querySelectorAll('.btn-demo-account').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const identifier = btn.dataset.email;
        if (emailInput) emailInput.value = identifier;
        if (pwdInput) pwdInput.value = 'admin123';
        await executeLogin(identifier, 'admin123');
      });
    });
  };

  /* ==========================================================================
     SISTEMA DE TEMA ALTO CONTRASTE (DÍA / NOCHE)
     ========================================================================== */
  const initTheme = () => {
    // Por defecto Modo Día / Claro
    let savedTheme = localStorage.getItem('omnipoll_theme');
    if (!savedTheme) {
      savedTheme = 'light';
      localStorage.setItem('omnipoll_theme', 'light');
    }
    applyTheme(savedTheme);
  };

  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    const html = document.documentElement;
    const body = document.body;
    const btn = document.getElementById('btn-toggle-theme');

    if (isDark) {
      html.classList.add('dark');
      body.classList.remove('light-theme');
      if (btn) {
        btn.innerHTML = `
          <span class="material-symbols-outlined text-primary-fixed-dim text-base">dark_mode</span>
          <span class="hidden sm:inline font-semibold">Modo Noche</span>
          <span class="h-2 w-2 rounded-full bg-primary-container shadow-[0_0_8px_#00f2fe]"></span>
        `;
      }
    } else {
      html.classList.remove('dark');
      body.classList.add('light-theme');
      if (btn) {
        btn.innerHTML = `
          <span class="material-symbols-outlined text-amber-500 text-base">light_mode</span>
          <span class="hidden sm:inline font-semibold text-slate-800">Modo Día</span>
          <span class="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
        `;
      }
    }

    localStorage.setItem('omnipoll_theme', theme);
  };

  const setupThemeToggle = () => {
    const btn = document.getElementById('btn-toggle-theme');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      showToast(`Cambiado a ${newTheme === 'light' ? 'Modo Día (Alto Contraste)' : 'Modo Noche (Spatial Dark)'}`, 'info');
    });
  };

  /* ==========================================================================
     OPCIONES DE USUARIO EN CABECERA SUPERIOR DERECHA
     ========================================================================== */
  const setupUserDropdown = () => {
    const trigger = document.getElementById('btn-user-profile');
    const menu = document.getElementById('user-dropdown-menu');

    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentUser) {
        openModal('modal-login');
        return;
      }
      const notifDrawer = document.getElementById('notifications-drawer');
      if (notifDrawer) notifDrawer.classList.remove('active');
      menu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        menu.classList.remove('active');
      }
    });

    const optProfile = document.getElementById('opt-user-profile');
    if (optProfile) {
      optProfile.addEventListener('click', () => {
        menu.classList.remove('active');
        openModal('modal-user-profile');
      });
    }

    const optSwitchRole = document.getElementById('opt-switch-role');
    if (optSwitchRole) {
      optSwitchRole.addEventListener('click', () => {
        menu.classList.remove('active');
        openModal('modal-login');
      });
    }

    const optManageUsers = document.getElementById('opt-manage-users');
    if (optManageUsers) {
      optManageUsers.addEventListener('click', () => {
        menu.classList.remove('active');
        navigateTo('gestion-usuarios');
      });
    }

    const optRolesMatrix = document.getElementById('opt-roles-matrix');
    if (optRolesMatrix) {
      optRolesMatrix.addEventListener('click', () => {
        menu.classList.remove('active');
        openModal('modal-roles-matrix');
      });
    }

    const optDbStatus = document.getElementById('opt-db-status');
    if (optDbStatus) {
      optDbStatus.addEventListener('click', () => {
        menu.classList.remove('active');
        openModal('modal-db-status');
      });
    }

    const performLogout = async () => {
      if (menu) menu.classList.remove('active');
      await API.logout();
      currentUser = null;
      localStorage.removeItem('omnipoll_token');
      localStorage.removeItem('omnipoll_user');
      applyUserToUI();
      showToast('Sesión finalizada. Ingrese con usuario y contraseña.', 'info');
      openModal('modal-login');
    };

    const optLogout = document.getElementById('opt-user-logout');
    if (optLogout) {
      optLogout.addEventListener('click', performLogout);
    }

    const quickLogout = document.getElementById('btn-quick-logout');
    if (quickLogout) {
      quickLogout.addEventListener('click', performLogout);
    }
  };

  /* ==========================================================================
     DRAWER DE NOTIFICACIONES EN TIEMPO REAL
     ========================================================================== */
  const setupNotifications = () => {
    const trigger = document.getElementById('btn-notifications');
    const drawer = document.getElementById('notifications-drawer');
    const badge = document.getElementById('notifications-badge-dot');

    if (!trigger || !drawer) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const userMenu = document.getElementById('user-dropdown-menu');
      if (userMenu) userMenu.classList.remove('active');
      drawer.classList.toggle('active');
      if (badge) badge.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      if (!drawer.contains(e.target) && !trigger.contains(e.target)) {
        drawer.classList.remove('active');
      }
    });

    const btnClear = document.getElementById('btn-clear-notifications');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        const list = document.getElementById('notifications-list');
        if (list) {
          list.innerHTML = `
            <div class="p-6 text-center text-xs text-on-surface-variant">
              <span class="material-symbols-outlined text-3xl mb-1 text-outline">done_all</span>
              <p>No tienes notificaciones pendientes.</p>
            </div>
          `;
        }
        showToast('Todas las notificaciones marcadas como leídas');
      });
    }
  };

  /* ==========================================================================
     NAVEGACIÓN DE LA SPA
     ========================================================================== */
  const setupNavigation = () => {
    document.querySelectorAll('.sidebar-nav a[data-path], .nav-link[data-path]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = e.currentTarget.dataset.path;
        if (path) navigateTo(path);
      });
    });
  };

  const navigateTo = (path) => {
    if (!currentUser) {
      openModal('modal-login');
      return;
    }
    currentRoute = path;

    // Actualizar sidebar links
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
      if (a.dataset.path === path) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });

    // Ocultar todas las secciones de vista
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
      view.classList.remove('animate-fade-in');
    });

    // Mostrar vista objetivo
    const targetView = document.getElementById(`view-${path}`);
    if (targetView) {
      targetView.classList.remove('hidden');
      targetView.classList.add('animate-fade-in');
    }

    // Si navegamos a gestión de usuarios, refrescar tabla
    if (path === 'gestion-usuarios') {
      loadUsersTable();
    }
    if (path === 'bento-analytics' && typeof BentoAnalytics !== 'undefined') {
      BentoAnalytics.init();
    }
    if (path === 'constructor-excel' && typeof SurveyBuilder !== 'undefined') {
      SurveyBuilder.refreshSurveySelector();
    }

    // Cerrar sidebar móvil si está abierto
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Scroll arriba suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setupMobileSidebar = () => {
    const btnToggle = document.getElementById('btn-toggle-mobile-menu');
    const sidebar = document.querySelector('.app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (btnToggle && sidebar) {
      btnToggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('hidden', !isOpen);
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', closeMobileSidebar);
    }
  };

  const closeMobileSidebar = () => {
    const sidebar = document.querySelector('.app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.add('hidden');
  };

  /* ==========================================================================
     VISTA DE GESTIÓN DE USUARIOS
     ========================================================================== */
  const setupUserManagement = () => {
    const btnToggleNew = document.getElementById('btn-toggle-new-user');
    const panelNew = document.getElementById('panel-new-user');
    const btnCancel = document.getElementById('btn-cancel-new-user');
    const btnRefresh = document.getElementById('btn-refresh-users');
    const btnOpenMatrix = document.getElementById('btn-open-matrix');
    const formCreate = document.getElementById('form-create-user');

    if (btnToggleNew && panelNew) {
      btnToggleNew.addEventListener('click', () => {
        panelNew.classList.toggle('hidden');
      });
    }

    if (btnCancel && panelNew) {
      btnCancel.addEventListener('click', () => {
        panelNew.classList.add('hidden');
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        loadUsersTable();
        showToast('Lista de usuarios actualizada desde MySQL', 'info');
      });
    }

    if (btnOpenMatrix) {
      btnOpenMatrix.addEventListener('click', () => {
        openModal('modal-roles-matrix');
      });
    }

    if (formCreate) {
      formCreate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('new-user-nombre').value.trim();
        const email = document.getElementById('new-user-email').value.trim();
        const password = document.getElementById('new-user-password').value;
        const cargo = document.getElementById('new-user-cargo').value.trim();
        const rol = document.getElementById('new-user-rol').value;

        if (!nombre || !email || !password) return;

        // Encuestas asignadas marcadas en el formulario
        const checkedBoxes = Array.from(document.querySelectorAll('input[name="new_user_surveys"]:checked'));
        const encuestas_asignadas = checkedBoxes.map(cb => parseInt(cb.value));

        const res = await API.createUsuario({ nombre, email, password, cargo, rol, encuestas_asignadas });
        if (res && res.success) {
          showToast(`Usuario ${nombre} creado exitosamente con rol ${rol.toUpperCase()}`, 'success');
          formCreate.reset();
          if (panelNew) panelNew.classList.add('hidden');
          await loadUsersTable();
        } else {
          showToast(res.error || 'Error al crear el usuario', 'error');
        }
      });
    }

    setupAssignSurveysSubmit();
  };

  let cachedUsers = [];
  let cachedAvailableSurveys = [];
  let currentAssignUserId = null;

  const loadUsersTable = async () => {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-on-surface-variant font-mono text-xs">
          <span class="material-symbols-outlined text-2xl animate-spin mb-1 text-primary">sync</span>
          <p>Consultando directorio de identidades en MySQL...</p>
        </td>
      </tr>
    `;

    const res = await API.getUsuarios();
    const users = (res && res.usuarios) ? res.usuarios : [];
    cachedUsers = users;
    cachedAvailableSurveys = (res && res.encuestas_disponibles) ? res.encuestas_disponibles : [];

    // Poblar selector de encuestas en el formulario de creación si está disponible
    const surveysCheckboxContainer = document.getElementById('new-user-surveys-list');
    if (surveysCheckboxContainer && cachedAvailableSurveys.length > 0) {
      surveysCheckboxContainer.innerHTML = cachedAvailableSurveys.map(e => `
        <label class="flex items-center gap-2 p-2 rounded-lg bg-surface-container/60 hover:bg-surface-container cursor-pointer border border-outline-variant/30 text-xs">
          <input type="checkbox" name="new_user_surveys" value="${e.id}" class="accent-primary rounded h-3.5 w-3.5" />
          <div class="flex flex-col min-w-0">
            <span class="font-bold text-on-surface truncate text-[11px]">${e.codigo ? `[${e.codigo}] ` : ''}${e.titulo}</span>
            <span class="text-[9px] text-outline font-mono">${e.total_respuestas || 0} respuestas</span>
          </div>
        </label>
      `).join('');
    }

    // Actualizar métricas
    const statTotal = document.getElementById('stat-total-users');
    const statSuper = document.getElementById('stat-superadmin-users');
    const statAudit = document.getElementById('stat-audit-users');

    if (statTotal) statTotal.textContent = users.length;
    if (statSuper) statSuper.textContent = users.filter(u => u.rol === 'superadmin').length;
    if (statAudit) statAudit.textContent = users.filter(u => u.rol === 'auditor' || u.rol === 'encuestador' || u.rol === 'cliente').length;

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-on-surface-variant text-xs">
            No se encontraron usuarios registrados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => {
      let roleBadgeClass = 'badge-pending';
      if (user.rol === 'superadmin') roleBadgeClass = 'badge-approved';
      if (user.rol === 'admin') roleBadgeClass = 'badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/40';
      if (user.rol === 'auditor') roleBadgeClass = 'badge bg-secondary/20 text-secondary border border-secondary/40';
      if (user.rol === 'encuestador') roleBadgeClass = 'badge bg-amber-500/20 text-amber-400 border border-amber-500/40';
      if (user.rol === 'cliente') roleBadgeClass = 'badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';

      const isActive = parseInt(user.activo) === 1;
      const statusBadge = isActive
        ? `<span class="badge text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">ACTIVO</span>`
        : `<span class="badge text-[10px] bg-red-500/15 text-red-400 border border-red-500/30">INACTIVO</span>`;

      const avatarSrc = user.avatar_url || '../diseno/assets/modern_high_tech_professional_avatar_portrait_of_a.png';
      const assignedCount = (user.encuestas_asignadas && user.encuestas_asignadas.length) || 0;

      return `
        <tr class="hover:bg-surface-container/40 transition-colors">
          <td class="py-3 px-3">
            <div class="flex items-center gap-2.5">
              <img src="${avatarSrc}" alt="Avatar" class="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/50" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'" />
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-on-surface truncate text-xs">${user.nombre}</span>
                <span class="text-[11px] text-on-surface-variant font-mono truncate">${user.email}</span>
              </div>
            </div>
          </td>
          <td class="py-3 px-3">
            <span class="text-on-surface font-medium block">${user.cargo || 'Funcionario'}</span>
            <span class="text-[10px] text-outline font-mono">ID #${user.id}</span>
          </td>
          <td class="py-3 px-3">
            <select class="input-glass text-xs py-1 px-2 font-mono bg-surface-container rounded-lg border border-outline-variant/40" onchange="App.handleRoleChange(${user.id}, this.value)">
              <option value="superadmin" ${user.rol === 'superadmin' ? 'selected' : ''}>SuperAdmin Root</option>
              <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>Administrador</option>
              <option value="auditor" ${user.rol === 'auditor' ? 'selected' : ''}>Auditor INEI</option>
              <option value="encuestador" ${user.rol === 'encuestador' ? 'selected' : ''}>Encuestador</option>
              <option value="cliente" ${user.rol === 'cliente' ? 'selected' : ''}>Cliente (Reportes)</option>
            </select>
          </td>
          <td class="py-3 px-3">
            <div class="flex flex-col gap-1 items-start">
              <span class="badge bg-surface-container font-mono text-[10px]">${user.total_permisos || 0}/18 Permisos</span>
              ${(user.rol === 'cliente' || assignedCount > 0) ? `
                <button type="button" class="badge bg-primary/20 text-primary border border-primary/30 text-[9px] hover:bg-primary/30 flex items-center gap-1 cursor-pointer transition-colors" onclick="App.openAssignSurveysModal(${user.id})" title="Gestionar encuestas asignadas">
                  <span class="material-symbols-outlined text-[11px]">assignment_turned_in</span>
                  <span>${assignedCount} Asignada${assignedCount !== 1 ? 's' : ''}</span>
                </button>
              ` : `
                <button type="button" class="badge bg-surface-container text-outline text-[9px] hover:text-on-surface flex items-center gap-1 cursor-pointer transition-colors" onclick="App.openAssignSurveysModal(${user.id})" title="Asignar encuestas específicas">
                  <span class="material-symbols-outlined text-[11px]">add</span>
                  <span>Asignar</span>
                </button>
              `}
            </div>
          </td>
          <td class="py-3 px-3">
            ${statusBadge}
          </td>
          <td class="py-3 px-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button class="btn btn-secondary text-xs py-1 px-2" onclick="App.openAssignSurveysModal(${user.id})" title="Asignar encuestas de reporte">
                <span class="material-symbols-outlined text-sm">assignment</span>
              </button>
              <button class="btn btn-secondary text-xs py-1 px-2.5" onclick="App.handleToggleStatus(${user.id}, ${isActive ? 0 : 1})">
                <span class="material-symbols-outlined text-sm">${isActive ? 'block' : 'check'}</span>
                <span>${isActive ? 'Desactivar' : 'Reactivar'}</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const openAssignSurveysModal = (userId) => {
    const user = cachedUsers.find(u => parseInt(u.id) === parseInt(userId));
    if (!user) return;

    currentAssignUserId = userId;
    const nameEl = document.getElementById('assign-survey-username');
    if (nameEl) {
      nameEl.textContent = `Usuario: ${user.nombre} (${user.email}) • Rol: ${user.rol.toUpperCase()}`;
    }

    const checklistContainer = document.getElementById('assign-surveys-checklist');
    if (!checklistContainer) return;

    const assignedIds = (user.encuestas_asignadas || []).map(id => parseInt(id));

    if (cachedAvailableSurveys.length === 0) {
      checklistContainer.innerHTML = '<div class="text-xs text-outline py-2 text-center">No hay encuestas registradas en la base de datos.</div>';
    } else {
      checklistContainer.innerHTML = cachedAvailableSurveys.map(e => {
        const isChecked = assignedIds.includes(parseInt(e.id));
        return `
          <label class="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/60 hover:bg-surface-container cursor-pointer border border-outline-variant/30 text-xs transition-colors">
            <div class="flex items-center gap-2.5">
              <input type="checkbox" name="assign_survey_cb" value="${e.id}" class="accent-primary rounded h-4 w-4" ${isChecked ? 'checked' : ''} />
              <div>
                <span class="font-bold text-on-surface">${e.codigo ? `[${e.codigo}] ` : ''}${e.titulo}</span>
                <div class="text-[10px] text-on-surface-variant font-mono">${e.categoria || 'General'} • Estado: ${e.estado || 'activa'}</div>
              </div>
            </div>
            <span class="badge text-[10px] bg-primary/10 text-primary border border-primary/20 font-mono">
              ${e.total_respuestas || 0} respuestas
            </span>
          </label>
        `;
      }).join('');
    }

    openModal('modal-assign-surveys');
  };

  const setupAssignSurveysSubmit = () => {
    const btnSave = document.getElementById('btn-save-assigned-surveys');
    if (!btnSave || btnSave.dataset.bound) return;
    btnSave.dataset.bound = 'true';

    btnSave.addEventListener('click', async () => {
      if (!currentAssignUserId) return;
      const checkedInputs = Array.from(document.querySelectorAll('input[name="assign_survey_cb"]:checked'));
      const selectedIds = checkedInputs.map(cb => parseInt(cb.value));

      btnSave.disabled = true;
      btnSave.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span><span>Guardando...</span>`;

      const res = await API.updateUsuario({
        id: currentAssignUserId,
        encuestas_asignadas: selectedIds
      });

      btnSave.disabled = false;
      btnSave.innerHTML = `<span class="material-symbols-outlined text-base">save</span><span>Guardar Asignaciones</span>`;

      if (res && res.success) {
        showToast('Asignación de encuestas actualizada exitosamente', 'success');
        closeModal('modal-assign-surveys');
        await loadUsersTable();

        // Si el usuario editado es el activo actualmente, refrescar BentoAnalytics
        if (currentUser && parseInt(currentUser.id) === parseInt(currentAssignUserId)) {
          currentUser.encuestas_asignadas = selectedIds;
          if (typeof BentoAnalytics !== 'undefined') {
            await BentoAnalytics.init();
          }
        }
      } else {
        showToast(res?.error || 'Error al guardar asignación de encuestas', 'error');
      }
    });
  };

  const handleRoleChange = async (userId, newRole) => {
    const res = await API.updateUsuario({ id: userId, rol: newRole });
    if (res && res.success) {
      showToast(`Rol actualizado a ${newRole.toUpperCase()} para el usuario #${userId}`, 'success');
      // Si el usuario modificado es el actual, refrescar sesión
      if (currentUser && currentUser.id === userId) {
        await checkAuthSession();
      }
      await loadUsersTable();
    } else {
      showToast(res.error || 'Error al actualizar rol', 'error');
    }
  };

  const handleToggleStatus = async (userId, newStatus) => {
    const res = await API.updateUsuario({ id: userId, activo: newStatus });
    if (res && res.success) {
      showToast(`Estado del usuario actualizado (${newStatus ? 'Activo' : 'Inactivo'})`, 'info');
      await loadUsersTable();
    } else {
      showToast(res.error || 'Error al cambiar estado', 'error');
    }
  };

  /* ==========================================================================
     MATRIZ DE ROLES & PERMISOS GRANULARES (18)
     ========================================================================== */
  const loadRolesAndMatrix = async () => {
    const res = await API.getRoles();
    if (res && res.success) {
      systemRoles = res.roles || [];
      rolesMatrix = res.matriz_permisos || {};
      renderRolesMatrixTable();
    }
  };

  const setupRolesMatrixModal = () => {
    renderRolesMatrixTable();
  };

  const renderRolesMatrixTable = () => {
    const tbody = document.getElementById('matrix-tbody');
    if (!tbody) return;

    const modulosList = [
      {
        modulo: 'Encuestas Activas (UBIGEO)',
        permisos: [
          { clave: 'encuestas.ver', desc: 'Consultar catálogo de encuestas activas y filtrado UBIGEO' },
          { clave: 'encuestas.responder', desc: 'Llenar y remitir formularios de campo georreferenciados' },
          { clave: 'encuestas.crear', desc: 'Registrar nuevos instrumentos en la plataforma' },
          { clave: 'encuestas.editar', desc: 'Modificar configuración o metadatos de encuesta' },
          { clave: 'encuestas.eliminar', desc: 'Dar de baja o archivar encuestas existentes' }
        ]
      },
      {
        modulo: 'Constructor & Importador Excel',
        permisos: [
          { clave: 'constructor.ver', desc: 'Acceder a la interfaz de construcción de encuestas' },
          { clave: 'constructor.crear', desc: 'Diseñar y añadir preguntas interactivas dinámicas' },
          { clave: 'constructor.editar', desc: 'Reordenar o modificar lógica condicional' },
          { clave: 'constructor.importar_excel', desc: 'Procesar masivamente hojas .XLSX / .CSV con SheetJS' }
        ]
      },
      {
        modulo: 'Aprobación SuperAdmin (Auditoría)',
        permisos: [
          { clave: 'aprobaciones.ver', desc: 'Visualizar cola de instrumentos pendientes de firma' },
          { clave: 'aprobaciones.aprobar', desc: 'Aprobar técnicamente y emitir resolución legal' },
          { clave: 'aprobaciones.rechazar', desc: 'Rechazar instrumento con pliego de observaciones' },
          { clave: 'aprobaciones.firmar', desc: 'Firmar digitalmente con sello criptográfico SHA-256' }
        ]
      },
      {
        modulo: 'Bento Analytics (Geointeligencia)',
        permisos: [
          { clave: 'analitica.ver', desc: 'Ver tableros analíticos, KPIs y series temporales' },
          { clave: 'analitica.exportar', desc: 'Exportar microdatos consolidados a Excel/PDF' },
          { clave: 'analitica.filtrar_ubigeo', desc: 'Segmentar reportes por Región, Provincia y Distrito' }
        ]
      },
      {
        modulo: 'Gestión de Usuarios & Seguridad RBAC',
        permisos: [
          { clave: 'usuarios.ver', desc: 'Ver directorio de usuarios del sistema' },
          { clave: 'usuarios.gestionar', desc: 'Crear, editar roles y desactivar identidades' },
          { clave: 'roles.ver', desc: 'Inspeccionar matriz de permisos y políticas de acceso' }
        ]
      }
    ];

    tbody.innerHTML = modulosList.map(mod => {
      const rows = mod.permisos.map((p, idx) => {
        const superCheck = `<span class="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>`;
        
        // Admin
        const adminAllowed = !['usuarios.gestionar', 'aprobaciones.firmar'].includes(p.clave);
        const adminCheck = adminAllowed
          ? `<span class="material-symbols-outlined text-cyan-400 text-sm">check_circle</span>`
          : `<span class="material-symbols-outlined text-outline text-sm">remove</span>`;

        // Auditor
        const auditorAllowed = ['encuestas.ver', 'constructor.ver', 'aprobaciones.ver', 'aprobaciones.aprobar', 'aprobaciones.rechazar', 'aprobaciones.firmar', 'analitica.ver', 'analitica.filtrar_ubigeo'].includes(p.clave);
        const auditorCheck = auditorAllowed
          ? `<span class="material-symbols-outlined text-secondary text-sm">check_circle</span>`
          : `<span class="material-symbols-outlined text-outline text-sm">remove</span>`;

        // Encuestador
        const encuestadorAllowed = ['encuestas.ver', 'encuestas.responder', 'analitica.ver', 'analitica.filtrar_ubigeo'].includes(p.clave);
        const encuestadorCheck = encuestadorAllowed
          ? `<span class="material-symbols-outlined text-amber-400 text-sm">check_circle</span>`
          : `<span class="material-symbols-outlined text-outline text-sm">remove</span>`;

        return `
          <tr class="hover:bg-surface-container/30 transition-colors">
            ${idx === 0 ? `<td rowspan="${mod.permisos.length}" class="py-2.5 px-3 font-bold text-primary align-top border-r border-outline-variant/30 text-xs">${mod.modulo}</td>` : ''}
            <td class="py-2 px-3 text-on-surface font-mono font-semibold">${p.clave}</td>
            <td class="py-2 px-3 text-on-surface-variant font-sans text-xs">${p.desc}</td>
            <td class="py-2 px-3 text-center">${superCheck}</td>
            <td class="py-2 px-3 text-center">${adminCheck}</td>
            <td class="py-2 px-3 text-center">${auditorCheck}</td>
            <td class="py-2 px-3 text-center">${encuestadorCheck}</td>
          </tr>
        `;
      }).join('');

      return rows;
    }).join('');
  };

  /* ==========================================================================
     UTILITARIOS UI: MODALES Y NOTIFICACIONES TOAST
     ========================================================================== */
  const openModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  };

  const closeModal = (id) => {
    if (id === 'modal-login' && !currentUser) {
      showToast('Debe ingresar con usuario y contraseña para acceder al sistema.', 'error');
      return;
    }
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  };

  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
      <span class="material-symbols-outlined text-primary-container text-lg">${icon}</span>
      <span class="text-sm font-medium">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  return {
    init,
    navigateTo,
    showToast,
    openModal,
    closeModal,
    closeMobileSidebar,
    hasPermission,
    handleRoleChange,
    handleToggleStatus,
    openAssignSurveysModal,
    loadUsersTable,
    getCurrentUser: () => currentUser
  };
})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', App.init);
