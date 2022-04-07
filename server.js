const express = require('express')
const path = require('path')
const { nextTick } = require('process')
var helmet = require('helmet');
var fs = require('fs');
var http = require('http');
var https = require('https');

const app = express();
app.use(helmet());
app.enable('trust proxy');

//const PORT = 8080
const DEV = true;
const PORT = 80;
const HTTPSPORT = 443;


var sitemap = {
    "home": "Home page",
    "test": "test page"
}


app.use(function(request, response, next) {

  if (!request.secure && !DEV) {
     return response.redirect("https://" + request.headers.host + request.url);
  }

  next();
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Website/src/pages/index.html'));
  })

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../Website/src/pages/index.html'));
  })

  app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, '../Website/src/pages/test.html'));
  })

app.use('/assets/images', express.static(path.join(__dirname, '../Website/src/assets/images')))
app.use('/assets', express.static(path.join(__dirname, '../Website/public')))
app.use('/scripts', express.static(path.join(__dirname, '../Website/src/scripts')))
app.use('/css', express.static(path.join(__dirname, '../Website/src/css')))
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Website/src/pages/404.html'));
  })


var privateKey  = fs.readFileSync('C:/Certbot/live/georgie.fyi/privkey.pem', 'utf8');
var certificate = fs.readFileSync('C:/Certbot/live/georgie.fyi/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var httpsServer = https.createServer(credentials, app);
var httpServer = http.createServer(app);


httpServer.listen(PORT, () => {
  console.log(`App running on port ${PORT}`)
})

httpsServer.listen(HTTPSPORT, () => {
  console.log(`App running on port ${HTTPSPORT}`)
})

if (DEV){
  app.listen(8080, () => {
    console.log(`App running on port 8080`)
  })
}
