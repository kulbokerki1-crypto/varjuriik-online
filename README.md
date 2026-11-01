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


## V6.36 muudatused
- Musta turu ANT/KOK/JUPP ost ja müük ei küsi enam käsitsi kogust. Nupp näitab ja kasutab kohe maksimaalset võimalikku kogust vastavalt 15 min limiidile, mustale kassale ja laoseisule.
- Avalehe nupp „Kogu firmade tulu (15⚡)” on eemaldatud.

## V6.37 muudatused
- Iga mängijale kuuluva baari, ööklubi ja striptiisiklubi klubi skoor liidetakse nüüd päriselt omaniku mängijaskoori sisse.
- Klubi skoori muutus mõjutab kohe mängija koguskoori.
- Kuna krüpto ostulimiit kasutab sama mängijaskoori, võimaldab suurem ööelu skoor omada vastavalt rohkem krüptot.
- Klubi skoori ei salvestata eraldi püsiva boonusena: see arvutatakse koha hetkeseisust, seega klubi nõrgenemisel või kadumisel langeb ka mängija skoor vastavalt.
- Olemasolevat mängijaprogressi ega ööelu andmeid ei nullita.


## V6.38 — ehitushanke UX parandus
- Ehitusel kuvatakse valmimise kellaaeg ja järelejäänud minutid.
- Poolelioleva või juba valmis ehitusega ei saa uut ehitushanget alustada.
- Hanke pakkumiste kasti saab Sulge/X nupuga ilma pakkumist vastu võtmata kinni panna.

## V6.39 — ööelu lepingute, reklaami ja VIP tasakaal
- Hanked-vaates on nüüd näha turva 12h paketist alles olev kasutusaeg ning joogi- ja söögitarnija lepingu järelejäänud aeg.
- Alla 24h jäänud tarnijal ning kuni 2h jäänud turval kuvatakse „lõpeb varsti“ hoiatus.
- Aegunud joogi- ja söögitarnija eemaldatakse automaatselt ning ööelu vaates tekib teavitus.
- Reklaami hinnad skaleeruvad nüüd hoone/pinna suuruse järgi. Tase 1 kestab 2h, tase 2 4h ja tase 3 8h.
- Aktiivse reklaami juures kuvatakse tase ja järelejäänud aeg; uut kampaaniat ei saa aktiivse kampaania peale käivitada.
- Reklaami tegelik nõudluse mõju varieerub ning kampaania võib olenevalt koha kvaliteedist, piletist ja täituvusest jääda kas plussi või miinusesse.
- VIP-õhtu korraldus- ja külalisesineja hinnad skaleeruvad hoone suuruse järgi.
- Baaris bändide, ööklubis DJ-de ja striptiisiklubis 18+ fiktiivsete külalisesinejate hind ei ole enam kõigil pindadel fikseeritud.
- VIP külalise tegelik külastajate tõmme varieerub igal üritusel; ka odav esineja võib tuua kahjumi ning kallis esineja võib hea tunni korral tugevalt kasumisse jääda.
- VIP-õhtu kestab 1h ja aktiivse VIP-i järelejäänud aeg on nähtav.
- V6.38 ehitushanke topelttegemise kaitse, sulgemisnupp ja V6.37 klubiskoori lisamine mängija skoorile jäävad alles.


## V6.40 — tarnijad 12h paketiks
- Joogitarnija leping kestab nüüd maksimaalselt 12 tundi.
- Söögitarnija leping kestab nüüd maksimaalselt 12 tundi.
- 12h täitumisel leping lõpeb ja mängija peab tegema uue hanke.
- Uued hanke pakkumised näitavad kestuseks 12h, mitte päevade arvu.
- Varasemad pikemad tarnijalepingud piiratakse migratsioonis maksimaalselt 12 tunnile.

