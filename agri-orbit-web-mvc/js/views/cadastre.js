/* AGRI-ORBIT · js/views/cadastre.js
   Vista: parcelas de El Salvador del catastro del CNR. Estados: sin backend, pendiente de
   conexión (faltan variables CNR_CADASTRE_*), fuera de El Salvador y capa conectada. */

const cadEsc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cadSVSite = () => Object.values(SITES).find(s => s.country === 'El Salvador');

function cadErrText(code){
  const m = {
    zoom: tr('Zoom in to query parcels.', 'Acerca el mapa para consultar parcelas.'),
    outside: tr('That point is outside El Salvador.', 'Ese punto está fuera de El Salvador.'),
    upstream_auth: tr('The CNR service rejected the server credentials.', 'El servicio del CNR rechazó las credenciales del servidor.'),
    upstream_timeout: tr('The CNR service took too long to respond.', 'El servicio del CNR tardó demasiado en responder.'),
    pending: tr('Cadastral layer pending connection.', 'Capa catastral pendiente de conexión.'),
    unreachable: tr('Could not reach the AGRI-ORBIT backend.', 'No se pudo contactar el backend de AGRI-ORBIT.')
  };
  return m[code] || tr('The CNR service could not be queried', 'No se pudo consultar el servicio del CNR') + ` (${cadEsc(code)}).`;
}

function cadInfoHTML(){
  const st = CAD.infoState, j = CAD.info;
  if (!st) return `<p class="sub">${tr('Click the map to query the parcel at that point.', 'Haz clic en el mapa para consultar la parcela de ese punto.')}</p>`;
  if (st === 'loading') return `<p class="sub">${tr('Querying the CNR…', 'Consultando al CNR…')}</p>`;
  if (st === 'error') return `<p class="warn">${cadErrText(CAD.err)}</p>`;
  if (st === 'unsupported') return `<p class="sub">${tr('This service does not allow attribute queries.', 'Este servicio no permite consultar atributos.')}</p>`;
  if (st === 'unparsed') return `<p class="sub">${tr('The CNR response could not be read.', 'No se pudo interpretar la respuesta del CNR.')}</p>`;
  const cov = j && j.coverage === 'confirmed' ? tr('confirmed coverage', 'cobertura confirmada') : tr('coverage not confirmed', 'cobertura sin confirmar');
  if (st === 'none_returned') return `<p class="sub">${tr('The service returned no parcel at this point; that does not mean none exists.', 'El servicio no devolvió parcela en este punto; eso no significa que no exista.')} · ${cov}</p>`;
  return (j.features || []).map(f => `<div class="cadfeat">
    <h4>${f.key ? `${cadEsc(f.keyField || tr('Cadastral key', 'Clave catastral'))}: <span class="mono">${cadEsc(f.key)}</span>` : tr('Parcel', 'Parcela')}</h4>
    ${f.attributes.length ? `<table>${f.attributes.map(([k, v]) => `<tr><th scope="row">${cadEsc(k)}</th><td>${cadEsc(v)}</td></tr>`).join('')}</table>` : ''}
    ${f.withheld && f.withheld.length ? `<p class="sub">${f.withheld.length} ${tr('owner or registry fields hidden (personal data).', 'campos de propietario o registro ocultos (datos personales).')}</p>` : ''}
  </div>`).join('') + `<p class="sub">${cov}</p>`;
}

function renderCadInfo(){ const el = $('#cadInfo'); if (el) el.innerHTML = cadInfoHTML(); }

