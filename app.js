// Modelo de datos
let datos = {
    clientes: [],
    obras: [],
    operarios: [],
    proveedores: [],
    partesDiarios: [],
    pagosAcuenta: [], // Pagos a cuenta de obra
    pagosPB: []      // Gastos generales / Pagos PB
};

// Contadores
let contadorObras = 1;

// Variable para saber si estamos editando un parte diario
let editingParteId = null;

// Función para guardar datos en localStorage
function guardarDatos() {
    localStorage.setItem('datosGestionObras', JSON.stringify(datos));
}

// Función para cargar datos desde localStorage
function cargarDatos() {
    const datosGuardados = localStorage.getItem('datosGestionObras');
    if (datosGuardados) {
        datos = JSON.parse(datosGuardados);
        
        // Initialize new arrays if loading old data structure
        if (!datos.pagosAcuenta) datos.pagosAcuenta = [];
        if (!datos.pagosPB) datos.pagosPB = [];
        
        // Actualizar contador de obras
        if (datos.obras.length > 0) {
            // Ensure all obras have an ID for robust filtering/editing later
            datos.obras.forEach(obra => {
                if (!obra.id) obra.id = Date.now().toString() + Math.random().toString(36).substring(2, 9); // Generate a unique ID if missing
            });

            const maxNumero = Math.max(...datos.obras.map(obra => {
                const num = parseInt(obra.numero.replace('OBR-', ''));
                return isNaN(num) ? 0 : num; // Handle potential parsing issues
            }));
            contadorObras = maxNumero >= 0 ? maxNumero + 1 : 1;
        } else {
            contadorObras = 1; // Reset if no obras
        }
    }

    // Initialize liquidation status for existing parts if needed (important for migration)
    if (datos.partesDiarios) {
        datos.partesDiarios = datos.partesDiarios.map(parte => ({
            ...parte,
            liquidado: parte.liquidado === undefined ? false : parte.liquidado,
            notaLiquidacion: parte.notaLiquidacion === undefined ? '' : parte.notaLiquidacion,
            fechaLiquidacion: parte.fechaLiquidacion === undefined ? null : parte.fechaLiquidacion
        }));
    }
}

// Función para crear una copia de seguridad de los datos
function crearBackup() {
    const datosJson = JSON.stringify(datos, null, 2); // Pretty print JSON
    const blob = new Blob([datosJson], { type: 'application/json' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `backup_gestion_obras_${fecha}.json`);
    mostrarMensaje('Copia de seguridad creada correctamente', 'success');
}

// Función para restaurar datos desde una copia de seguridad
function restaurarBackup(archivo) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datosRestaurados = JSON.parse(e.target.result);
            // Verificar estructura mínima de los datos
            if (!datosRestaurados.clientes || !datosRestaurados.obras ||
                !datosRestaurados.operarios || !datosRestaurados.proveedores ||
                !datosRestaurados.partesDiarios) {
                throw new Error('El archivo no tiene un formato válido o está incompleto.');
            }

            datos = datosRestaurados;
            guardarDatos();
            // Actualizar contador de obras
            if (datos.obras.length > 0) {
                 const maxNumero = Math.max(...datos.obras.map(obra => {
                    const num = parseInt(obra.numero.replace('OBR-', ''));
                    return isNaN(num) ? 0 : num;
                }));
                contadorObras = maxNumero >= 0 ? maxNumero + 1 : 1;
            } else {
                 contadorObras = 1;
            }
            actualizarListasYSelectores();
            mostrarMensaje('Datos restaurados correctamente', 'success');
        } catch (error) {
            mostrarMensaje('Error al restaurar los datos: ' + error.message, 'error');
        }
    };
    reader.readAsText(archivo);
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo = 'error') {
    console.log(tipo.toUpperCase() + ': ' + mensaje);
    // Usar un método más amigable que alert, si es posible, por ejemplo, un div temporal
    const messageContainer = document.createElement('div');
    messageContainer.textContent = mensaje;
    messageContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        font-weight: bold;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    `;
    if (tipo === 'success') {
        messageContainer.style.backgroundColor = '#27ae60';
    } else {
        messageContainer.style.backgroundColor = '#e74c3c';
    }
    document.body.appendChild(messageContainer);

    setTimeout(() => {
        messageContainer.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        messageContainer.style.opacity = '0';
        messageContainer.addEventListener('transitionend', () => messageContainer.remove());
    }, 3000);
}

// Función para cambiar entre secciones
function cambiarSeccion(seccionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.menu button').forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(seccionId).classList.add('active');
    const btn = document.getElementById('btn' + seccionId.replace('section', ''));
    if (btn) {
        btn.classList.add('active');
    }

    // Limpiar formulario de parte diario al cambiar de sección, excepto si vamos a editar
    if (seccionId !== 'sectionParteDiario' && editingParteId === null) {
        limpiarFormularioParteDiario();
    }

    // If switching to view parts, refresh the list
    if (seccionId === 'sectionVerPartes') {
        actualizarListaPartesDiarios();
        // Cargar selectores de filtro para Ver Partes
        actualizarSelectoresFiltroVerPartes();
    } else if (seccionId === 'sectionParteDiario') {
         // If switching to parte diario, set today's date if not editing
         if (editingParteId === null) {
             const hoy = new Date().toISOString().split('T')[0];
             document.getElementById('fechaParte').value = hoy;
         }
    } else if (seccionId === 'sectionResumen') {
        // Ocultar el contenido del resumen al cambiar a la sección de resumen
        document.getElementById('contenidoResumen').style.display = 'none';
    } else if (seccionId === 'sectionClientes') {
        limpiarFormularioCliente(); // Ensure form is clean when navigating
        actualizarListaClientes();
    } else if (seccionId === 'sectionObras') {
        limpiarFormularioObra();
        actualizarListaObras();
    } else if (seccionId === 'sectionOperarios') {
        limpiarFormularioOperario();
        actualizarListaOperarios();
    } else if (seccionId === 'sectionProveedores') {
        limpiarFormularioProveedor();
        actualizarListaProveedores();
    } else if (seccionId === 'sectionLiquidacion') {
        actualizarSelectoresOperarios(); // Ensure operario selector is populated
        document.getElementById('operarioLiquidacion').value = ''; // Reset selection
        actualizarListaDiasParaLiquidacion(); // Initial load empty
    } else if (seccionId === 'sectionPagos') {
        actualizarSelectoresObras(); // Ensure obra selector is populated
        // Set today's date defaults
        const hoy = new Date().toISOString().split('T')[0];
        // Only update if not already set, to avoid overwriting user input if they switch tabs within the section
        if (!document.getElementById('fechaPagoAcuenta').value) document.getElementById('fechaPagoAcuenta').value = hoy;
        if (!document.getElementById('fechaPagoPB').value) document.getElementById('fechaPagoPB').value = hoy;
        // Default to the first tab (Pagos a Cuenta)
        switchPagoTab('tabPagosAcuenta');
    }
}

// Función para validar y guardar un cliente
function guardarCliente() {
    const nombre = document.getElementById('nombreCliente').value.trim();
    if (!nombre) {
        mostrarMensaje('El nombre del cliente es obligatorio');
        return;
    }

    const cliente = {
        id: Date.now().toString(), // Simple unique ID
        nombre,
        direccion: document.getElementById('direccionCliente').value.trim(),
        poblacion: document.getElementById('poblacionCliente').value.trim(),
        provincia: document.getElementById('provinciaCliente').value.trim(),
        tipoDocumento: document.getElementById('tipoDocumento').value,
        numeroDocumento: document.getElementById('numeroDocumento').value.trim(),
        telefono: document.getElementById('telefonoCliente').value.trim(),
        email: document.getElementById('emailCliente').value.trim()
    };

    datos.clientes.push(cliente);
    guardarDatos();
    limpiarFormularioCliente();
    actualizarListaClientes();
    actualizarSelectoresClientes();
    mostrarMensaje('Cliente guardado correctamente', 'success');
}

// Función para limpiar el formulario de clientes
function limpiarFormularioCliente() {
    document.getElementById('nombreCliente').value = '';
    document.getElementById('direccionCliente').value = '';
    document.getElementById('poblacionCliente').value = '';
    document.getElementById('provinciaCliente').value = '';
    document.getElementById('tipoDocumento').value = 'CIF';
    document.getElementById('numeroDocumento').value = '';
    document.getElementById('telefonoCliente').value = '';
    document.getElementById('emailCliente').value = '';

    // Restore the button text and handler
    const btnGuardar = document.getElementById('guardarCliente');
    btnGuardar.textContent = 'Guardar Cliente';
    btnGuardar.onclick = guardarCliente;
}

// Función para actualizar la lista de clientes
function actualizarListaClientes() {
    const listaClientes = document.getElementById('listaClientes');
    listaClientes.innerHTML = '';

    if (datos.clientes.length === 0) {
        listaClientes.innerHTML = '<p>No hay clientes registrados</p>';
        return;
    }

    // Sort clients alphabetically by name
    const sortedClients = [...datos.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));

    sortedClients.forEach(cliente => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <strong>${cliente.nombre}</strong>
                ${cliente.telefono ? `<br><small>Tel: ${cliente.telefono}</small>` : ''}
                 ${cliente.numeroDocumento ? `<br><small>${cliente.tipoDocumento}: ${cliente.numeroDocumento}</small>` : ''}
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" title="Editar" onclick="editarCliente('${cliente.id}')">✏️</button>
                <button class="btn-icon" title="Eliminar" onclick="eliminarCliente('${cliente.id}')">🗑️</button>
            </div>
        `;
        listaClientes.appendChild(item);
    });
}

// Función para actualizar los selectores de clientes en otras secciones
function actualizarSelectoresClientes() {
    const selectores = ['clienteObra', 'clienteResumen']; // 'filtroClienteVerPartes' was removed as it's not in HTML
    const filtroClienteVerPartes = document.getElementById('filtroClienteVerPartes'); // For the filter in Ver Partes, if it exists

    selectores.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) { // Check if the selector exists
            const valorActual = selector.value;
            selector.innerHTML = `<option value="">Seleccionar cliente</option>`;

            // Sort clients alphabetically
            const sortedClients = [...datos.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));

            sortedClients.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nombre;
                selector.appendChild(option);
            });

            // Restore value if it still exists
             if (valorActual && datos.clientes.some(c => c.id === valorActual)) {
                selector.value = valorActual;
            } else {
                // Reset if the selected client was deleted
                selector.value = '';
            }
        }
    });

    // Handle filterClienteVerPartes separately if it exists
    if (filtroClienteVerPartes) {
        const valorActual = filtroClienteVerPartes.value;
        filtroClienteVerPartes.innerHTML = `<option value="">Todos los clientes</option>`;
        const sortedClients = [...datos.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));
        sortedClients.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nombre;
            filtroClienteVerPartes.appendChild(option);
        });
        if (valorActual && datos.clientes.some(c => c.id === valorActual)) {
            filtroClienteVerPartes.value = valorActual;
        } else {
            filtroClienteVerPartes.value = '';
        }
    }
}

// Funciones para editar y eliminar clientes
function editarCliente(clienteId) {
    const cliente = datos.clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    // Rellenar formulario con datos del cliente
    document.getElementById('nombreCliente').value = cliente.nombre;
    document.getElementById('direccionCliente').value = cliente.direccion || '';
    document.getElementById('poblacionCliente').value = cliente.poblacion || '';
    document.getElementById('provinciaCliente').value = cliente.provincia || '';
    document.getElementById('tipoDocumento').value = cliente.tipoDocumento || 'CIF';
    document.getElementById('numeroDocumento').value = cliente.numeroDocumento || '';
    document.getElementById('telefonoCliente').value = cliente.telefono || '';
    document.getElementById('emailCliente').value = cliente.email || '';

    // Change the save button to update
    const btnGuardar = document.getElementById('guardarCliente');
    btnGuardar.textContent = 'Actualizar Cliente';
    btnGuardar.onclick = function() {
        actualizarCliente(clienteId);
    };

    // Switch to the client section
    cambiarSeccion('sectionClientes');
}

