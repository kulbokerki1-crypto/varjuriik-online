# VARJURIIK v5 COMPLETE

Koondversioon pärast V5 beetat.

## Olulisemad süsteemid
- PostgreSQL püsiv andmebaas Renderis (`DATABASE_URL`)
- Uus konto algab 0 skoorist
- Maffia 300 + turva 300 + kinnisvara 100 = ~438 miljardit leveliskoori; kasv on tugevalt tagant raskem
- Mafiooso/turva 110 skoori tk; tavarelv 110, raskekuulipilduja 11M, sõjaväe arsenal 77M tk
- Mafiooso, turva ja relva ost = 5 käiku tk
- PvP deterministlik: Attack peab olema rangelt suurem kui Defense; owner/admin kaitstud
- Haridus: 9k + 14k + 22k + 40k + 65k + 100k käiku; progress salvestub
- Põhikool avab mängijapanga; isikliku panga max limiit haridusest kuni 1T
- Krüpto ostulimiit: 1000 hetkeskoori = 1 krüpto
- 100 nimetatud kinnisvarataset: Vana puukuur -> VARJURIIGI PALEE
- Ettevõtted: töötajad, valdkonnapõhised projektid, käigukulu, kestus ja ärimaks
- Autodiiler + NPC ostud
- Wanted/vangla piirangud + enda/teise mängija kautsjon
- Kindlustus Basic/Standard/Premium/Elite; osaline katvus, omavastutus, admini seaded
- Bounty: 25% vaikimisi teenustasu, mitme rünnaku tingimus, admin saab määra muuta
- Luurekeskus: Soome/Ukraina/Vene agendid, 25 käiku, 1 katse sihtmärgi kohta 15 min
- Teiste mängijate profiilid, privaatpostkast, teavitused
- Isiklik ihukaitsja: teine mängija, leping, 50/50 makse vaikimisi, Defense boonus
- Kambad: fond, annetused, rünnakud/võidud/kaotused, juht/abijuht/liige, rahalised preemiad
- Mängu keskpank: süsteemitasud/maksud, owner saab saata või likvideerida raha
- Admin: kasutajanime muutmine, reset kasutaja/kõik, snapshot/rollback, audit, turu/tasude/relvahindade/kindlustuse muutmine
- Põhjalikum owner/admin käsiraamat

## Deploy
Render Web Service kasutab Node 20+ ja käivituskäsku `npm start`.
Püsiva andmebaasi jaoks määra Render Environmentis `DATABASE_URL` PostgreSQL Internal Database URL-iks.

## Märkus
Süntaksikontroll on tehtud `node --check` abil. Täielik Render runtime-test tuleb teha pärast deploy'd, sest selles ehituskeskkonnas ei õnnestunud npm sõltuvusi võrgust lõpuni paigaldada.


## Tänane koondparandus
- Kõik mängijatega seotud sisestused kasutajanime järgi.
- Kindlustuse hinnad ja spioonide hinnad avalikult nähtavad.
- PvP: võit röövib 50% ohvri hetkesularahast; kaitsmata relvad võivad saagiks minna.
- Edukas kambarünnak annab 1 punkti; kamba relv maksab 1 punkti + raha.
- Firmaprojektidel nähtav algkulu, brutotulu, maks, puhaskasum, kestus, käigukulu; vastu võtmine/keeldumine ja töötajate valik.
- Admin saab muuta spioonide hindu, kamba relvaturgu ja firmaprojektide seadeid.

## V6 mängumuudatused (31.10.2026)
- Haridusele vastavad töökohad; palk laekub iga 15 minuti järel sularahasse.
- Algkooli tööpalgad 6 000–15 000 €, põhikooli tööpalgad 15 000–55 000 €; kõrgematel haridustel kasvavad vahemikud edasi.
- Kamba liikmete päevased rünnakud nullitakse Eesti aja järgi keskööl; kamba punktid säilivad ja juhil on kuni 14 päeva rünnakute ajalugu nähtav.
- Loos näitab ostetud piletite koguarvu ning ostjaid koos piletite arvuga.
- Eraldi „Minu andmed” vaade: liitumisaeg, levelid, haridus, skoor, töökoht, palk ja statistika.
- Mängijate nimekirjas/profiilis kuvatakse viimane online-aeg.
- Bounty väljad on selgelt märgistatud: summa, rünnakute arv ja kestus minutites.
- Spiooni palkamise käigukulu: Soome 5, Ukraina 10, Vene 15 käiku ühe spiooni kohta; iga spionaažikatse kulutab 1 spiooni ka ebaõnnestumisel.
- Isikliku ihukaitsja väljad on selgelt märgistatud, sh lepingu kestus tundides.
- Relvade baashinnad langetatud 70%.
- Autopoes saab valida konkreetse auto/kvaliteeditaseme, mitte juhusliku ostu.
- Krüpto hinnavahemik 120–190.
- Lugemata teavituse korral muutub „Teated” menüü nähtavalt ja näitab lugemata teadete arvu.


## V6.3 – progressi säilitamine uuenduste vahel

See versioon ei kirjuta olemasoleva mängija levelit, XP-d, raha, käike ega muid olemasolevaid välju uuenduse ajal üle. Uued save-väljad lisatakse migratsiooniga olemasolevale kasutajale.

### OLULINE Renderis
Kui `DATABASE_URL` ei ole määratud ja mäng kasutab ainult `./data/db.json` faili, võib Render uue deploy ajal selle faili kustutada, sest tavaline failisüsteem ei ole püsiv. Sellisel juhul ei saa ükski koodimigratsioon vana andmebaasi taastada.

Kasuta ühte neist:
1. PostgreSQL ja määra Renderis `DATABASE_URL`; või
2. Render Persistent Disk, mount näiteks `/var/data` ning määra `DATA_DIR=/var/data`.

Kui `/var/data` on mountitud, tuvastab V6.3 selle automaatselt. Serveri logisse kirjutatakse käivitamisel, kas kasutusel on PostgreSQL, püsiv failitee või ohtlik ajutine `./data` salvestus.
