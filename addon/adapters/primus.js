/* global Primus */
import DS from 'ember-data';
import Ember from 'ember';

const { computed, RSVP, Logger, on, makeArray } = Ember;

export default DS.JSONAPIAdapter.extend({
	channels: {},
	coalesceFindRequests: true,
	shouldReloadAll: () => true,
	shouldBackgroundReloadRecord: () => true,
	shouldReloadRecord: () => true,

	host: null,
	token: localStorage.getItem('com.anfema.api.token') || 'aaaaa', //@TODO properly retrieve token via ESA

	onInit: on('init', function() {
		Logger.info(this.get('host'));
	}),

	primus: computed(function() {
		let primus = this.get('_primus');

		if (primus) {
			return primus;
		}

		const host = this.get('host');

		primus = Primus.connect(`${host}?token=${this.get('token')}`, {
			reconnect: {
				max: Infinity,
				min: 500,
				retries: 30,
			}
		});

		primus.on('open', () => Logger.info('Primus: Connected'));
		primus.on('reconnect scheduled', opts => {
			Logger.info('Primus: Reconnecting in %d ms', opts.scheduled);
			Logger.info('Primus: This is attempt %d out of %d', opts.attempt, opts.retries);
		});
		primus.on('reconnected', () => Logger.info('Primus: Reconnected'));

		// Register data dispatch here as well, don't use channels, connect streams.
		primus.on('data', data => this.pipe(data));

		return primus;
	}),

	pipe(data) {
		if (data.emit) {
			let [method, message] = data.emit;
			method = (method || '').toLowerCase();

			if (method === 'push') {
				this.store.pushPayload(message);
			}

			if (method === 'delete') {
				message = makeArray(message);

				message.forEach(itemToDelete => {
					const modelName = this.modelNameFromPayloadKey(itemToDelete.type);
					const record = store.peekRecord(modelName, itemToDelete.id);

					if (record) {
						record.rollbackAttributes();
						this.store.unloadRecord(post);
					}
				});
			}
		}
	},

	modelNameFromPayloadKey(key) {
		return Ember.String.singularize(key);
	},

	write(store, type, data = null) {
		const primus = this.get('primus');
		const serializer = store.serializerFor(type.modelName);

		primus.emit('GET', {
			type: serializer.payloadKeyFromModelName(type.modelName),
			data,
		});

		return RSVP.reject();
	},

	findAll(store, type) {
		return this.write(store, type);
	},

	findRecord(store, type, id) {
		return this.write(store, type, {
			data: {
				id,
			},
		});
	},

	findMany(store, type, ids) {
		return this.write(store, type, {
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
		return this.write(store, type, {
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
