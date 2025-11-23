INSTRUCCIONES RÁPIDAS PARA PROBAR EL PROYECTO

1. Abrir el proyecto
   - Descomprime la carpeta webflow_chat_project_v2.
   - Abre la carpeta completa en Visual Studio Code.

2. Configurar la API key de Ably
   - Abre src/js/chat.js.
   - Busca la línea:
        const ABLY_API_KEY = "TU_API_KEY_DE_ABLY_AQUI";
   - Sustituye el texto entre comillas por tu API key real de Ably.
   - Guarda los cambios.

3. Ejecutar con Live Server
   - Instala la extensión "Live Server" en Visual Studio Code (si aún no la tienes).
   - Haz clic derecho sobre index.html y selecciona "Open with Live Server".
   - Se abrirá el navegador con la interfaz del chat.

4. Probar varios usuarios
   - Abre otra pestaña o ventana (puede ser incógnito) con la misma URL
     que generó Live Server.
   - Introduce un nombre distinto en cada ventana.
   - Envía mensajes y observa cómo se sincronizan en tiempo real.

5. Uso para el informe BPM
   - En la columna derecha de la página se incluye una explicación en texto
     del contexto BPM del sistema, útil para documentar el proceso en el
     informe en PDF.
