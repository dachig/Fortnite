import axios from 'axios';
import express from 'express';
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('port', 4000);
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({ extended: true }));
let apiImages:any= [];
let apiWapons:any= []; // deze variabele wordt later gedeclareerd
let apiBackpack:any= []; // deze variabele wordt later gedeclareerd
let blacklist:any = [];
let favorietAvatars:any=[]; // deze variabele wordt later gedeclareerd
app.get('/', (req, res) => {
  res.render("landingpage");
});

app.get('/fortniteHome', async (req, res) => {
  // Een GET-request uitvoeren naar een externe API om gegevens over Fornite items op te halen
  let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  let record = fortniteResponse.data; //hier wordt de data in record variabele gestoken
  let avatars= []; // hier declaren we dat array variable 'avatars' leeg is
  try {
    for (let i = 0; i < record.data.length; i++) {
      let random = Math.floor(Math.random() * 1000); //Hier zoeken we een random getal tussen 0 en 1000
      let item = record.data[random].item; // in de data object in the api zit namelijk een item object => dat stellen we gelijk met de random
      if (item.type === "outfit") { // in de item.type zitten verschillende soorten 'teksten' zoals outfit,backpack etc.. daarom filteren
        let avatar = { //hier zorgen we ervoor dat we object aanmaken met de gegevens die wij willen
          name: record.data[random].item.name,
          description: record.data[random].item.description,
          type: record.data[random].item.type,
          rarity:record.data[random].item.rarity,
          series: record.data[random].item.series,
          images: record.data[random].item.images.icon
        };
        avatars.push(avatar);//hier zorgen we ervoor dat we de item die we aanmaken wordt gepushed
        apiImages.push(avatar);// Waarom er hier 2 pushes staan, is omdat wanneer er refreshed worden er telkens andere random object(avatar) staan
      }
    }
  }
  catch (error) { //als er een error voorkomt we naar de error.ejs file wordt gerenderd
    console.log(error);
  }
  res.render("fortniteHome", {
    avatarImage: avatars  //hier stellen we vast dat object avatars op de forniteHome kan opgeroepen worden door avatarImage
  });
});
let favoriteImages:any = []; // we maken eerst een lege array variabele met de naam favoriteImages
app.post('/favoriet', (req, res) => { //Hier zorgen we wanneer er een form post wordt doorgestuurd opgevangen word met de action pad /favoriet
  let name = req.body.name; //Hier vangen we name die wordt doorgestuurd uit de post request. Name is namelijk de name die we vaststellen in de form name.
  let image = req.body.image; //Hier wordt hetzelfde gedaan
// Hier zoeken we de index in de apiImages of de image die we opvangen hetzelfde is dat van de apiImages.images
  let apiImageIndex = apiImages.findIndex((apiImage:any) => apiImage.images === image);
  
  /*Deze code controleert of apiImageIndex groter is dan of gelijk is aan 0. Als dat waar is, wijst het id toe aan de waarde van id in apiImages bij de index van apiImageIndex. Als het niet waar is, wijst het id toe aan de waarde van -1. Met andere woorden, als er een geldige index is, krijgt id de id-waarde van de afbeelding in apiImages, anders krijgt id de waarde -1 toegewezen.*/
  let id = apiImageIndex >= 0 ? apiImages[apiImageIndex].id : -1;
  
  // Deze code stuur een object door naar de array die boven de post request hebben gedeclareerd
  favoriteImages.push({ name: name, image: image, id: id });
  
  res.redirect('/fortniteHome'); // redirect naar forniteHome  wanneer je klikt op de button (send)
});
app.get("/favoriet", async (req, res) => {
//deze code haalt de id uit de parameter, en omgezet naar een int. Als er geen id parameter is ingesteld wordt het automatisch op -1 gezet. Als die id kleiner dan 0 of groter is dan de array die we bij de post request voor dit pad hebben gepushed: Krijg je een error => zodat er geen undifined of null krijgen.
  const id = parseInt(req.query.id?.toString() ?? "-1");
  //the req.query.id is uit de post request form ==> het is hidden dus je zal het niet zien in de url.Wanneer het formulier wordt ingediend via een POST-request, wordt wel meegestuurd met het formulier als het wordt verzonden. Daarom we gebruiken van req.query.id?.toString() om die verstopte id eruit te halen
  if (id < 0 || id >= favoriteImages.length) {
    return res.render("error");
  }
  const favoriteImage = favoriteImages[id]; // deze code zoeken we de id dit we doorgestuure in form /favoriet
  
  // find the corresponding apiImages object
  let apiImage = apiImages.find((apiImage:any) => apiImage.id === favoriteImage.id);//Deze code zoekt het eerste object in de apiImages array waarvan de id eigenschap gelijk is aan de id eigenschap van het favoriteImage object.
  let apiBackpack = [];//Deze code zorgt ervoor dat we een lege array hebben voordat we er gegevens in gaan zetten
  let apiWapons = [];//Deze code zorgt ervoor dat we een lege array hebben voordat we er gegevens in gaan zetten
  const fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  const record = fortniteResponse.data;
  for (let i = 0; i <= record.data.length; i++) {
    const random = Math.floor(Math.random() * record.data.length); // Deze code zorgt voor een random getal tussen 0 en de data die we fetche
    if (record.data[random].item.type === "backpack") {
      apiBackpack.push(record.data[random]);
    }
    if (record.data[random].item.type === "pickaxe") {
      apiWapons.push(record.data[random]);
    }
  }
  res.render("fortniteChar", {
    character: favoriteImage,//deze code is de we op lijn 70 hebben opgezocht in de array op id
    apiImage: apiImage, // deze code is dus de item die we over mappen dezelfde id hebben op lijn 73 
    avatarBackpack: apiBackpack,
    avatarPickaxe: apiWapons,
    info:apiImages
  });
});
app.get('/favoriet-images', async (req, res) => { //deze code is omdat we andere te veel get requesten doen naar dezelfde route.Dus /favoriete is voor informatie uit te halen voor post/req. En reden we naar forniteChar.
  const fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  const record = fortniteResponse.data;
  let apiBackpack = [];
  let apiWapons = [];
  for (let i = 0; i <= record.data.length; i++) {
    const random = Math.floor(Math.random() * record.data.length); 
    if (record.data[random].item.type === "backpack") {// Deze code doen we opnieuw omdat we een andere pagina renderen. Dit kan nog geweizigd worden zodat we backpack uit /fornite route halen
      apiBackpack.push(record.data[random]);
    }
    if (record.data[random].item.type === "pickaxe") {
      apiWapons.push(record.data[random]);
    }
  }
  res.render('favoriet', { 
    favoriteImages: favoriteImages, //Deze code is al gedeclareerd met waardes in the get request/favorite
    apiWapons: apiWapons, 
    apiBackpack: apiBackpack 
  });
});


