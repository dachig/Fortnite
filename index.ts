import axios from 'axios';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import session from 'express-session';
const uri = 'mongodb+srv://rachad:mojito12@cluster0.w2eqvxp.mongodb.net/test';
const bcrypt = require('bcrypt');
declare module "express-session" {
  interface Session {
    name: string;
  }
}
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('port', 4000);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
//Items die worden doorgestuurd moeten een interface hebben.
interface Avatar { //Interface voor de items die we toevoegen in api collection
  _id?: ObjectId;
  name: string;
  description: string;
  type: string;
  rarity: string;
  series: string;
  images: {
    featured: string;
  };
  favoriet: boolean,
}
let apiWapons: any = [];//Deze array wordt verwijderd wanneer we eenmaal begonnen zijn aan de collection insert.
let apiBackpack: any = [];//Deze array wordt verwijderd wanneer we eenmaal begonnen zijn aan de collection insert.
let avatars: any[] = [];// Deze array kan aangepast worden, zodat we gebruik maken van api collection.

app.use(session({
  secret: 'test123',
  resave: false,
  saveUninitialized: true
}));


app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const client = new MongoClient(uri);
  try {

    await client.connect();
    const userCollection = await client.db('fortnite').collection('users');
    const info = req.body;
    const user = await userCollection.findOne({ username: info.name });

    if (!user || !(await bcrypt.compare(info.password, user.password))) {
      res.render('login', {
        message: 'Wrong username or password',
      });
      return;
    }
    req.session.name = info.name;
    console.log(`Fout sesion: ${req.session.name}`);
    console.log(`fout name: ${info.name}`);
    res.redirect('fortniteHome');


  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});

app.get('/register', (req, res) => {
  res.render('register');
});
app.post('/register', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const userCollection = await client.db('fortnite').collection('users');
    const { name, password } = req.body;
    const user = await userCollection.findOne({ username: name });

    if (user) {
      res.render('register', {
        message: "Username already in use"
      });
      return;
    }
    let hasPassword = await bcrypt.hash(password, 10);
    await userCollection.insertOne({ username: name, password: hasPassword });
    res.redirect('/fortnitehome');

  } catch (e) {

  } finally {
    await client.close();
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/', (req, res) => {
  res.render("landingpage");
});

const requireLogin = async (req: any, res: any, next: any) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const userCollection = await client.db('fortnite').collection('users');
    const sessionID = req.session.name;
    console.log(sessionID);
    if (sessionID) {
      const user = await userCollection.findOne({ name: sessionID.name });
      if (user) {
        next();
      } else {
        res.redirect('/login');
      }
    } else {
      res.redirect('/login');
    }
  } catch (e) {
    console.log(e);
    res.redirect('/login');
  } finally {
    await client.close();
  }
};

