class Effect {
    constructor(id, name, duration, points, card_points, multiplier, partner) {
      this.id = id;
      this.name = name;
      this.duration = duration;
      this.isActive = true;
      this.active_turns = 0;
      this.points = points;             // add/subtract constant points per round
      this.card_points = card_points;   // multiply/divide points of any card played
      this.multiplier = multiplier;
      this.effectPartner = partner;
    }

    activate() {
        this.isActive = true;
    }

    updateEffect() {
        this.active_turns += 1;
        if (this.active_turns == this.duration) {
            this.isActive = false;
        }
        return this.isActive;
    }

    applyPointEffect(player_score) {
        if (this.points) {
            return player_score + this.points;
        } 
        return player_score
    }

    applyCardEffect() {
        if (this.points) {
            return 1;
        }
        if (this.card_points) {
            return this.card_points;
        }
        if (this.multiplier) {
            return multiplier;
        }
    }
  }
  
  module.exports = Effect;