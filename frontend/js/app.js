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
  let systemModulos = [];
  let systemPermisos = [];
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
      if (currentUser && currentUser.rol === 'cliente') {
        navigateTo('bento-analytics');
      } else if (currentUser && currentUser.rol === 'constructor') {
        navigateTo('constructor-excel');
      } else {
        navigateTo(currentRoute);
      }
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
    const screenLogin = document.getElementById('screen-login');
    const appContainer = document.getElementById('app-container');
    const quickLogoutBtn = document.getElementById('btn-quick-logout');
    const cancelLoginBtn = document.getElementById('btn-cancel-screen-login');

    if (!currentUser) {
      if (screenLogin) screenLogin.classList.remove('hidden');
      if (appContainer) appContainer.classList.add('hidden');
      if (cancelLoginBtn) cancelLoginBtn.classList.add('hidden');
      if (quickLogoutBtn) quickLogoutBtn.classList.add('hidden');

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

    if (screenLogin) screenLogin.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    if (quickLogoutBtn) quickLogoutBtn.classList.remove('hidden');
    if (cancelLoginBtn) cancelLoginBtn.classList.add('hidden');

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
        showToast(`Bienvenido al Núcleo, ${currentUser.nombre} (${currentUser.rol_nombre || currentUser.rol})`, 'success');

        // Inicializar módulos de la aplicación si no se habían inicializado
        await SurveyRunner.init();
        SurveyBuilder.init();
        await AdminApproval.init();
        await BentoAnalytics.init();
        await loadRolesAndMatrix();

        if (currentUser.rol === 'cliente') {
          navigateTo('bento-analytics');
        } else if (currentUser.rol === 'constructor') {
          navigateTo('constructor-excel');
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
        applyUserToUI();
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
        const screenLogin = document.getElementById('screen-login');
        const appContainer = document.getElementById('app-container');
        const cancelBtn = document.getElementById('btn-cancel-screen-login');
        if (screenLogin) screenLogin.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
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
      applyUserToUI();
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

    // Si navegamos a gestión de usuarios, refrescar tabla y roles
    if (path === 'gestion-usuarios') {
      loadUsersTable();
      loadRolesAndMatrix();
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
     VISTA DE GESTIÓN DE USUARIOS & ROLES RBAC
     ========================================================================== */
  const setupUserManagement = () => {
    // Pestañas Sub-Navegación
    const subtabUsers = document.getElementById('subtab-btn-users');
    const subtabRoles = document.getElementById('subtab-btn-roles');
    const subviewUsers = document.getElementById('subview-users');
    const subviewRoles = document.getElementById('subview-roles');

    if (subtabUsers && subtabRoles && subviewUsers && subviewRoles) {
      subtabUsers.addEventListener('click', () => {
        subtabUsers.className = 'btn text-xs py-2 px-4 flex items-center gap-2 border-b-2 font-bold transition-all rounded-t-xl bg-primary/10 border-primary text-primary';
        subtabRoles.className = 'btn text-xs py-2 px-4 flex items-center gap-2 border-b-2 border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 font-bold transition-all rounded-t-xl';
        subviewUsers.classList.remove('hidden');
        subviewRoles.classList.add('hidden');
      });

      subtabRoles.addEventListener('click', () => {
        subtabRoles.className = 'btn text-xs py-2 px-4 flex items-center gap-2 border-b-2 font-bold transition-all rounded-t-xl bg-primary/10 border-primary text-primary';
        subtabUsers.className = 'btn text-xs py-2 px-4 flex items-center gap-2 border-b-2 border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 font-bold transition-all rounded-t-xl';
        subviewRoles.classList.remove('hidden');
        subviewUsers.classList.add('hidden');
        renderRolesList();
      });
    }

    // Toggle panel nuevo usuario
    const btnToggleNewUser = document.getElementById('btn-toggle-new-user');
    const panelNewUser = document.getElementById('panel-new-user');
    const btnCancelNewUser = document.getElementById('btn-cancel-new-user');
    const btnRefreshUsers = document.getElementById('btn-refresh-users');
    const btnOpenMatrix = document.getElementById('btn-open-matrix');
    const formCreateUser = document.getElementById('form-create-user');

    if (btnToggleNewUser && panelNewUser) {
      btnToggleNewUser.addEventListener('click', () => {
        if (subviewUsers && subviewUsers.classList.contains('hidden') && subtabUsers) {
          subtabUsers.click();
        }
        panelNewUser.classList.toggle('hidden');
      });
    }

    if (btnCancelNewUser && panelNewUser) {
      btnCancelNewUser.addEventListener('click', () => {
        panelNewUser.classList.add('hidden');
      });
    }

    if (btnRefreshUsers) {
      btnRefreshUsers.addEventListener('click', async () => {
        await loadUsersTable();
        showToast('Directorio de usuarios sincronizado con MySQL', 'info');
      });
    }

    if (btnOpenMatrix) {
      btnOpenMatrix.addEventListener('click', () => {
        openModal('modal-roles-matrix');
      });
    }

    // Toggle panel nuevo rol
    const btnToggleNewRole = document.getElementById('btn-toggle-new-role');
    const panelNewRole = document.getElementById('panel-new-role');
    const btnCancelNewRole = document.getElementById('btn-cancel-new-role');
    const btnCancelNewRole2 = document.getElementById('btn-cancel-new-role-2');
    const btnRefreshRoles = document.getElementById('btn-refresh-roles');
    const formCreateRole = document.getElementById('form-create-role');

    if (btnToggleNewRole && panelNewRole) {
      btnToggleNewRole.addEventListener('click', () => {
        if (subviewRoles && subviewRoles.classList.contains('hidden') && subtabRoles) {
          subtabRoles.click();
        }
        panelNewRole.classList.toggle('hidden');
        renderNewRolePermissionsMatrix();
      });
    }

    const closeNewRolePanel = () => {
      if (panelNewRole) panelNewRole.classList.add('hidden');
    };
    if (btnCancelNewRole) btnCancelNewRole.addEventListener('click', closeNewRolePanel);
    if (btnCancelNewRole2) btnCancelNewRole2.addEventListener('click', closeNewRolePanel);

    if (btnRefreshRoles) {
      btnRefreshRoles.addEventListener('click', async () => {
        await loadRolesAndMatrix();
        showToast('Catálogo de roles y permisos actualizado', 'info');
      });
    }

    // Botones de selección masiva en panel de nuevo rol
    const btnSelectAllRolePerms = document.getElementById('btn-select-all-role-perms');
    const btnClearAllRolePerms = document.getElementById('btn-clear-all-role-perms');

    if (btnSelectAllRolePerms) {
      btnSelectAllRolePerms.addEventListener('click', () => {
        document.querySelectorAll('input[name="new_role_perms"]').forEach(cb => cb.checked = true);
      });
    }
    if (btnClearAllRolePerms) {
      btnClearAllRolePerms.addEventListener('click', () => {
        document.querySelectorAll('input[name="new_role_perms"]').forEach(cb => cb.checked = false);
      });
    }

    // Botones de selección masiva en modal de edición de permisos
    const btnEditRoleSelectAll = document.getElementById('btn-edit-role-select-all');
    const btnEditRoleClearAll = document.getElementById('btn-edit-role-clear-all');

    if (btnEditRoleSelectAll) {
      btnEditRoleSelectAll.addEventListener('click', () => {
        document.querySelectorAll('input[name="edit_role_perms"]').forEach(cb => cb.checked = true);
      });
    }
    if (btnEditRoleClearAll) {
      btnEditRoleClearAll.addEventListener('click', () => {
        document.querySelectorAll('input[name="edit_role_perms"]').forEach(cb => cb.checked = false);
      });
    }

    // Submit: Crear Usuario
    if (formCreateUser) {
      formCreateUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('new-user-nombre').value.trim();
        const email = document.getElementById('new-user-email').value.trim();
        const password = document.getElementById('new-user-password').value;
        const cargo = document.getElementById('new-user-cargo').value.trim();
        const rol = document.getElementById('new-user-rol').value;

        if (!nombre || !email || !password) return;

        const checkedBoxes = Array.from(document.querySelectorAll('input[name="new_user_surveys"]:checked'));
        const encuestas_asignadas = checkedBoxes.map(cb => parseInt(cb.value));

        const res = await API.createUsuario({ nombre, email, password, cargo, rol, encuestas_asignadas });
        if (res && res.success) {
          showToast(`Usuario ${nombre} creado con rol ${rol.toUpperCase()}`, 'success');
          formCreateUser.reset();
          if (panelNewUser) panelNewUser.classList.add('hidden');
          await loadUsersTable();
          await loadRolesAndMatrix();
        } else {
          showToast(res?.error || 'Error al crear el usuario', 'error');
        }
      });
    }

    // Submit: Crear Rol
    if (formCreateRole) {
      formCreateRole.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('new-role-nombre').value.trim();
        const codigo = document.getElementById('new-role-codigo').value.trim();
        const badge_color = document.getElementById('new-role-color').value;
        const descripcion = document.getElementById('new-role-descripcion').value.trim();

        if (!nombre || !codigo) {
          showToast('Nombre y código del rol son obligatorios', 'error');
          return;
        }

        const checkedBoxes = Array.from(document.querySelectorAll('input[name="new_role_perms"]:checked'));
        const permisos = checkedBoxes.map(cb => parseInt(cb.value));

        const res = await API.createRol({
          nombre,
          codigo,
          badge_color,
          descripcion,
          permisos
        });

        if (res && res.success) {
          showToast(`Rol "${nombre}" (${codigo}) creado exitosamente con ${permisos.length} permisos`, 'success');
          formCreateRole.reset();
          closeNewRolePanel();
          await loadRolesAndMatrix();
          await loadUsersTable();
        } else {
          showToast(res?.error || 'Error al crear el rol', 'error');
        }
      });
    }

    // Submit: Editar Permisos de Rol
    const formEditRole = document.getElementById('form-edit-role-permissions');
    if (formEditRole) {
      formEditRole.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-role-id').value);
        const nombre = document.getElementById('edit-role-nombre').value.trim();
        const badge_color = document.getElementById('edit-role-color').value;
        const descripcion = document.getElementById('edit-role-descripcion').value.trim();

        if (!id || !nombre) return;

        const checkedBoxes = Array.from(document.querySelectorAll('input[name="edit_role_perms"]:checked'));
        const permisos = checkedBoxes.map(cb => parseInt(cb.value));

        const res = await API.updateRol({
          id,
          nombre,
          badge_color,
          descripcion,
          permisos
        });

        if (res && res.success) {
          showToast(`Rol "${nombre}" y sus permisos actualizados exitosamente`, 'success');
          closeModal('modal-edit-role-permissions');
          await loadRolesAndMatrix();
          await loadUsersTable();

          // Si el usuario actual tiene este rol, refrescar sesión
          if (currentUser && currentUser.rol === systemRoles.find(r => r.id === id)?.codigo) {
            await checkAuthSession();
          }
        } else {
          showToast(res?.error || 'Error al actualizar el rol', 'error');
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

    // Actualizar métricas de usuarios
    const statTotal = document.getElementById('stat-total-users');
    const statSuper = document.getElementById('stat-superadmin-users');
    const statBuilder = document.getElementById('stat-builder-users');
    const subtabBadgeUsers = document.getElementById('subtab-badge-users');

    if (statTotal) statTotal.textContent = users.length;
    if (statSuper) statSuper.textContent = users.filter(u => u.rol === 'superadmin').length;
    if (statBuilder) statBuilder.textContent = users.filter(u => u.rol === 'constructor' || u.rol === 'encuestador').length;
    if (subtabBadgeUsers) subtabBadgeUsers.textContent = users.length;

    // Actualizar combo de roles en creación
    populateRoleDropdowns();

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
      else if (user.rol === 'constructor') roleBadgeClass = 'badge bg-amber-500/20 text-amber-400 border border-amber-500/40';
      else if (user.rol === 'admin') roleBadgeClass = 'badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/40';
      else if (user.rol === 'auditor') roleBadgeClass = 'badge bg-secondary/20 text-secondary border border-secondary/40';
      else if (user.rol === 'encuestador') roleBadgeClass = 'badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      else if (user.rol === 'cliente') roleBadgeClass = 'badge bg-blue-500/20 text-blue-400 border border-blue-500/40';

      const isActive = parseInt(user.activo) === 1;
      const statusBadge = isActive
        ? `<span class="badge text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">ACTIVO</span>`
        : `<span class="badge text-[10px] bg-red-500/15 text-red-400 border border-red-500/30">INACTIVO</span>`;

      const avatarSrc = user.avatar_url || 'diseno/assets/modern_high_tech_professional_avatar_portrait_of_a.png';
      const assignedCount = (user.encuestas_asignadas && user.encuestas_asignadas.length) || 0;

      // Opciones dinámicas para el selector de rol
      const roleOptions = systemRoles.length > 0
        ? systemRoles.map(r => `<option value="${r.codigo}" ${user.rol === r.codigo ? 'selected' : ''}>${r.nombre}</option>`).join('')
        : `
          <option value="superadmin" ${user.rol === 'superadmin' ? 'selected' : ''}>SuperAdmin Root</option>
          <option value="constructor" ${user.rol === 'constructor' ? 'selected' : ''}>Constructor</option>
          <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>Administrador</option>
          <option value="auditor" ${user.rol === 'auditor' ? 'selected' : ''}>Auditor INEI</option>
          <option value="encuestador" ${user.rol === 'encuestador' ? 'selected' : ''}>Encuestador</option>
          <option value="cliente" ${user.rol === 'cliente' ? 'selected' : ''}>Cliente</option>
        `;

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
              ${roleOptions}
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

  const populateRoleDropdowns = () => {
    const newUserRolSelect = document.getElementById('new-user-rol');
    if (newUserRolSelect && systemRoles.length > 0) {
      const currentVal = newUserRolSelect.value;
      newUserRolSelect.innerHTML = systemRoles.map(r => `
        <option value="${r.codigo}" ${r.codigo === currentVal ? 'selected' : (r.codigo === 'constructor' && !currentVal ? 'selected' : '')}>
          ${r.nombre} (${r.descripcion ? r.descripcion.substring(0, 48) + '...' : r.codigo})
        </option>
      `).join('');
    }
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
      if (currentUser && currentUser.id === userId) {
        await checkAuthSession();
      }
      await loadUsersTable();
      await loadRolesAndMatrix();
    } else {
      showToast(res?.error || 'Error al actualizar rol', 'error');
    }
  };

  const handleToggleStatus = async (userId, newStatus) => {
    const res = await API.updateUsuario({ id: userId, activo: newStatus });
    if (res && res.success) {
      showToast(`Estado del usuario actualizado (${newStatus ? 'Activo' : 'Inactivo'})`, 'info');
      await loadUsersTable();
    } else {
      showToast(res?.error || 'Error al cambiar estado', 'error');
    }
  };

  /* ==========================================================================
     CATÁLOGO DE ROLES & PERMISOS DINÁMICOS
     ========================================================================== */
  const loadRolesAndMatrix = async () => {
    const res = await API.getRoles();
    if (res && res.success) {
      systemRoles = res.roles || [];
      systemModulos = res.modulos || [];
      systemPermisos = res.permisos || [];
      rolesMatrix = res.matriz_permisos || {};

      // Actualizar contadores
      const statTotalRoles = document.getElementById('stat-total-roles');
      if (statTotalRoles) statTotalRoles.textContent = systemRoles.length;
      const subtabBadgeRoles = document.getElementById('subtab-badge-roles');
      if (subtabBadgeRoles) subtabBadgeRoles.textContent = systemRoles.length;

      renderRolesList();
      renderRolesMatrixTable();
      renderNewRolePermissionsMatrix();
      populateRoleDropdowns();
    }
  };

  const setupRolesMatrixModal = () => {
    renderRolesMatrixTable();
  };

  const renderNewRolePermissionsMatrix = () => {
    const container = document.getElementById('new-role-permissions-matrix');
    if (!container || !systemModulos.length || !systemPermisos.length) return;

    container.innerHTML = systemModulos.map(mod => {
      const perms = systemPermisos.filter(p => parseInt(p.modulo_id) === parseInt(mod.id));
      return `
        <div class="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/30 space-y-2">
          <div class="flex items-center justify-between pb-1.5 border-b border-outline-variant/30">
            <span class="font-bold text-xs text-primary flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">${mod.icono || 'folder'}</span>
              <span>${mod.nombre}</span>
            </span>
            <button type="button" class="text-[10px] text-amber-500 hover:underline font-mono" onclick="App.toggleModulePerms('create', ${mod.id})">Todo</button>
          </div>
          <div class="space-y-1.5">
            ${perms.map(p => `
              <label class="flex items-start gap-2 p-1.5 rounded hover:bg-surface-container cursor-pointer text-xs">
                <input type="checkbox" name="new_role_perms" value="${p.id}" data-mod-id="${mod.id}" class="accent-amber-500 rounded mt-0.5 h-3.5 w-3.5" />
                <div class="flex flex-col min-w-0">
                  <span class="font-semibold text-on-surface text-[11px] leading-tight">${p.nombre}</span>
                  <span class="text-[9px] text-outline font-mono truncate" title="${p.descripcion}">${p.codigo}</span>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  };

  const renderRolesList = () => {
    const container = document.getElementById('container-roles-cards');
    if (!container) return;

    if (!systemRoles.length) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center text-on-surface-variant font-mono text-xs">
          No hay roles registrados en MySQL.
        </div>
      `;
      return;
    }

    container.innerHTML = systemRoles.map(role => {
      let badgeClass = 'badge-pending';
      if (role.codigo === 'superadmin') badgeClass = 'badge-approved';
      else if (role.codigo === 'constructor' || role.badge_color === 'amber') badgeClass = 'badge bg-amber-500/20 text-amber-400 border border-amber-500/40';
      else if (role.codigo === 'admin' || role.badge_color === 'secondary') badgeClass = 'badge bg-cyan-500/20 text-cyan-400 border border-cyan-500/40';
      else if (role.codigo === 'auditor' || role.badge_color === 'warning') badgeClass = 'badge bg-secondary/20 text-secondary border border-secondary/40';
      else if (role.codigo === 'encuestador' || role.badge_color === 'success' || role.badge_color === 'emerald') badgeClass = 'badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      else if (role.codigo === 'cliente') badgeClass = 'badge bg-blue-500/20 text-blue-400 border border-blue-500/40';

      const permCount = role.total_permisos || (role.permisos_ids ? role.permisos_ids.length : 0);
      const userCount = role.total_usuarios || cachedUsers.filter(u => u.rol === role.codigo).length;

      // Extraer nombres de módulos que tienen permisos activos
      const allowedModuleNames = [];
      const assignedPermCodigos = role.permisos_codigos || rolesMatrix[role.codigo] || [];
      if (role.codigo === 'superadmin') {
        systemModulos.forEach(m => allowedModuleNames.push(m.nombre));
      } else {
        systemModulos.forEach(m => {
          const modPerms = systemPermisos.filter(p => parseInt(p.modulo_id) === parseInt(m.id)).map(p => p.codigo);
          const hasAny = modPerms.some(cp => assignedPermCodigos.includes(cp));
          if (hasAny) allowedModuleNames.push(m.nombre);
        });
      }

      return `
        <div class="glass-card p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all shadow-sm">
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <span class="${badgeClass} text-xs font-bold">${role.nombre}</span>
              <span class="text-[10px] font-mono text-outline uppercase tracking-wider">#${role.codigo}</span>
            </div>
            <p class="text-xs text-on-surface-variant line-clamp-2 mb-3 min-h-[32px]">${role.descripcion || 'Sin descripción asignada.'}</p>

            <div class="flex items-center gap-4 text-xs mb-3 font-mono">
              <div class="flex items-center gap-1.5 text-on-surface">
                <span class="material-symbols-outlined text-sm text-amber-500">key</span>
                <span class="font-bold text-amber-400">${permCount}/18</span>
                <span class="text-outline text-[10px]">Permisos</span>
              </div>
              <div class="flex items-center gap-1.5 text-on-surface">
                <span class="material-symbols-outlined text-sm text-secondary">group</span>
                <span class="font-bold">${userCount}</span>
                <span class="text-outline text-[10px]">Usuarios</span>
              </div>
            </div>

            <!-- Chips de módulos autorizados -->
            <div class="flex flex-wrap gap-1">
              ${allowedModuleNames.map(mn => `
                <span class="badge text-[9px] bg-surface-container border border-outline-variant/30 text-on-surface font-sans">
                  ${mn}
                </span>
              `).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-outline-variant/30 flex items-center justify-between gap-2">
            <button type="button" class="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1" onclick="App.openModal('modal-roles-matrix')">
              <span class="material-symbols-outlined text-sm text-secondary">visibility</span>
              <span>Ver Matriz</span>
            </button>
            <button type="button" class="btn btn-primary text-[11px] py-1 px-3 flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30" onclick="App.openEditRoleModal(${role.id})">
              <span class="material-symbols-outlined text-sm">edit</span>
              <span>Editar Permisos</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  const openEditRoleModal = (roleId) => {
    const role = systemRoles.find(r => parseInt(r.id) === parseInt(roleId));
    if (!role) return;

    document.getElementById('edit-role-id').value = role.id;
    document.getElementById('edit-role-nombre').value = role.nombre;
    document.getElementById('edit-role-color').value = role.badge_color || 'amber';
    document.getElementById('edit-role-descripcion').value = role.descripcion || '';

    const titleEl = document.getElementById('edit-role-modal-title');
    const subEl = document.getElementById('edit-role-modal-subtitle');
    if (titleEl) titleEl.textContent = `Editar Permisos: ${role.nombre}`;
    if (subEl) subEl.textContent = `Código: ${role.codigo} • ${role.total_permisos || (role.permisos_ids ? role.permisos_ids.length : 0)} permisos asignados`;

    const listContainer = document.getElementById('edit-role-permissions-list');
    if (listContainer) {
      const activeIds = (role.permisos_ids || []).map(id => parseInt(id));

      listContainer.innerHTML = systemModulos.map(mod => {
        const perms = systemPermisos.filter(p => parseInt(p.modulo_id) === parseInt(mod.id));
        return `
          <div class="p-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 space-y-1.5">
            <div class="flex items-center justify-between pb-1 border-b border-outline-variant/30">
              <span class="font-bold text-[11px] text-primary flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">${mod.icono || 'folder'}</span>
                <span>${mod.nombre}</span>
              </span>
              <button type="button" class="text-[9px] text-amber-500 hover:underline font-mono" onclick="App.toggleModulePerms('edit', ${mod.id})">Todo</button>
            </div>
            <div class="space-y-1">
              ${perms.map(p => {
                const isChecked = role.codigo === 'superadmin' || activeIds.includes(parseInt(p.id));
                return `
                  <label class="flex items-start gap-1.5 p-1 rounded hover:bg-surface-container cursor-pointer text-xs">
                    <input type="checkbox" name="edit_role_perms" value="${p.id}" data-mod-id="${mod.id}" class="accent-primary rounded mt-0.5 h-3.5 w-3.5" ${isChecked ? 'checked' : ''} />
                    <div class="flex flex-col min-w-0">
                      <span class="font-medium text-on-surface text-[10px] leading-tight">${p.nombre}</span>
                      <span class="text-[8px] text-outline font-mono truncate">${p.codigo}</span>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    openModal('modal-edit-role-permissions');
  };

  const toggleModulePerms = (mode, modId) => {
    const selector = mode === 'create' ? `input[name="new_role_perms"][data-mod-id="${modId}"]` : `input[name="edit_role_perms"][data-mod-id="${modId}"]`;
    const cbs = Array.from(document.querySelectorAll(selector));
    const allChecked = cbs.every(cb => cb.checked);
    cbs.forEach(cb => cb.checked = !allChecked);
  };

  const renderRolesMatrixTable = () => {
    const theadRow = document.getElementById('matrix-thead-row');
    const tbody = document.getElementById('matrix-tbody');
    if (!tbody) return;

    // Si systemRoles está disponible, renderizar cabecera dinámica
    if (theadRow && systemRoles.length > 0) {
      theadRow.innerHTML = `
        <th class="py-2.5 px-3">Módulo Funcional</th>
        <th class="py-2.5 px-3">Código de Permiso</th>
        <th class="py-2.5 px-3">Descripción de Función</th>
        ${systemRoles.map(r => `
          <th class="py-2.5 px-3 text-center text-xs font-bold font-sans">${r.nombre}</th>
        `).join('')}
      `;
    }

    // Renderizar cuerpo agrupado por módulo
    if (systemModulos.length > 0 && systemPermisos.length > 0) {
      tbody.innerHTML = systemModulos.map(mod => {
        const perms = systemPermisos.filter(p => parseInt(p.modulo_id) === parseInt(mod.id));
        return perms.map((p, idx) => {
          const roleCols = systemRoles.map(role => {
            const isSuper = role.codigo === 'superadmin';
            const hasPerm = isSuper || (rolesMatrix[role.codigo] && rolesMatrix[role.codigo].includes(p.codigo));
            return hasPerm
              ? `<td class="py-2 px-3 text-center"><span class="material-symbols-outlined text-emerald-400 text-sm">check_circle</span></td>`
              : `<td class="py-2 px-3 text-center"><span class="material-symbols-outlined text-outline text-sm">remove</span></td>`;
          }).join('');

          return `
            <tr class="hover:bg-surface-container/30 transition-colors">
              ${idx === 0 ? `<td rowspan="${perms.length}" class="py-2.5 px-3 font-bold text-primary align-top border-r border-outline-variant/30 text-xs">${mod.nombre}</td>` : ''}
              <td class="py-2 px-3 text-on-surface font-mono font-semibold">${p.codigo}</td>
              <td class="py-2 px-3 text-on-surface-variant font-sans text-xs">${p.descripcion || p.nombre}</td>
              ${roleCols}
            </tr>
          `;
        }).join('');
      }).join('');
    }
  };

  /* ==========================================================================
     UTILITARIOS UI: MODALES Y NOTIFICACIONES TOAST
     ========================================================================== */
  const openModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  };

  const closeModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  };

  const cancelScreenLogin = () => {
    if (currentUser) {
      const screenLogin = document.getElementById('screen-login');
      const appContainer = document.getElementById('app-container');
      const cancelBtn = document.getElementById('btn-cancel-screen-login');
      if (screenLogin) screenLogin.classList.add('hidden');
      if (appContainer) appContainer.classList.remove('hidden');
      if (cancelBtn) cancelBtn.classList.add('hidden');
    }
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
    cancelScreenLogin,
    closeMobileSidebar,
    hasPermission,
    handleRoleChange,
    handleToggleStatus,
    openAssignSurveysModal,
    loadUsersTable,
    loadRolesAndMatrix,
    openEditRoleModal,
    toggleModulePerms,
    getCurrentUser: () => currentUser
  };
})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', App.init);
