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
js/views/               Vistas: funciones render* que pintan el DOM
  dashboard.js  map.js  analysis.js  calendar.js  compare.js  live.js  globe.js  chrome.js
js/controllers/         Controladores: eventos y orquestación
  controls.js           Panel de controles
  globe.js              Interacción con el globo y búsqueda
  app.js                recompute(), renderAll() y arranque
snap/                   Datos e imágenes NASA descargados para uso sin conexión
```

Los scripts se cargan en orden (modelos → vistas → controladores) desde `index.html`.
Para probar en local: `python3 -m http.server 8080` y abrir `http://localhost:8080`.