function actualizarCliente(clienteId) {
    const nombre = document.getElementById('nombreCliente').value.trim();
    if (!nombre) {
        mostrarMensaje('El nombre es obligatorio');
        return;
    }

    const index = datos.clientes.findIndex(c => c.id === clienteId);
    if (index === -1) {
        mostrarMensaje('Error: Cliente no encontrado para actualizar.');
        return;
    }

    datos.clientes[index] = {
        id: clienteId,
        nombre,
        direccion: document.getElementById('direccionCliente').value.trim(),
        poblacion: document.getElementById('poblacionCliente').value.trim(),
        provincia: document.getElementById('provinciaCliente').value.trim(),
        tipoDocumento: document.getElementById('tipoDocumento').value,
        numeroDocumento: document.getElementById('numeroDocumento').value.trim(),
        telefono: document.getElementById('telefonoCliente').value.trim(),
        email: document.getElementById('emailCliente').value.trim()
    };

    guardarDatos();
    limpiarFormularioCliente(); // Also resets the button handler
    actualizarListaClientes();
    actualizarSelectoresClientes();
    mostrarMensaje('Cliente actualizado correctamente', 'success');
}

function eliminarCliente(clienteId) {
    // Check if there are works associated with this client
    const obrasAsociadas = datos.obras.filter(obra => obra.clienteId === clienteId);
    if (obrasAsociadas.length > 0) {
        mostrarMensaje('No se puede eliminar este cliente porque tiene obras asociadas');
        return;
    }

    if (confirm('¿Está seguro de que desea eliminar este cliente?')) {
        datos.clientes = datos.clientes.filter(c => c.id !== clienteId);
        guardarDatos();
        actualizarListaClientes();
        actualizarSelectoresClientes();
        mostrarMensaje('Cliente eliminado correctamente', 'success');
    }
}

// Función para validar y guardar una obra
function guardarObra() {
    const clienteId = document.getElementById('clienteObra').value;
    const nombre = document.getElementById('nombreObra').value.trim();
    const presupuestoTotal = parseFloat(document.getElementById('presupuestoTotalObra').value) || 0;

    if (!clienteId) {
        mostrarMensaje('Debe seleccionar un cliente');
        return;
    }

    if (!nombre) {
        mostrarMensaje('El nombre de la obra es obligatorio');
        return;
    }

    const obra = {
        id: Date.now().toString(), // Simple unique ID
        clienteId,
        nombre,
        numero: `OBR-${contadorObras.toString().padStart(3, '0')}`,
        fechaCreacion: new Date().toISOString(),
        presupuestoTotal: presupuestoTotal
    };

    datos.obras.push(obra);
    contadorObras++;
    guardarDatos();
    limpiarFormularioObra();
    actualizarListaObras();
    actualizarSelectoresObras();
    mostrarMensaje('Obra guardada correctamente', 'success');
}

// Función para limpiar el formulario de obras
function limpiarFormularioObra() {
    document.getElementById('clienteObra').value = '';
    document.getElementById('nombreObra').value = '';
    document.getElementById('numeroObra').value = ''; // The number is auto-assigned on new save
    document.getElementById('presupuestoTotalObra').value = '';

     // Restore the button text and handler
    const btnGuardar = document.getElementById('guardarObra');
    btnGuardar.textContent = 'Guardar Obra';
    btnGuardar.onclick = guardarObra;
}

// Función para actualizar la lista de obras
function actualizarListaObras() {
    const listaObras = document.getElementById('listaObras');
    listaObras.innerHTML = '';

    if (datos.obras.length === 0) {
        listaObras.innerHTML = '<p>No hay obras registradas</p>';
        return;
    }

    // Sort works alphabetically by name
    const sortedObras = [...datos.obras].sort((a, b) => a.nombre.localeCompare(b.nombre));

    sortedObras.forEach(obra => {
        const cliente = datos.clientes.find(c => c.id === obra.clienteId);
        const clienteNombre = cliente ? cliente.nombre : 'Cliente desconocido';

        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <strong>${obra.numero}</strong> - ${obra.nombre}
                <br>
                <small>Cliente: ${clienteNombre}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" title="Editar" onclick="editarObra('${obra.id}')">✏️</button>
                <button class="btn-icon" title="Eliminar" onclick="eliminarObra('${obra.id}')">🗑️</button>
            </div>
        `;
        listaObras.appendChild(item);
    });
}

// Función para actualizar los selectores de obras en otras secciones
function actualizarSelectoresObras() {
    const selectores = ['obraParte', 'obraResumen', 'filtroObraVerPartes', 'obraPagoAcuenta', 'filtroObraPagosAcuenta'];

    selectores.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) { // Check if selector exists
            const valorActual = selector.value;
            
            let defaultOptionText = 'Seleccionar obra';
            if (selectorId === 'filtroObraVerPartes' || selectorId === 'filtroObraPagosAcuenta') {
                defaultOptionText = 'Todas las obras';
            }

            selector.innerHTML = `<option value="">${defaultOptionText}</option>`;

            // Sort works alphabetically by name
            const sortedObras = [...datos.obras].sort((a, b) => a.nombre.localeCompare(b.nombre));

            sortedObras.forEach(obra => {
                const cliente = datos.clientes.find(c => c.id === obra.clienteId);
                const clienteNombre = cliente ? cliente.nombre : 'Cliente desconocido';

                const option = document.createElement('option');
                option.value = obra.id;
                option.textContent = `${obra.numero} - ${obra.nombre} (${clienteNombre})`;
                selector.appendChild(option);
            });

            // Restaurar valor seleccionado si existe
            if (valorActual && datos.obras.some(o => o.id === valorActual)) {
                selector.value = valorActual;
            } else {
                // Reset if the selected work was deleted
                selector.value = '';
            }
        }
    });
}

// Funciones para editar y eliminar obras
function editarObra(obraId) {
    const obra = datos.obras.find(o => o.id === obraId);
    if (!obra) {
        mostrarMensaje('Obra no encontrada para editar.');
        return;
    }

    // Rellenar formulario con datos de la obra
    document.getElementById('clienteObra').value = obra.clienteId;
    document.getElementById('nombreObra').value = obra.nombre;
    document.getElementById('presupuestoTotalObra').value = obra.presupuestoTotal || '';

    // Change the save button to update
    const btnGuardar = document.getElementById('guardarObra');
    btnGuardar.textContent = 'Actualizar Obra';
    btnGuardar.onclick = function() {
        actualizarObra(obraId);
    };

    // Switch to the work section
    cambiarSeccion('sectionObras');
}

function actualizarObra(obraId) {
    const clienteId = document.getElementById('clienteObra').value;
    const nombre = document.getElementById('nombreObra').value.trim();
    const presupuestoTotal = parseFloat(document.getElementById('presupuestoTotalObra').value) || 0;

    if (!clienteId) {
        mostrarMensaje('Debe seleccionar un cliente');
        return;
    }

    if (!nombre) {
        mostrarMensaje('El nombre de la obra es obligatorio');
        return;
    }

    const index = datos.obras.findIndex(o => o.id === obraId);
    if (index === -1) {
        mostrarMensaje('Error: Obra no encontrada para actualizar.');
        return;
    }

    const numeroOriginal = datos.obras[index].numero; // Keep original number

    datos.obras[index] = {
        id: obraId,
        clienteId,
        nombre,
        numero: numeroOriginal,
        fechaCreacion: datos.obras[index].fechaCreacion,
        presupuestoTotal: presupuestoTotal
    };

    guardarDatos();
    limpiarFormularioObra(); // Also resets the button handler
    actualizarListaObras();
    actualizarSelectoresObras();
    mostrarMensaje('Obra actualizada correctamente', 'success');
}

function eliminarObra(obraId) {
    // Check if there are parts associated with this work
    const partesAsociadas = datos.partesDiarios.filter(parte => parte.obraId === obraId);
    if (partesAsociadas.length > 0) {
        mostrarMensaje('No se puede eliminar esta obra porque tiene partes diarios asociados');
        return;
    }

    if (confirm('¿Está seguro de que desea eliminar esta obra?')) {
        datos.obras = datos.obras.filter(o => o.id !== obraId);
        guardarDatos();
        actualizarListaObras();
        actualizarSelectoresObras();
        mostrarMensaje('Obra eliminada correctamente', 'success');
    }
}

// Funciones para operarios
function guardarOperario() {
    const nombre = document.getElementById('nombreOperario').value.trim();
    if (!nombre) {
        mostrarMensaje('El nombre es obligatorio');
        return;
    }

    const operario = {
        id: Date.now().toString(),
        nombre,
        direccion: document.getElementById('direccionOperario').value.trim(),
        poblacion: document.getElementById('poblacionOperario').value.trim(),
        provincia: document.getElementById('provinciaOperario').value.trim(),
        telefono: document.getElementById('telefonoOperario').value.trim(),
        email: document.getElementById('emailOperario').value.trim()
    };

    datos.operarios.push(operario);
    guardarDatos();
    limpiarFormularioOperario();
    actualizarListaOperarios();
    actualizarSelectoresOperarios();
    mostrarMensaje('Operario guardado correctamente', 'success');
}

function limpiarFormularioOperario() {
    document.getElementById('nombreOperario').value = '';
    document.getElementById('direccionOperario').value = '';
    document.getElementById('poblacionOperario').value = '';
    document.getElementById('provinciaOperario').value = '';
    document.getElementById('telefonoOperario').value = '';
    document.getElementById('emailOperario').value = '';

    // Restore the button text and handler
    const btnGuardar = document.getElementById('guardarOperario');
    btnGuardar.textContent = 'Guardar Operario';
    btnGuardar.onclick = guardarOperario;
}

function actualizarListaOperarios() {
    const listaOperarios = document.getElementById('listaOperarios');
    listaOperarios.innerHTML = '';

    if (datos.operarios.length === 0) {
        listaOperarios.innerHTML = '<p>No hay operarios registrados</p>';
        return;
    }

    // Sort operators alphabetically by name
    const sortedOperarios = [...datos.operarios].sort((a, b) => a.nombre.localeCompare(b.nombre));

    sortedOperarios.forEach(operario => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <strong>${operario.nombre}</strong>
                ${operario.telefono ? ` - Tel: ${operario.telefono}` : ''}
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" title="Editar" onclick="editarOperario('${operario.id}')">✏️</button>
                <button class="btn-icon" title="Eliminar" onclick="eliminarOperario('${operario.id}')">🗑️</button>
            </div>
        `;
        listaOperarios.appendChild(item);
    });
}

function actualizarSelectoresOperarios() {
    const selectores = ['operarioParte', 'operarioLiquidacion', 'operarioResumen', 'operarioVerPartes', 'operarioPagaParte'];

    selectores.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) { // Check if selector exists
            const valorActual = selector.value;
            const isLiquidacionSelector = selectorId === 'operarioLiquidacion';

            selector.innerHTML = `<option value="">${selectorId === 'operarioVerPartes' ? 'Todos los operarios' : 'Seleccionar operario'}</option>`;
            
            // Handle 'operarioPagaParte' default option
            if (selectorId === 'operarioPagaParte') {
                selector.innerHTML = `<option value="">Nadie</option>`;
            }

            // Sort operators alphabetically by name
            const sortedOperarios = [...datos.operarios].sort((a, b) => a.nombre.localeCompare(b.nombre));

            sortedOperarios.forEach(operario => {
                const option = document.createElement('option');
                option.value = operario.id;
                option.textContent = operario.nombre;
                selector.appendChild(option);
            });

            // Restaurar valor seleccionado si existe
            if (valorActual && datos.operarios.some(o => o.id === valorActual)) {
                selector.value = valorActual;
            } else {
                // Reset if the selected operator was deleted
                selector.value = '';
            }

            // Add change listener specifically for liquidation section to trigger list update
            if (isLiquidacionSelector) {
                selector.onchange = actualizarListaDiasParaLiquidacion;
            }
        }
    });
}

