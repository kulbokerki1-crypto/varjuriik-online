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
