import C from 'ui/utils/constants';
import { task, timeout } from 'ember-concurrency';
import SearchableSelect from '../searchable-select/component';
import { isAlternate, isMore, isRange } from 'ui/utils/platform';
import DS from 'ember-data'

const DEBOUNCE_MS = 250;
export default SearchableSelect.extend({
  classNames:     'principal-search',
  globalStore:    Ember.inject.service(),
  errors:         null,
  content:        Ember.computed.alias('filteredPrincipals'),
  value:          Ember.computed.alias('filter'),
  _principals:    null,
  useLabel:       null,
  showDropdownArrow: false,

  clientSideFiltering: false,
  loading: false,
  focused: false,
  selectExactOnBlur: true,
  includeLocal: true,

  init() {
    this._super(...arguments);
    // set(this,'allUsers', get(this,'globalStore').all('user'));
  },

  didInsertElement() {
    //Explicitly not calling super here to not show until there's content this._super(...arguments);

    this.$('input').on('focus', () => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      Ember.set(this, 'focused', true);
      const term = Ember.get(this,'value');
      if ( term ) {
        Ember.set(this, '_principals', []);
        Ember.get(this, 'search').perform(term);
        this.send('show');
      }
    });

    this.$('input').on('blur', () => {
      Ember.run.later(() => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        Ember.set(this, 'focused', false);
        if ( Ember.get(this, 'selectExactOnBlur') ) {
          this.scheduleSend();
        }

        this.send('hide');
      }, 250);
    });
  },

  scheduleSend() {
    if ( Ember.get(this, 'loading') ) {
      Ember.set(this, 'sendExactAfterSearch', true);
    } else {
      Ember.set(this, 'sendExactAfterSearch', false);
      this.sendSelectExact();
    }
  },

  sendSelectExact() {
    const value = Ember.get(this,'value');
    const match = Ember.get(this,'filteredPrincipals').findBy('label', value);

    let principal = null;
    if ( match ) {
      principal = match.principal;
    } else {
      Ember.set(this, 'value', '');
    }

    this.sendAction('selectExact', principal);
    this.send('hide');
  },

  sendAfterLoad: false,

  filteredPrincipals: Ember.computed('_principals.@each.{id,state}', function() {
    return ( Ember.get(this, '_principals') || [] ).map(( principal ) =>{
      // console.log({label: get(principal, 'displayName') || get(principal, 'loginName') || get(principal, 'name'), value: get(principal, 'id'), provider: get(principal, 'provider'),});
      return {
        label: Ember.get(principal, 'displayName') || Ember.get(principal, 'loginName') || Ember.get(principal, 'name'),
        value: Ember.get(principal, 'id'),
        provider: Ember.get(principal, 'provider'),
        type: Ember.get(principal, 'principalType'),
        principal: principal,
      };
    });
  }),

  externalChanged: Ember.on('init', Ember.observer('external', function(){
    let principal = Ember.get(this, 'external');

    if (principal) {
      // for update TODO
      // if (!get(this, 'globalStore').hasRecordFor(principal.type, principal.id)) {
      //   get(this, 'globalStore')._add('principal', principal);
      // }
      this.set('readOnly', true);
      this.set('optionValuePath', 'label');
      this.setSelect({
        label: Ember.get(principal, 'displayName') || Ember.get(principal, 'loginName') || Ember.get(principal, 'name'),
        value: Ember.get(principal, 'id'),
        provider: Ember.get(principal, 'provider'),
        type: Ember.get(principal, 'principalType')
      });
    }
  })),

  metas: Ember.computed(function() {
    return Object.keys(C.KEY).map(k => C.KEY[k]);
  }),

  actions: {
    search(term, e) {
      const kc = e.keyCode;

      this.send('show');

      if ( kc === C.KEY.CR || kc === C.KEY.LF ) {
        this.scheduleSend();
        return;
      }

      var isAlpha = (k) => {
        return !get(this, 'metas').includes(k)
          && !isAlternate(k)
          && !isRange(k)
          && !isMore(k);
      }
      if (isAlpha(kc)) {
        Ember.set(this, 'principal', null);
        this.sendAction('add');
        Ember.get(this, 'search').perform(term);
      }
    },

    show() {
      if (this.get('showOptions') === true) {
        return;
      }
      const toBottom = $('body').height() - $(this.$()[0]).offset().top - 60;
      this.set('maxHeight', toBottom < get(this,'maxHeight') ? toBottom : get(this,'maxHeight'));
      this.set('showOptions', true);
    },

    hide() {
      Ember.set(this, 'filter', Ember.get(this, 'displayLabel'))
      this.set('showOptions', false);
      this.set('$activeTarget', null);
    },
  },

  displayLabel: Ember.computed('value', 'prompt', 'interContent.[]', function () {
    const value = this.get('value');
    if (!value) {
      return null;
    }

    const vp = this.get('optionValuePath');
    const lp = this.get('optionLabelPath');
    const selectedItem = this.get('interContent').filterBy(vp, value).get('firstObject');

    if (selectedItem) {
      let label = Ember.get(selectedItem, lp);
      if (this.get('localizedLabel')) {
        label = this.get('intl').t(label);
      }
      return label;
    }
    return value;
  }),

  setSelect(item) {
    const gp = this.get('optionGroupPath');
    const vp = this.get('optionValuePath');

    this.set('value', Ember.get(item, vp));
    if (gp && Ember.get(item, gp)) {
      this.set('group', Ember.get(item, gp));
    }

    this.set('filter', this.get('displayLabel'));

    Ember.set(this, 'principal', item);
    this.sendAction('add');
    this.send('hide');
  },

  showMessage: Ember.computed('filtered.[]','value', function() {
    if ( !Ember.get(this,'value') ) {
      return false;
    }

    return Ember.get(this, 'filtered.length') === 0;
  }),

  search: task(function * (term) {
    if (Ember.isBlank(term)) {
      Ember.set(this, '_principals', []);
      Ember.set(this, 'loading', false);
      return;
    }

    // Pause here for DEBOUNCE_MS milliseconds. Because this
    // task is `restartable`, if the principal starts typing again,
    // the current search will be canceled at this point and
    // start over from the beginning. This is the
    // ember-concurrency way of debouncing a task.

    Ember.set(this, 'loading', true);

    yield timeout(DEBOUNCE_MS);

    let xhr = yield this.get('goSearch').perform(term);
    return xhr;
  }).restartable(),


  goSearch: task(function * (input) {
    // const globalStore = Ember.get(this, 'globalStore');
    let promise;
    promise = this.get('userStore').find('identity', null).then((info) => {
      let neu = info.content || [];
      console.log(info)

      if ( Ember.get(this, 'includeLocal') ) {
        let normalizedTerm = input.toLowerCase().trim();
        let foundIds = {};
        neu.forEach((x) => {
          foundIds[x.id] = true;
        })

        let local = Ember.get(this,'allUsers') || [];
        local = local.filter((x) => {
          if ( (x.name||'').toLowerCase().trim().startsWith(normalizedTerm) ||
            (x.username||'').toLowerCase().trim().startsWith(normalizedTerm) )
          {
            for ( let i = 0 ; i < x.principalIds.length ; i++ ) {
              if ( foundIds[ x.principalIds[i] ] ) {
                return false;
              }
            }

            return true;
          }

          return false;
        });

        // const globalStore = get(this, 'globalStore');
        // local = local.map((x) => {
        //   return globalStore.getById('principal', x.principalIds[0]);
        // });
        local = local.filter((x) => !!x);
        neu.addObjects(local);
      }

      Ember.set(this, '_principals', neu);
      console.log(info)
      return info.xhr;

    }).catch(() => {
      Ember.set(this, 'errors', [`${xhr.status}: ${xhr.statusText}`]);
      return info.xhr;
    }).finally(() => {
      Ember.set(this, 'loading', false);
      if ( Ember.get(this,'sendExactAfterSearch') ) {
        this.scheduleSend();
      }
    });

    let result = yield promise;
    return result;
  }),
});
