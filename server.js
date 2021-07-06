const _ = require('koa-route');
const Koa = require('koa');
const cors = require('@koa/cors');
var bodyParser = require('koa-bodyparser');

const app = new Koa();
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
let moment = require('moment');
moment.locale('id');
let Terbilang = require('terbilang');
app.use(cors())
app.use(bodyParser());

// USB INTERFACE
let USB_INTERFACE = '/dev/ttys008';
const printer = {
    printAntrian: async (ctx) => {
        const selectedPrinter = ctx.request.body.printer;
        console.log(selectedPrinter)
        const compro = ctx.request.body.compro;
        let printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: `tcp://${selectedPrinter.ip}:${selectedPrinter.port}`
        });
        let isConnected = await printer.isPrinterConnected();
        console.log("Printer connected:", isConnected);
        printer.alignCenter();
        await printer.printImage(__dirname +'/public/assets/logo_ahass.png');

        printer.drawLine();
        printer.println(compro['name']);
        printer.println(compro['phone']);
        printer.drawLine();

        if (ctx.request.body.nopol) {
            printer.add(Buffer.from([0x1d, 0x21, 0x11]))
            printer.println("Nomor Polisi");
            printer.add(Buffer.from([0x1d, 0x21, 0x33]))
            printer.setTypeFontB();
            printer.println(ctx.request.body.nopol);
        }
        if (ctx.request.body.number) {
            printer.setTypeFontA();
            printer.newLine();
            printer.add(Buffer.from([0x1d, 0x21, 0x11]))
            printer.println("Nomor Antrian");
            printer.setTypeFontB();
            printer.add(Buffer.from([0x1d, 0x21, 0x33]))
            printer.println(ctx.request.body.number);
        }

        printer.setTypeFontA();
        printer.setTextNormal();
        printer.newLine();
        printer.drawLine();
        printer.println(`Terimakasih atas kunjungan anda!`);
        printer.add(Buffer.from([0x1b, 0x34, 0x01]))
        printer.println(moment().format('dddd, DD-MM-YYYY hh:mm'));
        printer.cut();

        try {
            await printer.execute();
            ctx.response.body = {
                message: "Success"
            };
            return ctx.response
        } catch (error) {
            ctx.response.status = 500;
            ctx.response.body = error;
            return ctx.response
        }
    },
    printNotaServis: async (ctx) => {
        // console.log(ctx.request.body)
        const selectedPrinter = ctx.request.body.printer;
        const compro = ctx.request.body.compro;
        let printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: USB_INTERFACE
        });
        let isConnected = await printer.isPrinterConnected();
        let workorder = ctx.request.body;
        let payment = ctx.request.body.payment;
        let sukucadang = ctx.request.body.spareparts
        let jasa = ctx.request.body.services
        let totalPart = 0;
        let totalJasa = 0;
        let motor = ctx.request.body.motorcycle
        console.log(motor);
        let invoiceNotes = ctx.request.body.invoiceNotes;
        printer.alignCenter();
        await printer.printImage(__dirname +'/public/assets/logo_ahass.png');

        printer.drawLine();
        printer.println(compro['name']);
        printer.println(compro['phone']);
        printer.drawLine();

        printer.setTextQuadArea();
        printer.println(`NOTA SERVIS`);
        printer.setTextNormal();
        printer.println(`${workorder.code}`);
        printer.newLine();

        printer.alignLeft();
        printer.println(`NAMA: ${workorder.customer.fullName}`);
        printer.println(`TLP/WA: ${workorder.customer.phone}`);
        printer.println(`NOPOL: ${workorder.csmotorcycle.nopol}`);
        printer.println(`Merk Motor: ${motor.motorcycles.name}`);
        console.log(`Merk Motor: ${motor.motorcycles.name}`)
        printer.println(`Tahun Motor: ${motor.year}`);
        console.log(`Tahun Motor: ${motor.year}`)

        if (workorder.type === 'PKB') {
            printer.println(`MEKANIK: ${workorder.mechanic.fullName}`);
            printer.println(`KM: ${workorder.km_service}`);
            printer.println(`KM Service Selanjutnya: ${workorder.km_service+2000}`);
            console.log(`KM Service Selanjutnya: ${workorder.km_service+2000}`)
        }
        // printer.println(`NO. PKB: ${workorder.code}`);
        printer.newLine();

        printer.drawLine();
        printer.tableCustom([{
                text: `SPAREPART`,
                align: `CENTER`,
                width: 0.5,
                bold: true
            },
            {
                text: `QTY`,
                align: `CENTER`,
                width: 0.15,
                bold: true
            },
            {
                text: `HARGA`,
                align: `CENTER`,
                width: 0.35,
                bold: true
            }
        ]);
        printer.drawLine();
        for (let index = 0; index < sukucadang.length; index++) {
            printer.tableCustom([{
                    text: `${sukucadang[index].sparepart.name} ${sukucadang[index].disc > 0 ? ' | disc' + sukucadang[index].disc+' %': ''}`,
                    align: `CENTER`,
                    width: 0.5
                },
                {
                    text: `${sukucadang[index].qty}`,
                    align: `CENTER`,
                    width: 0.15
                },
                {
                    text: `${sukucadang[index].total}`,
                    align: `CENTER`,
                    width: 0.35
                }
            ]);
            totalPart += sukucadang[index].total
        }

        printer.bold(true);
        printer.newLine();
        printer.alignRight();
        printer.println(`TOTAL PART: ${totalPart}`);
        if (workorder.type === 'PKB') {
            printer.newLine();
            printer.drawLine();
            printer.tableCustom([{
                    text: `NAMA JASA`,
                    align: `CENTER`,
                    width: 0.5,
                    bold: true
                },
                {
                    text: `HARGA`,
                    align: `CENTER`,
                    width: 0.35,
                    bold: true
                }
            ]);
            printer.drawLine();
            for (let index = 0; index < jasa.length; index++) {
                printer.tableCustom([{
                        text: `${jasa[index].service.name} ${jasa[index].disc > 0 ? ' | disc' + jasa[index].disc+' %': ''}`,
                        align: `CENTER`,
                        width: 0.5
                    },
                    {
                        text: `${jasa[index].total}`,
                        align: `CENTER`,
                        width: 0.35
                    }
                ]);
                totalJasa += jasa[index].total
            }
            printer.bold(true);
            printer.newLine();
            printer.alignRight();
            printer.println(`TOTAL JASA: ${totalJasa}`);
        }

        printer.newLine();
        printer.alignLeft();
        printer.bold(true);
        if (payment.isAddCost) {
            for (let index = 0; index < payment.biayaTambahan.length; index++) {
                printer.println(`${payment.biayaTambahan[index].name}: ${payment.biayaTambahan[index].cost}`);
            }
        }
        printer.println(`Diskon: ${payment.disc}%`);
        printer.println(`Total: ${payment.totalAfterDisc}`);
        printer.println(`Terbilang: ${Terbilang(payment.totalAfterDisc)}`);
        printer.newLine();
        printer.println(`Pembayaran: ${payment.payment_type}`);
        if (payment.payment_type === 'CASH') {
            printer.println(`Bayar: ${payment.bayar}`);
            printer.println(`Kembali: ${payment.bayar - (payment.total - (payment.total*(payment.disc/100)))}`);
        } else {
            printer.println(`BANK: ${payment.edcmachine.bank}`);
            printer.println(`Nomor Kartu: ${payment.card_number}`);
        }

        printer.newLine();
        printer.newLine();
        printer.bold(false);
        printer.println(`Petugas: ${payment.petugas.fullName}`);

        printer.newLine();
        printer.println(`Saran Mekanik:`);
        printer.println(`${workorder.catatan_mekanik}`.toUpperCase());
        console.log(`Saran Mekanik: ${workorder.catatan_mekanik}`.toUpperCase());
        printer.newLine();
        printer.println(`Catatan:`);
        for (let index = 0; index < invoiceNotes.length; index++) {
            printer.println(' - ' + invoiceNotes[index].text);
        }
        printer.newLine();
        printer.drawLine();
        printer.alignCenter();
        printer.println(`Terimakasih atas kunjungan anda!`);
        printer.println(moment().format('dddd, DD-MM-YYYY hh:mm'));
        printer.cut();

        try {
            await printer.execute();
            ctx.response.body = {
                message: "Success"
            };
            return ctx.response
        } catch (error) {
            ctx.response.status = 500;
            ctx.response.body = error;
            return ctx.response
        }
    }
};

app.use(_.post('/print/antrian', printer.printAntrian));
app.use(_.post('/print/kasir', printer.printNotaServis));
app.listen(8000);
console.log('listening on port 8000');
