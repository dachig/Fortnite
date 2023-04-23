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
let avatars:any[] = [];
app.get('/', (req, res) => {
  res.render("landingpage");
});
app.get('/fortniteHome', async (req, res) => {
  try {
    await client.connect();
    let apiCall = client.db('fortnite').collection('api');
    let favorietCollection= client.db('fortnite').collection('favoriet');
    let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
    let favorietSter=await favorietCollection.find({}).toArray();
    let record = fortniteResponse.data;
    avatars = [];
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
      avatarImage: avatars,
      ster:favorietSter
    });
  }
  catch (error) {
    console.log(error);
  }
  finally {
    client.close();
  }
});
app.post('/favoriet', async (req, res) => {
  try {
    await client.connect();
    let favorietCollection = client.db('fortnite').collection('favoriet');
    let apiCall = client.db('fortnite').collection('api');
    let info = req.body;

    const item = await apiCall.findOne({ name: info.name });
    if (!item) {
      return res.status(404).send('Item not found in API');
    }
    const favoriet = {
      name: item.name,
      images: item.images,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      series: item.series
    };
    await favorietCollection.insertOne(favoriet);

    res.redirect('/fortniteHome');
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal server error');
  } finally {
    await client.close();
  }
});
app.get('/favoriet', async (req, res) => {
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
    res.render('error');

  } finally {
    client.close();
  }
});

app.get("/favoriet/:id", async (req, res) => {
  try {
    await client.connect();
    let favorietCollection = await client.db('fortnite').collection('favoriet');
    let backpackCollection = await client.db('fortnite').collection('backpack');
    let pickaxeCollection = await client.db('fortnite').collection('backpack');
    let id:string = req.params.id;
    
    let findFavoriet = await favorietCollection.findOne<Avatar>({_id:new ObjectId(id)});
    if(!findFavoriet){
      res.render('error');
    }
    let fortniteResponse = await axios.get("https://fortnite-api.theapinetwork.com/items/list");
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
    res.render("fortniteChar", {
      character: findFavoriet,
      avatarBackpack: apiBackpack,
      avatarPickaxe: apiWapons
    });
  } catch (e) {
    console.error(e);
    res.render("error");
  } finally {
    client.close();
  }
});
app.post('/blacklist', (req, res) => {
  const { id, blacklistReason, image } = req.body;
  const blacklistObj = apiImages[id];
  if (blacklistObj) {
    blacklist.unshift({ name: blacklistObj.name, images: image, blacklistReason });
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
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  res.redirect('/login');
});
app.listen(app.get("port"), async () => {
  console.log(`The application has started on: http://localhost:${app.get("port")}`);
});
export { }
