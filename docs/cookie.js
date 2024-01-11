
export function set(name, value, days) {
    let expires = '';
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = `${name}=${value || ''}; path=/${expires}`;
}

export function get(name) {
	const r = new RegExp(`${name}=([^;]*)`);
	const m = r.exec(document.cookie);

	return m && m[1];
}

export function remove(name) {
    document.cookie = name +'=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
