const socket = io.connect();

// https://masteringbackend.com/posts/build-a-real-time-chat-app-with-vuejs-socket-io-and-nodejs

//                     :style="{ outline: outline_size + 'px solid blue'}"

var player_list = {
    props: ['id', 'name', 'score', 'effects', 'host'],
    data () {
        return {
            isSelected: false,
        }
    },
    methods: {
        onSelect () {
            if (this.host) {
                this.isSelected = !this.isSelected;
                this.$emit('selected');
            }     
        }, 
        onDrop () {
            this.$emit('dropped');
        },
        cancel (index) {
            this.$emit('canceleffect', this.id, index)
        }
    },
    template: `
      <div 
      class="player" 
      :class="{ active: isSelected}"
      :key="id"
      @click="onSelect" 
      @drop='onDrop'
      @dragover.prevent
      @dragenter.prevent>
        <h4>{{ name }}</h4>
        <span> Score: {{score}} </span> <br/>
        
        <div v-for="(effect, index) in effects" class="effects"> 
            <span>{{effect.name}} ({{effect.active_turns}}) </span>
            <i class="fas fa-times cross" @click.stop="cancel(index)"></i>
        </div>
      </div>
    `
  }

//   <span v-if="effects.length !== 0"> Effects: </span> <br/>

//  script for modal from https://codepen.io/team/Vue/pen/mdPoyvv
var modal = {
    template: `
    <div class="modal-mask">
        <div class="modal-wrapper">
            <div class="modal-container">

                <div class="modal-header">
                    <slot name="header">default header</slot>
                </div>

                <div class="modal-body">
                    <slot name="body">default body</slot>
                </div>

                <div class="modal-footer">
                    <slot name="footer">
                        <button @click="$emit('close')" class="btn btn-outline-secondary"> Cancel </button>
                        <button @click="$emit('close')" class="btn btn-outline-secondary"> OK </button>
                    </slot>
                </div>

            </div>
        </div>
    </div> `
}


