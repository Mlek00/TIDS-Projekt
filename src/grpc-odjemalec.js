const path = require("node:path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const protoPot = path.join(__dirname, "..", "proto", "izleti.proto");
const definicija = protoLoader.loadSync(protoPot, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const { IzletService } = grpc.loadPackageDefinition(definicija).izleti;

function ustvariOdjemalca() {
    return new IzletService(
        "127.0.0.1:50051",
        grpc.credentials.createInsecure()
    );
}

if (require.main === module) {
    const odjemalec = ustvariOdjemalca();

    odjemalec.SeznamKrajev({}, (napaka, odgovor) => {
        if (napaka) {
            console.error("Napaka pri pridobivanju krajev:", napaka);
            odjemalec.close();
            return;
        }

        console.log("Število krajev:", odgovor.kraji.length);
        console.log("Prvi kraj:", odgovor.kraji[0]);

        const krajId = process.argv[2] || odgovor.kraji[0].id;

        odjemalec.IzletiZaKraj({ kraj_id: krajId }, (napaka, odgovor) => {
            if (napaka) {
                console.error("Napaka pri pridobivanju izletov:", napaka);
            } else {
                console.log(`Izleti za kraj ${krajId}:`);
                console.table(odgovor.izleti);
            }

            odjemalec.close();
        });
    });
}

module.exports = { ustvariOdjemalca };