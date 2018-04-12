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
    // this.set('allIdentities', this.get('userStore').find('identity', null, {filter: {name: 'yunhong'}}).then(res => console.log(res)));
    // this.get('userStore').find('identity', null, {filter: {name: 'yunhong'}}).the
    this.get('userStore').find('identity', null, {filter: {name: 'yunhong'}}).then(res => this.set('allIdentities', res.content))
    this._super();
  },

  actions: {
    add: function(member) {
      let identities = this.get('allIdentities') || []
      let res = identities.filter(i => i.id === member.value)[0] || null
      if (res) {
        this.set('addInput','');
        this.send('addObject', res);
      } else {
        this.sendAction('onError','Identity not found: ' + input);
      }
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
    // this.get('userStore').find('identity', null, {forceReload: true}).then((res) => {
    //   let members = []
    //   res.content.map(i => members.push(`ID: ${i.login} / name: ${i.name}`))
    //   console.log(members, '00988')
    //   return members
    // })
    let members = []
    console.log(this.get('allIdentities'), '9999999')
    console.log(this.get('allIdentities'), '88888')
    let identities = this.get('allIdentities') || []
    // identities.map(i => members.push(`ID: ${i.login} / 用户名: ${i.name}`))
    identities.map(i => members.push({label: i.name, value: i.id}))
    console.log(members)
    return members
  })

    // let pt = Ember.get(this, 'pageType');
    //
    // let neuRoles = BASIC_ROLES.map((r) => {
    //
    //   let val = '';
    //
    //   if ( r.value.indexOf('custom') >= 0 ) {
    //     val = 'custom';
    //
    //   } else {
    //     if (r.value === 'read-only') {
    //       val = r.value;
    //     } else {
    //       val = `${pt}-${r.value}`;
    //     }
    //   }
    //
    //   return {
    //     label: r.label,
    //     value: val,
    //   };
    //
    // });
    //
    // if (pt) {
    //   let customRoles = get(this, 'customRoles').map( r => {
    //     if (r.id !== 'read-only') {
    //       return {
    //         label: r.name,
    //         value: r.id
    //       }
    //     } else {
    //       return;
    //     }
    //   });
    //
    //   neuRoles = neuRoles.concat(customRoles);
    //
    //   return neuRoles;
    // }

    // return neuRoles;
});