var app = new Vue({
    el: '#app',
    components: {
        modal: modal,
        player_list: player_list,
        // draggable: window["vuedraggable"], 
    },

    directives: {
        tooltip: {
            inserted(el, binding) {
                if (binding.value){
                    if (binding.value.descr) {
                        return new bootstrap.Tooltip(el, {title: binding.value.descr, placement: binding.arg})
                    }
                    return new bootstrap.Tooltip(el, {title: binding.value, placement: binding.arg})
                } else {
                    return new bootstrap.Tooltip(el, {title: '', placement: binding.arg})

                }
            }
        }
    },

    data: {
        players: [],
        cards: [],
        myself: null,
        message: '',
        roomCode: '',
        playerName: '',
        named: false,
        join: false,
        joined: false,
        maderoom: false,
        host: false,
        started: false,
        allowManualChanges: false, 
        allCards: [],
        requestingRoom: false,
        lastPlayed: null,

        showAboutModal: false,
        showModal: false,

        new_card_name: '',
        new_card_descr: '',
        new_card_value: 1,
        new_card_manual: false,
        new_card_auto: 'one',

        selected: null,
        addpoints: 0,
        dragging: null,

        toolDeal: 'Deal a random card, you can deal a specific card by dragging it from the card menu on the left',
    },

    created() {
        socket.on("connect", () => this.myself = socket.id)
        // socket.on("heartbeat", players => this.updateGame(players));
        // socket.on("disconnected", playerId => this.removePlayer(playerId));
        socket.on("newRoomCode", code => this.madeNewRoom(code));
        socket.on("badJoin", () => this.badJoin());
        socket.on("start", players => this.onStart(players));
        socket.on("allCards", cards => this.getAllCards(cards));
        socket.on("deal", hand => this.getHand(hand));
        socket.on("updatePlayers", players => this.turnHandler(players));
        socket.on("cardplayed", card => this.cardPlayed(card));

        this.message = ' ';
        this.message = '';

    },

    computed: {
        filteredCards() {
            if (this.message === ''){
                return this.allCards;
            } else {
                return this.allCards.filter(card => this.cardFilter(card) );
            }
        },

        whoseTurn() {
            let hasTurn = this.players.filter(player => player.myturn)
            if (hasTurn.length === 0) {
                return '';
            } else {
                return hasTurn[0].name;
            }
        },

        hand() {
            if (this.cards.length > 0 && this.allCards.length > 0) {
                return this.cards.map(card => this.allCards[card-1])
            } else {
                return []
            }
        }, 

        selectionMade() {
            if (this.selected) {
                return this.selected.reduce((a, b) => a || b) 
            } else {
                return false
            }
        }
    },

    methods: {
        getMe(){
            return this.players.filter(player => player.id === this.myself)[0]
        },

        getAllCards(cards) {
            this.allCards = cards;
        },

        cardFilter(card) {
            let re = new RegExp(this.message.toLowerCase());
            let res = card.name.toLowerCase().search(re)
            return res !== -1 ? true : false;
            // return card.name.toLowerCase().slice(0,this.message.length) === this.message.toLowerCase()
        },

        updateGame(players){
        },

        playerExists(playerFromServer) {
            for (let i = 0; i < this.players.length; i++) {
                if (this.players[i].id === playerFromServer) {
                return true;
                }
            }
            return false;
        },

        // removePlayer(playerId) {
        //     this.players = this.players.filter(player => player.id !== playerId);
        //     socket.emit("removed", {code: this.roomCode, player: playerId});
        // },

        setName() {
            this.named = true;
            socket.emit("setName", {player_id: this.myself, name: this.playerName});
        },

        newRoom() {
            this.host = true;
            this.requestingRoom = true;
            socket.emit("newRoom", this.myself);
        },

        madeNewRoom(code) {
            if (this.requestingRoom) {
                this.roomCode = code;
            }
            this.requestingRoom = false;
            navigator.clipboard.writeText(this.roomCode);
            this.maderoom = true;
        },

        joinRoom() {
            socket.emit("joinRoom", {code: this.roomCode, player: this.myself});
            this.joined = true;
        },

        badJoin() {
            this.joined = false;
        },

        startGame() {
            socket.emit("startGame", this.roomCode);
        },

        onStart(players) {
            this.players = players;
            if (this.host) {
                this.selected = Array(this.players.length).fill(false)
            }

            var div = document.getElementsByClassName('entry')[0];
            div.parentNode.removeChild(div);
            this.started = true;
        },

        getHand(cards) {
            this.cards = this.cards.concat(cards);
        },

        turnHandler(players) {
            this.players = players;
        },

        clearSearch() {
            this.message = '';
        },

        // when this player plays a card by clicking on it
        playCard(played_card, index) {
            if (this.getMe().myturn) {
                socket.emit("playedcard", {code: this.roomCode, card: played_card})
                let tool = document.getElementsByClassName("tooltip")[0];
                tool.classList.remove('show');
                this.cards.splice(index, 1)
            }
        },

        // when another player has played a card, receive and show on board
        cardPlayed(card) {
            this.lastPlayed = card;
            if (this.host) {
                this.allowManualChanges = true;
            }
        },

        select(index){
            // this.selected[index] = !this.selected[index];
            this.$set(this.selected, index, !this.selected[index])
        },

        manualDeal() {
            socket.emit("manualDeal", {code: this.roomCode, players: this.selected.map((x, i) => x && this.players[i].id).filter(x => x)})
        }, 

        addPoint() {
            socket.emit("addPoint", {code: this.roomCode, players: this.selected.map((x, i) => x && this.players[i].id).filter(x => x), points: this.addpoints})
        }, 

        multiplyPoints() {
            socket.emit("multiplyPoints", {code: this.roomCode, players: this.selected.map((x, i) => x && this.players[i].id).filter(x => x)})
        },

        finishManualChanges() {
            this.allowManualChanges = false;
            socket.emit("finishManualChanges", this.roomCode);
        },

        startDrag (evt, item) {
            evt.dataTransfer.dropEffect = 'move';
            evt.dataTransfer.effectAllowed = 'move';
            evt.dataTransfer.setData('itemID', item.id);
            this.dragging = item;
        }, 

        dropped (player) {
            socket.emit("dropped", {player_id: player.id, card_id: parseInt(this.dragging)});
            this.dragging = null;
        },

        effect(name){
            socket.emit(name, this.selected.map((x, i) => x && this.players[i].id).filter(x => x))
        },

        married() {
            let both = this.selected.map((x, i) => x && this.players[i].id).filter(x => x);
            if (both.length === 2) {
                socket.emit("married", {id_a: both[0], id_b: both[1]})
            }
        },

        cancelEffect(player, index) {
            socket.emit("cancelEffect", {code: this.roomCode, player_id: player, effect_index: index})

        },

        discard(card) {
            this.cards = this.cards.filter(card_id => card_id !== parseInt(card.id));
        }
        
    }
});

app.$mount("#app");