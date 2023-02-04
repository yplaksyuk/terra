const CONFIG = 'terra-config';

const storage = window.localStorage;

$.ajaxSetup({
	contentType: 'application/json; charset=UTF-8',
	dataType: 'json',
});

const config = Object.assign({ deployment: '', sheets: [] },
	JSON.parse(storage.getItem(CONFIG)));

const saveConfig = () => {
	storage.setItem(CONFIG, JSON.stringify(config));
};

const url = () => {
	if (config.deployment)
		return `https://script.google.com/macros/s/${config.deployment}/exec`;

	throw Error('deployment ID not defined.');
};

const getSheet = (sheet) => new Promise((resolve, reject) => {
	$.get(url(), { x: sheet })
		.done((data) => { storage.setItem(sheet, JSON.stringify(data)); resolve(data); })
		.fail(() => { reject(); });
});

export const ok = () => config.deployment && true;

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
	$.get(url(), { x: sheet, l: location, a: accommodation, s: status, n: note })
		.done((row) => {
			const data = JSON.parse(storage.getItem(sheet));
			data.locations[location].accommodations[accommodation] = row;
			storage.setItem(sheet, JSON.stringify(data));
			resolve(row);
		})
		.fail((a, b, c) => {
			reject();
		});
});

export const importConfig = async (hash) => {
	const [ deployment, ...sheets ] = hash.split('+');

	config.deployment = deployment.substr(1);
	saveConfig();

	for (const item of config.sheets.slice()) {
		if (!sheets.find(sheet => sheet == item.sheet))
			removeSheet(item.sheet);
	}

	for (const sheet of sheets) {
		if (!config.sheets.find(item => item.sheet == sheet)) {
			const local = new String(sheet);
			await addSheet(local);
		}
	}
};
