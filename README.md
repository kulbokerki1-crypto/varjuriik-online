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
