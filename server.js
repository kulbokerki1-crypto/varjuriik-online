
'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const OWNER_USERNAME = process.env.OWNER_USERNAME || 'Erki';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

fs.mkdirSync(DATA_DIR, { recursive: true });

const defaultDb = () => ({
  users: {},
  settings: { heistMultiplier: 1, announcement: '' },
  logs: [],
  createdAt: Date.now()
});

let db = defaultDb();
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { console.error('DB parse failed; using empty DB'); }
}
db.users ||= {};
db.settings ||= { heistMultiplier: 1, announcement: '' };
db.logs ||= [];

let saveTimer = null;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }, 80);
}
function saveNow() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
process.on('SIGTERM', () => { try { saveNow(); } finally { process.exit(0); }});
process.on('SIGINT', () => { try { saveNow(); } finally { process.exit(0); }});

function normalizeName(x) {
  return String(x || '').trim().replace(/\s+/g,' ').slice(0,18);
}
function keyName(x) { return normalizeName(x).toLowerCase(); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}
function checkPassword(password, salt, hash) {
  const h = crypto.scryptSync(String(password), salt, 64);
  return crypto.timingSafeEqual(h, Buffer.from(hash, 'hex'));
}
function b64url(s) { return Buffer.from(s).toString('base64url'); }
function signToken(username) {
  const payload = b64url(JSON.stringify({ u: username, exp: Date.now() + 1000*60*60*24*30 }));
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyToken(token) {
  try {
    const [p,sig] = String(token||'').split('.');
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(p).digest();
    const got = Buffer.from(sig, 'base64url');
    if (expected.length !== got.length || !crypto.timingSafeEqual(expected,got)) return null;
    const data = JSON.parse(Buffer.from(p,'base64url').toString());
    if (data.exp < Date.now()) return null;
    return data.u;
  } catch { return null; }
}
function newUser(name, password, role='player') {
  const {salt,hash} = hashPassword(password);
  return {
    id: crypto.randomUUID(), name, salt, hash, role, banned:false, vip:false,
    cash:250000, bank:0, turns:300, hp:100, xp:0, level:1, rep:0,
    power:10, mafia:0, mafiaLevel:1, weapon:0, property:0,
    lastTurnAt:Date.now(), lastHealAt:Date.now(), lastRobAt:0,
    createdAt:Date.now(), stats:{wins:0,losses:0,robbed:0,pokerWins:0}
  };
}
if (OWNER_PASSWORD && !db.users[keyName(OWNER_USERNAME)]) {
  db.users[keyName(OWNER_USERNAME)] = newUser(OWNER_USERNAME, OWNER_PASSWORD, 'owner');
  saveNow();
  console.log('Owner account created:', OWNER_USERNAME);
}
if (!OWNER_PASSWORD) {
  console.warn('WARNING: OWNER_PASSWORD is not set. Owner account will not be auto-created.');
}

const weapons = [
  {name:'Rusikad',price:0,power:0},
  {name:'Nuga',price:15000,power:45},
  {name:'Püstol',price:120000,power:180},
  {name:'SMG',price:650000,power:700},
  {name:'Ründerelv',price:2800000,power:2400},
  {name:'Täpsuspüss',price:12000000,power:8500}
];
const properties = [
  {name:'Üürikorter',price:0,score:100},
  {name:'Korter',price:180000,score:700},
  {name:'Maja',price:850000,score:2800},
  {name:'Villa',price:6500000,score:17000},
  {name:'Hotell',price:48000000,score:95000},
  {name:'Pilvelõhkuja',price:420000000,score:650000}
];
const crimes = [
  {id:'shop',name:'Röövi väikepoodi',turns:8,min:2500,max:10000,risk:.10,xp:22},
  {id:'car',name:'Varasta auto',turns:18,min:18000,max:80000,risk:.20,xp:55},
  {id:'warehouse',name:'Röövi ladu',turns:35,min:90000,max:350000,risk:.28,xp:120},
  {id:'bank',name:'Pangarööv',turns:80,min:700000,max:3500000,risk:.42,xp:300},
  {id:'casino',name:'Kasiino operatsioon',turns:160,min:4000000,max:18000000,risk:.52,xp:700}
];

function refresh(u) {
  const now = Date.now();
  const step = u.turns < 700 ? 5000 : 30000;
  const gain = Math.floor((now-u.lastTurnAt)/step);
  if (gain > 0) {
    u.turns = Math.min(5000, u.turns + gain);
    u.lastTurnAt += gain*step;
  }
  const heal = Math.floor((now-u.lastHealAt)/10000);
  if (heal > 0) {
    u.hp = Math.min(100, u.hp + heal);
    u.lastHealAt += heal*10000;
  }
}
function levelNeed(u){ return 250*u.level*u.level; }
function addXp(u,x) {
  u.xp += x;
  while (u.xp >= levelNeed(u)) {
    u.xp -= levelNeed(u);
    u.level++;
    u.turns += 50;
    u.cash += 25000*u.level;
  }
}
function score(u) {
  return Math.floor(u.cash/10000 + u.bank/20000 + u.power*12 + u.mafia*25*u.mafiaLevel +
    properties[u.property].score + weapons[u.weapon].power*3 + u.level*100);
}
function publicUser(u) {
  refresh(u);
  return {
    id:u.id,name:u.name,role:u.role,vip:u.vip,cash:u.cash,bank:u.bank,turns:u.turns,hp:u.hp,
    xp:u.xp,level:u.level,rep:u.rep,power:u.power,mafia:u.mafia,mafiaLevel:u.mafiaLevel,
    weapon:u.weapon,property:u.property,score:score(u),stats:u.stats, weaponName:weapons[u.weapon].name,
    propertyName:properties[u.property].name
  };
}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function requireTurns(u,n){refresh(u);if(u.turns<n)return false;u.turns-=n;return true}
function log(type, text, user=null) {
  db.logs.unshift({time:Date.now(),type,text,user:user?.name||null});
  db.logs=db.logs.slice(0,500);
}
function byId(id){ return Object.values(db.users).find(u=>u.id===id); }

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{origin:false} });
app.use(express.json({limit:'100kb'}));
app.use(express.static(path.join(__dirname,'public')));

