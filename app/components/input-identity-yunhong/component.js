import C from 'ui/utils/constants';
import layout from './template';
// import { get, set, computed } from '@ember/object';

export default Ember.Component.extend({
  layout,
  access: Ember.inject.service(),
  intl: Ember.inject.service(),
  globalStore: Ember.inject.service(),
  allowTeams: true,
  checking: false,
  addInput: '',
  allPrincipals: null,
  selected: null,
  selectExactOnBlur: true,
  includeLocal: true,

  showDropdown: Ember.computed('access.provider', function() {
    return Ember.get(this, 'access.provider') !== 'localauthconfig';
  }),

  init: function() {
    this._super(...arguments);
    // Ember.set(this, 'allPrincipals', Ember.get(this, 'globalStore').all('principal'));
  },

  actions: {
    add: function() {
      if ( Ember.get(this, 'checking') ) {
        return;
      }


      const addInput = Ember.get(this, 'addInput');
      if ( !addInput ) {
        Ember.set(this, 'selected', null);
        this.sendAction('action', null);
        console.log('Cleared principal');
        return;
      }

      Ember.set(this, 'checking', true);
      var input = Ember.get(addInput, 'value').trim();
      let match = Ember.get(this, 'allPrincipals').findBy('id', input);

      var setPrincipal = (principal) => {
        Ember.set(this, 'addInput', '');
        Ember.set(this, 'selected', principal);
        this.sendAction('action', principal);
        console.log('Set principal to 1', JSON.stringify(principal));
      }

      if (match) {
        setPrincipal(match);
        Ember.set(this, 'checking', false);
      } else {
        Ember.get(this, 'globalStore').rawRequest({
          url: `principals/${encodeURIComponent(input)}`,
          method: 'GET',
        }).then((xhr) => {
          if ( xhr.status === 204 ) {
            return;
          }

          if ( xhr.body && typeof xhr.body === 'object' ) {
            let principal = Ember.get(xhr, 'body');
            setPrincipal(principal);
          }
        }).catch((xhr) => {
          this.sendAction('onError','Principal not found: ' + xhr.statusText);
        }).finally(() => {
          Ember.set(this, 'checking', false);
        });
      }
    },

    addObject: function(info) {
      this.sendAction('action', info);
      Ember.set(this, 'selected', info);
      console.log('Set principal to 2', JSON.stringify(info));
      Ember.set(this, 'filter', get(info,'name'));
    },

    selectExact(match) {
      const cur = Ember.get(this, 'selected');
      if ( !cur ) {
        this.sendAction('action', match);
        Ember.set(this, 'selected', match);
        console.log('Set principal to 3', JSON.stringify(match));
      }
    },
  },

  addDisabled: Ember.computed('addInput','checking', function() {
    let input = Ember.get(this, 'addInput.value')||'';

    return Ember.get(this, 'checking') || input.trim().length === 0;
  }),

  dropdownChoices: Ember.computed('allPrincipals.@each.{logicalType,id}','allowTeams', function() {
    var allowTeams = Ember.get(this, 'allowTeams');
    const allPrincipals = Ember.get(this, 'allPrincipals') || []
    return allPrincipals.filter((principal) => {
      var type = Ember.get(principal, 'parsedExternalType');
      var logicalType = Ember.get(principal, 'logicalType');

      // Don't show other junk that was added to the store after load
      if ( !Ember.get(principal, '_mine') ) {
        return false;
      }

      // Don't show people
      if ( logicalType === C.PROJECT.PERSON ) {
        return false;
      }

      // Don't show teams if disabled
      if ( !allowTeams && type === C.PROJECT.TYPE_GITHUB_TEAM ) {
        return false;
      }

      return true;
    }).sortBy('logicalTypeSort','profileUrl','name');
  }),

  dropdownLabel: Ember.computed('access.provider', 'intl.locale', function() {
    let out = '';
    let intl = Ember.get(this, 'intl');
    if ( Ember.get(this, 'access.provider') === 'githubconfig' ) {
      out = intl.findTranslationByKey('inputIdentity.dropdownLabel.teams');
    } else {
      out = intl.findTranslationByKey('inputIdentity.dropdownLabel.groups');
    }

    return intl.formatMessage(out);
  }),
});