function renderCadastre(force){
  const el = $('#cadBody'); if (!el) return;
  const s = S.site, st = CAD.status, src = srcChip('cad');
  const sig = [CAD.state, s.lat, s.lon, CAD.span, LANG].join('|');
  if (!force && sig === CAD.sig) return;
  if (CAD.sig && sig.split('|').slice(1, 3).join() !== CAD.sig.split('|').slice(1, 3).join()){ CAD.info = null; CAD.infoState = null; }
  CAD.sig = sig;
  const tag = $('#cadTag'); if (tag) tag.textContent = st && st.attribution ? st.attribution : 'CNR · IGCN';
  const dev = typeof aiIsLocalDev === 'function' && aiIsLocalDev();
  if (CAD.state === 'unknown'){ el.innerHTML = `<p class="sub">${tr('Checking the cadastral service…', 'Consultando el servicio catastral…')}</p>`; return; }
  if (CAD.state === 'nobackend'){
    el.innerHTML = `<div class="cadmsg">${src} <b>${tr('Cadastral layer unavailable', 'Capa catastral no disponible')}</b>
      <p>${dev ? tr('Start the backend to use it: node server/index.js', 'Arranca el backend para usarla: node server/index.js')
               : tr('This layer needs the AGRI-ORBIT backend; the rest of the app works without it.', 'Esta capa necesita el backend de AGRI-ORBIT; el resto de la app funciona sin él.')}</p></div>`;
    return;
  }
  if (CAD.state === 'pending'){
    el.innerHTML = `<div class="cadmsg pending">${src} <b>${tr('Cadastral layer pending connection', 'Capa catastral pendiente de conexión')}</b>
      <p>${tr('The CNR provides its cadastral map service through an institutional agreement. No parcels are drawn until it is configured on the server.', 'El CNR entrega su servicio de mapas catastrales mediante convenio institucional. No se dibujan parcelas hasta configurarlo en el servidor.')}</p>
      ${st && st.missing && st.missing.length ? `<p class="sub">${tr('Missing in server/.env:', 'Falta en server/.env:')} ${st.missing.map(m => `<code>${cadEsc(m)}</code>`).join(' ')}</p>` : ''}</div>`;
    return;
  }
  if (!cadInSV(s.lon, s.lat)){
    const sv = cadSVSite();
    el.innerHTML = `<div class="cadmsg">${src} <b>${tr('The CNR cadastre only covers El Salvador.', 'El catastro del CNR solo cubre El Salvador.')}</b>
      ${sv ? `<p><button class="btn" type="button" id="cadGoSV">${tr('View', 'Ver')} ${cadEsc(siteName(sv))}</button></p>` : ''}</div>`;
    const b = $('#cadGoSV'); if (b) b.onclick = () => selectSite(sv.key);
    return;
  }
  const v = CAD.view = cadView(s.lat, s.lon, CAD.span);
  el.innerHTML = `<div class="cadwrap">
    <div class="cadmap" id="cadMap" tabindex="0" role="button" style="aspect-ratio:${v.w}/${v.h}"
      aria-label="${tr('CNR parcel map: click or press Enter to query a parcel', 'Mapa de parcelas del CNR: haz clic o pulsa Enter para consultar una parcela')}">
      <img class="cadov" id="cadOv" alt="${tr('CNR cadastral parcels around', 'Parcelas catastrales del CNR alrededor de')} ${cadEsc(siteName(s))}" src="${cadEsc(cadMapURL(v))}">
      <span class="xh" aria-hidden="true"></span>
      <div class="cadctl"><button class="btn" type="button" id="cadIn" aria-label="${tr('Zoom in', 'Acercar')}">+</button><button class="btn" type="button" id="cadOut" aria-label="${tr('Zoom out', 'Alejar')}">−</button></div>
      <div class="cadst" id="cadSt" aria-live="polite"></div>
      <div class="cadscale mono">≈ ${r0(CAD.span * 111 * Math.cos(s.lat * Math.PI / 180) * 10) / 10} km</div>
    </div>
    <div class="cadinfo" id="cadInfo" aria-live="polite">${cadInfoHTML()}</div>
  </div>
  <div class="note">${src} ${cadEsc(st.attribution)}${st.updated ? ' · ' + tr('updated', 'actualizado') + ' ' + cadEsc(st.updated) : ''} · ${tr('official cadastral data, not NASA; AGRI-ORBIT does not validate boundaries.', 'datos catastrales oficiales, no de la NASA; AGRI-ORBIT no valida los linderos.')}</div>`;
  const ov = $('#cadOv'), map = $('#cadMap');
  ov.onerror = () => { const t = $('#cadSt'); if (t) t.textContent = tr('Parcels could not be loaded from the CNR service. Try again or zoom in.', 'No se pudieron cargar las parcelas del servicio del CNR. Reintenta o acerca el mapa.'); };
  const ask = (fx, fy) => { const [w, so, e, n] = v.bbox; cadIdentify(w + fx * (e - w), n - fy * (n - so)).then(renderCadInfo); renderCadInfo(); };
  map.onclick = ev => { if (ev.target.closest('.cadctl')) return; const r = map.getBoundingClientRect(); ask((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height); };
  map.onkeydown = ev => { if (ev.target === map && (ev.key === 'Enter' || ev.key === ' ')){ ev.preventDefault(); ask(.5, .5); } };
  const maxS = (st && st.maxSpanDeg) || 0.05;
  $('#cadIn').onclick = () => { CAD.span = Math.max(CAD_MIN_SPAN, CAD.span / 2); renderCadastre(true); };
  $('#cadOut').onclick = () => { CAD.span = Math.min(maxS, CAD.span * 2); renderCadastre(true); };
}
