const fs = require("fs");
const { XMLParser, XMLBuilder } = require("fast-xml-parser");
const readline = require("readline");

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

function readXML(pot){
    const xml = fs.readFileSync(pot, "utf-8");
    return parser.parse(xml);
}
    //kraji
const podatkiKraji = readXML("data/kraji.xml");
const kraji = podatkiKraji.kraji.kraj;
//console.log(kraji);
    //vreme
const podatkiVreme = JSON.parse(
    fs.readFileSync("data/napovedi-openmeteo.json", "utf8")
);
const vreme = podatkiVreme.napovedi;
//console.log(vreme);
    //izleti
const podatkiIzleti = readXML("data/izleti.xml");
const izleti = podatkiIzleti.izleti.izlet;
//console.log("PODATKI:");

const povezaniIzleti = izleti.map(izlet=>{
    const kraj = kraji.find(
        k => k["@_id"] === izlet["@_krajId"]
    );

    const napovedi = vreme.filter(
        v => v.krajId === izlet["@_krajId"]
    );

    return{
        id: izlet["@_id"],
        naziv: izlet.naziv,
        vrsta: izlet.vrsta,
        zahtevnost: izlet.zahtevnost,
        trajanje: izlet.trajanje,
        oprema: izlet.oprema,

        kraj: kraj ? kraj.ime : "neznan kraj",
        regija: kraj ? kraj.regija : null,

        napovedi: napovedi
    };
});

console.log("\nPovezani izleti:");
console.dir(povezaniIzleti[0], {depth: null});

/*
povezaniIzleti.forEach(izlet => {
    console.log(
        `${izlet.naziv} | ${izlet.kraj} | Napovedi: ${izlet.napovedi.length}`
    );
});
*/

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function vprasaj(vprasanje){
    return new Promise(resolve =>{
        r1.question(vprasanje, resolve);
    });
}

function filtrirajIzlete(kraj, datum, maxPadavine){
    const rezultati = [];

    povezaniIzleti.forEach(izlet => {

        if(kraj && izlet.kraj.toLowerCase() !== kraj.toLowerCase()){
            return;
        }
    
    izlet.napovedi.forEach(napoved => {

        if(datum && napoved.datum !== datum){
            return;
        }
        if(maxPadavine !== null && napoved.padavine > maxPadavine){
            return;
        }

            rezultati.push({
            id: izlet.id,
            naziv: izlet.naziv,
            kraj: izlet.kraj,
            datum: napoved.datum,
            temperatura: napoved.temperatura,
            padavine: napoved.padavine,
            veter: napoved.veter,
            oprema: izlet.oprema
            });
        });
    });
    return rezultati;
}

function izvoziRezultate(rezultati){

    const json = JSON.stringify(rezultati, null, 2);

    fs.writeFileSync("filtrirano.json", json, "utf-8");

    const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        indentBy: "    "
    });

    const xmlPodatki = {
        izleti: {
            izlet: rezultati.map((izlet, index)=> ({
            "@_id": `F${String(index + 1).padStart(3, "0")}`,
            "@_izletId": izlet.id,
            naziv: izlet.naziv,
            kraj: izlet.kraj,
            datum: izlet.datum,
            temperatura: izlet.temperatura,
            padavine: izlet.padavine,
            veter: izlet.veter,
            oprema: izlet.oprema
        }))
        }
    };

    const xml = builder.build(xmlPodatki);

    fs.writeFileSync("filtrirano.xml", xml, "utf-8");

    console.log("DAtoteki filtrirano.json in filtrirano.xml sta bili ustvarjeni");

}









//Main
async function main(){

    console.log("Filtriranje izdelkov:");

    const kraj = (await vprasaj("Vnesi kraj (click 'Enter' = vsi):")).trim();
    const datum = (await vprasaj("Vnesi datum(format YYYY-MM-DD, 'Enter' = ni omejitve):")).trim();
    const padavineVnos = (await vprasaj("Največ padavin v mm('Enter' = brez omejitve):")).trim();

    const maxPadavine = padavineVnos === ""
        ?null
        :Number(padavineVnos);

    if(maxPadavine !==null && (!Number.isFinite(maxPadavine) || maxPadavine < 0)){
        console.log("Error, vnesi nenegativno število");
        return;
    }

    const rezultati = filtrirajIzlete(kraj,datum,maxPadavine);
    console.log("Rezultati(izpis)");

    if(rezultati.length===0){
        console.log("Ni izletov, ki ustrezajo izbranim filtrom");
    }else{
        console.table(rezultati);
    }

    console.log("Najdenih rezultatov:", rezultati.length);

    izvoziRezultate(rezultati);
}
main().catch(console.error).finally(() => r1.close());