function editarOperario(operarioId) {
    const operario = datos.operarios.find(o => o.id === operarioId);
    if (!operario) {
        mostrarMensaje('Operario no encontrado para editar.');
        return;
    }

    // Rellenar formulario con datos del operario
    document.getElementById('nombreOperario').value = operario.nombre;
    document.getElementById('direccionOperario').value = operario.direccion || '';
    document.getElementById('poblacionOperario').value = operario.poblacion || '';
    document.getElementById('provinciaOperario').value = operario.provincia || '';
    document.getElementById('telefonoOperario').value = operario.telefono || '';
    document.getElementById('emailOperario').value = operario.email || '';

    // Change the save button to update
    const btnGuardar = document.getElementById('guardarOperario');
    btnGuardar.textContent = 'Actualizar Operario';
    btnGuardar.onclick = function() {
        actualizarOperario(operarioId);
    };

    // Switch to the operator section
    cambiarSeccion('sectionOperarios');
}

function actualizarOperario(operarioId) {
    const nombre = document.getElementById('nombreOperario').value.trim();
    if (!nombre) {
        mostrarMensaje('El nombre es obligatorio');
        return;
    }

    const index = datos.operarios.findIndex(o => o.id === operarioId);
    if (index === -1) {
        mostrarMensaje('Error: Operario no encontrado para actualizar.');
        return;
    }

    datos.operarios[index] = {
        id: operarioId,
        nombre,
        direccion: document.getElementById('direccionOperario').value.trim(),
        poblacion: document.getElementById('poblacionOperario').value.trim(),
        provincia: document.getElementById('provinciaOperario').value.trim(),
        telefono: document.getElementById('telefonoOperario').value.trim(),
        email: document.getElementById('emailOperario').value.trim()
    };

    guardarDatos();
    limpiarFormularioOperario(); // Also resets the button handler
    actualizarListaOperarios();
    actualizarSelectoresOperarios();
    mostrarMensaje('Operario actualizado correctamente', 'success');
}

function eliminarOperario(operarioId) {
    // Check if there are parts associated with this operator
    const partesAsociadas = datos.partesDiarios.filter(parte => parte.operarioId === operarioId);
    if (partesAsociadas.length > 0) {
        mostrarMensaje('No se puede eliminar este operario porque tiene partes diarios asociados');
        return;
    }

    if (confirm('¿Está seguro de que desea eliminar este operario?')) {
        datos.operarios = datos.operarios.filter(o => o.id !== operarioId);
        guardarDatos();
        actualizarListaOperarios();
        actualizarSelectoresOperarios();
        mostrarMensaje('Operario eliminado correctamente', 'success');
    }
}

// Funciones para proveedores
function guardarProveedor() {
    const nombre = document.getElementById('nombreProveedor').value.trim();
    if (!nombre) {
        mostrarMensaje('El nombre es obligatorio');
        return;
    }

    const proveedor = {
        id: Date.now().toString(),
        nombre,
        direccion: document.getElementById('direccionProveedor').value.trim(),
        poblacion: document.getElementById('poblacionProveedor').value.trim(),
        provincia: document.getElementById('provinciaProveedor').value.trim(),
        tipoDocumento: document.getElementById('tipoDocumentoProveedor').value,
        numeroDocumento: document.getElementById('numeroDocumentoProveedor').value.trim(),
        telefono: document.getElementById('telefonoProveedor').value.trim(),
        email: document.getElementById('emailProveedor').value.trim()
    };

    datos.proveedores.push(proveedor);
    guardarDatos();
    limpiarFormularioProveedor();
    actualizarListaProveedores();
    actualizarSelectoresProveedores();
    mostrarMensaje('Proveedor guardado correctamente', 'success');
}

function limpiarFormularioProveedor() {
    document.getElementById('nombreProveedor').value = '';
    document.getElementById('direccionProveedor').value = '';
    document.getElementById('poblacionProveedor').value = '';
    document.getElementById('provinciaProveedor').value = '';
    document.getElementById('tipoDocumentoProveedor').value = 'CIF';
    document.getElementById('numeroDocumentoProveedor').value = '';
    document.getElementById('telefonoProveedor').value = '';
    document.getElementById('emailProveedor').value = '';

    // Restore the button text and handler
    const btnGuardar = document.getElementById('guardarProveedor');
    btnGuardar.textContent = 'Guardar Proveedor';
    btnGuardar.onclick = guardarProveedor;
}

