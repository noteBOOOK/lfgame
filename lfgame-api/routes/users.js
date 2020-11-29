const express = require('express');
const router = express.Router();
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');



module.exports = ({
    getUserByEmail,
    addUser,
    getUserByUsername,
    getPreviousSessions,
    favouriteGame,
    updateUserProfile,
    getUserByID
}) => {


    router.get('/', (req, res) => {
      console.log("HEADER TOKEN: ", req.headers);
      jsonwebtoken.verify(req.headers.authorization, process.env.JWT_SECRET, (err, data) => {
        if (err) {
          res.sendStatus(403);
        } else {
          getUserByID(data.id)
          .then(user => {
            res.json(user)
          })
          .catch(err => res.json(err));
        }
      })
    });

    router.post('/register', (req, res) => {

    const {
      username,
      email,
      password
    } = req.body;
        
    Promise.all([
      getUserByEmail(email),
      getUserByUsername(username)
    ]).then((all) => {
      if (all[0] || all[1]) {
        res.status(401).json({
          msg: 'Sorry, a user account with this email or username already exists'
        });
      } else {
        const hashedPassword = bcrypt.hashSync(password, process.env.SALT_ROUNDS | 0);
        addUser(username, email, hashedPassword)
          .then(user => res.json({
            token: jsonwebtoken.sign({ id: user.id }, process.env.JWT_SECRET)
          }));
      }
    }).catch(err => res.json({
      error: err.message
    }));

  });

  router.post('/login', (req, res) => {

    const {
      email,
      password
    } = req.body;

    getUserByEmail(email)
      .then(user => {

        if (user) {            
          if (bcrypt.compareSync(password, user.password)) {
            res.json({
              token: jsonwebtoken.sign({ id: user.id }, process.env.JWT_SECRET)
            });
          } else {
            res.status(401).json({ error: 'Wrong password'});
          }
        } else {
          res.status(401).json({ error: 'Wrong email adress'});
        }
      })
      .catch(err => res.json({
        error: err.message
      }));
  });

  router.get('/:userID', (req, res) => {

    jsonwebtoken.verify(req.headers.authorization, process.env.JWT_SECRET, (err) => {
      if (err) {
        res.sendStatus(403);
      } else {
        const userID = req.params.userID;
        getUserByID(userID)
          .then(user => {
            const result = { user };

            Promise.all([
              getPreviousSessions(user.id),
              favouriteGame(user.id)
            ]).then(all => {
              result.sessionsList = all[0];
              result.favourite = all[1];
              res.json(result);
            });
          })
          .catch((err) => res.json({
            error: err.message
          }));
      }
    });
  });

  router.post('/:userID', (req, res) => {
    jsonwebtoken.verify(req.headers.authorization, process.env.JWT_SECRET, (err, data) => {
      if (err) {
        res.sendStatus(403);
      } else {
        const {avatar, username, email, steamID} = req.body;
        
        Promise.all([
          getUserByEmail(email),
          getUserByUsername(username)
        ]).then((all) => {
          if ((all[0] && all[0].id !== data.id) || (all[1] && all[1].id !== data.id)) {
            res.status(401).json({
              msg: 'Sorry, a user account with this email or username already exists'
            });
          } else {
            updateUserProfile(avatar, username, email, steamID, data.id)
            .then(result => {
              res.json({
                token: jsonwebtoken.sign({ id: result.id }, process.env.JWT_SECRET)
              })
            }).catch(err => res.json({
              error: err.message
            }));
          }
        })
      }
    });
  });

  return router;
};