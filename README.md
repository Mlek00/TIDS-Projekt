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

# NALOGA 2
Izdelan je parser v datoteki src/parser.js, ki pridobi dejanske vremenske napovedi iz API-ja Open-Meteo. Koordinate 12-ih krajev prebere iz datoteke data/kraji.xml in za vsak kraj pridobi dnevno najvišjo temperaturo, vsoto padavin ter hitrost vetra.
Parser odgovor razčleni in poveže napovedi z identifikatorji krajev (krajId) ter jih shrani v data/napovedi-openmeteo.json. Konzolna aplikacija  v src/index.js nato prebere to datoteko, poveže napovedi z izleti ter omogoča filtriranje po kraju, datumu in padavinah.

zagon parserja z: npm run parse
zagon aplikacije v konzoli z: npm start

Vir: [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs).

# NALOGA 3
Projekt uporablja odprte podatke SURS na portalu OPSI:https://podatki.gov.si/dataset/surs2164525s -> "Prihodi in prenočitve domačih in tujih turistov, občine, Slovenija, letno". Izvorni podatki so v formatu PC-Axis (.PX).
Modul src/turizem.js prenese datoteko .PX, jo dekodira iz kodiranja Windows-1250 in razčleni s knjižnico px, zapise pa poveže s kraji projekta. Manjkajoče vrednosti so obravnavane kot "null" in zato niso prikazane kot nič.
Spletni strežni v src/server.js ob zahtevu /api/turizem znova pridobi podatke. V public/index.html pa te podatke prikaže s knjižnico Chart.js. Uporabnik lahko izbere kraj in meritev(prihod ali prenočitev turistov), graf pa nato primerja domače in tuje obiskovalce po letih.

Zagon strežnika za prikaz grafov: node src/server.js ; naslov: http://localhost:3000/
# NALOGA 4
Spletna aplikacija vključuje priporočilo izletov, ustvarjeno z Gemini API. Uporabnik izbere kraj in datum ter vpiše svojo željo o izletu. Strežnik za izbrani kraj prebere izlete iz data/izleti.xml, sproti pridobi vremensko napoved iz Open-Meteo in iz uporabnikovega vnosa ter teh podatkov sestavi dinamičen poziv za model`gemini-3.5-flash-lite. Odgovor modela je v obliki JSON po določeni shemi: vsebuje povzetek in seznam predlogov z ID-jem izleta, razlogom ter nasvetom. Modul src/priporocilo.js JSON pretvori v primerek razreda Priporocilo in preveri, da model predlaga samo izlete iz posredovanega seznama. Spletna stran priporočila prikaže pod obrazcem.

Za lokalni zagon je potreben Gemini API ključ v datoteki ".env" v korenski mapi:
GEMINI_API_KEY="Gemini_API_Kljuc"

Datoteka ".env" je izključena iz Gita. Po npm install strežnik zaženemo z:
node --env-file=.env src/server.js

Aplikacija je dostopna na http://localhost:3000. Izbrani datum mora biti v dosegu vremenske napovedi. Projekt uporablja brezplačno raven Gemini API z omejitvami ponudnika.
