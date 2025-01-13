const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const bodyParser = require("body-parser");

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const logLogSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

const exerciseSchema = new mongoose.Schema({
  ...userSchema.obj,
  ...logLogSchema.obj,
});

// const logSchema = new mongoose.Schema({
//   ...userSchema.obj,
//   count: {
//     type: Number,
//     required: true
//   },
//   log: [logLogSchema]
// })

const Exercise = mongoose.model("Exercise", exerciseSchema);
const User = mongoose.model("User", userSchema);
// const Log = mongoose.model('Log', logSchema);

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use("/api/users", bodyParser.urlencoded({ extended: false }));

app.post("/api/users", async (req, res) => {
  const usernameInput = req.body.username;

  try {
    const user = new User({
      username: usernameInput,
    });
    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (err) {
    res.json({
      error: err,
    });
    console.error(err);
    return;
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    const responseUsersArray = users.map((user) => ({
      username: user.username,
      _id: user._id,
    }));
    res.send(responseUsersArray);
  } catch (err) {
    res.json({
      error: err,
    });
    console.error(err);
    return;
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const _id = req.params._id;

  let foundUser;
  try {
    foundUser = await User.findById(_id);
  } catch (err) {
    if (err) {
      res.json({
        error: err,
      });
      return console.error(err);
    }
  }

  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date ? new Date(req.body.date) : new Date();

  try {
    const newExercise = new Exercise({
      username: foundUser.username,
      description: description,
      duration: duration,
      date: date,
    });

    try {
      const savedExercise = await newExercise.save();
      res.json({
        _id: foundUser._id,
        username: foundUser.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: savedExercise.date.toDateString(),
      });
    } catch (err) {
      if (err) {
        res.json({
          error: err,
        });
        return console.error(err);
      }
    }
  } catch (err) {
    if (err) {
      res.json({
        error: err,
      });
      return console.error(err);
    }
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;

  const _id = req.params._id;

  let foundUser;
  try {
    foundUser = await User.findById(_id);

    try {
      // construct query for find
      let findQuery = { username: foundUser.username };
      if (from) {
        findQuery.date = {
          ...findQuery.date,
          $gte: from,
        };
      }
      if (to) {
        findQuery.date = {
          ...findQuery.date,
          $lte: to,
        };
      }

      // optionally apply limit to find query
      let foundExercises;
      if (limit) {
        foundExercises = await Exercise.find(findQuery).limit(limit);
      } else {
        foundExercises = await Exercise.find(findQuery);
      }

      const foundLogs = foundExercises.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      }));

      res.json({
        _id: foundUser._id,
        username: foundUser.username,
        count: foundLogs.length,
        log: foundLogs,
      });
    } catch (err) {
      if (err) {
        res.json({
          error: err,
        });
        return console.error(err);
      }
    }
  } catch (err) {
    if (err) {
      res.json({
        error: err,
      });
      return console.error(err);
    }
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