## V6.41 — NPC ööelu + dünaamilised hanked
- NPC-mängijad saavad nüüd oma rahaga luua ja arendada baare, ööklubisid ning striptiisiklubisid.
- NPC-d maksavad päriselt pinna, konto, ehituse, sisustuse, personali, turva ja tarnijate eest; tasuta jooksvat raha/skoori ei anta.
- NPC-klubide skoor arvutatakse samast klubi päris seisust nagu mängijatel, seega skoorid on erinevad ega ole käsitsi seatud ümmargused arvud.
- Turva-, joogi- ja söögihanked võivad olla 1h, 3h, 6h või 12h.
- Hanke pakkumises on kohe näha kestus ja ligikaudne tunnihind.
- Sama kestuse juures on kõrgema kvaliteediga pakkumine süsteemselt kallim; väike turukõikumine jääb alles.
- Parem joogi-, söögi- ja turvakvaliteet parandab külastajate nõudlust ning joogi/söögi kvaliteet mõjutab ka keskmist kulutust.


## V6.42 — hanke kestuse UI-parandus
- Parandatud päriselt serveeritav `public/index.html`.
- Turva-, joogi- ja söögihangete pakkumistel kuvatakse nüüd kestus 1h / 3h / 6h / 12h.
- Pakkumise real kuvatakse kvaliteet, kestus, vajadusel turvade arv, ligikaudne €/h hind ja koguhind.
- V6.41 NPC ööelu ja dünaamiliste hangete loogika jääb alles.

## V6.43 — lepingu lõppemise hoiatused
- Turva-, joogi- ja söögilepingutel on taas nähtav `⚠️ lõpeb varsti` hoiatus.
- Hoiatus sõltub lepingu pikkusest: 1h → viimased 15 min; 3h → viimased 30 min; 6h → viimane 1h; 12h → viimased 2h.
- V6.42 hanke kestuse kuvamise parandus jääb alles.


## V6.44 — lepingu hoiatuse täpsustus
- Kui turva-, joogi- või söögilepingul on 1h või vähem jäänud, kuvatakse alati `⚠️ lõpeb varsti`.
- 6h lepingutel algab hoiatus 1.5h enne lõppu ja 12h lepingutel 2h enne lõppu.


## V6.45 — live külastajad
- Klubi info ülaosas kuvatakse avatud koha hetke külastajate arv.
- Live külastajate näit uuendab end automaatselt iga 1 minuti järel.
- Näidatakse trendi: ↑ kasvab / → stabiilne / ↓ langeb.
- Live arv sõltub piletihinnast, personalist, mainest, inventarist, tarnijate/turva kvaliteedist, reklaamist ja VIP-ist.
- Avaliku ööelu tabeli avatud klubi külastajate näit kasutab sama live-arvestust.


## V6.46 — köök + turva minutipõhiseks
- Köögitöötaja konkursi nupp on baaris, ööklubis ja striptiisiklubis.
- Aktiivse söögitarnija korral mõjutab köögipersonali piisavus teeninduse/külastajate tulemust.
- Turvapaketid kuluvad ainult koha avatud aja jooksul ning nüüd minutipõhiselt, mitte täistundide kaupa.
- UI näitab turval näiteks `2h 55min jäänud` ja hoiatust enne lõppu.


## V6.47 — maffia/turva levelihinnad
- Maffia lvl 1→300 nominaalne kogukulu on 30 000 000 000 000 € (baasturu kordajaga 1.00×).
- Turva lvl 1→300 nominaalne kogukulu on samuti 30 000 000 000 000 €.
- Hinnad kasvavad sujuvalt leveliga; mõlemad kasutavad sama kõverat.
- Olemasolevad mängijate maffia- ja turvalevelid jäävad alles; muutuvad ainult edaspidiste levelite ostuhinnad.
- Turukordaja võib tegelikku ostuhinda jooksvalt muuta.


## V6.48 — kinnisvara levelihinnad
- Kinnisvara lvl 1→100 nominaalne kogukulu on täpselt 30 000 000 000 000 € baasturu kordajaga 1.00×.
- Hinnad kasvavad sujuvalt leveliga; kõrgemad levelid on oluliselt kallimad.
- Olemasolevad kinnisvara levelid jäävad kõigil mängijatel alles; muutuvad ainult edaspidiste levelite ostuhinnad.
- Turukordaja võib tegelikku ostuhinda jooksvalt muuta.


