const express = require("express");
const socket = require('socket.io');
const app = express();

const { createAdapter } = require("@socket.io/postgres-adapter");
const { Pool } = require("pg");

var randomize = require('randomatic');

let Player = require("./Player");
let Game = require("./Game");

// all cards data for db
var data = require('../cards/result');
const Effect = require("./Effect");
const { loadavg } = require("os");
let card_data = JSON.parse(data)

const PORT = process.env.PORT || 80;
let server = app.listen(PORT);
console.log(`The server is now running at http://localhost`);
app.use(express.static("public"));


let io = socket(server);

const options = {
    user: "newuser",
    host: "localhost",
    database: "blankcards",
    password: "password",
    port: 5432,
}

const herokuoptions = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
}

const pool = new Pool(options);
io.adapter(createAdapter(pool));

let players = [];
let games = [];

// setInterval(updateGame, 1600);

io.sockets.on("connection", socket => { 
    console.log(`New connection ${socket.id}`);
    players.push(new Player(socket.id));

    socket.on("disconnect", () => {
        io.sockets.emit("disconnected", socket.id);
        players = players.filter(player => player.id !== socket.id);
        console.log(`${socket.id} disconnected`);
    });
    socket.on("removed", data => remove(data.code, data.player));

    // socket.on("test", message => console.log("test " + message));

    // socket.on("newcard", message => addCard(message));

    socket.on("setName", data => setName(data.player_id, data.name));
    socket.on("newRoom", host => newRoom(host, socket));
    socket.on("joinRoom", data => joinRoom(data.code, data.player, socket));
    socket.on("startGame", code => startGame(code))
    socket.on("playedcard", data => cardPlayed(data.code, data.card));

    socket.on("manualDeal", data => manualDeal(data.code, data.players));
    socket.on("addPoint", data => addPoint(data.code, data.players, data.points));
    socket.on("multiplyPoints", data => multiplyPoints(data.code, data.players));
    socket.on("dropped", data => dropped(data.player_id, data.card_id));
    socket.on("lava", players => lava(players));
    socket.on("gravity", players => gravity(players));
    
    socket.on("cancelEffect", data => cancelEffect(data.code, data.player_id, data.effect_index));

    socket.on("finishManualChanges", code => endTurn(code));    
});

function getGame(room) {
    for (game in games) {
        if (games[game].code === room) {
            return games[game];
        }
    }
}

function getPlayer(player_id) {
    
    for (player in players) {
        if (players[player].id === player_id) {
            return players[player];
        }
    }
}

// function updateGame() {
//     for (game in games) {
//         io.to(games[game].code).emit("heartbeat", games[game].players);
//     }
// }

function remove(code, playerId) {
    let this_game = getGame(code);
    if (this_game) {
        this_game.players = this_game.players.filter(player => player.id !== playerId);
    }
}

function startGame(code) {
    let this_game = getGame(code);
    this_game.startGame();
    getAllCards()

    for (player in this_game.players){
        deal(this_game, 5, this_game.players[player].id);
    }

    // emit first player
    io.to(this_game.code).emit("start", this_game.players);

}

function deal(game, num, player_id) {
    hand = [];
    for (let i = 0; i < num; i++) {
        hand.push(game.drawCard())
    }
    io.to(player_id).emit("deal", hand);
}

function manualDeal(code, player_ids) {
    let this_game = getGame(code);
    for (id in player_ids) {
        deal(this_game, 1, player_ids[id])
    }
}

function getAllCards(){
    pool.query('SELECT * FROM cards;', [], async (err, result) => {
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        io.sockets.emit("allCards", result.rows);
    });
}
  
function addCard() {
    (async () => {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          const queryText = 'INSERT INTO cards(name, descr, value) VALUES($1, $2, $3) RETURNING id'
          
          for (card in card_data) {
              let res = await client.query(queryText, [card_data[card].name, card_data[card].descr, card_data[card].value])
          }
          await client.query('COMMIT')
        } catch (e) {
          await client.query('ROLLBACK')
          throw e
        } finally {
          client.release()
        }
      })().catch(e => console.error(e.stack))
}

function updateClientPlayers(recip, players) {
    io.to(recip).emit("updatePlayers", players);
}

function cardPlayed(code, card) {
    // get this game
    let this_game = getGame(code);

    // update score with any card point based effects applied to player
    this_game.effectScore(card.value);

    // need to send updated score before host can make changes
    // io.to(this_game.code).emit("updatePlayers", this_game.players);
    updateClientPlayers(this_game.code, this_game.players)

    // emit played card to all players and allow host to make manual adjustments
    io.to(this_game.code).emit("cardplayed", card);
}

// received notice of host finished manual changes
function endTurn(code) {
    let this_game = getGame(code);

    // allocate new card to curr player and emit
    deal(this_game, 1, this_game.currentPlayer().id)

    // change turn to next player
    this_game.nextPlayer();

    // emit new players list with any changed scores and effects
    // io.to(this_game.code).emit("updatePlayers", this_game.players);
    updateClientPlayers(this_game.code, this_game.players)
}

function setName(player_id, name) {
    let this_player = getPlayer(player_id);
    this_player.name = name;
}

function newRoom(host_id , socket) {
    let host = getPlayer(host_id);
    let code = randomize('Aa0', 7);
    games.push(new Game(code, host_id, host));

    socket.join(code);
    io.to(code).emit("newRoomCode", code);
}

function joinRoom(code, player, socket) {
    let this_player = getPlayer(player);
    let this_game = getGame(code);
    this_game.players.push(this_player);

    socket.join(code);
}

function addPoint(code, player_ids, points) {
    let this_game = getGame(code);
    for (id in player_ids) {
        this_game.changeScore(points, player_ids[id]);
    }

    // emit new players list with any changed scores and effects
    // io.to(this_game.code).emit("updatePlayers", this_game.players);
    updateClientPlayers(this_game.code, this_game.players)
}

function multiplyPoints(code, player_ids) {
    let this_game = getGame(code);
    for (id in player_ids) {
        this_game.changeScore(1, player_ids[id]);
    }

    // emit new players list with any changed scores and effects
    // io.to(this_game.code).emit("updatePlayers", this_game.players);
    updateClientPlayers(this_game.code, this_game.players)
}

// host dropped specific card to a player from card menu
function dropped(player_id, card_id) {
    io.to(player_id).emit("deal", [card_id]);
}

function lava(player_ids) {
    let this_player;
    for (id in player_ids) {
        this_player = getPlayer(player_ids[id])
        this_player.addEffect(new Effect(2, 'Lava', -1, -1, null, null))
    }
}

function gravity(player_ids) {
    let this_player;
    for (id in player_ids) {
        this_player = getPlayer(player_ids[id])
        this_player.addEffect(new Effect(1, 'Gravity', -1, null, 0.5, null))
    }
}

function cancelEffect(code, player_id, effect_index) {
    this_game = getGame(code);
    this_player = getPlayer(player_id);
    this_player.removeEffect(effect_index);
    updateClientPlayers(code, this_game.players)
}
