# TIDS-Projekt
Pomoč pri načrtovanju izletov


# Dokumentacija:
ARSO - pridobi meteorološke podatke in vremenska opozorila za Slovenijo. Aplikacija bo te podatke uporabljala za obveščanje/svetovanje uporabniku o vremenskih razmerah(vhod: izbran kraj in datum, izhod: vremenske razmere za naveden kraj ob navedenem datumu). dokumentacija na https://meteo.arso.gov.si/met/sl/service/

OPEN-Meteo - Weather Forecast API - za pridobivanje vremenskih napovedi za izbran kraj. Omogoča bolj podroben opis vremenskih razmer, dostopen na https://open-meteo.com/en/docs  (vhod: koordinate kraja in izbrani vremenski parametri, izhod: vremenska napoved na lokaciji ob izbranem datumu).

OpenStreetMap - Overpass API - ob vnosu kraja, bo poiskal geografske objekte("znamenitosti"), pridobljene z/na https://wiki.openstreetmap.org/wiki/Overpass_API , ki bodo nato predlagane uporabniku(vhod: izbran kraj, izhod: seznam zanimivosti v obliki formata json).