## V6.49
- Mustast ärist eemaldatud täielikult vahelejäämise/kontrolli risk: ANT/KOK/JUPP müük ei tõsta enam Wanted-taset, ei konfiskeeri kaupa ega määra trahvi/vangistust.
- Eemaldatud ka riskiga seotud annetuste plokk, sest sellel pole enam funktsiooni.
- Must kassa, 15 minuti turuvoorud, ostu- ja müügilimiidid ning ANT/KOK/JUPP kauplemine jäävad alles.


## V6.50 — käigupakkide haldus
- Admini vaates kuvatakse loodud käigupakid koos staatusega.
- Aktiivse paki saab nupuga **Võta müügist maha** koheselt müügist eemaldada.
- Müügist maha võetud paki saab hiljem nupuga **Pane uuesti müüki** taastada.
- Paki eemaldamine ei kustuta mängijate andmeid ega vanu tellimusi.


## V6.51
- Admin saab käigupaki nüüd täielikult kustutada, mitte ainult müügist maha võtta.
- Kustutamine eemaldab paki `turnShop` nimekirjast jäädavalt.
- Varasemad tellimused ja mängijate andmed jäävad alles.


## V6.52 — sama Mängu Keskpank ka mängijatele + raha/käigulaenud
- Pangad lehel kuvatakse sama olemasolev Mängu Keskpank, mis on owner/admin vaates.
- Kõigile mängijatele on nähtav keskpanga rahafond ja käigufond.
- Keskpangast saab taotleda rahalaenu või käigulaenu.
- Taotlus ei väljastu automaatselt: owner kinnitab, lükkab tagasi või teeb vastupakkumise (summa, intress, tähtaeg).
- Mängija saab vastupakkumise vastu võtta või tagasi lükata.
- Rahalaen vähendab keskpanga rahafondi; tagasimakse + intress lisandub sinna tagasi.
- Käigulaen vähendab keskpanga käigufondi; tagasimakse + intress lisandub sinna tagasi.
- Owner saab admini Keskpanga plokis käigufondi käike lisada või eemaldada.
- Panga- ja adminiplokid on piiratud kõrgusega ning eraldi keritavad, et mobiilis ei peaks nii palju lehte alla lappama.
- V6.51 käigupakkide täielik kustutamine on alles.
- Olemasolevaid mängijaandmeid/progressi ei nullita; gameBank uued väljad lisatakse ainult puuduvate väljadena.


## V6.53
- Parandatud Pangad lehe mobiilne kerimine: pangakaardid ei kasuta enam sisemist lukustavat scrolli.
- Pangad leht kerib jälle tavaliselt kogu lehega.
- Admini lehe kaardid ei lukusta enam mobiili põhikerimist; pikad logid/nimekirjad võivad endiselt oma konteineris kerida.
- V6.52 keskpanga raha- ja käigulaenud ning V6.51 käigupakkide kustutamine säilivad.


## V6.54 — Keskpanga võlgnikud + käigupood eemaldatud
- Käigupakkide müük on ajutiselt täielikult UI-st eemaldatud; vanu tellimusi ei näidata ega saa uusi teha. Ajalooline andmestik jääb salvestusse alles, et süsteemi saaks hiljem taastada.
- Keskpanga vastupakkumise vastuvõtmisel väljastatakse raha/käigud automaatselt.
- Üle tähtaja Keskpanga laen muutub punaseks ja hakkab koguma viivist.
- Üle tähtaja rahalaenu korral suunatakse uus palk, äritulu ja peamised uued sularahatulud automaatselt Keskpanka kuni võlg on tasutud.
- Üle tähtaja käigulaenu korral suunatakse uued genereeruvad/kingitud käigud esmalt käiguvõla katteks.
- Uut Keskpanga laenu ei saa, kui Keskpanga võlg on üle tähtaja.


