class Effect {
    constructor(id, name, duration, points, card_points) {
      this.id = id;
      this.name = name;
      this.duration = duration;
      this.isActive = true;
      this.active_turns = 0;
      this.points = points;             // add/subtract constant points per round
      this.card_points = card_points;   // multiply/divide points of any card played
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
  }
  
  module.exports = Effect;