const express = require("express");
const path = require("path");
const axios = require("axios");
const morgan = require("morgan"); // Logging middleware
const { RRule, rrulestr } = require("rrule"); // Importar RRule

const app = express();
const port = 3000;

// Define your ICS URLs mapping
const icsUrls = {
  /*"FHGCP LABORATORIO HISTORIA DIGITAL (BLOQUEADA)":
"http://outlook.office365.com/owa/calendar/0f52822f5d1443ca9da46abe398d3cad@uc.cl/bd3e7f72cc844f38a9cc0d517cd0660616195049527368204434/calendar.ics",*/
  "FHGCP DECANATO AUDITORIO 👤126":
    "http://outlook.office365.com/owa/calendar/e857cbdab6ea47749bc06e0adc9dbb73@uc.cl/05c7b41e95694645bfda2c3b084ade8014595092356990759330/calendar.ics",
  "FHGCP DECANATO SALA CONSEJO FACULTAD 👤25":
    "http://outlook.office365.com/owa/calendar/f03c42313f964c819b4aecd10a62f81f@uc.cl/46e74d9c80a945e384f3971b525ea76e11052745610678742020/calendar.ics",
  "FHGCP DECANATO SALA REUNIONES 👤10":
    "http://outlook.office365.com/owa/calendar/0d1da151aef7420190fb315b6d4dfadc@uc.cl/7317cf9f67ea4dd8b91c5daa82d595867171139558961955839/calendar.ics",
  "FHGCP LABORATORIO DE GEOMATICA 👤14":
    "http://outlook.office365.com/owa/calendar/046148a2e92a42f9a6b2d31973ec711f@uc.cl/b8812806946548e79cc1ccdda6926e3c9063704853347367516/calendar.ics",
  /*"FHGCP SALA ATACAMA (BLOQUEADA)":
"http://outlook.office365.com/owa/calendar/b5117cef0ec94991a099c3561b707736@uc.cl/1db1373dffb64e47a946c80071e8e38d5796220034483856327/calendar.ics",*/
  "FHGCP SALA CONSEJO CIENCIA POLITICA 👤12":
    "http://outlook.office365.com/owa/calendar/bd828681f6ba4d2aa117aafc856c98f9@uc.cl/bce644202ac3415e9ef3d79469981e4f15364390778314373260/calendar.ics",
  "FHGCP SALA CONSEJO GEOGRAFIA 👤8":
    "http://outlook.office365.com/owa/calendar/4b0b3a0a1fc6489b87524b9b7ed9c687@uc.cl/8d66e4c06f5e4b4692af362963a98da03628685577008031525/calendar.ics",
  "FHGCP SALA CONSEJO HISTORIA 👤12":
    "http://outlook.office365.com/owa/calendar/ec65ead6c8564a17ac3ea480542fe5fa@uc.cl/0318f94758864b32a68ac0567319535b8003472245692917270/calendar.ics",
  "FHGCP SALA DOCTORADO CIENCIA POLITICA 👤12":
    "http://outlook.office365.com/owa/calendar/22c286212fae46b994a3ce3a8de2065c@uc.cl/a5bcf5a0d1a44f138c0ebcf10e01b75d5615022796294095401/calendar.ics",
  "FHGCP SALA DOCTORADO GEOGRAFIA 👤10":
    "http://outlook.office365.com/owa/calendar/0253785e99494b18859b3cd9020aa93a@uc.cl/643ef88f85324b359beb359e913e26c66644004865990384362/calendar.ics",
  "FHGCP SALA HUMANIDADES 1 👤4":
    "http://outlook.office365.com/owa/calendar/235b2e37013147b0999557e26748d96b@uc.cl/c8e962a0d7d4479d81ae6fa110f8f65a16714046150349654577/calendar.ics",
  "FHGCP SALA HUMANIDADES 2 👤4":
    "http://outlook.office365.com/owa/calendar/598fea8e95f543ba8b521b49fc384ba2@uc.cl/4ca8de726ca9473190872a6735eb84a616695268912745945723/calendar.ics",
  "FHGCP SALA HUMANIDADES 3 👤4":
    "http://outlook.office365.com/owa/calendar/854f687d101745b481c3892f5ff6f2d1@uc.cl/38f78a1f13d1434e8eb91d645dd4547810658958581129542550/calendar.ics",
  "FHGCP SALA HUMANIDADES 4 👤4":
    "http://outlook.office365.com/owa/calendar/bc6e41c921704d3293d6ddcc403062cc@uc.cl/64b37ec71d7148859fc10832f63b219c1386908969546599371/calendar.ics",
  "FHGCP SALA POSTGRADO HISTORIA 👤10":
    "http://outlook.office365.com/owa/calendar/266599e201af412ea7dae37017d005d9@uc.cl/192bfa5db8de4aa2ac7349d5f0c8b18715751757247432996149/calendar.ics",
  "FHGCP SALA REUNIONES POSTGRADO 👤10":
    "http://outlook.office365.com/owa/calendar/e02e143a5a9046a09b1a3617d9ce77a1@uc.cl/d3162863aa504a359b72db03c50a1b6110851382597755342633/calendar.ics",
  "FHGCP SALA USOS MULTIPLES 👤22":
    "http://outlook.office365.com/owa/calendar/00a05e5068504048b8219caa353bb694@uc.cl/e30ae1041cf641ae91784c7b661367306773761822066238338/calendar.ics",
  "FHGCP SEMINARIO 1 👤20":
    "http://outlook.office365.com/owa/calendar/f629bb8381d74e0d983c7b3a7046bd9d@uc.cl/7c7ff6bd15b145feb486c1038123e85b9030138489073154610/calendar.ics",
  "FHGCP SEMINARIO 3 👤20":
    "http://outlook.office365.com/owa/calendar/784fbbe196e6488fa3ccf1188110b51d@uc.cl/843b2e2da6bd44a3bf3ebaa4fc1261378700988533943244368/calendar.ics",
  "FHGCP SEMINARIO 4 👤14":
    "http://outlook.office365.com/owa/calendar/36640d39764643ec9478ecabeaf12fac@uc.cl/60ef724d838749ebbd1508696831d3e03505045718671364020/calendar.ics",
  "FHGCP SEMINARIO 5 👤14":
    "http://outlook.office365.com/owa/calendar/fb1053ad62dc4080a7dae63e4e611066@uc.cl/bc7ee4f56c4d4f269b9ec65fa5f4a57a15500861614651285450/calendar.ics",
  "FHGCP SEMINARIO 6 👤10":
    "http://outlook.office365.com/owa/calendar/09429815e1a34cc0bb43e98250bbf0c6@uc.cl/907f486c650149fa91869781aadefaeb4501534105365124751/calendar.ics",
  "FHGCP SEMINARIO FACULTAD 👤41":
    "http://outlook.office365.com/owa/calendar/cb9d40caf77c43629fdb9f7cb9249afb@uc.cl/2f99deb939944c9a9de027ccc2e821497528731868425315838/calendar.ics",
  "FHGCP TERRAZA 👤50":
    "http://outlook.office365.com/owa/calendar/3033c0791e414b4fa60cc29a059e4037@uc.cl/988ff7fb55c14d42b29b01c0860b7c0e3542970083574507192/calendar.ics",
  /*"FHGCP SALA PATAGONIA (BLOQUEADA)":
"http://outlook.office365.com/owa/calendar/b32f2d9add9849fdb80f435fccfda899@uc.cl/ab223c3d83b7461fa7ad0da90adb50771180359976278031607/calendar.ics",*/
};


app.use(morgan("combined")); // Use morgan for logging
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/ics/:room", async (req, res) => {
  const room = decodeURIComponent(req.params.room); // Decode the room name
  console.log("Room requested:", room);
  if (!icsUrls[room]) {
    return res.status(404).send("URL no encontrada");
  }

  try {
    const response = await axios.get(icsUrls[room]);
    res.set("Content-Type", "text/calendar");
    res.send(response.data);
  } catch (error) {
    console.error("Error fetching ICS file:", error); // Log error details
    res.status(500).send("Error al obtener el archivo .ics");
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});