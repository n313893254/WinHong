import Resource from 'ember-api-store/models/resource';
import { reference } from 'ember-api-store/utils/denormalize';
import { computed, get, set } from '@ember/object';
import { arrayOfReferences } from 'ember-api-store/utils/denormalize';
import { inject as service } from '@ember/service';

export const ARECORD = 'arecord';
export const CNAME = 'cname';
export const ALIAS = 'alias';
export const WORKLOAD = 'workload';
export const SELECTOR = 'selector';
export const CLUSTERIP = 'clusterIp';
export const UNKNOWN = 'unknown';

const FIELD_MAP = {
  [ARECORD]:  'ipAddresses',
  [CNAME]:    'hostname',
  [ALIAS]:    'targetDnsRecordIds',
  [WORKLOAD]: 'targetWorkloadIds',
  [SELECTOR]: 'selector',
  [CLUSTERIP]: 'clusterIp',
};

export default Resource.extend({
  clusterStore: service(),
  router: service(),
  intl: service(),
  namespace: reference('namespaceId', 'namespace', 'clusterStore'),
  targetDnsRecords: arrayOfReferences('targetDnsRecordIds','dnsRecord'),
  targetWorkloads: arrayOfReferences('targetWorkloadIds','workload'),

  actions: {
    edit() {
      get(this, 'router').transitionTo('authenticated.project.dns.detail.edit', this.get('id'));
    },
  },

  selectedPods: computed('selector', function() {
    const rules = get(this, 'selector');
    let keys = Object.keys(rules);
    if ( !keys.length ) {
      return [];
    }

    let pods = get(this, 'store').all('pod');
    let key;
    for ( let i = 0 ; pods.length > 0 && i < keys.length ; i++ ) {
      key = keys[i];
      pods = pods.filter(p => p.hasLabel(key, rules[key]));
    }

    return pods;
  }),

  nameWithType: computed('displayName','recordType','intl.locale', function() {
    const name =  get(this, 'displayName');
    const recordType =  get(this,'recordType');
    const type = get(this, 'intl').t('dnsPage.type.' + recordType);
    return `${name} (${type})`;
  }),

  recordType: computed(
  'ipAddresses.length',
  'hostname',
  'selector',
  'targetDnsRecordIds.length',
  'targetWorkloadIds.length',
  'clusterIp', function() {

    if ( get(this, 'ipAddresses.length')) {
      return ARECORD;
    }

    if ( get(this, 'hostname') ) {
      return CNAME;
    }

    if ( get(this, 'targetDnsRecordIds.length') ) {
      return ALIAS;
    }

    if ( get(this, 'targetWorkloadIds.length') ) {
      return WORKLOAD;
    }

    const selector = get(this, 'selector');
    if ( selector && Object.keys(selector).length ) {
      return SELECTOR;
    }

    if ( get(this, 'clusterIp') ) {
      return CLUSTERIP;
    }

    return UNKNOWN;
  }),

  displayType: computed('recordType','intl.locale', function() {
    return get(this, 'intl').t('dnsPage.type.' + get(this, 'recordType'));
  }),

  clearTypesExcept(type) {
    Object.keys(FIELD_MAP).forEach((key) => {
      if ( key !== type ) {
        set(this, FIELD_MAP[key], null);
      }
    });
  },

  displayTarget: computed('recordType','ipAddresses.[]','hostname','selector','targetDnsRecords.[]','targetWorkloads.[]', function() {
    const selectors = get(this, 'selector')||{};
    const records = get(this, 'targetDnsRecords')||[];
    const workloads = get(this, 'targetWorkloads')||{};

    switch ( get(this, 'recordType') ) {
      case ARECORD:
        return get(this, 'ipAddresses').join('\n');
      case CNAME:
        return get(this, 'hostname');
      case SELECTOR:
        return Object.keys(selectors).map((k) => `${k}=${selectors[k]}`).join('\n');
      case ALIAS:
        return records.map(x => get(x, 'displayName')).join('\n');
      case WORKLOAD:
        return workloads.map(x => get(x, 'displayName')).join('\n');
      case CLUSTERIP:
        return get(this, 'clusterIp');
      default:
        return 'Unknown';
    }
  }),

  selectorArray: computed('selector', function() {
    const selectors = get(this, 'selector')||{};
    const out = [];
    Object.keys(selectors).map((k) => {
      out.push({key: k, value: selectors[k]});
    });

    return out;
  }),

  availableActions: computed('links.{update,remove}', function() {
    var l = get(this, 'links');
    const isIngress = get(this, ('ownerReferences.firstObject.kind')) === 'Ingress';
    var choices = [
      { label: 'action.edit',       icon: 'icon icon-edit',           action: 'edit',         enabled: !!l.update && !isIngress },
      { divider: true },
      { label: 'action.remove',     icon: 'icon icon-trash',          action: 'promptDelete', enabled: !!l.remove && !isIngress, altAction: 'delete', bulkable: true },
      { divider: true },
      { label: 'action.viewInApi',  icon: 'icon icon-external-link',  action: 'goToApi',      enabled: true },
    ];

    return choices;
  }),
});
