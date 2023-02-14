
const formatDatePart = (part) => ('0' + part).substr(-2);

const notePattern = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/;

export const formatDate = (date) => {
	if (date instanceof Date)
		return formatDatePart(date.getDate()) + '/' + formatDatePart(date.getMonth() + 1);
	else
		return '';
};

export const parseNote = (note) => {
	const m = notePattern.exec(note);
	return m ? { modifyDate: new Date(m[1]) } : { };
};

export const formatNote = () => {
	return (new Date()).toISOString();
};
