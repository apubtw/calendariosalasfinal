const express = require("express");
const path = require("path");
const axios = require("axios");
const morgan = require("morgan"); // Logging middleware
const { RRule, rrulestr } = require("rrule"); // Importar RRule
const { icsUrls } = require("./config/calendar-config");

const app = express();
const port = 3000;

app.use(morgan("combined")); // Use morgan for logging
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/** Outlook/OWA a veces exige un perfil de petición parecido al navegador (evitar 400). */
const icsAxiosConfig = {
  timeout: 30000,
  maxRedirects: 5,
  headers: {
    Accept: "text/calendar,text/plain,*/*;q=0.8",
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.7",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Referer: "https://outlook.office365.com/owa/",
  },
  validateStatus: () => true,
};

app.get("/ics/:room", async (req, res) => {
  const room = decodeURIComponent(req.params.room); // Decode the room name
  console.log("Room requested:", room);
  if (!icsUrls[room]) {
    return res.status(404).send("URL no encontrada");
  }

  try {
    const response = await axios.get(icsUrls[room], icsAxiosConfig);
    if (response.status < 200 || response.status >= 300) {
      console.error(
        "ICS upstream HTTP",
        response.status,
        room,
        icsUrls[room]
      );
      if (
        response.status === 400 &&
        response.data != null &&
        typeof response.data === "string"
      ) {
        const hint = response.data.replace(/\s+/g, " ").trim().slice(0, 280);
        if (hint) console.error("ICS 400 cuerpo (recorte):", hint);
      }
      return res
        .status(502)
        .send(`El origen del calendario respondió HTTP ${response.status}`);
    }
    res.set("Content-Type", "text/calendar");
    res.send(response.data);
  } catch (error) {
    const detail =
      error.response != null
        ? `HTTP ${error.response.status}`
        : error.message || String(error);
    console.error("Error fetching ICS file:", detail, room);
    res.status(500).send("Error al obtener el archivo .ics");
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});