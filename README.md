# AGRI-ORBIT · Decide qué sembrar después

![Parcelas agrícolas al este del río Grande, Santa Cruz, Bolivia · NASA HLS S30 vía NASA GIBS, 10 jul 2025](agri-orbit-web-mvc/snap/hero_santacruz_hls_900.webp)

**AGRI-ORBIT** es una herramienta web de apoyo a decisiones que compara **rotaciones de cultivos** para fincas de Latinoamérica usando **datos de la NASA** (clima, lluvia, humedad del suelo, vegetación y agua almacenada) junto con las condiciones y prioridades de cada agricultor.

Proyecto de **Team Brujos** para el NASA Space Apps Challenge, reto *“Cambio de rumbo: adaptando las granjas con datos de la NASA”*.

> AGRI-ORBIT entrega los datos y hace los cálculos agronómicos. AGRI-AI los interpreta y explica. Ninguno reemplaza al extensionista: valida siempre en campo.

---

## ¿Qué hace?

1. **Explora tu finca.** Eliges una región (44 regiones de referencia en 20 países de Latinoamérica, más una de EE. UU.) o un punto en el globo. Luego ajustas textura, materia orgánica, pH, pendiente, riego y tu rotación actual.
2. **Compara rotaciones.** El motor evalúa más de mil combinaciones de 18 cultivos y coberturas. Las ordena según tus prioridades: ganancia, salud del suelo, ahorro de agua, estabilidad y forraje.
3. **Entiende el resultado.** Para cada opción muestra:
   - déficit de agua (estimado, riego aplicado y restante);
   - meses con suelo descubierto, estabilidad y nitrógeno;
   - ventajas y costos;
   - qué datos falta validar;
   - una simulación Monte Carlo con 1 000 años de clima.
4. **Mira tu zona desde el espacio.** Un globo interactivo con capas NASA GIBS: color real, lluvia, humedad, vegetación y agua total.

### Caso de demostración: Corredor Seco de Chiquimula, Guatemala
El botón **«Probar caso Chiquimula»** carga una finca de secano con rotación de maíz de primera y postrera (editable). La compara con dos alternativas bajo el mismo escenario climático:
- **Maíz + leguminosas de grano**
- **Maíz + abono verde + sorgo**

Puedes alternar entre **«Ahorrar agua»** y **«Proteger el suelo»** para ver cómo cambian los puntajes.

---

## Datos que usa

| Uso | Fuente | Nota |
|---|---|---|
| Clima del motor | **NASA POWER** (Agroclimatology API) | Temperatura, lluvia, humedad de raíces y radiación. Climatología mensual y series diarias, malla de ~0.5° |
| Lluvia de la ventana de siembra | **GPM IMERG** vía NASA POWER Daily | Solo con conexión. Un día faltante no se cuenta como cero |
| Capas del globo y del mapa | **NASA GIBS** | VIIRS, MODIS NDVI, SMAP L4, IMERG, SRTM y GRACE-FO. **Solo visualización**: no alimentan el motor |
| Contexto de agua subterránea | **GRACE / GRACE-FO** | Anomalía regional del agua total almacenada, no un dato de la parcela |
| Suelo y pendiente | Entrada del agricultor | Referencias nacionales sugeridas: MAGA/ICTA e INSIVUMEH |
| Parcelas de El Salvador | **CNR · IGCN** (catastro oficial) | Requiere convenio con el CNR. Sin él, la tarjeta muestra «pendiente de conexión» |
| Sin conexión | `snap/` | Copia local de NASA POWER y GIBS, límites de países y D3 |

Cada cifra lleva una etiqueta de procedencia: **En vivo**, **Instantánea**, **Referencia**, **Agricultor**, **Modelo**, **GIBS** o **CNR**. Los índices de 0 a 100 son estimaciones relativas del modelo, no pronósticos de rendimiento.

---

## AGRI-AI · asistente agrícola

Es el botón flotante de abajo a la derecha. Responde en español e inglés sobre tu terreno, los datos NASA y las rotaciones, usando el estado actual de la app como contexto. No inventa datos y avisa cuando falta información.

Funciona con cualquier proveedor compatible con OpenAI Chat Completions (OpenAI, Google Gemini, Groq, OpenRouter, Ollama…). La clave vive **solo** en el servidor (`server/.env`) y nunca en el JavaScript público. Si el backend no está, la app sigue funcionando y el chat lo indica.

---

## Cómo correrlo

No necesita build: es HTML, CSS y JavaScript nativo (patrón MVC).

**Solo la web** (sin chat ni catastro):
```bash
cd agri-orbit-web-mvc
python3 -m http.server 8080      # o Live Server en VS Code
# abre http://localhost:8080
```

**Con AGRI-AI y el catastro** (Node ≥ 18, sin dependencias):
```bash
cd agri-orbit-web-mvc/server
cp .env.example .env             # pon OPENAI_API_KEY (y OPENAI_MODEL / OPENAI_BASE_URL)
node index.js                    # http://localhost:8787 sirve la web + /api/agri-ai + /api/cadastre
```
Si usas Live Server (`127.0.0.1:5501`), la página usa sola el backend de `:8787`.

Ejemplo con Google Gemini (clave gratis en https://aistudio.google.com/apikey):
```env
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gemini-flash-lite-latest
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
```

**Pruebas:**
```bash
cd agri-orbit-web-mvc
node tests/model.test.js && node tests/render.smoke.js
node tests/agri-ai.test.js && node tests/agri-ai.server.test.js
node tests/cadastre.test.js
```

---

## Estructura

```
agri-orbit-web-mvc/
  index.html, css/style.css     interfaz
  js/models/                    datos, motor agronómico, NASA, globo, AGRI-AI, catastro
  js/views/                     funciones render* de cada sección
  js/controllers/               eventos y arranque
  js/vendor/d3.min.js           D3 local (el globo funciona sin internet)
  snap/                         instantánea NASA (POWER, GIBS), límites de países, imagen de portada
  server/                       backend Node: AGRI-AI (/api/agri-ai) y catastro CNR (/api/cadastre)
  tests/                        pruebas en Node
```

La documentación técnica detallada está en [`agri-orbit-web-mvc/README.md`](agri-orbit-web-mvc/README.md).

---

## Limitaciones

- Es un modelo de reglas y puntajes, no un simulador fisiológico como DSSAT o AquaCrop. Los coeficientes de cultivo son simplificados y genéricos.
- NASA POWER describe celdas de unos 50 km, así que tu parcela puede ser distinta. Textura, pH y materia orgánica son los que ingresas tú.
- Los escenarios a futuro son ilustrativos; las proyecciones NEX-GDDP-CMIP6 aún no están integradas.
- No incluye precios ni costos: confirma el mercado antes de cambiar de cultivo.
- Es un prototipo demostrativo. Conversa el resultado con extensionistas locales (p. ej., ICTA o MAGA en Guatemala).

NASA no respalda a entidades que no sean del Gobierno de EE. UU. Límites de países: Natural Earth (world-atlas).