## V6.55 — Keskpanga raharinglus + admini mängijate keritav kast
- Maffia-, turva- ja kinnisvaralevelite kogu ostuhind läheb nüüd Mängu Keskpanka.
- Süsteemile/NPC-le makstavad põhilised kulud (relvad, mafioosod/turvad, reisid, litsentsid, autod, tootmine, kindlustus, spioonid, äride ostud/projektid/töötajad, krüptoostud ning ööelu süsteemikulud) suunatakse Keskpanka, mitte ei kao majandusest.
- Mängijate omavahelised maksed jäävad mängijate vahele; ainult süsteemitasud lähevad Keskpanka.
- Ööelu koha konto süsteemikulud (ehitus, inventar, turva, tarnijad, reklaam, koolitus, VIP jne) lähevad samuti Keskpanka.
- Admini „Mängijate haldus“ on eraldi umbes 520 px kõrgune keritav kast; tabeli päis jääb kerides nähtavale.
- Olemasolevat mängijate progressi ei nullita.


## V6.56 — OWNER / admin õigused ja kontosse sisenemine
- `OWNER_USERNAME` (vaikimisi `Erki`) hoitakse ainsa OWNER rollina; teist OWNER rolli ei saa püsima jääda.
- Ainult OWNER on PvP-rünnakute, bounty ja spionaaži eest kaitstud. Admin on mängus rünnatav nagu tavaline mängija.
- OWNER saab Admin → Mängijate haldus alt vajutada `Sisene kontole` ja avada ükskõik millise teise kasutaja konto ilma parooli muutmata.
- Kontosse sisenemine logitakse audit- ja turvalogisse.
- Teise kasutaja kontos olles kuvatakse `Tagasi OWNER kontole` nupp, mis taastab owner-sessioni.
- Admin ei saa kasutajate kontodesse siseneda ega OWNER kontot muuta.

## V6.57 — Keskpanga avalikud laenud ja admini täielik ligipääs
- Admin ja OWNER näevad ning haldavad sama Mängu Keskpanga päris raha- ja käigufondi.
- Admin saab kinnitada, tagasi lükata ja teha Keskpanga laenutaotlustele vastupakkumisi.
- Admin saab hallata Keskpanga raha- ja käigufondi samamoodi nagu OWNER.
- Pangad lehel on kõigile avalikult näha aktiivsed Keskpanga laenud: kasutaja, laenuliik, algsumma, intress, võtmise aeg, tähtaeg ja jääk.
- Võlglased on eraldi punases nimekirjas koos viivise, tasumata jäägi, üle tähtaja aja ja seni tagasi makstud summaga.
- Oma Keskpanga raha- või käigulaenu saab endiselt käsitsi osaliselt või täielikult tagasi maksta.
- Vastupakkumise nõustumisel väljastatakse raha/käigud automaatselt ja vastav Keskpanga fond väheneb.

## V6.58 — BOTIDE KESKPANGA LAENUD
- NPC/bot-mängijad saavad nüüd taotleda Mängu Keskpangast nii rahalaenu kui käigulaenu.
- Botitaotlused kasutavad sama Keskpanga fondi, taotluste nimekirja ja admini kinnitamise/vastupakkumise süsteemi nagu päris mängijad.
- Bot võib admini mõistliku vastupakkumise ise vastu võtta; väljastatud summa läheb päriselt Keskpanga raha- või käigufondist maha.
- Botid saavad aktiivseid laene oma raha/käikudega enne tähtaega tagasi maksta.
- Üle tähtaja laen läheb botil samamoodi punasesse, saab viivist ning uus vastav tulu suunatakse võla katteks.
- Kõik botide aktiivsed laenud ja võlglased kuvatakse samas avalikus Keskpanga nimekirjas nagu päris mängijate omad.


## V6.59 — Ööelu tulukõver + NETO
- Ööelu tulud skaleeruvad nüüd tugevamalt hoone suurusega: esimene 120 m² hoone saab 1.75× tulubaasi ning skaala kasvab sujuvalt kuni 7.0× 2500 m² megaklubini.
- Täielikult optimeeritud max-hoone eesmärk on suurusjärgus kuni ~4 mld € puhaskasumit tunnis; tegelik tulemus sõltub külastajatest, piletist, personalist, tarnijatest, turvast, reklaamist, VIP-ist ja hooldusest.
- Väiksemate hoonete tasuvust tõsteti samuti alates esimesest hoonest.
- Tunnideklaratsioonides kuvatakse nüüd eraldi NETO pärast kõiki kulusid ja 24% maksu.

