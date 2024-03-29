const express=require('express');
const User=require('./models/User');
const dotenv=require('dotenv');
const cookieParser=require('cookie-parser');
const mongoose = require('mongoose');
const jwt= require('jsonwebtoken');
const cors=require('cors');
const ws=require('ws');
const bcrypt=require('bcryptjs');
const Message= require('./models/Message');
const fs=require('fs');
const bodyParser = require("body-parser");
const cloudinary = require("cloudinary");
const fileUpload = require("express-fileupload");
dotenv.config();
mongoose.connect(process.env.MONGO_URL,(err)=>{
    if(err) throw err;
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });


//console.log(process.env.MONGO_URL);
const jwtsecret=process.env.JWT_SECRET;
const bcryptSalt=bcrypt.genSaltSync(10);
const app=express();
app.use('/uploads',express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials:true,
    origin: process.env.CLIENT_URL,
}))
;
app.use(bodyParser.urlencoded({ extended: true }));

async function getUserDataFromRequest(req){
    return new Promise((resolve,reject)=>{
        const token= req.cookies?.token;
    
        if(token){
    
    
            jwt.verify(token, jwtsecret, {},(err, userData)=>{
                if(err) throw err;
                 resolve(userData);
            });
    
        } else{
            reject('no token');
        }
    });
    

}

app.get('/api/test',(req,res)=>{
res.json('test ok');
}
);

app.get('/api/messages/:userId',async (req,res)=>{
   const {userId}=req.params;
   const userData= await getUserDataFromRequest(req);
   const ourUserId= userData.userId;
   const messages= await Message.find({
    sender:{$in:[userId,ourUserId]},
    recipient:{$in:[userId,ourUserId]},
}).sort({createdAt:1});
res.json(messages);
   });

app.get('/api/people',async(req,res)=>{
    const users= await User.find({},{'_id':1,username:1});
    res.json(users);
});

//api server

app.get('/api/profile',(req,res)=>{
    const token= req.cookies?.token;
    //const {token}= req.cookies?.token;

    if(token){


        jwt.verify(token, jwtsecret, {},(err, userData)=>{
            if(err) throw err;
            //const {id,username}= userData;
             res.json(userData);
        });

    }else{
        res.status(401).json('no token');
    }


});

app.post('/api/login',async(req,res)=>{
    const {username,password}= req.body;
    const foundUser= await User.findOne({username});
    if(foundUser)
    {
        const passOk=bcrypt.compareSync(password,foundUser.password);
        if(passOk){
            jwt.sign({userId:foundUser._id,username},jwtsecret,{},(err,token)=>{
                res.cookie('token',token,{sameSite:'none',secure:true}).json({
                    id:foundUser._id,
                    });
            });
        }
    }

});

app.post('/api/logout',(req,res)=>{
    res.cookie('token','',{sameSite:'none',secure:true}).json('ok');
});

app.post('/api/register',async(req,res)=>{
const {username ,password}=req.body;
try{
    const hashedPassword=bcrypt.hashSync(password,bcryptSalt);
    const createdUser = await User.create({
    username:username,
    password:hashedPassword,

});
jwt.sign({userId:createdUser._id,username},jwtsecret,{},(err, token)=>{
    if(err) throw err;
    res.cookie('token',token,{sameSite:'none',secure:true}).status(201).json({
        id:createdUser._id,
       
    });


});
}catch(err)
{
    if(err) throw err;
    res.status(500).json('error');
}

    });



    


const server= app.listen(4040);

//websocket server
const wss= new ws.WebSocketServer({server});
wss.on('connection',(connection ,req)=>{

     function notifyAboutOnlinePeople(){
        [...wss.clients].forEach(client=>{
            client.send(JSON.stringify(
                {
                    online:[...wss.clients].map(c=>({userId:c.userId,username:c.username})),
             
                }
            
                ));
        
         });

     }

    connection.isAlive=true;
    connection.timer=setInterval(()=>{
       connection.ping();
       connection.deathTimer=setTimeout(()=>{

             connection.isAlive=false;
             clearInterval(connection.timer);
             connection.terminate();
             notifyAboutOnlinePeople();
             console.log('dead');
       },1000);
    },5000);
    connection.on('pong',()=>{
        clearTimeout(connection.deathTimer);
    });

    //read username and id from the cookie for this connection
    const cookies= req.headers.cookie;
 if(cookies)
 {
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='))
    if(tokenCookieString){
        const token= tokenCookieString.split('=')[1];
        if(token){
            jwt.verify(token,jwtsecret,{}, (err,userData)=>{
              if(err) throw err;
              const {userId,username}=userData;
              connection.userId=userId;
              connection.username=username;
            });
        }
    }
 }

// connection.on('message',async (message)=>{
//     const messageData=JSON.parse(message.toString());
//     const {recipient,text,file}= messageData;
//     let filename=null;
//     if(file)
//     {
//         const parts=file.name.split('.');
//         const ext=parts[parts.length-1];
//         filename=Date.now() + '.'+ext;
//         const path=__dirname + '/uploads/' + filename;
//         const bufferData= new Buffer(file.data.split(',')[1],'base64');
//         fs.writeFile(path,bufferData,()=>{
//             console.log('file saved:'+path);
//         });
//         }
//     if(recipient && (text || file) )
//     {
//         const messageDoc= await Message.create({
//             sender:connection.userId,
//             recipient,
//             text,
//             file: file ? filename:null,

//         });
//         [...wss.clients]
//         .filter(c=>c.userId === recipient)
//         .forEach(c=>c.send(JSON.stringify({
//             text,
//             sender:connection.userId,
//             recipient,
//             file: file ? filename:null,
//             _id:messageDoc._id,
//         })));
//     }
// });
connection.on('message', async (message) => {
    const messageData = JSON.parse(message.toString());
    const {recipient, text, file} = messageData;
    let filename = null;
    console.log("jhhjr");
    if (file) {
      try {
        const myCloud = await cloudinary.v2.uploader.upload(file.data, {
          folder: "messages",
          width: 250,
          crop: 'fit'
        });
  
        filename = myCloud.public_id;

        // console.log("image file name", filename);
      } catch (error) {
        console.error('Error uploading file to Cloudinary:', error);
        // Handle the error appropriately
      }
    }
    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      });
      // console.log('created message');
      [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => c.send(JSON.stringify({
            text,
            sender: connection.userId,
            recipient,
            file: file ? filename : null,
            _id: messageDoc._id,
          })));
      }
    });

 //notify every1 abt online people when some1 connects
  notifyAboutOnlinePeople();
});

wss.on('close',data=>{
    console.log('disconnect',data);
});