// Data Models
const mongoose = require('mongoose');
const DB_URL = ""
mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Successfully connected to the database mongoDB Atlas Server");    
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit();
});

// User schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    password: { type: String, required: true },
    createon: { type: Date, default: Date.now },
});

// Message schema
const MessageSchema = new mongoose.Schema({
    from_user: { type: String, required: true },
    room: { type: String, required: true },
    message: { type: String, required: true },
    date_sent: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// Express
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendfile('index.html');
});

// Socket.io
const http = require('http').Server(app);
const io = require('socket.io')(http);

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('signup', ({username, firstname, lastname, password}) => {
    const user = new User({
      username: username,
      firstname: firstname,
      lastname: lastname,
      password: password
  });
  user.save((err, user) => {
      if (err) {
          console.log(err);
      } else {
          socket.emit('showLoginForm', user);
      }
  });
  })

  socket.on('login', ({username, password}) => {
    User.findOne({
      username: username,
      password: password
  }, (err, user) => {
      if (err) {
          console.log(err);
      } else {
          if (!user) {
            socket.emit('userLoggedIn', "invalid username or password")
          } else {
            socket.emit('userLoggedIn', {username});
          }

      }
  });
  });

  socket.on('joinRoom', ({username, room}) => {
    var data = {
      username: "chatbot",
      message: `${username} has joined the room`,
      room: room
    }
    socket.join(room);
    socket.emit('userJoinedRoom', data);
    io.to(room).emit('message', data);
  });
  

  socket.on('leaveRoom', ({username, room}) => {
      socket.leave(room);
      io.to(room).emit('chatbot', {
        username: "system",
        message: `${username} has left the room`
      })
      socket.emit('userLoggedIn', {username})
  });

  socket.on('sendMessage', ({username, room, msg}) => {
      var message = new Message({
          from_user: username,
          room: room,
          message: msg
      });
      message.save((err, message) => {
          if (err) {
              console.log(err);
          } else {
              io.to(room).emit('message', {username: message.from_user, message: message.message});
              io.to(room).emit('typingUsers', "");
          }
      });

  });
  
  socket.on('typingMessage', ({username, room}) => {
      io.to(room).emit('typingUsers', username);
  });

  socket.on('disconnect', () => {
      console.log('user disconnected');
  });
});    

http.listen(3000, function() {
  console.log('listening on localhost:3000');
});