## V6.60 — loosid, riskialtimad botid ja uued botinimed
- Loosi saab nüüd korraldada iga mängija; botid võivad samuti loose korraldada.
- Korraldaja määrab pileti hinna, piletite koguarvu ja kestuse. Fikseeritud auhinda ei sisestata.
- Võidufond tekib ainult reaalselt müüdud piletitest: 90% müügitulust läheb võidufondi ja 10% Mängu Keskpanka.
- Botid võivad aktiivsele loosile pileteid osta.
- Loosivõitja valik ei ehita enam miljonite piletitega massiivset piletinimekirja; valik on kaalutud piletite arvu järgi.
- Pileti ostu promptis Tühista ei osta enam tasuta/1 piletit; server lükkab 0 või vigase koguse tagasi.
- Osa botte on nüüd riskialtimad: nad võivad sagedamini kasutada Keskpanga laenu, kasiinot ja bounty süsteemi. Kõik botid ei käitu nii.
- Mängija maine (rep) ja Wanted ei ole enam 100/1000 piiri külge lukustatud; väärtus võib edasi kasvada või langeda.
- Botinimed uuendatud: uutes nimedes ei ole X-tähte ega numbreid. Vanad NPC-kontod nimetatakse deploy'l automaatselt ümber, säilitades nende ID, raha, vara, levelid, laenud ja muu progressi.

## V6.61 — admini Keskpanga vaate parandus
- Admini leht laadib nüüd Keskpanga andmed automaatselt samamoodi nagu OWNERi leht.
- Admin näeb sama rahafondi, käigufondi, laenutaotlusi, aktiivseid laene ja logi nagu OWNER.
- Uue mängija või boti Keskpanga laenutaotluse teade saadetakse nüüd nii OWNERile kui kõigile adminidele.
- Keskpanga serveri õigused jäid OWNER + ADMIN tasemele; OWNERi erikaitsed ei muutunud.

## V6.62
- Pangad lehel on Avalikud Keskpanga laenud eraldi keritavas kastis.
- Võlglaste nimekiri on samuti eraldi keritavas kastis.
- Kastid on mobiilis puutetundliku inertskerimisega ja ei venita kogu Pangad lehte lõputult pikaks.


## V6.63 — Keskpanga laenude puhastus + suuremad botilaenud
- Avalikus Keskpanga aktiivsete laenude nimekirjas kuvatakse ainult laenud, mille staatus on active/overdue ja tasumata jääk > 0. Täielikult tasutud laen kaob kohe nimekirjast.
- Võlglaste punases nimekirjas on ainult päriselt üle tähtaja ja tasumata jäägiga laenud; kogu võla + viivise tasumisel kaob kirje sealt kohe.
- Botid küsivad rahalaenu nüüd enamasti miljonites eurodes. Tavalised botid küsivad sageli ~2M–50M, riskialtimad botid sagedamini ~5M–100M ning harva ka 100M–350M suurusjärgus. Väga jõukas bot võib küsida kuni ~500M, kui Keskpanga fond seda võimaldab.
- Käigulaenude botivahemikke suurendati samuti.
- Kõik laenusummad on jätkuvalt piiratud Keskpanga reaalselt olemasoleva fondiga.


## V6.64 — botide Keskpanga vastupakkumiste lõplik otsus
- Bot kontrollib admini/OWNERi Keskpanga vastupakkumist oma tegevustsüklites.
- Mõistliku pakkumise puhul võib bot selle kohe vastu võtta ja laen väljastatakse päriselt Keskpanga fondist.
- Kehva pakkumise võib bot tagasi lükata.
- Vastupakkumine ei jää enam lõputult ootele: hiljemalt 3 kontrolli või umbes 10 minuti järel teeb bot sundotsuse.
- Nõustumisel muutub taotlus aktiivseks laenuks; keeldumisel kaob ootel taotluste nimekirjast ja staatus salvestub.


