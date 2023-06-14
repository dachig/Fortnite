import axios from 'axios';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import compression from 'compression';
import session from 'express-session';
declare module "express-session" {
  interface Session {
    name: string;
  }
}
interface Avatar {
  _id?: ObjectId; 
  username?: string; 
  name: string;
  description: string;
  type: string;
  rarity: string;
  series: string;
  images: {
    featured: string;
  };
  favoriet?: boolean;
  blacklisted?: boolean;
  introduction?: string;
}
const uri = 'mongodb+srv://rachad:mojito12@cluster0.w2eqvxp.mongodb.net/test';
const bcrypt = require('bcrypt');
const app = express();
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });
const headers = {
  'Authorization': '56477f6d-d13c-4c86-b464-a29a3975d9e6'
};
let fortniteIndexApi: any = []; 
let apiPickaxe: any = [];
let apiBackpack: any = [];
let avatars: Avatar[] = [];

app.use(compression());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('port', 4000);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

app.use(session({
  secret: 'test123',
  resave: false,
  saveUninitialized: true
}));

app.get('/', (req, res) => {
  res.render("landingpage");
});
/*-------------------------------------------------------------------------registerPagina---------------------------------------------------------------------*/
app.get('/register', compression(), (req, res) => {
  res.render('register');
});
app.post('/register', compression(), async (req, res) => {
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
    console.log(e);
    res.render('error');
  } finally {
    await client.close();
  }
});
/*------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------loginPagina------------------------------------------------------------------------*/
app.get('/login', compression(), (req, res) => {
  res.render('login');
});
app.post('/login', compression(), async (req, res) => {
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
    cache.del(req.session.name); 
    res.redirect('fortniteHome');
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});
/*------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------logoutPagina-----------------------------------------------------------------------*/
app.get('/logout', compression(), (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    } else {
      res.redirect('/');
    }
  });
});
/*------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------middelware=>Om te zien of je bent ingelogd-----------------------------------------*/
const requireLogin = async (req: any, res: any, next: any) => {
  const client = new MongoClient(uri);
  const sessionID = req.session.name; 
  try {
    await client.connect();
    const userCollection = await client.db('fortnite').collection('users');
    if (sessionID) { //Als persoon is ingelogd 
      const user = await userCollection.findOne({ name: sessionID.name }); 
      if (user) { 
        next();
      } else {
        res.redirect('/register'); 
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
/*------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------FortniteHome + compression---------------------------------------------------------*/
app.post('/fortnitehome/avatar', compression(), async (req, res) => {
  const client = new MongoClient(uri);
  const sessionID = req.session.name;
  const cachedResponse = cache.get(sessionID); 
  try {
    await client.connect();
    const avatarCollection = client.db('fortnite').collection('avatar'); 
    const avatarImage = req.body.avatarImage; 
    const user = await avatarCollection.findOne({ username: sessionID }); 
    if (user) { 
      await avatarCollection.deleteMany({ username: sessionID }); 
    }
    await avatarCollection.insertOne({ username: sessionID, image: avatarImage });
    if (cachedResponse) { // Als er items in cache zitten.
      if (cachedResponse.username == sessionID) {
        cachedResponse.avatarDb = avatarImage;
      }
      cache.set(sessionID, cachedResponse);
    }
    res.redirect('/fortnitehome');
  } catch (error) {
    console.log(error);
    res.render('error');
  } finally {
    client.close();
  }
});
app.post('/fortnitehome/refreshpage', async (req, res) => {
  const sessionID = req.session.name; 
  const cachedResponse = cache.get(sessionID); 
  if (cachedResponse) { 
    cache.del(sessionID);
  }
  res.redirect('/fortnitehome');
});
/*---------------------------------------------------------------------------fortniteHome get naar server + middelware + compression--------------------------*/
app.get('/fortnitehome', requireLogin, compression(), async (req, res) => { 
  const client = new MongoClient(uri);
  const sessionID = req.session.name; 
  const cachedResponse = cache.get(sessionID); 
  if (cachedResponse) { 
    return res.render('fortniteHome', cachedResponse);
  }
  try {
    await client.connect();
    const apiCall = client.db('fortnite').collection('api');
    //await apiCall.deleteMany({});
    const avatarCollection = await client.db('fortnite').collection('avatar');
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const blacklistCollection = await client.db('fortnite').collection('blacklist');
    const fortniteResponse = fortniteIndexApi;
    const record = fortniteResponse.data;
    const blacklistedItems = await blacklistCollection.find({ username: sessionID }).toArray(); 
    avatars = [];
    while (avatars.length < 4) {
      const random = Math.floor(Math.random() * record.data.length);
      const item = await record.data[random];
      if (!(blacklistedItems.some((i) => i.name === item.name))) { 
        if (item.type.value === 'outfit' && item.images.featured) {
          const avatar: Avatar = {
            username: sessionID,
            name: item.name,
            description: item.description,
            type: item.type.value,
            rarity: item.rarity.backendValue,
            series: item.series?.value,
            images: item.images.featured,
            favoriet: false, 
            blacklisted: false,
            introduction: item.introduction.text
          };
          avatars.push(avatar);
        }
      }
    }
    for (const avatar of avatars) {
      const foundFavObject = await favorietCollection.findOne({ name: avatar.name, username: sessionID });
      const existingAvatar = await apiCall.findOne({ name: avatar.name });
      if (!existingAvatar) {
        await apiCall.insertOne(avatar);
      }
      if (foundFavObject) {
        await apiCall.updateOne({ username: sessionID }, { $set: { favoriet: true } });
      }
    }
    const shuffledApiCollection = await apiCall.aggregate([{ $sample: { size: 4 } }]).toArray();
    const avatarDb = await avatarCollection.findOne({ username: sessionID });
    const response = {
      avatarImage: shuffledApiCollection,
      username: sessionID,
      avatarDb: avatarDb ? avatarDb.image : null,
    };
    cache.set(sessionID, response); 
    res.render('fortniteHome', response);
  } catch (error) {
    console.log(error);
    res.render('error');
  } finally {
    client.close();
  }
});
/*------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------fortniteHome post request naar server + compression------------------------------*/
app.post('/favoriet', compression(), async (req, res) => {
  const client = new MongoClient(uri);
  const sessionID = req.session.name;
  try {
    await client.connect();
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const apiCall = await client.db('fortnite').collection('api');
    const info = req.body;
    const existingFavObject = await favorietCollection.findOne({ name: info.name, username: sessionID });
    const item = await apiCall.findOne({ name: info.name }); 
    if (!item) {
      console.log('Item niet gevonden in favoriet');
      res.render('error');
      return;
    }
    const favoriet: Avatar = { 
      username: sessionID,
      name: item.name,
      images: item.images,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      series: item.series,
      favoriet: true,
      introduction: item.introduction
    };
    if (!existingFavObject) { 
      await favorietCollection.insertOne(favoriet);
    }
    const favObject = await favorietCollection.find({ username: sessionID }).toArray();
    if (favObject) {
      await apiCall.updateMany({ username: sessionID, name: favoriet.name }, { $set: { favoriet: true } }); 
      const cachedResponse = cache.get(sessionID); 
      if (cachedResponse) { 
        cachedResponse.avatarImage.forEach((avatar: Avatar, index: number) => { 
          if (avatar.name === favoriet.name) {
            cachedResponse.avatarImage[index].favoriet = true;
          }
        });
        cache.set(sessionID, cachedResponse);
      }
    }
    res.redirect('/fortniteHome');
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal server error');
  } finally {
    await client.close();
  }
});
/*------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------favoriet get request + compression-----------------------------------------------*/
app.get('/favoriet', compression(), async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const sessionID = req.session.name;
    const avatarCollection = client.db('fortnite').collection('avatar');
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const favorieten = await favorietCollection.find({ username: sessionID }).sort({ $natural: -1 }).toArray();
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
/*------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------favoriet post request naar server + compression---------------------------------*/
app.post('/favoriet/:id/update', compression(), async (req, res) => { 
  const client = new MongoClient(uri);
  try {
    await client.connect();

    let backpackCollection = await client.db('fortnite').collection('backpack');
    let pickaxeCollection = await client.db('fortnite').collection('pickaxe');
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const blacklistCollection = await client.db('fortnite').collection('blacklist');
    let { image, id, backpack, pickaxe, wins, loses, notitieAvatar, name } = req.body; 
    const sessionID = req.session.name;
    let objectDelete: Boolean = false; 
    await favorietCollection.updateOne( 
      { name: name, username: sessionID },
      { $set: { wins: parseInt(wins), loses: parseInt(loses), notitieAvatar: notitieAvatar } } 
    );
    const cachedResponse = cache.get(sessionID); 
    if (cachedResponse) { 
      cache.del(sessionID);
    }

    objectDelete = parseInt(loses) >= 3 + parseInt(wins);
    if (objectDelete) { 
      await blacklistCollection.insertOne({ name: name, username: sessionID, images: image, blacklistReason: "personage trekt op niets" });
      await favorietCollection.deleteOne({ name: name, username: sessionID });
    }
    await backpackCollection.deleteOne({ username: sessionID, name: id }); 
    await pickaxeCollection.deleteOne({ username: sessionID, name: id }); 
    await backpackCollection.insertOne({ username: sessionID, name: id, backpack: backpack });
    await pickaxeCollection.insertOne({ username: sessionID, name: id, pickaxe: pickaxe }); 
    res.redirect('/favoriet');
  } catch (e) {
    res.render('error');
  }
  finally {
    await client.close();
  }
});
/*----------------------------------------------------------------------------------------------------------------------------------------------------------- */
/*----------------------------------------------------------------id favoriet op favoriet.ejs get request + compression ------------------------------------- */
app.get("/favoriet/:id", compression(), async (req, res) => { 
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const avatarCollection = await client.db('fortnite').collection('avatar');
    const id: string = req.params.id; 

    let findFavoriet = await favorietCollection.findOne<Avatar>({ _id: new ObjectId(id) });
    if (!findFavoriet) {
      res.render('error');
    }
    const fortniteResponse = fortniteIndexApi; 
    const record = fortniteResponse.data;
    let apiBackpack = [];
    let apiPickaxe = [];
    while (apiBackpack.length < 4) {
      const random = Math.floor(Math.random() * record.data.length);
      const item = record.data[random];
      if (item.type.value === "backpack") {
        apiBackpack.push({
          icon: item.images.icon,
          name: item.name
        });
      }
    }
    while (apiPickaxe.length < 4) {
      const random = Math.floor(Math.random() * record.data.length);
      const item = record.data[random];
      if (item.type.value === "pickaxe") {
        apiPickaxe.push({
          icon: item.images.icon,
          name: item.name
        });
      }
    }
    const sessionID = req.session.name;
    const avatarDb = await avatarCollection.findOne({ username: sessionID }); 
    res.render("fortniteChar", {
      character: findFavoriet,
      username: req.session.name,
      avatarBackpack: apiBackpack,
      avatarPickaxe: apiPickaxe,
      avatarDb: avatarDb ? avatarDb.image : null 
    });
  } catch (e) {
    console.error(e);
    res.render("error");
  } finally {
    client.close();
  }
});
/*----------------------------------------------------------------------------------------------------------------------------------------------------------- */
/*----------------------------------------------------------------blacklist.ejs get request + compression --------------------------------------------------- */
app.get('/blacklist', compression(), async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const sessionID = req.session.name;
    const avatarCollection = client.db('fortnite').collection('avatar');
    const blacklistCollection = await client.db('fortnite').collection('blacklist');
    const blacklist = await blacklistCollection.find({ username: sessionID }).sort({ $natural: -1 }).toArray();
    const avatarDb = await avatarCollection.findOne({ username: sessionID });
    res.render('blacklist', { 
      username: req.session.name, 
      blacklist, 
      avatarDb: avatarDb ? avatarDb.image : null 
    });
  } catch (e) {
    console.error(e + 'Error in blacklist collection');
    res.render('error');
  } finally {
    client.close();
  }
});
/*----------------------------------------------------------------------------------------------------------------------------------------------------------- */
/*----------------------------------------------------------------blacklist post request + compression------------------------------------------------------- */
app.post('/blacklist', compression(), async (req, res) => { 
  const client = new MongoClient(uri);
  const sessionID = req.session.name;
  try {
    await client.connect();
    const blacklistCollection = await client.db('fortnite').collection('blacklist');
    const favorietCollection = await client.db('fortnite').collection('favoriet');
    const apiCollection = await client.db('fortnite').collection('api');
    const {blacklistReason, image, name } = req.body;
    const blacklistIndex = await blacklistCollection.findOne({ name: name, image: image });
    await favorietCollection.deleteOne({ name: name, username: sessionID }); 
    if (!blacklistIndex) {
      await blacklistCollection.insertOne({ username: sessionID, name: name, images: image, blacklistReason });
      await apiCollection.updateOne({ username: sessionID, name: name }, { $set: { blacklisted: true } }); 
    }
    const cachedResponse = cache.get(sessionID);
    if (cachedResponse) { 
      cache.del(sessionID);
    }
    res.redirect('/blacklist');
  } catch (e) {
    console.error(e);
    res.render('error');
  } finally {
    await client.close();
  }
});
/*----------------------------------------------------------------------------------------------------------------------------------------------------------- */
/*----------------------------------------------------------------id favoriet op favoriet.ejs get request---------------------------------------------------- */
app.post('/blacklist/update', compression(), async (req, res) => { // items dat op blacklist.ejs staan 
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const blacklistCollection = await client.db('fortnite').collection('blacklist');

    const { id, blacklistReason, name } = req.body; 
    const blacklistObj = await blacklistCollection.findOne({ _id: new ObjectId(id), name: name });

    if (blacklistObj) {  
      await blacklistCollection.updateOne( 
        { _id: new ObjectId(id), name: name },
        { $set: { blacklistReason: blacklistReason } }
      );

    }
    res.redirect('/blacklist');
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});
/*----------------------------------------------------------------------------------------------------------------------------------------------------------- */
/*----------------------------------------------------------------blacklist delete post request + compression------------------------------------------------ */
app.post('/blacklist/delete', compression(), async (req, res) => {
  const client = new MongoClient(uri);
  try {
    const id = req.body.id;
    await client.connect();
    const blacklistCollection = await client.db('fortnite').collection('blacklist');
    await blacklistCollection.deleteOne({ _id: new ObjectId(id) });
    res.redirect('/blacklist');
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});
/*----------------------------------------------------------------------------------------------------------------------------------------------------------- */
app.listen(process.env.Port || app.get("port"), async () => {
  fortniteIndexApi = await axios.get("https://fortnite-api.com/v2/cosmetics/br", { headers });
  console.log(`The application has started on: http://localhost:${app.get("port")}`);
});
export { }