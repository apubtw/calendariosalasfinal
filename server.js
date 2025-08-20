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
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/a0ad27548c1c4d17bd6de44bdcbaac51707574365493584925/calendar.ics",
      "FHGCP DECANATO SALA CONSEJO FACULTAD 👤25":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/4cba199c6466429dbe5eeccacc4ee4cc1280787131942128037/calendar.ics",
      "FHGCP SALA CONSEJO CIENCIA POLITICA 👤12":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/9ebb8e393e3c4b7ea826cec235e28fcc4163901858859466902/calendar.ics",
      "FHGCP SALA CONSEJO GEOGRAFIA 👤8":
        "http://outlook.office365.com/owa/calendar/4b0b3a0a1fc6489b87524b9b7ed9c687@uc.cl/8d66e4c06f5e4b4692af362963a98da03628685577008031525/calendar.ics",
      "FHGCP SALA CONSEJO HISTORIA 👤12":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/8f820fe3c7f44ed89a4cba45e25059cf5916755005309354082/calendar.ics",
      "FHGCP SALA SIMULACION ICP 1 👤25":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/d8ad107659ff45688d71986a1ff1bdea4191855137671217506/calendar.ics",
      "FHGCP SALA SIMULACION ICP 2 👤35":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/6d8e954e24db4a99a848d49a714497e913370319527010283519/calendar.ics",
      "FHGCP SALA DOCTORADO CIENCIA POLITICA 👤12":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/5c88f558df38410f9daea0d77aa71d529970456336550474037/calendar.ics",
      "FHGCP SALA DOCTORADO GEOGRAFIA 👤10":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/f0224482db574219ad94fe9ae52c6ca04585519317557358076/calendar.ics",
      "FHGCP_PASILLO_2DO_PISO_👤40":
        "http://outlook.office365.com/owa/calendar/24e8cbb9d1424f5d81f3c5d20f9953fd@uc.cl/5c8857a5528e4661aa906d6bc180eb4a6372096918242644660/calendar.ics",
      "FHGCP SALA POSTGRADO HISTORIA 👤10":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/c3b48916586640eab1e50da622d099a418067958400765017998/calendar.ics",
      "FHGCP SALA REUNIONES A 7 👤10":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/120d13ec043e490b8165867b68b27e9118025989541280493575/calendar.ics",
      "FHGCP SALA USOS MULTIPLES 👤22":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/6c91932a0de541c3b05a8ef1c4764ba314100958707069186750/calendar.ics",
      "FHGCP SEMINARIO 1 👤20":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/06563fa029cf45eabbc316217c589c6710661106583453533547/calendar.ics",
      "FHGCP SEMINARIO 3 👤20":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/60cd401e6d924d04bc193e4bd51c99843051329826593012105/calendar.ics",
      "FHGCP SEMINARIO 4 👤14":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/a0838498c72642b5ba19f5b642e9864b4211631172097908883/calendar.ics",
      "FHGCP SEMINARIO 5 👤14":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/6802f81d14634476991b7a187d2a9d212612002183572204460/calendar.ics",
      "FHGCP SEMINARIO 6 👤12":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/3c06d828811349978116158df637d26f16742055330210283400/calendar.ics",
      "FHGCP SEMINARIO FACULTAD 👤41":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/a0b8f33c6b0944f8b0d2c309d20e7037812544073743176903/calendar.ics",
      "FHGCP TERRAZA 👤50":
        "https://outlook.office365.com/owa/calendar/1b3e56414b82479fa4b82073497d1e38@uc.cl/f3008c0a5f944aa8b35933dae17810dc9850426923127246455/calendar.ics",
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