# VARJURIIK v6.99 — autokeskuse brauserivea parandus

- Parandatud uute autode ostunuppude vigane HTML-sündmusekäsu koostamine. Automargi ja mudeli väärtused edastatakse turvaliselt kodeeritult, nii et brauseri JavaScripti ei teki süntaksiviga.
- Sõjaväetehnika hanked, luksusautod ja v6.98 muudatused jäid alles.
- Mängijate andmeid ega saldosid ei nullita.
- Kontrollitud serveri- ja kliendiskriptide süntaksit ning ostunuppude käsu koostamist brauseris.

# VARJURIIK v6.91

- Margipõhise esindusoksjoni võitja saab osta kõiki sama margi uusi mudeleid.
- Uute autode mudelid ja sisseostu/müügihind eraldi loendis.
- Oksjonite mobiilne kerimine parandatud.
- NPC kasutatud autode ostuhinnad seatud ideaalse turuhinna suhtes realistlikuks; olemasolevad turukuulutused korrigeeritakse ühekordselt.
- Mängija vara, raha ja progress jäävad alles.

# VARJURIIK v6.90 — autoäri kasutusmugavus ja kombineeritav tuuning

- Õueplatsi ja garaaži laienduse järgmine **täpne hind** on näha juba nupul. Server ja kasutajaliides kasutavad sama arvutusreeglit.
- Kõik margioksjonid saab ühe vajutusega peita/avada, nimekiri on eraldi keritav; iga mark on eraldi avatav, avalikud pakkumised ja võitjad säilivad.
- Iga auto juures on põhjalik tuuningupaneel: kirjeldus, üksikhind, juba paigaldatud detailid ja valitud paketi koguhind.
- Saad korraga valida mitu tuuningut, kinnitada ostu ja tasuda ühe tehinguna **ainult autoäri kontolt**. Stage 1/Stage 2 ei saa üheaegselt valida; elektriautole ei pakuta turbot ega sportväljalaset.
- Varasema versiooni autode tehnilised andmed ja mängijate progress säilivad. Vanale autole ei lisata automaatselt uusi tuuninguid.
- Varasem v6.89 NPC 0–15% hinnapakkumiste süsteem ja 24% autoäri raha väljavõtu tasu jäävad alles.

# VARJURIIK v6.83 — autokeskuse stabiilsus ja avalikud oksjonid

- Autokeskus ei kao enam 15-sekundilise mängijaprofiili värskenduse järel.
- Autokeskuse automaatne täielik ümberehitamine eemaldatud; avamisel ja toimingute järel saab värske info.
- Iga margi oksjon kestab 8 tundi. Kõik pakkumised (mängijanimi ja summa) on avalikud.
- Võitja ja võidusumma kuvatakse avalikult, leping kehtib 72 tundi.
- Lepingu kehtimise ajal uut sama margi oksjonit ei toimu ega saa pakkuda.
- Uus 8-tunnine oksjon algab pärast eelmise lepingu lõppu.
- Kaotanute broneeritud summad tagastatakse oksjoni lõppedes; võitja summa läheb Keskpanka.
- Vanad kontod ja andmebaas säilivad. Uusi välju lisatakse olemasolevale andmestruktuurile.
- Ei ole testitud käimasolevas Renderi keskkonnas.


## v6.84 – Autoäri konto
- Kõigile mängijatele ühekordselt 1 000 000 € autoäri pangakontole, ka olemasolevatele mängijatele. Olemasolev saldo säilib ning stardikapital lisatakse ainult korra.
- Autoäri kontole ise sissemakseid teha ei saa: keeld nii kliendivaates kui serveri API-s.
- Väljavõtmine säilib, 24% summast kantakse Mängu Keskpanka.
- Autoäri tulud saavad endiselt kontot suurendada; diagnostika, remont ja tuuning kasutavad selle saldot.


## V6.85 — autoäri arveldab ainult oma pangakontolt
- Esimese garaaži ost ja mõlemad laiendused makstakse ainult autoäri kontolt.
- Kasutatud ja uute autode ost, transport ja registreerimine makstakse ainult autoäri kontolt.
- Margiesinduse avaliku oksjoni pakkumised broneeritakse autoäri kontolt, kaotajale vabastatakse broneering sinna tagasi. Varem isiklikust rahast tehtud pakkumiste tagastuse ühilduvus säilib.
- Diagnostika, remont ja tuuning olid juba autoäri kontopõhised ning jäävad selliseks.
- Autoäri pettusetrahve ei võeta enam mängija isiklikust sularahast.
- Autoäri müügitulud laekuvad autoäri kontole. Ise sissemakseid teha ei saa; väljavõttel 24% Keskpanka.
- Iga mängija ühekordne 1 000 000 € stardikapital ning senine progress säilivad.
- Vana (autokeskuse-eelne) autoostu süsteem ei muutu.