app.post('/blacklist', (req, res) => {
  const { id, blacklistReason, image } = req.body; /*Deze code is hetzelfde als: 
  const id = req.body.id;
  const blacklistReason = req.body.blacklistReason;
  const image = req.body.image;*/
  const imageObj = apiImages[id]; //Deze code zet imageObj=apiImages[id =>id die we uit de post req halen]
  if (imageObj) {
    blacklist.unshift({ name: imageObj.name, images: image, blacklistReason }); // blacklist is een lege array die we pushen met dat object.
  }
  res.redirect('fortniteHome');
});
app.post('/blacklist/:id', (req, res) => {
  const id = req.params.id;
  const { _method } = req.body;

  if (_method === 'DELETE') {
    // delete the item with the specified id from the blacklist
    blacklist.splice(id, 1);
    res.redirect('/blacklist');
  } else {
    // handle other POST requests
    const { blacklistReason } = req.body;
    blacklist[id].blacklistReason = blacklistReason;
    res.redirect('/blacklist');
  }
});
app.get('/blacklist', async (req, res) => {
  res.render('blacklist', { blacklist,apiImages });
});

app.get('/login', (req, res) => {
  res.render('login');
});
app.post('/login', (req, res) => {
  let info = req.body;
  res.render('logingInfo', { info: info });
});
app.listen(app.get("port"), async () => {
  console.log(`The application has started on: http://localhost:${app.get("port")}`);
});
export { }
