import * as agent from './agent.js';
import * as util from './util.js';

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./worker.js', { type: 'module' });
}

const state = { sheet: '', location: 0, accommodation: 0 };
let plate;

const showScreen = (name) => { document.body.dataset.screen = name; };

const updateLocations = () => {
	const locations = $('#main-locations').empty();

	agent.getSheets().forEach(item => {
		const data = agent.readSheet(item.sheet);
		if (data?.locations) {
			for (let location = 0; location < data.locations.length; ++location) {
				$('<button class="location"></button>')
					.data('item', { sheet: item.sheet, location })
					.text(data.locations[location].name)
					.appendTo(locations);
			}
		}
	});
};

const updateAccommodation = (elem, accommodation) => {
	const aux = util.parseNote(accommodation.note);

	return elem.attr('data-status', accommodation.status)
		.find('.no').text(accommodation.no).end()
		.find('.status').text(accommodation.status).end()
		.find('.modify-date').text(util.formatDate(aux.modifyDate)).end();
};

const updateVisits = (sheet, location) => {
	const data = agent.readSheet(sheet);

	$('#visits-title').text(data.locations[location].name);

	const container = $('#visits-accommodations').data('item', { sheet, location }).empty();
	const template = $('#accommodation-template');

	for (let index = 0; index < data.locations[location].accommodations.length; ++index) {
		const accommodation = data.locations[location].accommodations[index];

		updateAccommodation(template.contents().clone().data('accommodation', index), accommodation)
			.appendTo(container);
	}
};

const updateSheets = () => {
	const container = $('#settings-sheets').empty();
	const template = $('#sheet-template');

	agent.getSheets().forEach(item => {
		template.contents().clone()
			.find('.sheet-name').text(item.name).end()
			.find('.sheet-button-remove').data('sheet', item.sheet).end()
			.appendTo(container);
	});

};

const refreshVisits = () => {
	const { sheet, location } = $('#visits-accommodations').data('item');

	agent.refreshSheet(sheet).then(() => { updateVisits(sheet, location); });
};

$(function() {
	$('#main-settings')
		.on('click', function() { showScreen('settings'); });

	$('#main-locations').on('click', '.location', function() {
		const item = $(this).data('item');
		Object.assign(state, item);
		updateVisits(item.sheet, item.location);
		showScreen('visits');

		refreshVisits();
	});

	$('#visits-title')
		.on('click', function() { showScreen('main'); });

	$('#visits-refresh')
		.on('click', refreshVisits);

	$('#visits-accommodations')
		.on('click', '.accommodation', function() {
			plate = $(this);
			state.accommodation = $(this).data('accommodation');

			$('#status-dialog .status-button')
				.removeClass('current')
				.filter(`[data-status=${$(this).data('status')}]`).addClass('current');
			$('#status-dialog .status-no').text($(this).find('.no').text());
			$('#status-dialog').addClass('dialog-shown');
		});

	$('#settings-deployment')
		.on('change', function() { agent.setDeployment($(this).val()); })
		.on('sync', function() { $(this).val(agent.getDeployment()); });

	$('#settings-sheets').on('click', '.sheet-button-remove', function(event) {
		event.preventDefault();

		agent.removeSheet($(this).data('sheet'));

		updateSheets();
		updateLocations();
	});

	$('#settings-add')
		.on('click', function(event) {
			event.preventDefault();

			const m = /docs\.google\.com\/spreadsheets\/d\/([^\/]+)\//.exec($('#settings-href').val());
			if (m) {
				agent.addSheet(m[1]).then(() => {
					updateSheets();
					updateLocations();

					$('#settings-href').val('');
				});
			}
		});

	$('#settings-share').on('click', function() {
		let url = location.href;
		if (url.endsWith('/')) url += 'index.html';
		url += `#${agent.getDeployment()}`;
		for (const item of agent.getSheets())
			url += `+${item.sheet}`;
		navigator.share({ url });
	});

	$('#settings-save').on('click', function() {
		if (agent.ok())
			showScreen('main');
	});

	$('#status-dialog')
		.on('click', '.status-button', function() {
			if ($(this).not('.current')) {
				agent.setSheet(state.sheet, state.location, state.accommodation, $(this).data('status'), util.formatNote())
					.then((row) => {
						updateAccommodation(plate, row);
					});
			}
		})
		.on('click', function() {
			$(this).removeClass('dialog-shown');
		});

	const init = () => {
		$('input').trigger('sync');

		updateSheets();
		updateLocations();

		showScreen(agent.ok() ? 'main' : 'settings');
	};

	if (location.hash)
		agent.importConfig(location.hash)
			.then(() => {
				window.history.replaceState(null, '', location.origin + location.pathname);
				window.location.reload();
			})
			.catch(init);
	else
		init();
});
