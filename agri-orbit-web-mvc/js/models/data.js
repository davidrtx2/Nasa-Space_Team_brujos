/* AGRI-ORBIT · js/models/data.js
   Datos base: regiones, cultivos, regímenes de lluvia y escenarios. */

/* =========================================================
   DATOS BASE
   ========================================================= */
// Climatología aproximada de referencia (valores redondeados tipo NASA POWER).
// Tg: temperatura media de la temporada cálida (°C) · Tmax: máxima media del mes más cálido · P: lluvia anual (mm)
// Pcv: coeficiente de variación interanual de la lluvia · GWET: humedad relativa zona radicular (0–1)
// wind/heavy/frost: índices 0–1 de viento, lluvias intensas, heladas · SW: radiación kWh/m²/día
// Climatología APROXIMADA de referencia por región agrícola (valores redondeados; la versión alojada los reemplaza con NASA POWER en vivo).
// Columnas: clave, región, país, lat, lon, elevación m (ref. SRTM), Tg temporada °C, Tmax mes cálido °C, lluvia mm/año, CV lluvia,
//           humedad zona radicular (0–1, tipo SMAP/GWETROOT), radiación kWh/m²/día, viento, lluvias intensas, heladas (índices 0–1), práctica de referencia
const BASES = {
  maiz:[['maiz','maiz','maiz','maiz'],'Monocultivo de maíz'],
  maizpp:[['maiz','maiz','maiz','maiz'],'Maíz de primera y postrera'],
  andes:[['papa','papa','cebada','papa'],'Papa intensiva con cebada'],
  safrinha:[['soya','maiz','soya','maiz'],'Soya + maíz de segunda (safrinha)'],
  soya:[['soya','soya','maiz','soya'],'Soya casi continua'],
  soyatrigo:[['soya','trigo','soya','soya'],'Soya dominante con trigo'],
  trigo:[['trigo','trigo','maiz','trigo'],'Trigo casi continuo'],
  ogallala:[['trigo','barbecho','maiz','soya'],'Trigo → barbecho → maíz → soya'],
  sorgo:[['sorgo','maiz','sorgo','maiz'],'Maíz–sorgo de riego']
};
const SITE_ROWS = [
 ['altiplano','Altiplano occidental · Quetzaltenango','Guatemala',14.84,-91.52,2330,16,23,820,.18,.55,5.4,.35,.4,.35,'maiz'],
 ['corredor','Corredor Seco · Chiquimula','Guatemala',14.80,-89.54,420,27,35,780,.28,.38,5.8,.45,.5,0,'maizpp'],
 ['costasur','Costa Sur · Escuintla','Guatemala',14.30,-90.78,350,27.5,33,2000,.15,.70,5.2,.3,.75,0,'maiz'],
 ['peten','Petén · Santa Elena','Guatemala',16.92,-89.89,130,27,34,1500,.17,.65,5.3,.25,.6,0,'maiz'],
 ['bajio','Bajío · Celaya, Guanajuato','México',20.52,-100.81,1750,21,31,600,.22,.45,6.1,.4,.4,.2,'sorgo'],
 ['sinaloa','Valle de Culiacán, Sinaloa','México',24.80,-107.40,50,29,36,650,.30,.35,6.0,.35,.5,0,'maiz'],
 ['frailesca','La Frailesca · Villaflores, Chiapas','México',16.23,-93.27,600,25,33,1200,.20,.60,5.5,.35,.6,0,'maiz'],
 ['yucatan','Península · Mérida, Yucatán','México',20.97,-89.62,10,28,35,1000,.22,.50,5.6,.4,.6,0,'maiz'],
 ['oaxaca','Valles Centrales, Oaxaca','México',17.06,-96.72,1550,21,30,700,.25,.42,6.0,.35,.45,.05,'maiz'],
 ['chihuahua','Delicias, Chihuahua','México',28.19,-105.47,1170,25,35,330,.30,.25,6.3,.55,.35,.5,'sorgo'],
 ['sanmiguel','Zona oriental · San Miguel','El Salvador',13.48,-88.18,110,28,36,1700,.22,.50,5.7,.35,.75,0,'maizpp'],
 ['choluteca','Choluteca (Corredor Seco)','Honduras',13.30,-87.19,50,28.5,37,1600,.25,.45,5.8,.4,.75,0,'maizpp'],
 ['olancho','Olancho · Juticalpa','Honduras',14.66,-86.22,480,25,33,1100,.20,.55,5.4,.3,.55,0,'maiz'],
 ['esteli','Estelí (zona seca)','Nicaragua',13.09,-86.35,850,23,30,850,.25,.45,5.5,.4,.5,0,'maizpp'],
 ['leon','Occidente · León','Nicaragua',12.43,-86.88,100,27.5,35,1500,.22,.50,5.7,.4,.7,0,'maiz'],
 ['guanacaste','Guanacaste · Liberia','Costa Rica',10.63,-85.44,140,28,34,1600,.20,.50,5.6,.55,.7,0,'maiz'],
 ['azuero','Península de Azuero · Los Santos','Panamá',7.93,-80.42,20,27.5,33,1100,.20,.50,5.4,.45,.6,0,'maiz'],
 ['cibao','Valle del Cibao · Santiago','Rep. Dominicana',19.45,-70.70,180,27,32,1000,.20,.55,5.5,.35,.55,0,'maiz'],
 ['artemisa','Llanura sur · Artemisa','Cuba',22.81,-82.76,50,27,32,1400,.18,.60,5.4,.4,.65,0,'maiz'],
 ['hinche','Plateau Central · Hinche','Haití',19.15,-72.01,300,27,33,1500,.25,.50,5.5,.3,.7,0,'maiz'],
 ['valle','Valle del Cauca · Palmira','Colombia',3.53,-76.30,1000,24,30,1000,.20,.60,5.0,.25,.5,0,'maiz'],
 ['boyaca','Altiplano Cundiboyacense · Tunja','Colombia',5.53,-73.36,2800,13,19,650,.18,.55,4.6,.3,.35,.3,'andes'],
 ['llanos','Llanos Orientales · Puerto López','Colombia',4.08,-72.96,180,26.5,32,2300,.15,.70,5.0,.3,.7,0,'maiz'],
 ['portuguesa','Llanos occidentales · Acarigua','Venezuela',9.56,-69.20,200,27,34,1400,.20,.55,5.4,.35,.6,0,'maiz'],
 ['manabi','Manabí · Portoviejo','Ecuador',-1.05,-80.45,50,26,31,550,.45,.40,4.8,.3,.6,0,'maiz'],
 ['riobamba','Sierra central · Riobamba','Ecuador',-1.67,-78.65,2750,14,20,450,.22,.45,5.0,.4,.25,.35,'andes'],
 ['piura','Costa norte · Piura (riego)','Perú',-5.19,-80.63,30,26,33,60,.90,.15,5.8,.45,.3,0,'maiz'],
 ['mantaro','Valle del Mantaro · Huancayo','Perú',-12.07,-75.21,3250,12.5,20,750,.20,.50,5.8,.3,.35,.6,'andes'],
 ['puno','Altiplano · Puno','Perú',-15.84,-70.02,3820,10,16,700,.20,.45,6.3,.45,.35,.9,'andes'],
 ['oruro','Altiplano · Oruro','Bolivia',-17.97,-67.11,3700,9,18,400,.25,.30,6.4,.6,.3,.95,'andes'],
 ['santacruz','Llanos cruceños · Santa Cruz','Bolivia',-17.78,-63.18,420,25,31,1200,.20,.55,5.2,.45,.55,.05,'soya'],
 ['sorriso','Cerrado · Sorriso, Mato Grosso','Brasil',-12.55,-55.71,370,26,33,2000,.15,.60,5.2,.25,.65,0,'safrinha'],
 ['londrina','Norte de Paraná · Londrina','Brasil',-23.30,-51.17,580,23,29,1600,.18,.65,5.0,.3,.6,.15,'safrinha'],
 ['petrolina','Semiárido · Sertão de Pernambuco','Brasil',-9.39,-40.50,380,27.5,33,550,.35,.25,6.0,.5,.4,0,'maiz'],
 ['passofundo','Planalto · Passo Fundo, RS','Brasil',-28.26,-52.41,690,21,28,1800,.18,.65,4.8,.35,.55,.5,'soyatrigo'],
 ['itapua','Itapúa · Encarnación','Paraguay',-27.33,-55.87,100,25,33,1700,.20,.62,5.0,.3,.6,.2,'soyatrigo'],
 ['chaco','Chaco Central · Filadelfia','Paraguay',-22.35,-60.03,130,27,35,850,.25,.40,5.6,.5,.45,.1,'sorgo'],
 ['pampa','Pampa Húmeda · Pergamino-Junín','Argentina',-34.6,-60.9,80,21,30,1000,.22,.60,4.9,.4,.45,.5,'soya'],
 ['cordoba','Sudeste de Córdoba · Marcos Juárez','Argentina',-32.70,-62.10,110,22,31,900,.22,.55,5.0,.45,.45,.5,'soya'],
 ['tucuman','Llanura de Tucumán','Argentina',-26.80,-65.20,450,24.5,31,950,.22,.55,5.0,.3,.5,.3,'soyatrigo'],
 ['paysandu','Litoral oeste · Paysandú','Uruguay',-32.32,-58.08,60,21.5,31,1250,.25,.60,4.8,.4,.5,.4,'soyatrigo'],
 ['talca','Valle Central · Talca (riego)','Chile',-35.43,-71.66,100,19,30,700,.35,.40,5.2,.3,.35,.5,'trigo'],
 ['temuco','La Araucanía · Temuco','Chile',-38.74,-72.60,120,15,24,1150,.20,.60,4.2,.35,.45,.5,'trigo'],
 ['ogallala','Llanuras Altas / Ogallala · Texas (ref. del reto)','EE. UU.',33.58,-101.85,990,24,33,480,.30,.35,5.9,.8,.35,.6,'ogallala']
];
const SITES = {};
for (const r of SITE_ROWS){
  const [key,region,country,lat,lon,elev,Tg,Tmax,P,Pcv,GWET,SW,wind,heavy,frost,b] = r;
  const tropical = Math.abs(lat) < 23.5;
  SITES[key] = {key,name:`${region}, ${country}`,region,country,lat,lon,elev,Tg,Tmax,P,Pcv,GWET,SW,wind,heavy,frost,
    frac: tropical && P < 1100 ? .72 : 0, base:BASES[b][0], baseName:BASES[b][1]};
}

