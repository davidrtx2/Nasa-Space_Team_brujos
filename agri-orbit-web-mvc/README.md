# AGRI-ORBIT

Sitio estático (sin build) organizado con el patrón MVC.

```
index.html              Vista principal (estructura HTML)
css/style.css           Hoja de estilos unificada
js/utils.js             Utilidades compartidas
js/models/              Modelo: datos, estado y lógica
  data.js               Regiones, cultivos, regímenes de lluvia, escenarios
  state.js              Estado global (S)
  engine.js             Modelo agronómico, ranking y Monte Carlo
  calendar.js           Balance hídrico y calendario mensual
  nasa.js               NASA POWER / GIBS en vivo, instantánea local (snap/)
  globe.js              Países, capas y geometría del globo
  aiContext.js          AGRI-AI: contexto agrícola estructurado (solo lectura de S/LIVE)
  aiClient.js           AGRI-AI: conversación y comunicación con el backend (sin claves)
js/views/               Vistas: funciones render* que pintan el DOM
  dashboard.js  map.js  analysis.js  calendar.js  compare.js  live.js  globe.js  chrome.js  agriAI.js
js/controllers/         Controladores: eventos y orquestación
  controls.js           Panel de controles
  globe.js              Interacción con el globo y búsqueda
  app.js                recompute(), renderAll() y arranque
  agriAI.js             AGRI-AI: abrir/cerrar, envío de preguntas
server/                 Backend de AGRI-AI (Node ≥ 18, sin dependencias)
snap/                   Datos e imágenes NASA descargados para uso sin conexión
                        (hero_santacruz_hls*.webp: imagen de portada, NASA HLS S30 vía GIBS, 10 jul 2025;
                         countries-50m.json: límites de países world-atlas/Natural Earth para el globo sin conexión)
js/vendor/d3.min.js     D3 v7.9.0 local (el globo funciona sin CDN ni internet)
tests/
  model.test.js         Arnés Node del modelo (métricas de agua, caso, exportación)
  render.smoke.js       Render del caso con DOM mínimo (ambos idiomas y prioridades)
  agri-ai.test.js       AGRI-AI frontend + integración frontend → backend → proveedor
  agri-ai.server.test.js AGRI-AI backend: validación, seguridad, rate limit, errores
  cadastre.test.js      Catastro CNR: tarjeta (estados, escape) y backend pendiente
```

La vista del caso está en `js/views/case.js`. Los scripts se cargan en orden (modelos → vistas → controladores) desde `index.html`.

## Ejecutar

```bash
python3 -m http.server 8080    # en esta carpeta
# abrir http://localhost:8080
```

Sin build. Sin conexión usa la instantánea `snap/power.json` (datos reales de NASA POWER, nov-2026) y las imágenes `snap/*.webp`. Pruebas del modelo: `node tests/model.test.js` y `node tests/render.smoke.js`. Pruebas de AGRI-AI: `node tests/agri-ai.test.js` y `node tests/agri-ai.server.test.js`.

## AGRI-AI · asistente agrícola

Botón flotante **AGRI-AI** (abajo a la derecha). AGRI-ORBIT proporciona los datos y realiza los cálculos agronómicos; AGRI-AI interpreta, explica y ayuda a decidir. En cada pregunta el navegador envía al backend solo las secciones relevantes del estado actual (región, suelo, riego, escenario, prioridades, clima NASA POWER con su procedencia, últimos 90 días, IMERG, riesgos, calendario, rotaciones y caso Chiquimula), generadas por `buildAIContext()` sin modificar el estado. Si el backend no está configurado o no hay internet, el chat lo indica y el resto de la app sigue funcionando (incluida la instantánea offline); nunca muestra respuestas simuladas.

```bash
cd server
cp .env.example .env        # pon OPENAI_API_KEY (y opcional OPENAI_MODEL / OPENAI_BASE_URL)
node index.js               # http://localhost:8787 sirve la web + /api/agri-ai
```

