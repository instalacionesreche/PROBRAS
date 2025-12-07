# Gestión de Obras y Servicios

## Aplicación para la gestión de obras, clientes, operarios, proveedores y partes diarios

### Instrucciones para desarrolladores

#### Requisitos previos
- Node.js (versión 14 o superior)
- npm (incluido con Node.js)

#### Instalación
1. Clona este repositorio o descarga los archivos
2. Abre una terminal en la carpeta del proyecto
3. Ejecuta `npm install` para instalar las dependencias

#### Ejecución en modo desarrollo
- Ejecuta `npm start` para iniciar la aplicación en modo desarrollo

#### Compilación del ejecutable para Windows
- Ejecuta `npm run build` para generar el instalador en la carpeta "dist"

### Instrucciones para usuarios
1. Ejecuta el instalador "Gestión de Obras Setup.exe" (o el archivo correspondiente a tu sistema operativo)
2. Sigue las instrucciones de instalación.
3. Inicia la aplicación desde el acceso directo creado.

**¡IMPORTANTE! Gestión de Datos Local**

Esta aplicación utiliza Electron para garantizar que funciona localmente en su PC sin depender de Internet.

-   **Datos Locales y Aislados:** Todos sus registros (clientes, obras, partes, etc.) se almacenan localmente en su equipo, separados de cualquier navegador web.
-   **Prevención de Pérdida de Datos:** Para evitar perder información valiosa, utilice siempre los botones de **Copia de Seguridad** y **Restaurar Datos** (disponibles en el menú principal o en el menú Archivo de la ventana) y guarde el archivo <code>.json</code> resultante en un lugar seguro fuera del disco principal si es posible.
-   Para más detalles sobre la gestión de datos, consulte la sección **Ayuda / Manual** dentro de la aplicación.

### Funcionalidades
- Gestión de clientes, obras, operarios y proveedores
- Registro de partes diarios con horas trabajadas
- Registro de gastos con proveedores
- Generación de resúmenes e informes en PDF
- Copia de seguridad y restauración de datos