function actualizarListaProveedores() {
    const listaProveedores = document.getElementById('listaProveedores');
    listaProveedores.innerHTML = '';

    if (datos.proveedores.length === 0) {
        listaProveedores.innerHTML = '<p>No hay proveedores registrados</p>';
        return;
    }

    // Sort suppliers alphabetically by name
    const sortedProveedores = [...datos.proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));

    sortedProveedores.forEach(proveedor => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <strong>${proveedor.nombre}</strong>
                ${proveedor.telefono ? ` - Tel: ${proveedor.telefono}` : ''}
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" title="Editar" onclick="editarProveedor('${proveedor.id}')">✏️</button>
                <button class="btn-icon" title="Eliminar" onclick="eliminarProveedor('${proveedor.id}')">🗑️</button>
            </div>
        `;
        listaProveedores.appendChild(item);
    });
}

function actualizarSelectoresProveedores() {
    const selectores = ['proveedorParte'];

    selectores.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) { // Check if selector exists
            const valorActual = selector.value;

            selector.innerHTML = '<option value="">Ninguno</option>';

            // Sort suppliers alphabetically by name
            const sortedProveedores = [...datos.proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));

            sortedProveedores.forEach(proveedor => {
                const option = document.createElement('option');
                option.value = proveedor.id;
                option.textContent = proveedor.nombre;
                selector.appendChild(option);
            });

            // Restaurar valor seleccionado si existe
            if (valorActual && datos.proveedores.some(p => p.id === valorActual)) {
                selector.value = valorActual;
            } else {
                // Reset if the selected supplier was deleted
                selector.value = '';
            }
        }
    });
}

function editarProveedor(proveedorId) {
    const proveedor = datos.proveedores.find(p => p.id === proveedorId);
    if (!proveedor) {
        mostrarMensaje('Proveedor no encontrado para editar.');
        return;
    }

    // Rellenar formulario con datos del proveedor
    document.getElementById('nombreProveedor').value = proveedor.nombre;
    document.getElementById('direccionProveedor').value = proveedor.direccion || '';
    document.getElementById('poblacionProveedor').value = proveedor.poblacion || '';
    document.getElementById('provinciaProveedor').value = proveedor.provincia || '';
    document.getElementById('tipoDocumentoProveedor').value = proveedor.tipoDocumento || 'CIF';
    document.getElementById('numeroDocumentoProveedor').value = proveedor.numeroDocumento || '';
    document.getElementById('telefonoProveedor').value = proveedor.telefono || '';
    document.getElementById('emailProveedor').value = proveedor.email || '';

    // Change the save button to update
    const btnGuardar = document.getElementById('guardarProveedor');
    btnGuardar.textContent = 'Actualizar Proveedor';
    btnGuardar.onclick = function() {
        actualizarProveedor(proveedorId);
    };

    // Switch to the supplier section
    cambiarSeccion('sectionProveedores');
}

function actualizarProveedor(proveedorId) {
    const nombre = document.getElementById('nombreProveedor').value.trim();
    if (!nombre) {
        mostrarMensaje('El nombre es obligatorio');
        return;
    }

    const index = datos.proveedores.findIndex(p => p.id === proveedorId);
    if (index === -1) {
        mostrarMensaje('Error: Proveedor no encontrado para actualizar.');
        return;
    }

    datos.proveedores[index] = {
        id: proveedorId,
        nombre,
        direccion: document.getElementById('direccionProveedor').value.trim(),
        poblacion: document.getElementById('poblacionProveedor').value.trim(),
        provincia: document.getElementById('provinciaProveedor').value.trim(),
        tipoDocumento: document.getElementById('tipoDocumentoProveedor').value,
        numeroDocumento: document.getElementById('numeroDocumentoProveedor').value.trim(),
        telefono: document.getElementById('telefonoProveedor').value.trim(),
        email: document.getElementById('emailProveedor').value.trim()
    };

    guardarDatos();
    limpiarFormularioProveedor(); // Also resets the button handler
    actualizarListaProveedores();
    actualizarSelectoresProveedores();
    mostrarMensaje('Proveedor actualizado correctamente', 'success');
}

function eliminarProveedor(proveedorId) {
    // Check if there are parts associated with this supplier
    const partesAsociadas = datos.partesDiarios.filter(parte => parte.proveedorId === proveedorId);
    if (partesAsociadas.length > 0) {
        mostrarMensaje('No se puede eliminar este proveedor porque tiene partes diarios asociados');
        return;
    }

    if (confirm('¿Está seguro de que desea eliminar este proveedor?')) {
        datos.proveedores = datos.proveedores.filter(p => p.id !== proveedorId);
        guardarDatos();
        actualizarListaProveedores();
        actualizarSelectoresProveedores();
        mostrarMensaje('Proveedor eliminado correctamente', 'success');
    }
}

// Funciones para partes diarios
async function guardarOActualizarParteDiario() {
    const fecha = document.getElementById('fechaParte').value;
    const obraId = document.getElementById('obraParte').value;
    const operarioId = document.getElementById('operarioParte').value;
    const horas = parseFloat(document.getElementById('horasParte').value);
    const descripcion = document.getElementById('descripcionParte').value.trim();
    
    // NEW FIELDS
    const documentoGasto = document.getElementById('documentoGastoParte').value.trim();
    const operarioPagaId = document.getElementById('operarioPagaParte').value || null;

    const proveedorId = document.getElementById('proveedorParte').value || null;
    const gasto = parseFloat(document.getElementById('gastoParte').value) || 0;

    if (!fecha || !obraId || !operarioId || isNaN(horas) || horas <= 0 || !descripcion) {
        mostrarMensaje('Debe completar todos los campos obligatorios (fecha, obra, operario, horas y descripción)');
        return;
    }
    // Check if obra or operario exists
    if (!datos.obras.some(o => o.id === obraId)) {
        mostrarMensaje('La obra seleccionada no es válida.');
        return;
    }
    if (!datos.operarios.some(op => op.id === operarioId)) {
        mostrarMensaje('El operario seleccionado no es válido.');
        return;
    }
    if (proveedorId && !datos.proveedores.some(p => p.id === proveedorId)) {
        mostrarMensaje('El proveedor seleccionado no es válido.');
        return;
    }

    const fotosInput = document.getElementById('fotosParte');
    const fotoGastoInput = document.getElementById('fotoGasto');

    let nuevasFotosBase64 = [];
    let nuevaFotoGastoBase64 = null;

    try {
        // Procesar nuevas fotos del parte (si se seleccionaron)
        if (fotosInput.files.length > 0) {
            for (let i = 0; i < fotosInput.files.length; i++) {
                const imagenBase64 = await procesarImagen(fotosInput.files[i]);
                nuevasFotosBase64.push(imagenBase64);
            }
        }

        // Procesar nueva foto del gasto (si se seleccionó y hay gasto/proveedor)
        if (proveedorId && gasto > 0 && fotoGastoInput.files.length > 0) {
            nuevaFotoGastoBase64 = await procesarImagen(fotoGastoInput.files[0]);
        }
    } catch (error) {
        mostrarMensaje('Error al procesar las imágenes: ' + error.message);
        return;
    }
    
    // Check if operarioPagaId is valid if provided
    if (operarioPagaId && !datos.operarios.some(op => op.id === operarioPagaId)) {
        mostrarMensaje('El operario que paga seleccionado no es válido.', 'error');
        return;
    }


    if (editingParteId) {
        // Actualizar parte existente
        const index = datos.partesDiarios.findIndex(p => p.id === editingParteId);
        if (index === -1) {
            mostrarMensaje('Error: Parte diario no encontrado para actualizar.');
            return;
        }

        // Si no se seleccionaron nuevas fotos, mantener las existentes
        const fotosParaGuardar = nuevasFotosBase64.length > 0 ? nuevasFotosBase64 : datos.partesDiarios[index].fotos || [];
        // Si no se seleccionó nueva foto de gasto, mantener la existente
        const fotoGastoParaGuardar = nuevaFotoGastoBase64 || datos.partesDiarios[index].fotoGasto || null;

        datos.partesDiarios[index] = {
            id: editingParteId,
            fecha,
            obraId,
            operarioId,
            horas,
            descripcion,
            fotos: fotosParaGuardar,
            proveedorId: proveedorId,
            gasto: gasto,
            fotoGasto: fotoGastoParaGuardar,
            documentoGasto: documentoGasto,
            operarioPagaId: operarioPagaId,
            // Preserve liquidation status during update
            liquidado: datos.partesDiarios[index].liquidado,
            notaLiquidacion: datos.partesDiarios[index].notaLiquidacion,
            fechaLiquidacion: datos.partesDiarios[index].fechaLiquidacion
        };
        mostrarMensaje('Parte diario actualizado correctamente', 'success');
        editingParteId = null; // Reset editing state
    } else {
        // Guardar nuevo parte
        const parteDiario = {
            id: Date.now().toString(),
            fecha,
            obraId,
            operarioId,
            horas,
            descripcion,
            fotos: nuevasFotosBase64,
            proveedorId: proveedorId,
            gasto: gasto,
            fotoGasto: nuevaFotoGastoBase64,
            documentoGasto: documentoGasto,
            operarioPagaId: operarioPagaId,
            liquidado: false, // NEW
            notaLiquidacion: '', // NEW
            fechaLiquidacion: null // NEW
        };
        datos.partesDiarios.push(parteDiario);
        mostrarMensaje('Parte diario guardado correctamente', 'success');
    }

    guardarDatos();
    limpiarFormularioParteDiario();
    actualizarListaPartesDiarios(); // Refresh the view parts list after saving/updating
}

// Función para procesar una imagen y convertirla a base64
function procesarImagen(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null); // Return null if no file
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            reject(new Error('La imagen es demasiado grande. Máximo 2MB.'));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = function() {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function limpiarFormularioParteDiario() {
    document.getElementById('fechaParte').value = new Date().toISOString().split('T')[0]; // Set today's date
    document.getElementById('obraParte').value = '';
    document.getElementById('operarioParte').value = '';
    document.getElementById('horasParte').value = '';
    document.getElementById('descripcionParte').value = '';
    document.getElementById('fotosParte').value = '';
    document.getElementById('proveedorParte').value = '';
    document.getElementById('gastoParte').value = '';
    document.getElementById('fotoGasto').value = '';
    
    document.getElementById('documentoGastoParte').value = '';
    document.getElementById('operarioPagaParte').value = '';
    
    document.getElementById('previewFotos').innerHTML = '';
    document.getElementById('previewGasto').innerHTML = '';

    // Reset button text and handler
    const btnGuardarParte = document.getElementById('guardarParte');
    btnGuardarParte.textContent = 'Guardar Parte';
    btnGuardarParte.onclick = guardarOActualizarParteDiario;
    editingParteId = null;
}

// === Funcionalidad "Ver Partes" ===
function actualizarSelectoresFiltroVerPartes() {
    const selectorFiltroObra = document.getElementById('filtroObraVerPartes');
    const selectorFiltroOperario = document.getElementById('filtroOperarioVerPartes');

    // Obtener IDs únicos de obras y operarios de los partes diarios
    const obrasEnPartes = [...new Set(datos.partesDiarios.map(parte => parte.obraId))];
    const operariosEnPartes = [...new Set(datos.partesDiarios.map(parte => parte.operarioId))];

    // Actualizar selector de obra
    const valorActualObra = selectorFiltroObra.value;
    selectorFiltroObra.innerHTML = '<option value="">Todas las obras</option>';
    obrasEnPartes.forEach(obraId => {
        const obra = datos.obras.find(o => o.id === obraId);
        if (obra) {
            const cliente = datos.clientes.find(c => c.id === obra.clienteId);
            const option = document.createElement('option');
            option.value = obra.id;
            option.textContent = `${obra.numero} - ${obra.nombre} (${cliente ? cliente.nombre : 'Desconocido'})`;
            selectorFiltroObra.appendChild(option);
        }
    });
    if (valorActualObra && obrasEnPartes.includes(valorActualObra)) {
        selectorFiltroObra.value = valorActualObra;
    } else {
        selectorFiltroObra.value = '';
    }

    // Actualizar selector de operario
    const valorActualOperario = selectorFiltroOperario.value;
    selectorFiltroOperario.innerHTML = '<option value="">Todos los operarios</option>';
    operariosEnPartes.forEach(operarioId => {
        const operario = datos.operarios.find(o => o.id === operarioId);
        if (operario) {
            const option = document.createElement('option');
            option.value = operario.id;
            option.textContent = operario.nombre;
            selectorFiltroOperario.appendChild(option);
        }
    });
    if (valorActualOperario && operariosEnPartes.includes(valorActualOperario)) {
        selectorFiltroOperario.value = valorActualOperario;
    } else {
        selectorFiltroOperario.value = '';
    }
}

function actualizarListaPartesDiarios() {
    const listaPartesDiarios = document.getElementById('listaPartesDiarios');
    listaPartesDiarios.innerHTML = '';

    const filtroObraId = document.getElementById('filtroObraVerPartes').value;
    const filtroFecha = document.getElementById('filtroFechaVerPartes').value;
    const filtroOperarioId = document.getElementById('filtroOperarioVerPartes').value;

    let partesFiltrados = datos.partesDiarios;

    if (filtroObraId) {
        partesFiltrados = partesFiltrados.filter(parte => parte.obraId === filtroObraId);
    }
    if (filtroFecha) {
        partesFiltrados = partesFiltrados.filter(parte => parte.fecha === filtroFecha);
    }
    if (filtroOperarioId) {
        partesFiltrados = partesFiltrados.filter(parte => parte.operarioId === filtroOperarioId);
    }

    if (partesFiltrados.length === 0) {
        listaPartesDiarios.innerHTML = '<p>No hay partes diarios registrados con los filtros aplicados.</p>';
        return;
    }

    // Ordenar por fecha descendente
    partesFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    partesFiltrados.forEach(parte => {
        const obra = datos.obras.find(o => o.id === parte.obraId);
        const operario = datos.operarios.find(o => o.id === parte.operarioId);
        const proveedor = parte.proveedorId ? datos.proveedores.find(p => p.id === parte.proveedorId) : null;

        const item = document.createElement('div');
        item.className = 'list-item parte-diario-item';
        item.innerHTML = `
            <div class="list-item-info">
                <strong>Fecha:</strong> ${new Date(parte.fecha).toLocaleDateString()}
                <br>
                <strong>Obra:</strong> ${obra ? obra.numero + ' - ' + obra.nombre : 'Obra desconocida'}
                <br>
                <strong>Operario:</strong> ${operario ? operario.nombre : 'Operario desconocido'}
                <br>
                <strong>Horas:</strong> ${parte.horas}
                <br>
                <small>Descripción: ${parte.descripcion.substring(0, 100)}${parte.descripcion.length > 100 ? '...' : ''}</small>
                ${parte.gasto > 0 ? `<br><small>Gasto: ${parte.gasto.toFixed(2)} € (${proveedor ? proveedor.nombre : 'Desconocido'})</small>` : ''}
                ${parte.liquidado ? `<br><small style="color: green;">Liquidado: Sí (${new Date(parte.fechaLiquidacion).toLocaleDateString()})</small>` : ''}
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" title="Ver Detalles" onclick="mostrarDetallesParte('${parte.id}')">👁️</button>
                <button class="btn-icon" title="Editar" onclick="editarParteDiario('${parte.id}')">✏️</button>
                <button class="btn-icon" title="Eliminar" onclick="eliminarParteDiario('${parte.id}')">🗑️</button>
            </div>
        `;
        listaPartesDiarios.appendChild(item);
    });
}

function aplicarFiltroVerPartes() {
    actualizarListaPartesDiarios();
}

function limpiarFiltroVerPartes() {
    document.getElementById('filtroObraVerPartes').value = '';
    document.getElementById('filtroFechaVerPartes').value = '';
    document.getElementById('filtroOperarioVerPartes').value = '';
    actualizarListaPartesDiarios();
}

function mostrarDetallesParte(parteId) {
    const parte = datos.partesDiarios.find(p => p.id === parteId);
    if (!parte) return;

    const obra = datos.obras.find(o => o.id === parte.obraId);
    const operario = datos.operarios.find(o => o.id === parte.operarioId);
    const proveedor = parte.proveedorId ? datos.proveedores.find(p => p.id === parte.proveedorId) : null;

    let htmlContenido = `
        <h3>Detalles del Parte Diario</h3>
        <p><strong>Fecha:</strong> ${new Date(parte.fecha).toLocaleDateString()}</p>
        <p><strong>Obra:</strong> ${obra ? obra.numero + ' - ' + obra.nombre : 'Obra desconocida'}</p>
        <p><strong>Operario:</strong> ${operario ? operario.nombre : 'Operario desconocido'}</p>
        <p><strong>Horas trabajadas:</strong> ${parte.horas}</p>
        <p><strong>Descripción:</strong> ${parte.descripcion}</p>
    `;

    if (parte.fotos && parte.fotos.length > 0) {
        htmlContenido += `
            <div class="visualizacion-fotos">
                <h4>Fotografías:</h4>
        `;
        parte.fotos.forEach(foto => {
            htmlContenido += `<img src="${foto}" alt="Foto del parte" class="photo-thumbnail-large" />`;
        });
        htmlContenido += `</div>`;
    }

    if (parte.gasto > 0) {
        htmlContenido += `
            <div class="visualizacion-gasto">
                <h4>Gasto en Proveedor:</h4>
                <p><strong>Proveedor:</strong> ${proveedor ? proveedor.nombre : 'Desconocido'}</p>
                <p><strong>Importe:</strong> ${parte.gasto.toFixed(2)} €</p>
        `;
        if (parte.fotoGasto) {
            htmlContenido += `<img src="${parte.fotoGasto}" alt="Foto comprobante" class="photo-thumbnail-large" />`;
        }
        htmlContenido += `</div>`;
    }

    // Mostrar el contenido en el modal de visualización completa
    document.getElementById('contenidoCompleto').innerHTML = htmlContenido;
    document.getElementById('visualizacionCompleta').style.display = 'block';
}

async function editarParteDiario(parteId) {
    const parte = datos.partesDiarios.find(p => p.id === parteId);
    if (!parte) {
        mostrarMensaje('Parte diario no encontrado para editar.');
        return;
    }

    // Establecer el ID del parte que estamos editando
    editingParteId = parteId;

    // Rellenar el formulario de Parte Diario con los datos existentes
    document.getElementById('fechaParte').value = parte.fecha;
    document.getElementById('obraParte').value = parte.obraId;
    document.getElementById('operarioParte').value = parte.operarioId;
    document.getElementById('horasParte').value = parte.horas;
    document.getElementById('descripcionParte').value = parte.descripcion;
    document.getElementById('proveedorParte').value = parte.proveedorId || '';
    document.getElementById('gastoParte').value = parte.gasto || 0;
    
    // Load new expense fields
    document.getElementById('documentoGastoParte').value = parte.documentoGasto || '';
    document.getElementById('operarioPagaParte').value = parte.operarioPagaId || '';

    // Mostrar vista previa de fotos existentes
    const previewFotos = document.getElementById('previewFotos');
    previewFotos.innerHTML = '';
    if (parte.fotos && parte.fotos.length > 0) {
        parte.fotos.forEach(foto => {
            const img = document.createElement('img');
            img.src = foto;
            img.className = 'photo-thumbnail';
            previewFotos.appendChild(img);
        });
    }

    const previewGasto = document.getElementById('previewGasto');
    previewGasto.innerHTML = '';
    if (parte.fotoGasto) {
        const img = document.createElement('img');
        img.src = parte.fotoGasto;
        img.className = 'photo-thumbnail';
        previewGasto.appendChild(img);
    }

    // Cambiar el texto del botón Guardar Parte a "Actualizar Parte"
    const btnGuardarParte = document.getElementById('guardarParte');
    btnGuardarParte.textContent = 'Actualizar Parte';
    btnGuardarParte.onclick = guardarOActualizarParteDiario; // Usará la misma función pero con editingParteId

    // Limpiar inputs de archivo para que el usuario pueda seleccionar nuevos
    document.getElementById('fotosParte').value = '';
    document.getElementById('fotoGasto').value = '';

    // Navegar a la sección de Parte Diario
    cambiarSeccion('sectionParteDiario');
}

function eliminarParteDiario(parteId) {
    if (confirm('¿Está seguro de que desea eliminar este parte diario?')) {
        datos.partesDiarios = datos.partesDiarios.filter(p => p.id !== parteId);
        guardarDatos();
        actualizarListaPartesDiarios();
        mostrarMensaje('Parte diario eliminado correctamente', 'success');
    }
}

// === Funcionalidad "Liquidación" ===

// Obtiene una lista agrupada de días trabajados no liquidados por el operario
function obtenerDiasTrabajadosNoLiquidados(operarioId) {
    if (!operarioId) return [];

    const partesOperario = datos.partesDiarios.filter(p => 
        p.operarioId === operarioId && !p.liquidado
    );

    // Group parts by date
    const diasAgrupados = partesOperario.reduce((acc, parte) => {
        if (!acc[parte.fecha]) {
            acc[parte.fecha] = [];
        }
        acc[parte.fecha].push(parte);
        return acc;
    }, {});

    // Convert to a list of day objects
    const diasLiquidar = Object.keys(diasAgrupados).map(fecha => {
        const partesDia = diasAgrupados[fecha];
        const totalHoras = partesDia.reduce((sum, p) => sum + p.horas, 0);
        const totalGastos = partesDia.reduce((sum, p) => sum + p.gasto, 0);
        
        return {
            fecha,
            totalHoras: totalHoras,
            totalGastos: totalGastos,
            parteIds: partesDia.map(p => p.id),
            // We need a unique ID for the listing element, let's use the date + operarioId
            listId: `${operarioId}-${fecha}`
        };
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Order by date ASC

    return diasLiquidar;
}

function actualizarListaDiasParaLiquidacion() {
    const operarioId = document.getElementById('operarioLiquidacion').value;
    const listaDias = document.getElementById('listaDiasLiquidacion');
    listaDias.innerHTML = '';
    
    // Clear total and enable/disable button
    document.getElementById('totalDiasSeleccionados').textContent = '0';
    document.getElementById('guardarLiquidacion').disabled = true;
    document.getElementById('notaLiquidacion').value = '';


    if (!operarioId) {
        listaDias.innerHTML = '<p>Seleccione un operario para ver los días pendientes de liquidar.</p>';
        return;
    }

    const diasPendientes = obtenerDiasTrabajadosNoLiquidados(operarioId);
    
    if (diasPendientes.length === 0) {
        listaDias.innerHTML = '<p>No hay días pendientes de liquidar para este operario.</p>';
        return;
    }

    let html = '<div class="list-container">';
    diasPendientes.forEach(dia => {
        html += `
            <label class="list-item liquidacion-item">
                <input type="checkbox" class="dia-liquidacion-checkbox" value="${dia.listId}" 
                       data-date="${dia.fecha}" data-part-ids="${dia.parteIds.join(',')}"
                       onchange="actualizarTotalLiquidacion()">
                <div class="list-item-info" style="flex: 1; display: block; padding-left: 10px;">
                    <strong>Fecha:</strong> ${new Date(dia.fecha).toLocaleDateString()}
                    <br>
                    <small>Horas: ${dia.totalHoras.toFixed(2)} | Gastos: ${dia.totalGastos.toFixed(2)} €</small>
                </div>
            </label>
        `;
    });
    html += '</div>';
    listaDias.innerHTML = html;
}

function actualizarTotalLiquidacion() {
    const checkboxes = document.querySelectorAll('#sectionLiquidacion .dia-liquidacion-checkbox:checked');
    const totalDias = checkboxes.length;
    document.getElementById('totalDiasSeleccionados').textContent = totalDias;
    
    const btnGuardar = document.getElementById('guardarLiquidacion');
    btnGuardar.disabled = totalDias === 0;
}


function guardarLiquidacion() {
    const operarioId = document.getElementById('operarioLiquidacion').value;
    const nota = document.getElementById('notaLiquidacion').value.trim();
    const checkboxes = document.querySelectorAll('#sectionLiquidacion .dia-liquidacion-checkbox:checked');
    const fechaLiquidacion = new Date().toISOString().split('T')[0];

    if (!operarioId || checkboxes.length === 0) {
        mostrarMensaje('Debe seleccionar un operario y al menos un día para liquidar.');
        return;
    }

    const parteIdsToLiquidate = [];
    let diasLiquidados = 0;
    
    checkboxes.forEach(checkbox => {
        const ids = checkbox.dataset.partIds.split(',');
        parteIdsToLiquidate.push(...ids);
        diasLiquidados++;
    });
    
    // Ensure all IDs are unique 
    const uniqueParteIds = [...new Set(parteIdsToLiquidate)];

    if (uniqueParteIds.length === 0) {
        mostrarMensaje('No se encontraron partes válidos para liquidar.');
        return;
    }

    // Update partesDiarios
    datos.partesDiarios = datos.partesDiarios.map(parte => {
        // We ensure we only modify parts belonging to the current operario and which are in the selection list
        if (uniqueParteIds.includes(parte.id) && parte.operarioId === operarioId && !parte.liquidado) {
            return {
                ...parte,
                liquidado: true,
                notaLiquidacion: nota,
                fechaLiquidacion: fechaLiquidacion
            };
        }
        return parte;
    });

    guardarDatos();
    actualizarListaDiasParaLiquidacion();
    mostrarMensaje(`Liquidación realizada: ${diasLiquidados} día(s) que incluyen ${uniqueParteIds.length} partes diarios.`, 'success');
    
    // Clear note
    document.getElementById('notaLiquidacion').value = '';
}

// Función para generar un resumen de obra
function generarResumen() {
    const clienteId = document.getElementById('clienteResumen').value;
    const obraId = document.getElementById('obraResumen').value;

    if (!obraId) {
        mostrarMensaje('Debe seleccionar una obra para generar el resumen');
        document.getElementById('contenidoResumen').style.display = 'none'; // Ocultar si no hay obra
        return;
    }

    const obra = datos.obras.find(o => o.id === obraId);
    if (!obra) {
        mostrarMensaje('La obra seleccionada no existe');
        document.getElementById('contenidoResumen').style.display = 'none';
        return;
    }

    const cliente = datos.clientes.find(c => c.id === obra.clienteId);
    const partesFiltrados = datos.partesDiarios.filter(parte => parte.obraId === obraId);

    // Calcular totales
    let totalHoras = 0;
    let totalGastos = 0;

    partesFiltrados.forEach(parte => {
        totalHoras += parte.horas || 0;
        totalGastos += parte.gasto || 0;
    });

    // Agrupar partes por fecha
    const partesPorFecha = {};
    partesFiltrados.forEach(parte => {
        if (!partesPorFecha[parte.fecha]) {
            partesPorFecha[parte.fecha] = [];
        }
        partesPorFecha[parte.fecha].push(parte);
    });

    // Ordenar fechas
    const fechasOrdenadas = Object.keys(partesPorFecha).sort((a, b) => {
        return new Date(a) - new Date(b);
    });

    // Mostrar información de la obra
    document.getElementById('infoObra').innerHTML = `
        <p><strong>Número:</strong> ${obra.numero}</p>
        <p><strong>Nombre:</strong> ${obra.nombre}</p>
        <p><strong>Cliente:</strong> ${cliente ? cliente.nombre : 'Cliente desconocido'}</p>
        <p><strong>Fecha de creación:</strong> ${new Date(obra.fechaCreacion).toLocaleDateString()}</p>
    `;

    // Mostrar resumen de horas y gastos
    document.getElementById('resumenHoras').innerHTML = `
        <p><strong>Total horas:</strong> ${totalHoras.toFixed(2)}</p>
    `;

    document.getElementById('resumenGastos').innerHTML = `
        <p><strong>Total gastos:</strong> ${totalGastos.toFixed(2)} €</p>
    `;
    // El "Total General" en el resumen debe ser solo de gastos si no hay precio por hora definido
    document.getElementById('resumenTotal').innerHTML = `
        <h3>Total General: ${ (totalGastos).toFixed(2) } €</h3>
    `;

    // Detalles por fecha
    const detallePartes = document.getElementById('detallePartes');
    detallePartes.innerHTML = '';

    if (fechasOrdenadas.length === 0) {
        detallePartes.innerHTML = '<p>No hay partes diarios registrados para esta obra.</p>';
    } else {
        fechasOrdenadas.forEach(fecha => {
            const partesFecha = partesPorFecha[fecha];
            const seccionFecha = document.createElement('div');
            seccionFecha.className = 'detalle-fecha';

            // Calcular totales por fecha
            let horasFecha = 0;
            let gastosFecha = 0;

            partesFecha.forEach(parte => {
                horasFecha += parte.horas || 0;
                gastosFecha += parte.gasto || 0;
            });

            let contenidoHTML = `
                <h4>Fecha: ${new Date(fecha).toLocaleDateString()}</h4>
                <p><strong>Horas:</strong> ${horasFecha.toFixed(2)} | <strong>Gastos:</strong> ${gastosFecha.toFixed(2)} €</p>
                <table>
                    <thead>
                        <tr>
                            <th>Operario</th>
                            <th>Horas</th>
                            <th>Descripción</th>
                            <th>Gastos</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            partesFecha.forEach(parte => {
                const operario = datos.operarios.find(o => o.id === parte.operarioId);
                const proveedor = parte.proveedorId ? datos.proveedores.find(p => p.id === parte.proveedorId) : null;

                contenidoHTML += `
                    <tr>
                        <td>${operario ? operario.nombre : 'Operario desconocido'}</td>
                        <td>${parte.horas.toFixed(2)}</td>
                        <td>${parte.descripcion}</td>
                        <td>${parte.gasto > 0 ? `${parte.gasto.toFixed(2)} € (${proveedor ? proveedor.nombre : 'Desconocido'})` : '-'}</td>
                    </tr>
                `;
            });

            contenidoHTML += `
                    </tbody>
                </table>
            `;

            seccionFecha.innerHTML = contenidoHTML;
            detallePartes.appendChild(seccionFecha);
        });
    }

    // Mostrar el contenedor de resumen
    document.getElementById('contenidoResumen').style.display = 'block';
}

