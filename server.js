const express = require('express')
const mongoose = require('mongoose');
const formidable = require('formidable');
const schedule = require('node-schedule');
const path = require('path')
var fs = require('fs');

const User = require('./models/user');
const { update } = require('./models/user');

const app = express();
app.use(express.json());


// For monog db :D
const databaseURI = '';
mongoose.connect(databaseURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => console.log('Connected to database c:'))
  .catch((error) => console.log(`There was an error:\n${error}`));

const port = process.env.PORT || 8080;

// -------------- Helper Functions from stack overflow to calculate age and create random data. --------------
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



// -------------- Create Data. --------------
app.post('/api/createUser', (req, res) => {

  // if there is url arguement 'q' it will attempt to create q users with random data.
  // otherwise it will attempt to create a user from request body data. No validation is carried out.
  if (req.query.q){
    let userArray = []; //empty array to later push to the db
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
    return res.send({"success":"Created Accounts..."});
  }
  let age = new Date(parseInt(req.body.y), (parseInt(req.body.m) - 1), parseInt(req.body.d));
  const user = new User({
    name: req.body.name,
    username: req.body.username,
    dob: age,
    currentAge: calculate_age(age)
  });

  // Quick find one to check the username isnt taken c: (the only kind of validation I added for some reason???)
  User.findOne({ username: new RegExp('^' + req.params.username + '$', "i") }, (err, doc) => {

    if (!doc) {
      user.save()
        .then((result) => {
          res.status(201).send(result);
        })
        .catch((err) => {
          console.log(err);
          res.status(400).send({"error":'Failed to create user data'});
        });
    } else {
      res.status(400).send({"error":'Failed to create user data'});
    }
  });
  
});

app.post('/api/changePfp', (req, res) => {

  // No validation of the file uploaded, or cropping, or compression of the image takes place.
  // All of the above should probably be added.
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  User.findOne({username: new RegExp('^'+fields.username+'$', "i")}, (err, doc) => {
    // Literally just copies the uploaded file to the working directory.
    if (doc){
        var oldpath = files.filetoupload.filepath;
        var newpath = './userImages/' + fields.username + ".jpg";
        doc.profilePicture = newpath;
        // 'renaming' the file to a new location threw an error, but copying seems to work :)
        fs.copyFile(oldpath, newpath, function (err) {
          if (err) throw err;
          res.status(200).send({"success":'Uploaded New pfp'});
        });
        doc.save();
      }
    });
  });
});

// -------------- Retrieve Data. --------------
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

// -------------- Update Data. --------------
app.put('/api/changeBio/:username/:bio?', (req, res) => {
    // Logic to update bio
    User.updateOne({username: new RegExp('^'+req.params.username+'$', "i")}, {bio: ( req.params.bio || "" )}, (err, doc) => {
      //console.log(doc);
      if (err) return res.status(500).send({"error": "internal server error"});
  
      if (doc.modifiedCount == 1) return res.status(200).send({"success":"Updated bio"});
      
      return res.status(200).send({"error": "user not found"});
  
    });
});

app.put('/api/changeName/:username/:newName', (req, res) => {
  // Logic to update name, no validation again :(
  User.updateOne({username: new RegExp('^'+req.params.username+'$', "i")}, {name: req.params.newName}, (err, doc) => {
    //console.log(doc);
    if (err) return res.status(500).send({"error": "internal server error"});

    if (doc.modifiedCount == 1) return res.status(200).send({"success":"Updated username"});
    
    return res.status(200).send({"error": "user not found"});

  });
});


// -------------- Delete Data. --------------
app.delete('/api/user/:username', (req, res) => {
  // No validation, just attempts to delete the first document with that username, should only have one user with that name anyway.
  User.deleteOne({username: req.params.username})
    .then((result) => {
      return res.status(200).send({"success":"Deleted User"});
    })
    .catch((err) =>{
      console.log(err);
      return res.status(500).send({"error":"internal server error"});
    })
});

// Who would have thought Create, Retrieve, Update and Delete stands for CRUD huh... Guess I am doing something right.

// Updates users age.
function updateUsers() {

  // Icky solution :( - but it works I guess...
  // Goes through every account and recalculates the age. It might not be the most efficient, but it works.
  User.find({}, (err, docs) => {
    docs.forEach((doc) => {
      User.updateOne({username:doc.username}, {currentAge: calculate_age(new Date(Date.parse(doc.dob)))}, (err, document) => {
     });
     // Could try editing 'doc' and then trying doc.save(); Not sure of the efficiency of each of these.
    });
  });

}

// Deletes users with an age less that or more than 30% away from the average of all users.
function deleteUsers() {

  // This solution feels gross, not even sure if I'm doing the right calculation? But hey if i'm not, thats easily changed :D
  // Calculates the average.
  User.aggregate([
    {
      $group: {
        _id: null,
        currentAge: { $avg: "$currentAge" },
      }
    }
  ], {allowDiskUse: true})
  .then((result) => {
    let avgAge = result[0].currentAge; // grabs the average age calculated by mongo :D.
    // deletes all accounts with an age that is above 30% of the average higher than the average.
    User.deleteMany({currentAge: {$gt: avgAge+((avgAge/100)*30)}}, (boo, count) => {
      //console.log(count);
    });
    // deletes all accounts with an age that is below 30% of the average higher than the average.
    User.deleteMany({currentAge: {$lt: avgAge-((avgAge/100)*30)}}, (boo, count) => {
      //console.log(count);
    });
    console.log('Executed user purge.')
  })

}

// Repeating tasks.
//setInterval(updateUsers, 60000); // Will Run the task every 10 minutes.
const routineUpdateUsers = schedule.scheduleJob('*/10 * * * *', updateUsers);
//setInterval(deleteUsers, 120000); // Will Run the task every 20 minutes.
const routineDeleteUsers = schedule.scheduleJob('*/20 * * * *', deleteUsers);

// Just a scuffed test page to check a few things :)
app.get('/', (req, res) => {

  res.sendFile(__dirname + '/index.html');

});
app.use('/userImages', express.static(path.join(__dirname, '/userImages/')))




app.listen(port, () => console.log(`Server listening on port ${port}.`));