var jwtSecret = 'hex game secret private key';
var nextTurn = 'blue';
var response = {
    info: ''
};
var playerStatus = {};
var blueToken;
var redToken;

var app = require('express')()
    , server = require('http').createServer(app)
    , jwt = require('jsonwebtoken')
    , socketioJwt = require('socketio-jwt')
    , io = require('socket.io').listen(server, { log: false });

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/views/index.html')
});

app.post('/red', function (req, res) {
    var redSideProfile = {
        side: 'red'
    };
    redToken = jwt.sign(redSideProfile, jwtSecret, { expiresInMinutes: 60*5 });
    res.json({token: redToken});
});

app.post('/blue', function (req, res) {
    var blueSideProfile = {
        side: 'blue'
    };

    blueToken = jwt.sign(blueSideProfile, jwtSecret, { expiresInMinutes: 60*5 });
    res.json({token: blueToken});
});

app.post('/viewer', function (req, res) {
    var blueSideProfile = {
        side: 'viewer'
    };

    var viewerToken = jwt.sign(blueSideProfile, jwtSecret, { expiresInMinutes: 60*60 });
    res.json({token: viewerToken});
});

io.set('authorization', socketioJwt.authorize({
    secret: jwtSecret,
    handshake: true
}));

io.sockets.on('connection', function (socket) {
    console.log("notification: --------------------------- " + socket.handshake.decoded_token.side, 'connected');
    var side = socket.handshake.decoded_token.side;
    if (side !== 'blue' && side !== 'red') {
        return;
    }
    if (side == 'blue') {
        playerStatus.hasBluePlayer = true;
    } else if (side == 'red') {
        playerStatus.hasRedPlayer = true;
    }

    socket.on('moveRequest', function (token) {
        if ((!redToken || !blueToken) && token != blueToken && token != redToken) {
            return;
        }
        if (nextTurn == side) {
            response.isError = true;
            response.side = side;
            io.sockets.emit('moveResponse', response);
        } else {
            response.info += side + ' make a move..............' + '<br>';
            response.isError = false;
            nextTurn = side;
        }
    }).on('logout', function(token) {
        if (token == blueToken) {
            blueToken = undefined;
            playerStatus.hasBluePlayer = false;
        } else if(token == redToken) {
            redToken = undefined;
            playerStatus.hasRedPlayer = false;
        }
    });
});

setInterval(function () {
    io.sockets.emit('playerStatus', playerStatus);
    io.sockets.emit('moveResponse', response);
}, 500);

server.listen(3000);
