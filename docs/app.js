import * as agent from './agent.js';
import * as util from './util.js';

const refuseStatus = 'ОТК';
const rudeStatus = '!!!';

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./worker.js', { type: 'module' });
}

const showScreen = (name) => {
	document.body.dataset.screen = name;
};

const updateTile = (tile, accommodation) => {
	const aux = util.parseNote(accommodation.note);
	const status = accommodation.status || '';

	return tile.attr('data-status', status)
		.find('.no').text(accommodation.no).end()
		.find('.status').text(status).end()
		.find('.modify-date').text(util.formatDate(aux.modifyDate)).end();
};

const statusDialog = {
	tile: null,
	item: null,

	init: function() {
		const self = this;
		let timer = null;

		$('#status-dialog')
			.on('mousedown touchstart', '.status-button', function(event) {
				const button = $(this);

				if (button.is('.current')) {
					timer = setTimeout(() => {
						button.removeClass('current');
					}, 3000);
				}
				else {
					$('#status-dialog .current').removeClass('current');
					button.addClass('current');

					if (button.attr('data-status') == refuseStatus) {
						timer = setTimeout(() => {
							button.attr('data-status', rudeStatus);
						}, 3000);
					}
				}

				event.stopPropagation();
				event.preventDefault();
			})
			.on('mouseup touchend touchcancel', '.status-button', function(event) {
				clearTimeout(timer);

				const status = $(this).filter('.current').attr('data-status') || '';
				if (status != (self.tile.attr('data-status') || ''))
					self.setStatus(status);

				event.stopPropagation();
				event.preventDefault();

				$('#status-dialog').removeClass('dialog-shown');
			})
			.on('click', function() {
				$('#status-dialog').removeClass('dialog-shown');
			});
	},

	open: function(tile, item) {
		this.tile = tile;
		this.item = item;

		const status = tile.attr('data-status');
		$('#status-refuse').attr('data-status', status == rudeStatus ? rudeStatus : refuseStatus);

		$('#status-dialog .status-button')
			.removeClass('current')
			.filter(`[data-status='${status}']`).addClass('current');

		$('#status-dialog .status-no').text(tile.find('.no').text());
		$('#status-dialog').addClass('dialog-shown');
	},

	setStatus: function(status) {
		agent.setSheet(this.item.sheet, this.item.l, this.tile.data('accommodation'), status, status && util.formatNote() || '')
			.then((row) => {
				updateTile(this.tile, row);
			});
	}
};

const visitsScreen = {
	container: null,
	item: null,

	init: function() {
		const self = this;

		this.container = $('#visits-accommodations');

		$('#visits-title').on('click', () => { showScreen('main'); });
		$('#visits-refresh').on('click', () => { this.refresh(); });

		this.container.on('click', '.accommodation', function() {
			statusDialog.open($(this), self.item);
		});
	},

	show: function(item) {
		showScreen('visits');

		if (this.item?.sheet != item.sheet || this.item?.l != item.l) {
			this.item = item;

			// reload whole contents
			this.container.closest('.screen').each(function() { this.scroll({ top: 0, left: 0 }); });
			this.container.empty();
			this.update();
		}

		this.refresh();
	},

	update: function() {
		const data = agent.readSheet(this.item.sheet);

		$('#visits-title').text(data.locations[this.item.l].name);

		const accommodations = data.locations[this.item.l].accommodations;
		const tiles = this.container.children();

		if (tiles.length != accommodations.length) {
			this.container.empty();

			const template = $('#accommodation-template');
			for (let a = 0; a < accommodations.length; ++a) {
				updateTile(template.contents().clone().data('accommodation', a), accommodations[a])
					.appendTo(this.container);
			}
		}
		else {
			for (let a = 0; a < accommodations.length; ++a)
				updateTile($(tiles[a]), accommodations[a])
		}
	},

	refresh: function() {
		agent.refreshSheet(this.item.sheet).then(() => { this.update(); });
	}
};

const mainScreen = {
	container: $('#main-locations'),

	init: function() {
		$('#main-settings').on('click', () => { showScreen('settings'); });

		this.container.on('click', '.location', function() {
			visitsScreen.show($(this).data('item'));
		});

		this.updateLocations();
	},

	show: function() {
		showScreen('main');
	},

	updateLocations: function() {
		const container = $('#main-locations').empty();

		agent.getSheets().forEach(item => {
			const data = agent.readSheet(item.sheet);
			if (data?.locations) {
				for (let l = 0; l < data.locations.length; ++l) {
					$('<button class="location"></button>')
						.data('item', Object.assign({ l }, item))
						.text(data.locations[l].name)
						.appendTo(container);
				}
			}
		});
	}
};

const settingsScreen = {
	init: function() {
		const self = this;

		$('#settings-deployment')
			.on('change', function() { agent.setDeployment($(this).val()); })
			.on('sync', function() { $(this).val(agent.getDeployment()); });

		$('#settings-sheets').on('click', '.sheet-button-remove', function(event) {
			event.preventDefault();

			agent.removeSheet($(this).data('sheet'));

			self.updateSheets();
			mainScreen.updateLocations();
		});

		$('#settings-add').on('click', function(event) {
				event.preventDefault();

				const m = /docs\.google\.com\/spreadsheets\/d\/([^\/]+)\//.exec($('#settings-href').val());
				if (m) {
					agent.addSheet(m[1]).then(() => {
						self.updateSheets();
						mainScreen.updateLocations();

						$('#settings-href').val('');
					});
				}
			});

		$('#settings-share').on('click', function() {
			let url = location.href;
			if (url.endsWith('/')) url += 'index.html';

			url += `#${agent.getDeployment()}`;
			url += agent.getSheets().map(item => `+${item.sheet}`).join('');

			navigator.share({ url });
		});

		$('#settings-save').on('click', function() {
			if (agent.ok())
				showScreen('main');
		});

		$('input').trigger('sync');

		this.updateSheets();
	},

	updateSheets: function() {
		const container = $('#settings-sheets').empty();
		const template = $('#sheet-template');

		agent.getSheets().forEach(item => {
			template.contents().clone()
				.find('.sheet-name').text(item.name).end()
				.find('.sheet-button-remove').data('sheet', item.sheet).end()
				.appendTo(container);
		});
	}
};

$(function() {
		showScreen('loading');
	return;
	if (location.hash) {
		showScreen('loading');

		agent.importConfig(location.hash)
			.then(() => {
				window.history.replaceState(null, '', location.origin + location.pathname);
				window.location.reload();
			});
	}
	else {
		mainScreen.init();
		visitsScreen.init();
		settingsScreen.init();

		statusDialog.init();

		showScreen(agent.ok() ? 'main' : 'settings');
	}
});
