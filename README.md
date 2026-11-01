# VARJURIIK V6.35 — avalik ööelu + musta äri tasakaal

V6.31 baasil.

## Muudatused
- Mängijate lehel eraldi **Hetkel online** ja **Online viimase 24h jooksul** kontode arv.
- **Suured diilid** eemaldatud täielikult.
- V6.32 ajal lisati 🌙 Ööelu testiala; V6.35-s on parool eemaldatud ja ala avalik.
- Võimalik luua kuni 3 kohta: **baar, ööklubi või striptiisiklubi**.
- Erinevad pinnad väikestest Eesti linnadest kuni Tallinna suure klubini.
- NPC ehitushanked: hind, valmimisaeg ja kvaliteet.
- Mööbli ja helitehnika pood: lauad, toolid, baaripukid, diivanid, VIP-boksid, eri võimsusega kõlarid, subwooferid, DJ-puldid, valgus ja laserid.
- NPC turvahanked: firma, turvameeste arv, lepingu tunnid, hind ja kvaliteet.
- Joogi- ja söögitarnijate NPC pakkumised.
- Töötajate konkursid: baarmen, teenindaja, DJ, tantsija ning striptiisiklubil 18+ väljamõeldud esinejad.
- Esinejate testprofiilides on mängulised välimuse/karjääri atribuudid ja kõik on selgelt täisealised.
- Lahtiolekuajad, sissepääsuhind, avamine/sulgemine, maine, külastajad ja kassa.
- Tulu tekib ainult valmis ja avatud kohas ning sõltub pinnast, sisustusest, helist, töötajatest, turvast, tarnijast ja mainest.
- Kassa väljavõte läheb esmalt isiklikku panka, panga täitumisel sularahasse.
- Igapäevased tegevused: reklaamikampaania, VIP-õhtu, personali koolitus väikese käigukuluga.
- Olemasolevate mängijate progressi uuendus ei nulli.


## V6.33 — suur ööelu koonduuendus
- V6.33 ajal oli ööelu testiala parooliga; V6.35-s on parool eemaldatud.
- Admini Tark raamat on ainult admin/owner kontole nähtav ja ei küsi eraldi parooli.
- Baar / ööklubi / striptiisiklubi eraldi vaadetena.
- Igal kohal eraldi 24h aken ja max 12h avatud; offline catch-up.
- Tunnideklaratsioonid, 24% brutomaks, 8% väljavõttetasu.
- Ettevõtte pangakonto avamine 200 käiku, oma saldo ja tehingud.
- Dünaamilised hankehinnad, 12h turvapaketid, personalisündmused ja palgatõusud.
- Inventari m², 25% reserveeritud pind, kulumine/purunemine, likvideerimine.
- Reklaam, märkimisväärse hinnaga koolitus, 1h VIP-õhtu ja tüübi põhised fiktiivsed külalisesinejad.
- Must äri: ANT/KOK/JUPP fiktiivse mängukaubana, must kassa, kahtlus, annetused.
- Hoone vahetus säilitab kõik; ainult suurimas hoones +1 m² = 50 käiku.
- Pindade hinnad: Paide 12M, järgmised oluliselt kallimad kuni 19B; pinnad suuremad.
- Püsivus: olemasolevat mängijaprogressi ei nullita.

V6.33.1 parandus
- Tark raamat eemaldatud paroolikaitsest; ligipääs ainult admin/owner rollile.
- V6.33.1 ajal jäi testiparool alles; V6.35-s on see eemaldatud.


## V6.34 ööelu tasakaalustus
- Personali ideaal skaleerub nüüd umbes 8 töötajat / 100 m² baaris ja ööklubis ning umbes 10 / 100 m² striptiisiklubis.
- Targa raamatu inventarisoovitused on suurendatud: suuremad kohad vajavad realistlikult rohkem laudu, toole, baaripukke, diivaneid, VIP-bokse, helitehnikat ja valgust.
- Tarka raamatusse lisatud praktiline piletihinna juhend: millal hinda tõsta/langetada, kuidas arvestada täituvust, reklaami, VIP-õhtut, mainet ja tunni netotulu.

## V6.35 — avalik ööelu + musta äri tasakaal
- Ööelu testiala parool eemaldatud; ööelu on kõigile sisselogitud mängijatele kohe avatud.
- Teiste mängijate baarid/ööklubid/stripiklubid on avalikus ööelu edetabelis; näha on klubi skoor, koha raha, pind, pilet, seis ja külastajate üldpilt. Personali arvu ja inventari detailset koosseisu ei näidata.
- Igal klubil on eraldi klubi skoor, mis arvestab koha suurust, mainet, kvaliteeti, külastatavust, käivet ja rahalist tugevust.
- Pikad ööelu osad (deklaratsioonid, hanked, inventar, personal, reklaam/VIP, must äri, hoone) on kokku-lahti vajutatavad ja valik salvestub brauseris.
- Reklaami hinnad on enne ostu nähtavad kolme tasemena.
- Personali koolitus on nüüd lvl 0–100; näha on praegune level ja järgmise leveli hind.
- Musta äri kahtluse/heat näit on mängija eest peidetud.
- Must turg uueneb iga 15 minuti järel; ANT/KOK/JUPP ostu- ja müügikogused on eraldi piiratud ning sõltuvad hoonest, kliendivoolust, nõudlusest ja VIP-ist.
- Musta turu tasakaal: väikseim hoone kuni ~30M €/h väga heal tavalisel tunnil, VIP-ga ~50–60M €/h; skaala kasvab hoonetega kuni suurima hoone ~1B €/h väga heal tunnil.
- Must kassa on eraldi: sinna saab raha panna ainult isiklikust sularahast ja sealt välja võtta ainult isiklikku sularahasse. Musta kassa väljavõtul 8% tasu ei rakendu.
- Mustast kassast saab jätkuvalt otse annetada.
- Ehituse valmimise, 12h turvapaketi lõppemise ja VIP-õhtu lõppemise kohta tekib ööelu vaates nähtav teavitus.
- Tunnideklaratsioonide loogika jääb: iga täitunud tund lukustub eraldi ning tuleb esitada ja 24% maks tasuda enne uut avamisperioodi.
