# VARJURIIK 8.0 — neljaosaline testpakett

See ZIP on pakitud vanade versioonide eeskujul: `server.js`, `package.json`, `README.md` ja `public/index.html`.

`audit/` kausta kahte abifaili ei ole enam eraldi vaja: ainult omanikule mõeldud **lugemispõhiste** eelvaadete funktsioonid on pakitud `server.js` sisse. Reseti käivitamine jääb serveris blokeerituks.

**AINULT ERALDI TESTKESKKONDA. Ära asenda olemasolevat Renderi põhimängu ega ühenda seda olemasoleva `varjuriik-db` andmebaasiga.** Päris PostgreSQL-i katked-/taastamistest ning kogu mängu rahatehingute turvaline salvestamine on veel tegemata. Kõik mängu muudatused ei ole lõplikult kontrollitud.

## Kuidas testida

1. Loo eraldi GitHubi hoidla/haru ja eraldi Renderi testveebiteenus.
2. Kasuta *eraldi testandmebaasi* või testi kohalike ajutiste andmetega; ära kasuta tootmisandmebaasi ühendusstringi.
3. Säilita ZIP-is näidatud failipuu muutmata.
4. Node.js >=20; käsk `npm install` ning `npm start`.

## Mida on kontrollitud

- Failipuu sisaldab täpselt nelja kirjet nagu vanas VARJURIIK v7.01 väljalaskes.
- `server.js` ja mõlema paki endine abimoodul kontrollitakse JavaScripti süntaksi suhtes.
- `audit/` moodulite kaks `require`-viidet on asendatud sisemiste abifunktsioonidega.

**Ei ole tehtud** päris PostgreSQL-i integratsiooni, koormus- ega täielikku mängufunktsionaalsuse testi. Ei ole valmis põhiserverisse paigaldamiseks.

## Uus muudatus: kasutatud autode kompaktne mobiilivaade (14.11.2026)

- Kasutatud tavaautod ja demilitariseeritud sõjaväetehnika on madalates, kompaktsetes kaartides.
- Suure pildi asemel on väike autoikoon, auto andmed, ostuhind, ideaalhind, transport, registreerimine ja koguhind.
- Seisukorra pikem kirjeldus avaneb kaardil eraldi.
- Kasutatud autode loend ei püüa telefoni kerimist kinni: eraldi `max-height`/`overflow-y:auto` kerimisala on eemaldatud; leht kerib üles-alla ka kaardi keskelt.
- Ostunupp ja serveri auto ostmise reegel on muutmata: 5 käiku ühe auto ostuks.
- Kontrollitud JavaScripti süntaks, kolme näidiskaardi kuvamine ja mobiilibrauseris kerimine (Chrome/Chromium; lokaalne UI-katse).

See ei tähenda, et muud pooleliolevad VARJURIIK 8.0 PostgreSQL-i turvatestid oleksid lõpetatud. Pakett on endiselt ainult **eraldi testkeskkonnale**.


## v8.0 – Auto ostul leht ei hüppa enam üles (14.11.2026)

- Uue esinduse auto ostmisel taastub täpselt vajutatud mudeli ostunupu asukoht.
- Kasutatud auto ostmisel jääb kasutaja nimekirjas järgmise auto juurde.
- Kerimisasukoht taastatakse pärast autoäri värskendamist; sellega arvestatakse ka "Minu autod" jaotusse lisanduva auto kõrgust.
- Auto ostu hind jääb 5 käiku, muud mängureeglid jäävad samaks.
- PostgreSQL-i päris integratsioonitestid on endiselt tegemata. See on testversioon, mitte lõplikult ohutuks kinnitatud põhiserveri väljalase.


## 14.11.2026 — sõjaväehanked ja automüügi pakkumiste uuendamine
- Sõjaväetehnika hangete 8 tunni ja 12 tunni ajastuse vahelt eemaldatud tühiaeg; hoitakse kuni 3 aktiivset hanget, uued avanevad lõppenute asemele.
- Sõjaväesõidukite NPC-müügi võimalik brutokasum 5–20% kogukulust, kuid maksimaalselt 3 000 000 000 € ühe sõiduki kohta; turuhind võib pakkumise välistada. Tsiviilautodel varasem 1 300 000 000 € lagi.
- Auto NPC-vastupakkumise teavituse saabumisel värskendatakse automaatselt autokeskuse pakkumisi; aktiivsete kuulutuste puhul on varuks automaatne värskendus ja telefoni kerimiskoha säilitamine.
- PostgreSQL-i salvestamise ja taastamise täistestid on endiselt pooleli. Ära tee üldresetti; enne põhimängu uuendamist tee varukoopia.

Kohaliku auditi eraldi kontrollid: 18/18 läbitud (hanked, hinnapiirid, Socket.IO-teavitus, varuvärskendus). Päris andmebaasiga ja mobiili juurutusega kontrollimata.
