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
