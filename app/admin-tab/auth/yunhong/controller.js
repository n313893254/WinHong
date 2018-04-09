import Ember from 'ember';

export default Ember.Controller.extend({
  intl              : Ember.inject.service(),
  access            : Ember.inject.service(),
  settings          : Ember.inject.service(),
  yunhong           : Ember.inject.service(),
  // yunghongConfig      : Ember.computed.alias('model.yunghongConfig'),

  testing           : false,
  errors            : null,

  casServerAddress: '',
  casServiceUrl: '',
  casServiceId: '',

  headerText: Ember.computed('access.enabled', function() {
    let out = this.get('intl').findTranslationByKey('authPage.winhong.header.disabled.label');
    if (this.get('access.enabled')) {
      out = this.get('intl').findTranslationByKey('authPage.winhong.header.enabled');
    }
    return this.get('intl').formatHtmlMessage(out);
  }),

  actions: {
    test: function() {
      if ( !this.get('casServerAddress') ) {
        return void this.send('showError','Address is required');
      }
      this.send('clearError');
      this.set('testing', true);

      this.get('model').setProperties({
        provider            : 'yunhongconfig',
        enabled             : false,
        accessMode          : 'unrestricted',
        allowedIdentities   : [],
        yunhongConfig: {
          casServerAddress: this.get('casServerAddress'),
          casServiceUrl: window.location.origin + '/',
          casServiceId: this.get('casServiceId'),
          type: 'yunhongconfig',
        }
      })

      this.get('model').save().then(() => {
        setTimeout(() => {
          this.get('yunhong').getToken().then((resp) => {
            this.get('yunhong').authorizeTest((err,code) => {

              if ( err )
              {
                this.send('gotError', err);
                this.set('testing', false);
              }
              else
              {
                this.send('gotCode', code);
                this.set('testing', false);
              }
            });
          })
        }, 1000)
      }).catch(err => {
        this.send('gotError', err)
      })
    },

    gotCode: function(code) {
      this.get('access').yunHongLogin(code).then(res => {

        if (!res) {
          this.send('showError', '云宏验证失败');
          this.set('testing', false);
          this.set('saving', false);
        } else {
          this.send('authenticationSucceeded', res.body);
        }
      }).catch(res => {
        // Yunhong auth succeeded but didn't get back a token
        this.send('gotError', res.body);
      });
    },

    authenticationSucceeded: function(auth) {
      this.send('clearError');

      let model = this.get('model').clone();
      model.setProperties({
        'enabled': true,
        'accessMode': 'unrestricted',
        'allowedIdentities': [auth.userIdentity],
      });

      let url = window.location.href;

      model.save().then(() => {
        // Set this to true so the token will be sent with the request
        this.set('access.enabled', true);
        this.send('waitAndRefresh', url);
      }).catch((err) => {
        this.set('access.enabled', false);
        this.send('gotError', err);
      });
    },

    showError: function(msg) {
      this.set('errors', [msg]);
      window.scrollY = 0;
    },

    clearError: function() {
      this.set('errors', null);
    },

    gotError: function(err) {
      if ( err.message )
      {
        this.send('showError', err.message + (err.detail? '('+err.detail+')' : ''));
      }
      else
      {
        this.send('showError', 'Error ('+err.status + ' - ' + err.code+')');
      }

      this.set('testing', false);
      this.set('saving', false);
    },

    promptDisable: function() {
      this.set('confirmDisable', true);
      Ember.run.later(this, function() {
        this.set('confirmDisable', false);
      }, 10000);
    },

    disable: function() {
      this.send('clearError');

      let model = this.get('model').clone();
      model.setProperties({
        'allowedIdentities': [],
        'accessMode': 'unrestricted',
        'enabled': false,
        'yunhongConfig': {
          'casServerAddress': '',
          'casServiceId': '',
        }
      });

      model.save().then(() => {
        this.get('access').clearSessionKeys();
        this.set('access.enabled',false);
        this.send('waitAndRefresh');
      }).catch((err) => {
        this.send('gotError', err);
      }).finally(() => {
        this.set('confirmDisable', false);
      });
    },

    waitAndRefresh: function(url) {
      $('#loading-underlay, #loading-overlay').removeClass('hide').show();
      setTimeout(function() {
        window.location.href = url || window.location.href;
      }, 1000);
    },

  },
});
