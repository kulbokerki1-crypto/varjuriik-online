# VARJURIIK V6.28 — loomulikum NPC algseis

V6.24/V6.25 funktsioonid säilivad. Muudatus puudutab 20 NPC mängija online/offline rütmi.

- Esimesel käivitusel pärast V6.26 deploy’d on 8 NPC-d kohe online.
- Järgmised 7 tulevad online 1–5 minuti jooksul.
- Ülejäänud 5 tulevad online umbes 5–12 minuti jooksul.
- Pärast esimest aktiivset starti käivad NPC-d jälle loomulike juhuslike vahedega online/offline.
- Tavapärane offline paus on umbes 10–90 minutit; varajase sessiooni lõpetamisel 15–120 minutit.
- Kõik varasemad piirangud jäävad: NPC-del kuluvad päriselt käigud ja raha ning neile kehtivad samad mängureeglid.
- Olemasolevaid päris mängijaid ega nende salvestatud progressi ei lähtestata.

## V6.27 – erinevad NPC mängustiilid
- 20 NPC-d ei mängi enam sama mustri järgi.
- Profiilid: skoorija, võitleja, ärimees, kuritegevusele keskenduv, säästja ja tasakaalustatud.
- Skoorija eelistab päriselt skoori kasvatavaid leveleid, mafioososid/turvet, relvi ja ärisid.
- NPC-del on ühekordselt erinev väike stardipositsioon, et TOP ei koosneks identsetest skooridest.
- Pärast starti kehtivad neile jätkuvalt samad raha-, käigu-, Wanted-, vangla- ja PvP piirangud nagu mängijatele.
- V6.26 aktiivsem online/offline käitumine jääb alles.


## V6.28 – loomulikumad NPC numbrid
- NPC skoori ei määrata käsitsi. See arvutatakse täpselt sama `score(u)` valemiga nagu päris mängijatel.
- 20 NPC stardi maffia, turva, relvad, ärid ja levelid on ebaühtlased, seega TOP-is ei ole kunstlikke 20 000 / 400 000 tüüpi ümaraid algskoore.
- NPC-del on erinev sularaha/panga jaotus; osa hoiab rohkem sulas, osa pangas vastavalt mängustiilile.
- Käigud on samuti erineva algseisuga, kuid edaspidi taastuvad ja kuluvad sama süsteemi järgi nagu päris mängijatel.
- V6.25–V6.27 NPC online/offline ja erinevad mängustiilid säilivad.
- Päris kasutajate andmeid see migratsioon ei muuda.
