'use strict';
const express=require('express');
const http=require('http');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const {Server}=require('socket.io');
const {Pool}=require('pg');
const nodemailer=require('nodemailer');

const PORT=Number(process.env.PORT||3000);
const OWNER_USERNAME=process.env.OWNER_USERNAME||'Erki';
const OWNER_PASSWORD=process.env.OWNER_PASSWORD||'';
const TOKEN_SECRET=process.env.TOKEN_SECRET||crypto.randomBytes(32).toString('hex');
const DATABASE_URL=process.env.DATABASE_URL||'';
const SAVE_SCHEMA_VERSION=4;
const AUTO_PERSIST_DIR=fs.existsSync('/var/data')?'/var/data':'./data';
const DATA_DIR=path.resolve(process.env.DATA_DIR||AUTO_PERSIST_DIR);
const SMTP_HOST=process.env.SMTP_HOST||'';
const SMTP_PORT=Number(process.env.SMTP_PORT||587);
const SMTP_USER=process.env.SMTP_USER||'';
const SMTP_PASS=process.env.SMTP_PASS||'';
const SMTP_FROM=process.env.SMTP_FROM||'';
const RESEND_API_KEY=process.env.RESEND_API_KEY||'';
const EMAIL_FROM=process.env.EMAIL_FROM||SMTP_FROM||'';
const PUBLIC_URL=(process.env.PUBLIC_URL||'').replace(/\/$/,'');
fs.mkdirSync(DATA_DIR,{recursive:true});
const DB_FILE=path.join(DATA_DIR,'db.json');

// V6.47 — maffia ja turva level 1→300 nominaalne kogukulu ~30 triljonit € kummalgi.
// Mõlemad kasutavad sama hinnakõverat; olemasolevad levelid ei muutu.
const LEVEL_PRICES={};
const LEVEL_TOTAL_TARGET=30_000_000_000_000;
const LEVEL_FIRST_PRICE=16_000; // lvl 1 -> 2
const LEVEL_GROWTH=1.064205059898804;
for(let l=2;l<=300;l++){
  LEVEL_PRICES[l]=Math.max(1000,Math.round((LEVEL_FIRST_PRICE*Math.pow(LEVEL_GROWTH,l-2))/1000)*1000);
}
// Ümardusest tekkiv vahe korrigeeritakse lvl 300 hinnas, et summa oleks täpselt 30T baasturul.
{
  const current=Object.values(LEVEL_PRICES).reduce((a,b)=>a+b,0);
  LEVEL_PRICES[300]+=LEVEL_TOTAL_TARGET-current;
}
// V6.48 — kinnisvara lvl 1→100 nominaalne kogukulu 30 triljonit € baasturul.
// Olemasolev propertyLevel jääb puutumata; muutub ainult järgmise leveli ostuhind.
const PROPERTY_TOTAL_TARGET=30_000_000_000_000;
const PROPERTY_FIRST_PRICE=50_000;
const PROPERTY_GROWTH=1.2047406172609958;
const PROPERTY_PRICES=Array.from({length:101},()=>0);
for(let l=1;l<=100;l++){
  PROPERTY_PRICES[l]=Math.max(1000,Math.round((PROPERTY_FIRST_PRICE*Math.pow(PROPERTY_GROWTH,l-1))/1000)*1000);
}
{
  const current=PROPERTY_PRICES.reduce((a,b)=>a+b,0);
  PROPERTY_PRICES[100]+=PROPERTY_TOTAL_TARGET-current;
}

const PROPERTY_NAMES=['Puudub',
'Vana puukuur','Niiske keldriboks','Mahajäetud garaaž','Külm soojak','Äärelinna urgas','Vana ühikatuba','Keldrikorruse punker','Väsinud paneelika tuba','Renoveerimata ühetoaline','Odav äärelinna korter',
'Vana kahetoaline','Remondiootel korter','Korralik ühetoaline','Tagasihoidlik kahetoaline','Kolmetoaline paneelikas','Renoveeritud kahetoaline','Väike linnakorter','Korralik kolmetoaline','Uusarenduse stuudio','Uusarenduse kahetoaline',
'Kesklinna kahetoaline','Kesklinna kolmetoaline','Suur neljatoaline','Rõduga linnakorter','Katusekorter','Väike ridaelamu','Ridaelamu aiaga','Äärelinna maja','Renoveeritud eramaja','Uus eramaja',
'Suur pereelamu','Maja suure aiaga','Kahekorruseline maja','Linnalähedane villa','Moodne villa','Järveäärne maja','Merevaatega korter','Luksuskorter','Kesklinna penthouse','Väike mõisamaja',
'Renoveeritud mõisamaja','Mereäärne villa','Metsavilla','Eksklusiivne penthouse','Katusevilla','Luksuslik eramukompleks','Privaatse basseiniga villa','Rannavilla','Disainvilla','Väike häärber',
'Häärber','Suur häärber','Ajalooline mõis','Renoveeritud mõis','Luksusmõis','Mereäärne mõis','Privaatne residents','Valvega residents','Miljonäri residents','Mägivilla',
'Privaatne rannakompleks','Luksuslik maamõis','Kesklinna tornikorter','Pilvelõhkuja penthouse','Privaatne jahisadama villa','Mereäärne palee','Suur residentsipark','Kinnine luksuskompleks','Väike erasaare villa','Erasaare residents',
'Privaatne saar','Kahe villaga erasaar','Luksuslik kuurortsaar','Suur eravaldus','Ajalooline loss','Renoveeritud loss','Mereäärne loss','Mägiloss','Privaatne palee','Suurlinna palee',
'Rahvusvaheline residents','Miljardäri villa','Miljardäri penthouse','Miljardäri mõis','Miljardäri saar','Superjahtidega eravaldus','Privaatne luksuskuurort','Saarte kompleks','Mitme mõisaga valdus','Kuninglik residents',
'Kuninglik palee','Mandrisuurune eravaldus','Luksusimpeeriumi peakorter','Varjuriigi residents','Varjuriigi kindlus','Varjuriigi loss','Varjuriigi luksuskompleks','Varjuriigi erasaar','Varjuriigi kuninglik valdus','VARJURIIGI PALEE'];
const CITIES=[['Paide','Ehitus +8%'],['Tallinn','Autopood +10%'],['Tartu','Haridus -10% käike'],['Pärnu','Turism +10%'],['Rakvere','Põllumajandus +8%'],['Viljandi','Põllumajandus +10%'],['Võru','Ehitus +6%'],['Haapsalu','Turism +8%'],['Narva','Kaubandus +8%'],['Kuressaare','Turism +15%'],['Jõgeva','Põllumajandus +6%'],['Valga','Logistika +8%']];
const WEAPONS=[
{name:'Rusikad',price:0,atk:0,def:0,score:0},
{name:'Nuga',price:6000,atk:18,def:14,score:40},
{name:'Püstol',price:14000,atk:55,def:32,score:90},
{name:'SMG',price:26000,atk:120,def:75,score:180},
{name:'Ründerelv',price:42000,atk:230,def:150,score:320},
{name:'Täpsuspüss',price:62000,atk:380,def:110,score:480},
{name:'Raskekuulipilduja',price:76000,atk:560,def:430,score:700},
{name:'Sõjaväe arsenal',price:88000,atk:850,def:720,score:1000}];
const CRIMES=[
{id:'shop',name:'Väikepood',turns:30,min:9000,max:30000,risk:.08,need:1},{id:'car',name:'Autovargus',turns:30,min:50000,max:180000,risk:.14,need:3},{id:'warehouse',name:'Ladu',turns:30,min:250000,max:900000,risk:.22,need:8},{id:'bank',name:'Pangarööv',turns:30,min:2200000,max:9000000,risk:.32,need:18},{id:'casino',name:'Kasiino',turns:30,min:16000000,max:35000000,risk:.42,need:35},{id:'armored',name:'Soomusauto',turns:30,min:45000000,max:77000000,risk:.50,need:60},{id:'state',name:'Riiklik varakamber',turns:30,min:98000000,max:155000000,risk:.58,need:100}];




// V6.37 — klubide skoor liidetakse päriselt omaniku mängijaskoori sisse. Kõik V6.36 funktsioonid jäävad alles.
const NIGHT_TAX=.24, NIGHT_WITHDRAW_FEE=.08, NIGHT_DAY_MS=86400000, NIGHT_MAX_OPEN_MS=12*3600000;
const NIGHT_PREMISES=[
{id:'paide120',name:'Paide kesklinna keldripind',city:'Paide',area:120,cost:12000000},
{id:'vandra180',name:'Vändra vana kõrtsipind',city:'Vändra',area:180,cost:150000000},
{id:'antsla220',name:'Antsla peosaal',city:'Antsla',area:220,cost:175000000},
{id:'voru280',name:'Võru vanalinna baaripind',city:'Võru',area:280,cost:220000000},
{id:'rapina340',name:'Räpina jõeäärne baaripind',city:'Räpina',area:340,cost:280000000},
{id:'torva420',name:'Tõrva vana kultuurimaja',city:'Tõrva',area:420,cost:330000000},
{id:'jogeva520',name:'Jõgeva endine peosaal',city:'Jõgeva',area:520,cost:420000000},
{id:'mustvee650',name:'Mustvee järveäärne peokoht',city:'Mustvee',area:650,cost:470000000},
{id:'tartu850',name:'Tartu kesklinna klubihoone',city:'Tartu',area:850,cost:950000000},
{id:'parnu1100',name:'Pärnu rannarajooni peokoht',city:'Pärnu',area:1100,cost:2200000000},
{id:'tallinn1600',name:'Tallinna vanalinna suur klubi',city:'Tallinn',area:1600,cost:6500000000},
{id:'tallinn2500',name:'Tallinna sadama megaklubi',city:'Tallinn',area:2500,cost:19000000000,max:true}
];
const NIGHT_TYPES={bar:{name:'Baar',icon:'🍺',factor:.86},club:{name:'Ööklubi',icon:'🎧',factor:1.25},strip:{name:'Striptiisiklubi',icon:'💃',factor:1.42}};
const NIGHT_SHOP=[
{id:'table',name:'Laud',price:150000,kind:'furniture',m2:2,appeal:1.1,capacity:4,durability:100},
{id:'chair',name:'Tool',price:40000,kind:'furniture',m2:.9,appeal:.18,capacity:1,durability:100},
{id:'barstool',name:'Baaripukk',price:65000,kind:'furniture',m2:.6,appeal:.28,capacity:1,durability:100},
{id:'sofa',name:'Diivan',price:420000,kind:'furniture',m2:5,appeal:2.4,capacity:5,durability:100},
{id:'vipbooth',name:'VIP-boks',price:1450000,kind:'furniture',m2:12,appeal:8,capacity:8,durability:100},
{id:'barcounter',name:'Baarilett',price:1800000,kind:'facility',m2:10,appeal:6,capacity:0,durability:100},
{id:'stage',name:'Lava',price:3200000,kind:'facility',m2:22,appeal:12,capacity:0,durability:100,types:['strip','club']},
{id:'private',name:'Privaatruum',price:2600000,kind:'facility',m2:15,appeal:10,capacity:4,durability:100,types:['strip']},
{id:'dressing',name:'Riietusruum',price:1300000,kind:'facility',m2:10,appeal:5,capacity:0,durability:100,types:['strip']},
{id:'speaker2',name:'2 kW kõlar',price:650000,kind:'audio',m2:.7,power:2,appeal:1,durability:100},
{id:'speaker5',name:'5 kW kõlar',price:1450000,kind:'audio',m2:.8,power:5,appeal:3,durability:100},
{id:'speaker10',name:'10 kW kõlar',price:3200000,kind:'audio',m2:1,power:10,appeal:7,durability:100},
{id:'sub',name:'Subwoofer 4 kW',price:1100000,kind:'audio',m2:1,power:4,appeal:2,durability:100},
{id:'djbasic',name:'DJ pult Basic',price:3900000,kind:'audio',m2:1.7,power:1,appeal:8,durability:100},
{id:'djpro',name:'DJ pult Pro',price:13500000,kind:'audio',m2:2,power:2,appeal:20,durability:100},
{id:'lights',name:'Valguspark',price:2800000,kind:'audio',m2:.5,power:1,appeal:10,durability:100},
{id:'laser',name:'Laser + efektid',price:7500000,kind:'audio',m2:.5,power:1,appeal:18,durability:100}
];
const NIGHT_SECURITY=['Põhjala Turva','Öövaht Security','K9 Guard','Nordic Shield','Linnakaitse Grupp'];
const NIGHT_ALCOHOL=['Põhjala Joogid','BaltDrink','Õlleladu','Nordic Beverages','Vanalinna Veiniladu'];
const NIGHT_FOOD=['GastroTrade','KöögiLadu','Baltic Food Supply','Värske Kraam','Õhtu Köök'];
const NIGHT_BUILDERS=['Ehitus24','NordBuild','KiirRemont','ProProjekt Ehitus','VanaLinna Ehitus'];
const NIGHT_NAMES_M=['Martin','Rasmus','Karl','Siim','Tanel','Kaur','Hendrik','Priit','Rain','Joonas','Kristjan','Marek','Marko','Andres','Sander','Mihkel','Rauno','Taavi','Erik','Henri','Kaspar','Kevin','Sten','Madis'];
const NIGHT_NAMES_F=['Laura','Sandra','Kristi','Liis','Kertu','Grete','Maria','Anette','Helena','Triin','Karoliina','Merilin','Kadri','Kristina','Maarja','Elina','Katrin','Annika','Kätlin','Gerli','Birgit','Maris','Helen','Evelin'];
const NIGHT_HAIR=['blond','brünett','must','punane','helepruun','tumepruun'];
const NIGHT_CUPS=['A','B','C','D','E'];
const NIGHT_GUESTS={
 bar:[{id:'band1',name:'Õhtu Tähed',kind:'süldibänd',fee:9000000,pull:1.18},{id:'band2',name:'Kuldne Reede',kind:'rahvabänd',fee:24000000,pull:1.38},{id:'band3',name:'Vana Kooli Legendid',kind:'suur live-bänd',fee:65000000,pull:1.65}],
 club:[{id:'dj1',name:'DJ Rasmus V',kind:'DJ',fee:14000000,pull:1.22},{id:'dj2',name:'DJ Helix',kind:'tuntud DJ',fee:42000000,pull:1.48},{id:'dj3',name:'DJ Northstar',kind:'super-DJ',fee:120000000,pull:1.82}],
 strip:[{id:'star1',name:'Laura Velvet',kind:'18+ külalisesineja',fee:18000000,pull:1.25},{id:'star2',name:'Sandra Royale',kind:'tuntud 18+ esineja',fee:52000000,pull:1.52},{id:'star3',name:'Maria Diamond',kind:'18+ staaresineja',fee:145000000,pull:1.88}]
};
const NIGHT_BLACK_ITEMS=[{id:'ant',name:'ANT',buy:180000,sell:300000},{id:'kok',name:'KOK',buy:620000,sell:1100000},{id:'jupp',name:'JUPP',buy:1250000,sell:2400000}];
const NIGHT_DONATIONS=[{id:'animals',name:'Loomade varjupaik'},{id:'children',name:'Lastefond'},{id:'homeless',name:'Kodutute abikeskus'},{id:'rescue',name:'Päästjate toetusfond'},{id:'nature',name:'Looduskaitsefond'}];
const SLOT_SYMBOLS=['7️⃣','👑','💎','💰','🚗','🔫','🍀','🕶️'];
function slotOutcome(){
  // ~94% theoretical RTP: 0.2%×50 + 1%×15 + 4%×5 + 12%×2 + 25%×1.
  const r=crypto.randomInt(0,10000);
  if(r<20)return{mult:50,reels:['7️⃣','7️⃣','7️⃣'],label:'JACKPOT'};
  if(r<120)return{mult:15,reels:['👑','👑','👑'],label:'Suur võit'};
  if(r<520)return{mult:5,reels:['💎','💎','💎'],label:'Võit'};
  if(r<1720){const x=SLOT_SYMBOLS[crypto.randomInt(3,SLOT_SYMBOLS.length)];let y=x;while(y===x)y=SLOT_SYMBOLS[crypto.randomInt(0,SLOT_SYMBOLS.length)];return{mult:2,reels:[x,x,y],label:'Väike võit'}}
  if(r<4220){let a=SLOT_SYMBOLS[crypto.randomInt(0,SLOT_SYMBOLS.length)],b=SLOT_SYMBOLS[crypto.randomInt(0,SLOT_SYMBOLS.length)],c=SLOT_SYMBOLS[crypto.randomInt(0,SLOT_SYMBOLS.length)];return{mult:1,reels:[a,b,c],label:'Panus tagasi'}}
  let a,b,c;do{a=SLOT_SYMBOLS[crypto.randomInt(0,SLOT_SYMBOLS.length)];b=SLOT_SYMBOLS[crypto.randomInt(0,SLOT_SYMBOLS.length)];c=SLOT_SYMBOLS[crypto.randomInt(0,SLOT_SYMBOLS.length)]}while(a===b&&b===c);return{mult:0,reels:[a,b,c],label:'Kaotus'}
}

const EDU=[
{name:'Puudub',needTurns:0,bank:1000000},{name:'Algkool',needTurns:9000,bank:10000000},{name:'Põhikool',needTurns:14000,bank:50000000},{name:'Gümnaasium',needTurns:22000,bank:250000000},{name:'Bakalaureus',needTurns:40000,bank:5000000000},{name:'Magister',needTurns:65000,bank:100000000000},{name:'Doktor',needTurns:100000,bank:1000000000000}
];
const BIZ=[{id:'farm',name:'Põllumajandus',base:250000,income:18000,city:'Rakvere'},{id:'construction',name:'Ehitusfirma',base:600000,income:42000,city:'Paide'},{id:'restaurant',name:'Restoran',base:1000000,income:65000,city:'Pärnu'},{id:'logistics',name:'Logistikafirma',base:2500000,income:130000,city:'Valga'},{id:'security',name:'Turvafirma',base:7000000,income:310000,city:'Tallinn'}];
const BUSINESS_PROJECTS={
farm:[{id:'grain',name:'Teraviljasaak',hours:4,turns:55,workers:2,costMult:.28,rewardMult:1.55},{id:'potato',name:'Kartulipõld',hours:6,turns:75,workers:4,costMult:.42,rewardMult:1.7},{id:'harvest',name:'Suur koristus',hours:8,turns:120,workers:8,costMult:.7,rewardMult:1.9}],
construction:[{id:'repair',name:'Korteriremont',hours:2,turns:45,workers:3,costMult:.3,rewardMult:1.5},{id:'house',name:'Eramaja ehitus',hours:5,turns:90,workers:8,costMult:.58,rewardMult:1.72},{id:'industrial',name:'Tööstusobjekt',hours:8,turns:150,workers:15,costMult:1,rewardMult:1.95}],
restaurant:[{id:'lunch',name:'Lõunavahetus',hours:2,turns:35,workers:3,costMult:.22,rewardMult:1.45},{id:'event',name:'Eraüritus',hours:4,turns:65,workers:6,costMult:.45,rewardMult:1.68},{id:'banquet',name:'Suur bankett',hours:7,turns:110,workers:10,costMult:.72,rewardMult:1.85}],
logistics:[{id:'local',name:'Kohalik vedu',hours:2,turns:40,workers:2,costMult:.3,rewardMult:1.5},{id:'baltic',name:'Balti vedu',hours:5,turns:85,workers:5,costMult:.6,rewardMult:1.75},{id:'europe',name:'Euroopa ekspress',hours:8,turns:140,workers:9,costMult:.95,rewardMult:1.95}],
security:[{id:'club',name:'Klubi valve',hours:2,turns:35,workers:3,costMult:.25,rewardMult:1.45},{id:'site',name:'Objekti valve',hours:5,turns:75,workers:7,costMult:.52,rewardMult:1.68},{id:'vip',name:'VIP turvamine',hours:8,turns:125,workers:12,costMult:.82,rewardMult:1.9}]};
const CAR_LICENSES=[{level:1,name:'Tavaautod',cost:500000,min:80000,max:450000},{level:2,name:'Premium',cost:6000000,min:700000,max:3500000},{level:3,name:'Sport',cost:45000000,min:5000000,max:22000000},{level:4,name:'Superautod',cost:450000000,min:50000000,max:240000000}];
const LAB_MATERIALS={plant:{name:'Kasvatusmaterjal',price:1050},chem:{name:'Töötlusmaterjal',price:1700},pack:{name:'Pakend',price:300}};
const LAB_CAPACITY=[0,50,100,200,350,550,800,1200,1750,2500,3500];
const LAB_CAPACITY_COST=[0,0,150000,350000,750000,1500000,3000000,6000000,12000000,25000000,50000000];
const LAB_SELL_PRICE=5100;
const CAR_OPTIONS={
1:[
{id:'used',name:'Volkswagen Golf VII',brand:'Volkswagen',model:'Golf VII',engine:'1.6 TDI',power:'81 kW',year:2014,mileage:'248 000 km',fuel:'Diisel',drivetrain:'Esivedu',price:18000,quality:'Kasutatud'},
{id:'basic',name:'Škoda Octavia III',brand:'Škoda',model:'Octavia III',engine:'2.0 TDI',power:'110 kW',year:2017,mileage:'176 000 km',fuel:'Diisel',drivetrain:'Esivedu',price:32000,quality:'Korralik'},
{id:'newer',name:'Toyota Corolla',brand:'Toyota',model:'Corolla',engine:'1.8 Hybrid',power:'90 kW',year:2021,mileage:'82 000 km',fuel:'Hübriid',drivetrain:'Esivedu',price:45000,quality:'Hea'}],
2:[
{id:'used',name:'BMW 530d F10',brand:'BMW',model:'530d F10',engine:'3.0 R6 diisel',power:'190 kW',year:2014,mileage:'265 000 km',fuel:'Diisel',drivetrain:'Tagavedu',price:65000,quality:'Kasutatud'},
{id:'good',name:'Audi A6 C8',brand:'Audi',model:'A6 C8',engine:'3.0 TDI V6',power:'210 kW',year:2019,mileage:'142 000 km',fuel:'Diisel',drivetrain:'Quattro',price:85000,quality:'Korralik'},
{id:'lux',name:'Mercedes-Benz S 450',brand:'Mercedes-Benz',model:'S 450',engine:'3.0 R6 bensiin',power:'270 kW',year:2021,mileage:'71 000 km',fuel:'Bensiin',drivetrain:'4MATIC',price:115000,quality:'Väga hea'}],
3:[
{id:'used',name:'BMW M4 F82',brand:'BMW',model:'M4 F82',engine:'3.0 BiTurbo R6',power:'317 kW',year:2016,mileage:'128 000 km',fuel:'Bensiin',drivetrain:'Tagavedu',price:135000,quality:'Kasutatud'},
{id:'good',name:'Porsche 911 Carrera S',brand:'Porsche',model:'911 Carrera S',engine:'3.0 Twin-Turbo',power:'331 kW',year:2019,mileage:'68 000 km',fuel:'Bensiin',drivetrain:'Tagavedu',price:190000,quality:'Korralik'},
{id:'top',name:'Audi R8 V10 Performance',brand:'Audi',model:'R8 V10 Performance',engine:'5.2 V10',power:'456 kW',year:2021,mileage:'34 000 km',fuel:'Bensiin',drivetrain:'Quattro',price:260000,quality:'Väga hea'}],
4:[
{id:'used',name:'Lamborghini Huracán',brand:'Lamborghini',model:'Huracán',engine:'5.2 V10',power:'449 kW',year:2017,mileage:'51 000 km',fuel:'Bensiin',drivetrain:'Nelikvedu',price:1350000,quality:'Kasutatud'},
{id:'good',name:'Ferrari 812 Superfast',brand:'Ferrari',model:'812 Superfast',engine:'6.5 V12',power:'588 kW',year:2020,mileage:'22 000 km',fuel:'Bensiin',drivetrain:'Tagavedu',price:650000,quality:'Korralik'},
{id:'elite',name:'Bugatti Chiron',brand:'Bugatti',model:'Chiron',engine:'8.0 W16 Quad-Turbo',power:'1103 kW',year:2021,mileage:'8 000 km',fuel:'Bensiin',drivetrain:'Nelikvedu',price:1200000,quality:'Väga hea'}]
};
const JOBS={
0:[{id:'odd',name:'Juhutööline',pay:200000}],
1:[{id:'stones',name:'Kivide korjaja põllul',pay:300000},{id:'berries',name:'Maasikakorjaja',pay:450000},{id:'helper',name:'Talutöö abiline',pay:600000},{id:'yard',name:'Hooajatööline',pay:750000}],
2:[{id:'factory',name:'Tehasetööline',pay:750000},{id:'warehouse',name:'Laotööline',pay:1350000},{id:'operator',name:'Tootmisoperaator',pay:2000000},{id:'foreman',name:'Vahetuse vanem',pay:2750000}],
3:[{id:'sales',name:'Müügiesindaja',pay:2750000},{id:'technician',name:'Tehnik',pay:4250000},{id:'dispatcher',name:'Logistik',pay:5750000},{id:'supervisor',name:'Tootmisjuht',pay:7500000}],
4:[{id:'specialist',name:'Spetsialist',pay:7500000},{id:'engineer',name:'Insener',pay:11500000},{id:'manager',name:'Projektijuht',pay:15500000},{id:'director',name:'Osakonnajuht',pay:20000000}],
5:[{id:'senior',name:'Vanemspetsialist',pay:20000000},{id:'lead',name:'Juhtivinsener',pay:28000000},{id:'executive',name:'Tegevjuht',pay:36000000},{id:'consultant',name:'Tippkonsultant',pay:45000000}],
6:[{id:'researcher',name:'Teadur',pay:45000000},{id:'chief',name:'Peaspetsialist',pay:60000000},{id:'professor',name:'Professor',pay:80000000},{id:'expert',name:'Rahvusvaheline ekspert',pay:100000000}]
};
const SALARY_INTERVAL=15*60000;
const GAME_TICK_MS=15*60000;
function jobFor(u,id=u.jobId){
  if(!id)return null;
  // V6.76: olemasolev töökoht jääb kehtima ka pärast haridustaseme tõstmist.
  // Otsime töökohta kõigist haridustasemetest kuni mängija praeguse tasemeni,
  // et palgaarvestus ei katkeks vaikides pärast hariduse uuendamist.
  for(let lvl=Math.max(0,Number(u.education)||0);lvl>=0;lvl--){
    const j=(JOBS[lvl]||[]).find(x=>x.id===id);
    if(j)return j;
  }
  return null;
}
function jobList(u){return JOBS[u.education]||[]}
function estoniaDateKey(ts=Date.now()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Tallinn',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ts))}
function ensureGangDay(g){if(!g)return;const today=estoniaDateKey();g.attackDailyDate=g.attackDailyDate||today;g.attackHistory=g.attackHistory||[];g.attackStats=g.attackStats||{};g.attackWins=g.attackWins||{};g.attackLosses=g.attackLosses||{};if(g.attackDailyDate!==today){g.attackHistory.push({date:g.attackDailyDate,attacks:{...g.attackStats},wins:{...g.attackWins},losses:{...g.attackLosses}});g.attackHistory=g.attackHistory.slice(-30);g.attackStats={};g.attackWins={};g.attackLosses={};g.attackDailyDate=today}}
function recordGangAttack(g,u,won){ensureGangDay(g);g.attackStats[u.id]=(g.attackStats[u.id]||0)+1;if(won)g.attackWins[u.id]=(g.attackWins[u.id]||0)+1;else g.attackLosses[u.id]=(g.attackLosses[u.id]||0)+1}


function defaults(){return{meta:{schemaVersion:SAVE_SCHEMA_VERSION},users:{},settings:{heistMultiplier:1,turnBatch:50,turnMinutes:15,maxNaturalTurns:3000,pvpWindowMin:15,pvpMaxHits:6,cryptoMin:125,cryptoMax:190,cryptoPrice:155,cryptoNext:Date.now()+900000,marketFee:.03,carSaleFee:.08,maintenanceRate:.002,announcement:'',weaponMarket:1,carMarket:1,economyMarket:1,travelBase:105000,bountyFee:.25,businessTax:.08,loanLateFeeDaily:.01,loanLateFeeCap:.50,bodyguardDefensePct:.20,bodyguardGameFee:.50,workerBasePrice:25000,spyPrices:{finnish:500000,ukrainian:1500000,russian:4000000},gangWeaponPrice:25000000,gangWeaponPower:1000000,gangWeaponScore:5000000,businessProjectOverrides:{},weaponPriceOverrides:{},marketNext:Date.now()+900000,marketPressure:0,insuranceTiers:{basic:{basePrice:1000000,coverage:.12,deductible:.08},standard:{basePrice:3000000,coverage:.25,deductible:.06},premium:{basePrice:7500000,coverage:.4,deductible:.04},elite:{basePrice:15000000,coverage:.55,deductible:.03}},lottery:{active:false,title:'',ticketPrice:10000,maxTickets:20,pot:0,bankShare:0,organizerId:null,organizerName:'',drawAt:0,tickets:{},winner:null}},chat:[],gangs:{},playerBanks:{},loans:{},carListings:{},messages:[],notifications:[],gameBank:{balance:0,turnsBalance:0,autoMoneyFund:0,autoTurnsFund:0,autoLoan:{enabled:false,rate:20,hours:12,maxMoney:100000000,maxTurns:5000},loanRequests:{},loans:{},log:[]},casinoHistory:[],logs:[],securityLogs:[],auditLogs:[],resetRequests:{},passwordResetTokens:{},bounties:{},bodyguardOffers:{},turnShop:{},turnOrders:{},snapshots:[],gifts:[],nextIds:{loan:1,listing:1,bounty:1,turnPack:1,turnOrder:1,snapshot:1,gift:1,message:1,notification:1,bodyguardOffer:1,gameBankRequest:1,gameBankLoan:1}}}
let db=defaults(),pool=null,saveTimer=null;
function isPlainObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function cloneData(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
// Uuenduste põhireegel: olemasoleva mängija väärtus võidab ALATI. Uusi välju võib ainult juurde lisada.
function addMissing(existing,defaultsObj){
  if(!isPlainObject(existing))return cloneData(existing===undefined?defaultsObj:existing);
  const out={};
  for(const [k,v] of Object.entries(defaultsObj||{}))out[k]=cloneData(v);
  for(const [k,v] of Object.entries(existing)){
    if(isPlainObject(v)&&isPlainObject(out[k]))out[k]=addMissing(v,out[k]);
    else out[k]=cloneData(v);
  }
  return out;
}
function userMigrationDefaults(){const now=Date.now();return{email:'',education:0,educationProgress:0,securityLevel:1,mafiaLevel:1,propertyLevel:0,mafia:0,guards:0,weapons:{},crypto:0,city:'Paide',businesses:{},carLicense:0,cars:[],gangId:null,pvpHits:{},maintenanceDue:now+86400000,maintenanceDebt:0,maintenanceLastBill:null,sessionVersion:1,lastIp:'',lastUserAgent:'',lastLoginAt:0,failedLogins:0,lockedUntil:0,wanted:0,jailedUntil:0,rep:0,insurance:{active:false,until:0,coverage:.3},privacy:{cash:true,bank:false,levels:true,stats:true,lastActive:false},spies:{finnish:0,ukrainian:0,russian:0},intelLevel:0,lastSpyAt:{},bodyguard:null,bodyguardUntil:0,guardingClient:null,guardingUntil:0,businessProjects:{},businessWorkers:{},businessRejected:{},lastActive:now,vipUntil:0,createdAt:now,jobId:null,lastSalaryAt:now,lastTurnAt:now,stats:{wins:0,losses:0,robbed:0,pokerWins:0,crimes:0,operations:0},production:{capacityLevel:1,speedLevel:1,materials:{plant:0,chem:0,pack:0},stock:0,nextAt:0,totalMade:0,totalSold:0},nightlife:{venues:[],nextVenueId:1}}}
function normalize(){
  const d=defaults();
  for(const k of Object.keys(d))if(db[k]===undefined)db[k]=cloneData(d[k]);
  db.meta={...d.meta,...(db.meta||{}),schemaVersion:SAVE_SCHEMA_VERSION};
  db.nextIds={...d.nextIds,...(db.nextIds||{})};
  db.settings={...d.settings,...(db.settings||{})};
  db.gameBank={...d.gameBank,...(db.gameBank||{})};
  db.gameBank.autoLoan={enabled:false,rate:20,hours:12,maxMoney:100000000,maxTurns:5000,...(db.gameBank.autoLoan||{})};
  db.gameBank.autoMoneyFund=Math.max(0,Math.floor(Number(db.gameBank.autoMoneyFund)||0));
  db.gameBank.autoTurnsFund=Math.max(0,Math.floor(Number(db.gameBank.autoTurnsFund)||0));
  db.gameBank.loanRequests={...(db.gameBank.loanRequests||{})};
  db.gameBank.loans={...(db.gameBank.loans||{})};
  db.gameBank.log=Array.isArray(db.gameBank.log)?db.gameBank.log:[];
  db.settings.lottery={...d.settings.lottery,...(db.settings.lottery||{})};if(!Number.isFinite(Number(db.settings.lottery.pot)))db.settings.lottery.pot=0;if(!Number.isFinite(Number(db.settings.lottery.bankShare)))db.settings.lottery.bankShare=0;if(db.settings.lottery.prize!=null)delete db.settings.lottery.prize;
  if(!Array.isArray(db.casinoHistory))db.casinoHistory=[];
  if(db.settings.carSaleFee==null)db.settings.carSaleFee=.08;
  db.settings.insuranceTiers={...d.settings.insuranceTiers,...(db.settings.insuranceTiers||{})};
  for(const[k,t]of Object.entries(db.settings.insuranceTiers)){const def=d.settings.insuranceTiers[k]||{};if(t.basePrice==null){t.basePrice=def.basePrice||Math.max(100000,Math.floor((t.priceRate||.01)*100000000));delete t.priceRate}}
  db.settings.weaponPriceOverrides={...(d.settings.weaponPriceOverrides||{}),...(db.settings.weaponPriceOverrides||{})};
  if(!db.meta.weaponPriceFixV65){db.settings.weaponPriceOverrides={};db.settings.weaponMarket=1;db.meta.weaponPriceFixV65=true;}
  db.settings.spyPrices={...(d.settings.spyPrices||{}),...(db.settings.spyPrices||{})};
  db.settings.businessProjectOverrides={...(d.settings.businessProjectOverrides||{}),...(db.settings.businessProjectOverrides||{})};
  // Kõik olemasolevad useri väljad säilivad bit-for-bit; lisame ainult puuduvad võtmed.
  for(const [uk,oldUser] of Object.entries(db.users||{})){
    db.users[uk]=addMissing(oldUser,userMigrationDefaults());
    const u=db.users[uk];
    // Ainult täiesti vigase/puuduva tehnilise välja parandus. Kehtivat progressi ei muudeta.
    if(!isPlainObject(u.stats))u.stats=cloneData(userMigrationDefaults().stats);
    else u.stats=addMissing(u.stats,userMigrationDefaults().stats);
    if(!isPlainObject(u.spies))u.spies=cloneData(userMigrationDefaults().spies);
    else u.spies=addMissing(u.spies,userMigrationDefaults().spies);
    if(!isPlainObject(u.weapons))u.weapons={};
    if(!isPlainObject(u.businesses))u.businesses={};
    if(!Array.isArray(u.cars))u.cars=[];
    if(!u.production||typeof u.production!=='object')u.production={capacityLevel:1,speedLevel:1,materials:{plant:0,chem:0,pack:0},stock:0,nextAt:0,totalMade:0,totalSold:0};
    if(!u.production.materials||typeof u.production.materials!=='object')u.production.materials={plant:0,chem:0,pack:0};
    for(const k of ['plant','chem','pack'])if(u.production.materials[k]==null)u.production.materials[k]=0;
    if(u.production.capacityLevel==null)u.production.capacityLevel=1;if(u.production.speedLevel==null)u.production.speedLevel=1;if(u.production.stock==null)u.production.stock=0;if(u.production.nextAt==null)u.production.nextAt=0;if(u.production.totalMade==null)u.production.totalMade=0;if(u.production.totalSold==null)u.production.totalSold=0;
    if(!u.nightlife||typeof u.nightlife!=='object')u.nightlife={venues:[],nextVenueId:1};if(!Array.isArray(u.nightlife.venues))u.nightlife.venues=[];if(!Number.isFinite(Number(u.nightlife.nextVenueId)))u.nightlife.nextVenueId=1;
    if(!isPlainObject(u.businessProjects))u.businessProjects={};
    if(!isPlainObject(u.businessWorkers))u.businessWorkers={};
    if(!isPlainObject(u.businessRejected))u.businessRejected={};
    if(!Number.isFinite(Number(u.lastTurnAt))||Number(u.lastTurnAt)<=0)u.lastTurnAt=Date.now();
    if(Number(u.lastTurnAt)>Date.now())u.lastTurnAt=Date.now();
  }
  db.meta.progressPreservation='v69-existing-user-values-win';
  if(db.settings.cryptoMin===88&&db.settings.cryptoMax===197){db.settings.cryptoMin=125;db.settings.cryptoMax=190;db.settings.cryptoPrice=clamp(db.settings.cryptoPrice,125,190)}
  if(db.settings.cryptoMin===120&&db.settings.cryptoMax===190){db.settings.cryptoMin=125;db.settings.cryptoPrice=clamp(db.settings.cryptoPrice,125,190)}
  for(const[gId,g]of Object.entries(db.gangs||{})){g.members=[...new Set((g.members||[]).filter(id=>{const u=byId(id);return !!u&&u.gangId===gId}))];g.assistants=[...new Set((g.assistants||[]).filter(id=>g.members.includes(id)&&id!==g.leader))];const leader=byId(g.leader);if(leader){if(leader.gangId&&leader.gangId!==gId){delete db.gangs[gId];continue}leader.gangId=gId;if(!g.members.includes(g.leader))g.members.unshift(g.leader)}else delete db.gangs[gId]}
}
async function initStorage(){if(DATABASE_URL){pool=new Pool({connectionString:DATABASE_URL,ssl:DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await pool.query('CREATE TABLE IF NOT EXISTS game_state(id INT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW())');const r=await pool.query('SELECT data FROM game_state WHERE id=1');if(r.rows[0])db=r.rows[0].data;else await pool.query('INSERT INTO game_state(id,data) VALUES(1,$1)',[db]);console.log('PostgreSQL persistence ON')}else{if(fs.existsSync(DB_FILE)){try{db=JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}catch(e){console.error('db.json read failed:',e.message)}}if(DATA_DIR==='/var/data'||process.env.DATA_DIR)console.log('Persistent file storage path:',DB_FILE);else console.warn('WARNING: DATABASE_URL/DATA_DIR missing. Render deploy may erase ./data/db.json and reset players. Configure PostgreSQL or a persistent disk.')}normalize();migrateNpcNames();ensureNpcPlayers();await saveNow()}
async function saveNow(){if(pool)await pool.query('INSERT INTO game_state(id,data,updated_at) VALUES(1,$1,NOW()) ON CONFLICT(id) DO UPDATE SET data=$1,updated_at=NOW()',[db]);else fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2))}
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNow().catch(console.error),100)}

const norm=x=>String(x||'').trim().replace(/\s+/g,' ').slice(0,18),key=x=>norm(x).toLowerCase(),rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hpw(p,s=crypto.randomBytes(16).toString('hex')){return{salt:s,hash:crypto.scryptSync(String(p),s,64).toString('hex')}}
function checkPw(p,s,h){try{return crypto.timingSafeEqual(crypto.scryptSync(String(p),s,64),Buffer.from(h,'hex'))}catch{return false}}
function token(name){const u=db.users[key(name)],p=Buffer.from(JSON.stringify({u:name,v:u?.sessionVersion||1,exp:Date.now()+2592e6})).toString('base64url');return p+'.'+crypto.createHmac('sha256',TOKEN_SECRET).update(p).digest('base64url')}
function untoken(t){try{const[p,sig]=String(t||'').split('.'),a=crypto.createHmac('sha256',TOKEN_SECRET).update(p).digest(),b=Buffer.from(sig,'base64url');if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;const d=JSON.parse(Buffer.from(p,'base64url'));if(d.exp<=Date.now())return null;const u=db.users[key(d.u)];return u&&(u.sessionVersion||1)===(d.v||1)?d.u:null}catch{return null}}
function clientIp(req){return String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim().slice(0,80)}
function secLog(type,req,u,extra={}){db.securityLogs.unshift({time:Date.now(),type,user:u?.name||'',userId:u?.id||'',ip:clientIp(req),ua:String(req.headers['user-agent']||'').slice(0,180),...extra});db.securityLogs=db.securityLogs.slice(0,2000)}
function audit(actor,action,target='',details={}){db.auditLogs.unshift({time:Date.now(),actor:actor?.name||String(actor||''),action,target,details});db.auditLogs=db.auditLogs.slice(0,3000)}
function snap(label,actor){const data=JSON.parse(JSON.stringify(db));data.snapshots=[];const x={id:String(db.nextIds.snapshot++),time:Date.now(),label:String(label||'Snapshot').slice(0,80),actor:actor?.name||'system',data};db.snapshots.unshift(x);db.snapshots=db.snapshots.slice(0,12);return x.id}
const loginBuckets=new Map();
function loginLimited(req,name){const now=Date.now(),id=clientIp(req)+'|'+key(name),a=(loginBuckets.get(id)||[]).filter(t=>now-t<10*60000);if(a.length>=5)return true;a.push(now);loginBuckets.set(id,a);return false}
function clearLoginBucket(req,name){loginBuckets.delete(clientIp(req)+'|'+key(name))}
function newUser(name,pw,role='player',email=''){const h=hpw(pw);return{id:crypto.randomUUID(),name,email:String(email||'').trim().toLowerCase().slice(0,120),...h,role,banned:false,vip:false,vipUntil:0,cash:2500000,bank:0,turns:300,hp:100,level:1,xp:0,rep:0,wanted:0,jailedUntil:0,insurance:{active:false,until:0,coverage:.3},privacy:{cash:true,bank:false,levels:true,stats:true,lastActive:false},education:0,educationProgress:0,securityLevel:1,mafiaLevel:1,propertyLevel:0,mafia:0,guards:0,weapons:{},crypto:0,city:'Paide',businesses:{},carLicense:0,cars:[],gangId:null,spies:{finnish:0,ukrainian:0,russian:0},intelLevel:0,lastSpyAt:{},bodyguard:null,bodyguardUntil:0,guardingClient:null,guardingUntil:0,businessProjects:{},businessWorkers:{},businessRejected:{},lastTurnAt:Date.now(),lastActive:Date.now(),createdAt:Date.now(),jobId:null,lastSalaryAt:Date.now(),pvpHits:{},maintenanceDue:Date.now()+86400000,maintenanceDebt:0,maintenanceLastBill:null,sessionVersion:1,lastIp:'',lastUserAgent:'',lastLoginAt:0,failedLogins:0,lockedUntil:0,stats:{wins:0,losses:0,robbed:0,pokerWins:0,crimes:0,operations:0},production:{capacityLevel:1,speedLevel:1,materials:{plant:0,chem:0,pack:0},stock:0,nextAt:0,totalMade:0,totalSold:0},nightlife:{venues:[],nextVenueId:1}}}

const NPC_RENAMES={'K6ver':'Must Vares','Varikas':'Hall Hunt','Xyron':'Tume Ronk','Vexor':'Kuri Kelm','TumeX':'Vaikne Vari','Noxx':'Öine Susi','Kelmik':'Must Kass','Zynk':'Hall Rott','TontX':'Tume Tont','Kryp':'Külm Kivi','RottX':'Vana Vares','Varnx':'Metsik Nirk','HallVarju':'Pime Udu','Zerro':'Must Kaaren','SodiX':'Sodi','Nyxar':'Terav Pistrik','K2biX':'Hall Mäger','Drayx':'Kobra','VapsikX':'Vapsik','Xenoq':'Raju'};
const NPC_NAMES=['Must Vares','Hall Hunt','Tume Ronk','Kuri Kelm','Vaikne Vari','Öine Susi','Must Kass','Hall Rott','Tume Tont','Külm Kivi','Vana Vares','Metsik Nirk','Pime Udu','Must Kaaren','Sodi','Terav Pistrik','Hall Mäger','Kobra','Vapsik','Raju'];
function migrateNpcNames(){const moved=[];for(const [oldName,newName] of Object.entries(NPC_RENAMES)){const ok=key(oldName),u=db.users[ok];if(u&&u.npc){moved.push([ok,newName,u]);delete db.users[ok]}}for(const [oldKey,newName,u] of moved){let finalName=newName,nk=key(finalName);if(db.users[nk]&&db.users[nk]!==u){const alts=['Sügav Vari','Tume Mänd','Hall Kull','Pime Ronk','Must Ilves','Külm Udu','Vana Hunt','Terav Nirk'];for(const a of alts){if(!db.users[key(a)]){finalName=a;nk=key(a);break}}}u.name=finalName;db.users[nk]=u}db.meta.npcNamesV660=true}
const NPC_STYLES=['score','combat','business','crime','saver','balanced','score','combat','business','crime','balanced','saver','score','business','combat','crime','score','balanced','business','combat'];
function seedNpcV627(u,i){
  // Ainult NPC-de ühekordne stardierinevus. Päris kasutajaid ei puuduta.
  // Edaspidi teenivad/kulutavad NPC-d kõike sama mänguloogika järgi nagu mängijad.
  if(u.npcSeedV627)return;
  const style=NPC_STYLES[i%NPC_STYLES.length];u.npcStyle=style;
  const baseCash=[1800000,2600000,3400000,4200000,5200000][i%5];
  u.cash=Math.max(Number(u.cash)||0,baseCash);
  u.bank=Math.max(0,Number(u.bank)||0);
  u.turns=Math.max(Number(u.turns)||0,180+(i%7)*70);
  // Väikesed erinevad stardipositsioonid, et TOP ei oleks 20 identset rida.
  if(style==='score'){
    u.mafiaLevel=Math.max(u.mafiaLevel||1,1+(i%4));u.securityLevel=Math.max(u.securityLevel||1,1+((i+2)%4));
    u.mafia=Math.max(u.mafia||0,6+(i%5)*4);u.guards=Math.max(u.guards||0,4+(i%4)*3);
    const wi=1+(i%3);u.weapons[wi]=Math.max(Number(u.weapons[wi])||0,1+(i%2));
  }else if(style==='combat'){
    u.mafia=Math.max(u.mafia||0,10+(i%6)*5);u.guards=Math.max(u.guards||0,8+(i%5)*4);
    const wi=1+(i%4);u.weapons[wi]=Math.max(Number(u.weapons[wi])||0,1+(i%3));
  }else if(style==='business'){
    const b=BIZ[i%BIZ.length];if(b)u.businesses[b.id]=Math.max(Number(u.businesses[b.id])||0,1+(i%2));
  }else if(style==='crime'){
    u.stats.crimes=Math.max(Number(u.stats.crimes)||0,i%8);u.rep=Math.max(Number(u.rep)||0,i%10);
  }else if(style==='saver'){
    u.bank=Math.min(bankLimit(u),Math.max(Number(u.bank)||0,300000+(i%5)*150000));
  }
  u.npcSeedV627=true;
}
function seedNpcV628(u,i){
  // Ühekordne loomulikum NPC algseis. Skoori EI kirjutata kunagi käsitsi:
  // see arvutatakse score(u) abil samadest komponentidest nagu päris mängijal.
  if(u.npcSeedV628)return;
  const style=u.npcStyle||NPC_STYLES[i%NPC_STYLES.length];
  const salts=[73121,18473,52967,31609,9473,68137,25391,8459,41983,57211,13757,7639,34651,9187,60533,22769,48911,15437,70829,29153];
  const salt=salts[i%salts.length];

  // Raha ja pank ei ole ümarad ega kõigil sama jaotusega. Need on ainult NPC stardipositsioon.
  const total=Math.max(900000,Math.floor((Number(u.cash||0)+Number(u.bank||0))*0.82)+salt*7);
  const bankShare=style==='saver'?.58:style==='business'?.36:style==='score'?.27:style==='combat'?.16:style==='crime'?.09:.24;
  const desiredBank=Math.floor(total*bankShare)+(salt%17000);
  u.bank=Math.min(bankLimit(u),Math.max(0,desiredBank));
  u.cash=Math.max(75000,total-u.bank+(salt%997));

  // Ebakorrapärased päris skoorikomponendid. Ühtegi score välja ei eksisteeri ega määrata.
  const addM=1+(salt%7), addG=1+(Math.floor(salt/7)%6);
  if(style==='score'){
    u.mafia=Math.max(Number(u.mafia||0),7+addM*3+i%4);
    u.guards=Math.max(Number(u.guards||0),5+addG*2+(i%3));
    u.mafiaLevel=Math.max(Number(u.mafiaLevel||1),1+(salt%5));
    u.securityLevel=Math.max(Number(u.securityLevel||1),1+(Math.floor(salt/5)%5));
  }else if(style==='combat'){
    u.mafia=Math.max(Number(u.mafia||0),11+addM*4+(i%5));
    u.guards=Math.max(Number(u.guards||0),9+addG*3+(i%4));
  }else if(style==='business'){
    const b=BIZ[(i+salt)%BIZ.length];
    if(b)u.businesses[b.id]=Math.max(Number(u.businesses[b.id])||0,1+((salt+i)%2));
    u.propertyLevel=Math.max(Number(u.propertyLevel||0),(salt%3));
  }else if(style==='crime'){
    u.mafia=Math.max(Number(u.mafia||0),3+(salt%9));
    u.stats.crimes=Math.max(Number(u.stats.crimes||0),3+(salt%13));
    u.rep=Math.max(Number(u.rep||0),1+(salt%17));
  }else if(style==='balanced'){
    u.mafia=Math.max(Number(u.mafia||0),2+(salt%8));
    u.guards=Math.max(Number(u.guards||0),2+(Math.floor(salt/3)%8));
  }

  // Mõnel NPC-l erinev relvakogus; ostetud vara on osa nende algseisust ja edasi kehtivad tavareeglid.
  if(style!=='saver'){
    const wi=1+((salt+i)%Math.max(1,Math.min(4,WEAPONS.length-1)));
    if(WEAPONS[wi])u.weapons[wi]=Math.max(Number(u.weapons[wi])||0,1+(Math.floor(salt/11)%3));
  }
  u.turns=Math.max(Number(u.turns)||0,217+((salt+i*37)%433));
  u.npcSeedV628=true;
}
function ensureNpcPlayers(){
  const now=Date.now(),npcs=[];
  for(let i=0;i<NPC_NAMES.length;i++){
    const name=NPC_NAMES[i],k=key(name);let u=db.users[k];
    if(u&&!u.npc)continue;
    if(!u){u=newUser(name,crypto.randomBytes(24).toString('hex'),'player','');db.users[k]=u}
    u.npc=true;
    seedNpcV627(u,i);
    seedNpcV628(u,i);
    if(!Number.isFinite(Number(u.npcOnlineUntil)))u.npcOnlineUntil=0;
    if(!Number.isFinite(Number(u.nextNpcLoginAt)))u.nextNpcLoginAt=now+rand(1,90)*60000;
    if(!Number.isFinite(Number(u.nextNpcActionAt)))u.nextNpcActionAt=now+rand(20,180)*1000;
    if(!u.lastActive||u.lastActive>now)u.lastActive=now-rand(2,240)*60000;
    if(!u.jobId){const jobs=JOBS[u.education]||[];if(jobs.length){u.jobId=jobs[rand(0,jobs.length-1)].id;u.lastSalaryAt=now}}
    npcs.push(u);
  }
  // V6.26 kiire start jääb alles: esimesel korral osa kohe online, ülejäänud tulevad minutitega.
  if(!db.meta.npcFastStartV626){
    npcs.sort(()=>Math.random()-.5);
    npcs.forEach((u,i)=>{
      if(i<8){u.npcOnlineUntil=now+rand(15,40)*60000;u.nextNpcLoginAt=now;u.nextNpcActionAt=now+rand(10,55)*1000;u.lastActive=now-rand(0,2)*60000}
      else if(i<15){u.npcOnlineUntil=0;u.nextNpcLoginAt=now+rand(1,5)*60000;u.nextNpcActionAt=u.nextNpcLoginAt+rand(10,60)*1000}
      else{u.npcOnlineUntil=0;u.nextNpcLoginAt=now+rand(5,12)*60000;u.nextNpcActionAt=u.nextNpcLoginAt+rand(10,60)*1000}
    });
    db.meta.npcFastStartV626=true;
  }
  db.meta.npcPlayersV625=true;db.meta.npcPersonalitiesV627=true;db.meta.npcNaturalStartV628=true;
}
function npcOnline(u,now=Date.now()){return !!u.npc&&Number(u.npcOnlineUntil||0)>now}
function npcStartSession(u,now){u.npcOnlineUntil=now+rand(8,45)*60000;u.nextNpcActionAt=now+rand(10,90)*1000;u.lastActive=now}
function npcBuyTroops(u){const prefer=u.npcStyle==='combat'||u.npcStyle==='score',type=prefer?(Math.random()<.55?'mafia':'guards'):(Math.random()<.5?'mafia':'guards'),unit=type==='mafia'?12000:13500,maxByCash=Math.floor(u.cash/(unit*market())),maxByTurns=Math.floor(u.turns/5),rich=Math.max(1,Math.floor(u.cash/5000000)),maxQ=Math.max(prefer?8:5,Math.min(prefer?400:180,rich*(prefer?6:3))),n=Math.max(0,Math.min(rand(1,maxQ),maxByCash,maxByTurns));if(n<1)return false;const cost=Math.floor(n*unit*market());if(!needTurns(u,n*5))return false;u.cash-=cost;gameIncome(cost,'troop_purchase',u);u[type]+=n;return true}
function npcBuyWeapon(u){const affordable=WEAPONS.map((w,i)=>({w,i,c:weaponPrice(i)})).filter(x=>x.i>0&&x.c<=u.cash&&u.turns>=5);if(!affordable.length)return false;let pick;if(u.npcStyle==='score'||u.npcStyle==='combat')pick=affordable[Math.max(0,affordable.length-1-rand(0,Math.min(2,affordable.length-1)))];else pick=affordable[rand(0,affordable.length-1)];const q=Math.max(1,Math.min(rand(1,u.npcStyle==='score'?4:3),Math.floor(u.cash/pick.c),Math.floor(u.turns/5)));if(q<1)return false;const cost=pick.c*q;if(!needTurns(u,5*q))return false;u.cash-=cost;gameIncome(cost,'weapon_purchase',u);u.weapons[pick.i]=(u.weapons[pick.i]||0)+q;return true}
function npcLevelUp(u){let types;if(u.npcStyle==='score')types=['mafia','security','property'];else if(u.npcStyle==='combat')types=['mafia','security','property'];else if(u.npcStyle==='business')types=['property','security','mafia'];else types=['mafia','security','property'].sort(()=>Math.random()-.5);for(const t of types){const field=t==='mafia'?'mafiaLevel':t==='security'?'securityLevel':'propertyLevel',max=t==='property'?100:300,n=(u[field]||0)+1;if(n>max)continue;const base=t==='property'?PROPERTY_PRICES[n]:LEVEL_PRICES[n],cost=Math.floor((base||Infinity)*market());if(Number.isFinite(cost)&&u.cash>=cost){u.cash-=cost;gameIncome(cost,`npc_${t}_level_up`,u);u[field]=n;return true}}return false}
function npcBuyBusiness(u){const opts=BIZ.map(b=>{const lvl=u.businesses[b.id]||0;return{b,lvl,cost:Math.floor(b.base*Math.pow(2.05,lvl)*market())}}).filter(x=>x.cost<=u.cash&&u.turns>=40);if(!opts.length)return false;const x=u.npcStyle==='business'?opts.sort((a,b)=>a.lvl-b.lvl)[0]:opts[rand(0,opts.length-1)];if(!needTurns(u,40))return false;u.cash-=x.cost;gameIncome(x.cost,'business_upgrade',u);u.businesses[x.b.id]=x.lvl+1;return true}
function npcBusinessProject(u){
  for(const [id,p] of Object.entries(u.businessProjects||{})){if(Date.now()>=p.endsAt){const taxRate=clamp(Number(db.settings.businessTax||.08),0,.9),gross=Math.floor(p.reward*market()),tax=Math.floor(gross*taxRate),net=gross-tax;creditBusinessWithDebt(u,net,'business_project');gameIncome(tax,'business_tax',u);delete u.businessProjects[id];return true}}
  const owned=BIZ.filter(b=>(u.businesses[b.id]||0)>0&&!u.businessProjects[b.id]);if(!owned.length)return false;const b=owned[rand(0,owned.length-1)],lvl=u.businesses[b.id]||1,list=(BUSINESS_PROJECTS[b.id]||[]).map(p=>projectCfg(b.id,p));if(!list.length)return false;const z=list[0];let workers=u.businessWorkers[b.id]||0;if(workers<z.workers){const need=z.workers-workers,unit=Math.floor((db.settings.workerBasePrice||25000)*market()),cost=unit*need,turns=Math.max(5,need);if(u.cash<cost||u.turns<turns)return false;if(!needTurns(u,turns))return false;u.cash-=cost;gameIncome(cost,'worker_hire',u);u.businessWorkers[b.id]=workers+need;workers+=need}
  const cost=Math.floor(b.base*Math.max(1,lvl)*z.costMult*market());if(u.cash<cost||u.turns<z.turns)return false;if(!needTurns(u,z.turns))return false;u.cash-=cost;gameIncome(cost,'business_project_cost',u);u.businessProjects[b.id]={id:crypto.randomUUID(),projectId:z.id,name:z.name,startedAt:Date.now(),endsAt:Date.now()+z.hours*3600000,cost,reward:Math.floor(cost*z.rewardMult*(1+.04*Math.max(0,lvl-1))),workers:z.workers};return true
}
function npcCrime(u){if(!freeToAct(u))return false;const choices=CRIMES.filter(c=>u.level>=c.need&&u.turns>=c.turns);if(!choices.length)return false;const pool=u.npcStyle==='crime'?choices.slice(-Math.min(3,choices.length)):choices,c=pool[rand(0,pool.length-1)];if(!needTurns(u,c.turns))return false;const cb=combat(u),fail=clamp(c.risk-cb.atk/(cb.atk+3e6),.04,.72);if(Math.random()<fail){const grossLoss=Math.floor(rand(c.min,c.max)*.25);u.cash=Math.max(0,u.cash-grossLoss);u.wanted=Math.max(0,(u.wanted||0)+2);if(Math.random()<clamp(.08+u.wanted/180,.08,.65)){const mins=5+Math.floor(u.wanted/5);u.jailedUntil=Date.now()+mins*60000}}else{const g=Math.floor(rand(c.min,c.max)*db.settings.heistMultiplier);creditCashWithDebt(u,g,'crime');u.stats.crimes++;u.wanted=Math.max(0,(u.wanted||0)+1+Math.floor(c.risk*5));u.rep=(u.rep||0)+1;u.level=Math.max(u.level||1,1+Math.floor(Math.sqrt(u.stats.crimes/5)));u.xp=Math.max(Number(u.xp||0),u.stats.crimes*10)}return true}
function npcAttackPlayer(a){if(!freeToAct(a)||a.turns<30)return false;const now=Date.now(),targets=Object.values(db.users).filter(b=>!b.banned&&b.id!==a.id&&b.role!=='owner'&&(b.cash||0)>0);if(!targets.length)return false;let pool=targets;if(a.npcStyle==='combat'){const A=combat(a);const sensible=targets.filter(b=>combat(b).def<A.atk*1.2);if(sensible.length)pool=sensible}const b=pool[rand(0,pool.length-1)],winMs=db.settings.pvpWindowMin*60000,h=(a.pvpHits[b.id]||[]).filter(t=>now-t<winMs);if(h.length>=db.settings.pvpMaxHits)return false;if(!needTurns(a,30))return false;h.push(now);a.pvpHits[b.id]=h;const A=combat(a),B=combat(b);if(A.atk>B.def){const take=Math.max(0,Math.floor(b.cash*.50));b.cash-=take;a.cash+=take;a.stats.wins++;b.stats.losses++;notify(b,'pvp',`${a.name} ründas sind. Kaotasid ${take} €.`);const loose=freeWeaponMap(b);for(const[i,q]of Object.entries(loose)){const stolen=Math.min(q,Math.max(1,Math.floor(q*.20)));if(stolen>0){b.weapons[i]-=stolen;a.weapons[i]=(a.weapons[i]||0)+stolen}}}else{a.stats.losses++;b.stats.wins++;notify(b,'pvp',`${a.name} proovis sind rünnata, kuid sinu kaitse pidas.`)}return true}
function npcSaveMoney(u){if(u.cash<150000)return false;const limit=bankLimit(u),space=Math.max(0,limit-u.bank),amt=Math.min(space,Math.floor(u.cash*(.25+Math.random()*.35)));if(amt<10000)return false;u.cash-=amt;u.bank+=amt;return true}
function npcNightVenueName(u,type){const a=type==='bar'?['Keldribaar','Vana Nurk','Õhtune','Tume Baar']:type==='club'?['Pulse','Varju','Neon','Öölaine']:['Velvet','Siluett','Virvendus','Rubiin'];return `${a[rand(0,a.length-1)]} ${u.name}`.slice(0,36)}
function npcNightlifeAct(u){
 const n=nightlifeState(u);refreshNightlife(u);
 let v=n.venues[0];
 if(!v){
  const affordable=NIGHT_PREMISES.filter(p=>Number(u.cash||0)>=p.cost*1.30);if(!affordable.length)return false;
  const maxIdx=Math.max(0,Math.min(affordable.length-1,Math.floor(Math.random()*Math.min(affordable.length,4)))),pr=affordable[maxIdx],types=['bar','club','strip'],type=types[(NPC_NAMES.indexOf(u.name)+Math.floor(Math.random()*3)+3)%3];
  u.cash-=pr.cost;gameIncome(pr.cost,'npc_nightlife_premise_purchase',u);const id=String(n.nextVenueId++);
  v=nightNormalizeVenue({id,type,name:npcNightVenueName(u,type),premiseId:pr.id,premiseName:pr.name,city:pr.city,area:pr.area,baseArea:pr.area,extraArea:0,premiseCost:pr.cost,constructionStatus:'none',constructionDoneAt:0,inventory:{},itemCondition:{},staff:[],offers:{},suppliers:{},securityContract:null,entryFee:type==='bar'?rand(0,9000):type==='club'?rand(18000,42000):rand(26000,52000),open:false,ready:false,accountOpen:false,account:0,blackCash:0,blackStock:{ant:0,kok:0,jupp:0},heat:0,reputation:rand(3,11),totalRevenue:0,totalVisitors:0,lastVisitors:0,lastRevenueAt:Date.now(),windowStart:Date.now(),usedOpenMs:0,declarations:[],createdAt:Date.now()});n.venues.push(v);return true
 }
 v=nightNormalizeVenue(v);
 if(!v.accountOpen){if(Number(u.turns||0)<200)return false;if(!needTurns(u,200))return false;v.accountOpen=true;return true}
 if(v.account<Math.max(5000000,v.premiseCost*.18)&&u.cash>2000000){const amt=Math.min(Math.floor(u.cash*(.18+Math.random()*.24)),Math.max(3000000,Math.floor(v.premiseCost*.24)));if(amt>0){u.cash-=amt;v.account+=amt;return true}}
 if(v.constructionStatus==='none'){const offers=nightConstructionOffers(v),o=offers[rand(0,offers.length-1)];if(v.account<o.price)return false;v.account-=o.price;gameIncome(o.price,'npc_nightlife_construction',u);v.builder=o;v.constructionStatus='building';v.constructionDoneAt=Date.now()+o.minutes*60000;return true}
 if(v.constructionStatus==='building')return false;
 const inv=v.inventory||{},buy=(id,q=1)=>{const it=NIGHT_SHOP.find(x=>x.id===id);if(!it)return false;const usable=nightUsableArea(v),used=NIGHT_SHOP.reduce((a,x)=>a+Number(inv[x.id]||0)*Number(x.m2||0),0);q=Math.max(1,Math.min(q,Math.floor((usable-used)/Math.max(.1,it.m2))));const cost=it.price*q;if(q<1||v.account<cost)return false;v.account-=cost;gameIncome(cost,'npc_nightlife_inventory',u);inv[id]=(inv[id]||0)+q;v.itemCondition[id]=100;return true};
 if(!(inv.barcounter||0)&&buy('barcounter'))return true;if(!(inv.table||0)&&buy('table',rand(1,3)))return true;if(!(inv.barstool||0)&&buy('barstool',rand(3,8)))return true;if(v.type!=='bar'&&!(inv.stage||0)&&buy('stage'))return true;if(v.type==='strip'&&!(inv.private||0)&&buy('private'))return true;if(!(inv.speaker10||0)&&buy('speaker10'))return true;if(v.type!=='bar'&&!(inv.djpro||0)&&buy('djpro'))return true;if(!(inv.lights||0)&&buy('lights'))return true;
 const roleCounts=nightRoleCounts(v),needed=v.type==='strip'?['bartender','server','dj','performer','cleaner','hostess']:v.type==='club'?['bartender','server','dj','cleaner']:['bartender','server','cleaner'];for(const role of needed){if((roleCounts[role]||0)<1){const apps=nightStaffApps(v,role),a=apps[rand(0,apps.length-1)];v.staff.push(a);return true}}
 if(!v.securityContract){const opts=nightSecurityOffers(v).filter(o=>o.total<=v.account);if(opts.length){const o=opts[rand(0,opts.length-1)];v.account-=o.total;gameIncome(o.total,'npc_nightlife_security',u);v.securityContract={...o,remainingHours:o.hours,remainingMs:Number(o.hours||12)*3600000,startedAt:Date.now()};return true}}
 for(const kind of ['alcohol','food'])if(!v.suppliers[kind]){const opts=nightSupplierOffers(v,kind).filter(o=>o.setup<=v.account);if(opts.length){const o=opts[rand(0,opts.length-1)];v.account-=o.setup;gameIncome(o.setup,'npc_nightlife_supplier',u);v.suppliers[kind]={...o,selected:true,startedAt:Date.now(),until:Date.now()+o.hours*3600000};return true}}
 const pending=(v.declarations||[]).filter(d=>d.status==='pending');if(pending.length){const d=pending[0],tax=Math.max(0,Number(d.tax||0));if(v.account>=tax){v.account-=tax;gameIncome(tax,'npc_nightlife_tax',u);d.status='paid';d.paidAt=Date.now();return true}}
 if(!v.open&&v.usedOpenMs<NIGHT_MAX_OPEN_MS&&!pending.length&&v.securityContract&&v.suppliers.alcohol){v.open=true;v.openStartedAt=Date.now();v.lastUsageAt=Date.now();v.lastRevenueAt=Date.now();return true}
 if(v.open&&Math.random()<.08){v.open=false;v.openStartedAt=0;return true}
 if(Math.random()<.18&&v.account>nightPromoCost(v,1)*2){const tier=Math.random()<.65?1:Math.random()<.85?2:3,c=nightPromoCost(v,tier);if(v.account>=c){v.account-=c;gameIncome(c,'npc_nightlife_promo',u);v.promoTier=tier;v.promoBoost=[0,1.08,1.18,1.32][tier];v.promoUntil=Date.now()+nightPromoHours(tier)*3600000;v.promoHourlyCost=Math.floor(c/nightPromoHours(tier));return true}}
 return false
}
function npcGameBankRepay(u,l,amount){
  if(!l||l.userId!==u.id||!['active','overdue'].includes(l.status))return false;
  const due=Math.max(0,Math.floor(Number(l.unpaid)||0));if(due<=0)return false;
  let pay=0;
  if(l.type==='money'){
    // Bot hoiab osa likviidsusest igapäevaseks mänguks; ülejäägiga võib laenu varem tasuda.
    const reserve=Math.max(250000,Math.floor(Math.max(0,Number(u.cash)||0)*.22));
    const cashAvail=Math.max(0,Math.floor(Number(u.cash)||0)-reserve);
    const bankAvail=Math.max(0,Math.floor(Number(u.bank)||0));
    pay=Math.min(due,Math.max(0,Math.floor(Number(amount)||0)),cashAvail+bankAvail);
    if(pay<=0)return false;
    let left=pay,fromBank=Math.min(left,bankAvail);u.bank-=fromBank;left-=fromBank;
    let fromCash=Math.min(left,cashAvail);u.cash-=fromCash;left-=fromCash;pay-=left;
    if(l.autoLoan)db.gameBank.autoMoneyFund=(Number(db.gameBank.autoMoneyFund)||0)+pay;else db.gameBank.balance=(Number(db.gameBank.balance)||0)+pay;
  }else{
    const reserve=Math.min(1200,Math.max(150,Math.floor(Number(u.turns)||0)*.25));
    const avail=Math.max(0,Math.floor(Number(u.turns)||0)-reserve);
    pay=Math.min(due,Math.max(0,Math.floor(Number(amount)||0)),avail);
    if(pay<=0)return false;
    u.turns-=pay;if(l.autoLoan)db.gameBank.autoTurnsFund=(Number(db.gameBank.autoTurnsFund)||0)+pay;else db.gameBank.turnsBalance=(Number(db.gameBank.turnsBalance)||0)+pay;
  }
  l.unpaid=Math.max(0,due-pay);l.paid=(Number(l.paid)||0)+pay;l.lastPaymentAt=Date.now();l.lastPaymentSource='npc_manual';
  if(l.unpaid<=0){l.unpaid=0;l.status='repaid';l.repaidAt=Date.now()}
  db.gameBank.log.unshift({time:Date.now(),type:l.type==='money'?'central_loan_repay_money':'central_loan_repay_turns',amount:pay,userId:u.id,user:u.name,source:'npc_manual'});db.gameBank.log=db.gameBank.log.slice(0,3000);
  return true;
}
function npcGameBankAct(u){
  if(!u?.npc)return false;
  const reqs=Object.values(db.gameBank?.loanRequests||{}).filter(r=>r.userId===u.id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const pending=reqs.find(r=>['pending','countered'].includes(r.status));
  if(pending){
    if(pending.status==='countered'){
      const amt=Math.max(1,Math.floor(Number(pending.offerAmount??pending.amount)||0)),rate=clamp(Number(pending.offerRate??pending.rate)||0,0,500),hours=clamp(Math.floor(Number(pending.offerHours??pending.hours)||24),1,720);
      const fundOk=(pending.type==='money'&&amt<=Math.max(0,Number(db.gameBank.balance||0)))||(pending.type==='turns'&&amt<=Math.max(0,Number(db.gameBank.turnsBalance||0)));
      const acceptable=rate<=35&&hours>=6&&fundOk;
      const ageMs=Math.max(0,Date.now()-Number(pending.counteredAt||pending.createdAt||Date.now()));
      pending.botCounterChecks=Math.max(0,Math.floor(Number(pending.botCounterChecks)||0))+1;
      pending.botLastCounterCheckAt=Date.now();
      // Bot peab vastupakkumise lõpuks alati ära otsustama, et taotlus admini nimekirja kinni ei jääks.
      // Mõistliku pakkumise võtab ta tavaliselt vastu; kehva pakkumise lükkab tagasi.
      // Pärast 3 kontrolli või 10 minuti möödumist tehakse sundotsus.
      const forceDecision=pending.botCounterChecks>=3||ageMs>=10*60*1000;
      if(acceptable&&(Math.random()<.72||forceDecision)){
        try{issueGameBankLoan(pending);pending.botDecision='accepted';pending.botDecidedAt=Date.now();return true}
        catch(e){
          // Kui fond on vahepeal muutunud või väljastamine ebaõnnestub, ei jää taotlus lõputult ootele.
          if(forceDecision){pending.status='rejected_by_user';pending.respondedAt=Date.now();pending.botDecision='rejected';pending.botDecisionReason='loan_issue_failed';return true}
          return false;
        }
      }
      if(!acceptable&&(Math.random()<.55||forceDecision)){
        pending.status='rejected_by_user';pending.respondedAt=Date.now();pending.botDecision='rejected';pending.botDecidedAt=Date.now();return true
      }
      return false;
    }
    return false;
  }
  const loans=Object.values(db.gameBank?.loans||{}).filter(l=>l.userId===u.id&&['active','overdue'].includes(l.status));
  const overdue=loans.filter(l=>l.status==='overdue'&&Number(l.unpaid||0)>0);
  if(overdue.length){
    // Üle tähtaja bot proovib ise olemasoleva likviidsusega võlga vähendada; ülejäänu peetakse uutest tuludest kinni.
    const l=overdue[0],budget=l.type==='money'?Math.floor((Number(u.cash||0)+Number(u.bank||0))*.65):Math.floor(Number(u.turns||0)*.65);
    return npcGameBankRepay(u,l,budget);
  }
  if(loans.length){
    // Mõnikord maksab bot aktiivset laenu enne tähtaega osaliselt või täielikult tagasi.
    const l=loans[0];if(Math.random()<.24){const budget=l.type==='money'?Math.floor((Number(u.cash||0)+Number(u.bank||0))*.30):Math.floor(Number(u.turns||0)*.30);if(npcGameBankRepay(u,l,budget))return true}
    return false;
  }
  // Uut laenu küsitakse vajaduspõhiselt, mitte igal tickil.
  const cash=Math.max(0,Number(u.cash||0)),turns=Math.max(0,Number(u.turns||0));
  const needMoney=cash<Math.max(400000,Math.min(25000000,Math.floor(Math.max(1,netWorth(u))*.025)));
  const needTurns=turns<220;
  let type=null;if(needMoney&&needTurns)type=Math.random()<.58?'money':'turns';else if(needMoney)type='money';else if(needTurns)type='turns';else if(Math.random()<.015)type=Math.random()<.6?'money':'turns';
  if(!type)return false;
  const ac=db.gameBank.autoLoan||{};
  if(ac.enabled&&!activeGameBankLoansFor(u).length){
    const af=type==='money'?Math.max(0,Math.floor(Number(db.gameBank.autoMoneyFund)||0)):Math.max(0,Math.floor(Number(db.gameBank.autoTurnsFund)||0));
    const amax=type==='money'?Math.max(0,Math.floor(Number(ac.maxMoney)||0)):Math.max(0,Math.floor(Number(ac.maxTurns)||0));
    const cap=Math.min(af,amax);
    if(cap>0){
      let aq;if(type==='money'){const floor=Math.min(cap,1000000),desired=npcRisky(u)?rand(floor,Math.max(floor,Math.min(cap,100000000))):rand(floor,Math.max(floor,Math.min(cap,30000000)));aq=Math.min(cap,Math.max(1,desired));}
      else{const floor=Math.min(cap,100),desired=npcRisky(u)?rand(floor,Math.max(floor,Math.min(cap,5000))):rand(floor,Math.max(floor,Math.min(cap,1800)));aq=Math.min(cap,Math.max(1,desired));}
      if(aq>0){try{issueAutoGameBankLoan(u,type,aq);return true}catch{}}
    }
  }
  const fund=type==='money'?Math.max(0,Math.floor(Number(db.gameBank.balance)||0)):Math.max(0,Math.floor(Number(db.gameBank.turnsBalance)||0));if(fund<=0)return false;
  let amount;
  if(type==='money'){
    // Botid küsivad nüüd mängu majandusele mõistlikumaid summasid: enamasti miljoneid,
    // riskialtimad/jõukamad botid vahel kümneid või sadu miljoneid. Fond on alati kõva piir.
    const nw=Math.max(0,Math.floor(netWorth(u))),risky=npcRisky(u),roll=Math.random();
    let target;
    if(risky){
      if(roll<.12) target=rand(100000000,350000000);       // harv suur risk
      else if(roll<.48) target=rand(20000000,100000000);  // kümned miljonid
      else target=rand(5000000,30000000);                 // tavaline riskiboti laen
    }else{
      if(roll<.05) target=rand(50000000,120000000);       // harv suurem katse
      else if(roll<.35) target=rand(10000000,50000000);
      else target=rand(2000000,15000000);                 // tavaliselt mõned miljonid
    }
    // Väga jõukad botid võivad küsida proportsionaalselt rohkem, kuid mitte üle 500M korraga.
    const wealthBoost=Math.floor(nw*(risky?(.015+Math.random()*.035):(.005+Math.random()*.015)));
    target=Math.max(target,Math.min(500000000,wealthBoost));
    amount=Math.min(fund,Math.max(1000000,target));
  }
  else amount=Math.min(fund,Math.max(100,npcRisky(u)?rand(500,5000):rand(200,1800)));
  if(amount<1)return false;
  const rate=rand(5,18),hours=[1,3,6,12,24][rand(0,4)],id=String(db.nextIds.gameBankRequest++);
  db.gameBank.loanRequests[id]={id,userId:u.id,type,amount,rate,hours,status:'pending',createdAt:Date.now(),npc:true};
  for(const staff of Object.values(db.users).filter(x=>['owner','admin'].includes(x.role)))notify(staff,'admin',`${u.name} (BOT) saatis keskpanka ${type==='money'?'raha':'käikude'} laenutaotluse.`);
  db.gameBank.log.unshift({time:Date.now(),type:'central_loan_request_npc',amount,userId:u.id,user:u.name,loanType:type});db.gameBank.log=db.gameBank.log.slice(0,3000);
  return true;
}
function npcRisky(u){if(typeof u.npcRisky==='boolean')return u.npcRisky;let h=0;for(const c of String(u.id||u.name||''))h=(h*33+c.charCodeAt(0))>>>0;u.npcRisky=(h%100)<28;return u.npcRisky}
function logCasinoSpin(u,stake,payout,source='player'){
  if(!Array.isArray(db.casinoHistory))db.casinoHistory=[];
  const s=Math.max(0,Math.floor(Number(stake)||0)),p=Math.max(0,Math.floor(Number(payout)||0));
  db.casinoHistory.unshift({time:Date.now(),userId:u.id,user:u.name,npc:!!u.npc,source,stake:s,payout:p,net:p-s});
  db.casinoHistory=db.casinoHistory.slice(0,2000);
}
function npcJobPreference(u,jobs){
  if(!jobs.length)return null;let h=0;for(const c of String(u.id||u.name||''))h=(h*31+c.charCodeAt(0))>>>0;
  const style=u.npcStyle||'balanced',ordered=jobs.slice().sort((a,b)=>(b.pay||0)-(a.pay||0));
  // Botid ei koondu enam kõik ühele kõige kõrgema palgaga tööle. Karjääristiil + püsiv hash annab erinevad valikud.
  const band=style==='saver'?0:style==='business'?1:style==='score'?1:style==='combat'?2:style==='crime'?3:2;
  return ordered[Math.min(ordered.length-1,(h+band)%Math.min(ordered.length,4))]||ordered[0];
}
function npcBestJob(u){
  const jobs=JOBS[u.education]||[];if(!jobs.length)return false;const pick=npcJobPreference(u,jobs),cur=jobFor(u);
  if(!cur||cur.id!==pick.id){u.jobId=pick.id;u.lastSalaryAt=Date.now();return true}return false;
}
function npcCareerAct(u){
  const next=EDU[u.education+1];if(!next||u.turns<10)return false;
  const remaining=Math.max(0,Number(next.needTurns||0)-Number(u.educationProgress||0));if(remaining<=0)return false;
  const risky=npcRisky(u),style=u.npcStyle||'balanced';
  // V6.80: karjäär peab päriselt arenema. Reserv on väiksem ja sõltub botist, et õppimine ei jääks kuudeks nulli.
  const reserve=style==='saver'?180:risky?90:140;
  const spendable=Math.max(0,(Number(u.turns)||0)-reserve);if(spendable<5)return false;
  const share=style==='business'||style==='saver'?.55:risky?.42:.48;
  let spend=Math.min(remaining,Math.max(5,Math.floor(spendable*share)),750);spend-=spend%5;if(spend<5)return false;
  if(!needTurns(u,spend))return false;u.educationProgress=(u.educationProgress||0)+spend;
  if(u.educationProgress>=next.needTurns){u.education++;u.educationProgress=0;const nj=npcJobPreference(u,JOBS[u.education]||[]);if(nj){u.jobId=nj.id;u.lastSalaryAt=Date.now()}}
  return true;
}
function npcWithdrawForSpending(u){
  // V6.76: bot saab vajadusel pangast raha tagasi sularahasse võtta,
  // et haridus/ostud/rünne/kaitse ei jääks ainult liiga väikese sularaha taha kinni.
  const bank=Math.max(0,Math.floor(Number(u.bank)||0));if(bank<=0)return false;
  const nw=Math.max(1,netWorth(u)),risky=npcRisky(u);
  const target=Math.max(500000,Math.min(risky?150000000:75000000,Math.floor(nw*(risky?.10:.07))));
  if(Number(u.cash||0)>=Math.floor(target*.40))return false;
  const amt=Math.min(bank,Math.max(0,target-Math.floor(Number(u.cash)||0)));
  if(amt<50000)return false;u.bank-=amt;u.cash=(Number(u.cash)||0)+amt;return true
}
function npcProtectCash(u){
  const nw=Math.max(1,netWorth(u)),risky=npcRisky(u),reserve=Math.max(100000,Math.floor(nw*(risky?.10:.05))),limit=bankLimit(u),space=Math.max(0,limit-u.bank);
  if(u.cash>reserve&&space>0){const amt=Math.min(space,Math.max(0,Math.floor(u.cash-reserve)));if(amt>=10000){u.cash-=amt;u.bank+=amt;return true}}
  if(u.cash>Math.max(reserve*2,2000000)){
    if(Math.random()<.45&&npcLevelUp(u))return true;
    if(Math.random()<.55&&npcBuyTroops(u))return true;
    if(npcBuyWeapon(u))return true;
  }
  return false;
}
function npcCasino(u){if(!u.npc||u.cash<50000)return false;const risky=npcRisky(u),stake=Math.max(1000,Math.min(Math.floor(u.cash*(risky?(.02+Math.random()*.10):(.005+Math.random()*.025))),risky?250000000:25000000));if(stake<1000||stake>u.cash)return false;u.cash-=stake;const out=slotOutcome(),payout=Math.floor(stake*out.mult);if(payout>0)creditBankFirst(u,payout);u.stats.slotSpins=(u.stats.slotSpins||0)+1;u.stats.slotWagered=(u.stats.slotWagered||0)+stake;u.stats.slotWon=(u.stats.slotWon||0)+payout;logCasinoSpin(u,stake,payout,'bot');return true}
function npcBounty(u){if(!u.npc||u.cash<500000)return false;const targets=Object.values(db.users).filter(t=>!t.banned&&t.id!==u.id&&t.role!=='owner');if(!targets.length)return false;const t=targets[rand(0,targets.length-1)],risky=npcRisky(u),amount=Math.max(100000,Math.min(Math.floor(u.cash*(risky?(.04+Math.random()*.12):(.01+Math.random()*.035))),500000000));if(amount>u.cash)return false;u.cash-=amount;const fee=Math.floor(amount*(db.settings.bountyFee||.25)),reward=amount-fee;gameIncome(fee,'npc_bounty_fee',u);const id=String(db.nextIds.bounty++);db.bounties[id]={id,posterId:u.id,targetId:t.id,amount,fee,reward,requiredHits:risky?rand(1,5):rand(1,2),progress:{},expiresAt:Date.now()+rand(360,4320)*60000,active:true,createdAt:Date.now()};notify(t,'bounty',`${u.name} pani sinu peale bounty. Preemia ${reward} €.`);return true}
function npcLotteryAct(u){const L=db.settings.lottery;if(!L.active||Date.now()>=Number(L.drawAt||0)){if(Math.random()>.06)return false;const risky=npcRisky(u),base=Math.max(1000,Math.floor(Math.max(100000,u.cash)*(risky?.002:.0005))),ticketPrice=Math.max(1000,Math.min(base,risky?10000000:1000000)),maxTickets=risky?rand(500,1000000):rand(100,10000),minutes=risky?rand(30,240):rand(60,360);try{createLottery(u,{title:`${u.name} loos`,ticketPrice,maxTickets,minutes});return true}catch{return false}}const sold=Object.values(L.tickets||{}).reduce((n,v)=>n+Number(v||0),0),left=Math.max(0,Number(L.maxTickets||0)-sold);if(left<1||Number(L.ticketPrice||0)<1)return false;if(Math.random()>(npcRisky(u)?.18:.07))return false;const affordable=Math.floor(u.cash/Number(L.ticketPrice||0));if(affordable<1)return false;const q=Math.max(1,Math.min(left,affordable,npcRisky(u)?rand(1,50):rand(1,8)));const cost=q*Number(L.ticketPrice||0);u.cash-=cost;const bankPart=Math.floor(cost*.10),potPart=cost-bankPart;gameIncome(bankPart,'npc_lottery_ticket_share',u);L.pot=Number(L.pot||0)+potPart;L.bankShare=Number(L.bankShare||0)+bankPart;L.tickets[u.id]=Number(L.tickets[u.id]||0)+q;return true}
function npcAct(u){refresh(u);const risky=npcRisky(u);if(Number(u.maintenanceDebt||0)>0){const d=Math.max(0,Math.floor(Number(u.maintenanceDebt)||0)),avail=Math.max(0,Number(u.bank)||0)+Math.max(0,Number(u.cash)||0);if(avail>=d){let left=d,fb=Math.min(left,Math.max(0,Math.floor(Number(u.bank)||0)));u.bank-=fb;left-=fb;let fc=Math.min(left,Math.max(0,Math.floor(Number(u.cash)||0)));u.cash-=fc;left-=fc;gameIncome(d-left,'npc_maintenance_debt',u);u.maintenanceDebt=left;if(!left)return true}}if(Number(u.maintenanceDue||0)-Date.now()<60*60000&&Number(u.maintenanceDebt||0)<=0){const b=maintenanceBreakdown(u),avail=Math.max(0,Number(u.bank)||0)+Math.max(0,Number(u.cash)||0);if(avail>=b.total){chargeMaintenance(u,true);u.maintenanceDue=Date.now()+86400000;return true}}if(npcBestJob(u))return true;if(Math.random()<.48&&npcCareerAct(u))return true;if((Number(u.cash||0)<500000||Number(u.cash||0)<netWorth(u)*.025)&&npcWithdrawForSpending(u))return true;const cashHeavy=u.cash>Math.max(2000000,netWorth(u)*(risky?.18:.12));if((cashHeavy||Math.random()<.42)&&npcProtectCash(u))return true;if(Math.random()<.20&&(npcLevelUp(u)||npcBuyTroops(u)||npcBuyWeapon(u)))return true;if(Math.random()<(risky?.42:.22)&&npcGameBankAct(u))return true;if(npcLotteryAct(u))return true;if(Math.random()<(risky?.14:.035)&&npcCasino(u))return true;if(Math.random()<(risky?.08:.02)&&npcBounty(u))return true;if((u.npcStyle==='business'||u.npcStyle==='balanced'||u.npcStyle==='score')&&Math.random()<.34&&npcNightlifeAct(u))return true;if(!u.jobId){const jobs=(JOBS[u.education]||[]).slice().sort((a,b)=>(b.pay||0)-(a.pay||0));if(jobs.length){u.jobId=jobs[0].id;u.lastSalaryAt=Date.now();return true}}
  if((u.npcStyle==='business'||u.npcStyle==='balanced')&&npcBusinessProject(u))return true;
  const r=Math.random(),style=u.npcStyle||'balanced';
  if(style==='score'){
    if(r<.28&&npcLevelUp(u))return true;if(r<.55&&npcBuyTroops(u))return true;if(r<.78&&npcBuyWeapon(u))return true;if(r<.90&&npcBuyBusiness(u))return true;return npcCrime(u)||npcLevelUp(u)||npcBuyTroops(u)||npcBuyWeapon(u)
  }
  if(style==='combat'){
    if(r<.28&&npcAttackPlayer(u))return true;if(r<.48&&npcBuyWeapon(u))return true;if(r<.68&&npcBuyTroops(u))return true;if(r<.84&&npcCrime(u))return true;if(r<.94&&npcLevelUp(u))return true;return npcAttackPlayer(u)||npcCrime(u)||npcBuyWeapon(u)
  }
  if(style==='business'){
    if(r<.28&&npcBusinessProject(u))return true;if(r<.52&&npcBuyBusiness(u))return true;if(r<.68&&npcLevelUp(u))return true;if(r<.84&&npcSaveMoney(u))return true;if(r<.94&&npcCrime(u))return true;return npcBusinessProject(u)||npcBuyBusiness(u)||npcSaveMoney(u)
  }
  if(style==='crime'){
    if(r<.52&&npcCrime(u))return true;if(r<.68&&npcAttackPlayer(u))return true;if(r<.80&&npcBuyWeapon(u))return true;if(r<.90&&npcBuyTroops(u))return true;return npcCrime(u)||npcAttackPlayer(u)||npcBuyWeapon(u)
  }
  if(style==='saver'){
    if(r<.42&&npcSaveMoney(u))return true;if(r<.62&&npcCrime(u))return true;if(r<.75&&npcBuyBusiness(u))return true;if(r<.86&&npcLevelUp(u))return true;return npcSaveMoney(u)||npcCrime(u)||npcBuyBusiness(u)
  }
  if(r<.12&&npcAttackPlayer(u))return true;if(r<.34&&npcCrime(u))return true;if(r<.50&&npcBuyTroops(u))return true;if(r<.65&&npcBuyWeapon(u))return true;if(r<.78&&npcLevelUp(u))return true;if(r<.90&&npcBuyBusiness(u))return true;return npcCrime(u)||npcBuyWeapon(u)||npcBuyTroops(u)||false
}
function npcTick(){const now=Date.now();for(const u of Object.values(db.users)){if(!u.npc||u.banned)continue;refresh(u);if(!npcOnline(u,now)){if(now>=Number(u.nextNpcLoginAt||0)){npcStartSession(u,now)}else continue}if(now>=u.npcOnlineUntil){u.nextNpcLoginAt=now+rand(10,90)*60000;continue}if(now<Number(u.nextNpcActionAt||0))continue;u.lastActive=now;npcAct(u);const style=u.npcStyle||'balanced',pace=style==='crime'||style==='combat'?rand(25,130):style==='saver'?rand(70,220):rand(35,180);u.nextNpcActionAt=now+pace*1000;if(Math.random()<(style==='saver'?.12:.08)){u.npcOnlineUntil=now;u.nextNpcLoginAt=now+rand(style==='saver'?25:15,style==='saver'?150:120)*60000}}saveSoon()}


function nightlifeState(u){if(!u.nightlife||typeof u.nightlife!=='object')u.nightlife={venues:[],nextVenueId:1};if(!Array.isArray(u.nightlife.venues))u.nightlife.venues=[];return u.nightlife}
function nightVenue(u,id){return nightlifeState(u).venues.find(v=>String(v.id)===String(id))}
function nightPromoCost(v,tier=1){tier=clamp(Math.floor(Number(tier)||1),1,3);const idx=nightPremiseIndex(v),base=Math.max(1200000,Number(v.area||120)*12000*(1+idx*.08));return Math.floor(base*[1,2.6,5.4][tier-1])}
function nightPromoHours(tier=1){tier=clamp(Math.floor(Number(tier)||1),1,3);return [2,4,8][tier-1]}
function nightVipBaseCost(v){const idx=nightPremiseIndex(v),rate=v.type==='bar'?12000:v.type==='club'?15000:18000;return Math.floor(Math.max(4000000,Number(v.area||120)*rate*(1+idx*.05)))}
function nightGuestFee(v,g){if(!g)return 0;const list=NIGHT_GUESTS[v.type]||[],tier=Math.max(0,list.findIndex(x=>x.id===g.id)),base=nightVipBaseCost(v);return Math.floor(base*[.9,2.2,5][tier<0?0:Math.min(2,tier)])}
function nightTrainingCost(v){const lvl=clamp(Math.floor(Number(v.trainingLevel||0)),0,100);if(lvl>=100)return 0;const base=Math.max(1000000,Number(v.area||120)*2500);return Math.floor(base*Math.pow(1+lvl/15,2.2))}
function nightPremiseIndex(v){const idx=NIGHT_PREMISES.findIndex(x=>x.id===v.premiseId);return idx<0?0:idx}
function nightRevenueScale(v){const last=Math.max(1,NIGHT_PREMISES.length-1),t=clamp(nightPremiseIndex(v)/last,0,1);return 1.75+5.25*Math.pow(t,1.45)}
function nightBlackHourlyCap(v){const idx=nightPremiseIndex(v),last=Math.max(1,NIGHT_PREMISES.length-1),t=idx/last;return Math.floor(30000000*Math.pow(1000000000/30000000,t))}
function nightBlackVipBoost(v,now=Date.now()){const active=v.vipEvent&&now>=Number(v.vipEvent.start||0)&&now<Number(v.vipEvent.end||0);if(!active)return 1;const t=nightPremiseIndex(v)/Math.max(1,NIGHT_PREMISES.length-1);return 1.8-(.45*t)}
function nightBlackDemandFactor(v){const cap=Math.max(1,nightCapacity(v)),vis=Math.max(0,Number(v.lastVisitors||0)),ratio=clamp(vis/cap,0,1.3);return v.open?clamp(.22+ratio*.78,.22,1.0):clamp(.16+ratio*.30,.16,.48)}
function nightRefreshBlackMarket(v,now=Date.now()){
 const slot=Math.floor(now/900000),m=v.blackMarket||{};if(Number(m.slot)===slot&&m.limits)return v.blackMarket=m;
 const hourly=nightBlackHourlyCap(v),target=Math.max(1000000,Math.floor(hourly/4*nightBlackDemandFactor(v)*nightBlackVipBoost(v,now)));
 const weights={ant:.22+Math.random()*.18,kok:.26+Math.random()*.22,jupp:.22+Math.random()*.18},sum=Object.values(weights).reduce((a,b)=>a+b,0);
 const limits={};for(const it of NIGHT_BLACK_ITEMS){const share=weights[it.id]/sum,profit=Math.max(1,it.sell-it.buy),sell=Math.max(1,Math.round(target*share/profit)),buy=Math.max(1,Math.round(sell*(.75+Math.random()*.85)));limits[it.id]={buy,sell,buyUsed:0,sellUsed:0}}
 v.blackMarket={slot,nextAt:(slot+1)*900000,limits,targetProfit:target,hourlyCap:hourly};return v.blackMarket
}
function nightClubScore(v){nightNormalizeVenue(v);const qa=nightAppeal(v),money=Math.max(0,Number(v.account||0)+Number(v.blackCash||0)),visit=Math.max(0,Number(v.totalVisitors||0)),rev=Math.max(0,Number(v.totalRevenue||0));return Math.max(1,Math.floor(Number(v.area||0)*130+Number(v.reputation||0)*12000+qa.appeal*900+nightStaffFactor(v)*180000+Math.log10(1+money)*180000+Math.log10(1+rev)*220000+Math.log10(1+visit)*140000))}
function nightClientVenue(v){nightNormalizeVenue(v);const {heat,...out}=v;const bm=nightRefreshBlackMarket(v),guestOptions=(NIGHT_GUESTS[v.type]||[]).map(g=>({...g,fee:nightGuestFee(v,g)})),live=nightLiveState(v);return {...out,clubScore:nightClubScore(v),normalEntryFee:nightBaseTicket(v),liveVisitors:live.visitors,liveTrend:live.trend,guestOptions,actionCosts:{promo:[1,2,3].map(t=>nightPromoCost(v,t)),promoHours:[1,2,3].map(t=>nightPromoHours(t)),vipBase:nightVipBaseCost(v),trainingLevel:v.trainingLevel,trainingNext:nightTrainingCost(v)},blackMarket:{nextAt:bm.nextAt,limits:bm.limits,hourlyCap:bm.hourlyCap}}}
function nightPublicRows(){const now=Date.now(),rows=[];for(const u of Object.values(db.users)){if(u.banned)continue;refreshNightlife(u);for(const v of nightlifeState(u).venues){nightNormalizeVenue(v);const live=nightLiveState(v,now);rows.push({ownerId:u.id,owner:u.name,name:v.name,type:v.type,city:v.city,area:v.area,open:v.open,entryFee:v.entryFee,lastVisitors:live.visitors,reputation:v.reputation||0,money:Math.floor(Number(v.account||0)+Number(v.blackCash||0)),clubScore:nightClubScore(v),vipActive:!!(v.vipEvent&&now>=v.vipEvent.start&&now<v.vipEvent.end)})}}return rows.sort((a,b)=>b.clubScore-a.clubScore).slice(0,200)}
function nightNormalizeVenue(v){const now=Date.now();v.area=Math.max(1,Number(v.area||120));v.baseArea=Math.max(1,Number(v.baseArea||v.area));v.extraArea=Math.max(0,Number(v.extraArea||0));v.accountOpen=!!v.accountOpen;v.account=Math.max(0,Number(v.account||v.cashbox||0));v.cashbox=0;v.blackCash=Math.max(0,Number(v.blackCash||0));v.blackStock=v.blackStock&&typeof v.blackStock==='object'?v.blackStock:{ant:0,kok:0,jupp:0};v.heat=clamp(Number(v.heat||0),0,100);v.inventory=v.inventory&&typeof v.inventory==='object'?v.inventory:{};v.itemCondition=v.itemCondition&&typeof v.itemCondition==='object'?v.itemCondition:{};for(const it of NIGHT_SHOP){if(v.inventory[it.id]&&!Number.isFinite(Number(v.itemCondition[it.id])))v.itemCondition[it.id]=100}v.staff=Array.isArray(v.staff)?v.staff:[];v.offers=v.offers&&typeof v.offers==='object'?v.offers:{};v.suppliers=v.suppliers&&typeof v.suppliers==='object'?v.suppliers:{};for(const kind of ['alcohol','food']){const sp=v.suppliers[kind];if(sp){sp.hours=[1,3,6,12].includes(Number(sp.hours))?Number(sp.hours):Math.min(12,Math.max(1,Number(sp.hours)||12));if(!Number.isFinite(Number(sp.startedAt))||Number(sp.startedAt)<=0)sp.startedAt=now;const maxUntil=Number(sp.startedAt)+sp.hours*3600000;if(!Number.isFinite(Number(sp.until))||Number(sp.until)<=0||Number(sp.until)>maxUntil)sp.until=maxUntil}}if(v.securityContract){const sc=v.securityContract;sc.hours=[1,3,6,12].includes(Number(sc.hours))?Number(sc.hours):Math.min(12,Math.max(1,Number(sc.hours)||12));if(!Number.isFinite(Number(sc.remainingMs))){const legacyHours=Number.isFinite(Number(sc.remainingHours))?Number(sc.remainingHours):sc.hours;sc.remainingMs=clamp(legacyHours,0,sc.hours)*3600000}sc.remainingMs=clamp(Number(sc.remainingMs||0),0,sc.hours*3600000);sc.remainingHours=sc.remainingMs/3600000;if(sc.remainingMs<=0)v.securityContract=null}v.events=Array.isArray(v.events)?v.events:[];v.declarations=Array.isArray(v.declarations)?v.declarations:[];v.open=!!v.open;v.windowStart=Number(v.windowStart||now);if(now-v.windowStart>=NIGHT_DAY_MS){const n=Math.floor((now-v.windowStart)/NIGHT_DAY_MS);v.windowStart+=n*NIGHT_DAY_MS;v.usedOpenMs=0}v.usedOpenMs=clamp(Number(v.usedOpenMs||0),0,NIGHT_MAX_OPEN_MS);v.openStartedAt=Number(v.openStartedAt||0);v.lastRevenueAt=Number(v.lastRevenueAt||now);v.lastUsageAt=Number(v.lastUsageAt||v.lastRevenueAt||now);v.currentDecl=v.currentDecl&&typeof v.currentDecl==='object'?v.currentDecl:null;v.entryFee=Math.max(0,Number(v.entryFee||0));v.reputation=clamp(Number(v.reputation||5),0,100);v.totalRevenue=Math.max(0,Number(v.totalRevenue||0));v.totalVisitors=Math.max(0,Number(v.totalVisitors||0));v.pendingStaffEvent=v.pendingStaffEvent||null;v.trainingLevel=clamp(Math.floor(Number(v.trainingLevel||0)),0,100);v.promoUntil=Math.max(0,Number(v.promoUntil||0));v.promoBoost=Math.max(1,Number(v.promoBoost||1));v.promoHourlyCost=Math.max(0,Number(v.promoHourlyCost||0));v.promoTier=clamp(Math.floor(Number(v.promoTier||0)),0,3);v.alerts=Array.isArray(v.alerts)?v.alerts:[];for(const a of v.alerts)if(!a.id)a.id=nightOfferId();v.blackMarket=v.blackMarket&&typeof v.blackMarket==='object'?v.blackMarket:{};v.premiseId=v.premiseId||NIGHT_PREMISES[0].id;nightRefreshBlackMarket(v,now);return v}
function nightPremise(v){return NIGHT_PREMISES.find(x=>x.id===v.premiseId)||NIGHT_PREMISES[0]}
function nightUsableArea(v){return Math.max(0,Number(v.area||0)*.75)}
function nightItemUsedArea(v){let a=0;for(const it of NIGHT_SHOP){const q=Math.max(0,Number(v.inventory?.[it.id]||0)),cond=Number(v.itemCondition?.[it.id]??100);if(cond>0)a+=q*Number(it.m2||0)}return Math.round(a*10)/10}
function nightFreeArea(v){return Math.max(0,Math.round((nightUsableArea(v)-nightItemUsedArea(v))*10)/10)}
function nightCapacity(v){const inv=v.inventory||{};const seats=(inv.table||0)*4+(inv.chair||0)+(inv.barstool||0)+(inv.sofa||0)*5+(inv.vipbooth||0)*8+(inv.private||0)*4;const areaCap=Math.max(20,Math.floor(nightUsableArea(v)*(v.type==='bar'?.75:1.05)));return Math.max(10,Math.min(areaCap,Math.max(seats,v.type==='bar'?12:Math.floor(areaCap*.3))))}
function nightLiveTarget(v,minuteIndex){if(!v.open)return 0;const cap=nightCapacity(v),qa=nightAppeal(v),sf=nightStaffFactor(v),rep=clamp(Number(v.reputation||0),0,100),priceF=nightDemandPriceFactor(v),promo=Number(v.promoUntil||0)>Date.now()?Number(v.promoBoost||1):1,vip=v.vipEvent&&Date.now()>=Number(v.vipEvent.start||0)&&Date.now()<Number(v.vipEvent.end||0)?Number(v.vipEvent.pull||1.18):1,alcQ=Number(v.suppliers?.alcohol?.quality||0),foodQ=Number(v.suppliers?.food?.quality||0),secQ=Number(v.securityContract?.quality||0),supplierF=v.suppliers?.alcohol?(.74+alcQ*.065):.46,foodF=v.suppliers?.food?(.82+foodQ*.04):.78,securityF=v.securityContract?(.88+secQ*.035):.72,quality=clamp(.16+qa.appeal/230+rep/180+sf*.40+supplierF*.14+foodF*.07+securityF*.06,.10,1.32);let seed=0;for(const ch of String(v.id||v.name||''))seed=(seed*31+ch.charCodeAt(0))%9973;const wave=1+Math.sin((Number(minuteIndex||0)+seed)*1.618)*.10+Math.sin((Number(minuteIndex||0)+seed)*.417)*.05;return clamp(Math.floor(cap*quality*priceF*promo*vip*wave),0,cap)}
function nightLiveState(v,now=Date.now()){if(!v.open)return{visitors:0,trend:'→ stabiilne'};const m=Math.floor(now/60000),cur=nightLiveTarget(v,m),prev=nightLiveTarget(v,m-1),diff=cur-prev,band=Math.max(2,Math.floor(Math.max(1,prev)*.04));return{visitors:cur,trend:diff>band?'↑ kasvab':diff<-band?'↓ langeb':'→ stabiilne'}}
function nightRoleCounts(v){const c={bartender:0,server:0,dj:0,cleaner:0,hostess:0,performer:0,kitchen:0};for(const x of v.staff||[])c[x.role]=(c[x.role]||0)+1;if(v.securityContract)c.security=Number(v.securityContract.guards||0);else c.security=0;return c}
function nightOptimal(v){const a=Math.max(120,Number(v.area||120)),h=a/100,foodOn=!!v.suppliers?.food;if(v.type==='bar')return{bartender:Math.max(2,Math.round(h*2.2)),server:Math.max(2,Math.round(h*2.6)),cleaner:Math.max(1,Math.round(h*.8)),kitchen:foodOn?Math.max(1,Math.round(h*1.2)):0,dj:0,hostess:0,performer:0,security:Math.max(1,Math.round(h*1.2))};if(v.type==='club')return{bartender:Math.max(2,Math.round(h*2.3)),server:Math.max(2,Math.round(h*2.2)),cleaner:Math.max(1,Math.round(h*.8)),kitchen:foodOn?Math.max(1,Math.round(h*.75)):0,dj:Math.max(1,Math.round(h*.45)),hostess:Math.max(1,Math.round(h*.65)),performer:0,security:Math.max(2,Math.round(h*1.8))};return{bartender:Math.max(2,Math.round(h*1.8)),server:Math.max(2,Math.round(h*1.4)),cleaner:Math.max(1,Math.round(h*.7)),kitchen:foodOn?Math.max(1,Math.round(h*.65)):0,dj:Math.max(1,Math.round(h*.35)),hostess:Math.max(1,Math.round(h*1.0)),performer:Math.max(4,Math.round(h*3.0)),security:Math.max(2,Math.round(h*1.6))}}
function nightStaffFactor(v){const c=nightRoleCounts(v),o=nightOptimal(v),keys=Object.keys(o).filter(k=>o[k]>0);let score=0;for(const k of keys){const r=(c[k]||0)/o[k];score+=r<1?Math.max(.18,r):r<=1.25?1:Math.max(.62,1-(r-1.25)*.18)}const staff=v.staff||[],avgExp=staff.length?staff.reduce((a,x)=>a+Number(x.exp||0),0)/staff.length:0,training=.82+avgExp*.033+clamp(Number(v.trainingLevel||0),0,100)*.0018;return clamp(score/Math.max(1,keys.length)*training,.12,1.24)}
function nightIdealQty(v,id){const a=Math.max(120,Number(v.area||120)),map=v.type==='bar'?{table:24,chair:12,barstool:18,sofa:120,vipbooth:320,barcounter:900,speaker2:180,speaker5:260,speaker10:520,sub:420,djbasic:900,djpro:1400,lights:520,laser:900}:v.type==='club'?{table:70,chair:35,barstool:30,sofa:90,vipbooth:180,barcounter:650,speaker2:260,speaker5:220,speaker10:180,sub:230,djbasic:700,djpro:900,lights:260,laser:420,stage:900}: {table:80,chair:45,barstool:28,sofa:85,vipbooth:150,barcounter:650,speaker2:300,speaker5:250,speaker10:220,sub:300,djbasic:850,djpro:1000,lights:300,laser:520,stage:750,private:240,dressing:900};return Math.max(1,Math.round(a/(map[id]||500)))}
function nightAppeal(v){const inv=v.inventory||{};let a=0,p=0,over=0;for(const item of NIGHT_SHOP){const q=Number(inv[item.id]||0),cond=Math.max(0,Number(v.itemCondition?.[item.id]??100))/100,ideal=nightIdealQty(v,item.id),effective=Math.min(q,ideal*1.15),excess=Math.max(0,q-ideal*1.25);a+=effective*Number(item.appeal||0)*cond-excess*Number(item.appeal||0)*.9;p+=Math.min(q,ideal*1.2)*Number(item.power||0)*cond;over+=excess*Number(item.m2||0)}const staff=(v.staff||[]).reduce((n,x)=>n+Number(x.exp||0),0);return{appeal:Math.max(0,a+staff*.32-over*.06),power:Math.max(0,p),overcrowd:over}}
function nightBaseTicket(v){const p=nightPremise(v),idx=Math.max(0,NIGHT_PREMISES.findIndex(x=>x.id===p.id)),progress=idx/Math.max(1,NIGHT_PREMISES.length-1),typeMult=v.type==='bar'?.82:v.type==='strip'?1.10:1;return Math.round((30000+progress*100000)*typeMult/1000)*1000}
function nightDemandPriceFactor(v){const base=Math.max(1000,nightBaseTicket(v)),fee=Math.max(0,Number(v.entryFee||0)),ratio=fee/base;if(ratio<=.5)return 1.20;if(ratio<=1)return 1.20-(ratio-.5)*.40;if(ratio<=1.3)return 1-(ratio-1)*.90;if(ratio<=1.6)return .73-(ratio-1.3)*1.65;if(ratio<2)return Math.max(0,.235-(ratio-1.6)*.59);return 0}
function nightReady(v){return !!(v&&v.constructionStatus==='done'&&v.accountOpen)}
function nightNewDecl(v,start){return{id:nightOfferId(),start,end:start+3600000,status:'running',visitors:0,gross:0,wages:0,security:0,suppliers:0,maintenance:0,advertising:0,training:0,vip:0,other:0,tax:0,netBeforeTax:0,events:[]}}
function nightAddDeclEvent(v,text){if(!v.currentDecl)v.currentDecl=nightNewDecl(v,Date.now());v.currentDecl.events=v.currentDecl.events||[];v.currentDecl.events.push(String(text).slice(0,180))}
function nightMaybeStaffEvent(v){if(!v.staff?.length||Math.random()>.018)return;const x=v.staff[rand(0,v.staff.length-1)],name=x.stageName||x.name;if(Math.random()<.45){const pct=rand(8,28),newW=Math.floor(x.wage*(1+pct/100));x.raiseRequest={newWage:newW,at:Date.now(),expires:Date.now()+86400000};nightAddDeclEvent(v,`${name} küsis palgatõusu ${x.wage} € → ${newWageFix(newW)} € / h.`)}else{const reasons=v.type==='bar'?['alkoholiprobleemid','parem tööpakkumine','halb graafik','konflikt kliendiga','korduvad hilinemised']:v.type==='club'?['parem klubi pakkumine','läbipõlemine','konflikt turvaga','palgavaidlus','korduvad puudumised']:['parem pakkumine teiselt klubilt','isiklikud põhjused','palgavaidlus','narkootikumide probleemid','konflikt kolleegiga','töötingimused'];const reason=reasons[rand(0,reasons.length-1)];v.staff=v.staff.filter(y=>y.id!==x.id);nightAddDeclEvent(v,`${name} lahkus. Põhjus: ${reason}.`)}}
function newWageFix(n){return Math.max(0,Math.floor(Number(n)||0))}
function nightRunMaintenance(v,decl,hours){let cost=0;for(const it of NIGHT_SHOP){const q=Number(v.inventory?.[it.id]||0);if(!q)continue;let cond=Number(v.itemCondition?.[it.id]??100);const wear=(.06+Math.random()*.22)*hours*(1+q/40);cond=Math.max(0,cond-wear);if(Math.random()<.005*hours*q){const loss=Math.min(cond,rand(8,28));cond=Math.max(0,cond-loss);decl.events.push(`${it.name}: klientide/vandalismi tõttu lisakulumine -${loss}%.`)}if(cond>0&&cond<35&&Math.random()<.05*hours){const repair=Math.floor(it.price*q*(.015+Math.random()*.025));cost+=repair;cond=Math.min(100,cond+rand(8,20));decl.events.push(`${it.name}: hooldus/remont ${repair} €.`)}if(cond<=0){decl.events.push(`${it.name} muutus kasutuskõlbmatuks; selle põrandapind vabanes.`)}v.itemCondition[it.id]=Math.round(cond*10)/10}decl.maintenance+=cost;return cost}
function nightHourlyTick(v,start){const decl=(v.currentDecl&&v.currentDecl.status==='running')?v.currentDecl:nightNewDecl(v,start),cap=nightCapacity(v);decl.start=start;decl.end=start+3600000;const qa=nightAppeal(v),sf=nightStaffFactor(v),sec=Number(v.securityContract?.guards||0),opt=nightOptimal(v),secF=opt.security?Math.min(1.12,.45+sec/opt.security*.58):1,rep=clamp(Number(v.reputation||0),0,100),priceF=nightDemandPriceFactor(v),promoActive=Number(v.promoUntil||0)>start,promo=promoActive?Number(v.promoBoost||1):1,vip=v.vipEvent&&start>=v.vipEvent.start&&start<v.vipEvent.end?v.vipEvent:null,guest=vip?NIGHT_GUESTS[v.type].find(x=>x.id===vip.guestId):null,vipF=vip?Number(vip.pull||guest?.pull||1.18):1;const alcQ=Number(v.suppliers?.alcohol?.quality||0),foodQ=Number(v.suppliers?.food?.quality||0),secQ=Number(v.securityContract?.quality||0),supplierF=v.suppliers?.alcohol?(.74+alcQ*.065):.46,foodF=v.suppliers?.food?(.82+foodQ*.04):.78,securityQualityF=v.securityContract?(.88+secQ*.035):.72,quality=clamp(.16+qa.appeal/230+rep/180+sf*.40+secF*.14+supplierF*.14+foodF*.07+securityQualityF*.06,0.10,1.38);const crowd=Math.max(0,Math.floor(cap*quality*priceF*promo*vipF*(.60+Math.random()*.36)));const spendBase=v.type==='bar'?22000:v.type==='club'?38000:58000;const supplierSpend=v.suppliers?.alcohol?(0.91+alcQ*.028):.88,foodSpend=v.suppliers?.food?(0.96+foodQ*.015):.94;const gross=Math.floor(crowd*(spendBase+Number(v.entryFee||0))*(1+Math.min(.35,qa.power/180))*supplierSpend*foodSpend*nightRevenueScale(v));const wages=Math.floor((v.staff||[]).reduce((a,x)=>a+Number(x.wage||0),0));const security=Math.floor(Number(v.securityContract?.hourly||0));const supplier=Math.floor(gross*(v.suppliers?.food?.selected?.discount?.18:.22));decl.visitors=crowd;decl.gross=gross;decl.wages=wages;decl.security=security;decl.suppliers=supplier;decl.advertising=Number(decl.advertising||0)+(promoActive?Number(v.promoHourlyCost||0):0);decl.vip=Number(decl.vip||0)+(vip?Math.floor(Number(vip.hourCost||0)):0);decl.training=Number(decl.training||0);const maint=nightRunMaintenance(v,decl,1);const allocatedExpenses=wages+security+supplier+decl.advertising+decl.vip+Number(decl.training||0)+Number(decl.other||0)+maint;const cashExpenses=wages+supplier+maint;decl.tax=Math.floor(gross*NIGHT_TAX);decl.netBeforeTax=gross-allocatedExpenses;v.account=Math.max(0,Number(v.account||0)+gross-cashExpenses);v.totalRevenue=(v.totalRevenue||0)+gross;v.totalVisitors=(v.totalVisitors||0)+crowd;v.lastVisitors=crowd;nightMaybeStaffEvent(v);decl.status='pending';decl.end=start+3600000;v.declarations.unshift(decl);v.declarations=v.declarations.slice(0,240);return decl}
function refreshNightlife(u){const now=Date.now(),n=nightlifeState(u);for(const raw of n.venues){const v=nightNormalizeVenue(raw);for(const kind of ['alcohol','food']){const sp=v.suppliers?.[kind];if(sp&&Number(sp.until||0)>0&&now>=Number(sp.until||0)){const label=kind==='alcohol'?'Joogitarnija':'Söögitarnija';v.alerts.unshift({id:nightOfferId(),time:now,text:`${label} leping lõppes — vajadusel tee uus hange.`});v.alerts=v.alerts.slice(0,12);delete v.suppliers[kind]}}if(v.constructionStatus==='building'&&now>=Number(v.constructionDoneAt||0)){v.constructionStatus='done';v.constructionDoneAt=0;v.alerts.unshift({id:nightOfferId(),time:now,text:'Ehitushange on lõppenud — koht on valmis.'});v.alerts=v.alerts.slice(0,12)}if(now-v.windowStart>=NIGHT_DAY_MS){const count=Math.floor((now-v.windowStart)/NIGHT_DAY_MS);v.windowStart+=count*NIGHT_DAY_MS;v.usedOpenMs=0}if(!v.open){v.lastRevenueAt=now;continue}v.ready=nightReady(v);if(!v.ready){v.open=false;continue}const remaining=Math.max(0,NIGHT_MAX_OPEN_MS-v.usedOpenMs),usageElapsed=Math.max(0,Math.min(now-v.lastUsageAt,remaining));if(usageElapsed<=0){if(remaining<=0){v.open=false;v.openStartedAt=0}continue}const endAt=v.lastUsageAt+usageElapsed;v.usedOpenMs=Math.min(NIGHT_MAX_OPEN_MS,v.usedOpenMs+usageElapsed);v.lastUsageAt=endAt;if(v.securityContract){const sc=v.securityContract;sc.remainingMs=Math.max(0,Number(sc.remainingMs||Number(sc.remainingHours||sc.hours||12)*3600000)-usageElapsed);sc.remainingHours=sc.remainingMs/3600000;if(sc.remainingMs<=0){v.alerts=v.alerts||[];v.alerts.unshift({id:nightOfferId(),time:now,text:`Turva ${Number(sc.hours||12)}h pakett sai läbi — tee uus turvahange.`});v.alerts=v.alerts.slice(0,12);nightAddDeclEvent(v,`Turva ${Number(sc.hours||12)}h pakett sai kasutatud.`);v.securityContract=null}}while(v.lastRevenueAt+3600000<=endAt){nightHourlyTick(v,v.lastRevenueAt);v.lastRevenueAt+=3600000;v.currentDecl=null}const partial=endAt-v.lastRevenueAt;if(partial>0){if(!v.currentDecl)v.currentDecl=nightNewDecl(v,v.lastRevenueAt);const frac=partial/3600000,cap=nightCapacity(v),sf=nightStaffFactor(v),priceF=nightDemandPriceFactor(v);v.currentDecl.visitors=Math.max(0,Math.floor(cap*.55*sf*priceF*frac));v.currentDecl.gross=Math.max(0,Math.floor(v.currentDecl.visitors*(v.type==='bar'?22000:v.type==='club'?38000:58000)*nightRevenueScale(v)));v.currentDecl.tax=Math.floor(v.currentDecl.gross*NIGHT_TAX)}if(v.promoUntil&&now>=Number(v.promoUntil||0)&&!v.promoEndedAlerted){v.promoEndedAlerted=true;v.alerts.unshift({id:nightOfferId(),time:now,text:'Reklaamikampaania on lõppenud.'});v.alerts=v.alerts.slice(0,12)}if(v.vipEvent&&now>=Number(v.vipEvent.end||0)&&!v.vipEvent.alerted){v.vipEvent.alerted=true;v.alerts.unshift({id:nightOfferId(),time:now,text:'VIP-õhtu on lõppenud.'});v.alerts=v.alerts.slice(0,12)}if(v.usedOpenMs>=NIGHT_MAX_OPEN_MS){v.open=false;v.openStartedAt=0;v.usedOpenMs=NIGHT_MAX_OPEN_MS}}}
function nightOfferId(){return crypto.randomBytes(5).toString('hex')}
function nightConstructionOffers(v){return Array.from({length:4},()=>{const q=rand(62,99),base=Math.max(800000,Math.floor((v.premiseCost||12000000)*(.12+Math.random()*.14))),market=.65+Math.random()*1.15;return{id:nightOfferId(),company:NIGHT_BUILDERS[rand(0,NIGHT_BUILDERS.length-1)],price:Math.floor(base*market),minutes:rand(2,12),quality:q}}).sort((a,b)=>a.price-b.price)}
function nightSecurityOffers(v){
 const hoursPool=[1,3,6,12],areaScale=Math.max(.8,Math.sqrt(Number(v.area||120)/120));
 return Array.from({length:4},()=>{const hours=hoursPool[rand(0,hoursPool.length-1)],quality=rand(1,5),guards=rand(2,Math.max(4,Math.ceil((v.area||120)/120)+3)),qMult=[0,.72,.86,1,1.20,1.43][quality],hourly=Math.floor(guards*52000*areaScale*qMult*(.97+Math.random()*.06)),total=hourly*hours;return{id:nightOfferId(),company:NIGHT_SECURITY[rand(0,NIGHT_SECURITY.length-1)],guards,hours,hourly,total,quality}}).sort((a,b)=>a.total-b.total)
}
function nightSupplierOffers(v,kind){
 const arr=kind==='alcohol'?NIGHT_ALCOHOL:NIGHT_FOOD,hoursPool=[1,3,6,12],areaScale=Math.max(.75,Math.sqrt(Number(v.area||120)/120)),baseHourly=kind==='alcohol'?310000:250000;
 return Array.from({length:4},()=>{const hours=hoursPool[rand(0,hoursPool.length-1)],quality=rand(1,5),qMult=[0,.62,.80,1,1.27,1.58][quality],hourly=Math.floor(baseHourly*areaScale*qMult*(.98+Math.random()*.04)),setup=hourly*hours,discount=Math.max(2,Math.round(4+quality*2+Math.random()*3));return{id:nightOfferId(),company:arr[rand(0,arr.length-1)],kind,setup,hourly,discount,quality,hours}}).sort((a,b)=>a.setup-b.setup)
}
function nightStaffApps(v,role){return Array.from({length:7},()=>{const exp=rand(0,10),base={bartender:90000,server:70000,dj:180000,dancer:130000,performer:220000,cleaner:65000,hostess:85000,kitchen:100000}[role]||80000,isF=role==='performer'||Math.random()<.48,name=(isF?NIGHT_NAMES_F:NIGHT_NAMES_M)[rand(0,(isF?NIGHT_NAMES_F:NIGHT_NAMES_M).length-1)],x={id:nightOfferId(),role,name,exp,wage:base+exp*rand(6500,18000),morale:rand(65,100)};if(role==='performer'){x.adult=true;x.age=rand(19,35);x.stageName=name;x.height=rand(155,182);x.weight=rand(48,78);x.hair=NIGHT_HAIR[rand(0,NIGHT_HAIR.length-1)];x.cup=NIGHT_CUPS[rand(0,NIGHT_CUPS.length-1)]}return x})}
function nightCharge(v,amount,label,field='other',user=null){amount=Math.max(0,Math.floor(Number(amount)||0));if(!v.accountOpen)return{ok:false,error:'Ava kõigepealt selle koha pangakonto.'};if(v.account<amount)return{ok:false,error:`Koha kontol pole piisavalt raha. Vaja ${amount} €.`};v.account-=amount;gameIncome(amount,'nightlife_system_expense',user);if(!v.currentDecl)v.currentDecl=nightNewDecl(v,Date.now());if(field)v.currentDecl[field]=(Number(v.currentDecl[field]||0)+amount);if(label)nightAddDeclEvent(v,`${label}: -${amount} €.`);return{ok:true}}
function nightPendingTaxes(v){return (v.declarations||[]).filter(d=>d.status==='pending').reduce((a,d)=>a+Math.max(0,Number(d.tax||0)),0)}
function bankLimit(u){return EDU[u.education]?.bank||1e6}
function creditBankFirst(u,amount){const total=Math.max(0,Math.floor(Number(amount)||0)),lien=payMaintenanceDebtFromIncoming(u,total),afterLien=lien.remaining,limit=Math.max(0,Math.floor(bankLimit(u))),space=Math.max(0,limit-Math.floor(Number(u.bank)||0)),toBank=Math.min(afterLien,space),toCash=afterLien-toBank;u.bank=(Number(u.bank)||0)+toBank;u.cash=(Number(u.cash)||0)+toCash;return{total,toBank,toCash,maintenancePaid:lien.paid}}
function loanBaseDue(l){return Math.max(0,Math.floor(Number(l.totalDue)||Number(l.principal||0)*(1+Number(l.rate||0)/100)))}
function overdueLoans(u){return Object.values(db.loans||{}).filter(l=>l.borrower===u.id&&l.status==='overdue'&&Number(l.unpaid||0)>0).sort((a,b)=>(a.due||0)-(b.due||0))}
function applyDebtPayment(u,amount,source='income'){
  let remaining=Math.max(0,Math.floor(Number(amount)||0)),paid=0;
  const rows=[];
  for(const l of overdueLoans(u)){
    if(remaining<=0)break;
    const debt=Math.max(0,Math.floor(Number(l.unpaid)||0));if(!debt)continue;
    const x=Math.min(remaining,debt),b=db.playerBanks[l.bankOwner];
    l.unpaid=debt-x;l.paid=(Number(l.paid)||0)+x;l.lastPaymentAt=Date.now();l.lastPaymentSource=source;
    if(b)b.capital=(Number(b.capital)||0)+x;
    remaining-=x;paid+=x;rows.push({loanId:l.id,amount:x,bankOwner:l.bankOwner});
    if(l.unpaid<=0){l.unpaid=0;l.status='repaid';l.repaidAt=Date.now();notify(u,'loan',`Laen #${l.id} on täielikult tasutud.`)}
  }
  return{paid,remaining,rows};
}
function creditSalaryWithDebt(u,amount){const total=Math.max(0,Math.floor(Number(amount)||0));if(total>0){db.gameBank.balance=(Number(db.gameBank.balance)||0)-total;db.gameBank.log.unshift({time:Date.now(),type:'salary_payout',amount:-total,userId:u.id,user:u.name});db.gameBank.log=db.gameBank.log.slice(0,3000)}const c=applyGameBankDebtPayment(u,total,'money','salary'),d=applyDebtPayment(u,c.remaining,'salary');if(d.remaining>0)creditBankFirst(u,d.remaining);if(c.paid>0)notify(u,'loan',`Palgast suunati ${c.paid} € automaatselt Keskpanga võla katteks.`);if(d.paid>0)notify(u,'loan',`Palgast suunati ${d.paid} € automaatselt võlgnevuses mängijapanga laenu katteks${d.remaining>0?`. Ülejäänud ${d.remaining} € laekus tavapäraselt.`:'.'}`);return{paid:c.paid+d.paid,centralPaid:c.paid,playerPaid:d.paid,remaining:d.remaining}}
function processSalaryDue(u,now=Date.now()){
  let j=jobFor(u);
  if(!Number.isFinite(Number(u.lastSalaryAt))||u.lastSalaryAt<=0||u.lastSalaryAt>now)u.lastSalaryAt=now;
  // Kui vana/vigane jobId ei leia enam tööd, taastame mängija automaatselt
  // tema hariduse parimale saadaolevale tööle, mitte ei jäta palka nulli.
  if(!j&&u.jobId){
    const jobs=(JOBS[Math.max(0,Number(u.education)||0)]||[]).slice().sort((a,b)=>(b.pay||0)-(a.pay||0));
    if(jobs.length){u.jobId=jobs[0].id;j=jobs[0]}
  }
  if(!j){u.lastSalaryAt=now;return 0}
  const pays=Math.floor((now-u.lastSalaryAt)/SALARY_INTERVAL);
  if(pays<=0)return 0;
  const amount=Math.max(0,Math.floor(pays*Number(j.pay||0)));
  if(amount>0)creditSalaryWithDebt(u,amount);
  u.lastSalaryAt+=pays*SALARY_INTERVAL;
  return amount
}
function creditBusinessWithDebt(u,amount,source='business'){const total=Math.max(0,Math.floor(Number(amount)||0)),c=applyGameBankDebtPayment(u,total,'money',source),d=applyDebtPayment(u,c.remaining,source);if(d.remaining>0)u.cash=(Number(u.cash)||0)+d.remaining;if(c.paid>0)notify(u,'loan',`Äritulust suunati ${c.paid} € automaatselt Keskpanga võla katteks.`);if(d.paid>0)notify(u,'loan',`Äritulust suunati ${d.paid} € automaatselt võlgnevuses mängijapanga laenu katteks${d.remaining>0?`. Ülejäänud ${d.remaining} € jäi sulle.`:'.'}`);return{paid:c.paid+d.paid,centralPaid:c.paid,playerPaid:d.paid,remaining:d.remaining}}
function gameBankOverdueLoans(u,type=null){return Object.values(db.gameBank?.loans||{}).filter(l=>l.userId===u.id&&l.status==='overdue'&&Number(l.unpaid||0)>0&&(!type||l.type===type)).sort((a,b)=>(a.due||0)-(b.due||0))}
function applyGameBankDebtPayment(u,amount,type='money',source='income'){let remaining=Math.max(0,Math.floor(Number(amount)||0)),paid=0,rows=[];for(const l of gameBankOverdueLoans(u,type)){if(remaining<=0)break;const debt=Math.max(0,Math.floor(Number(l.unpaid)||0));if(!debt)continue;const x=Math.min(remaining,debt);l.unpaid=debt-x;l.paid=(Number(l.paid)||0)+x;l.lastPaymentAt=Date.now();l.lastPaymentSource=source;if(type==='money'){if(l.autoLoan)db.gameBank.autoMoneyFund=(Number(db.gameBank.autoMoneyFund)||0)+x;else db.gameBank.balance=(Number(db.gameBank.balance)||0)+x}else{if(l.autoLoan)db.gameBank.autoTurnsFund=(Number(db.gameBank.autoTurnsFund)||0)+x;else db.gameBank.turnsBalance=(Number(db.gameBank.turnsBalance)||0)+x}remaining-=x;paid+=x;rows.push({loanId:l.id,amount:x});db.gameBank.log.unshift({time:Date.now(),type:type==='money'?'central_overdue_repay_money':'central_overdue_repay_turns',amount:x,userId:u.id,user:u.name,source});if(l.unpaid<=0){l.unpaid=0;l.status='repaid';l.repaidAt=Date.now();notify(u,'loan',`Keskpanga ${type==='money'?'raha':'käigu'}laen #${l.id} on täielikult tasutud.`)}}db.gameBank.log=db.gameBank.log.slice(0,3000);return{paid,remaining,rows}}
function creditCashWithDebt(u,amount,source='cash_income'){const total=Math.max(0,Math.floor(Number(amount)||0));const c=applyGameBankDebtPayment(u,total,'money',source);if(c.remaining>0)u.cash=(Number(u.cash)||0)+c.remaining;if(c.paid>0)notify(u,'loan',`Keskpanga võla katteks suunati uuest sularahatulust ${c.paid} €.`);return{paidCentral:c.paid,remaining:c.remaining}}
function creditTurnsWithDebt(u,amount,source='turn_income'){const total=Math.max(0,Math.floor(Number(amount)||0));const c=applyGameBankDebtPayment(u,total,'turns',source);if(c.remaining>0)u.turns=(Number(u.turns)||0)+c.remaining;if(c.paid>0)notify(u,'loan',`Keskpanga käiguvõla katteks suunati ${c.paid} uut käiku.`);return c}
function seizeGameBankMoneyBalances(u,source='overdue_balance_seizure'){const available=Math.max(0,Math.floor(Number(u.bank)||0))+Math.max(0,Math.floor(Number(u.cash)||0));if(available<=0)return{paid:0,remaining:available};const c=applyGameBankDebtPayment(u,available,'money',source);let take=Math.max(0,Math.floor(Number(c.paid)||0));if(take>0){const fromBank=Math.min(take,Math.max(0,Math.floor(Number(u.bank)||0)));u.bank-=fromBank;take-=fromBank;const fromCash=Math.min(take,Math.max(0,Math.floor(Number(u.cash)||0)));u.cash-=fromCash;take-=fromCash;notify(u,'loan',`Keskpanga üle tähtaja võla katteks võeti sinu pangast ja sularahast kokku ${c.paid} €.`)}return c}
function notifyLongGameBankDebt(l,u,now){if(l.status!=='overdue'||Number(l.unpaid||0)<=0)return;const overdueAt=Number(l.overdueAt||l.due||0);if(!overdueAt||now-overdueAt<72*3600000||l.notified72hAt)return;l.notified72hAt=now;const hrs=Math.floor((now-overdueAt)/3600000),unit=l.type==='money'?'€':'käiku',text=`⚠️ Pikaajaline Keskpanga võlg: ${u.name} · laen #${l.id} · ${hrs}h üle tähtaja · jääk ${Math.floor(Number(l.unpaid)||0)} ${unit}.`;for(const staff of Object.values(db.users).filter(x=>['owner','admin'].includes(x.role)))notify(staff,'admin',text,{loanId:l.id,userId:u.id,kind:'game_bank_72h_overdue'});db.gameBank.log.unshift({time:now,type:'central_loan_72h_alert',amount:Math.floor(Number(l.unpaid)||0),userId:u.id,user:u.name,loanId:l.id});db.gameBank.log=db.gameBank.log.slice(0,3000)}
function settleGameBankLoans(){const now=Date.now(),day=86400000,daily=clamp(Number(db.settings.loanLateFeeDaily??.01),0,.10),capRate=clamp(Number(db.settings.loanLateFeeCap??.50),0,5);const seizedUsers=new Set();for(const l of Object.values(db.gameBank?.loans||{})){const u=byId(l.userId);if(!u)continue;if(l.status==='active'&&now>=Number(l.due||0)){l.status='overdue';l.overdueAt=now;l.lastLateFeeAt=now;l.lateFeeAdded=Number(l.lateFeeAdded)||0;notify(u,'loan',`Keskpanga ${l.type==='money'?'raha':'käigu'}laen #${l.id} läks üle tähtaja. Võlg on nüüd punases, lisandub viivis ning ${l.type==='money'?'pangakonto, sularaha, palk ja uus rahatulu':'uus käigutulu'} suunatakse automaatselt võla katteks.`)}if(l.status==='overdue'&&Number(l.unpaid||0)>0){if(l.type==='money'&&!seizedUsers.has(u.id)){seizeGameBankMoneyBalances(u);seizedUsers.add(u.id)}if(l.status!=='overdue'||Number(l.unpaid||0)<=0)continue;const last=Math.max(Number(l.lastLateFeeAt||l.overdueAt||l.due||now),0),days=Math.floor((now-last)/day);if(days>0){const base=Math.max(1,Math.floor(Number(l.totalDue)||Number(l.principal||0)*(1+Number(l.rate||0)/100))),cap=Math.floor(base*capRate),already=Math.max(0,Math.floor(Number(l.lateFeeAdded)||0)),room=Math.max(0,cap-already);let fee=0,debt=Math.max(0,Math.floor(Number(l.unpaid)||0));for(let i=0;i<days&&fee<room&&daily>0;i++){const add=Math.max(1,Math.floor(debt*daily)),actual=Math.min(add,room-fee);fee+=actual;debt+=actual}if(fee>0){l.unpaid+=fee;l.lateFeeAdded=already+fee;notify(u,'loan',`Keskpanga laen #${l.id}: lisandus ${fee}${l.type==='money'?' €':' käiku'} viivist. Tasumata kokku ${Math.floor(l.unpaid)}${l.type==='money'?' €':' käiku'}.`)}l.lastLateFeeAt=last+days*day}notifyLongGameBankDebt(l,u,now)}}}
function gameTickBoundary(ts=Date.now()){return Math.floor(Number(ts||Date.now())/GAME_TICK_MS)*GAME_TICK_MS}
function ensureGameClock(){
  db.meta=db.meta||{};
  if(!Number.isFinite(Number(db.meta.lastGameTickAt))||Number(db.meta.lastGameTickAt)<=0){
    // Esmakordsel V6.75 käivitamisel ankurdame ühise kella praeguse 15-min piiri külge.
    // Vanad kasutaja timestampid säilivad andmetes, kuid edaspidi juhib 15-min arvestusi üks kell.
    db.meta.lastGameTickAt=gameTickBoundary(Date.now());
  }
  return Number(db.meta.lastGameTickAt);
}
function processOneGameTick(tickAt){
  let changed=false;
  for(const u of Object.values(db.users)){
    if(Number(u.createdAt||0)>tickAt)continue;
    // KÄIGUD – kõik kasutajad saavad sama globaalse ticki peal.
    if(Number(u.turns||0)<Number(db.settings.maxNaturalTurns||3000)){
      const gain=Math.max(0,Math.min(Number(db.settings.turnBatch||50),Number(db.settings.maxNaturalTurns||3000)-Number(u.turns||0)));
      if(gain>0){creditTurnsWithDebt(u,gain,'global_15m_tick');changed=true}
    }
    u.lastTurnAt=tickAt;

    // PALK – üks palk iga globaalse 15-min ticki kohta.
    let j=jobFor(u);
    if(!j&&u.jobId){
      const jobs=(JOBS[Math.max(0,Number(u.education)||0)]||[]).slice().sort((a,b)=>(b.pay||0)-(a.pay||0));
      if(jobs.length){u.jobId=jobs[0].id;j=jobs[0]}
    }
    if(j&&Number(j.pay||0)>0){creditSalaryWithDebt(u,Number(j.pay||0));changed=true}
    u.lastSalaryAt=tickAt;

    // WANTED/VIP/KINDLUSTUS – sama 15-min tick.
    if(Number(u.wanted||0)>0&&Math.random()<.25){u.wanted=Math.max(0,Number(u.wanted||0)-1);changed=true}
    if(u.vipUntil&&u.vipUntil<tickAt){u.vip=false;u.vipUntil=0;changed=true}
    if(u.insurance?.active&&u.insurance.until<tickAt){u.insurance.active=false;changed=true}
  }
  // TURUD/KRÜPTO – samuti üks kord iga ühise 15-min ticki kohta.
  db.settings.cryptoNext=tickAt;
  db.settings.marketNext=tickAt;
  updateCrypto();
  updateMarket();
  // Hoia järgmise turu/krüpto uuenduse aeg täpselt sama globaalse ticki küljes.
  db.settings.cryptoNext=tickAt+GAME_TICK_MS;
  db.settings.marketNext=tickAt+GAME_TICK_MS;
  return changed;
}
function processGameClock(now=Date.now()){
  ensureGameClock();
  const currentBoundary=gameTickBoundary(now);
  let last=Number(db.meta.lastGameTickAt||currentBoundary),ticks=0,changed=false;
  // Offline catch-up: töötleme kõik vahele jäänud 15-min perioodid, turvalise ülempiiriga.
  const maxCatchup=7*24*4; // kuni 7 päeva ühe käivituse kohta
  while(last+GAME_TICK_MS<=currentBoundary&&ticks<maxCatchup){
    last+=GAME_TICK_MS;
    changed=processOneGameTick(last)||changed;
    ticks++;
  }
  if(ticks>0){db.meta.lastGameTickAt=last;changed=true;io.emit('settings',db.settings)}
  return{ticks,changed,nextAt:last+GAME_TICK_MS};
}
function nextGlobalTickMs(){ensureGameClock();return Math.max(0,Number(db.meta.lastGameTickAt)+GAME_TICK_MS-Date.now())}
function maintenanceBreakdown(u){const property=Math.floor((PROPERTY_PRICES[u.propertyLevel]||0)*db.settings.maintenanceRate),mafia=Math.floor((u.mafia||0)*250),guards=Math.floor((u.guards||0)*250),weaponValue=Object.entries(u.weapons||{}).reduce((sum,[i,q])=>sum+weaponPrice(i)*q,0),weapons=Math.floor(weaponValue*.0005),businesses=Math.floor(Object.entries(u.businesses||{}).reduce((sum,[id,l])=>sum+(BIZ.find(x=>x.id===id)?.base||0)*l*.01,0)),total=property+mafia+guards+weapons+businesses;return{property,mafia,guards,weapons,businesses,total}}
function payMaintenanceDebtFromIncoming(u,amount){let n=Math.max(0,Math.floor(Number(amount)||0)),debt=Math.max(0,Math.floor(Number(u.maintenanceDebt)||0));if(!debt||!n)return{paid:0,remaining:n};const paid=Math.min(debt,n);u.maintenanceDebt=debt-paid;gameIncome(paid,'maintenance_debt_payment',u);if(u.maintenanceDebt<=0){u.maintenanceDebt=0;notify(u,'maintenance','Kõrvalkulude võlg on tasutud ja pangakonto arest vabastati.')}return{paid,remaining:n-paid}}
function chargeMaintenance(u,manual=false){const b=maintenanceBreakdown(u),prior=Math.max(0,Math.floor(Number(u.maintenanceDebt)||0)),due=b.total+prior;let left=due,fromBank=Math.min(left,Math.max(0,Math.floor(Number(u.bank)||0)));u.bank-=fromBank;left-=fromBank;let fromCash=Math.min(left,Math.max(0,Math.floor(Number(u.cash)||0)));u.cash-=fromCash;left-=fromCash;const paid=due-left;if(paid>0)gameIncome(paid,'maintenance_payment',u);u.maintenanceDebt=left;u.maintenanceLastBill={time:Date.now(),...b,priorDebt:prior,paid,unpaid:left};if(!manual)u.maintenanceDue=Date.now()+86400000;if(left>0)notify(u,'maintenance',`Kõrvalkuludest jäi tasumata ${left} €. Pangakontole rakendus arest kuni võlg on tasutud.`);return u.maintenanceLastBill}
function refresh(u){const now=Date.now();processGameClock(now);refreshNightlife(u);if(now>=u.maintenanceDue){chargeMaintenance(u,false)}}
function nextTurns(u){refresh(u);return nextGlobalTickMs()}
function needTurns(u,n){refresh(u);if(u.turns<n)return false;u.turns-=n;return true}
function progressionScore(l,max,share,minLevel=1){const level=Math.max(minLevel,Math.min(max,Number(l)||minLevel));if(level<=minLevel)return 0;const progress=(level-minLevel)/(max-minLevel);return share*Math.pow(progress,4.2)}
function score(u){const progression=progressionScore(u.mafiaLevel,300,160e9,1)+progressionScore(u.securityLevel,300,160e9,1)+progressionScore(u.propertyLevel,100,118e9,0),troops=(Number(u.mafia||0)+Number(u.guards||0))*110,weps=Object.entries(u.weapons||{}).reduce((s,[i,q])=>s+(WEAPONS[i]?.score||0)*q,0),biz=Object.values(u.businesses||{}).reduce((s,l)=>s+l*l*100000,0),nightlife=(u.nightlife&&Array.isArray(u.nightlife.venues)?u.nightlife.venues:[]).reduce((s,v)=>s+nightClubScore(v),0);return Math.max(0,Math.floor(progression+troops+weps+biz+nightlife))}
function market(x=1){return Math.max(.45,Math.min(2.5,Number(db.settings.economyMarket||1)*Number(x||1)))}
function weaponPrice(i){if(!WEAPONS[i])return 0;if(i===0)return 0;const base=WEAPONS[i].price||0;const raw=Number(db.settings.weaponPriceOverrides?.[i]);return Math.max(1000,Math.min(250000,Math.floor(Number.isFinite(raw)?raw:base)))}
function baseCombat(u){const cap=(u.mafia+u.guards)*2,w=Object.entries(u.weapons||{}).reduce((s,[i,q])=>s+(WEAPONS[i]?.atk||0)*Math.min(q,cap),0),d=Object.entries(u.weapons||{}).reduce((s,[i,q])=>s+(WEAPONS[i]?.def||0)*Math.min(q,cap),0);return{atk:u.mafia*(20+u.mafiaLevel*1.8)+w,def:u.guards*(22+u.securityLevel*2)+d}}
function gameIncome(amount,type,user){amount=Math.max(0,Math.floor(amount||0));db.gameBank.balance=(db.gameBank.balance||0)+amount;db.gameBank.log.unshift({time:Date.now(),type,amount,userId:user?.id||'',user:user?.name||''});db.gameBank.log=db.gameBank.log.slice(0,3000);return amount}
function netWorth(u){const weapon=Object.entries(u.weapons||{}).reduce((s,[i,q])=>s+Math.floor(weaponPrice(i)*q*.7),0),cars=(u.cars||[]).reduce((s,c)=>s+Math.floor((c.market||c.buy||0)*market(db.settings.carMarket)),0),property=Math.floor((PROPERTY_PRICES[u.propertyLevel]||0)*market()),biz=Object.entries(u.businesses||{}).reduce((s,[id,l])=>{const b=BIZ.find(x=>x.id===id);return s+(b?Math.floor(b.base*Math.pow(2.05,Math.max(0,l-1))*market()):0)},0),crypto=Math.floor((u.crypto||0)*(db.settings.cryptoPrice||0));const debt=Object.values(db.loans||{}).filter(x=>x.borrower===u.id&&['active','overdue'].includes(x.status)).reduce((s,x)=>s+(x.status==='overdue'?Number(x.unpaid||0):loanBaseDue(x)),0);return Math.max(0,Math.floor(u.cash+u.bank+weapon+cars+property+biz+crypto-debt))}
function notify(u,type,text,data={}){if(!u)return;const n={id:String(db.nextIds.notification++),userId:u.id,time:Date.now(),type,text:String(text).slice(0,500),read:false,data};db.notifications.unshift(n);db.notifications=db.notifications.slice(0,5000);io.to('user:'+u.id).emit('notification',n)}
function combat(u){const b=baseCombat(u);let bonus=0;if(u.bodyguard&&u.bodyguardUntil>Date.now()){const g=byId(u.bodyguard);if(g)bonus=baseCombat(g).def*clamp(Number(db.settings.bodyguardDefensePct||.2),0,.5)}return{atk:b.atk,def:b.def+bonus,bodyguardBonus:bonus}}
function freeWeapons(u){return Object.values(freeWeaponMap(u)).reduce((a,b)=>a+b,0)}

const SPY_TYPES={finnish:{name:'Soome agent',skill:.55,hireTurns:5},ukrainian:{name:'Ukraina agent',skill:.70,hireTurns:10},russian:{name:'Vene agent',skill:.82,hireTurns:15}};
function spyPrice(type){return Math.max(0,Math.floor((db.settings.spyPrices?.[type]??0)*market()))}
function projectCfg(bid,p){const o=db.settings.businessProjectOverrides?.[bid+'|'+p.id]||{};return {...p,...o}}
function freeWeaponMap(u){let cap=Math.max(0,(Number(u.mafia||0)+Number(u.guards||0))*2),out={};const entries=Object.entries(u.weapons||{}).map(([i,q])=>[i,Number(q)||0]).sort((a,b)=>(WEAPONS[b[0]]?.price||0)-(WEAPONS[a[0]]?.price||0));for(const[i,q]of entries){const protectedQty=Math.min(q,cap);cap-=protectedQty;const loose=q-protectedQty;if(loose>0)out[i]=loose}return out}
function insuranceQuote(u,tier='standard',days=7){const c=db.settings.insuranceTiers[tier]||db.settings.insuranceTiers.standard,base=Math.max(0,Number(c.basePrice||0));return Math.floor(base*(days/7)*market()*((u.wanted||0)>=25?1.15:1))}

function pub(u){refresh(u);return{id:u.id,name:u.name,role:u.role,banned:u.banned,vip:u.vip,cash:u.cash,bank:u.bank,turns:u.turns,nextTurnsMs:nextTurns(u),serverNow:Date.now(),nextTurnAt:Date.now()+nextTurns(u),level:u.level,xp:u.xp||0,xpNeed:Math.max(50,50*Math.pow(Math.max(1,u.level),2)),education:u.education,educationName:EDU[u.education]?.name||'Puudub',educationProgress:u.educationProgress||0,educationNeed:EDU[u.education+1]?.needTurns||0,bankLimit:bankLimit(u),securityLevel:u.securityLevel,mafiaLevel:u.mafiaLevel,propertyLevel:u.propertyLevel,propertyName:PROPERTY_NAMES[u.propertyLevel]||('Kinnisvara '+u.propertyLevel),mafia:u.mafia,guards:u.guards,weapons:u.weapons,crypto:u.crypto,city:u.city,businesses:u.businesses,carLicense:u.carLicense,cars:u.cars,gangId:u.gangId,score:score(u),combat:combat(u),maintenanceDue:u.maintenanceDue,maintenanceDebt:Math.max(0,Number(u.maintenanceDebt)||0),maintenanceBreakdown:maintenanceBreakdown(u),maintenanceLastBill:u.maintenanceLastBill||null,stats:u.stats,wanted:u.wanted,jailedUntil:u.jailedUntil,rep:u.rep,insurance:u.insurance,privacy:u.privacy,email:u.email,vipUntil:u.vipUntil,netWorth:netWorth(u),spies:u.spies,intelLevel:u.intelLevel,businessProjects:u.businessProjects,businessWorkers:u.businessWorkers,businessRejected:u.businessRejected||{},bodyguard:u.bodyguard,bodyguardUntil:u.bodyguardUntil,joinedAt:u.createdAt,lastActive:u.lastActive,jobId:u.jobId,jobName:jobFor(u)?.name||null,jobPay:jobFor(u)?.pay||0,nextSalaryAt:jobFor(u)?(ensureGameClock()+GAME_TICK_MS):null,jobs:jobList(u),production:u.production,unreadNotifications:db.notifications.filter(n=>n.userId===u.id&&!n.read).length}}
const byId=id=>Object.values(db.users).find(u=>u.id===id);
const byName=name=>db.users[key(name)];
const resolveUser=x=>byId(String(x||''))||byName(String(x||''));

const app=express(),server=http.createServer(app),io=new Server(server);app.use(express.json({limit:'200kb'}));app.use(express.static(path.join(__dirname,'public')));
function auth(req,res,next){const n=untoken((req.headers.authorization||'').replace(/^Bearer\s+/,'')),u=n&&db.users[key(n)];if(!u||u.banned)return res.status(401).json({error:'AUTH'});u.lastActive=Date.now();req.user=u;next()}
function freeToAct(u){return !(u.jailedUntil&&u.jailedUntil>Date.now())}
function insuranceCover(u,loss){if(!(u.insurance?.active&&u.insurance.until>Date.now()))return 0;const c=clamp(Number(u.insurance.coverage||0),0,.9),d=clamp(Number(u.insurance.deductible||0),0,.9);return Math.max(0,Math.floor(loss*c*(1-d)))}
function admin(req,res,next){if(!['owner','admin'].includes(req.user.role))return res.status(403).json({error:'ADMIN_ONLY'});next()}
function nightlifeGate(req,res,next){next()}
function ok(res,u,extra={}){saveSoon();res.json({ok:true,user:pub(u),...extra})}

app.get('/api/config',(req,res)=>res.json({levelPrices:LEVEL_PRICES,propertyPrices:PROPERTY_PRICES,propertyNames:PROPERTY_NAMES,weapons:WEAPONS.map((w,i)=>({...w,price:weaponPrice(i)})),crimes:CRIMES,edu:EDU,biz:BIZ,businessProjects:Object.fromEntries(Object.entries(BUSINESS_PROJECTS).map(([bid,list])=>[bid,list.map(p=>projectCfg(bid,p))])),cities:CITIES,carLicenses:CAR_LICENSES,carOptions:CAR_OPTIONS,jobs:JOBS,settings:db.settings}));

async function sendResetEmail(u,raw){
 const resetUrl=`${PUBLIC_URL}/?reset=${encodeURIComponent(raw)}`;
 const subject='VARJURIIK parooli taastamine';
 const text=`Tere, ${u.name}!\n\nAva 30 minuti jooksul see link ja määra uus parool:\n${resetUrl}\n\nKui sa ei küsinud parooli taastamist, võid selle kirja ignoreerida.`;
 const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>VARJURIIK parooli taastamine</h2><p>Tere, <b>${String(u.name).replace(/[<>&"]/g,'')}</b>!</p><p>Vajuta allolevat nuppu ja määra uus parool. Link kehtib <b>30 minutit</b> ja seda saab kasutada ainult ühe korra.</p><p><a href="${resetUrl}" style="display:inline-block;background:#1f7a5c;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Määra uus parool</a></p><p style="font-size:13px;color:#667085">Kui sa ei küsinud parooli taastamist, võid selle kirja ignoreerida.</p></div>`;
 if(RESEND_API_KEY&&EMAIL_FROM&&PUBLIC_URL){
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:EMAIL_FROM,to:[u.email],subject,html,text})});
  if(!r.ok){let detail='';try{detail=await r.text()}catch{};throw new Error(`Resend ${r.status}: ${detail.slice(0,300)}`)}
  return 'resend';
 }
 if(SMTP_HOST&&SMTP_USER&&SMTP_PASS&&PUBLIC_URL){
  const tr=nodemailer.createTransport({host:SMTP_HOST,port:SMTP_PORT,secure:SMTP_PORT===465,auth:{user:SMTP_USER,pass:SMTP_PASS}});
  await tr.sendMail({from:SMTP_FROM||SMTP_USER,to:u.email,subject,text,html});
  return 'smtp';
 }
 return '';
}

app.post('/api/register',(req,res)=>{const n=norm(req.body.name),p=String(req.body.password||''),email=String(req.body.email||'').trim().toLowerCase();if(n.length<3||p.length<10)return res.status(400).json({error:'Nimi 3–18 märki, parool vähemalt 10.'});if(email&&(!email.includes('@')||email.length>120))return res.status(400).json({error:'Vigane e-mail.'});if(db.users[key(n)])return res.status(409).json({error:'Nimi kasutusel.'});if(email&&Object.values(db.users).some(x=>x.email===email))return res.status(409).json({error:'E-mail on juba kasutusel.'});const u=newUser(n,p,'player',email);u.lastIp=clientIp(req);u.lastUserAgent=String(req.headers['user-agent']||'').slice(0,180);db.users[key(n)]=u;secLog('register',req,u);saveNow();res.json({token:token(n),user:pub(u)})});
app.post('/api/login',(req,res)=>{const name=req.body.name;if(loginLimited(req,name))return res.status(429).json({error:'Liiga palju sisselogimiskatseid. Proovi 10 minuti pärast.'});const u=db.users[key(name)];if(u?.lockedUntil>Date.now())return res.status(429).json({error:'Konto on ajutiselt lukus.'});if(!u||!checkPw(req.body.password||'',u.salt,u.hash)){if(u){u.failedLogins=(u.failedLogins||0)+1;if(u.failedLogins>=5)u.lockedUntil=Date.now()+15*60000}secLog('login_failed',req,u,{attemptedName:norm(name)});saveSoon();return res.status(401).json({error:'Vale nimi või parool.'})}if(u.banned)return res.status(403).json({error:'Konto on blokeeritud.'});u.failedLogins=0;u.lockedUntil=0;u.lastIp=clientIp(req);u.lastUserAgent=String(req.headers['user-agent']||'').slice(0,180);u.lastLoginAt=Date.now();clearLoginBucket(req,name);secLog('login_ok',req,u);saveSoon();res.json({token:token(u.name),user:pub(u)})});
app.post('/api/password/forgot',async(req,res)=>{const ident=String(req.body.identifier||req.body.name||'').trim().toLowerCase();const u=db.users[key(ident)]||Object.values(db.users).find(x=>String(x.email||'').toLowerCase()===ident);const generic='Kui konto ja e-mail eksisteerivad, saadeti parooli taastamise juhis.';if(!u){return res.json({message:generic})}const raw=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(raw).digest('hex');db.passwordResetTokens[hash]={userId:u.id,expires:Date.now()+30*60*1000,used:false};db.resetRequests[u.id]={name:u.name,time:Date.now(),status:'pending'};secLog('password_reset_requested',req,u);saveSoon();let sent=false,provider='';if(u.email){try{provider=await sendResetEmail(u,raw);sent=!!provider}catch(e){console.error('reset mail',e.message)}}if(sent){secLog('password_reset_email_sent',req,u,{provider});return res.json({message:'Parooli taastamise link saadeti e-mailile. Link kehtib 30 minutit.'})}res.json({message:u.email?'Taastamissoov salvestati, kuid e-maili saatmine pole serveris veel seadistatud. Vajadusel saab admin aidata.':'Sellel kontol pole e-maili lisatud. Taastamissoov salvestati ja vajadusel saab admin aidata.'})});
app.post('/api/password/reset',(req,res)=>{const raw=String(req.body.token||''),nw=String(req.body.password||''),hash=crypto.createHash('sha256').update(raw).digest('hex'),r=db.passwordResetTokens[hash];if(!r||r.used||r.expires<Date.now()||nw.length<10)return res.status(400).json({error:'Taastamislink on vigane/aegunud või parool liiga lühike.'});const u=byId(r.userId);if(!u)return res.status(404).json({error:'Kontot pole.'});const h=hpw(nw);u.salt=h.salt;u.hash=h.hash;u.sessionVersion=(u.sessionVersion||1)+1;r.used=true;if(db.resetRequests[u.id])db.resetRequests[u.id].status='done';secLog('password_reset_done',req,u);saveNow();res.json({message:'Parool muudetud. Logi nüüd sisse.'})});
app.get('/api/me',auth,(req,res)=>ok(res,req.user,{settings:db.settings}));
// V6.72 — Üldjutuka API taastatud. V6.71 kliendis oli jutukas alles, kuid serveri /api/chat route'id puudusid.
app.get('/api/chat',auth,(req,res)=>{
  if(!Array.isArray(db.chat))db.chat=[];
  const chat=db.chat.slice(-120).map(m=>({
    id:String(m.id||''),
    user:String(m.user||'?').slice(0,40),
    userId:m.userId||null,
    time:Number(m.time)||Date.now(),
    message:String(m.message||'').slice(0,280)
  }));
  res.json({chat});
});
app.post('/api/chat',auth,(req,res)=>{
  const u=req.user;
  const message=String(req.body?.message||'').replace(/\s+/g,' ').trim().slice(0,280);
  if(!message)return res.status(400).json({error:'Kirjuta sõnum.'});
  if(!Array.isArray(db.chat))db.chat=[];
  const now=Date.now();
  const last=db.chat.length?db.chat[db.chat.length-1]:null;
  if(last&&last.userId===u.id&&now-Number(last.time||0)<1200)return res.status(429).json({error:'Saadad liiga kiiresti. Proovi hetke pärast uuesti.'});
  const item={id:crypto.randomUUID(),userId:u.id,user:u.name,time:now,message};
  db.chat.push(item);
  if(db.chat.length>500)db.chat=db.chat.slice(-500);
  saveSoon();
  io.emit('chat',{id:item.id,time:item.time});
  res.json({ok:true,message:'Sõnum saadetud.'});
});
app.post('/api/education',auth,(req,res)=>{const u=req.user,e=EDU[u.education+1];if(!e)return res.status(400).json({error:'Haridus max.'});let spend=Math.max(5,Math.floor(+req.body.turns||5));spend-=spend%5;if(spend<5)spend=5;const remain=e.needTurns-(u.educationProgress||0);spend=Math.min(spend,remain);if(!needTurns(u,spend))return res.status(400).json({error:`Vaja ${spend} käiku.`});u.educationProgress=(u.educationProgress||0)+spend;let message=`Õppisid ${spend} käiku. Progress ${u.educationProgress}/${e.needTurns}.`;if(u.educationProgress>=e.needTurns){u.education++;u.educationProgress=0;message=`Haridus lõpetatud: ${e.name}.`}ok(res,u,{message})});
app.post('/api/job',auth,(req,res)=>{const u=req.user,id=String(req.body.id||'');const j=(JOBS[u.education]||[]).find(x=>x.id===id);if(!j)return res.status(400).json({error:'See töökoht ei vasta sinu haridusele.'});u.jobId=j.id;u.lastSalaryAt=Date.now();ok(res,u,{message:`Asusid tööle: ${j.name}. Palk ${j.pay} € iga 15 minuti järel panka; kui pank on täis, läheb ülejääk sularahasse.`})});
app.post('/api/maintenance/pay',auth,(req,res)=>{const u=req.user,debt=Math.max(0,Math.floor(Number(u.maintenanceDebt)||0));if(debt>0){let left=debt,fromBank=Math.min(left,Math.max(0,Math.floor(Number(u.bank)||0)));u.bank-=fromBank;left-=fromBank;let fromCash=Math.min(left,Math.max(0,Math.floor(Number(u.cash)||0)));u.cash-=fromCash;left-=fromCash;const paid=debt-left;if(paid>0)gameIncome(paid,'maintenance_debt_manual',u);u.maintenanceDebt=left;if(!left)notify(u,'maintenance','Kõrvalkulude võlg on tasutud ja pangakonto arest vabastati.');return ok(res,u,{message:left?`Tasuti ${paid} €. Võlga jäi ${left} €.`:`Kõrvalkulude võlg ${paid} € on tasutud; arest vabastati.`})}if(u.maintenanceLastBill&&Date.now()-Number(u.maintenanceLastBill.time||0)<86400000&&u.maintenanceDue>Date.now())return ok(res,u,{message:'Selle perioodi kõrvalkulud on juba tasutud. Järgmine arve tekib tähtajal.'});const bill=chargeMaintenance(u,true);u.maintenanceDue=Date.now()+86400000;ok(res,u,{message:bill.unpaid?`Tasuti ${bill.paid} €. Võlga jäi ${bill.unpaid} € ja pangal on arest.`:`Kõrvalkulud ${bill.paid} € on tasutud.`,bill})});
app.post('/api/bank',auth,(req,res)=>{const u=req.user,a=Math.floor(+req.body.amount||0);if(a<=0)return res.status(400).json({error:'Vigane summa.'});if(req.body.dir==='in'){if(a>u.cash)return res.status(400).json({error:'Sularaha puudub.'});u.cash-=a;const lien=payMaintenanceDebtFromIncoming(u,a),deposit=lien.remaining;if(u.bank+deposit>bankLimit(u)){u.cash+=a;return res.status(400).json({error:`Pangalimiit ${bankLimit(u)} €.`})}u.bank+=deposit}else{if(a>u.bank)return res.status(400).json({error:'Pangas pole piisavalt.'});u.bank-=a;u.cash+=a}ok(res,u)});
app.post('/api/levelup',auth,(req,res)=>{const u=req.user,t=req.body.type,field=t==='mafia'?'mafiaLevel':t==='security'?'securityLevel':t==='property'?'propertyLevel':null;if(!field)return res.status(400).json({error:'Vigane level.'});const max=t==='property'?100:300,n=u[field]+1,cost=Math.floor((t==='property'?PROPERTY_PRICES[n]:LEVEL_PRICES[n])*market());if(n>max)return res.status(400).json({error:'Max level.'});if(u.cash<cost)return res.status(400).json({error:`Vaja ${cost} €.`});u.cash-=cost;gameIncome(cost,`${t}_level_up`,u);u[field]=n;ok(res,u,{message:`${t} level ${n}`})});
app.post('/api/troops',auth,(req,res)=>{const u=req.user,type=req.body.type,n=Math.max(1,Math.min(100000,Math.floor(+req.body.n||0))),unit=type==='mafia'?12000:13500;if(!['mafia','guards'].includes(type))return res.status(400).json({error:'Vigane tüüp.'});const cost=Math.floor(n*unit*market()),turns=n*5;if(u.cash<cost)return res.status(400).json({error:`Vaja ${cost} €.`});if(!needTurns(u,turns))return res.status(400).json({error:`Vaja ${turns} käiku.`});u.cash-=cost;gameIncome(cost,'troop_purchase',u);u[type]+=n;ok(res,u,{message:`+${n} ${type} · ${turns} käiku`})});
app.post('/api/weapon',auth,(req,res)=>{const u=req.user,i=Math.floor(+req.body.index),q=Math.max(1,Math.min(10000,Math.floor(+req.body.q||1))),w=WEAPONS[i];if(!w)return res.status(400).json({error:'Vigane relv.'});const cost=Math.floor(weaponPrice(i)*q),turns=5*q;db.settings.marketPressure+=q;if(u.cash<cost)return res.status(400).json({error:'Raha pole piisavalt.'});if(!needTurns(u,turns))return res.status(400).json({error:`Vaja ${turns} käiku.`});u.cash-=cost;gameIncome(cost,'weapon_purchase',u);u.weapons[i]=(u.weapons[i]||0)+q;ok(res,u,{message:`Ostsid ${q} × ${w.name}`})});
app.post('/api/crime',auth,(req,res)=>{const u=req.user,c=CRIMES.find(x=>x.id===req.body.id);if(!freeToAct(u))return res.status(403).json({error:'Oled vanglas.'});if(!c||u.level<c.need)return res.status(400).json({error:'Rööv lukus.'});if(!needTurns(u,c.turns))return res.status(400).json({error:`Vaja ${c.turns} käiku.`});const cb=combat(u),fail=clamp(c.risk-cb.atk/(cb.atk+3e6),.04,.72);let msg;if(Math.random()<fail){const grossLoss=Math.floor(rand(c.min,c.max)*.25);let refund=0;if(u.insurance?.active&&u.insurance.until>Date.now()){refund=insuranceCover(u,grossLoss);if(refund>0){u.bank=(Number(u.bank)||0)+refund;db.gameBank.balance=Math.max(0,(db.gameBank.balance||0)-refund);db.gameBank.log.unshift({time:Date.now(),type:'insurance_payout',amount:-refund,userId:u.id,user:u.name});msg=`Kindlustus kattis ${refund} € ja hüvitis läks sinu pangakontole. `}else msg=''}else msg='';u.cash=Math.max(0,u.cash-grossLoss);const loss=Math.max(0,grossLoss-refund);u.wanted=Math.max(0,(u.wanted||0)+2);if(Math.random()<clamp(.08+u.wanted/180,.08,.65)){const mins=5+Math.floor(u.wanted/5);u.jailedUntil=Date.now()+mins*60000;msg+=`Jäid ${mins} minutiks vangi. `}msg+=`Rööv ebaõnnestus. Kaotasid ${loss} €.`}else{const g=Math.floor(rand(c.min,c.max)*db.settings.heistMultiplier);creditCashWithDebt(u,g,'crime');u.stats.crimes++;u.wanted=Math.max(0,(u.wanted||0)+1+Math.floor(c.risk*5));u.rep=(u.rep||0)+1;u.level=Math.max(u.level||1,1+Math.floor(Math.sqrt(u.stats.crimes/5)));u.xp=Math.max(Number(u.xp||0),u.stats.crimes*10);msg=`Rööv õnnestus: +${g} €.`}ok(res,u,{message:msg})});
app.get('/api/players',auth,(req,res)=>{const now=Date.now(),all=Object.values(db.users).filter(x=>!x.banned),rows=all.map(x=>({id:x.id,name:x.name,role:x.role,level:x.level,score:score(x),city:x.city,gangId:x.gangId,vip:x.vip,rep:x.rep,wanted:x.wanted,lastActive:x.lastActive,online:x.npc?npcOnline(x,now):(now-(x.lastActive||0)<180000)})).sort((a,b)=>b.score-a.score).slice(0,200);const onlineNow=all.filter(x=>x.npc?npcOnline(x,now):(now-(x.lastActive||0)<180000)).length,active24h=all.filter(x=>now-Number(x.lastActive||0)<86400000).length;res.json({players:rows,onlineNow,active24h,totalAccounts:all.length})});
app.post('/api/rob-player',auth,(req,res)=>{const a=req.user,b=resolveUser(req.body.targetName||req.body.targetId);if(!b||b.id===a.id)return res.status(400).json({error:'Vigane sihtmärk.'});if(b.role==='owner')return res.status(403).json({error:'Mängu ownerit ei saa rünnata.'});if(!freeToAct(a))return res.status(403).json({error:'Oled vanglas.'});const now=Date.now(),winMs=db.settings.pvpWindowMin*60000,k=b.id,h=(a.pvpHits[k]||[]).filter(t=>now-t<winMs);if(h.length>=db.settings.pvpMaxHits)return res.status(429).json({error:`Seda mängijat saad ${db.settings.pvpWindowMin} min jooksul rünnata max ${db.settings.pvpMaxHits} korda.`});if(!needTurns(a,30))return res.status(400).json({error:'Vaja 30 käiku.'});h.push(now);a.pvpHits[k]=h;const A=combat(a),B=combat(b);let msg;if(A.atk>B.def){const take=Math.max(0,Math.floor(b.cash*.50));b.cash-=take;creditCashWithDebt(a,take,'pvp_rob');let covered=insuranceCover(b,take);if(covered>0){b.bank=(Number(b.bank)||0)+covered;db.gameBank.balance=Math.max(0,(db.gameBank.balance||0)-covered);db.gameBank.log.unshift({time:Date.now(),type:'insurance_payout',amount:-covered,userId:b.id,user:b.name})}a.stats.wins++;b.stats.losses++;msg=`Võit! Röövisid ${take} € (50% ohvri hetkesularahast).`;notify(b,'pvp',`${a.name} ründas sind. Kaotasid ${take} €. Kindlustus kattis ${covered} €.`,{attacker:a.id,lost:take,covered});if(a.gangId&&db.gangs[a.gangId]){const g=db.gangs[a.gangId];g.points=(g.points||0)+1;recordGangAttack(g,a,true)}expireBounties(now);for(const bo of Object.values(db.bounties)){if(bo.active&&Number(bo.expiresAt||0)>now&&bo.targetId===b.id){bo.progress=bo.progress||{};bo.progress[a.id]=(bo.progress[a.id]||0)+1;if(bo.progress[a.id]>=(bo.requiredHits||1)){creditCashWithDebt(a,bo.reward,'bounty_reward');bo.active=false;bo.claimedBy=a.id;bo.claimedAt=Date.now();msg+=` Pearaha +${bo.reward} €.`}}}const loose=freeWeaponMap(b);let stolenTotal=0,stolenNames=[];for(const[i,q]of Object.entries(loose)){const stolen=Math.min(q,Math.max(1,Math.floor(q*.20)));if(stolen>0){b.weapons[i]-=stolen;a.weapons[i]=(a.weapons[i]||0)+stolen;stolenTotal+=stolen;stolenNames.push(`${WEAPONS[i]?.name||'relv'} ×${stolen}`)}}if(stolenTotal){msg+=` Vabu relvi saagiks: ${stolenNames.join(', ')}.`;notify(b,'pvp',`Kaotasid kaitsmata relvi: ${stolenNames.join(', ')}.`)}}else{a.stats.losses++;b.stats.wins++;if(a.gangId&&db.gangs[a.gangId]){const g=db.gangs[a.gangId];recordGangAttack(g,a,false)}msg='Rünnak ebaõnnestus. Vastase kaitse oli liiga tugev.';notify(b,'pvp',`${a.name} proovis sind rünnata, kuid sinu kaitse pidas.`,{attacker:a.id})}ok(res,a,{message:msg})});
app.post('/api/travel',auth,(req,res)=>{const u=req.user;if(!freeToAct(u))return res.status(403).json({error:'Oled vanglas.'});const c=CITIES.find(x=>x[0]===req.body.city);if(!c)return res.status(400).json({error:'Linna pole.'});if(!needTurns(u,10))return res.status(400).json({error:'Reisimine vajab 10 käiku.'});const wantedMult=(u.wanted||0)>=50?1.25:1,cost=Math.floor((db.settings.travelBase||105000)*market()*wantedMult);if(u.cash<cost)return res.status(400).json({error:`Reis maksab ${cost} €.`});u.cash-=cost;gameIncome(cost,'travel',u);u.city=c[0];ok(res,u,{message:`Reisisid: ${c[0]}`})});
app.post('/api/business',auth,(req,res)=>{const u=req.user,b=BIZ.find(x=>x.id===req.body.id);if(!b)return res.status(400).json({error:'Firma puudub.'});const lvl=u.businesses[b.id]||0,n=lvl+1,cost=Math.floor(b.base*Math.pow(2.05,lvl)*market());if(u.cash<cost)return res.status(400).json({error:`Vaja ${cost} €.`});if(!needTurns(u,40))return res.status(400).json({error:'Vaja 40 käiku.'});u.cash-=cost;gameIncome(cost,'business_upgrade',u);u.businesses[b.id]=n;ok(res,u,{message:`${b.name} level ${n}`})});
app.post('/api/business/collect',auth,(req,res)=>{const u=req.user;let gross=0,tax=0,n=0;for(const [id,p] of Object.entries(u.businessProjects||{})){if(Date.now()<p.endsAt)continue;const g=Math.floor(p.reward*market()),t=Math.floor(g*(db.settings.businessTax||.08));gross+=g;tax+=t;delete u.businessProjects[id];n++}if(!n)return res.status(400).json({error:'Valmis projekte pole.'});const net=gross-tax,d=creditBusinessWithDebt(u,net,'business_collect');gameIncome(tax,'business_tax',u);ok(res,u,{message:`Kogusid ${n} projekti: bruto ${gross} €, maks ${tax} €, kätte ${net} €${d.paid?` (võla katteks ${d.paid} €)`:''}.`})});

// VARJURIIK v6.81: eraldi automajandus. Vana autoandmestik ja vanad marsruudid jäävad alles.
const AUTO_BRANDS=[
 ['Škoda','Octavia',220000],['Opel','Astra',170000],['Citroën','C4',165000],['Peugeot','308',190000],['Renault','Megane',185000],['Ford','Focus',210000],['Volkswagen','Golf',255000],['Toyota','Corolla',265000],['Honda','Civic',270000],['Hyundai','i30',215000],['Kia','Ceed',215000],['SEAT','Leon',215000],['Dacia','Duster',175000],['Nissan','Qashqai',270000],['Mazda','3',260000],['Fiat','Tipo',145000],['Suzuki','Vitara',230000],['Mitsubishi','Outlander',280000],['Subaru','Outback',350000],['Volvo','V60',480000],['Lexus','IS',510000],['Audi','A6',680000],['BMW','530d',750000],['Mercedes-Benz','E 220',790000],['MINI','Cooper',350000],['Jeep','Compass',400000],['Land Rover','Discovery',1100000],['Jaguar','XF',850000],['Porsche','911',2100000],['Tesla','Model 3',690000],['Polestar','2',660000],['Cupra','Formentor',455000],['Alfa Romeo','Giulia',670000],['Maserati','Ghibli',1350000],['Bentley','Continental GT',4200000],['Ferrari','Roma',5200000],['Lamborghini','Huracán',5900000],['McLaren','720S',6500000],['Aston Martin','Vantage',3700000],['Bugatti','Chiron',90000000]
].map(([brand,model,base])=>({brand,model,base}));
// v6.91: markide esindusõigus avab kogu vastava margi mudelivaliku.
const AUTO_DEALER_MODELS=Object.freeze({"Škoda": ["Fabia", "Scala", "Octavia", "Superb", "Kodiaq"], "Opel": ["Corsa", "Astra", "Insignia", "Grandland"], "Citroën": ["C3", "C4", "C5 Aircross"], "Peugeot": ["208", "308", "3008", "508"], "Renault": ["Clio", "Megane", "Captur", "Austral"], "Ford": ["Fiesta", "Focus", "Kuga", "Mustang"], "Volkswagen": ["Polo", "Golf", "Passat", "Tiguan", "Touareg"], "Toyota": ["Yaris", "Corolla", "Camry", "RAV4", "Land Cruiser"], "Honda": ["Jazz", "Civic", "HR-V", "CR-V"], "Hyundai": ["i20", "i30", "Tucson", "Santa Fe"], "Kia": ["Picanto", "Ceed", "Sportage", "Sorento"], "SEAT": ["Ibiza", "Leon", "Arona", "Ateca"], "Dacia": ["Sandero", "Duster", "Jogger"], "Nissan": ["Micra", "Qashqai", "X-Trail"], "Mazda": ["2", "3", "CX-5", "CX-60"], "Fiat": ["500", "Tipo", "Panda"], "Suzuki": ["Swift", "Vitara", "S-Cross"], "Mitsubishi": ["ASX", "Outlander", "Eclipse Cross"], "Subaru": ["Impreza", "Outback", "Forester"], "Volvo": ["V40", "V60", "XC60", "XC90"], "Lexus": ["IS", "ES", "NX", "RX"], "Audi": ["A3", "A4", "A6", "A8", "Q5", "Q7", "RS6"], "BMW": ["118i", "320d", "530d", "740d", "X3", "X5", "M3", "M5"], "Mercedes-Benz": ["A 180", "C 220", "E 220", "S 350", "GLC", "GLE", "AMG GT"], "MINI": ["Cooper", "Countryman"], "Jeep": ["Renegade", "Compass", "Wrangler"], "Land Rover": ["Discovery", "Defender", "Range Rover"], "Jaguar": ["XE", "XF", "F-Pace"], "Porsche": ["Macan", "Cayenne", "Panamera", "911"], "Tesla": ["Model 3", "Model Y", "Model S", "Model X"], "Polestar": ["2", "3", "4"], "Cupra": ["Leon", "Formentor", "Born"], "Alfa Romeo": ["Giulietta", "Giulia", "Stelvio"], "Maserati": ["Ghibli", "Grecale", "Levante"], "Bentley": ["Continental GT", "Flying Spur", "Bentayga"], "Ferrari": ["Roma", "296 GTB", "SF90"], "Lamborghini": ["Huracán", "Urus", "Revuelto"], "McLaren": ["Artura", "720S", "750S"], "Aston Martin": ["Vantage", "DB12", "DBX"], "Bugatti": ["Chiron", "Tourbillon"]});
function autoDealerRows(brand){
 const seed=AUTO_BRANDS.find(x=>x.brand===brand);if(!seed)return [];
 const names=AUTO_DEALER_MODELS[brand]||[seed.model];
 return names.map((model,i)=>{
  const variation= Math.pow(1.17,i-names.indexOf(seed.model));
  const base=Math.max(25000,Math.round(seed.base*variation/1000)*1000);
  return {brand,model,base,newDealerCost:Math.floor(base*2),newRecommendedPrice:Math.round(base*2.55/1000)*1000};
 });
}
const AUTO_CITIES=['Paide','Tallinn','Tartu','Pärnu','Rakvere','Viljandi','Võru','Haapsalu','Narva','Kuressaare','Jõgeva','Valga','Rapla','Kärdla','Jõhvi','Põlva','Türi','Elva','Keila','Sillamäe','Kunda','Mustvee','Tõrva','Antsla','Vändra'];
const AUTO_FAULTS=[['Pidurid',.07],['Veermik',.11],['Elektrisüsteem',.13],['Käigukast',.24],['Mootor',.34],['Turbo',.21],['Kliimaseade',.06],['Kere ja värv',.12]];
// v6.90: hind arvutatakse serveris; klient näeb sama väärtust enne maksmist.
function autoExpansionPrice(a,type){
 const initial=type==='yard'?3:1;
 const current=Math.max(initial,Number(a[type])||initial);
 return Math.floor((type==='yard'?250000:650000)*Math.pow(1.65,current-initial));
}
// Ühekordsed tuuningud. Kõikide hinnad sõltuvad konkreetsest autost.
const AUTO_TUNE_CATALOG=[
 {id:'ecu1',group:'engine',name:'Mootori Stage 1',description:'Juhtaju seadistus: mõõdukas jõudluse kasv, ilma riistvara vahetamata.',rate:.045,min:18000,value:.6},
 {id:'ecu2',group:'engine',name:'Mootori Stage 2',description:'Tugevam mootori seadistus koos toetavate muudatustega; asendab Stage 1.',rate:.09,min:45000,value:.65},
 {id:'turbo',name:'Turbo / jõuülekanne',description:'Uuendatud turbo ja jõuülekande komponendid. Sobib sisepõlemismootoriga autole.',rate:.12,min:60000,value:.58,combustion:true},
 {id:'gearbox',name:'Käigukasti tarkvara',description:'Kiirem ja sujuvam käiguvahetus ning parem koormustaluvus.',rate:.055,min:24000,value:.54},
 {id:'brakes',name:'Sportpidurid',description:'Pidurikettad, klotsid ja sadulad paremaks pidurdamiseks.',rate:.075,min:32000,value:.7},
 {id:'suspension',name:'Sportvedrustus',description:'Madalama kliirensi ja sportlikuma juhitavusega vedrustus.',rate:.065,min:25000,value:.65},
 {id:'wheels',name:'Veljed ja rehvid',description:'Uued valuveljed ning kvaliteetsed rehvid.',rate:.07,min:30000,value:.8},
 {id:'body',name:'Kerepakett',description:'Stanged, spoiler ja välised detailid sportlikuma ilme jaoks.',rate:.09,min:35000,value:.62},
 {id:'paint',name:'Värv / kiletamine',description:'Kere uus viimistlus: värvimine või kaitsev kiletamine.',rate:.08,min:30000,value:.66},
 {id:'interior',name:'Salongi uuendus',description:'Istmete, polstri ja interjööridetailide uuendamine.',rate:.065,min:27000,value:.62},
 {id:'exhaust',name:'Sportväljalase',description:'Muudetud väljalaskesüsteem sportlikuma heli jaoks.',rate:.055,min:25000,value:.52,combustion:true}
];
function autoTuneOptions(c){
 const base=Math.max(10000,Number(c.buy)||Number(c.market)||10000);
 const done=Array.isArray(c.tuneParts)?c.tuneParts:[];
 const electric=['Tesla','Polestar'].includes(c.brand);
 return AUTO_TUNE_CATALOG.filter(x=>!x.combustion||!electric).map(x=>({id:x.id,group:x.group||'',name:x.name,description:x.description,price:Math.max(x.min,Math.floor(base*x.rate)),installed:done.includes(x.id)}));
}
function autoWorld(){if(!db.autoWorld||typeof db.autoWorld!=='object')db.autoWorld={used:[],auctions:{},nextRefresh:0,history:[]};return db.autoWorld}
function autoState(u){
 // v6.84: Iga konto saab ÜHE korra 1 000 000 € autoäri algkapitali.
 // Vanad kontojäägid säilivad, mitte ei nullita ega kirjutata üle.
 if(!u.autoTrade||typeof u.autoTrade!=='object')u.autoTrade={city:'',yard:3,garage:1,balance:0,diagnostics:1,history:[],fines:0};
 const a=u.autoTrade;
 if(a.starterGrantV684!==true){
  a.balance=Math.max(0,Number(a.balance)||0)+1000000;
  a.starterGrantV684=true;
  if(!Array.isArray(a.history))a.history=[];
  a.history.unshift({time:Date.now(),message:'Autoäri ühekordne stardikapital: 1 000 000 €.'});
  a.history=a.history.slice(0,40);
 }
 return a;
}
function autoOwned(u){return (u.cars||[]).filter(c=>c.autoV2)}
function autoSlots(u){const a=autoState(u);return Math.max(0,a.yard+a.garage)}
function autoOccupied(u){return autoOwned(u).length+Object.values(db.carListings||{}).filter(l=>l.seller===u.id&&l.car?.autoV2).length}
function autoNeedGarage(u){return !!autoState(u).city}
function autoTransport(from,to){if(!from||!to||from===to)return 0;const sea=(from==='Kuressaare'||from==='Kärdla'||to==='Kuressaare'||to==='Kärdla');return 18000+Math.abs(AUTO_CITIES.indexOf(from)-AUTO_CITIES.indexOf(to))*3300+(sea?35000:0)}
function autoRegistration(c){return Math.max(3500,Math.floor((c.market||c.buy||0)*.025))}
// V6.87: soovituslik mängusisene müügihind (ideaalne tehniline seisukord).
// Hinnang ei kasuta peidetud rikkeid, et neid ostjale mitte paljastada.
function autoIdealPrice(c){
 const row=autoDealerRows(c.brand).find(x=>x.model===c.model)||AUTO_BRANDS.find(x=>x.brand===c.brand&&x.model===c.model);
 const base=Number(row?.base||c.buy||c.market||150000);
 const year=Math.max(1980,Math.min(2026,Number(c.year)||2026));
 const age=Math.max(0,2026-year),km=Math.max(0,Number(c.km)||parseInt(String(c.mileage||'0').replace(/[^0-9]/g,''),10)||0);
 const newRecommended=base*2.55; // soovituslik uus auto lõpptarbija müügihind
 if(age===0&&km<1000)return Math.round(newRecommended/1000)*1000;
 const depreciation=Math.max(.09,Math.pow(.915,age));
 const kmFactor=Math.max(.70,1-Math.max(0,km-50000)/1600000);
 const tuningFactor=1+Math.min(0.18,Math.max(0,Number(c.tuning)||0)*.025);
 return Math.max(15000, Math.round(newRecommended*depreciation*kmFactor*tuningFactor/1000)*1000, Math.ceil((Number(c.market)||0)*1.12/1000)*1000);
}
// V6.93: dynamic diagnostics prices tied to vehicle value and age, never a flat 12 000 €.
function autoDiagnosticPrice(c){
 const ideal=autoIdealPrice(c), age=Math.max(0,2026-(Number(c.year)||2026));
 return Math.max(1500,Math.min(150000,Math.round((2000+ideal*.012+age*240)/500)*500));
}
// A consistent market benchmark; listing price is not automatically the fair value.
function autoNpcFairValue(c){return Math.max(1,Math.floor(autoIdealPrice(c)))}
function autoNewCar(row,used=true,city){const now=Date.now(),year=used?rand(2003,2024):2026,age=2026-year,km=used?rand(20000,360000):0,base=row.base,price=used?Math.max(12000,Math.floor((base*2.55)*Math.max(.09,Math.pow(.915,age))*Math.max(.70,1-Math.max(0,km-50000)/1600000)*(.58+Math.random()*.32))):Math.floor(base*2);const faults=used?AUTO_FAULTS.filter(()=>Math.random()<(.10+age*.012)).map(([name,severity])=>({name,severity,repair:Math.max(1200,Math.floor(price*severity*(.5+Math.random())))})):[];return{id:crypto.randomUUID(),autoV2:true,name:`${row.brand} ${row.model}`,brand:row.brand,model:row.model,year,mileage:km+' km',km,city:city||AUTO_CITIES[rand(0,AUTO_CITIES.length-1)],buy:price,market:price,quality:used?'Kasutatud':'Uus',faults,diagnosed:false,condition:Math.max(15,100-faults.length*rand(7,14)),tuning:0,registered:!used,description:used?['Sõidab hästi, väiksed kasutusjäljed.','Müüja sõnul korralik, soovitatav üle vaadata.','Vajab veidi hoolt, hind vastav.','Hooldusajalugu osaline.'][rand(0,3)]:'Uhiuus esinduse auto',createdAt:now}}
function autoTick(){
 const w=autoWorld(),now=Date.now();
 // Reprice unsold generated NPC listings once, retaining ids and hidden faults.
 if(!w.priceMigrationV691){
  for(const c of w.used||[]){if(!c.autoV2||c.quality!=='Kasutatud')continue;
   const row=AUTO_BRANDS.find(r=>r.brand===c.brand);if(!row)continue;
   const year=Number(c.year)||2015,km=Number(c.km)||0;
   const ideal=row.base*2.55*Math.max(.09,Math.pow(.915,Math.max(0,2026-year)))*Math.max(.70,1-Math.max(0,km-50000)/1600000);
   const ratio=.62+(Math.abs(String(c.id).split('').reduce((n,ch)=>n+ch.charCodeAt(0),0))%29)/100;
   c.market=Math.max(12000,Math.round(ideal*ratio));c.buy=c.market;
  }
  w.priceMigrationV691=true;
 }
 // v6.92: the used-car market is an evolving collection of uniquely identified listings.
 // Existing offers keep their identity and hidden faults until purchased or expired.
 if(!w.marketRotationV692){
  for(const c of w.used){
   if(!Number.isFinite(Number(c.createdAt)))c.createdAt=now;
   if(!Number.isFinite(Number(c.listingExpiresAt)))c.listingExpiresAt=now+rand(120,300)*60000;
  }
  w.marketRotationV692=true;
 }
 let marketChanged=false;
 const existingCount=w.used.length;
 w.used=w.used.filter(c=>!(Number(c.listingExpiresAt)>0&&now>=Number(c.listingExpiresAt)));
 if(w.used.length!==existingCount)marketChanged=true;
 // Seed an empty/new market with varied used cars; never clone the car that was sold.
 if(w.used.length<35){
  const missing=35-w.used.length;
  for(let i=0;i<missing;i++){
   const candidates=AUTO_BRANDS.filter(r=>!w.used.slice(-7).some(c=>c.brand===r.brand));
   const rows=candidates.length?candidates:AUTO_BRANDS;
   const c=autoNewCar(rows[rand(0,rows.length-1)],true);
   c.listingExpiresAt=now+rand(120,300)*60000;
   w.used.push(c);
  }
  marketChanged=true;
 }
 // Refresh in batches. A listing can go unsold for hours, then leave the market.
 if(!w.npcNext||now>=w.npcNext){
  const batch=rand(3,6);
  // Retire some stale offers, but do not immediately erase recently listed cars.
  const eligible=w.used.filter(c=>now-Number(c.createdAt||now)>=45*60000)
   .sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0));
  for(const c of eligible.slice(0,Math.min(batch,Math.max(0,w.used.length-35)))){
   w.used.splice(w.used.findIndex(x=>x.id===c.id),1);marketChanged=true;
  }
  for(let i=0;i<batch&&w.used.length<55;i++){
   const recent=new Set(w.used.slice(-8).map(c=>c.brand));
   const candidates=AUTO_BRANDS.filter(r=>!recent.has(r.brand));
   const rows=candidates.length?candidates:AUTO_BRANDS;
   const c=autoNewCar(rows[rand(0,rows.length-1)],true);
   c.listingExpiresAt=now+rand(120,300)*60000;
   w.used.push(c);marketChanged=true;
  }
  w.npcNext=now+rand(8,14)*60000;
  marketChanged=true;
 }
 if(marketChanged)saveSoon();
 for(const b of AUTO_BRANDS){
  let a=w.auctions[b.brand];
  if(!a){a={brand:b.brand,end:now+8*3600000,holder:'',until:0,bids:[],starting:Math.max(500000,Math.floor(b.base*4)),lastResult:null};w.auctions[b.brand]=a}
  if(!Array.isArray(a.bids))a.bids=[];
  // Kehtiva 3-päevase lepingu ajal ei toimu sellele margile uut oksjonit.
  if(a.until>now && a.holder)continue;
  // Lepingu lõppedes avatakse uus 8-tunnine avalik oksjon.
  if(a.holder && a.until && now>=a.until){a.holder='';a.until=0;a.end=now+8*3600000;a.bids=[];continue}
  if(now>=a.end){
   const ranked=[...a.bids].sort((x,y)=>y.amount-x.amount || (x.time||0)-(y.time||0));
   const win=ranked[0];
   for(const bid of a.bids){const u=byId(bid.userId);if(u&&(!win||u.id!==win.userId)){if(bid.source==='autoTrade')autoAccountCredit(u,bid.amount);else u.cash+=bid.amount}}
   a.lastResult={at:now,winner:win?(byId(win.userId)?.name||'Endine mängija'):null,amount:win?.amount||0};
   if(win){
    a.holder=win.userId;a.until=now+3*86400000;
    const u=byId(win.userId);
    if(u){gameIncome(win.amount,'auto_dealer_contract',u);notify(u,'car',`Võitsid ${b.brand} esinduslepingu kolmeks päevaks.`)}
   }else{a.end=now+8*3600000}
   a.bids=[];
  }
 }

}
function autoErr(res,message){return res.status(400).json({error:message})}
function autoAccountCredit(u,amount){autoState(u).balance+=Math.max(0,Math.floor(amount));}
function autoAccountCanPay(a,cost){return Number.isSafeInteger(cost)&&cost>=0&&Number(a.balance)>=cost;}
function autoHistory(u,message){const a=autoState(u);a.history.unshift({time:Date.now(),message});a.history=a.history.slice(0,40)}
// v6.89: NPC teeb siduva pakkumise auto arvestuslikust turuvaartusest,
// pidades laebiraeaekimisel kinni 0-15%. Pakutud summa ei soltu salajastest riketest.
// Hind lukustub 5 minutiks, et nuppu korrates ei saaks parimat juhuarvu valida.
function autoNpcOffer(c){
 const now=Date.now(),existing=c.npcSaleOffer;
 if(existing&&Number.isSafeInteger(existing.amount)&&existing.amount>0&&existing.expiresAt>now&&existing.base===autoNpcFairValue(c))return existing;
 const base=autoNpcFairValue(c);
 const discount=crypto.randomInt(0,16); // 0..15 protsenti
 const amount=Math.max(1,Math.round(base*(100-discount)/100));
 c.npcSaleOffer={base,amount,discount,expiresAt:now+5*60000};
 return c.npcSaleOffer;
}
function autoSaleToNpc(u,c,offer){
 const a=autoState(u),price=offer.amount;
 const hidden=(c.faults||[]).some(f=>f.repair>0),deception=!!c.claimHealthy&&hidden,detected=deception&&Math.random()<.42;
 if(detected){
  const fine=Math.floor(price*(.25+Math.random()*1.25));
  a.fines+=fine;
  const paid=Math.min(a.balance,fine);a.balance-=paid;gameIncome(paid,'auto_fraud_fine',u);
  delete c.npcSaleOffer;
  const unpaid=fine-paid;
  const alert={id:crypto.randomUUID(),time:Date.now(),car:c.name,fine,paid,unpaid,message:`🚨 PETTUS AVASTATUD! ${c.name}: trahv ${fine.toLocaleString('et-EE')} €, kohe tasutud ${paid.toLocaleString('et-EE')} €, võlg ${unpaid.toLocaleString('et-EE')} €. Auto müügitehing tühistati.`};
  if(!Array.isArray(a.fraudAlerts))a.fraudAlerts=[];
  a.fraudAlerts.unshift(alert);a.fraudAlerts=a.fraudAlerts.slice(0,20);
  autoHistory(u,alert.message);
  notify(u,'auto_fraud',alert.message,{fraudAlertId:alert.id,fine,unpaid,car:c.name});
  return {error:'Ostja avastas varjatud vea! Auto tagastati, ostuhind jäi müüjale maksmata ja määrati trahv.',fine,returned:true};
 }
 autoAccountCredit(u,price);
 u.cars=u.cars.filter(x=>x.id!==c.id);
 autoHistory(u,`NPC ostis ${c.name}: ${price} € autoäri kontole (kauples ${offer.discount}%).`);
 return {message:`NPC ostis auto ${price} € eest (${offer.discount}% alla arvestusliku turuväärtuse). Raha laekus autoäri kontole.`};
}
// NPC checks player-created used-car listings every 2–4 minutes. No invisible instant sales.
function autoNpcListingsTick(){
 const now=Date.now();let changed=false;
 for(const u of Object.values(db.users||{}))for(const c of autoOwned(u)){
  const listing=c.autoListing;
  if(!listing||listing.status!=='active'||now<Number(listing.nextAt||0))continue;
  const ideal=autoNpcFairValue(c), bid=Math.max(1,Math.round(ideal*(100-crypto.randomInt(0,16))/100));
  if(listing.ask<=bid){
   // Buyer accepts the seller's asking price, with possible hidden-defect penalties.
   const offer={amount:listing.ask,discount:Math.max(0,Math.round((1-listing.ask/ideal)*100))};
   c.claimHealthy=!!listing.claimHealthy;
   const result=autoSaleToNpc(u,c,offer);
   if(!result.error){notify(u,'car',`NPC ostis sinu ${c.name} kuulutuse hinnaga ${listing.ask.toLocaleString('et-EE')} €. Raha laekus autoäri kontole.`)}
   else {delete c.autoListing;notify(u,'car',`${c.name}: ${result.error}`)}
  }else{
   listing.counterOffer=bid;listing.counterAt=now;listing.nextAt=now+rand(2,4)*60000;
   notify(u,'car',`NPC tegi sinu ${c.name} autole vastupakkumise ${bid.toLocaleString('et-EE')} € (küsisid ${listing.ask.toLocaleString('et-EE')} €).`);
  }
  changed=true;
 }
 if(changed)saveSoon();
}
app.post('/api/auto-world/list',auth,(req,res)=>{
 const u=req.user,c=autoOwned(u).find(x=>x.id===req.body.id),ask=Math.floor(Number(req.body.price));
 if(!c)return autoErr(res,'Seda autot ei leitud.');
 if(c.autoListing?.status==='active')return autoErr(res,'Auto on juba müügis.');
 if(!Number.isSafeInteger(ask)||ask<1)return autoErr(res,'Sisesta korrektne müügihind.');
 c.autoListing={status:'active',ask,claimHealthy:req.body.claimHealthy===true,listedAt:Date.now(),nextAt:Date.now()+rand(2,4)*60000,counterOffer:0,counterAt:0};
 autoHistory(u,`Panid ${c.name} müüki hinnaga ${ask} €. NPC kontrollib kuulutust 2–4 minuti jooksul.`);
 ok(res,u,{message:'Kuulutus avaldatud. NPC vaatab auto üle umbes 2–4 minuti jooksul.'});
});
app.post('/api/auto-world/unlist',auth,(req,res)=>{
 const u=req.user,c=autoOwned(u).find(x=>x.id===req.body.id);
 if(!c||c.autoListing?.status!=='active')return autoErr(res,'Aktiivset kuulutust ei leitud.');
 delete c.autoListing;ok(res,u,{message:'Auto kuulutus eemaldatud.'});
});
app.post('/api/auto-world/accept-counter',auth,(req,res)=>{
 const u=req.user,c=autoOwned(u).find(x=>x.id===req.body.id),l=c?.autoListing;
 if(!c||l?.status!=='active'||!Number.isSafeInteger(l.counterOffer)||l.counterOffer<=0)return autoErr(res,'NPC kehtivat pakkumist ei leitud.');
 const amount=l.counterOffer;c.claimHealthy=!!l.claimHealthy;
 const result=autoSaleToNpc(u,c,{amount,discount:Math.max(0,Math.round((1-amount/autoNpcFairValue(c))*100))});
 if(result.error){delete c.autoListing;saveSoon();return res.status(400).json(result)}
 ok(res,u,{message:`Võtsid NPC pakkumise vastu: ${amount} €. Raha autoäri kontol.`});
});
app.post('/api/auto-world/fraud-ack',auth,(req,res)=>{const a=autoState(req.user),id=String(req.body.id||'');if(!Array.isArray(a.fraudAlerts))a.fraudAlerts=[];const alert=a.fraudAlerts.find(x=>x.id===id);if(!alert)return autoErr(res,'Teadet ei leitud.');alert.acknowledged=true;ok(res,req.user,{message:'Pettuseteade märgitud loetuks. Trahv ja võlg jäävad alles.'})});
app.get('/api/auto-world',auth,(req,res)=>{autoTick();const u=req.user,a=autoState(u),w=autoWorld();res.json({account:a,capacity:autoSlots(u),occupied:autoOccupied(u),expansionPrices:{yard:autoExpansionPrice(a,'yard'),garage:autoExpansionPrice(a,'garage')},cities:AUTO_CITIES,used:w.used.map(c=>({...c,faults:undefined,condition:undefined,description:c.description,idealPrice:autoIdealPrice(c),registration:autoRegistration(c),transport:autoTransport(c.city,a.city)})),auctions:Object.values(w.auctions).map(x=>({brand:x.brand,end:x.end,starting:x.starting,top:x.bids.reduce((m,b)=>Math.max(m,b.amount),0),myBid:x.bids.find(b=>b.userId===u.id)?.amount||0,holder:byId(x.holder)?.name||'',mine:x.holder===u.id&&x.until>Date.now(),until:x.until,status:x.holder&&x.until>Date.now()?'contract':'auction',bids:[...x.bids].sort((a,b)=>b.amount-a.amount).map(b=>({name:byId(b.userId)?.name||'Endine mängija',amount:b.amount,time:b.time||0})),lastResult:x.lastResult||null})),owned:autoOwned(u).map(c=>({...c,idealPrice:autoIdealPrice(c),diagnosticPrice:autoDiagnosticPrice(c),tuneOptions:autoTuneOptions(c),faults:c.diagnosed?c.faults:undefined})),brands:AUTO_BRANDS.flatMap(r=>autoDealerRows(r.brand)),now:Date.now()})});
app.post('/api/auto-world/garage',auth,(req,res)=>{const u=req.user,a=autoState(u),city=String(req.body.city||'');if(a.city)return autoErr(res,'Garaaž on juba olemas.');if(!AUTO_CITIES.includes(city))return autoErr(res,'Vali Eesti linn.');const cost=300000;if(!autoAccountCanPay(a,cost))return autoErr(res,`Garaaži ostuks vaja ${cost} € autoäri kontol.`);a.balance-=cost;gameIncome(cost,'auto_garage_purchase',u);a.city=city;autoHistory(u,`Ostsid garaaži: ${city}.`);ok(res,u,{message:`Garaaž asub nüüd linnas ${city}. Õueplats 3 autot ja garaaž 1 auto.`})});
app.post('/api/auto-world/expand',auth,(req,res)=>{const u=req.user,a=autoState(u),type=String(req.body.type||'');if(!a.city)return autoErr(res,'Osta esmalt garaaž.');if(!['yard','garage'].includes(type))return autoErr(res,'Vigane laiendus.');const current=a[type],cost=autoExpansionPrice(a,type);if(!autoAccountCanPay(a,cost))return autoErr(res,`Laiendus maksab ${cost} € autoäri kontolt.`);a.balance-=cost;gameIncome(cost,'auto_garage_expansion',u);a[type]++;ok(res,u,{message:`Laiendus valmis! ${type==='yard'?'Õueplatsi':'Garaaži'} kohti: ${a[type]}. Maksis ${cost} €.`})});
app.post('/api/auto-world/bank',auth,(req,res)=>{const u=req.user,a=autoState(u),amount=Math.floor(Number(req.body.amount));if(!a.city)return autoErr(res,'Vaja garaaži.');if(!Number.isSafeInteger(amount)||amount<1)return autoErr(res,'Sisesta korrektne summa.');if(req.body.dir==='in')return autoErr(res,'Autoäri kontole ei saa ise raha sisse kanda. Kontot täiendavad autoäri tulud.');if(req.body.dir==='out'){if(a.balance<amount)return autoErr(res,'Autoäri kontol pole piisavalt raha.');const tax=Math.floor(amount*.24);a.balance-=amount;u.cash+=amount-tax;gameIncome(tax,'auto_business_withdrawal_24pct',u);return ok(res,u,{message:`Võtsid välja ${amount-tax} €. 24% (${tax} €) läks Keskpanka.`})}return autoErr(res,'Vigane toiming.')});
app.post('/api/auto-world/bid',auth,(req,res)=>{autoTick();const u=req.user,a=autoState(u),w=autoWorld(),brand=String(req.body.brand||''),auction=w.auctions[brand],amount=Math.floor(Number(req.body.amount));if(!a.city)return autoErr(res,'Esinduslepingu pakkumiseks on vaja garaaži.');if(!auction||auction.holder&&auction.until>Date.now())return autoErr(res,'Selle margi esindusleping on juba välja antud. Uus oksjon algab pärast lepingu lõppu.');if(Date.now()>=auction.end)return autoErr(res,'Oksjon lõppenud.');if(!Number.isSafeInteger(amount)||amount<auction.starting||amount<=auction.bids.reduce((m,b)=>Math.max(m,b.amount),0))return autoErr(res,'Pakkumine peab ületama senise kõrgeima pakkumise ja alghinna.');const prev=auction.bids.find(x=>x.userId===u.id);const legacy=!!prev&&prev.source!=='autoTrade';const diff=legacy?amount:amount-(prev?.amount||0);if(!autoAccountCanPay(a,diff))return autoErr(res,'Autoäri kontol pole pakkumise broneerimiseks piisavalt raha.');a.balance-=diff;if(legacy)u.cash+=prev.amount;if(prev){prev.amount=amount;prev.time=Date.now();prev.source='autoTrade'}else auction.bids.push({userId:u.id,amount,time:Date.now(),source:'autoTrade'});ok(res,u,{message:`Pakkumine ${amount} € esitatud. Raha broneeritud autoäri kontolt oksjoni lõpuni.`})});
app.post('/api/auto-world/buy',auth,(req,res)=>{autoTick();const u=req.user,a=autoState(u),w=autoWorld();if(!a.city)return autoErr(res,'Osta esmalt garaaž.');if(autoOccupied(u)>=autoSlots(u))return autoErr(res,'Kõik hoiuplatsid on täis. Laienda pinda või müü auto.');let c,cost,registration=0,transport=0;if(req.body.kind==='used'){const idx=w.used.findIndex(x=>x.id===req.body.id);if(idx<0)return autoErr(res,'Auto on juba müüdud.');c=w.used[idx];registration=autoRegistration(c);transport=autoTransport(c.city,a.city);cost=c.market+registration+transport;if(!autoAccountCanPay(a,cost))return autoErr(res,`Ostuks koos registreerimise ja transpordiga vaja ${cost} € autoäri kontol.`);w.used.splice(idx,1);c.registered=true;c.city=a.city}else if(req.body.kind==='new'){const row=autoDealerRows(String(req.body.brand||'')).find(x=>x.model===req.body.model),auction=w.auctions[req.body.brand];if(!row||!auction||auction.holder!==u.id||auction.until<Date.now())return autoErr(res,'Selle margi kehtiv esindusleping puudub.');c=autoNewCar(row,false,a.city);cost=row.newDealerCost;c.market=cost;c.buy=cost;if(!autoAccountCanPay(a,cost))return autoErr(res,`Uus auto maksab ${cost} € autoäri kontolt.`)}else return autoErr(res,'Vigane auto.');a.balance-=cost;gameIncome(cost,'auto_purchase',u);u.cars.push(c);autoHistory(u,`Ostetud ${c.name}: ${cost} € (transport ${transport}, registreerimine ${registration}).`);ok(res,u,{message:`Ostsid ${c.name}. Kokku ${cost} €; transport ${transport} €, registreerimine ${registration} €.`})});
app.post('/api/auto-world/diagnose',auth,(req,res)=>{const u=req.user,a=autoState(u),c=u.cars.find(x=>x.id===req.body.id&&x.autoV2);if(!c)return autoErr(res,'Auto puudub.');const price=autoDiagnosticPrice(c);if(a.balance<price)return autoErr(res,`Diagnostikaks on vaja ${price} € autoäri kontol.`);a.balance-=price;gameIncome(price,'auto_diagnostics',u);c.diagnosed=true;ok(res,u,{message:(c.faults||[]).length?`Diagnostika valmis: ${c.faults.map(f=>f.name).join(', ')}.`:'Diagnostika ei tuvastanud vigu.'})});
app.post('/api/auto-world/repair',auth,(req,res)=>{const u=req.user,a=autoState(u),c=u.cars.find(x=>x.id===req.body.id&&x.autoV2);if(!c||!c.diagnosed)return autoErr(res,'Enne remonti on vajalik diagnostika.');const fault=(c.faults||[]).find(x=>x.name===req.body.fault&&x.repair>0);if(!fault)return autoErr(res,'Rike puudub või juba remonditud.');const repairCost=fault.repair;if(a.balance<repairCost)return autoErr(res,'Remondiks pole autoäri kontol piisavalt raha.');a.balance-=repairCost;gameIncome(repairCost,'auto_repair',u);c.market+=Math.floor(repairCost*.8);c.condition=Math.min(100,c.condition+12);fault.repair=0;ok(res,u,{message:`Remonditud: ${fault.name}, kulu ${repairCost} €.`})});
app.post('/api/auto-world/tune',auth,(req,res)=>{
 const u=req.user,a=autoState(u),c=u.cars.find(x=>x.id===req.body.id&&x.autoV2);
 if(!c)return autoErr(res,'Auto puudub.');
 const ids=req.body.items;
 if(!Array.isArray(ids)||ids.length<1||ids.length>11||ids.some(x=>typeof x!=='string')||new Set(ids).size!==ids.length)return autoErr(res,'Vali vähemalt üks sobiv tuuning.');
 const available=autoTuneOptions(c),selected=ids.map(id=>available.find(x=>x.id===id));
 if(selected.some(x=>!x||x.installed))return autoErr(res,'Valikus on sobimatu või juba paigaldatud tuuning.');
 if(selected.filter(x=>x.group==='engine').length>1)return autoErr(res,'Stage 1 ja Stage 2 ei saa korraga tellida.');
 const already=Array.isArray(c.tuneParts)?c.tuneParts:[];
 if(selected.some(x=>x.group==='engine')&&already.some(id=>id==='ecu1'||id==='ecu2'))return autoErr(res,'Selle auto mootorile on juba üks Stage-tuuning paigaldatud.');
 const cost=selected.reduce((n,x)=>n+x.price,0);
 if(!Number.isSafeInteger(cost)||!autoAccountCanPay(a,cost))return autoErr(res,`Tuuning maksab ${cost} € autoäri kontolt.`);
 a.balance-=cost;gameIncome(cost,'auto_tuning_bundle',u);
 c.tuneParts=[...already,...ids];c.tuning=(Number(c.tuning)||0)+ids.length;
 const valueIncrease=selected.reduce((n,x)=>{const row=AUTO_TUNE_CATALOG.find(t=>t.id===x.id);return n+Math.floor(x.price*row.value)},0);
 c.market+=valueIncrease;
 autoHistory(u,`Tuunitud ${c.name}: ${selected.map(x=>x.name).join(', ')}. Kulu ${cost} €.`);
 ok(res,u,{message:`Paigaldati ${ids.length} tuuningut: ${selected.map(x=>x.name).join(', ')}. Kulu ${cost} €. Auto arvestuslik väärtus suurenes ${valueIncrease} €.`});
});
app.post('/api/auto-world/offer',auth,(req,res)=>{const u=req.user,c=u.cars.find(x=>x.id===req.body.id&&x.autoV2);if(!c)return autoErr(res,'Auto puudub.');if(c.autoListing?.status==='active')return autoErr(res,'Eemalda esmalt müügikuulutus.');const offer=autoNpcOffer(c);saveSoon();res.json({ok:true,offer:{amount:offer.amount,base:offer.base,discount:offer.discount,expiresAt:offer.expiresAt},car:c.name})});
app.post('/api/auto-world/sell',auth,(req,res)=>{const u=req.user,c=u.cars.find(x=>x.id===req.body.id&&x.autoV2);if(!c)return autoErr(res,'Auto puudub.');const offer=c.npcSaleOffer;if(!offer||offer.expiresAt<=Date.now()||offer.base!==autoNpcFairValue(c))return autoErr(res,'NPC pakkumine aegus või auto väärtus muutus. Küsi uus pakkumine.');c.claimHealthy=!!req.body.claimHealthy;const result=autoSaleToNpc(u,c,offer);if(result.error){saveSoon();return res.status(400).json(result)}ok(res,u,result)});

app.post('/api/car/license',auth,(req,res)=>{const u=req.user,l=CAR_LICENSES.find(x=>x.level===u.carLicense+1);if(!l)return res.status(400).json({error:'Kõik litsentsid olemas.'});const lc=Math.floor(l.cost*market());if(u.cash<lc)return res.status(400).json({error:`Vaja ${lc} €.`});u.cash-=lc;gameIncome(lc,'car_license',u);u.carLicense++;ok(res,u,{message:`Litsents: ${l.name}`})});
app.post('/api/car/buy',auth,(req,res)=>{const u=req.user,l=CAR_LICENSES.find(x=>x.level===u.carLicense);if(!l)return res.status(400).json({error:'Vaja autolitsentsi.'});const opt=(CAR_OPTIONS[u.carLicense]||[]).find(x=>x.id===String(req.body.option||''));if(!opt)return res.status(400).json({error:'Vali, millist autot soovid osta.'});const shopFactor=clamp(Number(db.settings.carMarket||1),.95,1.05);const buy=Math.floor(opt.price*shopFactor);const marketValue=Math.floor(buy*(1.10+Math.random()*.15));db.settings.marketPressure+=2;if(u.cash<buy)return res.status(400).json({error:'Raha puudub.'});u.cash-=buy;gameIncome(buy,'car_purchase',u);u.cars.push({id:crypto.randomUUID(),name:opt.name,brand:opt.brand,model:opt.model,engine:opt.engine,power:opt.power,year:opt.year,mileage:opt.mileage,fuel:opt.fuel,drivetrain:opt.drivetrain,quality:opt.quality,buy,market:marketValue});ok(res,u,{message:`Ostsid: ${opt.name} ${buy} € eest. Auto ost ei kuluta käike. Turuväärtus ~${marketValue} €.`})});
app.post('/api/car/list',auth,(req,res)=>{const u=req.user,c=u.cars.find(x=>x.id===req.body.id),price=Math.floor(+req.body.price||0);if(!c||price<=0)return res.status(400).json({error:'Vigane auto/hind.'});const id=String(db.nextIds.listing++),now=Date.now();db.carListings[id]={id,seller:u.id,car:c,price,time:now,npcActionAt:now+rand(2,15)*60000,npcOffer:0,npcOfferAt:0};u.cars=u.cars.filter(x=>x.id!==c.id);ok(res,u,{message:'Auto pandi turule. NPC kontrollib kuulutust hiljemalt 15 minuti jooksul.'})});
app.get('/api/car/market',auth,(req,res)=>res.json({listings:Object.values(db.carListings).map(l=>({...l,sellerName:byId(l.seller)?.name||'?',mine:l.seller===req.user.id}))}));
app.post('/api/car/buy-market',auth,(req,res)=>{const u=req.user,l=db.carListings[req.body.id];if(!l)return res.status(404).json({error:'Kuulutus puudub.'});if(l.seller===u.id)return res.status(400).json({error:'Enda autot ei saa osta.'});if(u.cash<l.price)return res.status(400).json({error:'Raha puudub.'});const seller=byId(l.seller);if(!seller)return res.status(404).json({error:'Müüjat pole.'});const feeRate=clamp(Number(db.settings.carSaleFee??.08),0,.25),fee=Math.floor(l.price*feeRate);u.cash-=l.price;creditBankFirst(seller,l.price-fee);gameIncome(fee,'car_market_fee',seller);u.cars.push(l.car);delete db.carListings[l.id];ok(res,u,{message:`Ostsid auto ${l.price} € eest.`})});
app.post('/api/car/npc-offer/accept',auth,(req,res)=>{const u=req.user,l=db.carListings[req.body.id];if(!l||l.seller!==u.id)return res.status(404).json({error:'Kuulutust pole.'});const offer=Math.floor(l.npcOffer||0);if(offer<=0)return res.status(400).json({error:'NPC pakkumist pole.'});const feeRate=clamp(Number(db.settings.carSaleFee??.08),0,.25),fee=Math.floor(offer*feeRate),credit=creditBankFirst(u,offer-fee);gameIncome(fee,'npc_car_market_fee',u);delete db.carListings[l.id];ok(res,u,{message:`Võtsid NPC pakkumise vastu: ${offer} €. Teenustasu ${fee} €. Panka ${credit.toBank} €${credit.toCash?`, sularahasse ${credit.toCash} €`:''}.`})});
app.post('/api/car/npc-offer/reject',auth,(req,res)=>{const u=req.user,l=db.carListings[req.body.id];if(!l||l.seller!==u.id)return res.status(404).json({error:'Kuulutust pole.'});l.npcOffer=0;l.npcOfferAt=0;l.npcActionAt=Date.now()+rand(2,15)*60000;ok(res,u,{message:'NPC pakkumine tagasi lükatud. NPC vaatab kuulutuse uuesti kuni 15 minuti jooksul.'})});
app.post('/api/car/cancel-listing',auth,(req,res)=>{const u=req.user,l=db.carListings[req.body.id];if(!l||l.seller!==u.id)return res.status(404).json({error:'Kuulutust pole.'});u.cars.push(l.car);delete db.carListings[l.id];ok(res,u,{message:'Kuulutus eemaldatud ja auto tagastatud garaaži.'})});
function updateCrypto(){if(Date.now()<db.settings.cryptoNext)return;const mid=(db.settings.cryptoMin+db.settings.cryptoMax)/2,drift=(mid-db.settings.cryptoPrice)*.18,noise=rand(-22,22);db.settings.cryptoPrice=clamp(Math.round(db.settings.cryptoPrice+drift+noise),db.settings.cryptoMin,db.settings.cryptoMax);db.settings.cryptoNext=Date.now()+900000;io.emit('settings',db.settings);saveSoon()}

app.post('/api/nightlife/unlock',auth,(req,res)=>res.json({ok:true,unlocked:true,public:true}));
app.get('/api/nightlife/access',auth,(req,res)=>res.json({unlocked:true,public:true}));
app.get('/api/nightlife',auth,nightlifeGate,(req,res)=>{const u=req.user;refreshNightlife(u);res.json({venues:nightlifeState(u).venues.map(nightClientVenue),publicVenues:nightPublicRows(),premises:NIGHT_PREMISES,types:NIGHT_TYPES,shop:NIGHT_SHOP,guests:NIGHT_GUESTS,blackItems:NIGHT_BLACK_ITEMS,donations:NIGHT_DONATIONS,tax:NIGHT_TAX,withdrawFee:NIGHT_WITHDRAW_FEE})});
app.get('/api/nightlife/public',auth,(req,res)=>res.json({venues:nightPublicRows(),types:NIGHT_TYPES}));
app.post('/api/nightlife/alert-delete',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const id=String(req.body.alertId||'');v.alerts=(v.alerts||[]).filter(a=>String(a.id)!==id);ok(res,u,{message:'Teavitus eemaldatud.'})});
app.post('/api/nightlife/alerts-clear',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);v.alerts=[];ok(res,u,{message:'Kõik ööelu teavitused eemaldatud.'})});
app.post('/api/nightlife/create',auth,nightlifeGate,(req,res)=>{const u=req.user,n=nightlifeState(u),type=String(req.body.type||''),t=NIGHT_TYPES[type],pr=NIGHT_PREMISES.find(x=>x.id===String(req.body.premiseId||''));if(!t||!pr)return res.status(400).json({error:'Vali koha tüüp ja pind.'});if(n.venues.some(v=>v.type===type))return res.status(400).json({error:`Sul on ${t.name} juba olemas. Iga tüüp on eraldi.`});if(n.venues.length>=3)return res.status(400).json({error:'Sul võib olla kuni 3 ööelukohta.'});if(u.cash<pr.cost)return res.status(400).json({error:`Pinna jaoks on vaja ${pr.cost} € sularaha.`});u.cash-=pr.cost;gameIncome(pr.cost,'nightlife_premise_purchase',u);const id=String(n.nextVenueId++),name=String(req.body.name||`${t.name} ${id}`).trim().slice(0,36)||`${t.name} ${id}`;n.venues.push(nightNormalizeVenue({id,type,name,premiseId:pr.id,premiseName:pr.name,city:pr.city,area:pr.area,baseArea:pr.area,extraArea:0,premiseCost:pr.cost,constructionStatus:'none',constructionDoneAt:0,inventory:{},itemCondition:{},staff:[],offers:{},suppliers:{},securityContract:null,entryFee:type==='bar'?0:type==='club'?25000:35000,open:false,ready:false,accountOpen:false,account:0,blackCash:0,blackStock:{ant:0,kok:0,jupp:0},heat:0,reputation:5,totalRevenue:0,totalVisitors:0,lastVisitors:0,lastRevenueAt:Date.now(),windowStart:Date.now(),usedOpenMs:0,declarations:[],createdAt:Date.now()}));ok(res,u,{message:`Lõid koha: ${name}. Ava järgmise sammuna 200⚡ eest ettevõtte pangakonto.`})});
app.post('/api/nightlife/bank-open',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);if(v.accountOpen)return res.status(400).json({error:'Pangakonto on juba avatud.'});if(!needTurns(u,200))return res.status(400).json({error:'Pangakonto avamiseks on vaja 200 käiku.'});v.accountOpen=true;ok(res,u,{message:'Ettevõtte pangakonto avatud. Maksumus 200 käiku.'})});
app.post('/api/nightlife/bank-move',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),dir=String(req.body.dir||''),amount=Math.max(1,Math.floor(Number(req.body.amount)||0));if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);if(!v.accountOpen)return res.status(400).json({error:'Ava kõigepealt koha pangakonto.'});if(dir==='in'){const src=String(req.body.source||'cash');if(src==='bank'){if(u.bank<amount)return res.status(400).json({error:'Isiklikul pangakontol pole piisavalt raha.'});u.bank-=amount}else{if(u.cash<amount)return res.status(400).json({error:'Sularaha pole piisavalt.'});u.cash-=amount}v.account+=amount;return ok(res,u,{message:`Kandsid koha kontole ${amount} €.`})}if(dir==='out'){if(v.account<amount)return res.status(400).json({error:'Koha kontol pole piisavalt raha.'});const fee=Math.floor(amount*NIGHT_WITHDRAW_FEE),net=amount-fee;v.account-=amount;gameIncome(fee,'nightlife_withdraw_fee',u);const c=creditBankFirst(u,net);return ok(res,u,{message:`Võtsid välja ${amount} €. 8% tasu ${fee} €, sulle ${net} € (panka ${c.toBank} €).`})}return res.status(400).json({error:'Vigane suund.'})});
app.post('/api/nightlife/tender',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const kind=String(req.body.kind||'');v.offers=v.offers||{};if(kind==='construction'){if(v.constructionStatus==='building')return res.status(400).json({error:'Ehitus juba käib. Oota, kuni see valmis saab.'});if(v.constructionStatus==='done')return res.status(400).json({error:'See koht on juba valmis ehitatud. Uut ehitushanget pole vaja.'});v.offers.construction=nightConstructionOffers(v)}else if(kind==='security')v.offers.security=nightSecurityOffers(v);else if(kind==='alcohol'||kind==='food')v.offers[kind]=nightSupplierOffers(v,kind);else if(kind==='staff'){const role=String(req.body.role||'bartender');if(!['bartender','server','dj','dancer','performer','cleaner','hostess','kitchen'].includes(role))return res.status(400).json({error:'Vigane amet.'});if(role==='performer'&&v.type!=='strip')return res.status(400).json({error:'Esinejate konkurss on striptiisiklubile.'});v.offers.staff=nightStaffApps(v,role)}else return res.status(400).json({error:'Vigane hange.'});ok(res,u,{message:'Uued NPC pakkumised saabusid. Hinnad ja kvaliteet muutuvad iga hanke korral.'})});
app.post('/api/nightlife/offers/clear',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const kind=String(req.body.kind||'');if(!['construction','security','alcohol','food','staff'].includes(kind))return res.status(400).json({error:'Vigane pakkumiste tüüp.'});v.offers=v.offers||{};v.offers[kind]=[];ok(res,u,{message:'Pakkumised suleti.'})});
app.post('/api/nightlife/accept',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const kind=String(req.body.kind||''),list=v.offers?.[kind]||[],o=list.find(x=>x.id===String(req.body.offerId||''));if(!o)return res.status(400).json({error:'Pakkumist pole.'});let cost=0;if(kind==='construction')cost=o.price;else if(kind==='security')cost=o.total;else if(kind==='alcohol'||kind==='food')cost=o.setup;else return res.status(400).json({error:'Seda pakkumist ei saa nii kinnitada.'});const ch=nightCharge(v,cost,kind==='construction'?'Ehitus':kind==='security'?`Turva ${Number(o.hours||12)}h pakett`:`Tarnija ${Number(o.hours||12)}h leping`,kind==='security'?null:'other',u);if(!ch.ok)return res.status(400).json({error:ch.error});if(kind==='construction'){if(v.constructionStatus==='building')return res.status(400).json({error:'Ehitus juba käib.'});if(v.constructionStatus==='done')return res.status(400).json({error:'Koht on juba valmis ehitatud.'});v.builder=o;v.constructionStatus='building';v.constructionDoneAt=Date.now()+o.minutes*60000;v.reputation=clamp(v.reputation+Math.floor(o.quality/25),0,100)}else if(kind==='security'){v.securityContract={...o,remainingHours:Number(o.hours||12),remainingMs:Number(o.hours||12)*3600000,startedAt:Date.now()}}else{v.suppliers[kind]={...o,selected:true,hours:Number(o.hours||12),startedAt:Date.now(),until:Date.now()+Number(o.hours||12)*3600000}}v.offers[kind]=[];v.ready=nightReady(v);ok(res,u,{message:'Pakkumine kinnitatud ja raha võeti koha kontolt.'})});
app.post('/api/nightlife/shop',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),it=NIGHT_SHOP.find(x=>x.id===String(req.body.itemId||'')),q=Math.max(1,Math.min(500,Math.floor(Number(req.body.q)||1)));if(!v||!it)return res.status(400).json({error:'Vigane kaup või koht.'});nightNormalizeVenue(v);if(it.types&&!it.types.includes(v.type))return res.status(400).json({error:'See ese ei sobi selle koha tüübile.'});if(v.constructionStatus!=='done')return res.status(400).json({error:'Lase koht enne valmis ehitada.'});const need=it.m2*q;if(nightFreeArea(v)+.001<need)return res.status(400).json({error:`Pinda pole piisavalt. Vaja ${need.toFixed(1)} m², vaba ${nightFreeArea(v).toFixed(1)} m².`});const cost=it.price*q,ch=nightCharge(v,cost,`Ost ${q} × ${it.name}`,'other',u);if(!ch.ok)return res.status(400).json({error:ch.error});v.inventory[it.id]=(v.inventory[it.id]||0)+q;v.itemCondition[it.id]=Math.max(Number(v.itemCondition[it.id]||0),100);v.ready=nightReady(v);ok(res,u,{message:`Ostsid ${q} × ${it.name}. Kasutab ${need.toFixed(1)} m².`})});
app.post('/api/nightlife/liquidate',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),it=NIGHT_SHOP.find(x=>x.id===String(req.body.itemId||'')),q=Math.max(1,Math.floor(Number(req.body.q)||1));if(!v||!it)return res.status(400).json({error:'Vigane kaup.'});nightNormalizeVenue(v);const have=Math.floor(Number(v.inventory[it.id]||0));if(q>have)return res.status(400).json({error:'Sul pole nii palju.'});const cond=Math.max(0,Number(v.itemCondition[it.id]??100))/100,refund=Math.floor(it.price*q*(.18+.37*cond));v.inventory[it.id]=have-q;v.account+=refund;nightAddDeclEvent(v,`${q} × ${it.name} likvideeriti. Tagasi ${refund} €; pind vabanes.`);ok(res,u,{message:`Likvideerisid ${q} × ${it.name}. Koha kontole ${refund} €.`})});
app.post('/api/nightlife/hire',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const a=(v.offers?.staff||[]).find(x=>x.id===String(req.body.applicationId||''));if(!a)return res.status(400).json({error:'Kandidaati pole.'});v.staff.push(a);v.offers.staff=(v.offers.staff||[]).filter(x=>x.id!==a.id);nightAddDeclEvent(v,`Palgati ${a.stageName||a.name} (${a.role}), palk ${a.wage} €/h.`);v.ready=nightReady(v);ok(res,u,{message:`Palkasid ${a.stageName||a.name}.`})});
app.post('/api/nightlife/fire',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const x=v.staff.find(a=>a.id===String(req.body.staffId||''));if(!x)return res.status(404).json({error:'Töötajat pole.'});const severance=Math.floor(Number(x.wage||0)*rand(1,4)),ch=nightCharge(v,severance,'Töötaja lõpparve','other',u);if(!ch.ok)return res.status(400).json({error:ch.error});v.staff=v.staff.filter(a=>a.id!==x.id);nightAddDeclEvent(v,`${x.stageName||x.name} lasti lahti. Lõpparve ${severance} €.`);v.ready=nightReady(v);ok(res,u,{message:'Töötaja vabastatud.'})});
app.post('/api/nightlife/raise',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),x=v?.staff?.find(a=>a.id===String(req.body.staffId||''));if(!v||!x||!x.raiseRequest)return res.status(400).json({error:'Palgatõusu taotlust pole.'});if(req.body.accept){x.wage=x.raiseRequest.newWage;nightAddDeclEvent(v,`${x.stageName||x.name} palgatõus kinnitati: ${x.wage} €/h.`)}else{if(Math.random()<.72){v.staff=v.staff.filter(a=>a.id!==x.id);nightAddDeclEvent(v,`${x.stageName||x.name} lahkus pärast palgatõusust keeldumist.`)}else nightAddDeclEvent(v,`${x.stageName||x.name} jäi tööle hoolimata palgatõusust keeldumisest.`)}delete x.raiseRequest;ok(res,u,{message:'Otsus salvestatud.'})});
app.post('/api/nightlife/settings',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});refreshNightlife(u);nightNormalizeVenue(v);if(req.body.entryFee!=null)v.entryFee=Math.max(0,Math.floor(Number(req.body.entryFee)||0));if(req.body.open!=null){if(req.body.open){if(v.open)return res.status(400).json({error:'Koht on juba avatud.'});if(nightPendingTaxes(v)>0)return res.status(400).json({error:'Enne uut avamist esita eelmised lukustatud deklaratsioonid ja maksa maksud.'});v.ready=nightReady(v);if(!v.ready)return res.status(400).json({error:'Koht pole avamiseks valmis. Kontrolli pangakontot ja ehituse valmimist. Puuduv personal, turva, tarnijad ja tehnika vähendavad tulu tugevalt.'});if(v.usedOpenMs>=NIGHT_MAX_OPEN_MS)return res.status(400).json({error:'Selle 24h akna 12h avamisaeg on kasutatud.'});v.open=true;v.openStartedAt=Date.now();v.lastRevenueAt=Date.now();v.lastUsageAt=Date.now();if(!v.currentDecl)v.currentDecl=nightNewDecl(v,Date.now())}else{v.open=false;v.openStartedAt=0;v.lastRevenueAt=Date.now();v.lastUsageAt=Date.now()}}ok(res,u,{message:v.open?'Koht avatud. Maksimaalselt 12h selle koha 24h aknas.':'Koht suletud.'})});
app.post('/api/nightlife/declaration-pay',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});refreshNightlife(u);const d=(v.declarations||[]).find(x=>x.id===String(req.body.declarationId||''));if(!d||d.status!=='pending')return res.status(400).json({error:'Deklaratsioon pole maksmiseks saadaval.'});const tax=Math.max(0,Math.floor(d.tax||0));if(v.account<tax)return res.status(400).json({error:`Koha kontol pole 24% maksu tasumiseks piisavalt raha. Vaja ${tax} €.`});v.account-=tax;gameIncome(tax,'nightlife_tax',u);d.status='paid';d.paidAt=Date.now();ok(res,u,{message:`Deklaratsioon esitatud. Maksuametile makstud ${tax} €.`})});
app.post('/api/nightlife/action',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const action=String(req.body.action||''),tier=clamp(Math.floor(Number(req.body.tier||1)),1,3);if(action==='promo'){const now=Date.now();if(Number(v.promoUntil||0)>now)return res.status(400).json({error:'Reklaamikampaania on juba aktiivne. Oota selle lõpuni.'});const hours=nightPromoHours(tier),cost=nightPromoCost(v,tier),ch=nightCharge(v,cost,'Reklaamikampaania',null,u);if(!ch.ok)return res.status(400).json({error:ch.error});const ranges=[[1.04,1.11],[1.11,1.23],[1.20,1.38]],r=ranges[tier-1];v.promoUntil=now+hours*3600000;v.promoTier=tier;v.promoBoost=r[0]+Math.random()*(r[1]-r[0]);v.promoHourlyCost=Math.floor(cost/hours);v.promoEndedAlerted=false;return ok(res,u,{message:`Reklaam käivitatud ${hours} tunniks. Maksis ${cost} €. Tegelik tasuvus sõltub külastajatest ja koha kvaliteedist.`})}if(action==='training'){if(v.trainingLevel>=100)return res.status(400).json({error:'Personali koolitus on max level 100.'});const cost=nightTrainingCost(v),ch=nightCharge(v,cost,'Personali koolitus','training',u);if(!ch.ok)return res.status(400).json({error:ch.error});v.trainingLevel=Math.min(100,Number(v.trainingLevel||0)+1);v.reputation=clamp(v.reputation+.35,0,100);nightAddDeclEvent(v,`Personali koolitus level ${v.trainingLevel}/100; kulu ${cost} €.`);return ok(res,u,{message:`Koolitus level ${v.trainingLevel}/100. Maksis ${cost} €.`})}if(action==='vip'){const now=Date.now();if(v.vipEvent&&now<Number(v.vipEvent.end||0))return res.status(400).json({error:'VIP-õhtu on juba aktiivne. Oota selle lõpuni.'});const guest=NIGHT_GUESTS[v.type].find(x=>x.id===String(req.body.guestId||''))||null,base=nightVipBaseCost(v),guestFee=nightGuestFee(v,guest),eventCost=Math.floor(base*.6),cost=eventCost+guestFee,ch=nightCharge(v,cost,'VIP-õhtu 1h',null,u);if(!ch.ok)return res.status(400).json({error:ch.error});const basePull=guest?.pull||1.12,pull=clamp(basePull*(.82+Math.random()*.38),1.02,2.15);v.vipEvent={start:now,end:now+3600000,guestId:guest?.id||null,hourCost:cost,guestFee,eventCost,pull,name:guest?.name||'VIP-õhtu'};nightAddDeclEvent(v,`VIP-õhtu: ${guest?guest.name+' ('+guest.kind+')':'ilma külalisesinejata'}, kogukulu ${cost} €. Tulemus sõltub reaalsest külastatavusest.`);return ok(res,u,{message:`VIP-õhtu käivitatud 1 tunniks. Kulu ${cost} €. Kasum pole garanteeritud.`})}return res.status(400).json({error:'Vigane tegevus.'})});
app.post('/api/nightlife/premise-upgrade',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);const cur=NIGHT_PREMISES.findIndex(x=>x.id===v.premiseId),target=NIGHT_PREMISES.find(x=>x.id===String(req.body.premiseId||''));if(!target||NIGHT_PREMISES.indexOf(target)<=cur)return res.status(400).json({error:'Vali praegusest suurem hoone.'});const source=String(req.body.source||'cash');if(source==='venue'){const ch=nightCharge(v,target.cost,'Uus suurem hoone','other',u);if(!ch.ok)return res.status(400).json({error:ch.error})}else{if(u.cash<target.cost)return res.status(400).json({error:'Sularaha pole piisavalt.'});u.cash-=target.cost;gameIncome(target.cost,'nightlife_premise_upgrade',u)}v.premiseId=target.id;v.premiseName=target.name;v.city=target.city;v.baseArea=target.area;v.area=target.area+Number(v.extraArea||0);v.premiseCost=target.cost;nightAddDeclEvent(v,`Koliti suuremasse hoonesse: ${target.name}, ${target.area} m². Kõik töötajad, inventar, maine ja kontod jäid alles.`);ok(res,u,{message:'Uus suurem hoone ostetud; vana koha sisu jäi alles.'})});
app.post('/api/nightlife/expand',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);if(!nightPremise(v).max)return res.status(400).json({error:'Ruutmeetreid saab eraldi juurde osta ainult kõige suuremas hoones.'});const m2=Math.max(1,Math.min(1000,Math.floor(Number(req.body.m2)||1))),turns=m2*50;if(!needTurns(u,turns))return res.status(400).json({error:`Vaja ${turns} käiku (${m2} m² × 50).`});v.extraArea+=m2;v.area+=m2;ok(res,u,{message:`Ostsid juurde ${m2} m². Kulu ${turns} käiku. 25% lisapinnast jääb reserveeritud alaks.`})});
app.post('/api/nightlife/black-buy',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),it=NIGHT_BLACK_ITEMS.find(x=>x.id===String(req.body.itemId||'')),q=Math.max(1,Math.min(1000,Math.floor(Number(req.body.q)||1)));if(!v||!it)return res.status(400).json({error:'Vigane kaup.'});nightNormalizeVenue(v);const m=nightRefreshBlackMarket(v),lim=m.limits[it.id],left=Math.max(0,lim.buy-lim.buyUsed);if(q>left)return res.status(400).json({error:`Selles 15 min turuvoorus saad ${it.name} osta veel max ${left} tk.`});const cost=it.buy*q;if(v.blackCash<cost)return res.status(400).json({error:'Mustas kassas pole piisavalt raha.'});v.blackCash-=cost;v.blackStock[it.id]=(v.blackStock[it.id]||0)+q;lim.buyUsed+=q;ok(res,u,{message:`Ostsid mustalt turult ${q} × ${it.name}.`})});
app.post('/api/nightlife/black-seed',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),amount=Math.max(1,Math.floor(Number(req.body.amount)||0));if(!v)return res.status(404).json({error:'Kohta pole.'});if(u.cash<amount)return res.status(400).json({error:'Sularaha pole piisavalt.'});u.cash-=amount;v.blackCash+=amount;ok(res,u,{message:`Panid ${amount} € sularahast musta kassasse.`})});
app.post('/api/nightlife/black-withdraw',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),amount=Math.max(1,Math.floor(Number(req.body.amount)||0));if(!v)return res.status(404).json({error:'Kohta pole.'});nightNormalizeVenue(v);if(v.blackCash<amount)return res.status(400).json({error:'Mustas kassas pole nii palju raha.'});v.blackCash-=amount;const d=creditCashWithDebt(u,amount,'black_cash_withdraw');ok(res,u,{message:d.paidCentral?`Võtsid mustast kassast ${amount} €, millest ${d.paidCentral} € läks Keskpanga võla katteks.`:`Võtsid mustast kassast ${amount} € sularahasse. Väljavõtutasu puudub.`})});
app.post('/api/nightlife/black-sell',auth,nightlifeGate,(req,res)=>{const u=req.user,v=nightVenue(u,req.body.venueId),it=NIGHT_BLACK_ITEMS.find(x=>x.id===String(req.body.itemId||'')),q=Math.max(1,Math.min(1000,Math.floor(Number(req.body.q)||1)));if(!v||!it)return res.status(400).json({error:'Vigane kaup.'});nightNormalizeVenue(v);const m=nightRefreshBlackMarket(v),lim=m.limits[it.id],left=Math.max(0,lim.sell-lim.sellUsed);if(q>left)return res.status(400).json({error:`Selles 15 min turuvoorus on ${it.name} nõudlust veel max ${left} tk.`});if((v.blackStock[it.id]||0)<q)return res.status(400).json({error:'Kaupa pole piisavalt.'});v.blackStock[it.id]-=q;lim.sellUsed+=q;const revenue=it.sell*q;v.blackCash+=revenue;ok(res,u,{message:`Müük õnnestus. Must kassa +${revenue} €.`})});
app.post('/api/nightlife/close-business',auth,nightlifeGate,(req,res)=>{const u=req.user,n=nightlifeState(u),v=nightVenue(u,req.body.venueId);if(!v)return res.status(404).json({error:'Kohta pole.'});refreshNightlife(u);if(v.open)return res.status(400).json({error:'Sulge koht enne tavaliselt.'});if(nightPendingTaxes(v)>0)return res.status(400).json({error:'Esita enne kõik lukustatud deklaratsioonid.'});const payout=Math.max(0,Math.floor(v.account||0)),fee=Math.floor(payout*NIGHT_WITHDRAW_FEE),net=payout-fee;if(net>0)creditBankFirst(u,net);if(fee>0)gameIncome(fee,'nightlife_close_fee',u);n.venues=n.venues.filter(x=>x!==v);ok(res,u,{message:`Ettevõte suleti jäädavalt. Konto jäägist ${net} € kanti sulle pärast 8% tasu.`})});
app.get('/api/admin/nightlife-book',auth,admin,(req,res)=>{res.json({passwordRequired:false,rules:{tax:'24% iga lukustatud tunni brutotulust; maks tasutakse esitamisel koha kontolt',withdraw:'8% iga väljavõtte pealt',space:'25% kogupinnast reserveeritud, 75% sisustatav',open:'iga koha iseseisev 24h aken; max 12h avatud',bank:'iga koha konto avamine 200 käiku',expand:'ainult suurimas 2500 m² hoones; +1 m² = 50 käiku',blackMarket:'15 min turuvoorud; ostu/müügi kogus sõltub hoonest, klientidest, nõudlusest ja VIP-ist; vahelejäämise/konfiskeerimise riski ei ole',blackCash:'must kassa liigub ainult sularaha ↔ must kassa; väljavõtutasu puudub'},profitGuide:[{type:'Baar',best:'Umbes 8 töötajat iga 100 m² kohta. Suurenda koos pinnaga nii teenindust kui baarimehi; turva ja koristus kasvavad aeglasemalt.',target:'100 m² kohta umbes 2.2 baarmeni · 2.6 teenindajat · 1.2 kööki · 1.2 turvat · 0.8 koristajat',warning:'Alla ideaali langevad teenindus, külastajate arv ja käive. Üle ~125% ideaali annab lisapersonal vähe kasu ja sööb palgaga kasumit.'},{type:'Ööklubi',best:'Umbes 8 töötajat iga 100 m² kohta. Baar, teenindus ja turva on põhirõhk; DJ/hostess kasvavad samuti koos pinna ja nõudlusega.',target:'100 m² kohta umbes 2.3 baarmeni · 2.2 teenindajat · 1.8 turvat · 0.8 koristajat · 0.65 hostessit · 0.45 DJ-d',warning:'VIP ja suur nõudlus vajavad piisavalt turvat ja teenindust. Üks DJ ei kanna enam mitutuhat m² klubi täisvõimsusel.'},{type:'Striptiisiklubi',best:'Umbes 10 töötajat iga 100 m² kohta, sest lisanduvad esinejad ja hostessid. Suuremal pinnal peab kasvama ka turva ning teenindus.',target:'100 m² kohta umbes 3 esinejat · 1.8 baarmeni · 1.4 teenindajat · 1.6 turvat · 1 hostess · 0.7 koristajat · 0.35 DJ-d',warning:'Esinejate ja turva puudus piirab nõudlust kiiresti; liiga suur personal tõstab püsikulu.'}],ticketGuide:[{situation:'Koht täitub peaaegu iga tund',advice:'Tõsta piletit 10–20% kaupa ja vaata järgmise 1–3 tunni külastajate arvu ning netotulu. Eesmärk pole alati täismaja, vaid suurim kasum tunnis.'},{situation:'Koht on alla ~60% täis',advice:'Langeta piletit 10–20%, paranda reklaami/personali/sisustust või oota paremat nõudlust. Kõrge hind tühjas kohas põletab tulu.'},{situation:'Reklaamikampaania või tugev maine',advice:'Nõudlus on kõrgem, seega võid tavahinnast rohkem küsida. Tõsta hinda järk-järgult, kuni külastajate langus hakkab brutotulu vähendama.'},{situation:'VIP-õhtu / külalisesineja',advice:'VIP suurendab nõudlust ja lubab kõrgemat piletit. Suurel pinnal proovi enne +20–40%; väga tugeva külalise ja täis personali korral võib sobida rohkem.'},{situation:'Uus või nõrk koht',advice:'Hoia alguses pilet mõõdukas, et kasvatada külastusi ja mainet. Ära pane kõrget hinda enne, kui personal, turva ja inventar suudavad nõudlust teenindada.'},{situation:'Otsustamise reegel',advice:'Võrdle alati tunni netot: külastajad × (pilet + keskmine kulu) miinus palgad, turva, tarnijad, reklaam/VIP, hooldus ja maks. Parim pilet on see, mis jätab suurima neto, mitte see, mis toob kõige rohkem külastajaid.'}],items:NIGHT_SHOP.map(x=>({id:x.id,name:x.name,m2:x.m2,appeal:x.appeal||0,power:x.power||0})),premises:NIGHT_PREMISES.map(x=>({name:x.name,area:x.area,cost:x.cost,usable:x.area*.75})),optimumByPremise:NIGHT_PREMISES.flatMap(p=>['bar','club','strip'].map(type=>{const v={type,area:p.area,staff:[],securityContract:null};const o=nightOptimal(v),a=p.area;let inventory;if(type==='bar')inventory={table:Math.max(4,Math.round(a/16)),chair:Math.max(12,Math.round(a/5)),barstool:Math.max(8,Math.round(a/9)),sofa:Math.max(2,Math.round(a/55)),vipbooth:Math.max(0,Math.round(a/220)),barcounter:Math.max(1,Math.round(a/350)),speaker5:Math.max(2,Math.round(a/140)),sub:Math.max(1,Math.round(a/220)),lights:Math.max(1,Math.round(a/250))};else if(type==='club')inventory={table:Math.max(3,Math.round(a/35)),chair:Math.max(8,Math.round(a/12)),barstool:Math.max(8,Math.round(a/10)),sofa:Math.max(3,Math.round(a/45)),vipbooth:Math.max(1,Math.round(a/100)),barcounter:Math.max(1,Math.round(a/300)),speaker10:Math.max(3,Math.round(a/90)),sub:Math.max(2,Math.round(a/110)),djpro:Math.max(1,Math.round(a/450)),lights:Math.max(2,Math.round(a/120)),laser:Math.max(1,Math.round(a/180))};else inventory={table:Math.max(2,Math.round(a/45)),chair:Math.max(8,Math.round(a/14)),barstool:Math.max(6,Math.round(a/12)),sofa:Math.max(3,Math.round(a/40)),vipbooth:Math.max(2,Math.round(a/80)),barcounter:Math.max(1,Math.round(a/300)),stage:Math.max(1,Math.round(a/350)),private:Math.max(2,Math.round(a/90)),dressing:Math.max(1,Math.round(a/350)),speaker10:Math.max(2,Math.round(a/100)),sub:Math.max(2,Math.round(a/140)),djpro:Math.max(1,Math.round(a/500)),lights:Math.max(2,Math.round(a/140))};return{premise:p.name,area:p.area,type:NIGHT_TYPES[type].name,staff:o,inventory}})),bestProfit:'Kõrgeim absoluutne teenimislagi on suurimal Tallinna sadama 2500 m² pinnal ning sealt edasi lisam² ostes. Suurem pind vajab nüüd päriselt rohkem töötajaid ja rohkem inventari; maksimaalne kasum tuleb ainult siis, kui personal, turva, piletihind, inventar, hooldus, reklaam ja VIP-kulud on tasakaalus.',notes:['Personal skaleerub nüüd ligikaudu 8 töötajani / 100 m² baaris ja ööklubis ning ~10 / 100 m² striptiisiklubis.','Inventari soovitused skaleeruvad samuti pinnaga: suurem koht vajab kümneid/sadu toole, laudu, baaripukke ning rohkem heli/valgust, mitte üksikuid esemeid.','Maksimumkasum ei tule lihtsalt kõige suuremast kogusest: ülepersonali ja ruumi ületäitmine söövad kasumit või blokeerivad ostu.','Piletihind vähendab nõudlust eksponentsiaalselt; kõrgem maine, reklaam, VIP ja kvaliteet lubavad kõrgemat hinda.','Reklaam, koolitus ja VIP mõjutavad külastajaid, kuid nende oma kulu tuleb deklaratsioonis kasumist maha.','Hooldus ja purunemine vähendavad kvaliteeti; 0% seisukorraga ese ei kasuta enam m².','Must turg on seotud koha kliendivooluga: väikseima hoone väga hea tavapärane lagi on umbes 30M €/h ning VIP võib selle tõsta umbes 50–60M €/h; suurima hoone tugev tund võib ulatuda umbes 1B €/h.','Musta turu kogused uuenevad iga 15 minuti järel ja pole jäik nähtav kasumilimiit — mängija näeb ainult selle vooru ostu- ja müügikoguseid.','Teiste mängijate klubidel on avalik klubi skoor ja koha raha; personali ning inventari täpset koosseisu ei näidata.']})});

app.get('/api/production',auth,(req,res)=>{const u=req.user,p=u.production||{};const cl=clamp(Math.floor(p.capacityLevel||1),1,10);res.json({production:p,materials:LAB_MATERIALS,capacity:LAB_CAPACITY[cl],nextCapacityCost:cl<10?LAB_CAPACITY_COST[cl+1]:null,sellPrice:LAB_SELL_PRICE,recipe:{plant:2,chem:1,pack:1},turns:20})});
app.post('/api/production/material',auth,(req,res)=>{const u=req.user,p=u.production,type=String(req.body.type||''),q=Math.max(1,Math.min(100000,Math.floor(+req.body.q||0))),m=LAB_MATERIALS[type];if(!m)return res.status(400).json({error:'Vigane materjal.'});const cost=q*m.price;if(u.cash<cost)return res.status(400).json({error:`Vaja ${cost} € sularaha.`});u.cash-=cost;p.materials[type]=(p.materials[type]||0)+q;gameIncome(cost,'production_material',u);ok(res,u,{message:`Ostsid ${q} × ${m.name} hinnaga ${cost} €.`})});
app.post('/api/production/upgrade',auth,(req,res)=>{const u=req.user,p=u.production,type=String(req.body.type||'');if(type==='capacity'){const n=Math.min(10,(p.capacityLevel||1)+1);if(n===(p.capacityLevel||1))return res.status(400).json({error:'Tootmismaht on maksimumis.'});const cost=LAB_CAPACITY_COST[n];if(u.cash<cost)return res.status(400).json({error:`Vaja ${cost} €.`});u.cash-=cost;p.capacityLevel=n;gameIncome(cost,'production_capacity_upgrade',u);return ok(res,u,{message:`Tootmismaht nüüd level ${n}: kuni ${LAB_CAPACITY[n]} ühikut korraga.`})}res.status(400).json({error:'Vigane uuendus.'})});
app.post('/api/production/make',auth,(req,res)=>{const u=req.user,p=u.production;const cap=LAB_CAPACITY[clamp(Math.floor(p.capacityLevel||1),1,10)],q=Math.max(1,Math.min(cap,Math.floor(+req.body.q||cap))),need={plant:q*2,chem:q,pack:q};for(const k of Object.keys(need))if((p.materials[k]||0)<need[k])return res.status(400).json({error:'Materjale pole valitud koguse jaoks piisavalt.'});if(!needTurns(u,20))return res.status(400).json({error:'Vaja 20 käiku.'});for(const k of Object.keys(need))p.materials[k]-=need[k];p.stock=(p.stock||0)+q;p.totalMade=(p.totalMade||0)+q;p.nextAt=0;ok(res,u,{message:`Valmistasid ${q} ühikut kohe. Kulutasid 20 käiku.`})});
app.post('/api/production/sell',auth,(req,res)=>{const u=req.user,p=u.production,stock=Math.max(0,Math.floor(p.stock||0));if(stock<=0)return res.status(400).json({error:'Valmistoodangut pole.'});const q=Math.max(1,Math.min(stock,Math.floor(+req.body.q||stock)));const gross=q*LAB_SELL_PRICE;p.stock-=q;p.totalSold=(p.totalSold||0)+q;const credit=creditBankFirst(u,gross);ok(res,u,{message:`Müüsid ${q} ühikut ${gross} € eest. Panka ${credit.toBank} €${credit.toCash?`, sularahasse ${credit.toCash} €`:''}.`})});
app.post('/api/casino/slot',auth,(req,res)=>{const u=req.user,stake=Math.floor(Number(req.body.stake)||0);if(stake<=0)return res.status(400).json({error:'Sisesta panus.'});if(stake>u.cash)return res.status(400).json({error:'Sularaha pole piisavalt.'});u.cash-=stake;const out=slotOutcome(),payout=Math.floor(stake*out.mult);let credit={toBank:0,toCash:0};if(payout>0)credit=creditBankFirst(u,payout);u.stats=u.stats||{};u.stats.slotSpins=(u.stats.slotSpins||0)+1;u.stats.slotWagered=(u.stats.slotWagered||0)+stake;u.stats.slotWon=(u.stats.slotWon||0)+payout;logCasinoSpin(u,stake,payout,'player');const message=out.mult===0?`Slot: kaotasid ${stake} €.`:`${out.label}! Võit ${payout} € (${out.mult}×). Panka ${credit.toBank} €${credit.toCash?`, sularahasse ${credit.toCash} €`:''}.`;ok(res,u,{message,slot:{reels:out.reels,multiplier:out.mult,stake,payout,label:out.label}})});

app.post('/api/crypto',auth,(req,res)=>{processGameClock();const u=req.user,q=Math.max(1,Math.floor(+req.body.q||0)),max=Math.floor(score(u)/1000);if(req.body.dir==='buy'){if(u.crypto+q>max)return res.status(400).json({error:`Skoori järgi saad omada max ${max} krüptot.`});const cost=q*db.settings.cryptoPrice;if(u.cash<cost)return res.status(400).json({error:'Raha puudub.'});u.cash-=cost;u.crypto+=q}else{if(q>u.crypto)return res.status(400).json({error:'Krüptot pole piisavalt.'});u.crypto-=q;u.cash=(Number(u.cash)||0)+(q*db.settings.cryptoPrice)}ok(res,u)});
app.post('/api/player-bank/create',auth,(req,res)=>{const u=req.user;if(db.playerBanks[u.id])return res.status(400).json({error:'Pank juba olemas.'});if(u.education<2)return res.status(400).json({error:'Panga loomiseks vaja vähemalt põhikooli.'});if(u.cash<100e6)return res.status(400).json({error:'Panga avamiseks pead ise panema 100M algkapitali.'});u.cash-=100e6;db.playerBanks[u.id]={owner:u.id,name:String(req.body.name||u.name+' Pank').slice(0,30),capital:100e6,rate:10,durationHours:24,active:true};ok(res,u,{message:'Pank loodud. 100M sinu sularahast läks panga kapitaliks.'})});
app.get('/api/player-banks',auth,(req,res)=>res.json({banks:Object.values(db.playerBanks).map(b=>({...b,maxLoan:Math.max(0,Math.floor(b.capital||0))}))}));
app.post('/api/player-bank/settings',auth,(req,res)=>{const b=db.playerBanks[req.user.id];if(!b)return res.status(404).json({error:'Panka pole.'});b.rate=clamp(+req.body.rate||b.rate,0,100);b.durationHours=clamp(Math.floor(+req.body.durationHours||b.durationHours),1,720);ok(res,req.user,{message:'Panga tingimused salvestatud.'})});
app.post('/api/player-bank/capital',auth,(req,res)=>{const u=req.user,b=db.playerBanks[u.id],dir=String(req.body.dir||''),a=Math.max(0,Math.floor(+req.body.amount||0));if(!b)return res.status(404).json({error:'Sul pole oma panka.'});if(a<=0)return res.status(400).json({error:'Sisesta summa.'});if(dir==='in'){if(u.cash<a)return res.status(400).json({error:'Sul pole nii palju sularaha.'});u.cash-=a;b.capital=(b.capital||0)+a;return ok(res,u,{message:`Panid oma panka ${a} € kapitali.`})}if(dir==='out'){if((b.capital||0)<a)return res.status(400).json({error:'Pangal pole nii palju vaba kapitali. Välja laenatud raha ei saa enne tagasimakset välja võtta.'});b.capital-=a;u.cash+=a;return ok(res,u,{message:`Võtsid oma pangast ${a} € kapitali välja.`})}return res.status(400).json({error:'Vigane tegevus.'})});
app.post('/api/loan/take',auth,(req,res)=>{const u=req.user;if((u.wanted||0)>=75)return res.status(403).json({error:'Wanted on liiga kõrge uue laenu võtmiseks.'});if(overdueLoans(u).length)return res.status(403).json({error:'Sul on võlgnevuses laen. Uut laenu ei saa enne võla tasumist võtta.'});const b=db.playerBanks[req.body.owner],a=Math.floor(+req.body.amount||0),available=Math.max(0,Math.floor(b?.capital||0));if(!b||!b.active||a<=0||a>available)return res.status(400).json({error:`Laenu ei saa. Pangal on vaba kapitali ${available} €.`});const id=String(db.nextIds.loan++),now=Date.now(),totalDue=Math.floor(a*(1+Number(b.rate||0)/100));b.capital-=a;u.cash+=a;db.loans[id]={id,bankOwner:b.owner,borrower:u.id,principal:a,rate:b.rate,totalDue,unpaid:totalDue,paid:0,createdAt:now,due:now+b.durationHours*3600000,status:'active',lateFeeAdded:0,lastLateFeeAt:0};ok(res,u,{message:`Laen ${a} € võetud. Tagasimakse ${totalDue} €. Raha tuli panga reaalsest kapitalist.`})});
app.get('/api/loans',auth,(req,res)=>res.json({loans:Object.values(db.loans).filter(l=>l.borrower===req.user.id||l.bankOwner===req.user.id)}));
app.post('/api/loan/repay',auth,(req,res)=>{
  const u=req.user,l=db.loans[String(req.body.id||'')];
  if(!l||l.borrower!==u.id||!['active','overdue'].includes(l.status))return res.status(404).json({error:'Aktiivset laenu ei leitud.'});
  const due=l.status==='overdue'?Math.max(0,Math.floor(Number(l.unpaid)||0)):Math.max(0,Math.floor(Number(l.unpaid)||loanBaseDue(l)));
  if(due<=0)return res.status(400).json({error:'Sellel laenul pole tasumata jääki.'});
  const requested=req.body.all?due:Math.max(0,Math.floor(Number(req.body.amount)||0));
  if(requested<=0)return res.status(400).json({error:'Sisesta tagasimakse summa.'});
  const available=Math.max(0,Math.floor(Number(u.bank)||0))+Math.max(0,Math.floor(Number(u.cash)||0));
  if(available<=0)return res.status(400).json({error:'Sul pole tagasimakseks raha.'});
  const pay=Math.min(requested,due,available);
  let left=pay;
  const fromBank=Math.min(left,Math.max(0,Math.floor(Number(u.bank)||0)));u.bank-=fromBank;left-=fromBank;
  const fromCash=Math.min(left,Math.max(0,Math.floor(Number(u.cash)||0)));u.cash-=fromCash;left-=fromCash;
  const paid=pay-left;if(paid<=0)return res.status(400).json({error:'Tagasimakse ebaõnnestus.'});
  l.unpaid=Math.max(0,due-paid);l.paid=(Number(l.paid)||0)+paid;l.lastPaymentAt=Date.now();l.lastPaymentSource='manual';
  const b=db.playerBanks[l.bankOwner];if(b)b.capital=(Number(b.capital)||0)+paid;
  if(l.unpaid<=0){l.unpaid=0;l.status='repaid';l.repaidAt=Date.now();notify(u,'loan',`Laen #${l.id} on täielikult tasutud.`)}
  else notify(u,'loan',`Maksid laenule #${l.id} ${paid} €. Tasumata jääk ${l.unpaid} €.`);
  ok(res,u,{message:l.status==='repaid'?`Laen #${l.id} on täielikult tasutud.`:`Maksid ${paid} €. Tasumata ${l.unpaid} €.`,paid,remaining:l.unpaid,status:l.status});
});
function settleLoans(){
  const now=Date.now(),day=86400000;
  for(const l of Object.values(db.loans||{})){
    const u=byId(l.borrower),b=db.playerBanks[l.bankOwner];if(!u)continue;
    if(l.status==='active'&&now>=Number(l.due||0)){
      const total=loanBaseDue(l);l.totalDue=total;l.unpaid=Math.max(0,Math.floor(Number(l.unpaid)||total));
      let debt=l.unpaid,paidNow=0;
      const take=(field)=>{const x=Math.min(debt,Math.max(0,Math.floor(Number(u[field])||0)));if(x>0){u[field]-=x;debt-=x;paidNow+=x}};
      take('cash');take('bank');
      if(b&&paidNow>0)b.capital=(Number(b.capital)||0)+paidNow;
      l.paid=(Number(l.paid)||0)+paidNow;l.unpaid=Math.max(0,debt);l.lastPaymentAt=paidNow?now:(l.lastPaymentAt||0);l.lastPaymentSource=paidNow?'due_auto':l.lastPaymentSource;
      if(l.unpaid<=0){l.status='repaid';l.repaidAt=now;notify(u,'loan',`Laen #${l.id} tasuti tähtajal automaatselt sinu raha arvelt (${paidNow} €).`);continue}
      l.status='overdue';l.overdueAt=now;l.lastLateFeeAt=now;u.rep=(u.rep||0)-25;
      notify(u,'loan',`Laen #${l.id} läks võlgnevusse. Tasumata ${l.unpaid} €. Edaspidi suunatakse kogu palk ja äritulu automaatselt võla katteks ning lisandub viivis.`);
      if(b){const owner=byId(l.bankOwner);if(owner)notify(owner,'loan',`${u.name} laen #${l.id} läks võlgnevusse. Tasumata ${l.unpaid} €.`)}
    }
    if(l.status==='overdue'&&Number(l.unpaid||0)>0){
      const last=Math.max(Number(l.lastLateFeeAt||l.overdueAt||l.due||now),0),days=Math.floor((now-last)/day);if(days<=0)continue;
      const daily=clamp(Number(db.settings.loanLateFeeDaily??.01),0,.10),capRate=clamp(Number(db.settings.loanLateFeeCap??.50),0,5),base=loanBaseDue(l),cap=Math.floor(base*capRate),already=Math.max(0,Math.floor(Number(l.lateFeeAdded)||0)),room=Math.max(0,cap-already);
      let fee=0;
      if(room>0&&daily>0){let debt=Math.max(0,Math.floor(Number(l.unpaid)||0));for(let i=0;i<days&&fee<room;i++){const add=Math.max(1,Math.floor(debt*daily));const actual=Math.min(add,room-fee);fee+=actual;debt+=actual}}
      if(fee>0){l.unpaid+=fee;l.lateFeeAdded=already+fee;notify(u,'loan',`Laen #${l.id}: lisandus ${fee} € viivist. Tasumata kokku ${Math.floor(l.unpaid)} €.`)}
      l.lastLateFeeAt=last+days*day;
    }
  }
  saveSoon();
}

function gangForUser(userId){return Object.values(db.gangs||{}).find(g=>(g.members||[]).includes(userId)||g.leader===userId)||null}
app.post('/api/gang/create',auth,(req,res)=>{const u=req.user;if(u.gangId||gangForUser(u.id))return res.status(400).json({error:'Saad olla ainult ühes kambas. Lahku enne olemasolevast kambast.'});const name=String(req.body.name||'').trim().slice(0,24),password=String(req.body.password||'');if(name.length<3||password.length<4)return res.status(400).json({error:'Nimi/parool liiga lühike.'});const id=crypto.randomUUID(),h=hpw(password);db.gangs[id]={id,name,leader:u.id,assistants:[],members:[u.id],fund:0,points:0,weapons:{},donations:{},attackStats:{},attackWins:{},attackLosses:{},attackDailyDate:estoniaDateKey(),attackHistory:[],rewards:[],log:[],...h};u.gangId=id;ok(res,u,{message:'Kamp loodud.'})});
app.post('/api/gang/join',auth,(req,res)=>{const u=req.user,g=db.gangs[req.body.id];if(!g||!checkPw(req.body.password||'',g.salt,g.hash))return res.status(400).json({error:'Vale kamp/parool.'});if(u.gangId||gangForUser(u.id))return res.status(400).json({error:'Saad olla ainult ühes kambas. Lahku enne olemasolevast kambast.'});g.members=[...new Set(g.members||[])];if(!g.members.includes(u.id))g.members.push(u.id);u.gangId=g.id;ok(res,u,{message:'Liitusid kambaga.'})});
app.get('/api/gangs',auth,(req,res)=>res.json({gangs:Object.values(db.gangs).map(g=>({id:g.id,name:g.name,leader:byId(g.leader)?.name||'?',members:new Set(g.members||[]).size,points:g.points,fund:g.fund}))}));
app.post('/api/gang/donate',auth,(req,res)=>{const u=req.user,g=db.gangs[u.gangId],a=Math.floor(+req.body.amount||0);if(!g||a<=0||a>u.cash)return res.status(400).json({error:'Vigane summa.'});u.cash-=a;g.fund+=a;g.donations=g.donations||{};g.donations[u.id]=(g.donations[u.id]||0)+a;g.log=g.log||[];g.log.push({time:Date.now(),type:'donation',userId:u.id,amount:a});ok(res,u,{message:`Annetasid ${a} €.`})});
app.post('/api/gang/leave',auth,(req,res)=>{const u=req.user,g=db.gangs[u.gangId]||gangForUser(u.id);if(!g)return res.status(400).json({error:'Sa pole kambas.'});g.members=[...new Set(g.members||[])];if(g.leader===u.id){const others=g.members.filter(id=>id!==u.id);if(others.length)return res.status(400).json({error:'Kamba juht peab enne määrama uue juhi või eemaldama teised liikmed.'});delete db.gangs[g.id];u.gangId=null;return ok(res,u,{message:'Lahkusid ja tühi kamp suleti.'})}g.members=g.members.filter(id=>id!==u.id);g.assistants=(g.assistants||[]).filter(id=>id!==u.id);u.gangId=null;g.log=g.log||[];g.log.push({time:Date.now(),type:'leave',userId:u.id});ok(res,u,{message:'Lahkusid kambast.'})});
app.get('/api/gang/me',auth,(req,res)=>{const g=db.gangs[req.user.gangId];if(!g)return res.json({gang:null});ensureGangDay(g);const canHistory=g.leader===req.user.id;res.json({gang:{id:g.id,name:g.name,fund:g.fund,points:g.points,leader:g.leader,assistants:g.assistants||[],weapons:g.weapons||{},score:((g.weapons?.attack||0)+(g.weapons?.defense||0))*Math.max(0,Number(db.settings.gangWeaponScore||5000000)),combat:{atk:(g.weapons?.attack||0)*(db.settings.gangWeaponPower||1000000)+(g.weapons?.defense||0)*Math.floor((db.settings.gangWeaponPower||1000000)*.5),def:(g.weapons?.defense||0)*(db.settings.gangWeaponPower||1000000)+(g.weapons?.attack||0)*Math.floor((db.settings.gangWeaponPower||1000000)*.5)},members:[...new Set(g.members||[])].map(id=>{const u=byId(id);return{id,name:u?.name||'?',role:id===g.leader?'Juht':(g.assistants||[]).includes(id)?'Abijuht':'Liige',donated:(g.donations||{})[id]||0,attacks:(g.attackStats||{})[id]||0,wins:(g.attackWins||{})[id]||0,losses:(g.attackLosses||{})[id]||0}}),rewards:(g.rewards||[]).slice(-100),attackDailyDate:g.attackDailyDate,attackHistory:canHistory?(g.attackHistory||[]).slice(-14):[],canViewAttackHistory:canHistory,log:(g.log||[]).slice(-100)}})});
app.post('/api/gang/reward',auth,(req,res)=>{const u=req.user,g=db.gangs[u.gangId],t=resolveUser(req.body.targetName||req.body.targetId),amount=Math.max(1,Math.floor(+req.body.amount||0)),reason=String(req.body.reason||'Kamba preemia').slice(0,120);if(!g||!t||!g.members.includes(t.id))return res.status(400).json({error:'Vigane kamp/liige.'});if(!(g.leader===u.id||(g.assistants||[]).includes(u.id)))return res.status(403).json({error:'Ainult juht/abijuht.'});if(g.fund<amount)return res.status(400).json({error:'Kamba kassas pole piisavalt.'});g.fund-=amount;creditCashWithDebt(t,amount,'gang_reward');g.rewards=g.rewards||[];g.rewards.push({time:Date.now(),from:u.id,to:t.id,amount,reason});g.log=g.log||[];g.log.push({time:Date.now(),type:'reward',from:u.id,to:t.id,amount,reason});notify(t,'gang',`Kamp maksis sulle ${amount} € preemiat: ${reason}`);ok(res,u,{message:'Preemia makstud.'})});
app.get('/api/gang/market',auth,(req,res)=>{const g=db.gangs[req.user.gangId];if(!g)return res.status(404).json({error:'Kampi pole.'});const price=Math.floor((db.settings.gangWeaponPrice||25000000)*market()),power=Math.floor(db.settings.gangWeaponPower||1000000),weaponScore=Math.floor(db.settings.gangWeaponScore||5000000);res.json({points:g.points||0,fund:g.fund||0,weapons:g.weapons||{},items:[{id:'attack',name:'Kamba ründerelv',points:1,price,atk:power,def:Math.floor(power*.5),score:weaponScore},{id:'defense',name:'Kamba kaitserelv',points:1,price,atk:Math.floor(power*.5),def:power,score:weaponScore}]})});
app.post('/api/gang/weapon-buy',auth,(req,res)=>{const u=req.user,g=db.gangs[u.gangId],type=String(req.body.type||''),q=clamp(Math.floor(+req.body.q||1),1,10000);if(!g||!['attack','defense'].includes(type))return res.status(400).json({error:'Vigane kamp/relv.'});if(!(g.leader===u.id||(g.assistants||[]).includes(u.id)))return res.status(403).json({error:'Ainult juht/abijuht saab kamba relvi osta.'});const pointCost=q,unit=Math.floor((db.settings.gangWeaponPrice||25000000)*market()),cost=unit*q;if((g.points||0)<pointCost)return res.status(400).json({error:`Vaja ${pointCost} kamba punkti.`});if((g.fund||0)<cost)return res.status(400).json({error:`Kamba kassas vaja ${cost} €.`});g.points-=pointCost;g.fund-=cost;g.weapons=g.weapons||{};g.weapons[type]=(g.weapons[type]||0)+q;gameIncome(Math.floor(cost*(db.settings.marketFee||.03)),'gang_weapon_fee',u);g.log=g.log||[];g.log.push({time:Date.now(),type:'weapon_buy',userId:u.id,weapon:type,q,cost,points:pointCost});ok(res,u,{message:`Kamp ostis ${q} relva. -${pointCost} punkti, -${cost} €.`})});
app.get('/api/lottery',auth,(req,res)=>{const L=db.settings.lottery,buyers=Object.entries(L.tickets||{}).map(([id,q])=>({id,name:byId(id)?.name||'Tundmatu',tickets:q})).sort((a,b)=>b.tickets-a.tickets);const totalTickets=buyers.reduce((n,x)=>n+x.tickets,0);res.json({...L,prize:Number(L.pot||0),totalTickets,buyers,remainingTickets:Math.max(0,Number(L.maxTickets||0)-totalTickets)})});
function createLottery(u,x={}){const L=db.settings.lottery;if(L.active&&Date.now()<Number(L.drawAt||0))throw new Error('Üks loos on juba aktiivne.');const ticketPrice=Math.floor(Number(x.ticketPrice)||0),maxTickets=Math.floor(Number(x.maxTickets)||0),minutes=Math.floor(Number(x.minutes)||0);if(ticketPrice<1||maxTickets<1||minutes<1)throw new Error('Pileti hind, piletite arv ja kestus peavad olema vähemalt 1.');if(!Number.isSafeInteger(ticketPrice)||!Number.isSafeInteger(maxTickets)||ticketPrice>Number.MAX_SAFE_INTEGER/maxTickets)throw new Error('Loosi numbrid on liiga suured.');Object.assign(L,{active:true,title:String(x.title||`${u.name} loos`).slice(0,50),ticketPrice,maxTickets,pot:0,bankShare:0,organizerId:u.id,organizerName:u.name,drawAt:Date.now()+Math.min(minutes,43200)*60000,tickets:{},winner:null});saveSoon();io.emit('settings',db.settings);return L}
app.post('/api/lottery/create',auth,(req,res)=>{try{createLottery(req.user,req.body||{});ok(res,req.user,{message:'Loos loodud.'})}catch(e){res.status(400).json({error:e.message})}});
app.post('/api/lottery/buy',auth,(req,res)=>{const u=req.user,L=db.settings.lottery,q=Math.floor(Number(req.body.q));if(!Number.isFinite(q)||q<1)return res.status(400).json({error:'Vali vähemalt 1 pilet.'});if(!L.active||Date.now()>=L.drawAt)return res.status(400).json({error:'Loos pole aktiivne.'});const sold=Object.values(L.tickets||{}).reduce((n,v)=>n+Number(v||0),0);if(sold+q>Number(L.maxTickets||0))return res.status(400).json({error:`Alles on ${Math.max(0,Number(L.maxTickets||0)-sold)} piletit.`});const cost=q*Number(L.ticketPrice||0);if(!Number.isSafeInteger(cost)||cost<=0)return res.status(400).json({error:'Piletisumma on liiga suur.'});if(u.cash<cost)return res.status(400).json({error:'Raha puudub.'});u.cash-=cost;const bankPart=Math.floor(cost*.10),potPart=cost-bankPart;gameIncome(bankPart,'lottery_ticket_share',u);L.pot=Number(L.pot||0)+potPart;L.bankShare=Number(L.bankShare||0)+bankPart;L.tickets[u.id]=Number(L.tickets[u.id]||0)+q;ok(res,u,{message:`Ostsid ${q} piletit. Võidufondi läks ${potPart} € ja Keskpanka ${bankPart} €.`})});
function drawLottery(){const L=db.settings.lottery;if(!L.active||Date.now()<L.drawAt)return;const entries=Object.entries(L.tickets||{}).map(([id,q])=>[id,Math.max(0,Math.floor(Number(q)||0))]).filter(x=>x[1]>0);const total=entries.reduce((n,x)=>n+x[1],0);if(total>0){let pick=Math.floor(Math.random()*total)+1,winnerId=null;for(const [id,q] of entries){pick-=q;if(pick<=0){winnerId=id;break}}const u=byId(winnerId);if(u){const prize=Math.max(0,Math.floor(Number(L.pot||0))),c=creditBankFirst(u,prize);L.winner=u.name;notify(u,'lottery',`Võitsid loosiga ${prize} €. Panka ${c.toBank} €${c.toCash?`, sularahasse ${c.toCash} €`:''}.`)}}L.active=false;io.emit('settings',db.settings);saveSoon()}
app.post('/api/jail/bail',auth,(req,res)=>{const u=req.user;if(!u.jailedUntil||u.jailedUntil<=Date.now())return res.status(400).json({error:'Sa pole vanglas.'});const mins=Math.ceil((u.jailedUntil-Date.now())/60000),cost=Math.max(50000,mins*50000*(1+u.wanted/100));if(u.cash<cost)return res.status(400).json({error:`Kautsjon maksab ${Math.floor(cost)} €.`});u.cash-=Math.floor(cost);u.jailedUntil=0;u.wanted=Math.max(0,u.wanted-10);ok(res,u,{message:`Kautsjon ${Math.floor(cost)} € makstud.`})});
app.post('/api/insurance/buy',auth,(req,res)=>{const u=req.user,days=clamp(Math.floor(+req.body.days||7),1,30),tier=String(req.body.tier||'standard'),cfg=db.settings.insuranceTiers[tier]||db.settings.insuranceTiers.standard,cost=insuranceQuote(u,tier,days);if(u.cash<cost)return res.status(400).json({error:`Kindlustus maksab ${cost} €.`});u.cash-=cost;gameIncome(cost,'insurance',u);u.insurance={active:true,until:Date.now()+days*86400000,coverage:cfg.coverage,deductible:cfg.deductible,tier};ok(res,u,{message:`${tier} kindlustus ${days} päevaks aktiveeritud. Katvus ${Math.round(cfg.coverage*100)}%.`})});
app.post('/api/operation',auth,(req,res)=>{const u=req.user,o=SECRET_OPS.find(x=>x.id===req.body.id);if(!freeToAct(u))return res.status(403).json({error:'Oled vanglas.'});if(!o||u.level<o.needLevel||u.rep<o.repNeed)return res.status(400).json({error:'Operatsiooni nõuded pole täidetud.'});if(u.cash<o.cost)return res.status(400).json({error:'Ettevalmistusraha puudub.'});if(!needTurns(u,o.turns))return res.status(400).json({error:`Vaja ${o.turns} käiku.`});u.cash-=o.cost;const cb=combat(u),risk=clamp(o.risk-cb.atk/(cb.atk+2e8),.08,.70);if(Math.random()<risk){u.wanted=Math.max(0,(u.wanted||0)+8);u.rep=(u.rep||0)-3;if(Math.random()<.45)u.jailedUntil=Date.now()+(15+Math.floor(u.wanted/2))*60000;return ok(res,u,{message:'Salajane operatsioon ebaõnnestus.'})}const gain=rand(o.rewardMin,o.rewardMax);creditCashWithDebt(u,gain,'operation');u.stats.operations++;u.rep=(u.rep||0)+5;u.wanted=Math.max(0,(u.wanted||0)+5);ok(res,u,{message:`Operatsioon õnnestus: +${gain} €.`})});
function expireBounties(now=Date.now()){for(const b of Object.values(db.bounties||{})){if(b.active&&Number(b.expiresAt||0)>0&&now>=Number(b.expiresAt)){b.active=false;b.expiredAt=now}}}
app.get('/api/bounties',auth,(req,res)=>{expireBounties();res.json({bounties:Object.values(db.bounties).filter(x=>x.active).map(x=>({...x,targetName:byId(x.targetId)?.name||'?',posterName:byId(x.posterId)?.name||'?'}))});});
app.post('/api/bounty',auth,(req,res)=>{const u=req.user,t=resolveUser(req.body.targetName||req.body.targetId),amount=Math.floor(+req.body.amount||0),requiredHits=clamp(Math.floor(+req.body.requiredHits||1),1,1000),minutes=clamp(Math.floor(+req.body.minutes||4320),1,43200);if(!t||t.id===u.id||amount<100000)return res.status(400).json({error:'Vigane siht või min bounty 100 000 €.'});if(t.role==='owner')return res.status(403).json({error:'Ownerile bounty’t panna ei saa.'});if(u.cash<amount)return res.status(400).json({error:'Raha puudub.'});u.cash-=amount;const fee=Math.floor(amount*(db.settings.bountyFee||.25)),reward=amount-fee;gameIncome(fee,'bounty_fee',u);const id=String(db.nextIds.bounty++);db.bounties[id]={id,posterId:u.id,targetId:t.id,amount,fee,reward,requiredHits,progress:{},expiresAt:Date.now()+minutes*60000,active:true,createdAt:Date.now()};notify(t,'bounty',`${u.name} pani sinu peale bounty. Preemia ${reward} €, tingimus ${requiredHits} edukat rünnakut.`);ok(res,u,{message:`Bounty loodud ${minutes} minutiks. Teenustasu ${fee} €, preemia ${reward} €.`})});
app.get('/api/turn-shop',auth,(req,res)=>res.json({packs:[],orders:[],disabled:true}));
app.post('/api/turn-shop/order',auth,(req,res)=>res.status(410).json({error:'Käigupakkide müük on ajutiselt eemaldatud.'}));
app.post('/api/privacy',auth,(req,res)=>res.status(410).json({error:'Profiili privaatsuse seaded on eemaldatud.'}));
app.get('/api/stats',auth,(req,res)=>{const us=Object.values(db.users).filter(x=>!x.banned);const top=(f)=>us.map(u=>({name:u.name,value:f(u)})).sort((a,b)=>b.value-a.value).slice(0,20);res.json({score:top(score),cash:top(netWorth),wins:top(u=>u.stats.wins),crimes:top(u=>u.stats.crimes),rep:top(u=>u.rep),wanted:top(u=>u.wanted)})});
app.get('/api/admin/users',auth,admin,(req,res)=>res.json({users:Object.values(db.users).map(u=>pub(u))}));
app.post('/api/admin/impersonate',auth,admin,(req,res)=>{if(req.user.role!=='owner')return res.status(403).json({error:'Ainult OWNER saab kasutajate kontodesse siseneda.'});const t=byId(req.body.id);if(!t)return res.status(404).json({error:'Mängijat pole.'});if(t.role==='owner')return res.status(400).json({error:'Oled juba OWNER kontol.'});audit(req.user,'owner_impersonate',t.id,{target:t.name});secLog('owner_impersonate',req,req.user,{targetUserId:t.id,targetName:t.name});saveSoon();return res.json({ok:true,token:token(t.name),user:pub(t),message:`Sisened kasutaja ${t.name} kontosse.`})});
app.get('/api/admin/casino',auth,admin,(req,res)=>{
  const rows=Object.values(db.users).map(u=>{const st=u.stats||{},w=Math.max(0,Number(st.slotWagered)||0),won=Math.max(0,Number(st.slotWon)||0),spins=Math.max(0,Number(st.slotSpins)||0);return{userId:u.id,name:u.name,npc:!!u.npc,spins,wagered:w,won,lost:Math.max(0,w-won),net:won-w}}).filter(x=>x.spins>0||x.wagered>0).sort((a,b)=>b.wagered-a.wagered);
  res.json({summary:{spins:rows.reduce((a,x)=>a+x.spins,0),wagered:rows.reduce((a,x)=>a+x.wagered,0),won:rows.reduce((a,x)=>a+x.won,0)},players:rows,history:(db.casinoHistory||[]).slice(0,500)});
});
app.get('/api/admin/user-details/:id',auth,admin,(req,res)=>{const u=byId(req.params.id);if(!u)return res.status(404).json({error:'Mängijat pole.'});refresh(u);const g=u.gangId&&db.gangs[u.gangId];const activeLoans=Object.values(db.loans||{}).filter(x=>x.borrower===u.id&&['active','overdue'].includes(x.status)).map(x=>({id:x.id,principal:x.principal||0,totalDue:loanBaseDue(x),unpaid:x.status==='overdue'?Number(x.unpaid||0):loanBaseDue(x),status:x.status,rate:x.rate||0,due:x.due||0,lateFeeAdded:x.lateFeeAdded||0,bankOwner:x.bankOwner||'',createdAt:x.createdAt||0}));const weapons=Object.entries(u.weapons||{}).filter(([,q])=>Number(q)>0).map(([i,q])=>({index:Number(i),name:WEAPONS[i]?.name||('Relv '+i),qty:Number(q)||0,unitPrice:weaponPrice(i),atk:WEAPONS[i]?.atk||0,def:WEAPONS[i]?.def||0,score:WEAPONS[i]?.score||0}));const businesses=Object.entries(u.businesses||{}).filter(([,lvl])=>Number(lvl)>0).map(([id,lvl])=>({id,name:BIZ.find(x=>x.id===id)?.name||id,level:Number(lvl)||0,workers:Number(u.businessWorkers?.[id]||0),project:u.businessProjects?.[id]||null}));res.json({user:{id:u.id,name:u.name,email:u.email||'',role:u.role,banned:!!u.banned,vip:!!u.vip,vipUntil:u.vipUntil||0,cash:u.cash||0,bank:u.bank||0,bankLimit:bankLimit(u),turns:u.turns||0,hp:u.hp||0,level:u.level||1,xp:u.xp||0,xpNeed:Math.max(50,50*Math.pow(Math.max(1,u.level||1),2)),score:score(u),netWorth:netWorth(u),rep:u.rep||0,wanted:u.wanted||0,education:u.education||0,educationName:EDU[u.education]?.name||'Puudub',educationProgress:u.educationProgress||0,mafia:u.mafia||0,guards:u.guards||0,mafiaLevel:u.mafiaLevel||1,securityLevel:u.securityLevel||1,propertyLevel:u.propertyLevel||0,propertyName:PROPERTY_NAMES[u.propertyLevel]||('Kinnisvara '+u.propertyLevel),combat:combat(u),crypto:u.crypto||0,city:u.city||'',jobId:u.jobId||null,jobName:jobFor(u)?.name||null,jobPay:jobFor(u)?.pay||0,lastSalaryAt:u.lastSalaryAt||0,nextSalaryAt:jobFor(u)?(u.lastSalaryAt||Date.now())+SALARY_INTERVAL:null,carLicense:u.carLicense||0,cars:u.cars||[],weapons,businesses,spies:u.spies||{},intelLevel:u.intelLevel||0,gangId:u.gangId||null,gangName:g?.name||null,insurance:u.insurance||{},stats:u.stats||{},bodyguard:u.bodyguard||null,bodyguardUntil:u.bodyguardUntil||0,guardingClient:u.guardingClient||null,guardingUntil:u.guardingUntil||0,jailedUntil:u.jailedUntil||0,maintenanceDue:u.maintenanceDue||0,createdAt:u.createdAt||0,lastActive:u.lastActive||0,lastLoginAt:u.lastLoginAt||0,lastIp:u.lastIp||'',lastUserAgent:u.lastUserAgent||'',activeLoans}})});
app.post('/api/admin/user',auth,admin,(req,res)=>{const t=byId(req.body.id),a=req.body.action,v=Number(req.body.value)||0;if(!t)return res.status(404).json({error:'Mängijat pole.'});if(t.role==='owner'&&a==='ban')return res.status(400).json({error:'Ownerit ei saa bannida.'});if(t.role==='owner'&&req.user.role!=='owner')return res.status(403).json({error:'Ownerit muuta ei saa.'});const map={cash:'cash',bank:'bank',turns:'turns',mafia:'mafia',guards:'guards',mafiaLevel:'mafiaLevel',securityLevel:'securityLevel',propertyLevel:'propertyLevel',education:'education',crypto:'crypto',wanted:'wanted',rep:'rep',intelLevel:'intelLevel'};if(map[a]){let nv=Math.floor(v);if(!['rep'].includes(a))nv=Math.max(0,nv);if(['mafiaLevel','securityLevel'].includes(a))nv=Math.max(1,nv);if(a==='bank')nv=Math.min(nv,bankLimit(t));t[map[a]]=nv;}else if(a==='vip')t.vip=!t.vip;else if(a==='ban')t.banned=!t.banned;else if(a==='admin'&&req.user.role==='owner'&&t.role!=='owner')t.role=t.role==='admin'?'player':'admin';else return res.status(400).json({error:'Vigane tegevus.'});audit(req.user,'user_change',t.id,{action:a,value:v});saveNow();io.to('user:'+t.id).emit('toast','Admin muutis sinu kontot.');res.json({ok:true})});
app.post('/api/admin/clear-loans',auth,admin,(req,res)=>{const t=byId(req.body.id);if(!t)return res.status(404).json({error:'Mängijat pole.'});if(t.role==='owner'&&req.user.role!=='owner')return res.status(403).json({error:'Ownerit muuta ei saa.'});let count=0;for(const l of Object.values(db.loans||{})){if(l.borrower===t.id&&['active','overdue'].includes(l.status)){l.status='admin_cleared';l.unpaid=0;l.clearedAt=Date.now();l.clearedBy=req.user.id;count++}}audit(req.user,'clear_user_loans',t.id,{count});saveNow();io.to('user:'+t.id).emit('toast','Admin eemaldas sinu aktiivsed laenud.');res.json({ok:true,count})});
app.get('/api/admin/security',auth,admin,(req,res)=>{
 const groups={};for(const u of Object.values(db.users)){if(!u.lastIp)continue;(groups[u.lastIp]??=[]).push({id:u.id,name:u.name,lastLoginAt:u.lastLoginAt})}
 const sharedIps=Object.entries(groups).filter(([,a])=>a.length>1).map(([ip,users])=>({ip,users}));
 res.json({logs:db.securityLogs.slice(0,300),sharedIps,resetRequests:Object.values(db.resetRequests).filter(x=>x.status==='pending')})
});
app.post('/api/admin/password-reset',auth,admin,(req,res)=>{
 let t=byId(req.body.id),nw=String(req.body.newPassword||'');if(!t)return res.status(404).json({error:'Mängijat pole.'});if(t.role==='owner'&&req.user.role!=='owner')return res.status(403).json({error:'Ownerit muuta ei saa.'});if(nw.length<10)return res.status(400).json({error:'Ajutine parool peab olema vähemalt 10 märki.'});
 let h=hpw(nw);t.salt=h.salt;t.hash=h.hash;t.sessionVersion=(t.sessionVersion||1)+1;t.lockedUntil=0;t.failedLogins=0;if(db.resetRequests[t.id])db.resetRequests[t.id].status='done';secLog('admin_password_reset',req,t,{actor:req.user.name});saveNow();res.json({ok:true})
});


app.post('/api/bodyguard/offer',auth,(req,res)=>{const u=req.user,t=resolveUser(req.body.targetName||req.body.targetId),amount=Math.max(100000,Math.floor(+req.body.amount||0)),hours=clamp(Math.floor(+req.body.hours||24),1,168);if(!t||t.id===u.id)return res.status(400).json({error:'Vigane ihukaitsja.'});if(t.role==='owner')return res.status(403).json({error:'Owner ei saa olla ihukaitsja.'});if(u.bodyguard&&u.bodyguardUntil>Date.now())return res.status(400).json({error:'Sul on juba aktiivne ihukaitsja.'});if(u.cash<amount)return res.status(400).json({error:'Raha puudub.'});const id=String(db.nextIds.bodyguardOffer++);db.bodyguardOffers[id]={id,clientId:u.id,guardId:t.id,amount,hours,status:'pending',createdAt:Date.now()};notify(t,'bodyguard',`${u.name} pakkus sulle ${amount} € ihukaitsja lepingut ${hours} tunniks.`,{offerId:id,clientId:u.id,amount,hours});saveSoon();res.json({ok:true,id,message:'Ihukaitsja pakkumine saadetud.'})});
app.get('/api/bodyguard',auth,(req,res)=>res.json({active:req.user.bodyguard&&req.user.bodyguardUntil>Date.now()?{guardId:req.user.bodyguard,guardName:byId(req.user.bodyguard)?.name||'?',until:req.user.bodyguardUntil,defensePct:db.settings.bodyguardDefensePct}:null,offers:Object.values(db.bodyguardOffers||{}).filter(x=>x.guardId===req.user.id&&x.status==='pending').map(x=>({...x,clientName:byId(x.clientId)?.name||'?'}))}));
app.post('/api/bodyguard/respond',auth,(req,res)=>{const id=String(req.body.id||'');db.bodyguardOffers=db.bodyguardOffers||{};let o=db.bodyguardOffers[id];const mine=x=>x&&String(x.guardId)===String(req.user.id)&&x.status==='pending';if(!mine(o)){o=Object.values(db.bodyguardOffers).filter(mine).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).find(x=>!id||String(x.id)===id)||null}if(!o){let n=(db.notifications||[]).find(n=>String(n.userId)===String(req.user.id)&&n.type==='bodyguard'&&String(n.data?.offerId||'')===id);if(!n)n=(db.notifications||[]).find(n=>String(n.userId)===String(req.user.id)&&n.type==='bodyguard'&&/pakkus sulle/i.test(String(n.text||'')));if(n){let clientId=n.data?.clientId||req.body.clientId,amount=Number(n.data?.amount||req.body.amount||0),hours=Number(n.data?.hours||req.body.hours||0);if(!clientId||!amount||!hours){const m=String(n.text||'').match(/^(.+?) pakkus sulle ([0-9 .]+) € ihukaitsja lepingut ([0-9]+) tunniks\.?$/i);if(m){const client=resolveUser(m[1]);clientId=client?.id;amount=Number(m[2].replace(/[ .]/g,''));hours=Number(m[3])}}if(clientId&&amount>0&&hours>0){const recoveredId=id||String(n.data?.offerId||db.nextIds.bodyguardOffer++);o={id:recoveredId,clientId,guardId:req.user.id,amount,hours,status:'pending',createdAt:n.time||Date.now()};db.bodyguardOffers[recoveredId]=o}}}if(!mine(o))return res.status(400).json({error:'Aktiivset ihukaitsja pakkumist ei leitud. Palu saatjal teha uus pakkumine.'});const accept=!!req.body.accept,client=byId(o.clientId);if(!accept){o.status='rejected';o.respondedAt=Date.now();if(client)notify(client,'bodyguard',`${req.user.name} lükkas ihukaitsja pakkumise tagasi.`);saveSoon();return res.json({ok:true,message:'Pakkumine tagasi lükatud.'})}if(!client)return res.status(400).json({error:'Pakkumise saatjat ei leitud.'});if(client.cash<o.amount)return res.status(400).json({error:'Pakkujal pole enam piisavalt raha.'});if(req.user.guardingUntil>Date.now())return res.status(400).json({error:'Oled juba kellegi aktiivne ihukaitsja.'});if(client.bodyguard&&client.bodyguardUntil>Date.now())return res.status(400).json({error:'Pakkujal on juba ihukaitsja.'});client.cash-=o.amount;const game=Math.floor(o.amount*clamp(Number(db.settings.bodyguardGameFee||.5),0,1)),guardPay=o.amount-game;gameIncome(game,'bodyguard_fee',client);creditCashWithDebt(req.user,guardPay,'bodyguard_pay');client.bodyguard=req.user.id;client.bodyguardUntil=Date.now()+o.hours*3600000;req.user.guardingClient=client.id;req.user.guardingUntil=client.bodyguardUntil;o.status='accepted';o.respondedAt=Date.now();notify(client,'bodyguard',`${req.user.name} on nüüd sinu ihukaitsja ${o.hours} tunniks. Kaitseboonus ${Math.round(db.settings.bodyguardDefensePct*100)}% tema Defense'ist.`);saveSoon();res.json({ok:true,user:pub(req.user),message:`Leping aktiveeritud. Sulle maksti ${guardPay} €.`})});
app.get('/api/profile/:id',auth,(req,res)=>{const t=byId(req.params.id);if(!t||t.banned)return res.status(404).json({error:'Mängijat pole.'});const g=t.gangId&&db.gangs[t.gangId];res.json({profile:{id:t.id,name:t.name,role:t.role,vip:t.vip,level:t.level,score:score(t),cash:Number(t.cash)||0,rep:t.rep,wanted:t.wanted,city:t.city,educationName:EDU[t.education]?.name||'Puudub',propertyLevel:t.propertyLevel,propertyName:PROPERTY_NAMES[t.propertyLevel]||'Puudub',businessCount:Object.keys(t.businesses||{}).length,gangName:g?.name||null,wins:t.stats?.wins||0,losses:t.stats?.losses||0,jailed:!!(t.jailedUntil>Date.now()),bodyguard:!!(t.bodyguard&&t.bodyguardUntil>Date.now()),joinedAt:t.createdAt,lastActive:t.lastActive}})});
app.get('/api/notifications',auth,(req,res)=>{const rows=db.notifications.filter(n=>n.userId===req.user.id).slice(0,150);for(const n of rows)n.read=true;saveSoon();res.json({notifications:rows})});
app.get('/api/messages',auth,(req,res)=>res.json({messages:db.messages.filter(m=>m.fromId===req.user.id||m.toId===req.user.id).slice(-300)}));
app.post('/api/messages',auth,(req,res)=>{const to=resolveUser(req.body.toName||req.body.toId),text=String(req.body.text||'').trim().slice(0,1200);if(!to||!text)return res.status(400).json({error:'Vigane saaja või sõnum.'});const m={id:String(db.nextIds.message++),fromId:req.user.id,toId:to.id,from:req.user.name,to:to.name,text,time:Date.now()};db.messages.push(m);db.messages=db.messages.slice(-5000);notify(to,'message',`Uus sõnum mängijalt ${req.user.name}.`,{messageId:m.id});ok(res,req.user,{message:'Sõnum saadetud.'})});
app.post('/api/spy/hire',auth,(req,res)=>{const u=req.user,type=String(req.body.type||''),n=clamp(Math.floor(+req.body.n||1),1,1000),cfg=SPY_TYPES[type];if(!cfg)return res.status(400).json({error:'Vigane spioon.'});const unit=spyPrice(type),cost=unit*n,turns=n*(cfg.hireTurns||5);if(u.cash<cost)return res.status(400).json({error:`Raha puudub. Hind ${cost} €.`});if(!needTurns(u,turns))return res.status(400).json({error:`Vaja ${turns} käiku.`});u.cash-=cost;gameIncome(cost,'spy_hire',u);u.spies=u.spies||{finnish:0,ukrainian:0,russian:0};u.spies[type]=Number(u.spies[type]||0)+n;saveSoon();ok(res,u,{message:`Palkasid ${n} × ${cfg.name}. Maksid ${cost} € ja ${turns} käiku.`})});
app.post('/api/spy',auth,(req,res)=>{const u=req.user,t=resolveUser(req.body.targetName||req.body.targetId),type=String(req.body.type||'finnish');if(!t||t.id===u.id)return res.status(400).json({error:'Vigane siht.'});if(t.role==='owner')return res.status(403).json({error:'Ownerit ei saa spioneerida.'});if(!freeToAct(u))return res.status(403).json({error:'Oled vanglas.'});const last=u.lastSpyAt[t.id]||0;if(Date.now()-last<15*60000)return res.status(429).json({error:'Sama mängijat saab spioneerida 1× 15 minuti jooksul.'});if(!(u.spies[type]>0))return res.status(400).json({error:'Seda tüüpi spiooni pole.'});const spyTurns=25;if(!needTurns(u,spyTurns))return res.status(400).json({error:'Spioneerimiseks on vaja 25 käiku.'});u.spies[type]=Math.max(0,Number(u.spies[type]||0)-1);u.lastSpyAt[t.id]=Date.now();const skill=SPY_TYPES[type]?.skill||.55,def=Math.min(.55,(t.guards||0)/100000+(t.securityLevel||1)/1200),success=Math.random()<clamp(skill-def,.12,.9);if(!success){if(Math.random()<.6)notify(t,'spy',`${u.name} proovis sind spioneerida, kuid jäi vahele.`);return ok(res,u,{message:'Spionaaž ebaõnnestus.'})}const intel={cash:t.cash,bankRange:t.bank<1e6?'alla 1M':t.bank<100e6?'1M–100M':t.bank<1e9?'100M–1B':'üle 1B',mafia:t.mafia,guards:t.guards,weapons:Object.values(t.weapons||{}).reduce((a,b)=>a+b,0),combat:combat(t),businesses:Object.keys(t.businesses||{}).length};ok(res,u,{message:'Spionaaž õnnestus.',intel})});
app.post('/api/jail/bail-other',auth,(req,res)=>{const u=req.user,t=resolveUser(req.body.targetName||req.body.targetId);if(!t||!t.jailedUntil||t.jailedUntil<=Date.now())return res.status(400).json({error:'Mängija pole vanglas.'});const mins=Math.ceil((t.jailedUntil-Date.now())/60000),cost=Math.floor(Math.max(50000,mins*50000*(1+t.wanted/100))*market());if(u.cash<cost)return res.status(400).json({error:`Kautsjon maksab ${cost} €.`});u.cash-=cost;gameIncome(cost,'bail',u);t.jailedUntil=0;t.wanted=Math.max(0,t.wanted-10);notify(t,'jail',`${u.name} maksis sinu kautsjoni ${cost} € ja vabastas sind.`);ok(res,u,{message:`Maksid ${t.name} kautsjoni ${cost} €.`})});
app.post('/api/business/workers',auth,(req,res)=>{const u=req.user,b=BIZ.find(x=>x.id===req.body.id),n=clamp(Math.floor(+req.body.n||1),1,1000);if(!b||(u.businesses[b.id]||0)<1)return res.status(400).json({error:'Firma puudub.'});const unit=Math.floor((db.settings.workerBasePrice||25000)*market()),cost=unit*n,turns=Math.max(5,n);if(u.cash<cost)return res.status(400).json({error:`Töötajad maksavad ${cost} €.`});if(!needTurns(u,turns))return res.status(400).json({error:`Vaja ${turns} käiku.`});u.cash-=cost;gameIncome(cost,'worker_hire',u);u.businessWorkers[b.id]=(u.businessWorkers[b.id]||0)+n;ok(res,u,{message:`${b.name}: +${n} töötajat.`})});
app.post('/api/business/project',auth,(req,res)=>{const u=req.user,b=BIZ.find(x=>x.id===req.body.id),lvl=b?(u.businesses[b.id]||0):0;if(!b||lvl<1)return res.status(400).json({error:'Firma puudub.'});if(!freeToAct(u))return res.status(403).json({error:'Oled vanglas.'});if((u.wanted||0)>=90)return res.status(403).json({error:'Wanted on liiga kõrge uue projekti alustamiseks.'});const cur=u.businessProjects[b.id];if(cur&&cur.endsAt>Date.now())return res.status(400).json({error:'Selle firma projekt juba käib.'});const list=(BUSINESS_PROJECTS[b.id]||[]).map(p=>projectCfg(b.id,p)),z=list.find(x=>x.id===String(req.body.projectId||''))||list[0];if(!z)return res.status(400).json({error:'Projekt puudub.'});const workers=u.businessWorkers[b.id]||0,assigned=clamp(Math.floor(+req.body.workers||z.workers),z.workers,workers||z.workers);if(workers<z.workers)return res.status(400).json({error:`Vaja vähemalt ${z.workers} töötajat.`});const cost=Math.floor(b.base*Math.max(1,lvl)*z.costMult*market());if(u.cash<cost)return res.status(400).json({error:`Projektikulu ${cost} €.`});if(!needTurns(u,z.turns))return res.status(400).json({error:`Vaja ${z.turns} käiku.`});u.cash-=cost;gameIncome(cost,'business_project_cost',u);u.businessProjects[b.id]={id:crypto.randomUUID(),projectId:z.id,name:z.name,startedAt:Date.now(),endsAt:Date.now()+z.hours*3600000,cost,reward:Math.floor(cost*z.rewardMult*(1+.04*Math.max(0,lvl-1))*(1+Math.min(.30,Math.max(0,assigned-z.workers)*.02))),workers:assigned};delete u.businessRejected[b.id+'|'+z.id];ok(res,u,{message:`${b.name}: ${z.name} käivitatud ${z.hours} tunniks. Algkulu ${cost} €, töötajaid ${assigned}.`})});
app.post('/api/business/project-reject',auth,(req,res)=>{const u=req.user,b=BIZ.find(x=>x.id===req.body.id),pid=String(req.body.projectId||'');if(!b||!pid)return res.status(400).json({error:'Vigane projekt.'});u.businessRejected=u.businessRejected||{};u.businessRejected[b.id+'|'+pid]=Date.now()+30*60000;ok(res,u,{message:'Projektist keeldutud. Pakkumine kaob 30 minutiks.'})});
app.post('/api/business/project-collect',auth,(req,res)=>{const u=req.user,b=BIZ.find(x=>x.id===req.body.id),p=b&&u.businessProjects[b.id];if(!p)return res.status(400).json({error:'Aktiivset projekti pole.'});if(Date.now()<p.endsAt)return res.status(400).json({error:'Projekt pole veel valmis.'});const taxRate=clamp(Number(db.settings.businessTax||.08),0,.9),gross=Math.floor(p.reward*market()),tax=Math.floor(gross*taxRate),net=gross-tax,d=creditBusinessWithDebt(u,net,'business_project');gameIncome(tax,'business_tax',u);delete u.businessProjects[b.id];ok(res,u,{message:`Projekt valmis: bruto ${gross} €, maks ${tax} €, kätte ${net} €${d.paid?` (võla katteks ${d.paid} €)`:''}.`})});
function cleanupGameBankRequests(now=Date.now()){const maxAge=7*86400000;for(const [id,r] of Object.entries(db.gameBank.loanRequests||{})){if(['pending','countered'].includes(r.status))continue;const t=Number(r.respondedAt||r.approvedAt||r.createdAt||0);if(t&&now-t>=maxAge)delete db.gameBank.loanRequests[id]}}
function gameBankPublicState(u){cleanupGameBankRequests();
  const requests=Object.values(db.gameBank.loanRequests||{}).filter(x=>x.userId===u.id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const loans=Object.values(db.gameBank.loans||{}).filter(x=>x.userId===u.id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const publicLoans=Object.values(db.gameBank.loans||{}).filter(x=>['active','overdue'].includes(x.status)&&Number(x.unpaid||0)>0).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(x=>({id:x.id,userName:byId(x.userId)?.name||'?',type:x.type,principal:x.principal||0,rate:x.rate||0,totalDue:x.totalDue||0,unpaid:x.unpaid||0,paid:x.paid||0,createdAt:x.createdAt||0,due:x.due||0,status:x.status,lateFeeAdded:x.lateFeeAdded||0,overdueAt:x.overdueAt||0}));
  const debtors=publicLoans.filter(x=>x.status==='overdue'&&Number(x.unpaid||0)>0);
  return{balance:Math.floor(Number(db.gameBank.balance)||0),turnsBalance:Math.max(0,Math.floor(db.gameBank.turnsBalance||0)),autoMoneyFund:Math.max(0,Math.floor(db.gameBank.autoMoneyFund||0)),autoTurnsFund:Math.max(0,Math.floor(db.gameBank.autoTurnsFund||0)),autoLoan:{...(db.gameBank.autoLoan||{})},requests,loans,publicLoans,debtors};
}
function activeGameBankLoansFor(u){return Object.values(db.gameBank?.loans||{}).filter(l=>l.userId===u.id&&['active','overdue'].includes(l.status)&&Number(l.unpaid||0)>0)}
function issueAutoGameBankLoan(u,type,amount){
  type=type==='turns'?'turns':'money';amount=Math.max(1,Math.floor(Number(amount)||0));const cfg=db.gameBank.autoLoan||{};
  if(!cfg.enabled)throw new Error('Automaatlaen pole hetkel aktiivne.');
  if(gameBankOverdueLoans(u).length)throw new Error('Sul on Keskpanga võlg üle tähtaja.');
  if(activeGameBankLoansFor(u).length)throw new Error('Sul on juba aktiivne Keskpanga laen. Uus taotlus vajab admini ülevaatust.');
  if(Object.values(db.gameBank.loanRequests||{}).some(x=>x.userId===u.id&&['pending','countered'].includes(x.status)))throw new Error('Sul on juba ootel Keskpanga taotlus.');
  const max=type==='money'?Math.max(0,Math.floor(Number(cfg.maxMoney)||0)):Math.max(0,Math.floor(Number(cfg.maxTurns)||0));if(amount>max)throw new Error(`Automaatlaenu maksimum on ${max}${type==='money'?' €':' käiku'}.`);
  const fundKey=type==='money'?'autoMoneyFund':'autoTurnsFund',fund=Math.max(0,Math.floor(Number(db.gameBank[fundKey])||0));if(amount>fund)throw new Error('Automaatlaenu fondis pole piisavalt vahendeid.');
  db.gameBank[fundKey]=fund-amount;if(type==='money')u.cash=(Number(u.cash)||0)+amount;else u.turns=(Number(u.turns)||0)+amount;
  const rate=clamp(Number(cfg.rate)||0,0,500),hours=clamp(Math.floor(Number(cfg.hours)||12),1,720),id=String(db.nextIds.gameBankLoan++),now=Date.now(),totalDue=Math.ceil(amount*(1+rate/100));
  db.gameBank.loans[id]={id,requestId:null,userId:u.id,type,principal:amount,rate,totalDue,unpaid:totalDue,paid:0,hours,createdAt:now,due:now+hours*3600000,status:'active',autoLoan:true};
  db.gameBank.log.unshift({time:now,type:type==='money'?'central_auto_loan_money':'central_auto_loan_turns',amount:-amount,userId:u.id,user:u.name});db.gameBank.log=db.gameBank.log.slice(0,3000);
  notify(u,'loan',`Automaatne Keskpanga ${type==='money'?'raha':'käigu'}laen väljastati: ${amount}${type==='money'?' €':' käiku'}, ${rate}%, ${hours}h.`);return db.gameBank.loans[id];
}
function issueGameBankLoan(r){
  const u=byId(r.userId);if(!u)throw new Error('Mängijat ei leitud.');if(gameBankOverdueLoans(u).length)throw new Error('Sul on Keskpanga võlg üle tähtaja. Uut Keskpanga laenu ei saa enne võla tasumist.');
  const amount=Math.max(1,Math.floor(Number(r.offerAmount??r.amount)||0)),rate=clamp(Number(r.offerRate??r.rate)||0,0,500),hours=clamp(Math.floor(Number(r.offerHours??r.hours)||24),1,720),type=r.type==='turns'?'turns':'money';
  if(type==='money'){
    if(amount>Math.max(0,Math.floor(db.gameBank.balance||0)))throw new Error('Keskpanga rahafondis pole piisavalt raha.');
    db.gameBank.balance-=amount;u.cash=(Number(u.cash)||0)+amount;
  }else{
    if(amount>Math.max(0,Math.floor(db.gameBank.turnsBalance||0)))throw new Error('Keskpanga käigufondis pole piisavalt käike.');
    db.gameBank.turnsBalance-=amount;u.turns=(Number(u.turns)||0)+amount;
  }
  const id=String(db.nextIds.gameBankLoan++),totalDue=Math.ceil(amount*(1+rate/100)),now=Date.now();
  db.gameBank.loans[id]={id,requestId:r.id,userId:u.id,type,principal:amount,rate,totalDue,unpaid:totalDue,paid:0,hours,createdAt:now,due:now+hours*3600000,status:'active'};
  r.status='approved';r.approvedAt=now;r.loanId=id;r.finalAmount=amount;r.finalRate=rate;r.finalHours=hours;
  db.gameBank.log.unshift({time:now,type:type==='money'?'central_loan_money':'central_loan_turns',amount:-amount,userId:u.id,user:u.name});db.gameBank.log=db.gameBank.log.slice(0,3000);
  notify(u,'loan',`Keskpanga ${type==='money'?'raha':'käigu'}laen kinnitati: ${amount}${type==='money'?' €':' käiku'}, intress ${rate}%, tähtaeg ${hours}h.`);
  return db.gameBank.loans[id];
}
app.get('/api/game-bank/public',auth,(req,res)=>res.json(gameBankPublicState(req.user)));
app.post('/api/game-bank/auto-request',auth,(req,res)=>{const u=req.user,type=req.body.type==='turns'?'turns':'money',amount=Math.max(1,Math.floor(Number(req.body.amount)||0));try{const loan=issueAutoGameBankLoan(u,type,amount);saveNow();return res.json({ok:true,message:`Automaatlaen väljastatud: ${amount}${type==='money'?' €':' käiku'}.`,loan,user:pub(u)})}catch(e){return res.status(400).json({error:e.message})}});
app.post('/api/game-bank/request-delete',auth,(req,res)=>{const r=db.gameBank.loanRequests[String(req.body.id||'')];if(!r||r.userId!==req.user.id)return res.status(404).json({error:'Taotlust ei leitud.'});if(['pending','countered'].includes(r.status))return res.status(400).json({error:'Aktiivset taotlust ei saa kustutada.'});delete db.gameBank.loanRequests[r.id];saveNow();res.json({ok:true,message:'Taotluse kirje eemaldatud.'})});
app.post('/api/game-bank/request',auth,(req,res)=>{const u=req.user;if(gameBankOverdueLoans(u).length)return res.status(403).json({error:'Sul on Keskpanga laen üle tähtaja. Uut laenu ei saa enne võla tasumist võtta.'});const type=req.body.type==='turns'?'turns':'money',amount=Math.max(1,Math.floor(Number(req.body.amount)||0)),rate=clamp(Number(req.body.rate)||0,0,500),hours=clamp(Math.floor(Number(req.body.hours)||24),1,720);if(Object.values(db.gameBank.loanRequests||{}).some(x=>x.userId===u.id&&['pending','countered'].includes(x.status)))return res.status(400).json({error:'Sul on juba ootel keskpanga laenutaotlus või vastupakkumine.'});const id=String(db.nextIds.gameBankRequest++);db.gameBank.loanRequests[id]={id,userId:u.id,type,amount,rate,hours,status:'pending',createdAt:Date.now()};for(const staff of Object.values(db.users).filter(x=>['owner','admin'].includes(x.role))) notify(staff,'admin',`${u.name} saatis keskpanka ${type==='money'?'raha':'käikude'} laenutaotluse.`);saveNow();res.json({ok:true,message:'Laenutaotlus saadeti mängujuhile kinnitamiseks.'})});
app.post('/api/game-bank/respond-counter',auth,(req,res)=>{const r=db.gameBank.loanRequests[String(req.body.id||'')];if(!r||r.userId!==req.user.id||r.status!=='countered')return res.status(404).json({error:'Aktiivset vastupakkumist ei leitud.'});if(!req.body.accept){r.status='rejected_by_user';r.respondedAt=Date.now();saveNow();return res.json({ok:true,message:'Lükkasid keskpanga vastupakkumise tagasi.'})}try{issueGameBankLoan(r);saveNow();return res.json({ok:true,message:'Vastupakkumine kinnitatud ja laen väljastatud.',user:pub(req.user)})}catch(e){return res.status(400).json({error:e.message})}});
app.post('/api/game-bank/repay',auth,(req,res)=>{const u=req.user,l=db.gameBank.loans[String(req.body.id||'')];if(!l||l.userId!==u.id||!['active','overdue'].includes(l.status))return res.status(404).json({error:'Aktiivset keskpanga laenu ei leitud.'});const due=Math.max(0,Math.floor(Number(l.unpaid)||0));if(due<=0)return res.status(400).json({error:'Laen on juba tasutud.'});const want=req.body.all?due:Math.max(1,Math.floor(Number(req.body.amount)||0));let pay=0;if(l.type==='money'){const available=Math.max(0,Math.floor(Number(u.cash)||0))+Math.max(0,Math.floor(Number(u.bank)||0));pay=Math.min(want,due,available);let left=pay,fromBank=Math.min(left,Math.max(0,Math.floor(Number(u.bank)||0)));u.bank-=fromBank;left-=fromBank;let fromCash=Math.min(left,Math.max(0,Math.floor(Number(u.cash)||0)));u.cash-=fromCash;left-=fromCash;pay-=left;if(l.autoLoan)db.gameBank.autoMoneyFund=(Number(db.gameBank.autoMoneyFund)||0)+pay;else db.gameBank.balance=(Number(db.gameBank.balance)||0)+pay;}else{pay=Math.min(want,due,Math.max(0,Math.floor(Number(u.turns)||0)));u.turns-=pay;if(l.autoLoan)db.gameBank.autoTurnsFund=(Number(db.gameBank.autoTurnsFund)||0)+pay;else db.gameBank.turnsBalance=(Number(db.gameBank.turnsBalance)||0)+pay;}if(pay<=0)return res.status(400).json({error:l.type==='money'?'Sul pole tagasimakseks raha.':'Sul pole tagasimakseks käike.'});l.unpaid=Math.max(0,due-pay);l.paid=(Number(l.paid)||0)+pay;l.lastPaymentAt=Date.now();if(l.unpaid<=0){l.unpaid=0;l.status='repaid';l.repaidAt=Date.now()}db.gameBank.log.unshift({time:Date.now(),type:l.type==='money'?'central_loan_repay_money':'central_loan_repay_turns',amount:pay,userId:u.id,user:u.name});db.gameBank.log=db.gameBank.log.slice(0,3000);saveNow();res.json({ok:true,message:l.status==='repaid'?'Keskpanga laen on täielikult tasutud.':`Tagasimakse tehtud. Jääk ${l.unpaid}${l.type==='money'?' €':' käiku'}.`,user:pub(u)})});
app.get('/api/game-bank',auth,admin,(req,res)=>{return res.json({balance:db.gameBank.balance||0,turnsBalance:db.gameBank.turnsBalance||0,autoMoneyFund:db.gameBank.autoMoneyFund||0,autoTurnsFund:db.gameBank.autoTurnsFund||0,autoLoan:{...(db.gameBank.autoLoan||{})},requests:Object.values(db.gameBank.loanRequests||{}).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(x=>({...x,userName:byId(x.userId)?.name||'?'})),loans:Object.values(db.gameBank.loans||{}).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(x=>({...x,userName:byId(x.userId)?.name||'?'})),log:db.gameBank.log.slice(0,500)});});
app.post('/api/admin/game-bank/request',auth,admin,(req,res)=>{const r=db.gameBank.loanRequests[String(req.body.id||'')];if(!r||!['pending','countered'].includes(r.status))return res.status(404).json({error:'Taotlust ei leitud.'});const action=String(req.body.action||'');if(action==='reject'){r.status='rejected';r.respondedAt=Date.now();const u=byId(r.userId);if(u)notify(u,'loan','Mängujuht lükkas sinu keskpanga laenutaotluse tagasi.');saveNow();return res.json({ok:true,message:'Taotlus tagasi lükatud.'})}if(action==='counter'){r.offerAmount=Math.max(1,Math.floor(Number(req.body.amount)||r.amount));r.offerRate=clamp(Number(req.body.rate??r.rate)||0,0,500);r.offerHours=clamp(Math.floor(Number(req.body.hours)||r.hours),1,720);r.status='countered';r.counteredAt=Date.now();const u=byId(r.userId);if(u)notify(u,'loan',`Keskpank tegi sulle vastupakkumise: ${r.offerAmount}${r.type==='money'?' €':' käiku'}, ${r.offerRate}%, ${r.offerHours}h.`);saveNow();return res.json({ok:true,message:'Vastupakkumine saadetud.'})}if(action==='approve'){try{issueGameBankLoan(r);saveNow();return res.json({ok:true,message:'Taotlus kinnitatud ja laen väljastatud.'})}catch(e){return res.status(400).json({error:e.message})}}return res.status(400).json({error:'Vigane tegevus.'})});
app.post('/api/admin/game-bank/auto',auth,admin,(req,res)=>{
  const a=String(req.body.action||''),cfg=db.gameBank.autoLoan||(db.gameBank.autoLoan={enabled:false,rate:20,hours:12,maxMoney:100000000,maxTurns:5000});
  if(a==='settings'){cfg.enabled=!!req.body.enabled;cfg.rate=clamp(Number(req.body.rate)||0,0,500);cfg.hours=clamp(Math.floor(Number(req.body.hours)||12),1,720);cfg.maxMoney=Math.max(1,Math.floor(Number(req.body.maxMoney)||1));cfg.maxTurns=Math.max(1,Math.floor(Number(req.body.maxTurns)||1));audit(req.user,'game_bank_auto_settings','gameBank',{...cfg});}
  else if(a==='fund_money'){const n=Math.max(0,Math.floor(Number(req.body.amount)||0));if(n>Math.max(0,Number(db.gameBank.balance)||0))return res.status(400).json({error:'Põhifondis pole piisavalt raha.'});db.gameBank.balance-=n;db.gameBank.autoMoneyFund=(Number(db.gameBank.autoMoneyFund)||0)+n;audit(req.user,'game_bank_auto_fund_money','gameBank',{amount:n});}
  else if(a==='unfund_money'){const n=Math.max(0,Math.floor(Number(req.body.amount)||0));if(n>Math.max(0,Number(db.gameBank.autoMoneyFund)||0))return res.status(400).json({error:'Automaatfondis pole piisavalt raha.'});db.gameBank.autoMoneyFund-=n;db.gameBank.balance=(Number(db.gameBank.balance)||0)+n;}
  else if(a==='fund_turns'){const n=Math.max(0,Math.floor(Number(req.body.amount)||0));if(n>Math.max(0,Number(db.gameBank.turnsBalance)||0))return res.status(400).json({error:'Käigufondis pole piisavalt käike.'});db.gameBank.turnsBalance-=n;db.gameBank.autoTurnsFund=(Number(db.gameBank.autoTurnsFund)||0)+n;}
  else if(a==='unfund_turns'){const n=Math.max(0,Math.floor(Number(req.body.amount)||0));if(n>Math.max(0,Number(db.gameBank.autoTurnsFund)||0))return res.status(400).json({error:'Automaatses käigufondis pole piisavalt käike.'});db.gameBank.autoTurnsFund-=n;db.gameBank.turnsBalance=(Number(db.gameBank.turnsBalance)||0)+n;}
  else return res.status(400).json({error:'Vigane tegevus.'});saveNow();res.json({ok:true,balance:db.gameBank.balance,turnsBalance:db.gameBank.turnsBalance,autoMoneyFund:db.gameBank.autoMoneyFund,autoTurnsFund:db.gameBank.autoTurnsFund,autoLoan:cfg});
});
app.post('/api/admin/game-bank',auth,admin,(req,res)=>{const amount=Math.max(0,Math.floor(+req.body.amount||0)),action=req.body.action,t=resolveUser(req.body.targetName||req.body.targetId);if(action==='destroy'){if(amount>db.gameBank.balance)return res.status(400).json({error:'Kassas pole piisavalt.'});db.gameBank.balance-=amount;audit(req.user,'game_bank_destroy','gameBank',{amount})}else if(action==='send'){if(!t||amount>db.gameBank.balance)return res.status(400).json({error:'Vigane siht/summa.'});db.gameBank.balance-=amount;t.cash+=amount;notify(t,'admin',`Mängu keskpangast saadeti sulle ${amount} €.`);audit(req.user,'game_bank_send',t.id,{amount})}else if(action==='add_turns'){db.gameBank.turnsBalance=(Number(db.gameBank.turnsBalance)||0)+amount;audit(req.user,'game_bank_add_turns','gameBank',{amount})}else if(action==='destroy_turns'){if(amount>db.gameBank.turnsBalance)return res.status(400).json({error:'Käigufondis pole piisavalt.'});db.gameBank.turnsBalance-=amount;audit(req.user,'game_bank_destroy_turns','gameBank',{amount})}else return res.status(400).json({error:'Vigane tegevus.'});saveNow();res.json({ok:true,balance:db.gameBank.balance,turnsBalance:db.gameBank.turnsBalance})});
function resetPlayerData(t){t.cash=2500000;t.bank=0;t.turns=300;t.hp=100;t.level=1;t.xp=0;t.rep=0;t.wanted=0;t.jailedUntil=0;t.education=0;t.educationProgress=0;t.securityLevel=1;t.mafiaLevel=1;t.propertyLevel=0;t.mafia=0;t.guards=0;t.weapons={};t.crypto=0;t.city='Paide';t.businesses={};t.businessProjects={};t.businessRejected={};t.carLicense=0;t.cars=[];t.gangId=null;t.spies={finnish:0,ukrainian:0,russian:0};t.intelLevel=0;t.lastSpyAt={};t.bodyguard=null;t.bodyguardUntil=0;t.jobId=null;t.lastSalaryAt=Date.now();t.guardingClient=null;t.guardingUntil=0;t.businessWorkers={};t.nightlife={venues:[],nextVenueId:1};t.stats={wins:0,losses:0,robbed:0,pokerWins:0,crimes:0,operations:0}}
app.post('/api/admin/reset-user',auth,admin,(req,res)=>{const t=byId(req.body.id);if(!t)return res.status(404).json({error:'Mängijat pole.'});if(t.role==='owner'&&req.user.role!=='owner')return res.status(403).json({error:'Ownerit muuta ei saa.'});snap('Enne kasutaja resetti',req.user);resetPlayerData(t);audit(req.user,'reset_user',t.id);saveNow();notify(t,'admin','Admin resetis sinu mänguprogressi algseisu.');res.json({ok:true})});
app.post('/api/admin/reset-all',auth,admin,(req,res)=>{if(req.user.role!=='owner')return res.status(403).json({error:'Ainult owner.'});snap('Enne kõigi mängijate resetti',req.user);let n=0;for(const t of Object.values(db.users)){if(t.role==='owner')continue;resetPlayerData(t);n++}audit(req.user,'reset_all','all',{count:n});saveNow();io.emit('toast','Mängijate progress resetiti.');res.json({ok:true,count:n})});
app.post('/api/admin/rename-user',auth,admin,(req,res)=>{const t=byId(req.body.id),nn=norm(req.body.name);if(!t||nn.length<3)return res.status(400).json({error:'Vigane nimi.'});if(db.users[key(nn)]&&db.users[key(nn)].id!==t.id)return res.status(409).json({error:'Nimi kasutusel.'});const oldKey=key(t.name),old=t.name;delete db.users[oldKey];t.name=nn;db.users[key(nn)]=t;audit(req.user,'rename_user',t.id,{old,new:nn});saveNow();res.json({ok:true,name:nn})});
app.get('/api/admin/ops',auth,admin,(req,res)=>res.json({audit:db.auditLogs.slice(0,300),snapshots:db.snapshots.map(x=>({id:x.id,time:x.time,label:x.label,actor:x.actor})),turnShop:[],turnOrders:[],market:{weapon:db.settings.weaponMarket,car:db.settings.carMarket,economy:db.settings.economyMarket,pressure:db.settings.marketPressure,travelBase:db.settings.travelBase,bountyFee:db.settings.bountyFee,businessTax:db.settings.businessTax,marketFee:db.settings.marketFee,carSaleFee:db.settings.carSaleFee,maintenanceRate:db.settings.maintenanceRate,bodyguardDefensePct:db.settings.bodyguardDefensePct,bodyguardGameFee:db.settings.bodyguardGameFee,workerBasePrice:db.settings.workerBasePrice,insuranceTiers:db.settings.insuranceTiers,spyPrices:db.settings.spyPrices,gangWeaponPrice:db.settings.gangWeaponPrice,gangWeaponPower:db.settings.gangWeaponPower,gangWeaponScore:db.settings.gangWeaponScore,businessProjectOverrides:db.settings.businessProjectOverrides,weapons:WEAPONS.map((w,i)=>({...w,price:weaponPrice(i)}))},handbook:true,gameBankBalance:db.gameBank.balance||0,gameBankTurnsBalance:db.gameBank.turnsBalance||0}));
app.post('/api/admin/turn-pack',auth,admin,(req,res)=>res.status(410).json({error:'Käigupakkide müük on ajutiselt eemaldatud.'}));
app.post('/api/admin/turn-pack/toggle',auth,admin,(req,res)=>res.status(410).json({error:'Käigupakkide müük on ajutiselt eemaldatud.'}));
app.post('/api/admin/turn-pack/delete',auth,admin,(req,res)=>res.status(410).json({error:'Käigupakkide müük on ajutiselt eemaldatud.'}));
app.post('/api/admin/turn-order',auth,admin,(req,res)=>res.status(410).json({error:'Käigutellimuste süsteem on ajutiselt eemaldatud.'}));
app.post('/api/admin/gift',auth,admin,(req,res)=>{const x=req.body,cash=Math.max(0,Math.floor(+x.cash||0)),turns=Math.max(0,Math.floor(+x.turns||0)),vipDays=Math.max(0,Math.floor(+x.vipDays||0)),message=String(x.message||'Kingitus VARJURIIK adminilt').slice(0,200);snap('Enne masskingitust',req.user);let n=0;for(const u of Object.values(db.users)){if(u.banned)continue;creditCashWithDebt(u,cash,'admin_gift');creditTurnsWithDebt(u,turns,'admin_gift');if(vipDays){u.vip=true;u.vipUntil=Math.max(u.vipUntil||Date.now(),Date.now())+vipDays*86400000}n++;io.to('user:'+u.id).emit('toast',message)}const id=String(db.nextIds.gift++);db.gifts.push({id,time:Date.now(),actor:req.user.name,cash,turns,vipDays,message,count:n});audit(req.user,'gift_all','all',{cash,turns,vipDays,count:n});saveNow();res.json({ok:true,message:`Kingitus saadeti ${n} kasutajale.`})});
app.post('/api/admin/snapshot',auth,admin,(req,res)=>{const id=snap(req.body.label||'Käsitsi snapshot',req.user);audit(req.user,'snapshot_create',id);saveNow();res.json({ok:true,id})});
app.post('/api/admin/rollback',auth,admin,(req,res)=>{if(req.user.role!=='owner')return res.status(403).json({error:'Ainult owner saab rollbacki teha.'});const ss=db.snapshots.find(x=>x.id===String(req.body.id));if(!ss)return res.status(404).json({error:'Snapshot puudub.'});const keep=JSON.parse(JSON.stringify(db.snapshots));const restored=JSON.parse(JSON.stringify(ss.data));db=restored;normalize();db.snapshots=keep;audit(req.user,'rollback',ss.id,{label:ss.label});saveNow();io.emit('toast','Serveri seis taastati snapshotist. Logi vajadusel uuesti sisse.');res.json({ok:true})});
app.post('/api/admin/market',auth,admin,(req,res)=>{snap('Enne turu muutmist',req.user);if(req.body.weapon!=null)db.settings.weaponMarket=clamp(+req.body.weapon,.25,4);if(req.body.car!=null)db.settings.carMarket=clamp(+req.body.car,.25,4);if(req.body.economy!=null)db.settings.economyMarket=clamp(+req.body.economy,.45,2.5);for(const [k,min,max] of [['travelBase',0,1e12],['bountyFee',0,.9],['businessTax',0,.9],['marketFee',0,.9],['maintenanceRate',0,.2],['bodyguardDefensePct',0,.5],['bodyguardGameFee',0,1],['workerBasePrice',0,1e9]])if(req.body[k]!=null)db.settings[k]=clamp(+req.body[k],min,max);db.settings.marketPressure=0;audit(req.user,'market_set','market',{weapon:db.settings.weaponMarket,car:db.settings.carMarket,economy:db.settings.economyMarket});saveNow();res.json({ok:true,settings:db.settings})});
app.post('/api/admin/insurance-settings',auth,admin,(req,res)=>{const tier=String(req.body.tier||''),t=db.settings.insuranceTiers[tier];if(!t)return res.status(400).json({error:'Vigane pakett.'});if(req.body.basePrice!=null)t.basePrice=Math.max(0,Math.floor(+req.body.basePrice||0));if(req.body.coverage!=null)t.coverage=clamp(+req.body.coverage,0,.9);if(req.body.deductible!=null)t.deductible=clamp(+req.body.deductible,0,.9);audit(req.user,'insurance_settings',tier,{...t});saveNow();res.json({ok:true,settings:db.settings})});
app.post('/api/admin/weapon-price',auth,admin,(req,res)=>{const i=Math.floor(+req.body.index),price=Math.max(1000,Math.min(250000,Math.floor(+req.body.price||0)));if(!WEAPONS[i]||i===0)return res.status(400).json({error:'Vigane relv.'});db.settings.weaponPriceOverrides[i]=price;audit(req.user,'weapon_price',String(i),{price});saveNow();res.json({ok:true,weapons:WEAPONS.map((w,j)=>({...w,price:weaponPrice(j)}))})});
app.post('/api/admin/spy-price',auth,admin,(req,res)=>{const type=String(req.body.type||''),price=Math.max(0,Math.floor(+req.body.price||0));if(!SPY_TYPES[type])return res.status(400).json({error:'Vigane spioon.'});db.settings.spyPrices[type]=price;audit(req.user,'spy_price',type,{price});saveNow();res.json({ok:true,spyPrices:db.settings.spyPrices})});
app.post('/api/admin/gang-market',auth,admin,(req,res)=>{if(req.body.price!=null)db.settings.gangWeaponPrice=Math.max(0,Math.floor(+req.body.price||0));if(req.body.power!=null)db.settings.gangWeaponPower=Math.max(1,Math.floor(+req.body.power||1));if(req.body.score!=null)db.settings.gangWeaponScore=Math.max(0,Math.floor(+req.body.score||0));audit(req.user,'gang_market','gang',{price:db.settings.gangWeaponPrice,power:db.settings.gangWeaponPower,score:db.settings.gangWeaponScore});saveNow();res.json({ok:true,settings:db.settings})});
app.post('/api/admin/business-project',auth,admin,(req,res)=>{const bid=String(req.body.business||''),pid=String(req.body.projectId||''),base=(BUSINESS_PROJECTS[bid]||[]).find(x=>x.id===pid);if(!base)return res.status(400).json({error:'Projekt puudub.'});const k=bid+'|'+pid,o=db.settings.businessProjectOverrides[k]||{};for(const fld of ['hours','turns','workers','costMult','rewardMult'])if(req.body[fld]!=null)o[fld]=Math.max(fld==='costMult'||fld==='rewardMult'?0.01:1,Number(req.body[fld]));db.settings.businessProjectOverrides[k]=o;audit(req.user,'business_project',k,o);saveNow();res.json({ok:true,settings:db.settings})});
app.post('/api/admin/simulate',auth,admin,(req,res)=>{const mult=clamp(+req.body.multiplier||1,.1,10),users=Object.values(db.users);const totalCash=users.reduce((s,u)=>s+u.cash+u.bank,0),avgScore=users.length?users.reduce((s,u)=>s+score(u),0)/users.length:0;res.json({users:users.length,totalCash,avgScore,currentWeaponMarket:db.settings.weaponMarket,currentCarMarket:db.settings.carMarket,proposalMultiplier:mult,estimatedWeaponPriceChange:(mult-1)*100,warning:mult>1.5||mult<.65?'Suur muudatus – tee enne snapshot.':'Mõõdukas muudatus.'})});
app.get('/api/admin/handbook',auth,admin,(req,res)=>res.json({sections:[
['Käigud','Loomulik regen: +50 käiku iga 15 minuti järel kuni 3000-ni. Ostetud ja admini lisatud käigud võivad minna üle 3000. Mafiooso, turva ja relv maksavad 5 käiku/tk. Spionaaž maksab 25 käiku.'],
['Skoor','Uus konto algab 0 skoorist. Maffia lvl 1 ja turva lvl 1 annavad 0. Maffia 300 + turva 300 + kinnisvara 100 annavad kokku umbes 438 miljardit ning valem on tugevalt tagant raskem. Mafiooso/turva annab 110 skoori/tk. Tavaline relv 110/tk, raskekuulipilduja 11M/tk, sõjaväe arsenal 77M/tk.'],
['PvP','Rünnak on deterministlik: Attack peab olema rangelt suurem kui Defense. Võrdse või väiksema Attackiga rünnak ebaõnnestub. Ainult OWNER on PvP, bounty ja spionaaži eest kaitstud. Admin on mängus rünnatav nagu tavaline mängija. Sama sihtmärki max 6 korda / 15 min.'],
['Haridus','Haridus on progress: Algkool 9000, Põhikool 14000, Gümnaasium 22000, Bakalaureus 40000, Magister 65000, Doktor 100000 käiku. Kasutaja valib ise, mitu käiku korraga kulutab, samm on 5 käiku. Progress salvestub. Põhikool avab oma panga.'],
['Pangad ja laenud','Haridus määrab isikliku panga limiidi; Doktoril max 1T. Mängijapanga omanik määrab laenu intressi, limiidi ja tähtaja. Defaulti korral kaetakse võlg rahast/varast ning maine langeb.'],
['Turumajandus','Kõik raha eest ostetav kasutab baasväärtust ja turukordajat. Economy Market mõjutab üldhindu; relva- ja autoturul on lisakordaja. Admin saab kordajaid muuta/lukustada ning teha simulatsiooni.'],
['Röövid','Kasiino 16–35M, soomusauto 45–77M, riiklik varakamber 98–155M baastasudena. Kõik röövid maksavad 30 käiku. Wanted ja risk võivad viia vanglasse.'],
['Wanted ja vangla','Vanglas ei saa rünnata, röövida, spioneerida, reisida ega uusi projekte alustada. Välja saab aja või kautsjoniga. Teine mängija saab kautsjoni samuti maksta; see läheb logisse ja teavitusse.'],
['Kindlustus','Basic/Standard/Premium/Elite on erineva hinna ja osalise katvusega. Kindlustus ei kata kogu kahju. Hinnad sõltuvad netovarast ja turust; admin saab protsente/hindu muuta.'],
['Bounty','Bounty teenustasu vaikimisi 25% läheb mängu keskpanka. Ülejäänu on preemia. Looja saab määrata edukate rünnakute nõude ja tähtaja. OWNER ei saa olla sihtmärk; admin saab olla sihtmärk nagu tavaline mängija.'],
['Luurekeskus','Spioonid: Soome, Ukraina ja Vene klass. Palkamine maksab raha ja käike. Spionaaž 25 käiku, sama sihtmärk 1× / 15 min, õnnestumine pole garanteeritud. Edu korral näeb varjatud infot.'],
['Ettevõtted','Firmad toodavad raha, mitte käike. Igal firmatüübil saab olla korraga 1 aktiivne projekt; eri firmatüübid võivad töötada paralleelselt. Projektidel on käigukulu, rahakulu ja kestus 2–8h. Tulu saab projekti lõpus.'],
['Autodiiler','Autod ostetakse/müüakse turuhinnaga. Mängijad saavad osta teiste autosid; NPC ostud võivad turult mõistliku hinnaga autosid ära osta. Liiga kallis auto võib jääda müüki.'],
['Netovara','Netovara = sularaha + pank + relvad + autod + kinnisvara + firmad + krüpto – aktiivsed võlad. Vara väärtused liiguvad turumajandusega.'],
['Mängu keskpank','Owner/admin näeb mängu kassat. Sinna kogunevad süsteemitasud, maksud, kindlustus, reisid, bounty fee jm. Owner saab sealt raha mängijale saata või raha majandusest likvideerida. Kõik logitakse.'],
['Kambad','Kambal on fond, punktid, relvad, juht, abijuhid ja liikmed. Iga liikme annetused, rünnakud, võidud ja kaotused on eraldi nähtavad. Juht saab määrata/eemaldada abijuhte. Juht või abijuht saab kamba kassast liikmele rahalise preemia maksta ja lisada põhjuse. Annetused, preemiad ja rollimuudatused lähevad logisse.'],
['Ihukaitsja','Iga mängija saab korraga palgata ühe teise mängija ihukaitsjaks. Klient määrab hinna ja lepingu kestuse. Ihukaitsja peab pakkumise kinnitama. Maksest läheb vaikimisi 50% mängu keskpanka ja 50% ihukaitsjale. Aktiivne ihukaitsja lisab kliendi Defense’ile vaikimisi 20% ihukaitsja enda Defense’ist. Admin saab mõlemat protsenti muuta.'],
['Kinnisvara','Kinnisvaral on 100 levelit ja igal levelil oma nimi, alustades Vanast puukuurist ning lõpetades VARJURIIGI PALEEGA. Kinnisvara väärtus arvestatakse netovara sisse ja liigub üldise turumajandusega.'],
['Admini majandus','Admin saab muuta üldturgu, relva- ja autoturu kordajat, reisi baashinda, bounty teenustasu, ärimaksu, turutasu, hooldusmäära, töötaja baashinda, ihukaitsja protsente, kindlustuspakettide hinda/katvust/omavastutust ning relvade baashindu. Enne suuri muudatusi kasuta snapshoti ja simulatsiooni.'],
['Teavitused ja postkast','Mängija saab teavituse rünnakust, kaotusest, kindlustuse kattest, bounty’st, spionaažist, kautsjonist, projektist ja admini tegevustest. Privaatpostkast võimaldab mängijatel ja owneril/adminil omavahel suhelda.'],
['Reset ja taastamine','Admin saab resetida ühe kasutaja. Owner saab resetida kõik mängijad, jättes owner-konto alles. Enne resetti tehakse automaatne snapshot. Rollback taastab kogu mänguseisu snapshotist.'],
['Turvalisus','Paroolid on scrypt-hashitud, loginil rate limit ja lukustus, IP/user-agent logitakse. IP on ainult riskisignaal. Ownerit ei saa bannida. Admini muudatused lähevad audit-logisse.']
]}));
app.post('/api/admin/settings',auth,admin,(req,res)=>{const x=req.body;for(const k of ['heistMultiplier','turnBatch','turnMinutes','maxNaturalTurns','pvpWindowMin','pvpMaxHits','cryptoMin','cryptoMax','marketFee','maintenanceRate','travelBase','bountyFee','businessTax','economyMarket'])if(x[k]!=null)db.settings[k]=Number(x[k]);if(x.announcement!=null)db.settings.announcement=String(x.announcement).slice(0,240);saveNow();io.emit('settings',db.settings);res.json({ok:true,settings:db.settings})});
app.post('/api/admin/lottery',auth,admin,(req,res)=>{try{createLottery(req.user,req.body||{});saveNow();res.json({ok:true})}catch(e){res.status(400).json({error:e.message})}});

// Play-money poker
const rooms=new Map(),SUITS=['♠','♥','♦','♣'],RANKS=[2,3,4,5,6,7,8,9,10,11,12,13,14];
io.use((s,n)=>{const name=untoken(s.handshake.auth?.token),u=name&&db.users[key(name)];if(!u||u.banned)return n(new Error('AUTH'));s.user=u;n()});
io.on('connection',s=>{s.join('user:'+s.user.id);s.on('poker:join',(d,cb)=>pJoin(s,d,cb));s.on('poker:leave',(_,cb)=>pLeave(s,cb));s.on('poker:start',(_,cb)=>pStart(s,cb));s.on('poker:action',(d,cb)=>pAction(s,d,cb))});
function deck(){const d=[];for(const s of SUITS)for(const r of RANKS)d.push({r,s});for(let i=d.length-1;i;i--){const j=rand(0,i);[d[i],d[j]]=[d[j],d[i]]}return d}
function room(){if(!rooms.has('main'))rooms.set('main',{players:[],state:'waiting',dealer:-1,turn:-1,pot:0,currentBet:0,community:[],deck:[],street:'',sb:100,bb:200});return rooms.get('main')}
function pview(r,uid){return{state:r.state,pot:r.pot,currentBet:r.currentBet,community:r.community,street:r.street,turn:r.turn,players:r.players.map((p,i)=>({id:p.id,name:p.name,chips:p.chips,bet:p.bet,folded:p.folded,allin:p.allin,seat:i,cards:p.id===uid||r.state==='showdown'?p.cards:[]}))}}
function emitP(r){for(const p of r.players)io.to('user:'+p.id).emit('poker:state',pview(r,p.id))}
function pJoin(s,d,cb=()=>{}){const u=s.user,r=room();if(r.players.some(p=>p.id===u.id))return cb({ok:true,state:pview(r,u.id)});if(r.players.length>=6||r.state!=='waiting')return cb({error:'Laud täis või käsi käib.'});const buy=clamp(Math.floor(+d?.buyIn||100000),10000,5000000);if(u.cash<buy)return cb({error:'Raha puudub.'});u.cash-=buy;r.players.push({id:u.id,name:u.name,chips:buy,cards:[],bet:0,folded:false,allin:false,acted:false});saveSoon();emitP(r);cb({ok:true,state:pview(r,u.id),user:pub(u)})}
function pLeave(s,cb=()=>{}){const r=room(),i=r.players.findIndex(p=>p.id===s.user.id);if(i<0)return cb({ok:true});if(r.state!=='waiting')return cb({error:'Käe ajal lahkuda ei saa.'});s.user.cash+=r.players[i].chips;r.players.splice(i,1);saveSoon();emitP(r);cb({ok:true,user:pub(s.user)})}
function nextA(r,f){for(let k=1;k<=r.players.length;k++){const i=(f+k)%r.players.length,p=r.players[i];if(!p.folded&&!p.allin&&p.chips>0)return i}return-1}
function bet(r,p,a){const x=Math.min(p.chips,a);p.chips-=x;p.bet+=x;r.pot+=x;if(!p.chips)p.allin=true}
function pStart(s,cb=()=>{}){const r=room();if(r.state!=='waiting'||r.players.length<2)return cb({error:'Vaja vähemalt 2 mängijat.'});r.deck=deck();r.community=[];r.pot=0;r.currentBet=r.bb;r.street='preflop';r.state='playing';r.dealer=(r.dealer+1)%r.players.length;for(const p of r.players){p.cards=[r.deck.pop(),r.deck.pop()];p.bet=0;p.folded=false;p.allin=false;p.acted=false}const sb=(r.dealer+1)%r.players.length,bb=(r.dealer+2)%r.players.length;bet(r,r.players[sb],r.sb);bet(r,r.players[bb],r.bb);r.turn=nextA(r,bb);emitP(r);cb({ok:true})}
function bettingDone(r){const a=r.players.filter(p=>!p.folded);return a.length<=1||a.every(p=>p.allin||(p.acted&&p.bet===r.currentBet))}
function resetB(r){for(const p of r.players){p.bet=0;p.acted=false}r.currentBet=0}
function advance(r){const a=r.players.filter(p=>!p.folded);if(a.length===1)return finish(r,a);if(r.street==='preflop'){r.community.push(r.deck.pop(),r.deck.pop(),r.deck.pop());r.street='flop'}else if(r.street==='flop'){r.community.push(r.deck.pop());r.street='turn'}else if(r.street==='turn'){r.community.push(r.deck.pop());r.street='river'}else return showdown(r);resetB(r);r.turn=nextA(r,r.dealer);if(r.turn<0)advance(r)}
function pAction(s,d,cb=()=>{}){const r=room(),i=r.players.findIndex(p=>p.id===s.user.id);if(r.state!=='playing'||i!==r.turn)return cb({error:'Pole sinu kord.'});const p=r.players[i],call=Math.max(0,r.currentBet-p.bet),a=d?.action;if(a==='fold'){p.folded=true;p.acted=true}else if(a==='check'){if(call)return cb({error:'Peab callima.'});p.acted=true}else if(a==='call'){bet(r,p,call);p.acted=true}else if(a==='raise'){const x=Math.floor(+d.amount||0);if(x<r.bb)return cb({error:`Min raise ${r.bb}`});bet(r,p,call+x);r.currentBet=p.bet;for(const q of r.players)if(q!==p&&!q.folded&&!q.allin)q.acted=false;p.acted=true}else return cb({error:'Vigane tegevus.'});if(bettingDone(r))advance(r);else r.turn=nextA(r,i);emitP(r);cb({ok:true})}
function score5(c){const rs=c.map(x=>x.r).sort((a,b)=>b-a),co={};for(const r of rs)co[r]=(co[r]||0)+1;const g=Object.entries(co).map(([r,n])=>({r:+r,n})).sort((a,b)=>b.n-a.n||b.r-a.r),fl=c.every(x=>x.s===c[0].s),u=[...new Set(rs)];if(u[0]===14)u.push(1);let st=0;for(let i=0;i<=u.length-5;i++)if(u[i]-u[i+4]===4){st=u[i];break}if(fl&&st)return[8,st];if(g[0].n===4)return[7,g[0].r,g[1].r];if(g[0].n===3&&g[1]?.n===2)return[6,g[0].r,g[1].r];if(fl)return[5,...rs];if(st)return[4,st];if(g[0].n===3)return[3,g[0].r,...g.filter(x=>x.n===1).map(x=>x.r).sort((a,b)=>b-a)];const p=g.filter(x=>x.n===2).sort((a,b)=>b.r-a.r);if(p.length>=2)return[2,p[0].r,p[1].r,g.find(x=>x.n===1).r];if(p.length===1)return[1,p[0].r,...g.filter(x=>x.n===1).map(x=>x.r).sort((a,b)=>b-a)];return[0,...rs]}
function cmp(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d}return 0}
function best(cs){let b=null;for(let a=0;a<cs.length-4;a++)for(let c=a+1;c<cs.length-3;c++)for(let d=c+1;d<cs.length-2;d++)for(let e=d+1;e<cs.length-1;e++)for(let f=e+1;f<cs.length;f++){const s=score5([cs[a],cs[c],cs[d],cs[e],cs[f]]);if(!b||cmp(s,b)>0)b=s}return b}
function showdown(r){r.state='showdown';const a=r.players.filter(p=>!p.folded);let bs=null,w=[];for(const p of a){const s=best([...p.cards,...r.community]);if(!bs||cmp(s,bs)>0){bs=s;w=[p]}else if(cmp(s,bs)===0)w.push(p)}finish(r,w)}
function finish(r,w){const share=Math.floor(r.pot/w.length);for(const p of w){p.chips+=share;const u=byId(p.id);if(u)u.stats.pokerWins++}r.pot=0;r.state='showdown';emitP(r);setTimeout(()=>{r.state='waiting';r.community=[];r.street='';r.turn=-1;for(const p of r.players){p.cards=[];p.bet=0;p.folded=false;p.allin=false;p.acted=false}emitP(r);saveSoon()},4000)}

function npcCarProfitTarget(){const r=Math.random();if(r<.12)return .25+Math.random()*.15;if(r<.32)return .05+Math.random()*.05;return .10+Math.random()*.15}
function npcCarBuys(){const now=Date.now();for(const [id,l] of Object.entries(db.carListings)){if(!l.npcActionAt)l.npcActionAt=(l.time||now)+rand(2,15)*60000;if(now<l.npcActionAt||l.npcOffer>0)continue;const seller=byId(l.seller);if(!seller){delete db.carListings[id];continue}const buy=Math.max(1,Number(l.car.buy||l.car.market||1)),base=Math.max(buy,Number(l.car.market||buy)),fair=Math.max(Math.floor(buy*1.05),Math.floor(base)),feeRate=clamp(Number(db.settings.carSaleFee??.08),0,.25),targetNetProfit=npcCarProfitTarget(),minProfit=Math.ceil((buy*(1+targetNetProfit))/Math.max(.01,1-feeRate)),ratio=l.price/fair;if(ratio<=1.05){const npcPay=Math.max(l.price,minProfit),fee=Math.floor(npcPay*feeRate),credit=creditBankFirst(seller,npcPay-fee);gameIncome(fee,'npc_car_market_fee',seller);notify(seller,'car',`NPC ostis sinu auto ${npcPay} € eest. 8% müügitasu ${fee} € läks keskpanka. Panka ${credit.toBank} €${credit.toCash?`, sularahasse ${credit.toCash} €`:''}.`);delete db.carListings[id];continue}const nearMarket=Math.floor(fair*(.98+Math.random()*.07));let offer=Math.max(minProfit,nearMarket);offer=Math.min(l.price-1,offer);if(offer<=buy)offer=Math.min(l.price-1,Math.floor(buy*1.05/Math.max(.01,1-feeRate)));l.npcOffer=Math.max(1,offer);l.npcOfferAt=now;l.npcActionAt=0;const pct=Math.max(0,Math.round(((l.npcOffer*(1-feeRate))/buy-1)*100));notify(seller,'car',`NPC tegi sinu autole pakkumise ${l.npcOffer} €. Sinu küsitud hind oli ${l.price} €. Pärast 8% keskpanga müügitasu oleks sinu kasum umbes ${pct}%. Mõne autoga võib kasum olla väiksem, enamasti 10–25% ja vahel võib rohkem jopata.`)}}

function updateMarket(){if(Date.now()<db.settings.marketNext)return;const pressure=Math.min(1,Math.abs(db.settings.marketPressure||0)/5000),dir=(Math.random()-.5)*.10+(db.settings.marketPressure>0?.015*pressure:0);db.settings.weaponMarket=clamp(db.settings.weaponMarket*(1+dir),.65,1.65);db.settings.carMarket=clamp(db.settings.carMarket*(1+(Math.random()-.5)*.04),.92,1.08);for(const u of Object.values(db.users)){for(const c of (u.cars||[])){const buy=Math.max(1,Number(c.buy||1)),cur=Math.max(buy,Number(c.market||buy*1.08)),next=Math.floor(cur*(1+(Math.random()-.5)*.08));c.market=clamp(next,Math.floor(buy*1.05),Math.floor(buy*1.40))}}for(const l of Object.values(db.carListings||{})){if(l?.car){const buy=Math.max(1,Number(l.car.buy||1)),cur=Math.max(buy,Number(l.car.market||buy*1.08)),next=Math.floor(cur*(1+(Math.random()-.5)*.08));l.car.market=clamp(next,Math.floor(buy*1.05),Math.floor(buy*1.40))}}db.settings.economyMarket=clamp(db.settings.economyMarket*(1+(Math.random()-.5)*.035),.8,1.25);db.settings.marketPressure=Math.floor((db.settings.marketPressure||0)*.25);db.settings.marketNext=Date.now()+900000;io.emit('settings',db.settings);saveSoon()}
function decayWanted(){for(const u of Object.values(db.users)){if(u.wanted>0&&Math.random()<.25)u.wanted--;if(u.vipUntil&&u.vipUntil<Date.now()){u.vip=false;u.vipUntil=0}if(u.insurance?.active&&u.insurance.until<Date.now())u.insurance.active=false}}
setInterval(()=>{expireBounties();cleanupGameBankRequests();const clock=processGameClock();npcCarBuys();autoTick();autoNpcListingsTick();drawLottery();settleLoans();settleGameBankLoans();for(const u of Object.values(db.users)){refreshNightlife(u);if(Date.now()>=u.maintenanceDue){chargeMaintenance(u);u.maintenanceDue=Date.now()+86400000}}if(clock.changed)saveSoon()},15000);setInterval(npcTick,60000);
(async()=>{await initStorage();let ownerChanged=false;if(OWNER_PASSWORD&&!db.users[key(OWNER_USERNAME)]){db.users[key(OWNER_USERNAME)]=newUser(OWNER_USERNAME,OWNER_PASSWORD,'owner');ownerChanged=true}const owner=db.users[key(OWNER_USERNAME)];if(owner&&owner.role!=='owner'){owner.role='owner';ownerChanged=true}for(const u of Object.values(db.users)){if(owner&&u.id!==owner.id&&u.role==='owner'){u.role='admin';ownerChanged=true}}if(ownerChanged)await saveNow();server.listen(PORT,()=>console.log(`VARJURIIK v6.80 running on ${PORT}`))})().catch(e=>{console.error(e);process.exit(1)});
