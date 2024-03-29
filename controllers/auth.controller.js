var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
var config = require("../config");

const User = require("../models/user.model");

exports.user_create = function(req, res, next) {
  if (req.body.email && req.body.username && req.body.password) {
    var hashedPassword = bcrypt.hashSync(req.body.password, 8);

    var user = new User({
      email: req.body.email,
      username: req.body.username,
      password: hashedPassword
    });
    //use schema.create to insert data into the db
    user.save(function(err, user) {
      if (err) {
        return next(err);
      } else {
        // create a token
        var token = jwt.sign({ id: user._id }, config.secret, {
          expiresIn: 86400 // expires in 24 hours
        });
        res.status(200).send({ auth: true, token: token });
      }
    });
  } else {
    res.status(500).send("Invalid Information");
  }
};

exports.user_login = function(req, res, next) {
  if (req.body.email && req.body.password) {
    User.findOne({ email: req.body.email }, function(err, user) {
      if (err) return res.status(500).send("Error on the server.");
      if (!user) return res.status(404).send("No user found.");
      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );
      if (!passwordIsValid)
        return res.status(401).send({ auth: false, token: null });
      var token = jwt.sign({ id: user._id }, config.secret, {
        expiresIn: 86400 // expires in 24 hours
      });
      res.status(200).send({ auth: true, token: token });
    });
  } else {
    res.status(500).send("Invalid Information");
  }
};

exports.me = function(req, res, next) {
  var token = req.headers["x-access-token"];
  if (!token)
    return res.status(401).send({ auth: false, message: "No token provided." });

  jwt.verify(token, config.secret, function(err, decoded) {
    if (err)
      return res
        .status(500)
        .send({ auth: false, message: "Failed to authenticate token." });

    User.findById(decoded.id, { password: 0 }, function(err, user) {
      if (err)
        return res.status(500).send("There was a problem finding the user.");
      if (!user) return res.status(404).send("No user found.");

      res.status(200).send(user);
    });
  });
};
