import { on } from '@ember/object/evented';
import { hash } from 'rsvp';
import Route from '@ember/routing/route';
import C from 'ui/utils/constants';

export default Route.extend({
  model() {
    var store = this.get('store');
    return hash({
      records: store.findAll('dnsRecord'),
    });
  },

  setDefaultRoute: on('activate', function() {
    this.set(`session.${C.SESSION.CONTAINER_ROUTE}`,'authenticated.project.dns');
  }),
});
