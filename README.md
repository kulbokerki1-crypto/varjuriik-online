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