// Coeficientes simplificados y relativos por cultivo.
// need: agua por ciclo (mm) · To/Tr: T óptima y amplitud · dt/ht/ft: tolerancia sequía/calor/helada (0–1)
// nfix/ndem: kg N/ha fijado / demandado · cov: protección del suelo · res: residuo · till: perturbación
// inc: índice relativo de ingreso (0–1) · cool: cultivo de estación fresca · cover: cultivo de cobertura/abono verde
const CROPS = {
  maiz:{n:'Maíz',c:'#f2c94c',need:550,To:23,Tr:11,dt:.35,ht:.5,ft:.1,nfix:0,ndem:150,cov:.6,res:.8,till:.4,fam:'Poáceas',inc:.7,ph:[5.5,7.5]},
  frijol:{n:'Frijol',c:'#e07a5f',need:350,To:21,Tr:7,dt:.4,ht:.35,ft:.05,nfix:50,ndem:30,cov:.5,res:.3,till:.4,fam:'Leguminosas',inc:.75,ph:[5.8,7.5]},
  sorgo:{n:'Sorgo',c:'#c9733c',need:400,To:28,Tr:9,dt:.8,ht:.85,ft:.05,nfix:0,ndem:100,cov:.6,res:.85,till:.35,fam:'Poáceas',inc:.55,ph:[5.5,8.2]},
  trigo:{n:'Trigo',c:'#e8d58a',need:450,To:16,Tr:6,dt:.45,ht:.25,ft:.7,nfix:0,ndem:120,cov:.6,res:.7,till:.35,fam:'Poáceas',inc:.6,ph:[6,7.8],cool:1},
  soya:{n:'Soya',c:'#9bd16b',need:500,To:25,Tr:7,dt:.4,ht:.5,ft:.05,nfix:80,ndem:20,cov:.55,res:.4,till:.3,fam:'Leguminosas',inc:.7,ph:[6,7.5]},
  girasol:{n:'Girasol',c:'#ffd23f',need:420,To:23,Tr:8,dt:.7,ht:.7,ft:.2,nfix:0,ndem:70,cov:.45,res:.5,till:.35,fam:'Asteráceas',inc:.6,ph:[6,7.8],tex:{arcilloso:.9},wet:.3},
  papa:{n:'Papa',c:'#a78bfa',need:500,To:16,Tr:5,dt:.25,ht:.15,ft:.2,nfix:0,ndem:160,cov:.4,res:.2,till:.9,fam:'Solanáceas',inc:.95,ph:[5,6.8],cool:1,tex:{arcilloso:.8}},
  haba:{n:'Haba',c:'#7bc8a4',need:350,To:15,Tr:5,dt:.35,ht:.15,ft:.6,nfix:60,ndem:20,cov:.5,res:.4,till:.4,fam:'Leguminosas',inc:.6,ph:[6,7.8],cool:1},
  mani:{n:'Maní',c:'#d4a373',need:450,To:27,Tr:6,dt:.6,ht:.7,ft:0,nfix:70,ndem:20,cov:.5,res:.3,till:.7,fam:'Leguminosas',inc:.7,ph:[5.5,7],tex:{arcilloso:.75,arenoso:1.05},wet:.35},
  ajonjoli:{n:'Ajonjolí',c:'#f4a261',need:350,To:28,Tr:6,dt:.8,ht:.9,ft:0,nfix:0,ndem:50,cov:.35,res:.4,till:.4,fam:'Pedaliáceas',inc:.55,ph:[5.5,8],wet:.4},
  avena:{n:'Avena (cobertura)',c:'#a3d9a5',need:380,To:15,Tr:6,dt:.45,ht:.2,ft:.7,nfix:0,ndem:50,cov:.85,res:.8,till:.2,fam:'Poáceas',inc:.3,ph:[5,7.5],cool:1,cover:1},
  mucuna:{n:'Mucuna (abono verde)',c:'#2ec4b6',need:400,To:26,Tr:7,dt:.6,ht:.7,ft:0,nfix:120,ndem:0,cov:.95,res:.9,till:.1,fam:'Leguminosas',inc:.08,ph:[4.8,7.5],cover:1,trop:1},
  canavalia:{n:'Canavalia (abono verde)',c:'#00b4d8',need:330,To:26,Tr:8,dt:.8,ht:.8,ft:0,nfix:100,ndem:0,cov:.9,res:.8,till:.1,fam:'Leguminosas',inc:.08,ph:[4.5,8],cover:1,trop:1},
  vicia:{n:'Vicia + centeno (cobertura)',c:'#80ed99',need:300,To:13,Tr:6,dt:.5,ht:.15,ft:.85,nfix:70,ndem:20,cov:.9,res:.85,till:.1,fam:'Mezcla',inc:.1,ph:[5.5,7.8],cool:1,cover:1},
  quinua:{n:'Quinua',c:'#e9c46a',need:300,To:12,Tr:6,dt:.8,ht:.3,ft:.8,nfix:0,ndem:60,cov:.45,res:.4,till:.4,fam:'Amarantáceas',inc:.85,ph:[5.5,8.5],cool:1,andino:1,wet:.5},
  cebada:{n:'Cebada',c:'#c8b273',need:350,To:14,Tr:6,dt:.55,ht:.25,ft:.7,nfix:0,ndem:80,cov:.6,res:.7,till:.35,fam:'Poáceas',inc:.55,ph:[6,8.3],cool:1},
  tarwi:{n:'Tarwi (lupino andino)',c:'#7dd3fc',need:350,To:13,Tr:6,dt:.6,ht:.25,ft:.6,nfix:100,ndem:10,cov:.55,res:.5,till:.4,fam:'Leguminosas',inc:.5,ph:[5,7.5],cool:1,andino:1},
  caupi:{n:'Caupí (frijol de costa)',c:'#ef8354',need:300,To:28,Tr:7,dt:.85,ht:.85,ft:0,nfix:60,ndem:15,cov:.6,res:.4,till:.4,fam:'Leguminosas',inc:.5,ph:[5.5,7.5],wet:.25},
  barbecho:{n:'Barbecho',c:'#6b5844',need:0,To:20,Tr:99,dt:1,ht:1,ft:1,nfix:0,ndem:0,cov:.15,res:.1,till:.5,fam:'—',inc:0,ph:[3,10]}
};
for (const k in CROPS) CROPS[k].id = k;
// Patrón mensual típico de lluvia por régimen (fracción del total anual, ene→dic). Aproximación; con NASA POWER en vivo se usan los valores mensuales reales.
const REG = {
  ca:[.005,.005,.01,.03,.12,.18,.10,.11,.20,.16,.05,.03],          // Pacífico centroamericano, con canícula
  caw:[.04,.03,.02,.03,.08,.14,.12,.11,.15,.14,.08,.06],           // vertiente atlántica / Petén
  mx:[.01,.01,.01,.01,.04,.17,.25,.23,.17,.06,.02,.02],            // monzón mexicano
  carib:[.04,.04,.04,.06,.12,.10,.07,.09,.12,.14,.10,.08],         // Antillas
  andesN:[.04,.05,.09,.13,.12,.06,.04,.04,.07,.14,.13,.09],        // Andes del norte, bimodal
  llanos:[.01,.02,.04,.10,.14,.14,.13,.12,.11,.10,.06,.03],        // Llanos del Orinoco
  andesS:[.20,.18,.14,.06,.02,.01,.01,.02,.04,.07,.10,.15],        // Andes centrales y Altiplano
  costaEc:[.18,.26,.26,.14,.04,.02,.01,.01,.01,.02,.02,.03],       // costa de Ecuador y norte de Perú
  cerrado:[.18,.16,.15,.07,.02,.005,.005,.01,.04,.09,.13,.14],     // Cerrado, Chaco, Santa Cruz
  nordeste:[.13,.17,.22,.18,.07,.03,.02,.01,.01,.02,.05,.09],      // semiárido brasileño
  sur:[.09,.09,.09,.09,.08,.07,.07,.07,.08,.10,.09,.08],           // sur de Brasil, Uruguay, Paraguay oriental
  pampa:[.11,.11,.12,.10,.07,.04,.04,.04,.06,.10,.11,.10],
  medit:[.01,.01,.02,.05,.15,.22,.20,.14,.08,.06,.04,.02],         // Chile central
  ocean:[.04,.04,.05,.08,.14,.15,.14,.11,.08,.07,.06,.04],         // sur de Chile
  plains:[.04,.04,.06,.06,.12,.14,.11,.12,.12,.10,.05,.04]         // Llanuras Altas de EE. UU.
};
const SITE_REG = {altiplano:'ca',corredor:'ca',costasur:'ca',peten:'caw',bajio:'mx',sinaloa:'mx',frailesca:'ca',yucatan:'mx',oaxaca:'mx',chihuahua:'mx',
  sanmiguel:'ca',choluteca:'ca',olancho:'ca',esteli:'ca',leon:'ca',guanacaste:'ca',azuero:'ca',cibao:'carib',artemisa:'carib',hinche:'carib',
  valle:'andesN',boyaca:'andesN',llanos:'llanos',portuguesa:'llanos',manabi:'costaEc',riobamba:'andesN',piura:'costaEc',mantaro:'andesS',puno:'andesS',oruro:'andesS',
  santacruz:'cerrado',sorriso:'cerrado',londrina:'sur',petrolina:'nordeste',passofundo:'sur',itapua:'sur',chaco:'cerrado',pampa:'pampa',cordoba:'pampa',tucuman:'pampa',
  paysandu:'sur',talca:'medit',temuco:'ocean',ogallala:'plains'};
