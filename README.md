# VARJURIIK v7.06 — serveri stabiilsus ja veadiagnostika

Lähteversioon: v7.05. Täieliku mängu failid on siin samas: `server.js`, `public/index.html`, `package.json`.

## Muudatused

1. **API veateated**: Expressi tõrgete korral tagastatakse nüüd JSON koos lühikese veakoodiga. Renderi `Logs` kuvab sama koodi, päringu aadressi ja veavirna. See asendab anonüümse „Serveri viga” teate. Vigase JSON-i/HTML-vastuse korral näitab brauser ka HTTP staatust.
2. **Taustategevuste kaitse**: 15 sekundi mängutsüklis on iga suurem töö (autoturg, laenud, loosid, ööelu, hoolduskulud, NPC tegevus) oma veapüüdjaga. Ühe mängija vigane andmestik ei katkesta enam kõigi teiste mängijate järgmisi automaattegevusi. Viga jääb Renderi logisse koos töö nimega.
3. **Järjestatud salvestused**: ülekattega salvestused jooksevad nüüd järjest ning salvestavad iga muudatuse hetkeseisu koopia. See vähendab riski, et aeglasem vana salvestus kirjutab uuema andmestiku üle. Kohalik JSON-ketta salvestus kasutab ajutist faili ning asendamist.
4. **Pangalimiidi kontroll enne võlamakset**: pangasissemakse korral kontrollitakse limiit enne kõrvalkulude võla vähendamist; tagasilükatud ülekande korral saldod ja võlg ei muutu.
5. **Sisselogimine/laadimine**: ajutise serverivea korral ei visata sisselogimise tokenit automaatselt ära. Mäng näitab nähtavat veateadet.
6. **Pokkeri lõputimer**: kaitstud erindite eest.

## Kontrollid

- `node --check server.js` — läbis.
- Kõigi HTML-is olevate script-plokkide `node --check` — läbis.
- ZIP-i terviklikkuse kontroll — läbis.

## Oluline piirang

Siinses töökeskkonnas pole mängu npm-sõltuvused (`express`, `socket.io`, `pg`, `nodemailer`) saadaval ning võrguühendus npm registriga puudub. Seetõttu ei olnud võimalik käivitada tervet rakendust või testida päris PostgreSQL-i ja Renderi andmetega. Pole võimalik kinnitada, et kõik varem esinevad API vead on kõrvaldatud. Kui mõni viga kordub, ava **Render > varjuriik-online > Logs** ja otsi `API ERROR`, `GAME JOB ERROR` või `PERSIST`. Veakood/stack näitab täpse vigase funktsiooni.

## Juurutamine

Laadi see versioon GitHubi ja lase Renderil juurutada. **Ära kustuta andmebaasi ega muuda PostgreSQL-i andmeid.** Tee enne juurutamist olemasolevast andmebaasist varukoopia, kui see on võimalik. Kui ilmub uus viga, kopeeri veakood ja logirida — see aitab tuvastada allesjäänud tõrke.


## v7.07 – kamba abijuhi ja vormi parandus
- Lisatud puuduv POST /api/gang/role, millega ainult juht saab kamba liiget abijuhiks määrata või tagasi liikmeks muuta.
- Kasutatakse liikme ID-d, mitte nime; rollimuudatus logitakse, salvestatakse ja mängijat teavitatakse.
- Kui mängija on juba kambas, on 'Loo kamp' vorm peidetud. Serveri varasem teise kamba loomise keeld jääb alles.
- Mängijate kontosid, raha ega olemasolevaid kampasid ei nullita.

## v7.08 – Node.js mälu ja salvestamise parandus

Renderi logi `FATAL ERROR: ... JavaScript heap out of memory` kinnitab, et serveri Node.js protsess sai mälu otsa. **See ei tõesta ühte konkreetset mäluleket.** Koodis leiti siiski kaks suurt mäluriskiga kohta:

1. **Varukoopiate tihendamine:** admini snapshotid võisid sisaldada kuni 12 täielikku mänguseisu koopiat. Need olid ka iga andmebaasisalvestuse sees. Nüüd pakitakse olemasolevad ja uued varukoopiad gzip-vormingusse. Kõik senised 12 varukoopiat on mõeldud alles jääma; rollback oskab tihendatud koopia taastada.
2. **Salvestuste koondamine:** varem tehti `JSON.stringify(db)` kohe iga `saveNow()` korral ning aeglase PostgreSQL-i ajal võis ootele jääda palju suuri tekstikoopiaid. Nüüd on maksimaalselt üks andmebaasikirjutus korraga ja samal ajal tekkivad muudatused koondatakse uueks salvestuseks. Vea korral jääb salvestuse vajadus alles ja järgmine salvestus proovib uuesti.
3. **Sisselogimise piiraja mälu:** aegunud IP/kasutajanime võtmed eemaldatakse 5 minuti järel.
4. **Mäludiagnostika:** Renderi logides ilmub kord minutis `[MEMORY] rss=... heap=...`; sinna ei kirjutata kasutajate salasõnu ega mänguandmeid.

Mängureegleid, rahasummasid, kontosid, kambasid ja autode andmeid selle parandusega ei muudetud. Enne Renderisse paigaldamist on soovitatav teha PostgreSQL andmebaasist varukoopia.

### Kontrollid

- `node --check server.js` ja mõlema brauseri sisemise skripti kontroll läbisid.
- `node tests/test-memory.js` kontrollib varukoopiate tihendamist, taastamist ja kattuvate salvestuste koondamist; kõik testid läbisid.
- Täielikku koormustesti Renderi tegeliku andmebaasi, kasutajate hulga ja taustaprotsessidega siin teha ei saanud. **Kui `heap out of memory` kordub, on vaja Renderi `[MEMORY]` näite, logide ajarida ja andmebaasi mahtusid, et järgmine kitsaskoht leida.**
