/* global Primus */
import DS from 'ember-data';
import Ember from 'ember';

const { computed, RSVP, Logger, on, makeArray } = Ember;

let requestId = 0;

export default DS.Adapter.extend({
	defaultSerializer: '-json-api',

	shouldReloadAll: () => true,
	shouldBackgroundReloadRecord: () => true,
	shouldBackgroundReloadAll: () => true,
	shouldReloadRecord: () => true,

	coalesceFindRequests: true,

	debugConnection: false,

	queuedRequests: {},

	host: null,

	token: localStorage.getItem('com.anfema.api.token') || 'aaaaa', //@TODO properly retrieve token via ESA

	onInit: on('init', function() {
		if (this.get('debugConnection')) {
			Logger.info(this.get('host'));
		}
	}),

	primus: computed(function() {
		const queuedRequests = this.get('queuedRequests');
		const debugConnection = this.get('debugConnection');
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

		if (debugConnection) {
			primus.on('open', () => Logger.info('Primus: Connected'));
			primus.on('reconnect scheduled', opts => {
				Logger.info('Primus: Reconnecting in %d ms', opts.scheduled);
				Logger.info('Primus: This is attempt %d out of %d', opts.attempt, opts.retries);
			});
			primus.on('reconnected', () => Logger.info('Primus: Reconnected'));
		}

		primus.on('push', message => this.handlePush(message));
		primus.on('delete', message => this.handleDelete(message));

		return primus;
	}),

	emit(store, type, method, query = null) {
		const primus = this.get('primus');
		const queuedRequests = this.get('queuedRequests');
		const serializer = store.serializerFor(type.modelName);
		const payloadKey = serializer.payloadKeyFromModelName(type.modelName);
		const request = RSVP.defer();

		primus.emit('GET', {
			meta: {
				method,
				requestId,
			},
			type: payloadKey,
			query,
		});

		queuedRequests[requestId] = {
			type,
			method,
			query,
			request
		};

		requestId++;

		return request.promise;
	},

	handlePush(message = { meta: {} }) {
		const queuedRequests = this.get('queuedRequests');
		const queued = queuedRequests[message && message.meta && message.meta.requestId];

		if (queued) {
			queued.request.resolve(message);

			return;
		}

		this.store.pushPayload(message);
	},

	handleDelete(message) {
		message = makeArray(message);

		message.forEach(itemToDelete => {
			const modelName = this.modelNameFromPayloadKey(itemToDelete.type);
			const record = store.peekRecord(modelName, itemToDelete.id);

			if (record) {
				record.rollbackAttributes();
				this.store.unloadRecord(post);
			}
		});
	},

	modelNameFromPayloadKey(key) {
		return Ember.String.singularize(key);
	},

	findAll(store, type) {
		return this.emit(store, type, 'findAll');
	},

	findRecord(store, type, id) {
		return this.emit(store, type, 'findRecord', {
			data: {
				id,
			},
		});
	},

	findMany(store, type, ids) {
		return this.emit(store, type, 'findMany', {
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
		return this.emit(store, type, 'query', query);
	},

	queryRecord(store, type, query) {
		return this.emit(store, type, 'queryRecord', query);
	},
});
