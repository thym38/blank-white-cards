class Player {
    constructor(id) {
      this.id = id;
      this.name = '';
      this.score = 0;
      this.effects = [];
      this.myturn = false;
    }

    addEffect(effect) {
      this.effects.push(effect)
    }

    updateEffects() {
      let stillActive;
      for (let effect in this.effects) {
        stillActive = this.effects[effect].updateEffect()

        if (!stillActive) {
          this.removeEffect(effect)
        }
      }
    }

    removeEffect(index) {
      this.effects.splice(index, 1)
    }

  }
  
  module.exports = Player;