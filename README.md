# VARJURIIK ONLINE v2

Täis-stack multiplayer MVP:
- konto loomine + sisselogimine
- serveripoolne raha/käikude/score'i loogika
- mängijate edetabel + online staatus
- mängijate omavaheline röövimine
- röövid, jõusaal, mafioosod, relvad, kinnisvara, pank
- owner/admin paneel
- VIP, ban, raha/käigud/level, admini õigused
- globaalne teade + röövide 1x–10x event
- live Texas Hold'em 2–6 mängijat, ainult mängurahaga
- telefonisõbralik UI
- andmed salvestatakse serveri data/db.json faili

## Kohalik käivitus

Vaja Node.js 20+.

1. Kopeeri `.env.example` väärtused hostingu Environment Variables sektsiooni.
2. Käivita:
   npm install
   npm start
3. Ava http://localhost:3000

Node ise ei loe `.env` faili automaatselt; lokaalselt sea keskkonnamuutujad terminalis
või lisa soovi korral dotenv. Hostingus kasuta nende "Variables / Environment" menüüd.

## Owner konto

Server loob owner konto AINULT siis, kui OWNER_PASSWORD on serveri käivitamisel määratud.

Näide:
OWNER_USERNAME=Erki
OWNER_PASSWORD=siia-väga-pikk-parool
TOKEN_SECRET=veel-pikem-juhuslik-saladus

ÄRA pane päris paroole GitHubi ega faili public/.

## Andmete säilitamine

Vaikimisi: DATA_DIR=./data

Kui hosting kasutab ephemeral filesystem'i, tuleb kasutada persistent volume/disk'i
ja seada DATA_DIR selle mount path'i alla, näiteks:
DATA_DIR=/data

## Oluline pokkeri kohta

Pokker kasutab AINULT mängusisest fiktiivset raha. Rakenduses pole pärisraha sissemakseid,
väljamakseid ega mängusisese raha rahaks vahetamist.

## Enne suurele publikule avamist

See on töötav MVP, mitte veel production-hardening:
- vii andmed Postgresesse;
- lisa rate limiting ja CSRF/CSP/Helmet;
- lisa e-posti taastamine / 2FA;
- lisa audit-log adminile;
- lisa pokkerile side-potid ja reconnect/resume;
- tee automaattestid;
- kasuta HTTPS-i (hostingud annavad selle tavaliselt ise).
