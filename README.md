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