## v6.86 — Reisimise paigutus
- Ettevõtted vaates on Reisimine viidud pärast kasutatud autode turgu.
- Reisimise kaart hõlmab nüüd kogu rea laiuse ega katkesta autokeskuse ja turu järjestust.
- Mänguloogika, mängijate andmed ja maksed muutmata.


## V6.87 – autode soovituslik müügihind
- Kasutatud autode juures näidatakse soovituslikku müügihinda ideaalses seisukorras. Hinnang võtab arvesse mudeli, väljalaskeaasta ja läbisõidu, mitte varjatud rikkeid.
- Enda autode juures on samuti soovituslik hind, mida kasutatakse NPC müügihinna sisestamisel lähtepunktina.
- Uue auto esinduslepingu juures on uue auto esinduse sisseostuhind ning soovituslik müügihind.
- Hinnad on **mängusisesed indikatiivsed hinnangud**, mitte päris Eesti autoturu reaalajas pakkumised.
- Olemasolevad mängijad, garaažid, lepingud ja autode seisukord säilivad; hinda arvutatakse serveris jooksvalt.


## V6.88 — NPC kasutatud autode müügihinna kriitiline parandus
- Parandatud auto seisukorraprotsendi teisendamine NPC ostuhinna arvutuses. Varasem valem jagas protsendi valesti 100-ga ja vähendas lubatud müügihinda ligikaudu 100 korda.
- NPC hinnalävi arvestab nüüd seisukorda 0.28–1.00 suhtarvuna. Autoäri, oksjonid ja mängijate salvestatud andmed jäävad muutmata.
- Näiteks korraliku 2008 Volkswagen Golfi 20 000 € müügihind ei jää enam selle valemi vea taha.


## V6.89 — NPC autode hinnapakkumised
- Autoäri NPC teeb müügiks siduva pakkumise **arvestuslikust turuväärtusest (market)**, mitte ekslikult diagnoosist või ideaalse seisukorra eraldi hinnast.
- NPC kaupleb juhuslikult 0–15% alla turuväärtuse. Näiteks 200 000 € auto korral pakub NPC 170 000–200 000 €.
- Mängija näeb hinda enne müüki ning võib nõustuda või loobuda. Pakkumine säilib viis minutit, et klõpsides uut juhuslikku pakkumist kohe ei saaks.
- Müügi kinnitamisel saab soovi korral auto veatuks kuulutada; varjatud vigade teadlik peitmine võib endiselt põhjustada trahvi ja tehingu tagasipööramise.
- Kogu müügitulu läheb autoäri pangakontole. Olemasolevaid kontosid ja autosid ei lähtestata.


## V6.92 — muutuv kasutatud autode turg
- Botid lisavad iga 8–14 minuti järel korraga 3–6 uut, juhuslike andmetega kasutatud autot (kui turul on vaba ruumi).
- Turul hoitakse umbes 35–55 aktiivset kuulutust. Vanemad kuulutused aeguvad 2–5 tunni jooksul ja osa vanemaid kuulutusi asendatakse uue partiiga.
- Ostetud auto kaob kohe turult ega teki automaatselt sama sõidukina tagasi. Igal uuel autol on uus ID, mudel, aasta, läbisõit, asukoht, hind ja võimalikud peidetud rikked.
- Varasemad mängijate autod, garaažid, kontod, laenud ja esinduslepingud säilivad. Vanu kuulutusi ei kustutata uuenduse käivitamisel korraga, vaid lisatakse neile aegumisaeg.


