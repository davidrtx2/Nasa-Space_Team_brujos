/* AGRI-ORBIT · js/controllers/cadastre.js
   Controlador: consulta el estado del catastro del CNR al arrancar y pinta la tarjeta. */
function initCadastre(){
  if (!document.getElementById('cadBody')) return;
  renderCadastre(true);
  cadLoadStatus().then(() => renderCadastre(true));
}