function auth(req,res,next) {
  const token = (req.headers.authorization||'').replace(/^Bearer\s+/,'');
  const name = verifyToken(token);
  const u = name && db.users[keyName(name)];
  if (!u || u.banned) return res.status(401).json({error:'AUTH'});
  req.user=u; next();
}
function admin(req,res,next){
  if (!['admin','owner'].includes(req.user.role)) return res.status(403).json({error:'ADMIN_ONLY'});
  next();
}
function ok(res,u,extra={}){saveSoon();res.json({ok:true,user:publicUser(u),...extra})}

app.get('/api/config',(req,res)=>res.json({weapons,properties,crimes,settings:db.settings}));

app.post('/api/register',(req,res)=>{
  const name=normalizeName(req.body.name), pw=String(req.body.password||'');
  if (name.length<3 || !/^[\p{L}\p{N}_ -]+$/u.test(name)) return res.status(400).json({error:'Nimi peab olema 3–18 märki.'});
  if (pw.length<8) return res.status(400).json({error:'Parool peab olema vähemalt 8 märki.'});
  const k=keyName(name); if(db.users[k])return res.status(409).json({error:'See nimi on juba kasutusel.'});
  db.users[k]=newUser(name,pw);log('register','Uus mängija liitus.',db.users[k]);saveNow();
  res.json({token:signToken(name),user:publicUser(db.users[k])});
});
app.post('/api/login',(req,res)=>{
  const u=db.users[keyName(req.body.name)];
  if(!u || !checkPassword(req.body.password||'',u.salt,u.hash)) return res.status(401).json({error:'Vale nimi või parool.'});
  if(u.banned)return res.status(403).json({error:'Konto on blokeeritud.'});
  res.json({token:signToken(u.name),user:publicUser(u)});
});
app.get('/api/me',auth,(req,res)=>ok(res,req.user,{settings:db.settings}));
app.get('/api/players',auth,(req,res)=>{
  const list=Object.values(db.users).filter(x=>!x.banned).map(x=>({id:x.id,name:x.name,level:x.level,score:score(x),vip:x.vip,online:online.has(x.id)})).sort((a,b)=>b.score-a.score).slice(0,100);
  res.json({players:list});
});
app.post('/api/crime',auth,(req,res)=>{
  const u=req.user,c=crimes.find(x=>x.id===req.body.id);if(!c)return res.status(400).json({error:'Vigane rööv.'});
  if(!requireTurns(u,c.turns))return res.status(400).json({error:'Käike pole piisavalt.'});
  const fail=clamp(c.risk-(u.power+weapons[u.weapon].power+u.mafia*3)/(100000+u.level*3000),.05,.75);
  let message;
  if(Math.random()<fail){const loss=rand(Math.floor(c.min*.2),Math.floor(c.max*.35));u.cash=Math.max(0,u.cash-loss);u.hp=clamp(u.hp-rand(8,25),0,100);addXp(u,Math.floor(c.xp*.35));message=`Rööv ebaõnnestus. Kaotasid ${loss} €.`}
  else {const gain=Math.floor(rand(c.min,c.max)*(1+u.level*.025+u.mafiaLevel*.02)*db.settings.heistMultiplier);u.cash+=gain;u.rep+=Math.ceil(c.xp/20);addXp(u,c.xp);message=`Rööv õnnestus. Saak ${gain} €.`}
  log('crime',message,u);ok(res,u,{message});
});
app.post('/api/train',auth,(req,res)=>{
  const u=req.user;if(!requireTurns(u,10))return res.status(400).json({error:'Käike pole piisavalt.'});
  const g=rand(7,13)+Math.floor(u.level/4);u.power+=g;addXp(u,18);ok(res,u,{message:`Treening +${g} jõudu.`});
});
app.post('/api/recruit',auth,(req,res)=>{
  const u=req.user,n=Math.max(1,Math.min(1000,Number(req.body.n)||10)),cost=n*(9000+u.mafia*60);
  if(u.cash<cost)return res.status(400).json({error:`Vaja ${cost} €.`});u.cash-=cost;u.mafia+=n;addXp(u,n*3);ok(res,u,{message:`Värbasid ${n} mafioosot.`});
});
app.post('/api/buy',auth,(req,res)=>{
  const u=req.user,type=req.body.type,i=Number(req.body.index);
  const arr=type==='weapon'?weapons:properties;const cur=type==='weapon'?u.weapon:u.property;
  if(!Number.isInteger(i)||!arr[i]||i<=cur)return res.status(400).json({error:'Vigane ost.'});
  if(u.cash<arr[i].price)return res.status(400).json({error:'Raha pole piisavalt.'});
  u.cash-=arr[i].price;if(type==='weapon')u.weapon=i;else u.property=i;ok(res,u,{message:`Ostsid: ${arr[i].name}.`});
});
app.post('/api/bank',auth,(req,res)=>{
  const u=req.user,a=Math.floor(Number(req.body.amount)||0),dir=req.body.dir;
  if(a<=0)return res.status(400).json({error:'Vigane summa.'});
  if(dir==='in'){if(a>u.cash)return res.status(400).json({error:'Sularaha pole piisavalt.'});u.cash-=a;u.bank+=a}
  else {if(a>u.bank)return res.status(400).json({error:'Pangas pole piisavalt.'});u.bank-=a;u.cash+=a}
  ok(res,u);
});
app.post('/api/rob-player',auth,(req,res)=>{
  const a=req.user,b=byId(req.body.targetId);
  if(!b||b.id===a.id||b.banned)return res.status(400).json({error:'Vigane mängija.'});
  if(Date.now()-a.lastRobAt<60000)return res.status(429).json({error:'Uut mängijat saad röövida 60 sekundi pärast.'});
  if(!requireTurns(a,20))return res.status(400).json({error:'Vaja 20 käiku.'});
  a.lastRobAt=Date.now();refresh(b);
  const ap=score(a)+a.power*20+weapons[a.weapon].power*5+a.mafia*a.mafiaLevel*15;
  const bp=score(b)+b.power*20+weapons[b.weapon].power*5+b.mafia*b.mafiaLevel*15;
  const chance=clamp(ap/(ap+bp),.15,.85);
  let message;
  if(Math.random()<chance){
    const maxTake=Math.min(b.cash*.08, Math.max(10000,score(b)*70));
    const take=Math.floor(maxTake*(.35+Math.random()*.65));
    b.cash=Math.max(0,b.cash-take);a.cash+=take;a.rep+=5;a.stats.wins++;b.stats.losses++;b.stats.robbed+=take;addXp(a,90);
    message=`Röövisid mängijalt ${b.name} ${take} €.`;
    io.to('user:'+b.id).emit('toast',`${a.name} röövis sinult ${take} €!`);
  } else {
    a.hp=clamp(a.hp-rand(8,22),0,100);a.cash=Math.floor(a.cash*.98);a.stats.losses++;b.stats.wins++;message=`${b.name} tõrjus sinu rünnaku.`;
  }
  log('pvp',message,a);saveSoon();ok(res,a,{message});
});