## V6.93 — kasutatud auto müügikuulutused ja NPC ostud
- Mängija saab valida auto müügihinna ise; NPC kontrollib kuulutust 2–4 minuti järel.
- Sobiva küsitud hinna puhul ostab NPC auto küsitud hinnaga; muidu teeb vastupakkumise, mida saab vastu võtta või kuulutuse eemaldada.
- Müügiraha laekub autoäri kontole. Varjatud rikete teadlik veatuks kuulutamine säilitab trahviriski.
- Kohe küsitav NPC pakkumine põhineb ideaalsel turuhinnal, mitte auto ostuhinnal.
- Diagnostika hind sõltub nüüd auto turuväärtusest ja vanusest, mitte enam fikseeritud 12 000 eurost.
- Vanad mängijate andmed säilivad.


## v6.94 — Autoäri pettuseteated
- Kui NPC tuvastab teadliku varjatud rikke varjamise, saab mängija kohe Socket.IO teavituse.
- Autokeskuse ülaossa ilmub punane hoiatus auto nime, trahvi, koheselt tasutud summa ja jääkvõlaga.
- Teadet saab märkida loetuks; see ei tühista trahvi ega võlga.
- Teated salvestuvad mängija autoäri andmetesse ja püsivad lehe värskendamisel.
- Varasemad mängijad ja progress säilivad.


## v6.95 — Auto omahind ja kulude jälgimine
- Iga uue auto ostmisel salvestatakse eraldi ostuhind, transport ja registreerimiskulu.
- Iga tasutud diagnostika, remont ja kombineeritud tuuning lisatakse konkreetse auto kulukontole.
- Minu autod vaates kuvatakse kulude jaotus, kogukulu, minimaalne tasuv müügihind ja võrdlus ideaalse turuhinnaga.
- Varasemate autode puhul näidatakse ainult teadaolevat ostuhinda ja tähistatakse mittetäielik kulude ajalugu, mitte ei mõelda vanu kulusid välja. Edasised kulud salvestatakse.
- Garaaži laiendused, esindusoksjonid ja muud ettevõtte üldkulud ei lisandu suvaliselt ühe auto kuludesse.
- Olemasolevad kasutajakontod ja autod ei nullitu.


## V6.96 – lihtne Keskpanga statistika
- OWNER/admin Keskpanga juures kokkupandav „Keskpanga statistika“ plokk.
- Viimase 24 h ja 7 päeva laekumised, väljamaksed, vahe ning peamised tulu-/kululiigid.
- Raha ei liigutata; kuvatakse olemasoleva logi põhjal arvestatud summasid.
- Käigu- ja taotluste logid on euroraportist väljas; vanade logide puudulikkus on märgitud.
- Admini Keskpangast tehtavad väljamaksed ja raha likvideerimine salvestatakse nüüd samuti logisse.
- Olemasolev andmebaas ja mängijate progress jäävad puutumata.


## V6.97 – Autoäri kapitalisissemaksed
- Isiklikust sularahast saab autoäri kontole kanda 100 000 kuni 10 000 000 € ühe ülekandega.
- Liikuv 24-tunnine piir: kokku kuni 20 000 000 € ning maksimaalselt 3 sissemakset.
- Iga edukas sissemakse maksab 200 käiku. Ebaõnnestunud katse ei võta raha ega käike.
- Sissemakse ei ole müügitulu ega Keskpanga tulu; väljavõtmise senine 24% tasu jääb alles.
- Sissemaksete ajalugu salvestatakse mängija autoäri andmetesse ning vanad kontojäägid säilivad.


## v6.98 – kallid autod ja demilitariseeritud sõjaväetehnika
- Lisatud Rolls-Royce, Pagani, Koenigsegg, Rimac ja Maybach koos mitme uue mudeliga.
- Kasutatud autode turul eraldi sõjaväetehnika jaotis: maasturid, rasked veokid, transpordisõidukid ja ajaloolised soomukid. Kõik on demilitariseeritud ja ilma töötavate relvadeta.
- Eraldi avalikud 8-tunnised sõjaväetehnika hanked; 3 masinat voorus, võitja saab konkreetse masina oma autoparki.
- Pakkumised ja hanke võitjad kõigile nähtavad; mängija raha broneeritakse autoäri kontolt, kaotanutele tagastatakse.
- Ostetud sõjaväetehnikale rakenduvad autoäri hoiukoha, diagnostika, remondi ja NPC müügi süsteemid.
- Olemasolevat mängijate progressi ega varasemaid sõidukeid ei nullita.

## VARJURIIK v7.00 — kogu faili kontroll ja uute autode ostunuppude parandus

