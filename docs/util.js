
const formatDatePart = (part) => ('0' + part).substr(-2);


export const formatDate = (date) => {
	if (date) {
		const d = new Date(date);
		return formatDatePart(d.getMonth() + 1) + '/' + formatDatePart(d.getFullYear());
	}
	else
		return '';
};