// Función para generar PDF con el resumen
async function imprimirResumen() {
    const { jsPDF } = window.jspdf;

    const obraId = document.getElementById('obraResumen').value;
    if (!obraId) {
        mostrarMensaje('Debe seleccionar una obra para imprimir el resumen.');
        return;
    }

    const obra = datos.obras.find(o => o.id === obraId);
    if (!obra) {
        mostrarMensaje('La obra seleccionada no existe para imprimir.');
        return;
    }

    const cliente = datos.clientes.find(c => c.id === obra.clienteId);
    const partesFiltrados = datos.partesDiarios.filter(parte => parte.obraId === obraId).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const doc = new jsPDF();
    let y = 15;

    // Título
    doc.setFontSize(18);
    doc.text('Resumen de Obra', 105, y, { align: 'center' });
    y += 10;

    // Información de la obra
    doc.setFontSize(12);
    doc.text(`Número: ${obra.numero}`, 20, y);
    y += 7;
    doc.text(`Nombre: ${obra.nombre}`, 20, y);
    y += 7;
    doc.text(`Cliente: ${cliente ? cliente.nombre : 'Cliente desconocido'}`, 20, y);
    y += 7;
    doc.text(`Fecha de creación: ${new Date(obra.fechaCreacion).toLocaleDateString()}`, 20, y);
    y += 15;

    // Resumen de horas y gastos
    let totalHoras = 0;
    let totalGastos = 0;
    partesFiltrados.forEach(parte => {
        totalHoras += parte.horas || 0;
        totalGastos += parte.gasto || 0;
    });

    doc.text(`Total horas: ${totalHoras.toFixed(2)}`, 20, y);
    y += 7;
    doc.text(`Total gastos: ${totalGastos.toFixed(2)} €`, 20, y);
    y += 7;
    doc.setFontSize(14);
    doc.text(`Total General: ${ (totalGastos).toFixed(2) } €`, 20, y);
    doc.setFontSize(12);
    y += 15;

    // Detalles por fecha
    const partesPorFecha = {};
    partesFiltrados.forEach(parte => {
        if (!partesPorFecha[parte.fecha]) {
            partesPorFecha[parte.fecha] = [];
        }
        partesPorFecha[parte.fecha].push(parte);
    });

    const fechasOrdenadas = Object.keys(partesPorFecha).sort((a, b) => new Date(a) - new Date(b));

    if (fechasOrdenadas.length === 0) {
        doc.text('No hay partes diarios registrados para esta obra.', 20, y);
        y += 10;
    } else {
        for (const fecha of fechasOrdenadas) {
            const partesFecha = partesPorFecha[fecha];
            const horasFecha = partesFecha.reduce((sum, p) => sum + (p.horas || 0), 0);
            const gastosFecha = partesFecha.reduce((sum, p) => sum + (p.gasto || 0), 0);

            if (y > 250) { // Check if new page is needed before adding new date section
                doc.addPage();
                y = 15;
            }

            doc.setFontSize(12);
            doc.text(`Fecha: ${new Date(fecha).toLocaleDateString()}`, 20, y);
            y += 7;
            doc.text(`Horas: ${horasFecha.toFixed(2)} | Gastos: ${gastosFecha.toFixed(2)} €`, 20, y);
            y += 7;

            const headers = [['Operario', 'Horas', 'Descripción', 'Gastos (Proveedor / Doc / Paga)']];
            const data = partesFecha.map(parte => {
                const operario = datos.operarios.find(o => o.id === parte.operarioId);
                const proveedor = parte.proveedorId ? datos.proveedores.find(p => p.id === parte.proveedorId) : null;
                const operarioPaga = parte.operarioPagaId ? datos.operarios.find(o => o.id === parte.operarioPagaId) : null;
                const documentoGasto = parte.documentoGasto || 'N/A';
                
                const gastoDetail = parte.gasto > 0 ? 
                    `${parte.gasto.toFixed(2)} € (${proveedor ? proveedor.nombre : 'Desconocido'})\nDoc: ${documentoGasto}, Paga: ${operarioPaga ? operarioPaga.nombre : 'Nadie'}` 
                    : '-';
                
                return [
                    operario ? operario.nombre : 'Desconocido',
                    parte.horas.toFixed(2),
                    parte.descripcion,
                    gastoDetail
                ];
            });

            await doc.autoTable({
                startY: y,
                head: headers,
                body: data,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
                margin: { left: 15, right: 15 },
                didDrawPage: function(data) {
                    y = data.cursor.y; // Update y position for the next content
                }
            });
            y = doc.autoTable.previous.finalY + 10; // Update y to be below the table, plus some margin
        }
    }

    doc.save(`Resumen_Obra_${obra.numero}.pdf`);
    mostrarMensaje('Resumen PDF generado correctamente', 'success');
}