- Lähtutud täielikust VARJURIIK v6.99 PARANDATUD komplektist; varasemad mängusüsteemid säilivad.
- Uute esindusautode ostunupud ei ehita enam automargi ja mudeli nime otse JavaScripti `onclick` atribuuti. Ostukäsk on seotud eraldi klikikuulajaga ning mudeliandmed loetakse nupu `data-brand` / `data-model` atribuutidest.
- Lisatud ostunupu topeltvajutuse kaitse (nupp on ostupäringu ajal keelatud).
- Kliendipoolsel ostukäsul on vea püüdmine ja nähtav teavitus.
- Mängu `index.html` ei salvestata enam serveri vastuses brauseri vahemällu (`Cache-Control: no-store`), et mobiilibrauser ei näitaks pärast deploy'd vana koodi.
- HTML-is mängu pealkiri näitab v7.00.
- Kontrollitud täieliku `server.js` süntaks, mõlema brauseriskripti süntaks ning autokeskuse dünaamilised klikikäsud mitme näidisstsenaariumiga (Fiati esindus, kasutatud sõiduk, oma auto, tuuning, avalik oksjon ja sõjaväetehnika hange).
- Näidis-Fiat 500 ostunupu test saatis korrektse `/api/auto-world/buy` päringu: `{kind:'new',brand:'Fiat',model:'500'}`.
- **Piirang:** serveri integratsiooni- ja Renderi lõppkasutajatesti ei saanud siin käivitada, sest projektis vajalikud Express/Socket.IO/PostgreSQL sõltuvused ei olnud selles keskkonnas paigaldatud. Ükski test ei muutnud päris mängu andmebaasi.

Paigaldamine: tõsta ZIP-i failid projekti juurkausta (`server.js`, `package.json`, `README.md` ja `public/index.html`). Ära kirjuta üle tootmiskeskkonna andmebaasi ega `data` kausta. Pärast uut Deploy'd värskenda lehte.


## v7.01 — Autoäri edetabel ja üldskoor
- Autoäri dünaamiline skoor arvestatakse 100% mängija üldskoorile; mitte 25%.
- Avalik kokkupandav edetabel kasutajanimedega, müügiarvu, kasumi, konto ja autopargi väärtusega.
- Skoori kaalud: kasum 35%, müükide arv 25%, garaaž/õueplats 15%, autopark 10%, kehtivad esindused 10%, maine 5%; trahvid vähendavad skoori.
- Müügiarvestus algab versioonist v7.01, eelnevalt salvestamata tehinguid ei fabritseerita.
- Uued statistikaväljad lisatakse olemasolevale mängijale ilma olemasoleva progressi nullimiseta.

# VARJURIIK v7.02 — kambad ja mängija profiil

- Mängija nimele vajutades avaneb kohe mobiilis sobiv avalik profiili hüpikaken; ründamine on üksnes selles profiiliaknas. Rünne 30 käiku, valikuline kamba abi +50 käiku.
- Avalikus profiilis ei avaldata pangakontot, laene ega ründe- või kaitsejõudu; kuvatakse mängu olemasolevad andmed (kasutajanimi, üldskoor, sularaha, haridus, tase, linn, kinnisvara, kamp, roll ja aktiivsus).
- Kamba kaitse lisandub serveri võitlusarvestuses automaatselt: min(turvalevel,100)% kamba kaitsepunktidest. Oma avalehel näeb mängija isiklikku kaitset, kamba lisakaitset ja kogukaitset. Ründeabi: min(maffialevel,100)% kamba ründepunktidest, ainult eraldi kinnitusega.
- Avalik kampade skooride edetabel, omanik, liikmete arv; kampade avalikus vaates juht, abijuhid, liikmed, hoone, lisainfo. Relvaladu ja täpsed võitluspunktid jäävad ainult kamba liikmetele.
- Privaatne kamba foorum teemade ning vastustega; liikmesuse kontroll toimub serveris.
- Kamba hoone alustab 5 kohaga ja iga tasemeost annab +2 kohta, tasu ainult kamba ühiskassast. Ostuhind liigub mängu Keskpanka; olemasolevaid suuremaid kampasid ei lõhuta ega liikmeid eemaldata.
- Kõik muudatused on olemasoleva v7.01 versiooni peale, senist andmebaasi ei nullita; uued väljad täidetakse vajadusel vaikimisi.
- Testid: serveri ja brauseri JavaScripti süntaksikontroll. Live-Renderi serveri integratsioonitest ei ole tehtud.
