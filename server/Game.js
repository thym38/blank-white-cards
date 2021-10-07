class Game {
    constructor(code, host_id, host) {
        this.code = code;
        this.host = host_id;
        this.players = [host];
        this.number = null;
        // this.scores = []; track these under
        // this.effects = [];       each player instead??
        this.turn = 1;
        this.totalCards = 182; // default
    }

    startGame() {
        this.number = this.players.length;

        this.turn = (this.turn) % this.number;
        this.players[this.turn].myturn = true;

        console.log("started game!");
    }

    playedCard(played_card) {
        // this.players[this.turn].cards = this.players[this.turn].cards.filter(card => card !== played_card.id)
    }

    updateScore(score_change){
        this.players[this.turn].score += score_change;
    }

    changeScore(score_change, player_id){
        this.players.filter(player => player.id === player_id)[0].score += score_change;
    }

    drawCard() {
        return Math.floor(Math.random() * this.totalCards) + 1; // +1 to make ints start from 1
    }

    nextPlayer() {
        this.players[this.turn].myturn = false;
        this.turn = (this.turn + 1) % this.number;
        this.players[this.turn].myturn = true;

        this.players[this.turn].updateEffects();

        console.log("it is "+ this.players[this.turn].id + "'s turn");
    }

    currentPlayer() {
        return this.players[this.turn]
    }
    
}
  
module.exports = Game;