## V6.65
- Botide Keskpanga laenutaotluste tähtajad on nüüd ainult 1h, 3h, 6h, 12h või 24h.
- Botid ei küsi enam 48h, 72h, 120h ega 168h laene.
- V6.64 botide vastupakkumiste reaktsiooniparandus jääb alles.

## V6.66 – Keskpanga automaatlaenud (raha + käigud)
- Admin/owner saab määrata automaatlaenu fikseeritud intressi ja tähtaja.
- Eraldi max rahalaen ja max käigulaen.
- Eraldi automaatne rahafond ja automaatne käigufond; vahendid liigutatakse põhifondist automaatfondi ning saab tagasi põhifondi tõsta.
- Mängija/bot saab automaatlaenul valida ainult summa või käikude koguse; intressi ega tähtaega muuta ei saa.
- Automaatlaen väljastatakse kohe, kui tingimused on täidetud ja fondis on piisavalt vahendeid.
- Kui kasutajal on juba aktiivne Keskpanga laen, uut automaatlaenu ei anta; uus tavataotlus läheb adminile käsitsi ülevaatamiseks.
- Botid kasutavad samuti automaatlaenu nii raha kui käikude jaoks.
- Automaatlaenu tagasimakse ja intress lähevad tagasi samasse automaatfondi; ka üle tähtaja sundtagasimaksed lähevad õigesse fondi.
- Avalikus Keskpanga vaates on näha automaatlaenu fikseeritud tingimused ja mõlema automaatfondi saadaval jääk.

## V6.67 — Keskpanga tugevam võlgniku sundtagastus
- Kui Keskpanga rahalaen läheb üle tähtaja, võetakse mängija/boti pangakontolt ja sularahast automaatselt raha võla katteks (mitte rohkem kui võla jääk).
- Kontroll toimub serveri tavatsüklis, seega ka hiljem kontole tekkinud raha suunatakse üle tähtaja võla katteks.
- Palk ja muud uued rahatulud jätkavad automaatselt Keskpanga võla katmist.
- Automaatlaenude tagasimaksed lähevad tagasi õigesse automaatfondi; tavalaenude omad Keskpanga põhifondi.
- 72 tundi üle tähtaja olnud tasumata laen saadab ühe eraldi hoiatuse nii OWNERile kui ADMINile.
- 72h hoiatus lisatakse ka Keskpanga logisse ja seda ei saadeta iga serveritsükliga uuesti.


## V6.68 — palgad Mängu Keskpangast
- Kõik tööpalgad makstakse nüüd Mängu Keskpanga põhifondist.
- Iga palga väljamakse vähendab Keskpanga rahafondi sama summa võrra.
- Kui Keskpangal pole piisavalt raha, läheb põhifondi saldo lubatult miinusesse; palk makstakse mängijale ikkagi täies mahus.
- Kui mängija on Keskpangale üle tähtaja võlgu, arvestatakse palk esmalt Keskpanga fondist välja ning suunatakse seejärel võla katteks tagasi nagu varasema võlgniku loogika järgi.
- Palgaväljamaksed kirjutatakse Keskpanga logisse kirjena `salary_payout`.

## V6.69 — targemad botid + kasiino ajalugu
- ADMIN/OWNER näeb Kasiino lehe all eraldi kasiino statistikat ja viimaste slotimängude ajalugu (mängijad + botid).
- Näidatakse mängude arvu, kogupanuseid, väljamakseid ja netot; uued mängud salvestatakse ajalukku.
- Botid kontrollivad ise, kas nende haridusega on parem töökoht saadaval, ning vahetavad parema palgaga tööle.
- Botid õpivad perioodiliselt edasi ning hariduse tõustes valivad uuesti parima saadaoleva töö.
- Suure sularaha korral proovivad botid raha panka viia; kui pangas ruumi pole või sularaha on endiselt liiga palju, investeerivad nad sagedamini maffiasse, turvasse, relvadesse ja levelitesse.
- Jõukamad/ründavamad botid saavad osta korraga rohkem mafiosse/turvamehi, et raha ei jääks lihtsalt sularahana röövitavaks.
