import Ember from 'ember';

export default Ember.Route.extend({
  yunhong: Ember.inject.service(),
  activate: function() {
    $('BODY').addClass('farm');
  },

  deactivate: function() {
    $('BODY').removeClass('farm');
  },
  model: function() {
    if (this.get('yunhong.hasToken')) {
      this.transitionTo('authenticated');
    } else {
      // this.transitionTo('login');
    }
  }
});