// Función para mostrar la visualización completa de la obra
function visualizarCompleto() {
    const obraId = document.getElementById('obraResumen').value;
    if (!obraId) {
        mostrarMensaje('Debe seleccionar una obra para visualizar la información completa.');
        return;
    }

    const obra = datos.obras.find(o => o.id === obraId);
    if (!obra) {
        mostrarMensaje('La obra seleccionada no existe para visualizar.');
        return;
    }

    const cliente = datos.clientes.find(c => c.id === obra.clienteId);
    const partesFiltrados = datos.partesDiarios.filter(parte => parte.obraId === obraId);

    // Ordenar partes por fecha
    partesFiltrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let contenidoHTML = `
        <div class="visualizacion-info">
            <h3>Información de la Obra</h3>
            <p><strong>Número:</strong> ${obra.numero}</p>
            <p><strong>Nombre:</strong> ${obra.nombre}</p>
            <p><strong>Cliente:</strong> ${cliente ? cliente.nombre : 'Cliente desconocido'}</p>
            <p><strong>Fecha de creación:</strong> ${new Date(obra.fechaCreacion).toLocaleDateString()}</p>
        </div>

        <div class="visualizacion-partes">
            <h3>Partes Diarios</h3>
    `;

    if (partesFiltrados.length === 0) {
        contenidoHTML += '<p>No hay partes diarios registrados para esta obra.</p>';
    } else {
        partesFiltrados.forEach(parte => {
            const operario = datos.operarios.find(o => o.id === parte.operarioId);
            const proveedor = parte.proveedorId ? datos.proveedores.find(p => p.id === parte.proveedorId) : null;

            contenidoHTML += `
                <div class="visualizacion-parte">
                    <h4>Fecha: ${new Date(parte.fecha).toLocaleDateString()}</h4>
                    <p><strong>Operario:</strong> ${operario ? operario.nombre : 'Operario desconocido'}</p>
                    <p><strong>Horas:</strong> ${parte.horas.toFixed(2)}</p>
                    <p><strong>Descripción:</strong> ${parte.descripcion}</p>
            `;

            // Mostrar fotos si hay
            if (parte.fotos && parte.fotos.length > 0) {
                contenidoHTML += `
                    <div class="visualizacion-fotos">
                        <h5>Fotografías:</h5>
                `;
                parte.fotos.forEach(foto => {
                    contenidoHTML += `<img src="${foto}" alt="Foto" class="photo-thumbnail-large">`; // Use class for styling
                });
                contenidoHTML += `</div>`;
            }

            // Mostrar información de gastos si hay
            if (parte.proveedorId && parte.gasto > 0) {
                contenidoHTML += `
                    <div class="visualizacion-gasto">
                        <h5>Gasto:</h5>
                        <p><strong>Proveedor:</strong> ${proveedor ? proveedor.nombre : 'Desconocido'}</p>
                        <p><strong>Importe:</strong> ${parte.gasto.toFixed(2)} €</p>
                `;
                if (parte.fotoGasto) {
                    contenidoHTML += `<img src="${parte.fotoGasto}" alt="Comprobante" class="photo-thumbnail-large">`; // Use class for styling
                }
                contenidoHTML += `</div>`;
            }

            contenidoHTML += `</div>`;
        });
    }

    contenidoHTML += `</div>`;

    // Mostrar el contenido en el modal
    document.getElementById('contenidoCompleto').innerHTML = contenidoHTML;
    document.getElementById('visualizacionCompleta').style.display = 'block';
}

function obtenerLiquidacionesHistoricas(operarioId, fechaInicio, fechaFin) {
    let partesLiquidados = datos.partesDiarios.filter(p => p.liquidado);

    if (operarioId) {
        partesLiquidados = partesLiquidados.filter(p => p.operarioId === operarioId);
    }

    // Group parts by liquidation date (fechaLiquidacion) and operario
    const liquidacionesAgrupadas = partesLiquidados.reduce((acc, parte) => {
        // Ensure parte.fechaLiquidacion exists, though it should if liquidado=true
        if (!parte.fechaLiquidacion) return acc;
        
        // Use ISO date string for grouping key since multiple liquidations can happen on the same calendar day but at different times (if date includes time, but here it's just date)
        const key = `${parte.operarioId}_${parte.fechaLiquidacion}`;
        
        // Apply date filtering based on liquidation date
        const liquidacionDate = new Date(parte.fechaLiquidacion);
        
        let shouldInclude = true;
        if (fechaInicio) {
            const start = new Date(fechaInicio);
            start.setHours(0, 0, 0, 0); 
            if (liquidacionDate < start) shouldInclude = false;
        }
        if (fechaFin) {
            const end = new Date(fechaFin);
            end.setHours(23, 59, 59, 999); 
            if (liquidacionDate > end) shouldInclude = false;
        }
        
        if (!shouldInclude) return acc;

        if (!acc[key]) {
            // Note: We assume that all parts marked as liquidated on the same day for the same operario
            // share the same note/liquidation event, as liquidación happens per batch/day click.
            acc[key] = {
                operarioId: parte.operarioId,
                fechaLiquidacion: parte.fechaLiquidacion,
                notaLiquidacion: parte.notaLiquidacion,
                diasLiquidados: new Set(),
                partes: []
            };
        }
        acc[key].diasLiquidados.add(parte.fecha); // Date part was worked
        acc[key].partes.push(parte);
        return acc;
    }, {});
    
    // Convert to array and calculate totals
    return Object.values(liquidacionesAgrupadas).map(liquidacion => {
        const totalHoras = liquidacion.partes.reduce((sum, p) => sum + p.horas, 0);
        const totalGastos = liquidacion.partes.reduce((sum, p) => sum + p.gasto, 0);
        
        return {
            ...liquidacion,
            totalHoras: totalHoras,
            totalGastos: totalGastos,
            numDias: liquidacion.diasLiquidados.size
        };
    }).sort((a, b) => new Date(b.fechaLiquidacion) - new Date(a.fechaLiquidacion)); // Order by liquidation date DESC
}

