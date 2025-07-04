const express = require("express");
const path = require("path");
const axios = require("axios");
const morgan = require("morgan"); // Logging middleware
const { RRule, rrulestr } = require("rrule"); // Importar RRule

const app = express();
const port = 3000;

// Define your ICS URLs mapping
    const icsUrls = {
      "FHGCP DECANATO AUDITORIO 👤126":
        "http://outlook.office365.com/owa/calendar/e857cbdab6ea47749bc06e0adc9dbb73@uc.cl/d0a1d7bd96104de8a2885a139f3f52a812222981494403014183/calendar.ics",
      "FHGCP DECANATO SALA CONSEJO FACULTAD 👤25":
        "http://outlook.office365.com/owa/calendar/f03c42313f964c819b4aecd10a62f81f@uc.cl/46e74d9c80a945e384f3971b525ea76e11052745610678742020/calendar.ics",
      "FHGCP SALA CONSEJO CIENCIA POLITICA 👤12":
        "http://outlook.office365.com/owa/calendar/bd828681f6ba4d2aa117aafc856c98f9@uc.cl/bce644202ac3415e9ef3d79469981e4f15364390778314373260/calendar.ics",
      "FHGCP SALA CONSEJO GEOGRAFIA 👤8":
        "http://outlook.office365.com/owa/calendar/4b0b3a0a1fc6489b87524b9b7ed9c687@uc.cl/8d66e4c06f5e4b4692af362963a98da03628685577008031525/calendar.ics",
      "FHGCP SALA CONSEJO HISTORIA 👤12":
        "http://outlook.office365.com/owa/calendar/ec65ead6c8564a17ac3ea480542fe5fa@uc.cl/0318f94758864b32a68ac0567319535b8003472245692917270/calendar.ics",
      "FHGCP SALA SIMULACION ICP 1 👤25":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/d8ad107659ff45688d71986a1ff1bdea4191855137671217506/calendar.ics",
      "FHGCP SALA SIMULACION ICP 2 👤35":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/6d8e954e24db4a99a848d49a714497e913370319527010283519/calendar.ics",
      "FHGCP SALA DOCTORADO CIENCIA POLITICA 👤12":
        "http://outlook.office365.com/owa/calendar/22c286212fae46b994a3ce3a8de2065c@uc.cl/11b08aaa23b1496a975dc8e0d4edba8017693345453152152852/calendar.ics",
      "FHGCP SALA DOCTORADO GEOGRAFIA 👤10":
        "http://outlook.office365.com/owa/calendar/0253785e99494b18859b3cd9020aa93a@uc.cl/643ef88f85324b359beb359e913e26c66644004865990384362/calendar.ics",
      "FHGCP_PASILLO_2DO_PISO_👤40":
        "http://outlook.office365.com/owa/calendar/24e8cbb9d1424f5d81f3c5d20f9953fd@uc.cl/5c8857a5528e4661aa906d6bc180eb4a6372096918242644660/calendar.ics",
      "FHGCP SALA POSTGRADO HISTORIA 👤10":
        "http://outlook.office365.com/owa/calendar/266599e201af412ea7dae37017d005d9@uc.cl/907a3a56b4824e2b91645bce68bc63fa10389989847251766703/calendar.ics",
      "FHGCP SALA REUNIONES A 7 👤10":
        "http://outlook.office365.com/owa/calendar/e02e143a5a9046a09b1a3617d9ce77a1@uc.cl/bef4c7d5707045c98d25053e2a8dc84710273173691635514074/calendar.ics",
      "FHGCP SALA USOS MULTIPLES 👤22":
        "http://outlook.office365.com/owa/calendar/00a05e5068504048b8219caa353bb694@uc.cl/3e183dff169d4128bd52d2f0eb18334c12070276114048093466/calendar.ics",
      "FHGCP SEMINARIO 1 👤20":
        "http://outlook.office365.com/owa/calendar/f629bb8381d74e0d983c7b3a7046bd9d@uc.cl/7c7ff6bd15b145feb486c1038123e85b9030138489073154610/calendar.ics",
      "FHGCP SEMINARIO 3 👤20":
        "http://outlook.office365.com/owa/calendar/784fbbe196e6488fa3ccf1188110b51d@uc.cl/843b2e2da6bd44a3bf3ebaa4fc1261378700988533943244368/calendar.ics",
      "FHGCP SEMINARIO 4 👤14":
        "http://outlook.office365.com/owa/calendar/36640d39764643ec9478ecabeaf12fac@uc.cl/fa3d4b51c8fa4ce3a3c0b02bc6b29f1c8366792189579227678/calendar.ics",
      "FHGCP SEMINARIO 5 👤14":
        "http://outlook.office365.com/owa/calendar/fb1053ad62dc4080a7dae63e4e611066@uc.cl/bc7ee4f56c4d4f269b9ec65fa5f4a57a15500861614651285450/calendar.ics",
      "FHGCP SEMINARIO 6 👤12":
        "http://outlook.office365.com/owa/calendar/09429815e1a34cc0bb43e98250bbf0c6@uc.cl/907f486c650149fa91869781aadefaeb4501534105365124751/calendar.ics",
      "FHGCP SEMINARIO FACULTAD 👤41":
        "http://outlook.office365.com/owa/calendar/cb9d40caf77c43629fdb9f7cb9249afb@uc.cl/2f99deb939944c9a9de027ccc2e821497528731868425315838/calendar.ics",
      "FHGCP TERRAZA 👤50":
        "http://outlook.office365.com/owa/calendar/3033c0791e414b4fa60cc29a059e4037@uc.cl/7e8ac378f3d04f58b14b7a1a3787b8174085635423058249854/calendar.ics",
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