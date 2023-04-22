import axios from 'axios';
import express from 'express';
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('port', 4000);
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({ extended: true }));
interface Avatar {
  name: string;
  description: string;
  type: string;
  rarity: string;
  series: string;
  images: {
    icon: string;
  };
}
let apiImages:any= [];
let apiWapons:any= [];
let apiBackpack:any= [];
let blacklist:any = [];
let favorietAvatars:any=[];
app.get('/', (req, res) => {
  res.render("landingpage");
});

app.get('/fortniteHome', async (req, res) => {
  let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  let record = fortniteResponse.data; 
  let avatars= []; 
  try {
    for (let i = 0; i < record.data.length; i++) {
      let random = Math.floor(Math.random() * 1000); 
      let item = record.data[random].item; 
      if (item.type === "outfit") {
        let avatar :Avatar= {
          name: record.data[random].item.name,
          description: record.data[random].item.description,
          type: record.data[random].item.type,
          rarity:record.data[random].item.rarity,
          series: record.data[random].item.series,
          images: record.data[random].item.images.icon
        };
        avatars.push(avatar);
        apiImages.push(avatar);
      }
    }
  }
  catch (error) {
    console.log(error);
  }
  res.render("fortniteHome", {
    avatarImage: avatars
  });
});
let favoriteImages:any = [];
app.post('/favoriet', (req, res) => {
  let name = req.body.name;
  let image = req.body.image;
  let apiImageIndex = apiImages.findIndex((apiImage:any) => apiImage.images === image);
  let id = apiImageIndex >= 0 ? apiImages[apiImageIndex].id : -1;
  
  favoriteImages.push({ name: name, image: image, id: id });
  
  res.redirect('/fortniteHome'); 
});
app.get("/favoriet", async (req, res) => {
  const id = parseInt(req.query.id?.toString() ?? "-1");
  if (id < 0 || id >= favoriteImages.length) {
    return res.render("error");
  }
  const favoriteImage = favoriteImages[id];
  let apiImage = apiImages.find((apiImage:any) => apiImage.id === favoriteImage.id);
  let apiBackpack = [];
  let apiWapons = [];
  const fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  const record = fortniteResponse.data;
  for (let i = 0; i <= record.data.length; i++) {
    const random = Math.floor(Math.random() * record.data.length);
    if (record.data[random].item.type === "backpack") {
      apiBackpack.push(record.data[random]);
    }
    if (record.data[random].item.type === "pickaxe") {
      apiWapons.push(record.data[random]);
    }
  }
  res.render("fortniteChar", {
    character: favoriteImage,
    apiImage: apiImage,
    avatarBackpack: apiBackpack,
    avatarPickaxe: apiWapons,
    info:apiImages
  });
});
app.get('/favoriet-images', async (req, res) => { 
  const fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
  const record = fortniteResponse.data;
  let apiBackpack = [];
  let apiWapons = [];
  for (let i = 0; i <= record.data.length; i++) {
    const random = Math.floor(Math.random() * record.data.length); 
    if (record.data[random].item.type === "backpack") {
      apiBackpack.push(record.data[random]);
    }
    if (record.data[random].item.type === "pickaxe") {
      apiWapons.push(record.data[random]);
    }
  }
  res.render('favoriet', { 
    favoriteImages: favoriteImages,
    apiWapons: apiWapons, 
    apiBackpack: apiBackpack 
  });
});
app.post('/blacklist', (req, res) => {
  const { id, blacklistReason, image } = req.body;
  const imageObj = apiImages[id]; 
  if (imageObj) {
    blacklist.unshift({ name: imageObj.name, images: image, blacklistReason }); 
  }
  res.redirect('fortniteHome');
});
app.post('/blacklist/:id', (req, res) => {
  const id = req.params.id;
  const { _method } = req.body;

  if (_method === 'DELETE') {
    blacklist.splice(id, 1);
    res.redirect('/blacklist');
  } else {
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
