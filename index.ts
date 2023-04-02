import axios from 'axios';
import express from 'express';
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('port', 4000);
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({ extended: true }));
let apiImages:any= [];
let apiWapons:any= [];
let apiBackpack:any= [];
app.get('/', (req, res) => {
  res.render("landingpage");
});
app.get('/forniteHome', async (req, res) => {
  let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  let record = fortniteResponse.data;
  let avatars= [];
  try {
    for (let i = 0; i < record.data.length; i++) {
      let random = Math.floor(Math.random() * 1000);
      let item = record.data[random].item;
      if (item.type === "outfit") {
        let avatar = {
          name: record.data[random].item.name,
          description: record.data[random].item.description,
          type: record.data[random].item.type,
          rarity:record.data[random].item.rarity,
          series: record.data[random].item.series,
          images: record.data[random].item.images.icon
        };
        avatars.push(avatar);
      }
    }
  }
  catch (error) {
    console.log(error);
  }
  res.render("forniteHome", {
    avatarImage: avatars
  });
});

app.get("/favoriet/:id", async (req, res) => {
  apiWapons = [];
  apiBackpack = [];
  let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  let record = fortniteResponse.data
  let id: number = parseInt(req.params.id);
  let forniteone = apiImages[id];
  for (let i = 0; i <= record.data.length; i++) {
    let random = Math.floor(Math.random() * record.data.length);
    if (record.data[random].item.type === "backpack") {
      apiBackpack.push(record.data[random]);
    }
    if (record.data[random].item.type === "pickaxe") {
      apiWapons.push(record.data[random]);
    }
  }
  if (!forniteone) {
    res.render("error");
  }
  else {
    res.render('forniteChar', {
      character: forniteone,
      avatarBackpack: apiBackpack,
      avatarPickaxe: apiWapons
    });
  }
});
app.get('/favoriet', async (req, res) => {
  apiImages = [];
  apiWapons = [];
  apiBackpack = [];
  let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  let record = fortniteResponse.data
  for (let i = 0; i <= record.data.length; i++) {
    let random = Math.floor(Math.random() * record.data.length);
    if (record.data[random].item.type === "outfit") {
      let apiTestingImages = {
        name: record.data[random].item.name,
        description: record.data[random].item.description,
        type: record.data[random].item.type,
        rarity:record.data[random].item.rarity,
        series: record.data[random].item.series,
        images: record.data[random].item.images.icon
      };
      apiImages.push(apiTestingImages);
    }
    if (record.data[random].item.type === "backpack") {
      apiBackpack.push(record.data[random]);
    }
    if (record.data[random].item.type === "pickaxe") {
      apiWapons.push(record.data[random]);
    }
  }
  res.render('favoriet', {
    avatarImage: apiImages,
    avatarBackpack: apiBackpack,
    avatarPickaxe: apiWapons
  });
});
const blacklist:any = [];
apiImages = [];

app.post('/blacklist', (req, res) => {
  const { id, blacklistReason, image } = req.body;
  const imageObj = apiImages[id];
  if (imageObj) {
    imageObj.blacklisted = true;
    blacklist.push({ name: imageObj.name, images: image, blacklistReason });
  }
  res.redirect('forniteHome');
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
  const { data } = await axios.get('https://fortnite-api.theapinetwork.com/items/list');
  apiImages.push(...data.data.filter((item:any) => item.item.type === 'outfit').map((item:any) => ({
    name: item.item.name,
    description: item.item.description,
    type: item.item.type,
    rarity: item.item.rarity,
    series: item.item.series,
    images: item.item.images.icon,
    blacklisted: false // add a blacklisted property initialized to false
  })));
  res.render('blacklist', { blacklist });
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