// Admin
app.get('/api/admin/users',auth,admin,(req,res)=>{
  res.json({users:Object.values(db.users).map(u=>({id:u.id,name:u.name,role:u.role,banned:u.banned,vip:u.vip,cash:u.cash,turns:u.turns,level:u.level,score:score(u)}))});
});
app.post('/api/admin/user',auth,admin,(req,res)=>{
  const t=byId(req.body.id);if(!t)return res.status(404).json({error:'Mängijat ei leitud.'});
  if(t.role==='owner' && req.user.role!=='owner')return res.status(403).json({error:'Ownerit muuta ei saa.'});
  const action=req.body.action, amount=Number(req.body.amount)||0;
  if(action==='cash')t.cash=Math.max(0,t.cash+Math.floor(amount));
  else if(action==='turns')t.turns=Math.max(0,t.turns+Math.floor(amount));
  else if(action==='level')t.level=Math.max(1,t.level+Math.floor(amount));
  else if(action==='vip')t.vip=!t.vip;
  else if(action==='ban')t.banned=!t.banned;
  else if(action==='admin' && req.user.role==='owner')t.role=t.role==='admin'?'player':'admin';
  else return res.status(400).json({error:'Vigane tegevus.'});
  log('admin',`${req.user.name}: ${action} -> ${t.name} (${amount||''})`,req.user);saveNow();
  io.to('user:'+t.id).emit('toast','Admin muutis sinu kontot.');
  res.json({ok:true});
});
app.post('/api/admin/settings',auth,admin,(req,res)=>{
  if(req.body.heistMultiplier!=null)db.settings.heistMultiplier=clamp(Number(req.body.heistMultiplier)||1,1,10);
  if(req.body.announcement!=null)db.settings.announcement=String(req.body.announcement).slice(0,200);
  saveNow();io.emit('settings',db.settings);res.json({ok:true,settings:db.settings});
});