// Tendencia de agua subterránea (0 = estable, 1 = fuerte descenso). Referencia cualitativa inspirada en GRACE/GRACE-FO; verificar con datos locales.
const SITE_GW = {ogallala:.85,chihuahua:.75,bajio:.75,sinaloa:.4,piura:.45,talca:.35,petrolina:.3,oaxaca:.3,cordoba:.2,tucuman:.25,santacruz:.2,yucatan:.15};
for (const k in SITES){ SITES[k].reg = SITE_REG[k] || 'ca'; SITES[k].gw = SITE_GW[k] || .1; }

// Información complementaria por cultivo: valor forrajero (0–1), profundidad de raíz y riesgos para revisar localmente
const CROP_EXTRA = {
  maiz:{fo:.6,root:'media',risk:'gusano cogollero y mancha de asfalto; sensible a sequía en floración'},
  frijol:{fo:.3,root:'superficial',risk:'mosca blanca (mosaico dorado) y lluvias en cosecha'},
  sorgo:{fo:.8,root:'profunda',risk:'pulgón amarillo y aves en el grano'},
  trigo:{fo:.5,root:'media',risk:'royas y fusariosis si llueve en la espigazón'},
  soya:{fo:.3,root:'media',risk:'roya asiática; necesita inoculante y un comprador de acopio'},
  girasol:{fo:.3,root:'profunda',risk:'aves y pudrición del capítulo con lluvias en madurez'},
  papa:{fo:.1,root:'superficial',risk:'tizón tardío y gorgojo; remueve mucho el suelo y usa muchos insumos'},
  haba:{fo:.5,root:'media',risk:'mancha chocolate con humedad y heladas en floración'},
  mani:{fo:.6,root:'media',risk:'hay que arrancar y secar la cosecha (mano de obra o equipo); aflatoxinas si se moja'},
  ajonjoli:{fo:.1,root:'profunda',risk:'mercado de exportación exigente en calidad; las cápsulas se abren si se atrasa la cosecha'},
  avena:{fo:.9,root:'media',risk:'compite por agua si la temporada viene seca'},
  mucuna:{fo:.5,root:'media',risk:'puede trepar y volverse invasora; la semilla es tóxica sin procesar'},
  canavalia:{fo:.3,root:'profunda',risk:'semilla tóxica sin procesar; no sirve como forraje principal'},
  vicia:{fo:.8,root:'media',risk:'hay que terminarla a tiempo para que no compita con el cultivo siguiente'},
  quinua:{fo:.3,root:'profunda',risk:'mildiu con humedad; precio variable; requiere quitar la saponina'},
  cebada:{fo:.7,root:'media',risk:'mancha en red; la cebada maltera tiene exigencias de calidad'},
  tarwi:{fo:.2,root:'profunda',risk:'el grano es amargo y necesita desamargado; antracnosis'},
  caupi:{fo:.6,root:'profunda',risk:'gorgojo en almacenamiento; mercado local más pequeño que el del frijol'},
  barbecho:{fo:.2,root:'—',risk:'suelo expuesto a erosión y malezas'}
};
for (const k in CROPS) Object.assign(CROPS[k], CROP_EXTRA[k]||{fo:.3,root:'media',risk:''});

const SCEN = {
  actual:{dT:0,dP:0,lbl:'Clima actual'},
  moderado:{dT:1,dP:-5,lbl:'Calentamiento moderado'},
  severo:{dT:2,dP:-15,lbl:'Calentamiento severo'}
};
function scen(){
  const cv = 1 + .15*S.dT + Math.max(0,-S.dP)/100;
  const lbl = S.scen==='custom' ? `Personalizado (${S.dT>0?'+':''}${S.dT} °C, ${S.dP>0?'+':''}${S.dP} % lluvia)` : SCEN[S.scen].lbl;
  return {dT:S.dT, dP:S.dP/100, cv, lbl};
}
const IRR = {none:0,limited:150,full:400};