function actualizarListaLiquidacionesHistoricas() {
    const operarioId = document.getElementById('filtroOperarioLiquidado').value;
    const fechaInicio = document.getElementById('filtroFechaInicioLiquidado').value;
    const fechaFin = document.getElementById('filtroFechaFinLiquidado').value;
    const lista = document.getElementById('listaLiquidacionesHistoricas');
    lista.innerHTML = '';
    
    const liquidaciones = obtenerLiquidacionesHistoricas(operarioId, fechaInicio, fechaFin);

    if (liquidaciones.length === 0) {
        lista.innerHTML = '<p>No se encontraron liquidaciones históricas con los filtros aplicados.</p>';
        return;
    }

    const operarioMap = new Map(datos.operarios.map(op => [op.id, op.nombre]));

    let html = '<div class="list-container">';
    liquidaciones.forEach((liq, index) => {
        const operarioNombre = operarioMap.get(liq.operarioId) || 'Operario Desconocido';
        
        html += `
            <div class="list-item" style="flex-direction: column; align-items: flex-start;">
                <div class="list-item-info" style="width: 100%;">
                    <strong>Liquidación (${operarioNombre})</strong>
                    <br>
                    <small><strong>Fecha de Pago:</strong> ${new Date(liq.fechaLiquidacion).toLocaleDateString()}</small>
                    <br>
                    <small>Días trabajados liquidados: ${liq.numDias} día(s)</small>
                    <br>
                    <small><strong>Total Horas:</strong> ${liq.totalHoras.toFixed(2)} | <strong>Total Gastos:</strong> ${liq.totalGastos.toFixed(2)} €</small>
                    ${liq.notaLiquidacion ? `<br><small><strong>Nota:</strong> ${liq.notaLiquidacion}</small>` : ''}
                </div>
                <div class="list-item-actions" style="margin-top: 10px;">
                     <button class="btn-icon" title="Ver Partes del Pago" onclick="mostrarDetallesLiquidacion('${liq.operarioId}', '${liq.fechaLiquidacion}')">📋 Detalles</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    lista.innerHTML = html;
}

function mostrarDetallesLiquidacion(operarioId, fechaLiquidacion) {
    // Retrieve the specific liquidation record
    const liquidaciones = obtenerLiquidacionesHistoricas(operarioId, fechaLiquidacion, fechaLiquidacion);
    const liq = liquidaciones.find(l => l.operarioId === operarioId && l.fechaLiquidacion === fechaLiquidacion);

    if (!liq) {
        mostrarMensaje('Error al cargar detalles de la liquidación.');
        return;
    }
    
    const operarioNombre = datos.operarios.find(o => o.id === liq.operarioId)?.nombre || 'Desconocido';
    
    let htmlContenido = `
        <h3>Detalle de Liquidación (${operarioNombre})</h3>
        <p><strong>Fecha de Liquidación:</strong> ${new Date(liq.fechaLiquidacion).toLocaleDateString()}</p>
        <p><strong>Días trabajados incluidos:</strong> ${liq.numDias}</p>
        <p><strong>Total Horas:</strong> ${liq.totalHoras.toFixed(2)} | <strong>Total Gastos:</strong> ${liq.totalGastos.toFixed(2)} €</p>
        ${liq.notaLiquidacion ? `<p><strong>Nota:</strong> ${liq.notaLiquidacion}</p>` : ''}
        
        <div class="visualizacion-partes">
            <h4>Partes Diarios incluidos:</h4>
    `;

    // Sort parts by date worked
    liq.partes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    liq.partes.forEach(parte => {
        const obra = datos.obras.find(o => o.id === parte.obraId);
        const proveedor = parte.proveedorId ? datos.proveedores.find(p => p.id === parte.proveedorId) : null;
        
        htmlContenido += `
            <div class="visualizacion-parte">
                <h5>${new Date(parte.fecha).toLocaleDateString()} - ${obra ? obra.nombre : 'Obra desconocida'}</h5>
                <p>Horas: ${parte.horas.toFixed(2)}</p>
                <p>Descripción: ${parte.descripcion}</p>
                ${parte.gasto > 0 ? `<p>Gasto: ${parte.gasto.toFixed(2)} € (${proveedor ? proveedor.nombre : 'Prov. desconocido'})</p>` : ''}
            </div>
        `;
    });
    
    htmlContenido += '</div>';

    // Usar el modal existente 'visualizacionCompleta' para mostrar detalles
    document.getElementById('contenidoCompleto').innerHTML = htmlContenido;
    document.getElementById('visualizacionCompleta').style.display = 'block';
}


// Setup functions for the modal
function configurarFiltrosLiquidacionHistorica() {
    const selectorOperario = document.getElementById('filtroOperarioLiquidado');
    const valorActual = selectorOperario.value;
    
    selectorOperario.innerHTML = '<option value="">Todos los operarios</option>';
    
    const operariosConLiquidacion = [...new Set(datos.partesDiarios
        .filter(p => p.liquidado)
        .map(p => p.operarioId))];
        
    const sortedOperarios = datos.operarios
        .filter(op => operariosConLiquidacion.includes(op.id))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    sortedOperarios.forEach(operario => {
        const option = document.createElement('option');
        option.value = operario.id;
        option.textContent = operario.nombre;
        selectorOperario.appendChild(option);
    });

    if (valorActual && operariosConLiquidacion.includes(valorActual)) {
        selectorOperario.value = valorActual;
    } else {
        selectorOperario.value = '';
    }
}

function abrirModalLiquidaciones() {
    configurarFiltrosLiquidacionHistorica();
    actualizarListaLiquidacionesHistoricas();
    document.getElementById('visualizacionLiquidaciones').style.display = 'block';
}

function aplicarFiltroLiquidado() {
    actualizarListaLiquidacionesHistoricas();
}

// === Funciones para Pagos a Cuenta ===

function guardarPagoAcuenta() {
    const obraId = document.getElementById('obraPagoAcuenta').value;
    const fecha = document.getElementById('fechaPagoAcuenta').value;
    const monto = parseFloat(document.getElementById('montoPagoAcuenta').value);
    const documento = document.getElementById('documentoPagoAcuenta').value.trim();

    if (!obraId || !fecha || isNaN(monto) || monto <= 0) {
        mostrarMensaje('Debe completar Obra, Fecha y Monto válidos para registrar el pago a cuenta.', 'error');
        return;
    }
    
    // Check if obra exists
    if (!datos.obras.some(o => o.id === obraId)) {
        mostrarMensaje('La obra seleccionada no es válida.', 'error');
        return;
    }

    const pago = {
        id: Date.now().toString(),
        obraId,
        fecha,
        monto,
        documento
    };

    datos.pagosAcuenta.push(pago);
    guardarDatos();
    
    // Clear form
    document.getElementById('obraPagoAcuenta').value = '';
    document.getElementById('fechaPagoAcuenta').value = new Date().toISOString().split('T')[0];
    document.getElementById('montoPagoAcuenta').value = '';
    document.getElementById('documentoPagoAcuenta').value = '';

    actualizarListaPagosAcuenta();
    mostrarMensaje('Pago a cuenta registrado correctamente', 'success');
}

function actualizarListaPagosAcuenta() {
    const lista = document.getElementById('listaPagosAcuenta');
    const filtroObraId = document.getElementById('filtroObraPagosAcuenta')?.value;

    if (!lista) return;

    let pagosFiltrados = datos.pagosAcuenta;
    if (filtroObraId) {
        pagosFiltrados = pagosFiltrados.filter(p => p.obraId === filtroObraId);
    }
    
    lista.innerHTML = '';
    
    if (pagosFiltrados.length === 0) {
        lista.innerHTML = '<p>No hay pagos a cuenta registrados con los filtros aplicados.</p>';
        return;
    }

    // Sort by date DESC
    const sortedPagos = [...pagosFiltrados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    const obraMap = new Map(datos.obras.map(o => [o.id, o]));

    let html = '<div class="list-container">';
    sortedPagos.forEach(pago => {
        const obra = obraMap.get(pago.obraId);
        const obraInfo = obra ? `${obra.numero} - ${obra.nombre}` : 'Obra desconocida';
        
        html += `
            <div class="list-item">
                <div class="list-item-info">
                    <strong>${pago.monto.toFixed(2)} €</strong> (Obra: ${obraInfo})
                    <br>
                    <small>Fecha: ${new Date(pago.fecha).toLocaleDateString()} | Doc: ${pago.documento || 'N/A'}</small>
                </div>
                <div class="list-item-actions">
                    <button class="btn-icon" title="Eliminar" onclick="eliminarPagoAcuenta('${pago.id}')">🗑️</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    lista.innerHTML = html;
}

function eliminarPagoAcuenta(pagoId) {
    if (confirm('¿Está seguro de que desea eliminar este pago a cuenta?')) {
        datos.pagosAcuenta = datos.pagosAcuenta.filter(p => p.id !== pagoId);
        guardarDatos();
        actualizarListaPagosAcuenta();
        mostrarMensaje('Pago a cuenta eliminado correctamente', 'success');
    }
}


// === Funciones para Gastos Generales (PB) ===

function obtenerPagosPBFiltrados(fechaInicio, fechaFin) {
    let pagosFiltrados = datos.pagosPB;

    if (fechaInicio) {
        const start = new Date(fechaInicio + 'T00:00:00');
        pagosFiltrados = pagosFiltrados.filter(p => new Date(p.fecha + 'T00:00:00') >= start);
    }
    if (fechaFin) {
        const end = new Date(fechaFin + 'T23:59:59');
        pagosFiltrados = pagosFiltrados.filter(p => new Date(p.fecha + 'T00:00:00') <= end);
    }
    
    return pagosFiltrados;
}

function actualizarResumenYListaPagosPB(filtroAplicado = false) {
    const lista = document.getElementById('listaPagosPB');
    const resumenContainer = document.getElementById('resumenTotalesPB');
    const fechaInicio = document.getElementById('filtroFechaInicioPB')?.value;
    const fechaFin = document.getElementById('filtroFechaFinPB')?.value;
    
    // Determine filters
    const filteredPagos = filtroAplicado 
        ? obtenerPagosPBFiltrados(fechaInicio, fechaFin) 
        : datos.pagosPB;

    // --- 1. Update Totals Summary ---
    let totalPB = filteredPagos.reduce((sum, p) => sum + p.precio, 0);
    
    let filtroTexto = filtroAplicado ? 
        ` (Filtro: ${fechaInicio || 'Inicio'} a ${fechaFin || 'Fin'})` : 
        ' (Total Histórico)';

    if (resumenContainer) {
        resumenContainer.innerHTML = `
            <div style="padding: 1rem; background-color: #f0f8ff; border-left: 3px solid #3498db; border-radius: 4px;">
                <p><strong>Total Gastos Generales (PB) ${filtroTexto}:</strong> 
                <span style="font-weight: bold; font-size: 1.1em; color: #e74c3c;">${totalPB.toFixed(2)} €</span></p>
            </div>
        `;
    }

    // --- 2. Update Detailed List ---
    if (!lista) return;

    lista.innerHTML = '';
    
    if (filteredPagos.length === 0) {
        lista.innerHTML = '<p>No hay gastos generales (PB) registrados con los filtros aplicados.</p>';
        return;
    }

    // Sort by date DESC
    const sortedPagos = [...filteredPagos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let html = '<div class="list-container">';
    sortedPagos.forEach(pago => {
        
        html += `
            <div class="list-item">
                <div class="list-item-info">
                    <strong>${pago.precio.toFixed(2)} €</strong> (${pago.concepto.substring(0, 50)}${pago.concepto.length > 50 ? '...' : ''})
                    <br>
                    <small>Fecha: ${new Date(pago.fecha).toLocaleDateString()}</small>
                </div>
                <div class="list-item-actions">
                    <button class="btn-icon" title="Eliminar" onclick="eliminarPagoPB('${pago.id}')">🗑️</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    lista.innerHTML = html;
}

function mostrarResumenPB() {
    // Triggered by the button, always applies filters
    actualizarResumenYListaPagosPB(true);
}

function limpiarFiltroPB() {
    document.getElementById('filtroFechaInicioPB').value = '';
    document.getElementById('filtroFechaFinPB').value = '';
    // Show total historic view after cleaning filters
    actualizarResumenYListaPagosPB(false);
}

function guardarPagoPB() {
    const fecha = document.getElementById('fechaPagoPB').value;
    const concepto = document.getElementById('conceptoPagoPB').value.trim();
    const precio = parseFloat(document.getElementById('precioPagoPB').value);

    if (!fecha || !concepto || isNaN(precio) || precio <= 0) {
        mostrarMensaje('Debe completar Fecha, Concepto y Precio válidos para registrar el gasto general.', 'error');
        return;
    }

    const pago = {
        id: Date.now().toString(),
        fecha,
        concepto,
        precio
    };

    datos.pagosPB.push(pago);
    guardarDatos();
    
    // Clear form
    document.getElementById('fechaPagoPB').value = new Date().toISOString().split('T')[0];
    document.getElementById('conceptoPagoPB').value = '';
    document.getElementById('precioPagoPB').value = '';

    // Show historic view after saving
    actualizarResumenYListaPagosPB(false); 
    mostrarMensaje('Gasto general (PB) registrado correctamente', 'success');
}

function eliminarPagoPB(pagoId) {
    if (confirm('¿Está seguro de que desea eliminar este gasto general (PB)?')) {
        datos.pagosPB = datos.pagosPB.filter(p => p.id !== pagoId);
        guardarDatos();
        // Recargar la lista y resumen, checking if filters are active
        const isFiltered = document.getElementById('filtroFechaInicioPB')?.value || document.getElementById('filtroFechaFinPB')?.value;
        actualizarResumenYListaPagosPB(!!isFiltered);
        mostrarMensaje('Gasto general (PB) eliminado correctamente', 'success');
    }
}

// === Funciones de Resumen de Pagos ===

function actualizarResumenPagos() {
    const resumenTotales = document.getElementById('resumenTotalesPagos');
    const listaTodosPagos = document.getElementById('listaTodosLosPagos');
    
    let totalAcuenta = datos.pagosAcuenta.reduce((sum, p) => sum + p.monto, 0);
    let totalPB = datos.pagosPB.reduce((sum, p) => sum + p.precio, 0);
    let totalGeneral = totalAcuenta + totalPB;

    resumenTotales.innerHTML = `
        <div style="padding: 1rem; background-color: #ecf0f1; border-radius: 4px; margin-bottom: 1rem;">
            <p><strong>Total Pagos a Cuenta (Obras):</strong> ${totalAcuenta.toFixed(2)} €</p>
            <p><strong>Total Gastos Generales (PB):</strong> ${totalPB.toFixed(2)} €</p>
            <hr style="margin: 10px 0; border-color: #bdc3c7;">
            <p style="font-size: 1.1rem;"><strong>TOTAL REGISTRADO:</strong> <span style="font-size: 1.2em; color: #3498db;">${totalGeneral.toFixed(2)} €</span></p>
        </div>
    `;
    
    // Combine and sort all payments for detailed list
    const obraMap = new Map(datos.obras.map(o => [o.id, o]));
    
    const todosLosPagos = [
        ...datos.pagosAcuenta.map(p => ({
            ...p, 
            tipo: 'A Cuenta', 
            montoDisplay: p.monto, 
            detalle: obraMap.get(p.obraId)?.nombre || 'Obra desconocida',
            identificador: p.documento || 'N/A'
        })),
        ...datos.pagosPB.map(p => ({
            ...p, 
            tipo: 'Gasto PB', 
            montoDisplay: p.precio, 
            detalle: p.concepto,
            identificador: 'N/A'
        }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (todosLosPagos.length === 0) {
        listaTodosLosPagos.innerHTML = '<p>No se han registrado pagos.</p>';
        return;
    }
    
    let html = '<div class="list-container">';
    todosLosPagos.forEach(pago => {
        html += `
            <div class="list-item" style="border-left: 5px solid ${pago.tipo === 'A Cuenta' ? '#2ecc71' : '#f1c40f'};">
                <div class="list-item-info">
                    <strong>${pago.montoDisplay.toFixed(2)} €</strong> (${pago.tipo})
                    <br>
                    <small>Fecha: ${new Date(pago.fecha).toLocaleDateString()} | ${pago.detalle.substring(0, 80)}${pago.detalle.length > 80 ? '...' : ''}</small>
                </div>
            </div>
        `;
    });
    html += '</div>';
    listaTodosLosPagos.innerHTML = html;
}

// Function to handle tab switching in sectionPagos
function switchPagoTab(targetId) {
    document.querySelectorAll('#sectionPagos .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('#sectionPagos .tab-button').forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(targetId).classList.add('active');
    document.querySelector(`[data-target="${targetId}"]`).classList.add('active');
    
    // Refresh lists on tab switch
    if (targetId === 'tabPagosAcuenta') {
        actualizarListaPagosAcuenta();
    } else if (targetId === 'tabPagosPB') {
        // Ensure default date is set when opening the PB tab
        if (!document.getElementById('fechaPagoPB').value) {
            document.getElementById('fechaPagoPB').value = new Date().toISOString().split('T')[0];
        }
        // Load historic view (no filter applied initially)
        actualizarResumenYListaPagosPB(false); 
    } else if (targetId === 'tabResumenPagos') {
        actualizarResumenPagos();
    }
}


function limpiarFiltroLiquidado() {
    document.getElementById('filtroOperarioLiquidado').value = '';
    document.getElementById('filtroFechaInicioLiquidado').value = '';
    document.getElementById('filtroFechaFinLiquidado').value = '';
    actualizarListaLiquidacionesHistoricas();
}


// Actualizar todas las listas y selectores
function actualizarListasYSelectores() {
    actualizarListaClientes();
    actualizarListaObras();
    actualizarListaOperarios();
    actualizarListaProveedores();
    actualizarSelectoresClientes();
    actualizarSelectoresObras();
    actualizarSelectoresOperarios();
    actualizarSelectoresProveedores();
    actualizarSelectoresFiltroVerPartes(); // Asegurarse de que los filtros de Ver Partes también se actualicen
}

// Event listeners para vista previa de imágenes
document.getElementById('fotosParte').addEventListener('change', function(e) {
    const previewContainer = document.getElementById('previewFotos');
    previewContainer.innerHTML = '';

    if (this.files.length > 0) {
        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                mostrarMensaje(`La imagen ${file.name} es demasiado grande. Máximo 2MB.`, 'error');
                continue;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'photo-thumbnail';
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    }
});

document.getElementById('fotoGasto').addEventListener('change', function(e) {
    const previewContainer = document.getElementById('previewGasto');
    previewContainer.innerHTML = '';

    if (this.files.length > 0) {
        const file = this.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            mostrarMensaje(`La imagen ${file.name} es demasiado grande. Máximo 2MB.`, 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'photo-thumbnail';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
});

// Event listener para el selector de cliente en el resumen
document.getElementById('clienteResumen').addEventListener('change', function() {
    const clienteId = this.value;
    const selectorObra = document.getElementById('obraResumen');

    const valorActualObra = selectorObra.value; // Guardar el valor actual para intentar restaurarlo
    selectorObra.innerHTML = '<option value="">Seleccionar obra</option>';

    let obrasFiltradas = [];
    if (clienteId) {
        obrasFiltradas = datos.obras.filter(obra => obra.clienteId === clienteId);
    } else {
        obrasFiltradas = datos.obras; // Si no hay cliente seleccionado, mostrar todas las obras
    }

    // Sort works alphabetically by name
    const sortedObras = [...obrasFiltradas].sort((a, b) => a.nombre.localeCompare(b.nombre));

    sortedObras.forEach(obra => {
        const cliente = datos.clientes.find(c => c.id === obra.clienteId);
        const clienteNombre = cliente ? cliente.nombre : 'Cliente desconocido';

        const option = document.createElement('option');
        option.value = obra.id;
        option.textContent = `${obra.numero} - ${obra.nombre} (${clienteNombre})`;
        selectorObra.appendChild(option);
    });

    // Intentar restaurar la obra seleccionada si sigue siendo válida
    if (valorActualObra && obrasFiltradas.some(o => o.id === valorActualObra)) {
        selectorObra.value = valorActualObra;
    } else {
        selectorObra.value = '';
    }

    // Ocultar el contenido del resumen al cambiar el cliente
    document.getElementById('contenidoResumen').style.display = 'none';
});

// Event listener para el selector de obra en el resumen
document.getElementById('obraResumen').addEventListener('change', function() {
    // Ocultar el contenido del resumen al cambiar la obra
    document.getElementById('contenidoResumen').style.display = 'none';
});

// Event listener para cerrar el modal
document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('visualizacionCompleta').style.display = 'none';
    document.getElementById('contenidoCompleto').innerHTML = ''; // Limpiar el contenido al cerrar
});

// Event listener para cerrar el nuevo modal de liquidaciones
document.querySelector('.close-liquidaciones').addEventListener('click', function() {
    document.getElementById('visualizacionLiquidaciones').style.display = 'none';
    document.getElementById('listaLiquidacionesHistoricas').innerHTML = '';
});

// Event listeners para filtros de Ver Partes
document.getElementById('aplicarFiltroVerPartes').addEventListener('click', aplicarFiltroVerPartes);
document.getElementById('limpiarFiltroVerPartes').addEventListener('click', limpiarFiltroVerPartes);

// Event listeners para filtros de Liquidaciones Históricas
document.getElementById('aplicarFiltroLiquidado').addEventListener('click', aplicarFiltroLiquidado);
document.getElementById('limpiarFiltroLiquidado').addEventListener('click', limpiarFiltroLiquidado);


// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos desde localStorage
    cargarDatos();

    // Establecer la fecha actual por defecto en el parte diario
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaParte').value = hoy;

    // Configurar event listeners para botones de menú (usamos .onclick para consistencia)
    document.getElementById('btnParteDiario').onclick = () => cambiarSeccion('sectionParteDiario');
    document.getElementById('btnVerPartes').onclick = () => cambiarSeccion('sectionVerPartes');
    document.getElementById('btnClientes').onclick = () => cambiarSeccion('sectionClientes');
    document.getElementById('btnObras').onclick = () => cambiarSeccion('sectionObras');
    document.getElementById('btnOperarios').onclick = () => cambiarSeccion('sectionOperarios');
    document.getElementById('btnProveedores').onclick = () => cambiarSeccion('sectionProveedores');
    document.getElementById('btnResumen').onclick = () => cambiarSeccion('sectionResumen');
    document.getElementById('btnLiquidacion').onclick = () => cambiarSeccion('sectionLiquidacion');
    document.getElementById('btnPagos').onclick = () => cambiarSeccion('sectionPagos');
    document.getElementById('btnAyuda').onclick = () => cambiarSeccion('sectionAyuda');

    // Botones de acciones (cambiados de addEventListener a .onclick para evitar doble ejecución en modo edición)
    document.getElementById('guardarCliente').onclick = guardarCliente;
    document.getElementById('limpiarCliente').onclick = limpiarFormularioCliente;

    document.getElementById('guardarObra').onclick = guardarObra;
    document.getElementById('limpiarObra').onclick = limpiarFormularioObra;

    document.getElementById('guardarOperario').onclick = guardarOperario;
    document.getElementById('limpiarOperario').onclick = limpiarFormularioOperario;

    document.getElementById('guardarProveedor').onclick = guardarProveedor;
    document.getElementById('limpiarProveedor').onclick = limpiarFormularioProveedor;

    document.getElementById('guardarParte').onclick = guardarOActualizarParteDiario;
    document.getElementById('limpiarParte').onclick = limpiarFormularioParteDiario;

    document.getElementById('generarResumen').onclick = generarResumen;
    document.getElementById('imprimirResumen').onclick = imprimirResumen;
    document.getElementById('visualizarCompleto').onclick = visualizarCompleto;

    // Liquidación actions
    document.getElementById('guardarLiquidacion').onclick = guardarLiquidacion;
    document.getElementById('verLiquidaciones').onclick = abrirModalLiquidaciones;
    
    // Pagos actions and tab navigation
    document.getElementById('guardarPagoAcuenta').onclick = guardarPagoAcuenta;
    document.getElementById('guardarPagoPB').onclick = guardarPagoPB;

    // Pagos PB filter actions
    const btnResumenPB = document.getElementById('mostrarResumenPB');
    if (btnResumenPB) btnResumenPB.onclick = mostrarResumenPB;
    const btnLimpiarPB = document.getElementById('limpiarFiltroPB');
    if (btnLimpiarPB) btnLimpiarPB.onclick = limpiarFiltroPB;
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.onclick = function() {
            switchPagoTab(this.dataset.target);
        };
    });
    
    // Botones de copia de seguridad y restauración
    document.getElementById('btnBackup').onclick = crearBackup;
    document.getElementById('btnRestore').onclick = function() {
        // Crear un elemento de entrada de archivo invisible
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Agregar event listener para cuando se selecciona un archivo
        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                restaurarBackup(e.target.files[0]);
            }
            // Eliminar el elemento input cuando ya no se necesita
            document.body.removeChild(fileInput);
        });

        // Simular clic en el input de archivo
        fileInput.click();
    };

    // Iniciar con la sección de Parte Diario activa y sus selectores cargados
    actualizarListasYSelectores();
    cambiarSeccion('sectionParteDiario');
});