// Socket auth + presence
const online = new Map();
io.use((socket,next)=>{
  const name=verifyToken(socket.handshake.auth?.token);
  const u=name&&db.users[keyName(name)];
  if(!u||u.banned)return next(new Error('AUTH'));
  socket.user=u;next();
});
io.on('connection',(socket)=>{
  online.set(socket.user.id,(online.get(socket.user.id)||0)+1);
  socket.join('user:'+socket.user.id);
  io.emit('presence',{online:[...online.keys()]});
  socket.on('poker:join',(data,cb)=>pokerJoin(socket,data,cb));
  socket.on('poker:leave',(_,cb)=>pokerLeave(socket,cb));
  socket.on('poker:start',(_,cb)=>pokerStart(socket,cb));
  socket.on('poker:action',(data,cb)=>pokerAction(socket,data,cb));
  socket.on('disconnect',()=>{
    const n=(online.get(socket.user.id)||1)-1;if(n<=0)online.delete(socket.user.id);else online.set(socket.user.id,n);
    io.emit('presence',{online:[...online.keys()]});
  });
});

// ---------------- Play-money Texas Hold'em ----------------
const rooms = new Map();
const SUITS=['♠','♥','♦','♣'], RANKS=[2,3,4,5,6,7,8,9,10,11,12,13,14];
function deck(){const d=[];for(const s of SUITS)for(const r of RANKS)d.push({r,s});for(let i=d.length-1;i;i--){const j=rand(0,i);[d[i],d[j]]=[d[j],d[i]]}return d}
function room(id='main'){if(!rooms.has(id))rooms.set(id,{id,players:[],state:'waiting',dealer:-1,turn:-1,pot:0,currentBet:0,community:[],deck:[],street:'',smallBlind:100,bigBlind:200});return rooms.get(id)}
function pview(r,uid){
 return {id:r.id,state:r.state,pot:r.pot,currentBet:r.currentBet,community:r.community,street:r.street,turn:r.turn,dealer:r.dealer,
  players:r.players.map((p,i)=>({id:p.id,name:p.name,chips:p.chips,bet:p.bet,folded:p.folded,allin:p.allin,seat:i,cards:p.id===uid||r.state==='showdown'?p.cards:[]}))}
}
function emitRoom(r){for(const p of r.players)io.to('user:'+p.id).emit('poker:state',pview(r,p.id))}
function pokerJoin(socket,data,cb=()=>{}){
 const u=socket.user,r=room('main');if(r.players.some(p=>p.id===u.id))return cb({ok:true,state:pview(r,u.id)});
 if(r.players.length>=6)return cb({error:'Laud on täis.'});if(r.state!=='waiting')return cb({error:'Käsi juba käib.'});
 const buy=Math.max(10000,Math.min(1000000,Math.floor(Number(data?.buyIn)||100000)));
 if(u.cash<buy)return cb({error:'Buy-in jaoks pole raha.'});u.cash-=buy;r.players.push({id:u.id,name:u.name,chips:buy,cards:[],bet:0,folded:false,allin:false,acted:false});
 saveSoon();emitRoom(r);cb({ok:true,state:pview(r,u.id),user:publicUser(u)});
}
function pokerLeave(socket,cb=()=>{}){
 const r=room('main'),i=r.players.findIndex(p=>p.id===socket.user.id);if(i<0)return cb({ok:true});
 if(r.state!=='waiting')return cb({error:'Käe ajal lauast lahkuda ei saa.'});
 socket.user.cash+=r.players[i].chips;r.players.splice(i,1);saveSoon();emitRoom(r);cb({ok:true,user:publicUser(socket.user)});
}
function nextActive(r,from){
 if(!r.players.length)return -1;
 for(let k=1;k<=r.players.length;k++){const i=(from+k)%r.players.length,p=r.players[i];if(!p.folded&&!p.allin&&p.chips>0)return i}return -1
}
function putBet(r,p,amount){
 const pay=Math.min(p.chips,amount);p.chips-=pay;p.bet+=pay;r.pot+=pay;if(p.chips===0)p.allin=true;
}
function pokerStart(socket,cb=()=>{}){
 const r=room('main');if(r.state!=='waiting')return cb({error:'Käsi juba käib.'});if(r.players.length<2)return cb({error:'Vaja vähemalt 2 mängijat.'});
 r.players=r.players.filter(p=>p.chips>0);if(r.players.length<2)return cb({error:'Vähemalt kahel mängijal peab chippe olema.'});
 r.deck=deck();r.community=[];r.pot=0;r.currentBet=r.bigBlind;r.street='preflop';r.state='playing';r.dealer=(r.dealer+1)%r.players.length;
 for(const p of r.players){p.cards=[r.deck.pop(),r.deck.pop()];p.bet=0;p.folded=false;p.allin=false;p.acted=false}
 const sb=(r.dealer+1)%r.players.length,bb=(r.dealer+2)%r.players.length;putBet(r,r.players[sb],r.smallBlind);putBet(r,r.players[bb],r.bigBlind);
 r.turn=nextActive(r,bb);emitRoom(r);cb({ok:true});
}
function bettingDone(r){
 const alive=r.players.filter(p=>!p.folded);if(alive.length<=1)return true;
 return alive.every(p=>p.allin || (p.acted && p.bet===r.currentBet));
}
function resetStreetBets(r){for(const p of r.players){p.bet=0;p.acted=false}r.currentBet=0}
function advance(r){
 const alive=r.players.filter(p=>!p.folded);
 if(alive.length===1){finishHand(r,alive[0]);return}
 if(r.street==='preflop'){r.community.push(r.deck.pop(),r.deck.pop(),r.deck.pop());r.street='flop'}
 else if(r.street==='flop'){r.community.push(r.deck.pop());r.street='turn'}
 else if(r.street==='turn'){r.community.push(r.deck.pop());r.street='river'}
 else {showdown(r);return}
 resetStreetBets(r);r.turn=nextActive(r,r.dealer);
 if(r.turn<0)advance(r);
}
function pokerAction(socket,data,cb=()=>{}){
 const r=room('main'),i=r.players.findIndex(p=>p.id===socket.user.id);if(r.state!=='playing'||i!==r.turn)return cb({error:'Pole sinu kord.'});
 const p=r.players[i],toCall=Math.max(0,r.currentBet-p.bet),a=data?.action;
 if(a==='fold'){p.folded=true;p.acted=true}
 else if(a==='check'){if(toCall>0)return cb({error:'Peab callima või foldima.'});p.acted=true}
 else if(a==='call'){putBet(r,p,toCall);p.acted=true}
 else if(a==='raise'){let raise=Math.floor(Number(data.amount)||0);if(raise<r.bigBlind)return cb({error:`Min raise ${r.bigBlind}.`});putBet(r,p,toCall+raise);r.currentBet=p.bet;for(const q of r.players)if(q.id!==p.id&&!q.folded&&!q.allin)q.acted=false;p.acted=true}
 else return cb({error:'Vigane tegevus.'});
 if(bettingDone(r))advance(r);else r.turn=nextActive(r,i);
 emitRoom(r);cb({ok:true});
}
function bestScore(cards){
 const combos=[];for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++)combos.push([cards[a],cards[b],cards[c],cards[d],cards[e]]);
 let best=null;for(const c of combos){const s=score5(c);if(!best||cmpScore(s,best)>0)best=s}return best;
}
function score5(c){
 const rs=c.map(x=>x.r).sort((a,b)=>b-a), counts={};for(const r of rs)counts[r]=(counts[r]||0)+1;
 const groups=Object.entries(counts).map(([r,n])=>({r:+r,n})).sort((a,b)=>b.n-a.n||b.r-a.r);
 const flush=c.every(x=>x.s===c[0].s);let uniq=[...new Set(rs)];if(uniq[0]===14)uniq.push(1);let highStraight=0;
 for(let i=0;i<=uniq.length-5;i++)if(uniq[i]-uniq[i+4]===4){highStraight=uniq[i];break}
 if(flush&&highStraight)return [8,highStraight];
 if(groups[0].n===4)return [7,groups[0].r,groups[1].r];
 if(groups[0].n===3&&groups[1]?.n===2)return [6,groups[0].r,groups[1].r];
 if(flush)return [5,...rs];
 if(highStraight)return [4,highStraight];
 if(groups[0].n===3)return [3,groups[0].r,...groups.filter(g=>g.n===1).map(g=>g.r).sort((a,b)=>b-a)];
 const pairs=groups.filter(g=>g.n===2).sort((a,b)=>b.r-a.r);
 if(pairs.length>=2)return [2,pairs[0].r,pairs[1].r,groups.find(g=>g.n===1).r];
 if(pairs.length===1)return [1,pairs[0].r,...groups.filter(g=>g.n===1).map(g=>g.r).sort((a,b)=>b-a)];
 return [0,...rs];
}
function cmpScore(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d}return 0}
function showdown(r){
 r.state='showdown';const alive=r.players.filter(p=>!p.folded);let best=null,w=[];
 for(const p of alive){p.hand=bestScore([...p.cards,...r.community]);if(!best||cmpScore(p.hand,best)>0){best=p.hand;w=[p]}else if(cmpScore(p.hand,best)===0)w.push(p)}
 const share=Math.floor(r.pot/w.length);for(const p of w){p.chips+=share;const u=byId(p.id);if(u)u.stats.pokerWins++}
 r.pot-=share*w.length;if(r.pot>0)w[0].chips+=r.pot;r.pot=0;emitRoom(r);
 setTimeout(()=>{r.state='waiting';r.street='';r.community=[];r.currentBet=0;r.turn=-1;for(const p of r.players){p.cards=[];p.bet=0;p.folded=false;p.allin=false;p.acted=false}emitRoom(r);saveSoon()},5000);
}
function finishHand(r,winner){winner.chips+=r.pot;r.pot=0;r.state='showdown';emitRoom(r);setTimeout(()=>{r.state='waiting';r.community=[];r.street='';r.turn=-1;for(const p of r.players){p.cards=[];p.bet=0;p.folded=false;p.allin=false;p.acted=false}emitRoom(r)},3000)}

setInterval(()=>{for(const u of Object.values(db.users))refresh(u);saveSoon()},10000);

server.listen(PORT,()=>console.log(`VARJURIIK ONLINE running on :${PORT}`));
