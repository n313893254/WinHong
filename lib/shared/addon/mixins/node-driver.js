import { next } from '@ember/runloop';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Mixin from '@ember/object/mixin';
import NewOrEdit from 'shared/mixins/new-or-edit';
import ManageLabels from 'shared/mixins/manage-labels';
import { addAction } from 'ui/utils/add-view-action';
import { get, set, computed } from '@ember/object';
import { ucFirst } from 'shared/utils/util';

// Map of driverName -> [string | function]
//  If string, the given field is retrieved
//  If function, the function is executed with the template as "this"
//  Custom UIs should call registerDisplay{Size|Location} to register new entries.
const DISPLAY_LOCATIONS = {
  aliyunecs: function() {
    return get(this, 'config.region') + get(this, 'config.zone');
  },
  amazonec2: function() {
    return get(this, 'config.region') + get(this, 'config.zone');
  },
  azure: 'config.environment',
  digitalocean: 'config.region',
  exoscale: null,
  packet: 'config.facilityCode',
  rackspace: 'config.region',
  vmwarevsphere: null,
}

const DISPLAY_SIZES = {
  aliyunecs: 'config.instanceType',
  amazonec2: 'config.instanceType',
  azure: 'config.size',
  digitalocean: 'config.size',
  exoscale: 'config.instanceProfile',
  packet: 'config.plan',
  rackspace: 'config.flavorId',

  vmwarevsphere: function() {
    return get(this,'config.memorySize') +' GiB, '+ get(this, 'config.cpuCount') + ' Core';
  },
}


export function getDisplayLocation(driver) {
  return DISPLAY_LOCATIONS[driver];
}

export function getDisplaySize(driver) {
  return DISPLAY_SIZES[driver];
}

export function registerDisplayLocation(driver, keyOrFn) {
  DISPLAY_LOCATIONS[driver] = keyOrFn;
}

export function registerDisplaySize(driver, keyOrFn) {
  DISPLAY_SIZES[driver] = keyOrFn;
}

export default Mixin.create(NewOrEdit, ManageLabels, {
  intl:          service(),
  scope:         service(),
  settings:      service(),
  router:        service(),
  globalStore:   service(),

  driverName: null,
  showEngineUrl: true, // On some drivers this isn't configurable

  model: null,
  labelResource: alias('model'),

  actions: {
    addLabel: addAction('addLabel', '.key'),

    setLabels(labels) {
      let out = {};
      labels.forEach((row) => {
        out[row.key] = row.value;
      });

      set(this, 'labelResource.labels', out);
    },

    cancel() {
      this.sendAction('close');
    }
  },

  init() {
    this._super(...arguments);

    if ( !get(this, 'editing') && typeof get(this, 'bootstrap') === 'function') {
      this.bootstrap();
    }

    set(this,'model.namespaceId', 'fixme'); // @TODO-2.0
  },

  bootstrap() {
    // Populate the appropriate *Config field with defaults for your driver
  },

  driverOptionsTitle: computed('driverName','intl.locale', function() {
    const intl = get(this, 'intl');
    const driver = get(this, 'driverName');
    const key = `nodeDriver.displayName.${driver}`;
    let name = ucFirst(driver);
    if ( intl.exists(key) ) {
      name = intl.t(key);
    }

    return intl.t('nodeDriver.driverOptions', {driver: name});
  }),

  templateOptionsTitle: computed('settings.appName','intl.locale', function() {
    const intl = get(this, 'intl');
    const appName  = get(this, 'settings.appName');
    return intl.t('nodeDriver.templateOptions', {appName});
  }),

  didInsertElement() {
    this._super();

    next(() => {
      try {
        const input = this.$('INPUT')[0];
        if ( input ) {
          input.focus();
        }
      }
      catch(e) {}
    });
  },

  willSave() {
    get(this,'model').clearConfigsExcept(get(this,'driverName')+'Config');
    return this._super(...arguments);
  },

  doneSaving() {
    // This triggers nodetemplates to recompute the display size/location
    get(this, 'model').notifyPropertyChange('config');
    this.sendAction('saved');
    this.sendAction('close');
  },
});
