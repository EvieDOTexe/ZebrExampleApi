const express = require('express')
const mongoose = require('mongoose');
const formidable = require('formidable');
const path = require('path')
var fs = require('fs');

const User = require('./models/user');
const { update } = require('./models/user');

const app = express();
app.use(express.json());

// Helper Functions
function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
          charactersLength));
  }
  return result;
}
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}
function calculate_age(dob) {
  var diff_ms = Date.now() - dob.getTime();
  var age_dt = new Date(diff_ms);

  return Math.abs(age_dt.getUTCFullYear() - 1970);
}




// For monog db :D
const databaseURI = 'mongodb+srv://GeorgieDOTexe:GeorgieDOTexe123@mycluster.fvj3w.mongodb.net/ZebrExample?retryWrites=true&w=majority';
mongoose.connect(databaseURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => console.log('Connected to database c:'))
  .catch((error) => console.log(`There was an error:\n${error}`));

const port = process.env.PORT || 8080;

// Create data.
app.post('/api/createUser', (req, res) => {

  if (req.query.q){
    let userArray = [];
    for (let i = 0; i< parseInt(req.query.q); i++){
      let age = new Date(randomIntFromInterval(1900, 2004), randomIntFromInterval(0, 11), randomIntFromInterval(1, 28)); // this is just dummy data anyway :) 
      userArray.push({
        name: makeid(20),
        username: makeid(20),
        dob: age, 
        currentAge: calculate_age(age),
        bio: makeid(100)
      });
    }
    User.insertMany(userArray);
    return res.send("Created Accounts...");
  }
  let age = new Date(parseInt(req.body.y), (parseInt(req.body.m) - 1), parseInt(req.body.d));
  const user = new User({
    name: req.body.name,
    username: req.body.username,
    dob: age,
    currentAge: calculate_age(age)
  });

  User.findOne({ username: new RegExp('^' + req.params.username + '$', "i") }, (err, doc) => {

    if (!doc) {
      user.save()
        .then((result) => {
          res.status(201).send(result);
        })
        .catch((err) => {
          console.log(err);
          res.status(400).send('Failed to create user data');
        });
    } else {
      res.status(400).send('Failed to create user data');
    }
  });
  
});

app.post('/api/changePfp', (req, res) => {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  User.findOne({username: new RegExp('^'+fields.username+'$', "i")}, (err, doc) => {

    if (doc){
        var oldpath = files.filetoupload.filepath;
        var newpath = './userImages/' + fields.username + ".jpg";
        doc.profilePicture = newpath;
        console.log(fields.username);
        fs.copyFile(oldpath, newpath, function (err) {
          if (err) throw err;
          res.status(200).send('Uploaded New pfp');
        });
        doc.save();
      }
    });
  });
});

// Retrieve data.
app.get('/api/user/:username?', (req, res) => {
  // Logic to get users

  if (req.query.all == "true") {
    User.find()
      .then((result) => {
        return res.send(result);
      })
      .catch((err) => {
        console.log(err);
      })
    return;
  }

  if (!req.params) return res.status(204).send({"error": "user not found"});

  User.findOne({username: new RegExp('^'+req.params.username+'$', "i")}, (err, doc) => {
    if (err) return res.status(500).send({"error": "internal server error"});

    if (doc) return res.status(200).send(doc);
    
    return res.status(204).send({"error": "user not found"});

  });

});

// Update data.

app.put('/api/changeBio/:username/:bio?', (req, res) => {
    // Logic to update name
    User.updateOne({username: new RegExp('^'+req.params.username+'$', "i")}, {bio: ( req.params.bio || "" )}, (err, doc) => {
      console.log(doc);
      if (err) return res.status(500).send({"error": "internal server error"});
  
      if (doc) return res.status(200).send("Updated username");
      
      return res.status(204).send({"error": "user not found"});
  
    });
});

app.put('/api/changeName/:username/:newName', (req, res) => {
  // Logic to update name
  User.updateOne({username: new RegExp('^'+req.params.username+'$', "i")}, {name: req.params.newName}, (err, doc) => {
    console.log(doc);
    if (err) return res.status(500).send({"error": "internal server error"});

    if (doc) return res.status(200).send("Updated username");
    
    return res.status(204).send({"error": "user not found"});

  });
});


// Delete data.
app.delete('/api/user/:username', (req, res) => {
  User.deleteOne({username: req.params.username})
    .then((result) => {
      return res.status(200).send("Deleted User");
    })
    .catch((err) =>{
      console.log(err);
      return res.status(500).send("internal server error");
    })
});

// Who would have thought Create, Retrieve, Update and Delete stands for CRUD huh... Guess I am doing something right.

// Updates users age.
function updateUsers() {

  // Icky solution :( - but it works I guess...
  User.find({}, (err, docs) => {
    docs.forEach((doc) => {
      User.updateOne({username:doc.username}, {currentAge: calculate_age(new Date(Date.parse(doc.dob)))}, (err, document) => {
     });
    });
  });

}

// Deletes users with an age less that or more than 30% away from the average of all users.
function deleteUsers() {

  // This solution feels gross, not even sure if I'm doing the right calculation? But hey if i'm not, thats easily changed :D
  User.aggregate([
    {
      $group: {
        _id: null,
        currentAge: { $avg: "$currentAge" },
      }
    }
  ], {allowDiskUse: true})
  .then((result) => {
    let avgAge = result[0].currentAge;
    console.log("Average age was: " + avgAge);
    User.deleteMany({currentAge: {$gt: avgAge+((avgAge/100)*30)}}, (boo, count) => {
      console.log(count);
    });
    User.deleteMany({currentAge: {$lt: avgAge-((avgAge/100)*30)}}, (boo, count) => {
      console.log(count);
    });
  })

}

setInterval(updateUsers, 60000); // Will Run the task every 10 minutes.
setInterval(deleteUsers, 120000); // Will Run the task every 20 minutes.

// Just test page for proof of concept n stuff <3
app.get('/', (req, res) => {

  res.sendFile(__dirname + '/index.html');

});
app.use('/userImages', express.static(path.join(__dirname, '/userImages/')))




app.listen(port, () => console.log(`Server listening on port ${port}.`));