app.post('/fortnitehome/avatar', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const avatarCollection = client.db('fortnite').collection('avatar');
    const avatarImage = req.body.avatarImage;
    const sessionID = req.session.name;
    const user = await avatarCollection.findOne({ username: sessionID });
    if (user) {
      await avatarCollection.deleteMany({ username: sessionID });
    }
    await avatarCollection.insertOne({ username: sessionID, image: avatarImage });//Hier zorgen we ervoor dat de avatar toegevoegd wordt.
    res.redirect('/fortnitehome');
  } catch (error) {
    console.log(error);
    res.render('error');
  } finally {
    client.close();
  }
});
app.get('/fortnitehome', requireLogin, async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const apiCall = client.db('fortnite').collection('api');
    const avatarCollection = client.db('fortnite').collection('avatar');
    const favorietCollection = client.db('fortnite').collection('favoriet');
    const userCollection = client.db('fortnite').collection('users');
    const fortniteResponse = await axios.get('https://fortnite-api.theapinetwork.com/items/list');
    const record = fortniteResponse.data;
    const avatars = [];//array wordt terug leeggemaakt;
    let outfitCount = 0;
    for (let i = 0; i < record.data.length; i++) {
      const random = Math.floor(Math.random() * record.data.length);
      const item = record.data[random].item;
      if (item.type === 'outfit' && item.images.featured) {
        const avatar: Avatar = {
          name: record.data[random].item.name,
          description: record.data[random].item.description,
          type: record.data[random].item.type,
          rarity: record.data[random].item.rarity,
          series: record.data[random].item.series,
          images: record.data[random].item.images.featured,
          favoriet: false,
        };
        avatars.push(avatar);
        outfitCount++;  // Dit zorgt ervoor dat we the hele api kunnen blijven gebruiken en dat er altijd random items zijn.

        if (outfitCount === 4) { // Dit zorgt ervoor dat we maar 4 items laten zien voor de user + 4 items in api collection.
          break; // zodat we uit de for loop kunnen. Je kan dit ook doen in for loop conditie.
        }
      }
    }
    for (const avatar of avatars) {
      const existingAvatar = await apiCall.findOne({ name: avatar.name });
      if (!existingAvatar) {
        await apiCall.insertOne(avatar); //Zorgt ervoor dat wanneer er geen obj(existingAvatar) in the api collection zit, dat we 1 voor 1 dat doen.
      }
    }
    
    const sessionID = req.session.name;
    const avatarDb = await avatarCollection.findOne({ username: sessionID });
    res.render('fortniteHome', {
      avatarImage: avatars,
      username: sessionID,
      avatarDb: avatarDb ? avatarDb.image : null // => deze code doet een checking als da true is of false. De true deel staat voor de :, als da nie true is is undifined of 0 => wordt vraagteken geshowed. Zonder deze krijg je rare afbeelding op je ejs file.
    });

  } catch (error) {
    console.log(error);
    res.render('error');
  } finally {
    client.close();
  }
});
app.post('/favoriet', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    let favorietCollection = client.db('fortnite').collection('favoriet');
    let apiCall = client.db('fortnite').collection('api');
    const sessionID = req.session.name;
    let info = req.body;
    const item = await apiCall.findOne({ name: info.name });
    if (!item) {
      console.log('Item niet gevonden in favoriet');
      res.render('error');
      return;;
    }
    const favoriet = {
      username: sessionID,
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
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const sessionID = req.session.name;
    const avatarCollection = client.db('fortnite').collection('avatar');
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const favorieten = await favorietCollection.find({ username: sessionID }).toArray();
    const backpackCollection = await client.db('fortnite').collection('backpack');
    const pickaxeCollection = await client.db('fortnite').collection('pickaxe');
    const backpack = await backpackCollection.find({}).toArray();
    const pickaxe = await pickaxeCollection.find({}).toArray();
    const avatarDb = await avatarCollection.findOne({ username: sessionID });

    res.render('favoriet', {
      favoriteImages: favorieten,
      username: req.session.name,
      pickaxe: pickaxe,
      backpack: backpack,
      avatarDb: avatarDb ? avatarDb.image : null
    });

  } catch (e) {
    res.render('error');
  } finally {
    client.close();
  }
});

