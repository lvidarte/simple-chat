var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);
var fs = require('fs');
var url = require('url');

var conns = [];

function handler (req, res) {
    if (req.url.match(/^\/chat\?nick=/))
        show('/chat.html', res);
    else if (req.url.match(/^(\/|\/\?error=.*)$/))
        show('/login.html', res);
    else {
        res.writeHead(404);
        res.end('Document not found');
    }
}

app.listen(8000);

function show(filename, res) {
    fs.readFile(__dirname + filename, function (err, data) {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading ' + __dirname + filename);
        }
        res.writeHead(200);
        res.end(data);
    });
}

io.set('heartbeats', false);
io.sockets.on('connection', function (socket) {
    socket.on('disconnect', function () {
        logout({'nick': socket.nick, 'id': socket.id});
    })
    socket.on('login', function (data) {
        var nick_exists = false;
        for (var i=0; i<conns.length; i++) {
            if (conns[i].nick == data.nick) {
                nick_exists = true;
                break;
            }
        }
        if (nick_exists) {
            msg = { nick:  '_SERVER_',
                    msg:   data.nick + ' already exists',
                    time:  Date.now(),
                    error: true };
        }
        else {
            socket.nick = data.nick; // Save nickname in socket
            conns.push(socket);
            // Broadcast message
            socket.broadcast.emit('chat',
                                  { nick: '_SERVER_',
                                    msg:  data.nick + ' has joined the chat',
                                    time: Date.now() });
            // Welcome message
            msg = { nick: '_SERVER_',
                    msg:  'Hello ' + data.nick,
                    time: Date.now() };
        }
        console.log(msg);
        socket.emit('chat', msg);
    });
    socket.on('logout', function(data) {
        logout(data);
    });
    socket.on('msg', function (data) {
        console.log(data);
        for (var i=0; i<conns.length; i++) {
            conns[i].emit('chat', { nick: socket.nick,
                                    msg:  data.msg,
                                    time: Date.now() });
        }
    });
});

function logout (data) {
    for (var i=0; i<conns.length; i++) {
        if (conns[i].nick == data.nick) {
            conns[i].broadcast.emit('chat',
                                    { nick: '_SERVER_',
                                      msg:  data.nick + ' has left the chat',
                                      time: Date.now() });
            s = conns.splice(i, 1);
            console.log('user disconnect: ' + data.nick);
            break;
        }
    }
}
