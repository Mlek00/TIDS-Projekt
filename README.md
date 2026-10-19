# TIDS-Projekt
Pomoč pri načrtovanju izletov


# Dokumentacija:
ARSO - pridobi meteorološke podatke in vremenska opozorila za Slovenijo. Aplikacija bo te podatke uporabljala za obveščanje/svetovanje uporabniku o vremenskih razmerah(vhod: izbran kraj in datum, izhod: vremenske razmere za naveden kraj ob navedenem datumu). dokumentacija na https://meteo.arso.gov.si/met/sl/service/

OPEN-Meteo - Weather Forecast API - za pridobivanje vremenskih napovedi za izbran kraj. Omogoča bolj podroben opis vremenskih razmer, dostopen na https://open-meteo.com/en/docs  (vhod: koordinate kraja in izbrani vremenski parametri, izhod: vremenska napoved na lokaciji ob izbranem datumu).

OpenStreetMap - Overpass API - ob vnosu kraja, bo poiskal geografske objekte("znamenitosti"), pridobljene z/na https://wiki.openstreetmap.org/wiki/Overpass_API , ki bodo nato predlagane uporabniku(vhod: izbran kraj, izhod: seznam zanimivosti v obliki formata json).

# Opis podatkov (podatek, tip, "oblika" zapisa)
Kraj izleta (String, ime kraja)
Datum (Num/String, YYYY-MM-DD)
Temperatura(Num, °C)
Padavine(Num, mm)
Hitrost vetra(Num, km/h)
Vremenska opozorila (String/txt field, Odvisna od ARSO)
Zanimivosti(Seznam, JSON/XML)

# NALOGA 1
V okviru prve naloge je izdelana konzolna aplikacija v Javascriptu(Node.js), s katero je omogočeno branje, povezovanje in filtriranje podatkov iz XML datotek in izvozov v XML in JSON.
-za to nalogo so bili uporabljeni začasni podatki, zapisani v treh XML datotekah kraji.xml(12 entitet), vreme.xml(15 entitet) in izleti.xml(15 entitet). Datoteke oziroma zapisi podaktov so povezane preko atributa krajId, ki se sklicuje na atribut "id" v kraji.xml.

Uporabljene tehnologije: 
-JavaScript in Node.js
-Knjižnica fast-xml-parser
-JSON in XML 

NAMESTITEV IN ZAGON:
Za zagon programa je potrebno imeti nameščen Node.js (namestitev z "npm install" in zagon z "npm start").

Program uporabnika vpraša po kraju, datumu in največji dovoljeni/željeni količini padavin. Posamezen filter, je možno preskočiti(v smislu, da uporabnik nima specifičnih želj) s pritiskom tipke enter.

PRIMER UPORABE
Vnesi kraj: Celje
Vnesi datum: 2026-10-20
Največ padavin v mm: 5

REZULTAT
po zgornje vnevnešenih podatkih dobimo dva izleta: Celjski grad in Šmartinsko jezero

IZVOZ REZULTATOV
program filtrirane podatke izpiše v konzolo in jih shrani v "filtrirano.json" in "filtrirano.xml". Ob ponovnem zagonu programa se izhodni datoteki posodobita glede na vnešene podatke.