app.post('/favoriet/:id/update', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    let backpackCollection = await client.db('fortnite').collection('backpack');
    let pickaxeCollection = await client.db('fortnite').collection('pickaxe');
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const blacklistCollection= await client.db('fortnite').collection('blacklist');
    let {image, id, backpack, pickaxe, wins, loses, notitieAvatar, name } = req.body;
    const sessionID = req.session.name;
    let objectDelete: Boolean = false;
    await backpackCollection.deleteOne({ name: id });
    await pickaxeCollection.deleteOne({ name: id });
    await favorietCollection.updateOne(
      { name: name, username: sessionID },
      { $set: { wins: parseInt(wins), loses: parseInt(loses), notitieAvatar: notitieAvatar } }
    );
    objectDelete = parseInt(loses) >= 3 + parseInt(wins);
    const blacklist = await blacklistCollection.find({ username: sessionID }).toArray();
    if(objectDelete){
      await blacklistCollection.insertOne({name: name, username: sessionID,images:image, blacklistReason:"personage trekt op niets" });
      await favorietCollection.deleteOne({name: name, username: sessionID });
    }
    await backpackCollection.insertOne({ name: req.params.id, backpack: backpack });
    await pickaxeCollection.insertOne({ name: req.params.id, pickaxe: pickaxe });
    res.redirect('/favoriet');
  } catch (e) {
    res.render('error');
  }
  finally {
    await client.close();
  }
});
app.get("/favoriet/:id", async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    let favorietCollection = await client.db('fortnite').collection('favoriet');
    const avatarCollection = client.db('fortnite').collection('avatar');
    let id: string = req.params.id;

    let findFavoriet = await favorietCollection.findOne<Avatar>({ _id: new ObjectId(id) });
    if (!findFavoriet) {
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
    const sessionID = req.session.name;
    const avatarDb = await avatarCollection.findOne({ username: sessionID });
    res.render("fortniteChar", {
      character: findFavoriet,
      username: req.session.name,
      avatarBackpack: apiBackpack,
      avatarPickaxe: apiWapons,
      avatarDb: avatarDb ? avatarDb.image : null
    });
  } catch (e) {
    console.error(e);
    res.render("error");
  } finally {
    client.close();
  }
});
app.get('/blacklist', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const sessionID = req.session.name;
    const avatarCollection = client.db('fortnite').collection('avatar');
    const blacklistCollection = await client.db('fortnite').collection('blacklist');
    const blacklist = await blacklistCollection.find({ username: sessionID }).toArray();//Deze code displayed alle items die in blacklistCollection zitten.
    const avatarDb = await avatarCollection.findOne({ username: sessionID });
    res.render('blacklist', { username: req.session.name, blacklist, avatarDb: avatarDb ? avatarDb.image : null });
  } catch (e) {
    console.error(e + 'Error in blacklist collection');
    res.render('error');
  } finally {
    client.close();
  }
});
//Probleem bij update blacklist textarea, moet worden aangepast.
//We kunnen een pad aanmaken zoals bij delete post => blacklist/update zodat we the reason kunnen update. Deze post naar blacklist is hetzelfde die in onze fortniteHome.ejs staat.
app.post('/blacklist', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    // We gebruiken de api collection als basis waar de items van de homepage in zitten.
    let blacklistCollection = await client.db('fortnite').collection('blacklist');
    let apiCall = await client.db('fortnite').collection('api');

    const { id, blacklistReason, image } = req.body;
    const blacklistObj = await apiCall.findOne({ _id: new ObjectId(id) });//Deze code neemt de id die we doorsturen en zoekt in de api collection een id die overeenkomt.
    if (blacklistObj) { // Als die id gevonden is, insert we alle gegevens van de form die we doorsturen + de image.
      await blacklistCollection.insertOne({username: req.session.name, name: blacklistObj.name, images: image, blacklistReason });
    }
    res.redirect('/fortniteHome');
  } catch (e) {
    console.error(e);
    res.render('error');
  } finally {
    await client.close();
  }
});
//Reden voor niet-werking:In the form gebruikte ik gewoon hidden input id, na verschillende inputs te gebruiken => Heb ik gewoon dezelfde hidden inputs gebruikt die staan in form op homepage. Zie blacklist.ejs en homepage forms
app.post('/blacklist/update', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const blacklistCollection = await client.db('fortnite').collection('blacklist');

    const { id, blacklistReason, name } = req.body;
    const blacklistObj = await blacklistCollection.findOne({ _id: new ObjectId(id), name: name });

    if (blacklistObj) {
      console.log('Oude reason:', blacklistObj.blacklistReason); //Dit is puur controle of the code werkt
      await blacklistCollection.updateOne(
        { _id: new ObjectId(id), name: name }, //Zoekt dezelfde id en name
        { $set: { blacklistReason: blacklistReason } }// en set => update, verandert de reason met de nieuwe reason.
      );
      console.log('Nieuw reason: ', blacklistReason);//Dit is puur controle of the code werkt
    }
    res.redirect('/blacklist');
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});
//Als je /delete achter pad => Niet vergeten dat je in je form voor post action dat ook moet vermelden.
app.post('/blacklist/delete', async (req, res) => { //Zodat de server weet dat we delete doen.
  const client = new MongoClient(uri);

  try {
    const id = req.body.id;
    await client.connect();
    const blacklistCollection = await client.db('fortnite').collection('blacklist');
    await blacklistCollection.deleteOne({ _id: new ObjectId(id) }); //Item delete met zelfde id.
    res.redirect('/blacklist');
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});

app.listen(app.get("port"), async () => {
  console.log(`The application has started on: http://localhost:${app.get("port")}`);
});
export { }