- Desarrollo local: si abres la web con Live Server o `http.server` (p. ej. `127.0.0.1:5501`), el chat usa automáticamente el backend en `http://<host>:8787/api/agri-ai`, y el backend acepta orígenes `localhost`/`127.0.0.1` cuando corre en local. Si el backend está apagado o sin API key, el chat lo indica.
- Endpoints: `GET /api/agri-ai/health`, `POST /api/agri-ai/chat` (`{messages, context, lang, questionLang}` → `{reply}`).
- Proveedor: cualquier API compatible con OpenAI Chat Completions (OpenAI, Groq, OpenRouter, Together, Ollama…) vía `OPENAI_BASE_URL` y `OPENAI_MODEL`.
- La clave solo vive en variables de entorno del servidor; el JavaScript público no contiene claves. El prompt del sistema está en `server/lib/prompt.js`.
- Seguridad: validación de mensajes (solo roles `user`/`assistant`, 1.200 caracteres por pregunta), contexto saneado y limitado (16 KB), cuerpo máx. 64 KB, rate limit por IP (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`), timeout al proveedor, CORS por lista (`ALLOWED_ORIGINS`), sin ejecución de código.
- Web estática en otro dominio (p. ej. GitHub Pages): despliega `server/` (Render, Railway, Fly…) con `SERVE_STATIC=0`, `TRUST_PROXY=1` y `ALLOWED_ORIGINS=https://tu-sitio`, y apunta el frontend con `<meta name="agri-ai-endpoint" content="https://tu-backend/api/agri-ai">` en `index.html` (o `window.AGRI_AI_ENDPOINT`). Con `python3 -m http.server` y sin backend, el chat muestra "no disponible".

## El caso: Corredor Seco de Chiquimula, Guatemala

«Probar caso Chiquimula» carga la finca de referencia del prototipo (14.80, −89.54): secano, suelo franco, rotación maíz de primera y postrera (editable). La compara con dos alternativas bajo el mismo escenario de calentamiento moderado:

1. **Maíz + leguminosas de grano** (maíz, frijol, maíz, caupí): fija N, diversifica el ingreso; sacrifica algo de cobertura y depende del precio del frijol.
2. **Maíz + abono verde + sorgo** (maíz, canavalia, sorgo, caupí): máxima salud del suelo y estabilidad; sacrifica un ciclo de ingreso comercial.

Cada alternativa documenta supuestos, beneficio, sacrificio y el dato que falta validar. El toggle «Ahorrar agua / Proteger el suelo» cambia solo los pesos del puntaje: el orden puede mantenerse pero se ve cómo cambia la distancia entre opciones.

## Fuentes efectivamente utilizadas

| Uso | Fuente | Detalle |
|---|---|---|
| Clima numérico | **NASA POWER** (Agroclimatology API) | T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, GWETROOT, ALLSKY_SFC_SW_DWN, WS2M · climatología mensual + series diarias · malla ~0.5° |
| Lluvia de la ventana de siembra | **GPM IMERG vía NASA POWER Daily** | `IMERG_PRECTOT` (mm/día) · UTC · ~0.1° · acumulado de la ventana vs. misma ventana climatológica; fill −999 = faltante, no cero |
| Capas del mapa y globo | **NASA GIBS** (WMS) | VIIRS, MODIS NDVI, SMAP L4, GPM IMERG, SRTM/ASTER GDEM, GRACE-FO · **solo visualización**, no alimenta el motor |
| Contexto regional | **GRACE/GRACE-FO** | Anomalía regional del almacenamiento *total* de agua (mascon mensual); referencia, no dato de parcela |
| Suelo y pendiente | Entrada del agricultor | Contexto sugerido: MAGA/ICTA (suelos del Corredor Seco) e INSIVUMEH (estaciones) — referencias nacionales, aún sin integración numérica |
| Instantánea | `snap/power.json` + `snap/*.webp` | Réplica local de POWER y GIBS para la demo sin conexión |

Procedencia de cada cifra en la interfaz: **API** (consulta en vivo), **Inst.** (instantánea), **Ref.** (referencia regional), **Entrada** (agricultor), **Modelo** (índice relativo 0–100 o simulación), **GIBS** (visualización).

## Métricas corregidas

«Riego necesario» se reemplazó por tres cifras: **déficit estimado** (mm/ciclo, antes de riego), **riego aplicado** (limitado por el riego disponible: 0 mm en secano) y **déficit restante**. Economía, suelo, agua, estabilidad y forraje son **índices relativos 0–100**, no pronósticos de rendimiento. La «estabilidad» sale de 1 000 simulaciones climáticas Monte Carlo (mismas extracciones para todas las rotaciones comparadas).

## English description (for the jury)

AGRI-ORBIT helps a smallholder in Guatemala's Dry Corridor decide what to plant next. It combines NASA POWER agroclimatology (rainfall, temperature, root-zone moisture GWETROOT, radiation) and GPM IMERG daily rainfall over the sowing window with farmer-entered soil data to compare crop rotations under a shared climate-change scenario. Scores are transparent, provenance-tagged relative indices — not yield forecasts — and every figure states its product, variable, unit, period, resolution and provenance class. The app is bilingual (Spanish-first for farmers, full English for judges), works offline from a real NASA data snapshot, and keeps the globe and GIBS satellite layers as visualization only.

## Demo script (~30 s)

EN voice-over (subtitles if recorded in Spanish):

1. (0–5 s) "A maize farmer in Chiquimula faces hotter, drier years. One click: *Probar caso Chiquimula*." — click the hero CTA.
2. (5–15 s) "His maize–maize rotation vs. two alternatives, same scenario: estimated water deficit, bare-soil months, simulated stability — every figure shows its NASA source." — point at the comparison table and provenance chips.
3. (15–25 s) "Change his priority: *Ahorrar agua* → *Proteger el suelo*. The order holds, but the scores move — the model only re-weights the same evidence." — toggle and show the score line.
4. (25–30 s) "Offline? The same figures come from a real NASA POWER snapshot. AGRI-ORBIT: decide what to plant next, with NASA's eyes on the field."

## Uso de IA

El código de la vista del caso, la corrección de métricas, la integración IMERG, las pruebas y esta documentación fueron redactados con asistencia de IA (Devin, Cognition) y revisados por el equipo. Las cifras que se muestran provienen del modelo del repositorio y de las APIs NASA citadas; la IA no generó datos climáticos. El asistente AGRI-AI (en tiempo de ejecución) solo interpreta el contexto que le envía la app; no calcula puntajes ni reemplaza el motor agronómico.

## Limitaciones pendientes

- Índices relativos del modelo, calibrados con referencias regionales; no son rendimientos predichos ni validados en campo.
- IMERG en POWER llega con ~2–3 meses de rezago: la ventana de siembra mostrada es la más reciente ya cerrada.
- MAGA/ICTA e INSIVUMEH figuran como contexto nacional; la contrastación numérica con estaciones queda pendiente.
- La malla de POWER (~50 km) suaviza microclimas; el déficit hídrico es una estimación simplificada por ciclo.
- El mapa de parcelas es ilustrativo (no un predio real).

## Parcelas de El Salvador · catastro del CNR

Tarjeta «Parcelas de El Salvador» (después de la finca ilustrativa). El navegador pide al backend `GET /api/cadastre/status|map|identify` (`server/lib/cadastre.js`); el backend consulta el servicio oficial del CNR configurado con las variables `CNR_CADASTRE_*` de `server/.env` (ver `.env.example`). Sin convenio/URL configurados la tarjeta muestra «Capa catastral pendiente de conexión» y las variables que faltan; fuera de El Salvador ofrece ir a San Miguel; sin backend indica cómo arrancarlo. Los atributos de propietario/registro se ocultan salvo autorización.
