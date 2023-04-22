import axios from 'axios';
import express from 'express';
const app = express();
import { MongoClient, ObjectId } from 'mongodb';

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('port', 4000);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
const uri = 'mongodb+srv://rachad:mojito12@cluster0.w2eqvxp.mongodb.net/test';
const client = new MongoClient(uri);
interface Avatar {
  _id?: ObjectId;
  name: string;
  description: string;
  type: string;
  rarity: string;
  series: string;
  images: {
    icon: string;
  };
}
let apiImages: any = [];
let apiWapons: any = [];
let apiBackpack: any = [];
let blacklist: any = [];
let favorietAvatars: any = [];
app.get('/', (req, res) => {
  res.render("landingpage");
});

app.get('/fortniteHome', async (req, res) => {
  try {
    await client.connect();
    let apiCall = client.db('fortnite').collection('api');
    let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
    let record = fortniteResponse.data;
    let avatars = [];
    for (let i = 0; i < record.data.length; i++) {
      let random = Math.floor(Math.random() * record.data.length);
      let item = record.data[random].item;
      if (item.type === "outfit") {
        let avatar: Avatar = {
          name: record.data[random].item.name,
          description: record.data[random].item.description,
          type: record.data[random].item.type,
          rarity: record.data[random].item.rarity,
          series: record.data[random].item.series,
          images: record.data[random].item.images.icon
        };
        avatars.push(avatar);
        apiImages.push(avatar);
      }
    }
    for (const avatar of avatars) {
      const existingAvatar = await apiCall.findOne({ name: avatar.name });
      if (!existingAvatar) {
        await apiCall.insertMany(avatars.slice(0, 4));
        break;
      }
    }
    res.render("fortniteHome", {
      avatarImage: avatars
    });
  }
  catch (error) {
    console.log(error);
  }
  finally {
    client.close();
  }
});
let favoriteImages: any = [];
app.post('/favoriet', async (req, res) => {
  try {
    await client.connect();
    const favorietCollection = client.db('fortnite').collection('favoriet');
    const apiCall = client.db('fortnite').collection('api');
    
    const info = req.body;
    const apiItem = await apiCall.findOne({ name: info.name });
    const id = apiItem ? apiItem._id : null;

    await favorietCollection.insertOne({
      name: info.name,
      image: info.image,
      id: id
    });

    res.redirect('/fortniteHome');
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal server error');
  } finally {
    await client.close();
  }
});
app.get('/favoriet-images', async (req, res) => {
  try {
    await client.connect();
    let favorietCollection = await client.db('fortnite').collection('favoriet');
    let favorieten = await favorietCollection.find({}).toArray();

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
      favoriteImages: favorieten,
      apiWapons: apiWapons,
      apiBackpack: apiBackpack
    });

  } catch (e) {

  } finally {
    client.close();
  }
});

app.get("/favoriet", async (req, res) => {
  const id = parseInt(req.query.id?.toString() ?? "-1");
  if (id < 0 || id >= favoriteImages.length) {
    return res.render("error");
  }
  const favoriteImage = favoriteImages[id];
  let apiImage = apiImages.find((apiImage: any) => apiImage.id === favoriteImage.id);
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
    info: apiImages
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
  res.render('blacklist', { blacklist, apiImages });
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
