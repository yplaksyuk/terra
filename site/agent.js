const CONFIG = 'terra-config';

const storage = window.localStorage;

$.ajaxSetup({
	contentType: 'application/json; charset=UTF-8',
	dataType: 'json',
});

const config = Object.assign({ initials: '', deployment: '', sheets: [] },
	JSON.parse(storage.getItem(CONFIG)));

const saveConfig = () => {
	storage.setItem(CONFIG, JSON.stringify(config));
};

const url = (sheet) => {
	if (config.deployment) {
		const url = `https://script.google.com/macros/s/${config.deployment}/exec?sheet=${sheet}`;
		console.log(url);
		return url;
	}

	throw Error('deployment ID not defined.');
};

const getSheet = (sheet) => new Promise((resolve, reject) => {
	$.get(url(sheet))
		.done((data) => { storage.setItem(sheet, JSON.stringify(data)); resolve(data); })
		.fail(() => { reject(); });
});

export const ok = () => config.initials && config.deployment && true;

export const getInitials = () => config.initials;

export const setInitials = (initials) => { config.initials = initials; saveConfig(); };

export const getDeployment = () => config.deployment;

export const setDeployment = (deployment) => { config.deployment = deployment; saveConfig(); };

export const getSheets = () => config.sheets;

export const addSheet = async (sheet) => {
	if (config.sheets.find(item => item.sheet == sheet))
		throw Error('sheet already exists.');

	const data = await getSheet(sheet);
	config.sheets.push({ sheet, name: data.name });
	saveConfig();
	return data;
};

export const removeSheet = (sheet) => {
	const index = config.sheets.findIndex(item => item.sheet == sheet);
	if (index >= 0) {
		config.sheets.splice(index, 1);
		saveConfig();

		storage.removeItem(sheet);
	}
};

export const readSheet = (sheet) => JSON.parse(storage.getItem(sheet));

export const refreshSheet = async (sheet) => {
	const item = config.sheets.find(item => item.sheet = sheet);
	if (item) {
		const data = await getSheet(sheet);
		if (item.name != data.name) {
			item.name = data.name;
			saveConfig();
		}
		return data;
	}

	throw Error('sheet not found.');

};

export const setSheet = (sheet, location, accommodation, status, note) => new Promise((resolve, reject) => {
	$.get(url(sheet), { location, accommodation, status, note })
		.done((row) => {
			const data = JSON.parse(storage.getItem(sheet));
			Object.assign(data.locations[location].accommodations[accommodation], row);
			storage.setItem(sheet, JSON.stringify(data));
			resolve(row);
		})
		.fail((a, b, c) => {
			reject();
		});
});

export const importConfig = async (hash) => {
	const [ deployment, ...sheets ] = hash.split('+');

	config.deployment = deployment;
	saveConfig();

	for (const item of config.sheets.slice()) {
		if (sheets.find(item.sheet))
			removeSheet(item.sheet);
	}

	for (const sheet of sheets) {
		if (!config.sheets.find(item => item.sheet == sheet))
			await addSheet(sheet);
	}
};
