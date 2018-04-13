import Ember from 'ember';
import C from 'ui/utils/constants';

export default Ember.Component.extend({
  access: Ember.inject.service(),
  intl: Ember.inject.service(),
  allowTeams: true,
  checking: false,
  addInput: '',
  allIdentities: null,
  choices: [],
  showDropdown: function() {
    return this.get('access.provider') !== 'localauthconfig';
  }.property('access.provider'),

  init: function() {
    this._super();
  },

  actions: {
    add: function(member) {
      this.get('userStore').find('identity', null, {filter: {name: 'ra'}}).then(res => {
        this.set('allIdentities', res.content)
        let identities = this.get('allIdentities') || []
        let identity = identities.filter(i => i.login === member.value)[0] || null
        if (identity) {
          this.set('addInput','');
          this.send('addObject', identity);
        } else {
          this.sendAction('onError','Identity not found: ' + identity);
        }
      })
    },

    addObject: function(info) {
      this.sendAction('action', info);
    }
  },

  addDisabled: function() {
    return this.get('checking') || this.get('addInput').trim().length === 0;
  }.property('addInput','checking'),

  dropdownChoices: function() {
    var allowTeams = this.get('allowTeams');
    return this.get('allIdentities').filter((identity) => {
      var type = identity.get('externalIdType');
      var logicalType = identity.get('logicalType');

      // Don't show people
      if ( logicalType === C.PROJECT.PERSON )
      {
        return false;
      }

      // Don't show teams if disabled
      if ( !allowTeams && type === C.PROJECT.TYPE_GITHUB_TEAM )
      {
        return false;
      }

      return true;
    }).sortBy('logicalTypeSort','profileUrl','name');
  }.property('allIdentities.@each.{logicalType,externalIdType}','allowTeams'),

  dropdownLabel: function() {
    let out = '';
    let intl = this.get('intl');
    if ( this.get('access.provider') === 'githubconfig' )
    {
      out = intl.findTranslationByKey('inputIdentity.dropdownLabel.teams');
    }
    else
    {
      out = intl.findTranslationByKey('inputIdentity.dropdownLabel.groups');
    }
    return intl.formatMessage(out);
  }.property('access.provider', 'intl._locale'),

  choices: Ember.computed('allIdentities', function() {
    let members = []
    let identities = this.get('allIdentities') || []
    identities.map(i => members.push({label: i.login, value: i.login}))
    console.log(members)
    return members
  })

});
