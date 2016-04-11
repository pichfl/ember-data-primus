import DS from 'ember-data';
import Ember from 'ember';
import Primus from 'primus';

const { RSVP, Logger, on } = Ember;

export default DS.JSONAPIAdapter.extend({
  primus: null,
  channels: {},
  coalesceFindRequests: true,
  shouldReloadAll: () => true,
  shouldBackgroundReloadRecord: () => true,
  shouldReloadRecord: () => true,

  token: null,

  onInit: on('init', function() {
    Logger.info(this.get('host'));
  }),

  writeToChannel(store, type, message) {
    const host = this.get('host');
    const channels = this.get('channels');
    const result = RSVP.defer();
    const path = this.pathForType(type.modelName);

    let primus = this.get('primus');
    let channel = channels[path];

    result.promise.label = path;

    if (!primus) {
      primus = Primus.connect(`${host}?token=${this.get('token')}`);
      this.set('primus', primus);

      primus.on('open', () => Logger.info('Primus connected'));
      primus.on('reconnect scheduled', opts => {
        Logger.info('Reconnecting in %d ms', opts.scheduled);
        Logger.info('This is attempt %d out of %d', opts.attempt, opts.retries);
      });
    }

    if (!channel) {
      channel = primus.channel(path);

      channel.on('data', data => {
        Ember.run.next(() => {
          if (data.data && Object.keys(data.data).length === 0) {
            store.unloadAll(type.modelName);
          } else if (result.promise._state) {
            store.unloadAll(type.modelName);
            store.pushPayload(data);
          } else {
            result.resolve(data);
          }
        });
      });

      channels[path] = channel;
    }

    channel.write(message);

    return result.promise;
  },

  findAll(store, type) {
    return this.writeToChannel(store, type);
  },

  findRecord(store, type, id) {
    return this.writeToChannel(store, type, {
      data: {
        id,
      },
    });
  },

  findMany(store, type, ids) {
    return this.writeToChannel(store, type, {
      data: {
        filter: {
          id: ids.join(','),
        },
      },
    });
  },

  findHasMany(store, snapshot, url) {
    Logger.log('findHasMany', store, snapshot, url);

    return RSVP.resolve({
      data: [],
    });
  },

  findBelongsTo(store, snapshot, url) {
    Logger.log('findBelongsTo', store, snapshot, url);

    return RSVP.resolve({
      data: [],
    });
  },

  query(store, type, query) {
    return this.writeToChannel(store, type, {
      data: query,
    });
  },

  queryRecord(store, type, query) {
    Logger.log('queryRecord', store, type, query);

    return this._super(...arguments);
  },

  pathForType(modelName) {
    const dasherized = Ember.String.dasherize(modelName || '');

    return Ember.String.pluralize(dasherized);
  },

  _buildURL(modelName) {
    if (!modelName) {
      return '';
    }

    return this.pathForType(modelName);
  },

  groupRecordsForFindMany(store, snapshots) {
    return [snapshots];
  },

  ajax(/* url, type, options */) {
    Logger.log('ajax', ...arguments);

    return RSVP.reject();
  },
});
